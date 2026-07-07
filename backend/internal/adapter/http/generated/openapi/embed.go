// Package openapi holds the oapi-codegen output plus the spec document itself,
// embedded so the request-validation middleware can load it at startup.
// openapi.yaml is copied here by `make oapi` — do not edit it by hand.
package openapi

import _ "embed"

//go:embed openapi.yaml
var SpecYAML []byte
