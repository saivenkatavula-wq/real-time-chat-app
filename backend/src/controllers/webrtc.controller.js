import { Buffer } from "node:buffer";

const FALLBACK_ICE_SERVERS = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

let cachedIceServers = null;
let cacheExpiresAt = 0;

function isConfigured() {
    return Boolean(process.env.XIRSYS_IDENT && process.env.XIRSYS_SECRET);
}

function normalizeIceServers(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "object") return [raw];
    return [];
}

async function requestIceServers() {
    if (!isConfigured()) {
        return { iceServers: FALLBACK_ICE_SERVERS, ttlMs: 0 };
    }

    const ident = process.env.XIRSYS_IDENT;
    const secret = process.env.XIRSYS_SECRET;
    const channel = process.env.XIRSYS_CHANNEL || "default";

    const authHeader = Buffer.from(`${ident}:${secret}`).toString("base64");

    const response = await fetch(`https://global.xirsys.net/_turn/${channel}`, {
        method: "PUT",
        headers: {
            "Authorization": `Basic ${authHeader}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ format: "urls" }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Xirsys responded with ${response.status}: ${errorText}`);
    }

    const payload = await response.json();
    if (payload?.s && payload.s !== "ok") {
        const message = typeof payload?.v === "string" ? payload.v : JSON.stringify(payload?.v);
        throw new Error(`Xirsys responded with status ${payload.s}: ${message}`);
    }

    const iceServers = normalizeIceServers(payload?.v?.iceServers || payload?.iceServers);

    if (!Array.isArray(iceServers) || iceServers.length === 0) {
        throw new Error(`Xirsys response missing iceServers payload: ${JSON.stringify(payload)}`);
    }

    const ttlSeconds = Number(payload?.v?.ttl ?? payload?.ttl ?? 0);
    const ttlMs = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds * 1000 : 60 * 1000;

    return { iceServers, ttlMs };
}

export async function getIceServers(req, res) {
    try {
        const now = Date.now();
        if (cachedIceServers && cacheExpiresAt > now) {
            return res.json({ iceServers: cachedIceServers, cached: true });
        }

        const { iceServers, ttlMs } = await requestIceServers();
        cachedIceServers = iceServers;
        cacheExpiresAt = ttlMs > 0 ? now + ttlMs : 0;

        return res.json({ iceServers, cached: false, ttlMs });
    } catch (error) {
        console.error("Failed to fetch ICE servers", error);
        cachedIceServers = null;
        cacheExpiresAt = 0;
        return res.status(isConfigured() ? 502 : 200).json({
            iceServers: FALLBACK_ICE_SERVERS,
            cached: false,
            warning: isConfigured() ? "Falling back to STUN servers" : "TURN not configured",
        });
    }
}
