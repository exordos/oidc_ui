<!--
Copyright 2026 Genesis Corporation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<!-- markdownlint-configure-file {"MD013":{"tables":false}} -->

# Testing OIDC UI

## Automated checks

Run from the repository root with Node.js 24 or newer:

```bash
npm ci
npm test
npm run lint
npx tsc --noEmit
npm run build
```

`npm test` covers password login, refresh, and profile requests through
`/api/core/v1/iam/clients/default/`. It checks that the browser sends no
client secret and clears tokens after a failed refresh. The test uses a
mocked API; it does not prove that the deployed LB injects client credentials.
CI runs this regression test before building the web archive.

## Prepare the local stand

Install Core with the OIDC vhost from
[Core PR #651](https://github.com/exordos/exordos_core/pull/651), then publish
and install the `oidc_ui` element built from this repository. Use the revisions
that put the OIDC vhost on the existing `core_lb` and use the default client
for browser login.

```bash
exordos e e show core
exordos e e show oidc_ui
```

Both elements should reach `ACTIVE`. Core should have one LB, `core_lb`,
with the original vhost and the hostname-specific OIDC vhost `oidc_lb_http`.
The `oidc_ui` element adds the root SPA route to the latter.

Set the stand's hostname and reachable Core IP on your workstation:

```bash
STAND_ORIGIN=http://oidc.local.genesis-core.tech
STAND_HOST=oidc.local.genesis-core.tech
STAND_CORE_IP=10.20.0.2
```

Replace these example values if your stand differs. For browser testing,
configure DNS or add this entry to the workstation's `/etc/hosts`:

```text
10.20.0.2 oidc.local.genesis-core.tech
```

Core's default OIDC vhost listens on HTTP port 80. Use HTTPS URLs only if
your stand also has HTTPS termination configured.

## Check routing and static assets

The following command tests hostname-based routing without changing DNS:

```bash
curl --fail --resolve "$STAND_HOST:80:$STAND_CORE_IP" "$STAND_ORIGIN/"
```

Expect HTML containing `Exordos OIDC UI` and asset URLs under `/assets/`.
Open the same URL in a browser. Without `idp_uuid`, the UI should display
an identity-provider error. This is expected and confirms the SPA loaded.
In DevTools, the HTML, JavaScript, and CSS requests should return HTTP 200.

Subsequent commands assume the hostname resolves on the workstation.

## Install an example IdP

The separately installed
[example manifest](../exordos/manifests/examples/oidc_idp.yaml) creates:

- An application IAM client with client ID `oidc-ui-example`.
- Generated client and HS256 signing secrets.
- An IdP with UUID `62c9b423-093d-4cef-aeb7-a9be8f4ba85e`.
- The allowed callback `https://app.example.ru/oidc/callback`.

For a complete test with a relying application, replace the callback in a
local copy of the manifest with that application's actual callback. The
callback used in the authorization request must match the installed manifest.

```bash
exordos em elements install exordos/manifests/examples/oidc_idp.yaml
exordos e e show oidc_idp_example
```

Expect `ACTIVE`. Use an existing stand user: the example disables automatic
registration provisioning. No root redirect or additional LB is installed.

## Check discovery and default-client login

Check discovery on the OIDC hostname:

```bash
STAND_IDP_UUID=62c9b423-093d-4cef-aeb7-a9be8f4ba85e
STAND_IDP_URL="$STAND_ORIGIN/api/core/v1/iam/idp/$STAND_IDP_UUID"

curl --fail --silent --show-error \
  "$STAND_IDP_URL/.well-known/openid-configuration" \
  | python3 -m json.tool
```

Expect `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`, and
`jwks_uri`. Their URLs must use the OIDC hostname. The discovery token endpoint
belongs to the application client; browser password login uses the default
client instead.

Check login independently of the UI. In Bash, enter the stand user's credentials:

```bash
read -r -p 'Stand login: ' STAND_LOGIN
read -r -s -p 'Stand password: ' STAND_PASSWORD
printf '\n'

curl --fail --silent --show-error \
  "$STAND_ORIGIN/api/core/v1/iam/clients/default/actions/get_token/invoke" \
  --data-urlencode 'grant_type=login+password' \
  --data-urlencode "login=$STAND_LOGIN" \
  --data-urlencode "password=$STAND_PASSWORD" \
  --data-urlencode 'scope=project:default' \
  | python3 -c '
import json, sys
response = json.load(sys.stdin)
print({k: response.get(k) for k in ("token_type", "expires_in", "scope")})
assert response.get("access_token") and response.get("refresh_token")
'

unset STAND_PASSWORD
```

Expect a Bearer access token and refresh token; the command prints only
metadata. The browser and this command do not supply client credentials.
The LB's default-client route injects `X-Client-Id` and `X-Client-Secret`
and rewrites the alias to the configured default client's UUID.

## Run login and consent in the browser

Open the following URL. Substitute your OIDC hostname and installed callback
if you changed them:

```text
http://oidc.local.genesis-core.tech/api/core/v1/iam/idp/62c9b423-093d-4cef-aeb7-a9be8f4ba85e/actions/authorize/invoke?client_id=oidc-ui-example&redirect_uri=https%3A%2F%2Fapp.example.ru%2Foidc%2Fcallback&response_type=code&scope=openid%20profile%20email&state=local-test&nonce=local-test-nonce
```

Use a fresh authorization request for each run. In a real integration the
application generates and validates `state` and `nonce`; the fixed values
above are for manually exercising the local stand.

Expected sequence:

1. Core redirects to `/?auth_uuid=...&idp_uuid=...` on the same OIDC hostname.
2. The UI loads the IdP and displays **Example application**.
3. Enter valid stand credentials and submit the login form.
4. The profile appears. Expand **Permissions requested** and check
   `openid`, `profile`, and `email`.
5. Click **Provide data**. Core confirms the authorization request and the
   browser navigates to the configured callback with `code` and
   `state=local-test`.

The placeholder callback may not load. A redirect containing a code and the
matching state confirms the UI login/consent flow only. A complete OIDC test
requires a real relying application to exchange the code at the discovered
token endpoint, validate its received ID token, and establish its own session.
Configure that application's server with client ID `oidc-ui-example` and the
generated `example-oidc-client-secret` password value. Its secret belongs in
the server configuration, not in the UI bundle.

In DevTools → Network, check these requests:

| Step | Request | Expected result |
| --- | --- | --- |
| IdP | `GET /api/core/v1/iam/idp/<idp_uuid>` | Configuration for the selected IdP |
| Login | `POST /api/core/v1/iam/clients/default/actions/get_token/invoke` | Access and refresh tokens |
| Profile | `GET /api/core/v1/iam/clients/default/actions/me` | Current user profile |
| Scopes | `GET /api/core/v1/iam/authorization_requests/<auth_uuid>` | Requested scopes |
| Consent | `POST /api/core/v1/iam/authorization_requests/<auth_uuid>/actions/confirm/invoke` | JSON containing `redirect_url` |

Profile and consent requests use `Authorization: Bearer <access_token>`.
All UI API requests share the page's origin; no CORS workaround is required.

## Session and error checks

Repeat the browser flow at desktop and mobile viewport sizes:

- With **Remember me** unchecked, sign in and reload before consent. The
  form should appear again because tokens were held only in memory.
- With **Remember me** checked, reload before consent. The profile should
  return using `exordos_oidc_ui.default.authTokens` in localStorage.
- Click **Sign out** before consent. The UI should clear the default-client
  tokens and username and return to the login form. This does not test logout
  from the relying application's separate session.
- Enter an incorrect password. The UI should show an error and allow retry.
- Open `/?idp_uuid=<installed-idp-uuid>` without `auth_uuid`. Login can work,
  but **Provide data** must remain disabled.
- Observe automatic refresh before the access token expires. The request goes
  to the same default-client token endpoint with `grant_type=refresh_token`.
  The normal schedule is approximately 60 seconds before expiry; the minimum
  delay is five seconds. Do not change the host clock to force this test.

Check that the browser console has no unexpected warnings or errors during
the successful flow. Record the element versions, hostname, request statuses,
and viewport alongside screenshots; omit passwords, tokens, and client secrets.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `invalid_client` when UI logs in | The request must use `/clients/default/`. Verify the LB injects both default-client headers and rewrites the alias. A request to the application's UUID without client credentials will fail. |
| Default-client curl works, browser login fails | Update the UI element and reload its assets. Confirm the browser is using the new default-client endpoint. |
| Root page returns 404 or nginx 444 | Check the hostname, OIDC vhost, `oidc_ui` resource status, and whether the versioned web archive downloaded successfully. |
| Missing `idp_uuid` error | Start through the IdP authorization endpoint, or supply a valid IdP UUID for a login-only check. |
| Consent button disabled | Check `auth_uuid`, successful profile loading, and whether confirmation is already in progress. |
| Repeated nginx reloads and Core `IN_PROGRESS` | Check for the obsolete second `oidc_lb`. The current manifest has one `core_lb` with two vhosts; inspect agent logs and resource convergence. |
| Redirect to the wrong hostname | Start discovery and authorization on the OIDC hostname. Check forwarded headers and the callback installed in the IdP. |
| Callback page cannot load | The example's `app.example.ru` callback is a placeholder. Use an actual relying application for code exchange. |

On the Core node, useful read-only checks include:

```bash
sudo nginx -t
sudo journalctl -u nginx --since '10 minutes ago' --no-pager
systemctl list-units --type=service --all
```

Find the Universal Agent's actual service name in the last command, then read
its journal for LB validation, archive download, and reconciliation errors.
