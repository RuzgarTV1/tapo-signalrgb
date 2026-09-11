import { tcp } from "@SignalRGB/tcp";

// =============================================================================
// SignalRGB <-> TP-Link Tapo DIRECT LAN plugin (standalone)
// v0.1.0 - KLAP v2
//
// No tapo-rest. No API key. No localhost bridge.
// Talks directly to L530 / P110 over LAN TCP port 80.
//
// Edit ONLY the CONFIG section below.
//
// Compatibility:
// - KLAP v2 devices are supported.
// - Some newer Tapo firmware uses TPAP/SPAKE2+ instead of KLAP.
//   Those devices are not supported yet and will fail authentication/handshake.
// =============================================================================

// =============================================================================
// CONFIG
// =============================================================================

const TAPO_EMAIL = "your-tapo-email@example.com";
const TAPO_PASSWORD = "YOUR_TAPO_PASSWORD";

const TAPO_DEVICES = [
    { enabled: true, type: "l530", name: "Tapo L530", ip: "192.168.1.50" },
    { enabled: true, type: "p110", name: "Tapo P110", ip: "192.168.1.51" }
];

// About 5 RGB updates/sec at a 30 FPS render loop.
const FRAME_SKIP = 6;
const MIN_DELTA = 2;
const RECONNECT_MS = 3000;

// =============================================================================
// SIGNALRGB USER CONTROLS
// =============================================================================

var LightingMode = "Canvas";
var forcedColor = "0099ff";
var brightnessScale = "100";
var plugPower = "On";

// =============================================================================
// PLUGIN META
// =============================================================================

export function Name() { return "Tapo Standalone"; }
export function Publisher() { return "SignalRGB Community"; }
export function Version() { return "0.1.0"; }
export function Type() { return "network"; }
export function SubdeviceController() { return true; }
export function ImageUrl() { return "https://i.ibb.co/0ytq0n9Q/tapo.jpg"; }
export function DefaultPosition() { return [0, 0]; }
export function DefaultScale() { return 1.0; }
export function Size() { return [1, 1]; }

export function ControllableParameters() {
    return [
        {
            property: "LightingMode",
            group: "lighting",
            label: "Lighting Mode",
            type: "combobox",
            values: ["Canvas", "Forced"],
            default: "Canvas"
        },
        {
            property: "forcedColor",
            group: "lighting",
            label: "Forced Color",
            type: "color",
            default: "0099ff"
        },
        {
            property: "brightnessScale",
            group: "lighting",
            label: "Brightness (%)",
            type: "number",
            min: "0",
            max: "100",
            step: "1",
            default: "100"
        },
        {
            property: "plugPower",
            group: "lighting",
            label: "P110 Power",
            type: "combobox",
            values: ["On", "Off"],
            default: "On"
        }
    ];
}

// =============================================================================
// STATIC DEVICE REGISTRATION - no discovery service / no bridge process
// =============================================================================

export function DiscoveryService() {
    const disc = this;
    this.IconUrl = ImageUrl();

    this.Initialize = function() {
        service.log("[Tapo Standalone] v0.1.0 loading");
        service.log("[Tapo Standalone] No tapo-rest / direct KLAP v2 mode");

        for (const cfg of TAPO_DEVICES) {
            if (!cfg.enabled) continue;
            const type = String(cfg.type || "").toLowerCase();
            const ip = String(cfg.ip || "").trim();
            if ((type !== "l530" && type !== "p110") || !ip) {
                service.log("[Tapo Standalone] Invalid config: " + JSON.stringify(cfg));
                continue;
            }

            disc.Discovered({
                id: "tapo-direct:" + type + ":" + ip,
                name: String(cfg.name || ("Tapo " + type.toUpperCase())),
                deviceType: type,
                ip: ip
            });
        }
    };

    this.Update = function() {
        for (const cont of service.controllers) {
            const bridge = cont.obj;
            if (!bridge.announced) {
                bridge.announced = true;
                service.announceController(bridge);
            }
        }
    };

    this.Discovered = function(value) {
        if (service.getController(value.id) === undefined) {
            service.addController(new TapoDirectController(value));
        }
    };
}

