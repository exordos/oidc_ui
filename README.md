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

The `oidc_ui` element serves the UI at `/auth/` on Core's existing HTTP
load balancer. It requires the `core` element and uses its `/api/core/`
routes. No separate VM image is needed.

Install the Exordos CLI and `zstd`, then run `make build`. This installs npm
dependencies, builds the UI with `/auth/` as its asset base, archives the
contents of `dist/` as `web.tar.zst`, and packages the archive with the rendered
manifest under `output/exordos-elements/oidc_ui/`.

Publish the built element before installing it: the load balancer downloads
its archive from the repository. For a custom repository, render the manifest
with its public element root URL:

```bash
make web
exordos build -f --manifest-var repository=https://repo.example.com/exordos-elements
exordos push -c /path/to/exordos.push.yaml -t local -f --latest
exordos em elements install output/exordos-elements/oidc_ui/<version>/manifests/oidc_ui.yaml
```

Use `/auth/?idp_uuid=<idp-uuid>` as the login URL, preserving any authorization
request query parameters supplied by the IdP. The trailing slash is required.

CI builds the web archive and passes it to `exordos/exordos_ci`'s reusable
`element_build.yml` workflow. Configure the repository secret `PUSH_CFG` with
a base64-encoded `exordos.push.yaml` for the workflow's `local` push target.
The default public artifact root is `https://repo.exordos.com/exordos-elements`.
Branches other than `master`, tags, and manual runs trigger builds;
Dependabot runs are skipped.

### Example IdP

[`exordos/manifests/examples/oidc_idp.yaml`](exordos/manifests/examples/oidc_idp.yaml)
creates an IAM client, generated client and HS256 signing secrets, and an
IdP bound to that client. Install `core` and `oidc_ui` first, replace the
`core.example.com` and `app.example.com` domains in the example, then install it:

```bash
exordos em elements install exordos/manifests/examples/oidc_idp.yaml
```

Configure the application with client ID `oidc-ui-example`, the generated
`example-oidc-client-secret` password value, callback URL
`https://app.example.com/oidc/callback`, and discovery URL:

```text
https://core.example.com/api/core/v1/iam/idp/62c9b423-093d-4cef-aeb7-a9be8f4ba85e/.well-known/openid-configuration
```

Request `openid profile email` and send a nonce. Users must already exist:
the example disables automatic registration provisioning. Client secrets
belong in the application's server configuration, never in the browser UI.

Core currently sends authorization requests to `/?auth_uuid=...&idp_uuid=...`.
The example therefore adds an exact `/` redirect to `/auth/` that preserves
the query string. This reserves `/` on Core's HTTP vhost; if another app uses
that URL, adapt your deployment's login routing before installing the example.
The example is installed separately and is not included in the default build.

## Documentation

Project documentation is available in the `docs/` directory.
