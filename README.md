# Tapo Standalone for SignalRGB — safe preview

This is a conservative, startup-safety-first rebuild of the Tapo L530/P110
network plugin. It communicates directly with a Tapo device over LAN using
KLAP v2. It does not start or stop processes and does not require `tapo-rest`.

## Important status

- The JavaScript is syntax-checked and its SHA-1, SHA-256, AES-128 and CBC
  primitives are tested against standard vectors.
- The QML file is static: it has no buttons, callbacks, settings writes or
  controller mutations.
- The package has **not** been run against your SignalRGB installation and Tapo
  hardware. Runtime compatibility is therefore not guaranteed.
- It starts passive: `SAFE_START_ENABLED` is `false`, and both example devices
  are disabled. Installing the files alone must not initiate network traffic.

## Why this is safer than v0.4.0

The reviewed v0.4.0 code combined service startup, saved-setting migration,
HTTP discovery, controller removal/recreation, and live QML actions. This build
removes those startup-time mutations. It uses only the network lifecycle seen
in SignalRGB's shipped network add-ons plus the documented `@SignalRGB/tcp`
socket API.

Removed:

- `service.getSetting()` / `service.saveSetting()` migration logic
- `service.removeController()` loops during configuration changes
- XMLHttpRequest discovery during service initialization
- QML calls into discovery/service/controller methods
- process launching, service management and filesystem access
- automatic activation immediately after installation

## Configure before enabling

Open `TapoStandalone.js` in a text editor.

1. Set `TAPO_EMAIL` and `TAPO_PASSWORD` to the Tapo account used by the device.
2. Edit one device entry with its model, display name and fixed LAN IPv4 address.
3. Change that entry's `enabled` value to `true`.
4. Last, change `SAFE_START_ENABLED` to `true`.

Supported preview models are `L530` and `P110`. Keep unused entries disabled.
The credentials are stored as plain text in your local plugin file. Do not
commit or share the configured file.

## Safe installation

1. Fully exit SignalRGB from the system tray.
2. Back up any older `TapoStandalone.js` and `TapoStandalone.qml` files outside
   the SignalRGB plugin folder, then remove those old copies from that folder.
3. Copy the new `TapoStandalone.js` and `TapoStandalone.qml` together into the
   custom plugin folder opened from SignalRGB's **Plugins** button.
4. For the first launch, leave `SAFE_START_ENABLED = false`.
5. Start SignalRGB and confirm it remains stable. The service log should say
   `Passive mode` and there should be no Tapo network activity.
6. Exit SignalRGB again, configure the file as described above, then restart.
7. Test only one enabled device first.

Do not install multiple Tapo plugin versions at the same time.

## Immediate rollback

If SignalRGB fails to open:

1. End all SignalRGB processes in Task Manager.
2. Remove only `TapoStandalone.js` and `TapoStandalone.qml` from the custom
   plugin folder.
3. Start SignalRGB again.

If it opens but the device does not work, set `SAFE_START_ENABLED` back to
`false`, restart, and collect the SignalRGB plugin log. Do not repeatedly
restart with an authentication error; this build stops retries when the KLAP
credential proof fails.

## Known limitations

- Tapo firmware/account combinations may require a newer authentication scheme
  than KLAP v2.
- The plugin handles `Content-Length` HTTP responses. It stops safely if a
  device unexpectedly returns chunked transfer encoding.
- A JavaScript pseudo-random seed is used because no documented SignalRGB
  cryptographic-random API is available. This is a protocol/security caveat.
- QML is informational only; configuration is intentionally not writable from
  the service panel in this safety build.
- P110 exposes on/off only. It is not an RGB light.

## Files

- `TapoStandalone.js` — plugin and direct LAN protocol
- `TapoStandalone.qml` — static safety/status panel
- `VALIDATION.md` — checks performed and their scope
- `MIGRATION.md` — v0.4.0 risk comparison
- `SOURCES.md` — official API references and comparison basis
