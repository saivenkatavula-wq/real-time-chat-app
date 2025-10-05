import { create } from "zustand";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";
import {
    CallType,
    closePeerConnection,
    createPeerConnection,
    getUserMediaStream,
    stopMediaStream,
} from "../lib/webrtcClient";

const initialState = {
    socket: null,
    callStatus: "idle", // idle | calling | ringing | connecting | connected
    activeCall: null,
    incomingCall: null,
    localStream: null,
    remoteStream: null,
    peerConnection: null,
    isMicrophoneMuted: false,
    isCameraOff: false,
    error: null,
};

function cleanUpMediaResources(state) {
    stopMediaStream(state.localStream);
    stopMediaStream(state.remoteStream);
    closePeerConnection(state.peerConnection);
}

export const useCallStore = create((set, get) => ({
    ...initialState,

    initializeSocketHandlers: (socket) => {
        const previousSocket = get().socket;
        if (previousSocket) {
            previousSocket.off("call:offer");
            previousSocket.off("call:answer");
            previousSocket.off("call:ice-candidate");
            previousSocket.off("call:decline");
            previousSocket.off("call:end");
            previousSocket.off("call:error");
        }

        if (!socket) {
            set({ ...initialState });
            return;
        }

        socket.on("call:offer", ({ offer, callType, caller }) => {
            const { activeCall, incomingCall } = get();

            if (activeCall || incomingCall) {
                socket.emit("call:decline", {
                    targetUserId: caller._id,
                    reason: "busy",
                });
                return;
            }

            set({
                incomingCall: {
                    offer,
                    callType,
                    caller,
                },
                callStatus: "ringing",
            });
        });

        socket.on("call:answer", async ({ answer }) => {
            const { peerConnection } = get();
            if (!peerConnection) return;
            try {
                await peerConnection.setRemoteDescription(answer);
                set({ callStatus: "connecting" });
            } catch (error) {
                console.error("Failed to handle remote answer", error);
                toast.error("Failed to establish the call");
                get().endCall(false);
            }
        });

        socket.on("call:ice-candidate", async ({ candidate }) => {
            const { peerConnection } = get();
            if (!peerConnection || !candidate) return;
            try {
                await peerConnection.addIceCandidate(candidate);
            } catch (error) {
                console.error("Error adding remote ICE candidate", error);
            }
        });

        socket.on("call:decline", ({ reason }) => {
            toast.error(reason === "busy" ? "User is busy on another call" : "Call declined");
            get().endCall(false);
        });

        socket.on("call:end", ({ reason }) => {
            if (reason === "ended") {
                toast.success("Call ended");
            } else if (reason === "offline") {
                toast.error("User went offline");
            }
            get().endCall(false);
        });

        socket.on("call:error", ({ message }) => {
            toast.error(message || "Call error");
            get().endCall(false);
        });

        set({ socket });
    },

    startCall: async ({ callee, callType }) => {
        const { socket, callStatus } = get();
        if (!callee?._id || !socket) {
            toast.error("Unable to start call");
            return;
        }

        if (callStatus !== "idle") {
            toast.error("You are already in a call");
            return;
        }

        const authUser = useAuthStore.getState().authUser;
        if (!authUser) {
            toast.error("Not authenticated");
            return;
        }

        try {
            const localStream = await getUserMediaStream(callType);
            const peerConnection = createPeerConnection({
                onIceCandidate: (candidate) => {
                    socket.emit("call:ice-candidate", {
                        targetUserId: callee._id,
                        candidate,
                    });
                },
                onRemoteStream: (remoteStream) => {
                    set({ remoteStream, callStatus: "connected" });
                },
                onConnectionStateChange: (connectionState) => {
                    if (connectionState === "connected") {
                        set({ callStatus: "connected" });
                    } else if (connectionState === "failed" || connectionState === "disconnected") {
                        get().endCall(true, connectionState);
                    }
                },
            });

            localStream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, localStream);
            });

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            socket.emit("call:offer", {
                targetUserId: callee._id,
                offer,
                callType,
                caller: {
                    _id: authUser._id,
                    fullName: authUser.fullName,
                    profilePic: authUser.profilePic,
                },
            });

            set({
                callStatus: "calling",
                activeCall: {
                    userId: callee._id,
                    fullName: callee.fullName,
                    profilePic: callee.profilePic,
                    callType,
                    startedAt: Date.now(),
                },
                localStream,
                peerConnection,
                isMicrophoneMuted: false,
                isCameraOff: callType === CallType.VIDEO ? false : true,
                error: null,
            });
        } catch (error) {
            console.error("Error starting call", error);
            toast.error(error?.message || "Failed to start call");
            get().cleanupState();
        }
    },

    acceptCall: async () => {
        const { incomingCall, socket } = get();
        if (!incomingCall || !socket) return;

        const authUser = useAuthStore.getState().authUser;
        if (!authUser) {
            toast.error("Not authenticated");
            return;
        }

        try {
            const { callType, caller, offer } = incomingCall;
            const localStream = await getUserMediaStream(callType);
            const peerConnection = createPeerConnection({
                onIceCandidate: (candidate) => {
                    socket.emit("call:ice-candidate", {
                        targetUserId: caller._id,
                        candidate,
                    });
                },
                onRemoteStream: (remoteStream) => {
                    set({ remoteStream, callStatus: "connected" });
                },
                onConnectionStateChange: (connectionState) => {
                    if (connectionState === "connected") {
                        set({ callStatus: "connected" });
                    } else if (connectionState === "failed" || connectionState === "disconnected") {
                        get().endCall(true, connectionState);
                    }
                },
            });

            localStream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, localStream);
            });

            await peerConnection.setRemoteDescription(offer);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket.emit("call:answer", {
                targetUserId: caller._id,
                answer,
            });

            set({
                incomingCall: null,
                callStatus: "connecting",
                activeCall: {
                    userId: caller._id,
                    fullName: caller.fullName,
                    profilePic: caller.profilePic,
                    callType,
                    startedAt: Date.now(),
                },
                localStream,
                peerConnection,
                isMicrophoneMuted: false,
                isCameraOff: callType === CallType.VIDEO ? false : true,
                error: null,
            });
        } catch (error) {
            console.error("Error accepting call", error);
            toast.error(error?.message || "Failed to answer call");
            get().declineCall("media-error");
        }
    },

    declineCall: (reason = "declined") => {
        const { incomingCall, socket } = get();
        if (!incomingCall || !socket) {
            set({ incomingCall: null, callStatus: "idle" });
            return;
        }

        socket.emit("call:decline", {
            targetUserId: incomingCall.caller._id,
            reason,
        });

        set({ incomingCall: null, callStatus: "idle" });
    },

    endCall: (notifyRemote = true, reason = "ended") => {
        const { activeCall, socket } = get();
        if (notifyRemote && activeCall && socket) {
            socket.emit("call:end", {
                targetUserId: activeCall.userId,
                reason,
            });
        }

        get().cleanupState();
    },

    toggleMute: () => {
        const { localStream, isMicrophoneMuted } = get();
        if (!localStream) return;
        localStream.getAudioTracks().forEach((track) => {
            track.enabled = isMicrophoneMuted;
        });
        set({ isMicrophoneMuted: !isMicrophoneMuted });
    },

    toggleCamera: () => {
        const { localStream, isCameraOff, activeCall } = get();
        if (!localStream || activeCall?.callType !== CallType.VIDEO) return;
        localStream.getVideoTracks().forEach((track) => {
            track.enabled = isCameraOff;
        });
        set({ isCameraOff: !isCameraOff });
    },

    cleanupState: () => {
        const state = get();
        cleanUpMediaResources(state);
        set({ ...initialState, socket: state.socket });
    },
}));