class TapoDirectController {
    constructor(value) {
        this.id = value.id;
        this.name = value.name;
        this.deviceType = value.deviceType;
        this.ip = value.ip;
        this.announced = false;
    }
}

// =============================================================================
// PER-DEVICE RUNTIME STATE
// =============================================================================

let socket = null;
let socketConnected = false;
let rxBuffer = [];
let pendingHttp = null;
let reconnectAt = 0;

let klapState = "idle"; // idle, connecting, h1, h2, ready, failed
let localSeed = null;
let remoteSeed = null;
let authHash = null;
let sessionCookie = "";
let aesKey = null;
let ivPrefix = null;
let sigKey = null;
let sequence = 0;

let frameCounter = 0;
let requestBusy = false;
let lastHue = -1;
let lastSat = -1;
let lastBri = -1;
let lastPlugPower = null;

// =============================================================================
// LIFECYCLE
// =============================================================================

export function Initialize() {
    device.setName(controller.name);
    device.addChannel("Tapo", 1);

    device.log("[Tapo Standalone] Device=" + controller.deviceType + " IP=" + controller.ip);
    device.log("[Tapo Standalone] Direct LAN KLAP v2 on TCP/80");

    if (!TAPO_EMAIL || !TAPO_PASSWORD || TAPO_EMAIL.indexOf("your-tapo-email") >= 0) {
        device.log("[Tapo Standalone] ERROR: edit TAPO_EMAIL / TAPO_PASSWORD at top of plugin");
        klapState = "failed";
        return;
    }

    authHash = sha256(concatBytes(sha1(utf8(TAPO_EMAIL)), sha1(utf8(TAPO_PASSWORD))));
    openSocket();
}

export function Render() {
    const now = Date.now();

    if (!socketConnected && now >= reconnectAt && klapState !== "connecting") {
        openSocket();
    }

    if (klapState !== "ready" || requestBusy) return;

    frameCounter++;
    if (frameCounter < FRAME_SKIP) return;
    frameCounter = 0;

    if (controller.deviceType === "l530") {
        renderL530();
    } else if (controller.deviceType === "p110") {
        renderP110();
    }
}

export function Shutdown() {
    try {
        if (socket) socket.close();
    } catch (e) {}
    socketConnected = false;
    klapState = "idle";
}

// =============================================================================
// SOCKET / HTTP
// =============================================================================

function openSocket() {
    try {
        if (socket) socket.close();
    } catch (e) {}

    socketConnected = false;
    rxBuffer = [];
    pendingHttp = null;
    requestBusy = false;
    klapState = "connecting";

    socket = tcp.createSocket();

    socket.on("connected", function() {
        socketConnected = true;
        device.log("[Tapo Standalone] TCP connected " + controller.ip + ":80");
        beginHandshake1();
    });

    socket.on("message", function(data) {
        const bytes = normalizeBytes(data);
        rxBuffer = rxBuffer.concat(bytes);
        parseHttpResponses();
    });

    socket.on("disconnected", function() {
        device.log("[Tapo Standalone] TCP disconnected; reconnect scheduled");
        socketConnected = false;
        klapState = "idle";
        pendingHttp = null;
        requestBusy = false;
        reconnectAt = Date.now() + RECONNECT_MS;
    });

    socket.on("error", function(err) {
        device.log("[Tapo Standalone] TCP error: " + err);
        socketConnected = false;
        klapState = "idle";
        pendingHttp = null;
        requestBusy = false;
        reconnectAt = Date.now() + RECONNECT_MS;
    });

    socket.connect(controller.ip, 80);
}

