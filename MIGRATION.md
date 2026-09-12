# v0.4.0 migration notes

The available v0.4.0 source was treated as legacy input and was not copied forward wholesale.

| v0.4.0 behavior | 0.6.0 safe-preview behavior |
| --- | --- |
| Startup migration and several setting mutations | Reads settings at startup; writes only after the explicit Save button |
| HTTP discovery during service initialization | No HTTP discovery; only explicitly enabled fixed-IP devices are announced |
| Password field reused for another value | Dedicated masked password field and separate device fields |
| Removes/recreates controllers after a UI save | No live controller removal or rebuild; restart is required |
| QML can perform broad backend mutations | One bounded `discovery.saveConfiguration(...)` action |
| Depends on a localhost `tapo-rest` bridge | Direct LAN KLAP v2; no process/service controller |
| Generic external-device presentation | Explicit Tapo brand, TP-Link manufacturer, model, product, name and image metadata |

The controller lifecycle follows the minimal pattern seen in SignalRGB's shipped network add-ons: validate configuration, create a controller, call `service.updateController`, call `service.announceController` once, and keep socket activity inside the device instance lifecycle.

This comparison does not prove compatibility with every SignalRGB release or Tapo firmware version.
