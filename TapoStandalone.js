import { tcp } from "@SignalRGB/tcp";

// Tapo Standalone for SignalRGB - conservative rebuild
// Version 0.5.0-safety-preview
//
// STARTUP-SAFETY DEFAULT: this plugin does nothing until SAFE_START_ENABLED is
// changed to true. Configure the account and device list first, then enable it.

const SAFE_START_ENABLED = false;
const TAPO_EMAIL = "your-tapo-email@example.com";
const TAPO_PASSWORD = "CHANGE_ME";

const TAPO_DEVICES = [
    { enabled: false, model: "L530", name: "Tapo L530", ip: "192.168.1.50" },
    { enabled: false, model: "P110", name: "Tapo P110", ip: "192.168.1.51" }
];

const TAPO_PORT = 80;
const FRAME_SKIP = 6;
const MIN_DELTA = 3;
const REQUEST_TIMEOUT_MS = 5000;
const RECONNECT_DELAY_MS = 5000;

var LightingMode = "Canvas";
var forcedColor = "#0099ff";
var brightnessScale = "100";
var plugPower = "On";

export function Name() { return "Tapo Standalone (Safe Preview)"; }
export function Publisher() { return "Ruzgar Labs"; }
export function Version() { return "0.5.0"; }
export function Type() { return "network"; }
export function SubdeviceController() { return true; }
export function Size() { return [1, 1]; }
export function DefaultPosition() { return [0, 0]; }
export function DefaultScale() { return 1.0; }
export function LedNames() { return ["Tapo"]; }
export function LedPositions() { return [[0, 0]]; }

export function ControllableParameters() {
    return [
        { property: "LightingMode", label: "Lighting Mode", type: "combobox", values: ["Canvas", "Forced"], default: "Canvas" },
        { property: "forcedColor", label: "Forced Color", type: "color", min: "0", max: "360", default: "#0099ff" },
        { property: "brightnessScale", label: "Brightness (%)", type: "number", min: "0", max: "100", step: "1", default: "100" },
        { property: "plugPower", label: "P110 Power", type: "combobox", values: ["On", "Off"], default: "On" }
    ];
}

// The service/controller shape follows the network add-ons bundled with
// SignalRGB. No settings, process control, timers, filesystem access, or QML
// callbacks are used.
export function DiscoveryService() {
    this.started = false;

    this.Initialize = function() {
        service.log("[Tapo Safe] Service loaded; safe-start=" + SAFE_START_ENABLED);
        if (!SAFE_START_ENABLED) {
            service.log("[Tapo Safe] Passive mode. Edit TapoStandalone.js before enabling devices.");
        }
    };

    this.Update = function() {
        if (!this.started) {
            this.started = true;
            registerConfiguredDevices();
        }

        for (const item of service.controllers) {
            if (item && item.obj && typeof item.obj.update === "function") {
                item.obj.update();
            }
        }
    };

    this.Shutdown = function() {};

    function registerConfiguredDevices() {
        if (!SAFE_START_ENABLED) return;

        if (!credentialsConfigured()) {
            service.log("[Tapo Safe] No devices registered: configure TAPO_EMAIL and TAPO_PASSWORD.");
            return;
        }

        for (const config of TAPO_DEVICES) {
            if (!config || config.enabled !== true) continue;

            const model = String(config.model || "").toUpperCase();
            const ip = String(config.ip || "").trim();
            const name = String(config.name || ("Tapo " + model)).trim();

            if (model !== "L530" && model !== "P110") {
                service.log("[Tapo Safe] Skipped unsupported model: " + model);
                continue;
            }

            if (!validIPv4(ip)) {
                service.log("[Tapo Safe] Skipped " + name + ": invalid IPv4 address.");
                continue;
            }

            const id = "tapo-safe:" + model.toLowerCase() + ":" + ip;
            if (service.getController(id) === undefined) {
                service.addController(new TapoController(id, name, model, ip));
            }
        }
    }
}

class TapoController {
    constructor(id, name, model, ip) {
        this.id = id;
        this.name = name;
        this.model = model;
        this.ip = ip;
        this.port = TAPO_PORT;
        this.paired = true;
        this.initialized = false;
    }

    update() {
        if (this.initialized) return;
        this.initialized = true;
        service.updateController(this);
        service.announceController(this);
        service.log("[Tapo Safe] Announced " + this.name + " at " + this.ip + ":" + this.port);
    }
}

