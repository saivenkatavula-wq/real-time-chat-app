import { Phone, PhoneOff, Video } from "lucide-react";
import { useCallStore } from "../../store/useCallStore";
import { CallType } from "../../lib/webrtcClient";

const IncomingCallModal = () => {
    const { incomingCall, acceptCall, declineCall } = useCallStore();

    if (!incomingCall) return null;

    const { caller, callType } = incomingCall;
    const isVideoCall = callType === CallType.VIDEO;

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-base-300/70 backdrop-blur">
            <div className="bg-base-100 rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4">
                <div className="flex flex-col items-center space-y-3">
                    <div className="size-20 rounded-full bg-base-200 flex items-center justify-center text-4xl font-semibold">
                        {caller.fullName?.[0] ?? "?"}
                    </div>
                    <div>
                        <p className="text-sm text-base-content/70 uppercase tracking-wide">Incoming {isVideoCall ? "video" : "audio"} call</p>
                        <h3 className="text-2xl font-semibold">{caller.fullName}</h3>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                        type="button"
                        className="btn btn-success flex-1"
                        onClick={acceptCall}
                    >
                        <Phone className="size-5" />
                        Accept
                    </button>
                    <button
                        type="button"
                        className="btn btn-error flex-1"
                        onClick={() => declineCall("declined")}
                    >
                        <PhoneOff className="size-5" />
                        Decline
                    </button>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-base-content/70">
                    {isVideoCall ? <Video className="size-4" /> : <Phone className="size-4" />}
                    <span>{isVideoCall ? "Video" : "Audio"} call</span>
                </div>
            </div>
        </div>
    );
};

export default IncomingCallModal;
