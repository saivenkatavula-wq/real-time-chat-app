import { Buffer } from "node:buffer";

const FALLBACK_ICE_SERVERS = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

let cachedIceServers = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isConfigured() {
    return Boolean(process.env.XIRSYS_IDENT && process.env.XIRSYS_SECRET);
}

async function requestIceServers() {
    if (!isConfigured()) {
        return FALLBACK_ICE_SERVERS;
    }

    const ident = process.env.XIRSYS_IDENT;
    const secret = process.env.XIRSYS_SECRET;
    const channel = process.env.XIRSYS_CHANNEL || "default";

    const authHeader = Buffer.from(`${ident}:${secret}`).toString("base64");

    const response = await fetch(`https://global.xirsys.net/_turn/${channel}`, {
        method: "POST",
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
    const iceServers = payload?.v?.iceServers;

    if (!Array.isArray(iceServers) || iceServers.length === 0) {
        throw new Error("Xirsys response did not include iceServers");
    }

    return iceServers;
}

export async function getIceServers(req, res) {
    try {
        const now = Date.now();
        if (cachedIceServers && cacheExpiresAt > now) {
            return res.json({ iceServers: cachedIceServers, cached: true });
        }

        const iceServers = await requestIceServers();
        cachedIceServers = iceServers;
        cacheExpiresAt = now + CACHE_TTL_MS;

        return res.json({ iceServers, cached: false });
    } catch (error) {
        console.error("Failed to fetch ICE servers", error);
        const fallback = FALLBACK_ICE_SERVERS;
        return res.status(isConfigured() ? 502 : 200).json({
            iceServers: fallback,
            cached: false,
            warning: isConfigured() ? "Falling back to STUN servers" : "TURN not configured",
        });
    }
}