let socket;
let connected = false;
let state = "idle";
let receiveBuffer = [];
let pendingResponse = null;
let reconnectAt = 0;
let localSeed = [];
let remoteSeed = [];
let authHash = [];
let aesKey = [];
let ivPrefix = [];
let signatureKey = [];
let sequence = 0;
let cookie = "";
let frameCounter = 0;
let lastHue = -1;
let lastSaturation = -1;
let lastBrightness = -1;
let lastPower = null;

export function Initialize() {
    resetRuntime();
    device.setName(controller.name);
    device.addChannel("Tapo", 1);
    device.log("[Tapo Safe] Initializing " + controller.model + " at " + controller.ip + ":" + controller.port);

    if (!SAFE_START_ENABLED || !credentialsConfigured() || !validIPv4(controller.ip)) {
        state = "disabled";
        device.log("[Tapo Safe] Initialization stopped by configuration guard.");
        return;
    }

    authHash = sha256(concatBytes(sha1(utf8(TAPO_EMAIL.toLowerCase())), sha1(utf8(TAPO_PASSWORD))));
    connectSocket();
}

export function Render() {
    const now = Date.now();

    if (pendingResponse && now >= pendingResponse.deadline) {
        device.log("[Tapo Safe] Request timeout; reconnecting.");
        failAndReconnect();
    }

    if (!connected && state === "idle" && now >= reconnectAt) {
        connectSocket();
    }

    if (state !== "ready" || pendingResponse) return;

    frameCounter++;
    if (frameCounter < FRAME_SKIP) return;
    frameCounter = 0;

    if (controller.model === "P110") {
        renderPlug();
    } else {
        renderBulb();
    }
}

export function Shutdown() {
    closeSocket();
    state = "idle";
}

function connectSocket() {
    if (state === "disabled" || state === "connecting") return;
    closeSocket();
    receiveBuffer = [];
    pendingResponse = null;
    state = "connecting";

    try {
        const currentSocket = tcp.createSocket();
        socket = currentSocket;
        currentSocket.on("connected", function() {
            if (socket !== currentSocket) return;
            connected = true;
            device.log("[Tapo Safe] TCP connected.");
            beginHandshake1();
        });
        currentSocket.on("message", function(data) {
            if (socket !== currentSocket) return;
            receiveBuffer = receiveBuffer.concat(normalizeBytes(data));
            parseHttpResponse();
        });
        currentSocket.on("disconnected", function() {
            if (socket !== currentSocket) return;
            if (state !== "disabled") scheduleReconnect("TCP disconnected");
        });
        currentSocket.on("error", function(error) {
            if (socket !== currentSocket) return;
            if (state !== "disabled") scheduleReconnect("TCP error: " + String(error));
        });
        currentSocket.connect(controller.ip, controller.port);
    } catch (error) {
        scheduleReconnect("Socket setup failed: " + String(error));
    }
}

function closeSocket() {
    const oldSocket = socket;
    socket = undefined;
    if (oldSocket) {
        try { oldSocket.close(); } catch (error) {}
    }
    connected = false;
    pendingResponse = null;
}

function scheduleReconnect(message) {
    if (state === "disabled") return;
    closeSocket();
    state = "idle";
    reconnectAt = Date.now() + RECONNECT_DELAY_MS;
    device.log("[Tapo Safe] " + message + "; retry in " + RECONNECT_DELAY_MS + " ms.");
}

function failAndReconnect() {
    scheduleReconnect("Protocol session reset");
}

function resetRuntime() {
    closeSocket();
    state = "idle";
    receiveBuffer = [];
    localSeed = [];
    remoteSeed = [];
    authHash = [];
    aesKey = [];
    ivPrefix = [];
    signatureKey = [];
    sequence = 0;
    cookie = "";
    frameCounter = 0;
    lastHue = -1;
    lastSaturation = -1;
    lastBrightness = -1;
    lastPower = null;
    reconnectAt = 0;
}

