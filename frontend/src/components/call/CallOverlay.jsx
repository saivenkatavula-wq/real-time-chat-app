import { useEffect, useRef } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { useCallStore } from "../../store/useCallStore";
import { CallType } from "../../lib/webrtcClient";

const CallOverlay = () => {
    const {
        activeCall,
        callStatus,
        localStream,
        remoteStream,
        toggleMute,
        toggleCamera,
        endCall,
        isMicrophoneMuted,
        isCameraOff,
    } = useCallStore();

    const isVideoCall = activeCall?.callType === CallType.VIDEO;

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null);

    useEffect(() => {
        if (!isVideoCall) return;
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, isVideoCall]);

    useEffect(() => {
        if (!remoteStream) return;
        if (isVideoCall) {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
        } else if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, isVideoCall]);

    if (!activeCall) return null;

    const isAwaitingRemoteStream = isVideoCall && !remoteStream && callStatus !== "connected";

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-base-100/90 backdrop-blur">
            <div className="flex items-center justify-between p-4">
                <div>
                    <p className="text-sm text-base-content/70 uppercase tracking-wide">{callStatus}</p>
                    <h2 className="text-2xl font-semibold">{activeCall.fullName}</h2>
                </div>
                <button
                    type="button"
                    className="btn btn-error"
                    onClick={() => endCall(true, "ended")}
                >
                    <PhoneOff className="size-5" />
                    End Call
                </button>
            </div>

            <div className="flex-1 flex items-center justify-center relative">
                {isVideoCall ? (
                    <div className="relative w-full h-full max-h-[90vh] flex items-center justify-center">
                        {remoteStream ? (
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center space-y-4">
                                <div className="size-24 rounded-full bg-base-200 flex items-center justify-center text-3xl font-semibold">
                                    {activeCall.fullName?.[0] ?? "?"}
                                </div>
                                <p className="text-lg">Waiting for video...</p>
                            </div>
                        )}

                        <div className="absolute bottom-6 right-6 w-48 bg-base-100/80 shadow-lg rounded-xl overflow-hidden">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className={`w-full h-32 object-cover ${isCameraOff ? "opacity-40" : ""}`}
                            />
                            {!isCameraOff ? null : (
                                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium bg-base-300/80">
                                    Camera Off
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-6">
                        <div className="size-36 rounded-full bg-base-200 flex items-center justify-center text-5xl font-semibold">
                            {activeCall.fullName?.[0] ?? "?"}
                        </div>
                        <p className="text-lg text-base-content/70">
                            {callStatus === "calling" ? "Calling" : callStatus === "connected" ? "Connected" : "Connecting"}
                        </p>
                        <audio ref={remoteAudioRef} autoPlay className="hidden" />
                    </div>
                )}

                {isAwaitingRemoteStream && (
                    <div className="absolute inset-0 bg-base-300/40 flex items-center justify-center">
                        <span className="loading loading-spinner size-14" />
                    </div>
                )}
            </div>

            <div className="p-6 flex items-center justify-center gap-4">
                <button
                    type="button"
                    className={`btn btn-circle ${isMicrophoneMuted ? "btn-warning" : ""}`}
                    onClick={toggleMute}
                >
                    {isMicrophoneMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                </button>

                {isVideoCall && (
                    <button
                        type="button"
                        className={`btn btn-circle ${isCameraOff ? "btn-warning" : ""}`}
                        onClick={toggleCamera}
                    >
                        {isCameraOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
                    </button>
                )}
            </div>
        </div>
    );
};

export default CallOverlay;
