# SignalRGB Tapo Standalone

Standalone direct-LAN TP-Link Tapo integration for SignalRGB.

## v0.3.0

This release fixes the controller lifecycle used by v0.2.0.

v0.2.0 could successfully create and announce a service controller, but on some
SignalRGB builds the actual device plugin instance never entered `Initialize()`.

v0.3.0 now mirrors SignalRGB's working network-addon lifecycle:

1. create a controller
2. mark the explicitly configured device as `paired`
3. call `service.updateController(controller)`
4. call `service.announceController(controller)`
5. SignalRGB creates the device instance
6. plugin `Initialize()` starts TCP/KLAP

This matches the lifecycle pattern used by SignalRGB's Govee network integration.

## Supported

- Tapo L530 — power, brightness, hue, saturation
- Tapo P110 — power
- KLAP v2
- direct TCP port 80
- native SignalRGB settings page
- Normal / Debug / Trace logging

No tapo-rest, Rust bridge, localhost service, or API-key server.

## Install

Copy together:

- `TapoStandalone.js`
- `TapoStandalone.qml`

to SignalRGB's custom plugin folder, then fully restart SignalRGB.

## Configure

Open **Tapo Standalone**:

- Tapo account email/password
- L530 visible name + IP + enabled
- P110 visible name + IP + enabled
- Frame Skip
- Min Delta
- reconnect interval
- log level

Press **SAVE SETTINGS & RECONNECT**.

## Expected v0.3 lifecycle log

Service side:

```text
[Tapo Standalone][SERVICE] Controller constructed: ... paired=true
[Tapo Standalone][SERVICE] Backend sync: Oda [L530] @ 192.168.1.124 paired=true
[Tapo Standalone][SERVICE] Backend update complete ...
[Tapo Standalone][SERVICE] Announcing linked device: Oda ...
```

Then the critical line proving SignalRGB instantiated the device:

```text
[Tapo Standalone][BOOT] DEVICE INSTANCE INITIALIZE ENTERED
```

Then:

```text
[Tapo Standalone][L530][Oda][TCP] Connected to 192.168.1.124:80
[Tapo Standalone][L530][Oda][KLAP] handshake1 ...
[Tapo Standalone][L530][Oda][KLAP] handshake2 ...
[Tapo Standalone][L530][Oda][KLAP] READY ...
```

## If BOOT still never appears

If the service reaches `Announcing linked device` but the BOOT line never
appears, the issue is in SignalRGB's addon/controller registration layer rather
than the KLAP/TCP implementation. Include the complete service log in an issue.

## Security

Credentials are stored through SignalRGB's service settings. The plugin never
logs the actual password, session key material, or cookie value.

## Publisher

- Plugin: `Tapo Standalone`
- Publisher: `Ruzgar Labs`

SignalRGB itself determines whether a sideloaded addon is labeled custom /
third-party. That classification cannot legitimately be changed from plugin JS.

## License

MIT.
