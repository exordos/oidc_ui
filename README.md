<!--
Copyright 2025 Genesis Corporation

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

# Exordos OIDC UI

This repository contains a minimal React application bootstrapped with Vite and TypeScript.

This project was created with the assistance of AI.

## Getting started

### Prerequisites

- Node.js >= 24
- npm >= 9

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Exordos element

The `oidc_ui` element owns its hostname, local DNS record, HTTP vhost,
UI archive and API forwarding route on Core's existing `core_lb`.
Core PR #651 is not required: the element imports only Core's existing
LB, local DNS zone and Core IP variable exports.

API requests make a loopback hop through Core's original HTTP vhost,
reusing its Core/IAM-cache routing and default-client credential injection.
The route sets `X-Forwarded-Host` to retain the public OIDC hostname. No client secret is
copied into this manifest.

Install the Exordos CLI, Node.js >= 24, npm and `zstd`, then run `make build`
or `exordos build -f`. The element builder runs `exordos/images/build_web.sh`
as a script artifact: it installs npm dependencies, builds the UI with `/`
as its asset base, archives the
contents of `dist/` as `web.tar.zst`, and packages the archive with the rendered
manifest under `output/exordos-elements/oidc_ui/`.

Publish the built element before installing it: the load balancer downloads
its archive from the repository. For a custom repository, render the manifest
with its public element root URL:

```bash
exordos build -f --manifest-var repository=https://repo.example.com/exordos-elements
exordos push -c /path/to/exordos.push.yaml -t local -f --latest
exordos em elements install output/exordos-elements/oidc_ui/<version>/manifests/oidc_ui.yaml
```

### HTTPS with a manual certificate

The standalone `oidc_ui_https` element is an alternative to `oidc_ui`. Install
exactly one: `oidc_ui` for HTTP, or `oidc_ui_https` for HTTPS. Both depend only
on Core and own their hostname, local DNS record, UI archive and API routes.

The HTTPS element owns an `oidc_ui_certificate` resource
with `method.kind: manual`. It also creates selector variable resources
`oidc_ui_tls_crt` and `oidc_ui_tls_key`. Supply a PEM certificate or full chain
and matching unencrypted private key through Core Variable Storage values
bound to these variables. The certificate reads their `:value` attributes.
The HTTPS vhost on port 443 references the resource's `cert` and `key`
attributes and serves the UI archive directly.

```bash
exordos build -f -e oidc_ui_https --manifest-var oidc_ui_domain=oidc.example.com
# Publish the selected element, then install it.
exordos em elements install output/exordos-elements/oidc_ui_https/<version>/manifests/oidc_ui_https.yaml
```

Builds do not require PEM inputs and do not embed private keys. After installing
`oidc_ui_https`, populate both variables with matching PEM values so the manual
certificate can be provisioned. The variables are exported as
`var_oidc_ui_tls_crt` and `var_oidc_ui_tls_key`; their selectors use the latest
value unless a value is manually selected.

Manual certificates are not issued or renewed automatically. Rotate the
certificate by supplying replacement values to both variables. Point the
configured hostname at Core's load balancer. The `oidc_ui_https` element
exports the HTTPS vhost as `oidc_lb_https_vhost`.

Core's existing internal HTTP routes generate their own forwarded scheme and
port. This also applies to the loopback API hop from the HTTPS listener:
Core must preserve the original HTTPS scheme and port for discovery URLs and
token issuers to use HTTPS. Adding a certificate here does not resolve that
Core limitation; verify discovery and token issuers before using OIDC clients.
The local DNS record always points `oidc` in Core's local zone to Core's IP;
it does not create a record in the public zone.

Before upgrading a deployment that used PR #651, remove its Core-owned
OIDC vhost, routes, domain variable/value and local DNS record from the Core
manifest. These resources now belong to `oidc_ui`; installing both versions
of the wiring creates conflicting vhosts/DNS records. Back up any domain
override and pass it when building this element. Do not remove Core's LB.

Use `/?idp_uuid=<idp-uuid>` on the OIDC hostname as the login URL, preserving
any authorization request query parameters supplied by the IdP. Configure
OIDC clients to use discovery and authorization endpoints on this hostname
so Core's redirect to `/` returns to the UI. The element owns the root
route; do not configure another root SPA route on this vhost.

CI tests the authentication client, then builds and publishes the element.
Both jobs set up Node.js 24 and npm. The build runner also needs `zstd`;
`exordos build` creates the web archive through the script artifact.
Configure the repository secret `PUSH_CFG` with
a base64-encoded `exordos.push.yaml` for the workflow's `local` push target.
The default public artifact root is `https://repo.exordos.com/exordos-elements`.
Branches other than `master`, tags, and manual runs trigger builds;
Dependabot runs are skipped.

## Documentation

Project documentation is available in the `docs/` directory.
