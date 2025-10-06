import { axiosInstance } from "./axios";

const FALLBACK_ICE_SERVERS = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

const DEFAULT_CACHE_TTL_MS = 60 * 1000; // 1 minute

let cachedIceServers = null;
let iceCacheExpiresAt = 0;

async function fetchIceServersFromBackend() {
    try {
        const response = await axiosInstance.get("/webrtc/ice");
        const servers = response.data?.iceServers;
        const ttlMsRaw = Number(response.data?.ttlMs);
        const ttlMs = Number.isFinite(ttlMsRaw) && ttlMsRaw > 0 ? ttlMsRaw : DEFAULT_CACHE_TTL_MS;

        if (Array.isArray(servers) && servers.length > 0) {
            return { iceServers: servers, ttlMs };
        }
    } catch (error) {
        console.error("Failed to fetch ICE servers from backend", error);
    }

    return { iceServers: FALLBACK_ICE_SERVERS, ttlMs: DEFAULT_CACHE_TTL_MS };
}

export async function getIceServers() {
    const now = Date.now();
    if (cachedIceServers && iceCacheExpiresAt > now) {
        return cachedIceServers;
    }

    const { iceServers, ttlMs } = await fetchIceServersFromBackend();
    cachedIceServers = iceServers;
    iceCacheExpiresAt = now + ttlMs;
    return iceServers;
}

export function invalidateIceServersCache() {
    cachedIceServers = null;
    iceCacheExpiresAt = 0;
}

export const CallType = Object.freeze({
    AUDIO: "audio",
    VIDEO: "video",
});

export function getMediaConstraints(callType) {
    const isVideoCall = callType === CallType.VIDEO;
    return {
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
        },
        video: isVideoCall
            ? {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  facingMode: "user",
              }
            : false,
    };
}

export async function getUserMediaStream(callType) {
    if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Browser does not support media capture");
    }

    const constraints = getMediaConstraints(callType);
    return navigator.mediaDevices.getUserMedia(constraints);
}

export async function createPeerConnection({ onIceCandidate, onRemoteStream, onConnectionStateChange } = {}) {
    const iceServers = await getIceServers();
    const pc = new RTCPeerConnection({ iceServers });

    if (typeof onIceCandidate === "function") {
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                onIceCandidate(event.candidate);
            }
        };
    }

    if (typeof onRemoteStream === "function") {
        pc.ontrack = (event) => {
            const [remoteStream] = event.streams ?? [];
            if (remoteStream) {
                onRemoteStream(remoteStream);
            }
        };
    }

    if (typeof onConnectionStateChange === "function") {
        pc.onconnectionstatechange = () => {
            onConnectionStateChange(pc.connectionState);
        };
    }

    return pc;
}

export function stopMediaStream(stream) {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
        try {
            track.stop();
        } catch (error) {
            console.warn("Failed to stop media track", error);
        }
    });
}

export function closePeerConnection(pc) {
    if (!pc) return;
    try {
        pc.close();
    } catch (error) {
        console.warn("Failed to close RTCPeerConnection", error);
    }
}
