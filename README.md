# SignalRGB Tapo Standalone

Direct-LAN TP-Link Tapo integration for SignalRGB.

## v0.4.0 — endpoint metadata fix

The v0.3 logs proved that SignalRGB accepted and announced the controller, but
the actual device plugin instance did not enter `Initialize()`.

The original SignalRGB Tapo controller model includes **both `ip` and `port`**
on every announced network controller. v0.2/v0.3 supplied the IP but omitted
the controller-level `port` property.

v0.4.0 now announces each device with an explicit network endpoint:

```text
ip   = 192.168.1.124
port = 80
```

It also removes the experimental `paired/updateController` lifecycle added in
v0.3 and returns to the simpler controller flow used by the original Tapo
network plugin:

```text
service.addController(...)
        ↓
service.announceController(...)
        ↓
device Initialize()
```

## Supported

- Tapo L530 — power, brightness, hue, saturation
- Tapo P110 — power
- direct TCP port 80
- KLAP v2
- native SignalRGB settings page
- custom device names
- Normal / Debug / Trace logs

## Install

Replace both old files with:

- `TapoStandalone.js`
- `TapoStandalone.qml`

Then fully exit SignalRGB and reopen it.

## Critical expected log

Service:

```text
[Tapo Standalone][SERVICE] Controller ready: Oda endpoint=192.168.1.124:80 ...
[Tapo Standalone][SERVICE] About to announce controller: ... ip=192.168.1.124 port=80
[Tapo Standalone][SERVICE] announceController returned ... waiting for device Initialize().
```

The important next line is:

```text
[Tapo Standalone][BOOT] DEVICE INSTANCE INITIALIZE ENTERED
```

If BOOT appears, controller registration is fixed and debugging moves to TCP/KLAP.

Then expect:

```text
[Tapo Standalone][L530][Oda][TCP] Connected to 192.168.1.124:80
[Tapo Standalone][L530][Oda][KLAP] handshake1 ...
[Tapo Standalone][L530][Oda][KLAP] handshake2 ...
[Tapo Standalone][L530][Oda][KLAP] READY ...
```

## Security

Credentials are saved through SignalRGB's service settings. Passwords,
session-cookie values, and derived encryption keys are not printed to logs.

## Publisher

Tapo Standalone — Ruzgar Labs

## License

MIT