function sendHttpPost(path, body, cookie, callback) {
    if (!socketConnected || !socket) {
        if (callback) callback(0, {}, []);
        return;
    }
    if (pendingHttp !== null) {
        device.log("[Tapo Standalone] Internal warning: HTTP request already pending");
        return;
    }

    const bodyBytes = body || [];
    let header = "POST " + path + " HTTP/1.1\r\n";
    header += "Host: " + controller.ip + "\r\n";
    header += "Connection: keep-alive\r\n";
    header += "Content-Type: application/octet-stream\r\n";
    header += "Content-Length: " + bodyBytes.length + "\r\n";
    if (cookie) header += "Cookie: " + cookie + "\r\n";
    header += "\r\n";

    pendingHttp = { callback: callback };
    socket.send(concatBytes(utf8(header), bodyBytes));
}

function parseHttpResponses() {
    while (true) {
        const headerEnd = findSequence(rxBuffer, [13, 10, 13, 10]);
        if (headerEnd < 0) return;

        const headerBytes = rxBuffer.slice(0, headerEnd);
        const headerText = bytesToAscii(headerBytes);
        const lines = headerText.split("\r\n");
        const statusParts = (lines[0] || "").split(" ");
        const status = parseInt(statusParts[1] || "0", 10) || 0;
        const headers = {};

        for (let i = 1; i < lines.length; i++) {
            const p = lines[i].indexOf(":");
            if (p > 0) {
                const k = lines[i].slice(0, p).trim().toLowerCase();
                const v = lines[i].slice(p + 1).trim();
                headers[k] = v;
            }
        }

        let contentLength = parseInt(headers["content-length"] || "0", 10) || 0;
        const bodyStart = headerEnd + 4;
        if (rxBuffer.length < bodyStart + contentLength) return;

        const body = rxBuffer.slice(bodyStart, bodyStart + contentLength);
        rxBuffer = rxBuffer.slice(bodyStart + contentLength);

        const pending = pendingHttp;
        pendingHttp = null;
        if (pending && pending.callback) {
            pending.callback(status, headers, body);
        }
    }
}

// =============================================================================
// KLAP v2 HANDSHAKE
// =============================================================================

function beginHandshake1() {
    klapState = "h1";
    localSeed = randomBytes(16);
    remoteSeed = null;
    sessionCookie = "";

    device.log("[Tapo Standalone] KLAP handshake1");

    sendHttpPost("/app/handshake1", localSeed, "", function(status, headers, body) {
        if (status !== 200 || body.length !== 48) {
            failAndReconnect("handshake1 HTTP=" + status + " len=" + body.length);
            return;
        }

        remoteSeed = body.slice(0, 16);
        const serverHash = body.slice(16, 48);
        const expected = sha256(concatBytes(localSeed, remoteSeed, authHash));

        if (!bytesEqual(serverHash, expected)) {
            device.log("[Tapo Standalone] AUTH FAILED: Tapo email/password incorrect or device is not KLAP v2");
            klapState = "failed";
            return;
        }

        const setCookie = headers["set-cookie"] || "";
        sessionCookie = extractSessionCookie(setCookie);
        if (!sessionCookie) {
            failAndReconnect("TP_SESSIONID cookie missing");
            return;
        }

        beginHandshake2();
    });
}

function beginHandshake2() {
    klapState = "h2";
    const proof = sha256(concatBytes(remoteSeed, localSeed, authHash));

    device.log("[Tapo Standalone] KLAP handshake2");

    sendHttpPost("/app/handshake2", proof, sessionCookie, function(status) {
        if (status !== 200) {
            // Newer firmware using TPAP often rejects KLAP here/earlier.
            if (status === 403) {
                device.log("[Tapo Standalone] Device rejected KLAP (HTTP 403). Firmware may require TPAP/SPAKE2+");
                klapState = "failed";
                return;
            }
            failAndReconnect("handshake2 HTTP=" + status);
            return;
        }

        deriveKlapKeys();
        klapState = "ready";
        requestBusy = false;
        device.log("[Tapo Standalone] KLAP READY - direct control active");
    });
}

