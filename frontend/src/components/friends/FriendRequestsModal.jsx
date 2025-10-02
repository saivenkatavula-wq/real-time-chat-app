import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { useFriendStore } from "../../store/useFriendStore";

const FriendRequestsModal = ({ isOpen, onClose }) => {
    const [processingId, setProcessingId] = useState(null);
    const { pendingRequests, fetchPendingRequests, isLoadingRequests, respondToRequest } = useFriendStore();

    useEffect(() => {
        if (isOpen) {
            fetchPendingRequests();
        } else {
            setProcessingId(null);
        }
    }, [isOpen, fetchPendingRequests]);

    if (!isOpen) return null;

    const handleRespond = async (requestId, action) => {
        setProcessingId(requestId + action);
        await respondToRequest({ requestId, action });
        setProcessingId(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-200/70">
            <div className="bg-base-100 rounded-xl shadow-lg w-full max-w-md mx-4">
                <div className="flex items-center justify-between border-b border-base-300 px-4 py-3">
                    <h3 className="text-lg font-semibold">Friend requests</h3>
                    <button onClick={onClose} className="btn btn-ghost btn-sm">
                        <X className="size-4" />
                    </button>
                </div>

                <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                    {isLoadingRequests && (
                        <div className="flex justify-center py-6">
                            <Loader2 className="size-6 animate-spin" />
                        </div>
                    )}

                    {!isLoadingRequests && pendingRequests.length === 0 && (
                        <p className="text-sm text-base-content/60 text-center">
                            No pending requests right now.
                        </p>
                    )}

                    {pendingRequests.map((request) => (
                        <div
                            key={request._id}
                            className="flex items-center justify-between border border-base-300 rounded-lg px-3 py-2"
                        >
                            <div className="flex items-center gap-3">
                                <img
                                    src={request.sender.profilePic || "/avatar.png"}
                                    alt={request.sender.fullName}
                                    className="size-10 rounded-full object-cover"
                                />
                                <div>
                                    <p className="font-medium leading-none">{request.sender.fullName}</p>
                                    <p className="text-sm text-base-content/60">{request.sender.email}</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleRespond(request._id, "accept")}
                                    disabled={processingId === request._id + "accept"}
                                >
                                    {processingId === request._id + "accept" ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="size-4" />
                                            Accept
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm"
                                    onClick={() => handleRespond(request._id, "decline")}
                                    disabled={processingId === request._id + "decline"}
                                >
                                    {processingId === request._id + "decline" ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <>
                                            <X className="size-4" />
                                            Decline
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FriendRequestsModal;
