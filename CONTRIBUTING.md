# Contributing

Contributions are welcome.

Good first contributions:

- additional KLAP-compatible Tapo light models
- improved retry/session handling
- encrypted response parsing and command error reporting
- safe device discovery
- TPAP/SPAKE2+ transport support
- documentation and test vectors

Before opening a PR:

1. Keep real credentials out of commits.
2. Run `scripts/check-syntax.ps1`.
3. Include model, hardware version and firmware version when changing protocol behavior.
4. Keep L530 and P110 behavior backward compatible where possible.