function deriveKlapKeys() {
    const common = concatBytes(localSeed, remoteSeed, authHash);

    aesKey = sha256(concatBytes(utf8("lsk"), common)).slice(0, 16);

    const fullIv = sha256(concatBytes(utf8("iv"), common));
    ivPrefix = fullIv.slice(0, 12);
    sequence = bytesToSignedInt32BE(fullIv.slice(28, 32));

    sigKey = sha256(concatBytes(utf8("ldk"), common)).slice(0, 28);
}

function failAndReconnect(reason) {
    device.log("[Tapo Standalone] " + reason);
    klapState = "idle";
    requestBusy = false;
    reconnectAt = Date.now() + RECONNECT_MS;
    try { if (socket) socket.close(); } catch (e) {}
}

// =============================================================================
// ENCRYPTED KLAP REQUEST
// =============================================================================

function sendKlapJson(obj, callback) {
    if (klapState !== "ready" || !aesKey || !ivPrefix || !sigKey) {
        if (callback) callback(false, 0);
        return;
    }

    sequence = (sequence + 1) | 0;
    const seqBytes = signedInt32ToBytesBE(sequence);
    const iv = concatBytes(ivPrefix, seqBytes);
    const plain = utf8(JSON.stringify(obj));
    const padded = pkcs7Pad(plain, 16);
    const cipher = aes128CbcEncrypt(padded, aesKey, iv);
    const signature = sha256(concatBytes(sigKey, seqBytes, cipher));
    const body = concatBytes(signature, cipher);
    const path = "/app/request?seq=" + sequence;

    sendHttpPost(path, body, sessionCookie, function(status) {
        if (status !== 200) {
            device.log("[Tapo Standalone] KLAP request HTTP=" + status + " -> rehandshake");
            klapState = "idle";
            requestBusy = false;
            reconnectAt = Date.now() + RECONNECT_MS;
            try { if (socket) socket.close(); } catch (e) {}
            if (callback) callback(false, status);
            return;
        }

        if (callback) callback(true, status);
    });
}

// =============================================================================
// DEVICE CONTROL
// =============================================================================

function renderL530() {
    let rgb;
    if (LightingMode === "Forced") rgb = hexToRgb(forcedColor);
    else rgb = getCanvasColor();

    const hsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
    const hue = hsv[0];
    const sat = hsv[1];
    let bri = hsv[2];

    let scale = parseInt(brightnessScale, 10);
    if (isNaN(scale)) scale = 100;
    scale = clamp(scale, 0, 100);
    bri = clamp(Math.round(bri * scale / 100), 0, 100);

    const hueDiff = lastHue < 0 ? 360 : circularHueDelta(hue, lastHue);
    const satDiff = lastSat < 0 ? 100 : Math.abs(sat - lastSat);
    const briDiff = lastBri < 0 ? 100 : Math.abs(bri - lastBri);

    if (hueDiff < MIN_DELTA && satDiff < MIN_DELTA && briDiff < MIN_DELTA) return;

    lastHue = hue;
    lastSat = sat;
    lastBri = bri;
    requestBusy = true;

    const params = bri <= 0
        ? { device_on: false }
        : {
            device_on: true,
            brightness: Math.max(1, bri),
            hue: hue,
            saturation: sat,
            color_temp: 0
        };

    sendKlapJson({ method: "set_device_info", params: params }, function(ok) {
        requestBusy = false;
        if (!ok) device.log("[Tapo Standalone] L530 update failed");
    });
}

function renderP110() {
    const desired = plugPower === "On";
    if (lastPlugPower === desired) return;
    lastPlugPower = desired;
    requestBusy = true;

    sendKlapJson({
        method: "set_device_info",
        params: { device_on: desired }
    }, function(ok) {
        requestBusy = false;
        if (!ok) device.log("[Tapo Standalone] P110 update failed");
    });
}

// =============================================================================
// CANVAS / COLOR
// =============================================================================

