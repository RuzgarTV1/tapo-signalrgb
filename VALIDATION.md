# Validation report

## Static checks

- JavaScript module syntax: checked with Node.js 24.13.1 `--check`.
- QML: checked for balanced delimiters, a masked password field, a single bounded save action, and absence of direct service/controller/process calls.
- Embedded images: both exported base64 payloads decode from generated 512×512 PNG source assets and exceed the minimum sanity threshold.
- Controller metadata: checked for explicit Tapo/TP-Link model and image fields.
- Secret scan: no configured email, password, API key, session cookie, or real device IPv4 address is included.
- ZIP: reopened and enumerated after creation.

Qt `qmllint` was not available, so QML was not compiled by a Qt engine.

## Deterministic crypto checks

The bundled pure-JavaScript primitives are tested against standard vectors: SHA-1 of `abc`, SHA-256 of `abc`, AES-128 single-block encrypt/decrypt, and AES-128-CBC encrypt/decrypt with PKCS#7 padding. The CBC output is also compared with Node.js AES-128-CBC for the same input.

## Not validated here

- SignalRGB startup with this package installed
- appearance of the names/images in the user's SignalRGB build
- live TCP/KLAP authentication with a physical L530 or P110
- lighting accuracy, latency, reconnect behavior, or firmware coverage
- encryption-at-rest behavior of SignalRGB service settings

Passing static checks means the package is structurally consistent; it is not a runtime guarantee.
