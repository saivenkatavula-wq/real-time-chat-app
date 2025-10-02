import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { ChevronDown } from "lucide-react";

const ChatContainer = () => {
    const {
        messages,
        getMessages,
        isMessagesLoading,
        selectedUser,
        subscribeToMessages,
        unsubscribeFromMessages,
        deleteMessage,
    } = useChatStore();
    const { authUser } = useAuthStore();
    const messageEndRef = useRef(null);
    const [deletingMessageId, setDeletingMessageId] = useState(null);

    const authUserId = authUser?._id;

    useEffect(() => {
        getMessages(selectedUser._id);

        subscribeToMessages();

        return () => unsubscribeFromMessages();
    }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

    useEffect(() => {
        if (messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleDeleteMessage = async (messageId) => {
        setDeletingMessageId(messageId);
        try {
            await deleteMessage(messageId);
        } catch (error) {
            // message store already surfaces feedback via toast
        } finally {
            setDeletingMessageId(null);
        }
    };

    if (isMessagesLoading) {
        return (
            <div className="flex-1 flex flex-col overflow-auto">
                <ChatHeader />
                <MessageSkeleton />
                <MessageInput />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-auto">
            <ChatHeader />

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => {
                    const isOwnMessage = message.senderId === authUserId;
                    const isDeleted = message.isDeleted;
                    const deletionCopy = isOwnMessage
                        ? "You deleted this message"
                        : "This message was deleted";

                    return (
                        <div
                            key={message._id}
                            className={`chat ${isOwnMessage ? "chat-end" : "chat-start"}`}
                            ref={index === messages.length - 1 ? messageEndRef : null}
                        >
                            <div className=" chat-image avatar">
                                <div className="size-10 rounded-full border">
                                    <img
                                        src={
                                            isOwnMessage
                                                ? authUser.profilePic || "/avatar.png"
                                                : selectedUser.profilePic || "/avatar.png"
                                        }
                                        alt="profile pic"
                                    />
                                </div>
                            </div>
                            <div
                                className={`chat-header mb-1 flex items-center gap-2 ${
                                    isOwnMessage ? "justify-end" : ""
                                }`}
                            >
                                <time className="text-xs opacity-50 ml-1">
                                    {formatMessageTime(message.createdAt)}
                                </time>
                                {isOwnMessage && !isDeleted && (
                                    <div className="dropdown dropdown-bottom dropdown-end">
                                        <div
                                            tabIndex={0}
                                            role="button"
                                            className="btn btn-ghost btn-xs btn-circle"
                                        >
                                            <ChevronDown className="size-3.5" />
                                        </div>
                                        <ul
                                            tabIndex={0}
                                            className="dropdown-content menu menu-sm bg-base-100 rounded-box shadow p-2 min-w-40"
                                        >
                                            <li>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteMessage(message._id)}
                                                    disabled={deletingMessageId === message._id}
                                                >
                                                    {deletingMessageId === message._id ? "Deleting..." : "Delete"}
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div
                                className={`chat-bubble flex flex-col ${
                                    isDeleted ? "italic text-base-content/60" : ""
                                }`}
                            >
                                {!isDeleted && message.image && (
                                    <img
                                        src={message.image}
                                        alt="Attachment"
                                        className="sm:max-w-[200px] rounded-md mb-2"
                                    />
                                )}
                                {!isDeleted && message.text && <p>{message.text}</p>}
                                {isDeleted && <p>{deletionCopy}</p>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <MessageInput />
        </div>
    );
};
export default ChatContainer;