function beginHandshake1() {
    state = "handshake1";
    localSeed = randomBytes(16);
    sendHttp("/app/handshake1", localSeed, "", function(status, headers, body) {
        if (status !== 200 || body.length < 48) {
            scheduleReconnect("Handshake 1 rejected (HTTP " + status + ")");
            return;
        }

        remoteSeed = body.slice(0, 16);
        const receivedHash = body.slice(16, 48);
        const expectedHash = sha256(concatBytes(localSeed, remoteSeed, authHash));
        if (!equalBytes(receivedHash, expectedHash)) {
            state = "disabled";
            closeSocket();
            device.log("[Tapo Safe] Authentication failed. Check email/password; automatic retries stopped.");
            return;
        }

        cookie = firstCookie(headers["set-cookie"] || "");
        beginHandshake2();
    });
}

function beginHandshake2() {
    state = "handshake2";
    const proof = sha256(concatBytes(remoteSeed, localSeed, authHash));
    sendHttp("/app/handshake2", proof, cookie, function(status) {
        if (status !== 200) {
            scheduleReconnect("Handshake 2 rejected (HTTP " + status + ")");
            return;
        }

        deriveSessionKeys();
        state = "ready";
        device.log("[Tapo Safe] KLAP session ready.");
    });
}

function deriveSessionKeys() {
    const material = concatBytes(localSeed, remoteSeed, authHash);
    aesKey = sha256(concatBytes(utf8("lsk"), material)).slice(0, 16);
    const ivHash = sha256(concatBytes(utf8("iv"), material));
    ivPrefix = ivHash.slice(0, 12);
    sequence = readU32(ivHash, 28);
    signatureKey = sha256(concatBytes(utf8("ldk"), material)).slice(0, 28);
}

function sendKlapCommand(payload) {
    if (state !== "ready" || pendingResponse) return;
    sequence = (sequence + 1) >>> 0;
    const sequenceBytes = u32be(sequence);
    const iv = concatBytes(ivPrefix, sequenceBytes);
    const encrypted = aesCbcEncrypt(utf8(JSON.stringify(payload)), aesKey, iv);
    const signature = sha256(concatBytes(signatureKey, sequenceBytes, encrypted));

    sendHttp("/app/request?seq=" + sequence, concatBytes(signature, encrypted), cookie, function(status, headers, body) {
        if (status !== 200) {
            scheduleReconnect("Device command rejected (HTTP " + status + ")");
            return;
        }

        // A response is optional for rendering. Validate/decrypt it when present,
        // but never let malformed device data escape into SignalRGB's lifecycle.
        if (body.length > 32) {
            try {
                const responseSignature = body.slice(0, 32);
                const responseCiphertext = body.slice(32);
                const expected = sha256(concatBytes(signatureKey, sequenceBytes, responseCiphertext));
                if (equalBytes(responseSignature, expected)) {
                    aesCbcDecrypt(responseCiphertext, aesKey, iv);
                }
            } catch (error) {
                device.log("[Tapo Safe] Ignored malformed command response.");
            }
        }
    });
}

function renderBulb() {
    let rgb = LightingMode === "Forced" ? hexToRgb(forcedColor) : normalizeColor(device.color(0, 0));
    const hsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
    const scale = clamp(parseInteger(brightnessScale, 100), 0, 100);
    const brightness = clamp(Math.round(hsv[2] * scale / 100), 0, 100);

    if (brightness === 0) {
        if (lastPower !== false) {
            lastPower = false;
            sendKlapCommand({ method: "set_device_info", params: { device_on: false } });
        }
        return;
    }

    const changed = lastPower !== true || hueDistance(hsv[0], lastHue) >= MIN_DELTA ||
        Math.abs(hsv[1] - lastSaturation) >= MIN_DELTA || Math.abs(brightness - lastBrightness) >= MIN_DELTA;
    if (!changed) return;

    lastPower = true;
    lastHue = hsv[0];
    lastSaturation = hsv[1];
    lastBrightness = brightness;
    sendKlapCommand({
        method: "set_device_info",
        params: { device_on: true, hue: hsv[0], saturation: hsv[1], brightness: brightness, color_temp: 0 }
    });
}

function renderPlug() {
    const shouldBeOn = plugPower === "On";
    if (lastPower === shouldBeOn) return;
    lastPower = shouldBeOn;
    sendKlapCommand({ method: "set_device_info", params: { device_on: shouldBeOn } });
}

