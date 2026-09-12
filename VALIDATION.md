# Validation report

## Static checks

- JavaScript module syntax: passed Node.js 24.13.1 `--check`.
- QML: passed a balanced-delimiter scan and a scan confirming there are no
  backend/controller calls or edit/click callbacks. Qt `qmllint` was not
  available, so the QML was not compiled by a Qt engine.
- ZIP: opened and enumerated after creation.
- Secret scan: checked that no real email address, password, API key, session
  cookie or device IP from prior logs is included.

## Deterministic crypto checks

The bundled pure-JavaScript primitives are tested against standard vectors:

- SHA-1 of `abc`
- SHA-256 of `abc`
- AES-128 single-block encrypt/decrypt
- AES-128-CBC encrypt/decrypt with PKCS#7 padding

All listed deterministic checks passed on 2026-09-12. The CBC output also
matched Node.js's built-in AES-128-CBC implementation for the same key, IV and
plaintext.

## Not validated here

- SignalRGB startup with this package installed
- device discovery/announcement in the user's installed SignalRGB build
- live TCP/KLAP authentication with a physical L530 or P110
- lighting accuracy, latency, reconnect behavior or firmware coverage

Passing static checks means the files are structurally consistent; it is not a
runtime guarantee.