function getCanvasColor() {
    const colors = device.channel("Tapo").getColors("Inline");
    if (!colors || colors.length < 3) return [0, 0, 0];
    return [Number(colors[0]) || 0, Number(colors[1]) || 0, Number(colors[2]) || 0];
}

function hexToRgb(hex) {
    let v = String(hex || "").replace("#", "").trim();
    if (!/^[0-9a-fA-F]{6}$/.test(v)) v = "0099ff";
    const n = parseInt(v, 16);
    return [(n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}

function rgbToHsv(r, g, b) {
    r = clamp(Number(r) || 0, 0, 255) / 255;
    g = clamp(Number(g) || 0, 0, 255) / 255;
    b = clamp(Number(b) || 0, 0, 255) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;

    if (d !== 0) {
        if (max === r) h = 60 * (((g - b) / d) % 6);
        else if (max === g) h = 60 * (((b - r) / d) + 2);
        else h = 60 * (((r - g) / d) + 4);
    }
    if (h < 0) h += 360;

    const s = max === 0 ? 0 : (d / max) * 100;
    const v = max * 100;
    return [Math.round(h), Math.round(s), Math.round(v)];
}

function circularHueDelta(a, b) {
    const d = Math.abs(a - b) % 360;
    return Math.min(d, 360 - d);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// =============================================================================
// BYTE / HTTP HELPERS
// =============================================================================

function normalizeBytes(data) {
    if (Array.isArray(data)) return data.map(function(x) { return Number(x) & 255; });
    if (typeof data === "string") return utf8(data);
    if (data && typeof data.length === "number") {
        const out = [];
        for (let i = 0; i < data.length; i++) out.push(Number(data[i]) & 255);
        return out;
    }
    return [];
}

function concatBytes() {
    const out = [];
    for (let a = 0; a < arguments.length; a++) {
        const arr = arguments[a] || [];
        for (let i = 0; i < arr.length; i++) out.push(arr[i] & 255);
    }
    return out;
}

function utf8(str) {
    const out = [];
    str = String(str);
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c < 0x80) out.push(c);
        else if (c < 0x800) {
            out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
        } else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) {
            const c2 = str.charCodeAt(++i);
            const cp = 0x10000 + (((c & 0x3FF) << 10) | (c2 & 0x3FF));
            out.push(
                0xF0 | (cp >> 18),
                0x80 | ((cp >> 12) & 0x3F),
                0x80 | ((cp >> 6) & 0x3F),
                0x80 | (cp & 0x3F)
            );
        } else {
            out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
        }
    }
    return out;
}

function bytesToAscii(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i] & 255);
    return s;
}

function findSequence(haystack, needle) {
    outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
        for (let j = 0; j < needle.length; j++) {
            if (haystack[i + j] !== needle[j]) continue outer;
        }
        return i;
    }
    return -1;
}

function extractSessionCookie(setCookie) {
    const parts = String(setCookie || "").split(";");
    for (let i = 0; i < parts.length; i++) {
        const p = parts[i].trim();
        if (p.indexOf("TP_SESSIONID=") === 0) return p;
    }
    return "";
}

function randomBytes(n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(Math.floor(Math.random() * 256) & 255);
    return out;
}

function bytesEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    let d = 0;
    for (let i = 0; i < a.length; i++) d |= (a[i] ^ b[i]);
    return d === 0;
}

function bytesToSignedInt32BE(b) {
    return ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) | 0;
}

function signedInt32ToBytesBE(n) {
    n = n | 0;
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}

function pkcs7Pad(data, blockSize) {
    const pad = blockSize - (data.length % blockSize);
    const out = data.slice();
    for (let i = 0; i < pad; i++) out.push(pad);
    return out;
}

// =============================================================================
// SHA-1
// =============================================================================

