# Changelog

## 0.3.0

- Fixed network controller lifecycle.
- Configured devices now carry `paired=true`.
- Added `service.updateController()` before controller announcement.
- Added explicit backend-sync diagnostics.
- Added unmistakable device-instance BOOT logs.
- Added controller refresh/update method.
- Kept native settings panel and deep diagnostic logging from v0.2.0.
- Architecture aligned with SignalRGB's working Govee network-addon pattern.

## 0.2.0
- Added native TapoStandalone.qml configuration page.
- Removed embedded email/password/device IP configuration.
- Persistent SignalRGB service settings.
- Custom visible names for L530 and P110.
- Added Normal, Debug and Trace logging.
- Added detailed TCP, HTTP, KLAP, command and recovery diagnostics.
- Password/session keys/cookie values are never logged.
- Publisher metadata changed to Ruzgar Labs.

## 0.1.0
- Initial standalone KLAP v2 proof of concept.