function sendHttp(path, body, requestCookie, callback) {
    if (!connected || !socket || pendingResponse) return;
    const payload = body || [];
    let header = "POST " + path + " HTTP/1.1\r\n" +
        "Host: " + controller.ip + "\r\n" +
        "Connection: keep-alive\r\n" +
        "Content-Type: application/octet-stream\r\n" +
        "Content-Length: " + payload.length + "\r\n";
    if (requestCookie) header += "Cookie: " + requestCookie + "\r\n";
    header += "\r\n";

    pendingResponse = { callback: callback, deadline: Date.now() + REQUEST_TIMEOUT_MS };
    try {
        socket.send(concatBytes(utf8(header), payload));
    } catch (error) {
        scheduleReconnect("TCP send failed: " + String(error));
    }
}

function parseHttpResponse() {
    while (pendingResponse) {
        const headerEnd = findBytes(receiveBuffer, [13, 10, 13, 10]);
        if (headerEnd < 0) return;
        const headerText = ascii(receiveBuffer.slice(0, headerEnd));
        const lines = headerText.split("\r\n");
        const statusParts = String(lines[0] || "").split(" ");
        const status = parseInteger(statusParts[1], 0);
        const headers = {};

        for (let i = 1; i < lines.length; i++) {
            const colon = lines[i].indexOf(":");
            if (colon > 0) headers[lines[i].slice(0, colon).trim().toLowerCase()] = lines[i].slice(colon + 1).trim();
        }

        if (String(headers["transfer-encoding"] || "").toLowerCase().indexOf("chunked") >= 0) {
            state = "disabled";
            closeSocket();
            device.log("[Tapo Safe] Chunked HTTP is unsupported; session stopped safely.");
            return;
        }

        const length = parseInteger(headers["content-length"], 0);
        if (length < 0 || length > 1048576) {
            state = "disabled";
            closeSocket();
            device.log("[Tapo Safe] Invalid HTTP response length; session stopped safely.");
            return;
        }

        const bodyStart = headerEnd + 4;
        if (receiveBuffer.length < bodyStart + length) return;
        const body = receiveBuffer.slice(bodyStart, bodyStart + length);
        receiveBuffer = receiveBuffer.slice(bodyStart + length);
        const request = pendingResponse;
        pendingResponse = null;

        try {
            request.callback(status, headers, body);
        } catch (error) {
            scheduleReconnect("Response handling failed: " + String(error));
        }
    }
}

function credentialsConfigured() {
    return TAPO_EMAIL.indexOf("@") > 0 && TAPO_EMAIL !== "your-tapo-email@example.com" &&
        TAPO_PASSWORD.length > 0 && TAPO_PASSWORD !== "CHANGE_ME";
}

function validIPv4(value) {
    const parts = String(value).split(".");
    if (parts.length !== 4) return false;
    for (const part of parts) {
        if (!/^\d{1,3}$/.test(part)) return false;
        const number = parseInt(part, 10);
        if (number < 0 || number > 255 || String(number) !== part.replace(/^0+(?=\d)/, "")) return false;
    }
    return true;
}

function normalizeColor(value) {
    if (!value || value.length < 3) return [0, 0, 0];
    return [clamp(Number(value[0]) || 0, 0, 255), clamp(Number(value[1]) || 0, 0, 255), clamp(Number(value[2]) || 0, 0, 255)];
}

function hexToRgb(value) {
    let text = String(value || "").replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(text)) text = "0099ff";
    return [parseInt(text.slice(0, 2), 16), parseInt(text.slice(2, 4), 16), parseInt(text.slice(4, 6), 16)];
}

function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let hue = 0;
    if (delta !== 0) {
        if (max === r) hue = 60 * (((g - b) / delta) % 6);
        else if (max === g) hue = 60 * (((b - r) / delta) + 2);
        else hue = 60 * (((r - g) / delta) + 4);
    }
    if (hue < 0) hue += 360;
    return [Math.round(hue), Math.round(max === 0 ? 0 : delta / max * 100), Math.round(max * 100)];
}

function hueDistance(a, b) {
    if (b < 0) return 360;
    const distance = Math.abs(a - b);
    return Math.min(distance, 360 - distance);
}

function parseInteger(value, fallback) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
}

function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }

function randomBytes(length) {
    const output = [];
    let seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    for (let i = 0; i < length; i++) {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        output.push(seed & 0xff);
    }
    return output;
}

function normalizeBytes(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(function(item) { return Number(item) & 0xff; });
    if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) value = new Uint8Array(value);
    if (typeof value.length === "number") {
        const output = [];
        for (let i = 0; i < value.length; i++) output.push(Number(value[i]) & 0xff);
        return output;
    }
    return [];
}

