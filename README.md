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

The `oidc_ui` element serves the UI at `/` on Core's dedicated OIDC HTTP
vhost (`oidc_lb_http`). It requires a Core build with the OIDC vhost on its existing LB
from exordos/exordos_core#651. Core provides DNS and `/api/core/` routes
on that same hostname; this element provides the versioned UI archive and
the root SPA route. No separate VM image is needed.

Install the Exordos CLI and `zstd`, then run `make build`. This installs npm
dependencies, builds the UI with `/` as its asset base, archives the
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

Use `/?idp_uuid=<idp-uuid>` on the OIDC hostname as the login URL, preserving
any authorization request query parameters supplied by the IdP. Configure
OIDC clients to use discovery and authorization endpoints on this hostname
so Core's redirect to `/` returns to the UI. Core's OIDC vhost must not also
contain the legacy `oidc_lb_ui_route` downloading `dist.tar.gz`: this element
owns the root route.

CI builds the web archive and passes it to `exordos/exordos_ci`'s reusable
`element_build.yml` workflow. Configure the repository secret `PUSH_CFG` with
a base64-encoded `exordos.push.yaml` for the workflow's `local` push target.
The default public artifact root is `https://repo.exordos.com/exordos-elements`.
Branches other than `master`, tags, and manual runs trigger builds;
Dependabot runs are skipped.

## Documentation

Project documentation is available in the `docs/` directory.
