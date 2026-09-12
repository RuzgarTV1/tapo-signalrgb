# API and comparison sources

Checked on 2026-09-12:

- SignalRGB developer documentation — plugin lifecycle and structure:
  <https://docs.signalrgb.com/developer/plugins/>
- SignalRGB developer documentation — TCP network communication:
  <https://docs.signalrgb.com/developer/plugins/advanced-communication/>
- SignalRGB developer documentation — supported user controls:
  <https://docs.signalrgb.com/developer/plugins/user-controls/>
- SignalRGB troubleshooting — replacing a plugin file:
  <https://docs.signalrgb.com/troubleshooting/advanced-troubleshooting/replacing-plugin/>

The service/controller lifecycle was also compared with the Govee, Yeelight,
Twinkly and WLED JavaScript add-ons shipped in the installed SignalRGB add-on
cache on 2026-09-12. Those shipped files consistently create a controller,
update it with `service.updateController()`, and announce it with
`service.announceController()`.

The direct Tapo KLAP v2 protocol implementation is not a SignalRGB API. It is
implemented locally in plain JavaScript over the documented TCP socket. It is
included as an experimental protocol layer and requires physical-device
testing before it can be called verified.
