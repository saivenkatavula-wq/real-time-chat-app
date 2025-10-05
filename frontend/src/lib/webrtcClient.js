const DEFAULT_ICE_SERVERS = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

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

export function createPeerConnection({ onIceCandidate, onRemoteStream, onConnectionStateChange } = {}) {
    const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });

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