function sha1(message) {
    const bytes = message.slice();
    const bitLenHi = Math.floor((bytes.length * 8) / 0x100000000);
    const bitLenLo = (bytes.length * 8) >>> 0;

    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    bytes.push((bitLenHi >>> 24) & 255, (bitLenHi >>> 16) & 255, (bitLenHi >>> 8) & 255, bitLenHi & 255);
    bytes.push((bitLenLo >>> 24) & 255, (bitLenLo >>> 16) & 255, (bitLenLo >>> 8) & 255, bitLenLo & 255);

    let h0 = 0x67452301 | 0;
    let h1 = 0xEFCDAB89 | 0;
    let h2 = 0x98BADCFE | 0;
    let h3 = 0x10325476 | 0;
    let h4 = 0xC3D2E1F0 | 0;

    const w = new Array(80);

    for (let off = 0; off < bytes.length; off += 64) {
        for (let i = 0; i < 16; i++) {
            const p = off + i * 4;
            w[i] = ((bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]) | 0;
        }
        for (let i = 16; i < 80; i++) w[i] = rol32(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);

        let a = h0, b = h1, c = h2, d = h3, e = h4;
        for (let i = 0; i < 80; i++) {
            let f, k;
            if (i < 20) { f = (b & c) | ((~b) & d); k = 0x5A827999; }
            else if (i < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
            else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
            else { f = b ^ c ^ d; k = 0xCA62C1D6; }
            const temp = (rol32(a, 5) + f + e + k + w[i]) | 0;
            e = d; d = c; c = rol32(b, 30); b = a; a = temp;
        }
        h0 = (h0 + a) | 0;
        h1 = (h1 + b) | 0;
        h2 = (h2 + c) | 0;
        h3 = (h3 + d) | 0;
        h4 = (h4 + e) | 0;
    }

    return wordsToBytes([h0, h1, h2, h3, h4]);
}

// =============================================================================
// SHA-256
// =============================================================================

const SHA256_K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
];

function sha256(message) {
    const bytes = message.slice();
    const bitLenHi = Math.floor((bytes.length * 8) / 0x100000000);
    const bitLenLo = (bytes.length * 8) >>> 0;

    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    bytes.push((bitLenHi >>> 24) & 255, (bitLenHi >>> 16) & 255, (bitLenHi >>> 8) & 255, bitLenHi & 255);
    bytes.push((bitLenLo >>> 24) & 255, (bitLenLo >>> 16) & 255, (bitLenLo >>> 8) & 255, bitLenLo & 255);

    let H = [
        0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
        0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19
    ];

    const w = new Array(64);

    for (let off = 0; off < bytes.length; off += 64) {
        for (let i = 0; i < 16; i++) {
            const p = off + i * 4;
            w[i] = (((bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]) >>> 0);
        }
        for (let i = 16; i < 64; i++) {
            const x = w[i - 15];
            const y = w[i - 2];
            const s0 = (ror32(x, 7) ^ ror32(x, 18) ^ (x >>> 3)) >>> 0;
            const s1 = (ror32(y, 17) ^ ror32(y, 19) ^ (y >>> 10)) >>> 0;
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }

        let a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
        for (let i = 0; i < 64; i++) {
            const S1 = (ror32(e,6) ^ ror32(e,11) ^ ror32(e,25)) >>> 0;
            const ch = ((e & f) ^ ((~e) & g)) >>> 0;
            const t1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
            const S0 = (ror32(a,2) ^ ror32(a,13) ^ ror32(a,22)) >>> 0;
            const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
            const t2 = (S0 + maj) >>> 0;
            h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
        }

        H = [
            (H[0]+a)>>>0,(H[1]+b)>>>0,(H[2]+c)>>>0,(H[3]+d)>>>0,
            (H[4]+e)>>>0,(H[5]+f)>>>0,(H[6]+g)>>>0,(H[7]+h)>>>0
        ];
    }

    return wordsToBytes(H);
}

