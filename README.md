# SignalRGB Tapo Standalone

Direct LAN TP-Link Tapo plugin for SignalRGB.

## v0.2.0

All configuration is done from the **Tapo Standalone service page** inside SignalRGB.

Nothing sensitive is embedded in the JavaScript source.

Supported:
- Tapo L530 — RGB, brightness, power
- Tapo P110 — power

Transport:
- TCP port 80
- KLAP v2
- AES-128-CBC encrypted application requests

No tapo-rest, Rust bridge, localhost service or API-key server.

## Install

Copy both files:
- `TapoStandalone.js`
- `TapoStandalone.qml`

into SignalRGB's custom plugin folder and restart SignalRGB.

## Settings

The Tapo Standalone page contains:
- Tapo email/password
- L530 enable toggle
- L530 visible device name
- L530 IP
- P110 enable toggle
- P110 visible device name
- P110 IP
- Frame Skip
- Min Delta
- Reconnect interval
- Normal / Debug / Trace log level

Press **SAVE SETTINGS & RECONNECT** after changes.

The device names entered here are used as the actual announced SignalRGB names, for example `Salon Ampul` and `Masa Prizi`.

## Logging

Normal:
- lifecycle
- connection result
- authentication errors

Debug:
- KLAP state transitions
- handshake stages
- command payloads
- reconnect behavior

Trace:
- TCP chunk sizes
- HTTP packet sizes
- response timing
- content lengths
- cookie presence (never the value)
- KLAP sequence numbers
- encryption buffer sizes

Passwords, session keys, IV values and cookie values are never logged.

## Publisher / Third-party classification

The plugin metadata is:
- Name: `Tapo Standalone`
- Publisher: `Ruzgar Labs`

SignalRGB itself controls whether user-installed plugins are displayed under its third-party/custom-service area. A JavaScript plugin cannot legitimately mark itself as an official first-party SignalRGB plugin. Official placement requires acceptance into SignalRGB's official plugin distribution.

## Firmware note

Some newer Tapo firmware uses TPAP/SPAKE2+ instead of KLAP v2. TPAP is not implemented yet.

## License

MIT.
