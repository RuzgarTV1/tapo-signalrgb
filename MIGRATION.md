# v0.4.0 migration notes

The available v0.4.0 source was reviewed as legacy input. It was not copied
forward wholesale.

| v0.4.0 behavior | Safe preview behavior |
| --- | --- |
| Reads and migrates service settings during startup | No service settings |
| Starts HTTP discovery from service initialization | Passive by default; no startup I/O |
| Reuses a password field as an API-key field | No reused/mismatched UI fields |
| Removes and recreates controllers after a UI save | No live controller rebuild |
| QML can invoke backend mutation functions | QML is static and read-only |
| Depends on a localhost `tapo-rest` bridge | Direct LAN KLAP v2 |
| Announces every created bridge in an update loop | Announces each validated, enabled controller once |

The new controller lifecycle mirrors the minimal pattern present in SignalRGB's
locally shipped Govee, Yeelight, Twinkly and WLED add-ons:

1. create a controller after validation;
2. call `service.updateController(controller)`;
3. call `service.announceController(controller)` once;
4. perform socket work only inside the device instance lifecycle.

This comparison does not prove that the preview will run on every SignalRGB
release. The service/controller surface is evidenced by shipped official
add-ons, while TCP socket behavior is also documented publicly.
