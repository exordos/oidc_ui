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

## Documentation

Project documentation is available in the `docs/` directory.
