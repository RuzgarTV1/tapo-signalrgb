# SignalRGB Tapo Standalone

Standalone **SignalRGB network plugin** for controlling TP-Link Tapo devices directly over the local network.

No `tapo-rest`, no Rust bridge, no localhost service, and no API key server.

## Supported devices

Initial target support:

- **Tapo L530** — power, brightness, hue and saturation
- **Tapo P110** — power on/off

The plugin implements the **Tapo KLAP v2** local protocol directly inside SignalRGB:

1. TCP connection to the device on port 80
2. `POST /app/handshake1`
3. `POST /app/handshake2`
4. KLAP key derivation
5. AES-128-CBC encrypted `POST /app/request?seq=...`
6. `set_device_info` commands

> Some newer Tapo firmware uses **TPAP/SPAKE2+** instead of KLAP. TPAP is not implemented in this first release.

## Requirements

- Windows with SignalRGB
- SignalRGB version that supports the `@SignalRGB/tcp` network module
- Tapo devices reachable from the PC over the LAN
- TCP port 80 reachable on each Tapo device
- Tapo account email/password used by those devices
- Static/reserved IP addresses are strongly recommended

## Install

1. Open `TapoStandalone.js`.
2. Edit the configuration block at the top:

```js
const TAPO_EMAIL = "your-tapo-email@example.com";
const TAPO_PASSWORD = "YOUR_TAPO_PASSWORD";

const TAPO_DEVICES = [
    { enabled: true, type: "l530", name: "Tapo L530", ip: "192.168.1.50" },
    { enabled: true, type: "p110", name: "Tapo P110", ip: "192.168.1.51" }
];
```

3. Put `TapoStandalone.js` in your SignalRGB user plugin location.
4. Fully exit SignalRGB and start it again.
5. Enable the discovered Tapo device(s).

SignalRGB's documentation describes network plugins as `Type() === "network"` plugins using `@SignalRGB/tcp`.

## Expected log

A successful KLAP session should look similar to:

```text
[Tapo Standalone] Device=l530 IP=192.168.1.50
[Tapo Standalone] Direct LAN KLAP v2 TCP/80
[Tapo Standalone] TCP connected 192.168.1.50:80
[Tapo Standalone] KLAP handshake1
[Tapo Standalone] KLAP handshake2
[Tapo Standalone] KLAP READY
```

## L530 behavior

The plugin maps one SignalRGB canvas pixel to the bulb.

It sends a `set_device_info` request containing:

- `device_on`
- `brightness`
- `hue`
- `saturation`
- `color_temp: 0`

Updates are rate-limited with `FRAME_SKIP` to avoid flooding the bulb.

## P110 behavior

P110 is not an RGB device. It exposes a **P110 Power** control in SignalRGB:

- `On`
- `Off`

## Security

Your Tapo account password is currently stored as plaintext in your local JavaScript file.

Do **not** commit your real credentials or private LAN configuration to a public GitHub repository.

Before publishing, keep the placeholder values in the repository and put real values only in your local installed copy.

See [SECURITY.md](SECURITY.md).

## Known limitations

- KLAP v2 only.
- TPAP/SPAKE2+ is not implemented.
- Device auto-discovery is not implemented; IPs are configured manually.
- Encrypted responses are not currently parsed for command-level error codes; HTTP/session failures are detected.
- If DHCP changes the device IP, update the config or reserve an address in your router.

## Development

Syntax check:

```powershell
./scripts/check-syntax.ps1
```

The GitHub Actions workflow performs the same JavaScript syntax validation.

## License

MIT
