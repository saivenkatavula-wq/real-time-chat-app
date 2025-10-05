import { Phone, Video, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore";
import { CallType } from "../lib/webrtcClient";

const ChatHeader = () => {
    const { selectedUser, setSelectedUser } = useChatStore();
    const { onlineUsers } = useAuthStore();
    const { startCall, callStatus } = useCallStore();

    if (!selectedUser) return null;

    const isUserOnline = onlineUsers.includes(selectedUser._id);
    const isCallBusy = callStatus !== "idle";
    const disableCallActions = !isUserOnline || isCallBusy;

    const handleStartCall = (callType) => {
        if (disableCallActions) return;
        startCall({ callee: selectedUser, callType });
    };

    return (
        <div className="p-2.5 border-b border-base-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="avatar">
                        <div className="size-10 rounded-full relative">
                            <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
                        </div>
                    </div>

                    <div>
                        <h3 className="font-medium">{selectedUser.fullName}</h3>
                        <p className="text-sm text-base-content/70">
                            {isUserOnline ? "Online" : "Offline"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-circle"
                        title={isUserOnline ? "Start audio call" : "User is offline"}
                        onClick={() => handleStartCall(CallType.AUDIO)}
                        disabled={disableCallActions}
                    >
                        <Phone className="size-4" />
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-circle"
                        title={isUserOnline ? "Start video call" : "User is offline"}
                        onClick={() => handleStartCall(CallType.VIDEO)}
                        disabled={disableCallActions}
                    >
                        <Video className="size-4" />
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-circle"
                        onClick={() => setSelectedUser(null)}
                        title="Close chat"
                    >
                        <X className="size-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatHeader;
