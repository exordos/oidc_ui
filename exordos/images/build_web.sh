#!/usr/bin/env bash
# Copyright 2026 Genesis Corporation.
# Licensed under the Apache License, Version 2.0.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

npm ci
npm run build
tar --zstd -cf web.tar.zst -C dist .
