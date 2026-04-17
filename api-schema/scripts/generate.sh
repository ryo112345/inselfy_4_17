#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)
"${SCRIPT_DIR}/generate-openapi.sh"
"${SCRIPT_DIR}/generate-ts.sh"
