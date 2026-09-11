# Security Policy

Credentials are entered in the Tapo Standalone SignalRGB service page and persisted via SignalRGB service settings.

The plugin never logs:
- account password
- AES key
- signature key
- IV material values
- TP_SESSIONID cookie value

Debug/Trace can include:
- local device names and IPs
- HTTP status codes
- packet sizes and timing
- KLAP states and sequence numbers
- non-secret lighting command parameters