function rol32(x, n) { return ((x << n) | (x >>> (32 - n))) | 0; }
function ror32(x, n) { return ((x >>> n) | (x << (32 - n))) >>> 0; }
function wordsToBytes(words) {
    const out = [];
    for (let i = 0; i < words.length; i++) {
        const w = words[i] >>> 0;
        out.push((w >>> 24)&255,(w >>> 16)&255,(w >>> 8)&255,w&255);
    }
    return out;
}

// =============================================================================
// AES-128 CBC (encryption only)
// =============================================================================

const AES_SBOX = [
0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
];

const AES_RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];

function aes128CbcEncrypt(data, key, iv) {
    if (key.length !== 16 || iv.length !== 16 || data.length % 16 !== 0) throw new Error("AES bad length");
    const roundKeys = aesExpandKey(key);
    const out = [];
    let prev = iv.slice();

    for (let off = 0; off < data.length; off += 16) {
        const block = [];
        for (let i = 0; i < 16; i++) block[i] = data[off + i] ^ prev[i];
        const enc = aesEncryptBlock(block, roundKeys);
        for (let i = 0; i < 16; i++) out.push(enc[i]);
        prev = enc;
    }
    return out;
}

function aesExpandKey(key) {
    const w = key.slice();
    let bytesGenerated = 16;
    let rconIndex = 0;
    let temp = [0,0,0,0];

    while (bytesGenerated < 176) {
        for (let i = 0; i < 4; i++) temp[i] = w[bytesGenerated - 4 + i];
        if ((bytesGenerated % 16) === 0) {
            temp = [temp[1], temp[2], temp[3], temp[0]];
            for (let i = 0; i < 4; i++) temp[i] = AES_SBOX[temp[i]];
            temp[0] ^= AES_RCON[rconIndex++];
        }
        for (let i = 0; i < 4; i++) {
            w[bytesGenerated] = (w[bytesGenerated - 16] ^ temp[i]) & 255;
            bytesGenerated++;
        }
    }
    return w;
}

function aesEncryptBlock(input, roundKeys) {
    const s = input.slice();
    aesAddRoundKey(s, roundKeys, 0);

    for (let round = 1; round <= 9; round++) {
        aesSubBytes(s);
        aesShiftRows(s);
        aesMixColumns(s);
        aesAddRoundKey(s, roundKeys, round);
    }

    aesSubBytes(s);
    aesShiftRows(s);
    aesAddRoundKey(s, roundKeys, 10);
    return s;
}

function aesAddRoundKey(s, rk, round) {
    const off = round * 16;
    for (let i = 0; i < 16; i++) s[i] ^= rk[off + i];
}

function aesSubBytes(s) {
    for (let i = 0; i < 16; i++) s[i] = AES_SBOX[s[i]];
}

function aesShiftRows(s) {
    const t = s.slice();
    s[0]=t[0]; s[4]=t[4]; s[8]=t[8]; s[12]=t[12];
    s[1]=t[5]; s[5]=t[9]; s[9]=t[13]; s[13]=t[1];
    s[2]=t[10]; s[6]=t[14]; s[10]=t[2]; s[14]=t[6];
    s[3]=t[15]; s[7]=t[3]; s[11]=t[7]; s[15]=t[11];
}

function xtime(a) { return (((a << 1) ^ ((a & 0x80) ? 0x1b : 0)) & 255); }

function aesMixColumns(s) {
    for (let c = 0; c < 4; c++) {
        const i = c * 4;
        const a0=s[i], a1=s[i+1], a2=s[i+2], a3=s[i+3];
        const t = a0 ^ a1 ^ a2 ^ a3;
        const u = a0;
        s[i]   = (a0 ^ t ^ xtime(a0 ^ a1)) & 255;
        s[i+1] = (a1 ^ t ^ xtime(a1 ^ a2)) & 255;
        s[i+2] = (a2 ^ t ^ xtime(a2 ^ a3)) & 255;
        s[i+3] = (a3 ^ t ^ xtime(a3 ^ u)) & 255;
    }
}
