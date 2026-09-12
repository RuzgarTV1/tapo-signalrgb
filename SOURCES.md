# API and comparison sources

Checked on 2026-09-12:

- SignalRGB developer documentation — plugin lifecycle and structure:
  <https://docs.signalrgb.com/developer/plugins/>
- SignalRGB developer documentation — TCP network communication:
  <https://docs.signalrgb.com/developer/plugins/advanced-communication/>
- SignalRGB developer documentation — supported user controls:
  <https://docs.signalrgb.com/developer/plugins/user-controls/>
- SignalRGB developer documentation — device images:
  <https://docs.signalrgb.com/developer/plugins/device-images/>
- SignalRGB troubleshooting — replacing a plugin file:
  <https://docs.signalrgb.com/troubleshooting/advanced-troubleshooting/replacing-plugin/>

The service/controller lifecycle and settings behavior were also compared with
the Govee, Yeelight, Twinkly, WLED, Nanoleaf, and Philips Hue add-ons shipped in
the installed SignalRGB add-on cache on 2026-09-12. Relevant shipped patterns
include `service.getSetting`, `service.saveSetting`, `service.updateController`,
`service.announceController`, controller `name`/`model`/`deviceImage` metadata,
and `device.setImageFromUrl`.

The two supplied product-style images are generated identification artwork,
not official TP-Link product photography. They are embedded so the package does
not rely on an external image host.

The direct Tapo KLAP v2 protocol is not a SignalRGB API. It is implemented in
plain JavaScript over SignalRGB's TCP socket module and remains experimental
until tested with physical hardware.
