# Security Policy

## Credentials

The plugin currently needs Tapo account credentials to derive the KLAP authentication hash.

The configured password is stored as plaintext in the local plugin source file.

### Never commit real credentials

Public repository version:

```js
const TAPO_EMAIL = "your-tapo-email@example.com";
const TAPO_PASSWORD = "YOUR_TAPO_PASSWORD";
```

Keep your real credentials only in the copy installed on your own PC.

## Network scope

The plugin communicates directly with configured local IPv4/IPv6 host strings over TCP port 80 using Tapo's encrypted KLAP application payload.

The HTTP transport itself is not TLS; KLAP encrypts the application requests using AES-128-CBC and signs encrypted requests with SHA-256.

## Reporting a vulnerability

Open a GitHub issue without including real passwords, tokens, device IDs, or sensitive network details.