function utf8(text) {
    const output = [];
    const value = unescape(encodeURIComponent(String(text)));
    for (let i = 0; i < value.length; i++) output.push(value.charCodeAt(i) & 0xff);
    return output;
}

function ascii(bytes) {
    let output = "";
    for (let i = 0; i < bytes.length; i++) output += String.fromCharCode(bytes[i]);
    return output;
}

function concatBytes() {
    const output = [];
    for (let i = 0; i < arguments.length; i++) {
        const value = arguments[i] || [];
        for (let j = 0; j < value.length; j++) output.push(Number(value[j]) & 0xff);
    }
    return output;
}

function equalBytes(left, right) {
    if (left.length !== right.length) return false;
    let difference = 0;
    for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
    return difference === 0;
}

function findBytes(haystack, needle) {
    outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
        for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
        return i;
    }
    return -1;
}

function u32be(value) { return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]; }
function readU32(bytes, offset) { return (((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0); }
function rotateLeft(value, bits) { return ((value << bits) | (value >>> (32 - bits))) >>> 0; }
function rotateRight(value, bits) { return ((value >>> bits) | (value << (32 - bits))) >>> 0; }

function sha1(input) {
    const data = input.slice();
    const bitLength = data.length * 8;
    data.push(0x80);
    while ((data.length % 64) !== 56) data.push(0);
    for (let i = 7; i >= 0; i--) data.push(i >= 4 ? 0 : (bitLength >>> (i * 8)) & 255);
    let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
    const words = new Array(80);
    for (let offset = 0; offset < data.length; offset += 64) {
        for (let i = 0; i < 16; i++) words[i] = readU32(data, offset + i * 4);
        for (let i = 16; i < 80; i++) words[i] = rotateLeft(words[i - 3] ^ words[i - 8] ^ words[i - 14] ^ words[i - 16], 1);
        let a = h0, b = h1, c = h2, d = h3, e = h4;
        for (let i = 0; i < 80; i++) {
            let f, k;
            if (i < 20) { f = (b & c) | ((~b) & d); k = 0x5a827999; }
            else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
            else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
            else { f = b ^ c ^ d; k = 0xca62c1d6; }
            const temp = (rotateLeft(a, 5) + f + e + k + words[i]) >>> 0;
            e = d; d = c; c = rotateLeft(b, 30); b = a; a = temp;
        }
        h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
    }
    return concatBytes(u32be(h0), u32be(h1), u32be(h2), u32be(h3), u32be(h4));
}

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

function sha256(input) {
    const data = input.slice();
    const bitLength = data.length * 8;
    data.push(0x80);
    while ((data.length % 64) !== 56) data.push(0);
    for (let i = 7; i >= 0; i--) data.push(i >= 4 ? 0 : (bitLength >>> (i * 8)) & 255);
    const h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const words = new Array(64);
    for (let offset = 0; offset < data.length; offset += 64) {
        for (let i = 0; i < 16; i++) words[i] = readU32(data, offset + i * 4);
        for (let i = 16; i < 64; i++) {
            const s0 = rotateRight(words[i - 15], 7) ^ rotateRight(words[i - 15], 18) ^ (words[i - 15] >>> 3);
            const s1 = rotateRight(words[i - 2], 17) ^ rotateRight(words[i - 2], 19) ^ (words[i - 2] >>> 10);
            words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
        }
        let a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7];
        for (let i = 0; i < 64; i++) {
            const s1 = rotateRight(e,6) ^ rotateRight(e,11) ^ rotateRight(e,25);
            const ch = (e & f) ^ ((~e) & g);
            const temp1 = (hh + s1 + ch + SHA256_K[i] + words[i]) >>> 0;
            const s0 = rotateRight(a,2) ^ rotateRight(a,13) ^ rotateRight(a,22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (s0 + maj) >>> 0;
            hh=g; g=f; f=e; e=(d+temp1)>>>0; d=c; c=b; b=a; a=(temp1+temp2)>>>0;
        }
        h[0]=(h[0]+a)>>>0; h[1]=(h[1]+b)>>>0; h[2]=(h[2]+c)>>>0; h[3]=(h[3]+d)>>>0;
        h[4]=(h[4]+e)>>>0; h[5]=(h[5]+f)>>>0; h[6]=(h[6]+g)>>>0; h[7]=(h[7]+hh)>>>0;
    }
    return concatBytes(u32be(h[0]),u32be(h[1]),u32be(h[2]),u32be(h[3]),u32be(h[4]),u32be(h[5]),u32be(h[6]),u32be(h[7]));
}

const AES_SBOX = [
0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
];

const AES_INV_SBOX = [
0x52,0x09,0x6a,0xd5,0x30,0x36,0xa5,0x38,0xbf,0x40,0xa3,0x9e,0x81,0xf3,0xd7,0xfb,0x7c,0xe3,0x39,0x82,0x9b,0x2f,0xff,0x87,0x34,0x8e,0x43,0x44,0xc4,0xde,0xe9,0xcb,
0x54,0x7b,0x94,0x32,0xa6,0xc2,0x23,0x3d,0xee,0x4c,0x95,0x0b,0x42,0xfa,0xc3,0x4e,0x08,0x2e,0xa1,0x66,0x28,0xd9,0x24,0xb2,0x76,0x5b,0xa2,0x49,0x6d,0x8b,0xd1,0x25,
0x72,0xf8,0xf6,0x64,0x86,0x68,0x98,0x16,0xd4,0xa4,0x5c,0xcc,0x5d,0x65,0xb6,0x92,0x6c,0x70,0x48,0x50,0xfd,0xed,0xb9,0xda,0x5e,0x15,0x46,0x57,0xa7,0x8d,0x9d,0x84,
0x90,0xd8,0xab,0x00,0x8c,0xbc,0xd3,0x0a,0xf7,0xe4,0x58,0x05,0xb8,0xb3,0x45,0x06,0xd0,0x2c,0x1e,0x8f,0xca,0x3f,0x0f,0x02,0xc1,0xaf,0xbd,0x03,0x01,0x13,0x8a,0x6b,
0x3a,0x91,0x11,0x41,0x4f,0x67,0xdc,0xea,0x97,0xf2,0xcf,0xce,0xf0,0xb4,0xe6,0x73,0x96,0xac,0x74,0x22,0xe7,0xad,0x35,0x85,0xe2,0xf9,0x37,0xe8,0x1c,0x75,0xdf,0x6e,
0x47,0xf1,0x1a,0x71,0x1d,0x29,0xc5,0x89,0x6f,0xb7,0x62,0x0e,0xaa,0x18,0xbe,0x1b,0xfc,0x56,0x3e,0x4b,0xc6,0xd2,0x79,0x20,0x9a,0xdb,0xc0,0xfe,0x78,0xcd,0x5a,0xf4,
0x1f,0xdd,0xa8,0x33,0x88,0x07,0xc7,0x31,0xb1,0x12,0x10,0x59,0x27,0x80,0xec,0x5f,0x60,0x51,0x7f,0xa9,0x19,0xb5,0x4a,0x0d,0x2d,0xe5,0x7a,0x9f,0x93,0xc9,0x9c,0xef,
0xa0,0xe0,0x3b,0x4d,0xae,0x2a,0xf5,0xb0,0xc8,0xeb,0xbb,0x3c,0x83,0x53,0x99,0x61,0x17,0x2b,0x04,0x7e,0xba,0x77,0xd6,0x26,0xe1,0x69,0x14,0x63,0x55,0x21,0x0c,0x7d
];

function aesExpandKey(key) {
    const expanded = key.slice();
    const rcon = [0x00,0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];
    let bytes = 16, round = 1;
    while (bytes < 176) {
        let temp = expanded.slice(bytes - 4, bytes);
        if (bytes % 16 === 0) {
            temp = [AES_SBOX[temp[1]] ^ rcon[round++], AES_SBOX[temp[2]], AES_SBOX[temp[3]], AES_SBOX[temp[0]]];
        }
        for (let i = 0; i < 4; i++) { expanded[bytes] = expanded[bytes - 16] ^ temp[i]; bytes++; }
    }
    return expanded;
}

function aesAddRoundKey(stateBytes, expanded, round) {
    for (let i = 0; i < 16; i++) stateBytes[i] ^= expanded[round * 16 + i];
}

function aesShiftRows(s) {
    const t=s.slice();
    s[1]=t[5];s[5]=t[9];s[9]=t[13];s[13]=t[1];
    s[2]=t[10];s[6]=t[14];s[10]=t[2];s[14]=t[6];
    s[3]=t[15];s[7]=t[3];s[11]=t[7];s[15]=t[11];
}

function aesInvShiftRows(s) {
    const t=s.slice();
    s[1]=t[13];s[5]=t[1];s[9]=t[5];s[13]=t[9];
    s[2]=t[10];s[6]=t[14];s[10]=t[2];s[14]=t[6];
    s[3]=t[7];s[7]=t[11];s[11]=t[15];s[15]=t[3];
}

function aesMultiply(a, b) {
    let result=0, value=a;
    for (let i=0;i<8;i++) { if (b & 1) result ^= value; value = (value & 0x80) ? ((value << 1) ^ 0x11b) : (value << 1); b >>>= 1; }
    return result & 255;
}

function aesMixColumns(s) {
    for (let c=0;c<4;c++) { const i=c*4,a=s[i],b=s[i+1],d=s[i+2],e=s[i+3]; s[i]=aesMultiply(a,2)^aesMultiply(b,3)^d^e; s[i+1]=a^aesMultiply(b,2)^aesMultiply(d,3)^e; s[i+2]=a^b^aesMultiply(d,2)^aesMultiply(e,3); s[i+3]=aesMultiply(a,3)^b^d^aesMultiply(e,2); }
}

function aesInvMixColumns(s) {
    for (let c=0;c<4;c++) { const i=c*4,a=s[i],b=s[i+1],d=s[i+2],e=s[i+3]; s[i]=aesMultiply(a,14)^aesMultiply(b,11)^aesMultiply(d,13)^aesMultiply(e,9); s[i+1]=aesMultiply(a,9)^aesMultiply(b,14)^aesMultiply(d,11)^aesMultiply(e,13); s[i+2]=aesMultiply(a,13)^aesMultiply(b,9)^aesMultiply(d,14)^aesMultiply(e,11); s[i+3]=aesMultiply(a,11)^aesMultiply(b,13)^aesMultiply(d,9)^aesMultiply(e,14); }
}

function aesEncryptBlock(block, expanded) {
    const s=block.slice(); aesAddRoundKey(s,expanded,0);
    for(let round=1;round<10;round++){for(let i=0;i<16;i++)s[i]=AES_SBOX[s[i]];aesShiftRows(s);aesMixColumns(s);aesAddRoundKey(s,expanded,round);}
    for(let i=0;i<16;i++)s[i]=AES_SBOX[s[i]];aesShiftRows(s);aesAddRoundKey(s,expanded,10);return s;
}

function aesDecryptBlock(block, expanded) {
    const s=block.slice(); aesAddRoundKey(s,expanded,10);
    for(let round=9;round>0;round--){aesInvShiftRows(s);for(let i=0;i<16;i++)s[i]=AES_INV_SBOX[s[i]];aesAddRoundKey(s,expanded,round);aesInvMixColumns(s);}
    aesInvShiftRows(s);for(let i=0;i<16;i++)s[i]=AES_INV_SBOX[s[i]];aesAddRoundKey(s,expanded,0);return s;
}

function aesCbcEncrypt(input, key, iv) {
    const padded=input.slice(), padding=16-(padded.length%16); for(let i=0;i<padding;i++)padded.push(padding);
    const expanded=aesExpandKey(key),output=[];let previous=iv.slice();
    for(let offset=0;offset<padded.length;offset+=16){const block=padded.slice(offset,offset+16);for(let i=0;i<16;i++)block[i]^=previous[i];previous=aesEncryptBlock(block,expanded);for(const value of previous)output.push(value);}
    return output;
}

function aesCbcDecrypt(input, key, iv) {
    if(input.length===0||input.length%16!==0)throw new Error("Invalid AES-CBC length");
    const expanded=aesExpandKey(key),output=[];let previous=iv.slice();
    for(let offset=0;offset<input.length;offset+=16){const cipher=input.slice(offset,offset+16);const block=aesDecryptBlock(cipher,expanded);for(let i=0;i<16;i++)output.push(block[i]^previous[i]);previous=cipher;}
    const padding=output[output.length-1];if(padding<1||padding>16)throw new Error("Invalid padding");for(let i=0;i<padding;i++)if(output[output.length-1-i]!==padding)throw new Error("Invalid padding");return output.slice(0,output.length-padding);
}

function firstCookie(value) {
    const text = String(value || "");
    const semicolon = text.indexOf(";");
    return (semicolon >= 0 ? text.slice(0, semicolon) : text).trim();
}
