import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
    messages: [],
    selectedUser: null,
    isMessagesLoading: false,
    aiStateByUser: {},
    isAiLoading: false,

    getMessages: async (userId) => {
        set({ isMessagesLoading: true });
        try {
            const res = await axiosInstance.get(`/messages/${userId}`);
            set({ messages: res.data });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load messages");
        } finally {
            set({ isMessagesLoading: false });
        }
    },
    sendMessage: async (messageData) => {
        const { selectedUser } = get();
        try {
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
            set((state) => {
                const updatedState = {
                    messages: [...state.messages, res.data],
                };

                if (selectedUser?._id && state.aiStateByUser[selectedUser._id]) {
                    updatedState.aiStateByUser = {
                        ...state.aiStateByUser,
                        [selectedUser._id]: {
                            ...state.aiStateByUser[selectedUser._id],
                            suggestion: null,
                        },
                    };
                }

                return updatedState;
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send message");
        }
    },

    deleteMessage: async (messageId) => {
        try {
            const res = await axiosInstance.delete(`/messages/${messageId}`);
            set((state) => ({
                messages: state.messages.map((message) =>
                    message._id === messageId ? res.data : message
                ),
            }));
            toast.success("Message deleted");
            return res.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete message");
            throw error;
        }
    },

    subscribeToMessages: () => {
        const { selectedUser } = get();
        if (!selectedUser) return;
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.on("newMessage", (newMessage) => {
            const authUserId = useAuthStore.getState().authUser?._id;
            const { selectedUser: currentSelectedUser } = get();
            if (!currentSelectedUser || !authUserId) return;

            const isRelevant =
                (newMessage.senderId === currentSelectedUser._id && newMessage.receiverId === authUserId) ||
                (newMessage.receiverId === currentSelectedUser._id && newMessage.senderId === authUserId);

            if (!isRelevant) return;

            set((state) => ({ messages: [...state.messages, newMessage] }));
        });

        socket.on("messageDeleted", (updatedMessage) => {
            const authUserId = useAuthStore.getState().authUser?._id;
            const { selectedUser: currentSelectedUser } = get();
            if (!currentSelectedUser || !authUserId) return;

            const belongsToConversation =
                (updatedMessage.senderId === currentSelectedUser._id && updatedMessage.receiverId === authUserId) ||
                (updatedMessage.receiverId === currentSelectedUser._id && updatedMessage.senderId === authUserId);

            if (!belongsToConversation) return;

            set((state) => ({
                messages: state.messages.map((message) =>
                    message._id === updatedMessage._id ? updatedMessage : message
                ),
            }));
        });
    },

    unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        socket?.off("newMessage");
        socket?.off("messageDeleted");
    },

    setSelectedUser: (selectedUser) => set({ selectedUser }),

    setAiModeForUser: (userId, enabled) =>
        set((state) => {
            if (!userId) return state;

            const existing = state.aiStateByUser[userId];
            const nextTone = enabled ? existing?.tone ?? null : null;
            const nextSuggestion = enabled ? existing?.suggestion ?? null : null;

            if (
                existing &&
                existing.enabled === enabled &&
                existing.tone === nextTone &&
                existing.suggestion === nextSuggestion
            ) {
                return state;
            }

            return {
                aiStateByUser: {
                    ...state.aiStateByUser,
                    [userId]: {
                        tone: nextTone,
                        enabled,
                        suggestion: nextSuggestion,
                    },
                },
            };
        }),

    setAiToneForUser: (userId, tone) =>
        set((state) => {
            if (!userId) return state;

            const existing = state.aiStateByUser[userId];
            if (existing && existing.tone === tone && existing.suggestion === null) {
                return state;
            }

            const base = existing ?? { enabled: true, tone: null, suggestion: null };

            return {
                aiStateByUser: {
                    ...state.aiStateByUser,
                    [userId]: {
                        ...base,
                        enabled: true,
                        tone,
                        suggestion: null,
                    },
                },
            };
        }),

    fetchAiSuggestion: async (userId) => {
        const { aiStateByUser } = get();
        const tone = aiStateByUser[userId]?.tone;

        if (!tone) {
            toast.error("Select a tone to get a suggestion");
            return null;
        }

        set({ isAiLoading: true });
        try {
            const res = await axiosInstance.post(`/ai/suggest-reply/${userId}`, { tone });
            const suggestion = res.data?.suggestion ?? "";

            if (!suggestion) {
                toast.error("AI did not provide a suggestion");
                return null;
            }

            set((state) => ({
                aiStateByUser: {
                    ...state.aiStateByUser,
                    [userId]: {
                        ...state.aiStateByUser[userId],
                        enabled: true,
                        tone,
                        suggestion,
                    },
                },
                isAiLoading: false,
            }));

            return suggestion;
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to fetch AI suggestion");
            return null;
        } finally {
            set((state) => (state.isAiLoading ? { isAiLoading: false } : state));
        }
    },

    clearAiSuggestion: (userId) =>
        set((state) => {
            const existing = state.aiStateByUser[userId];
            if (!existing || !existing.suggestion) {
                return state;
            }

            return {
                aiStateByUser: {
                    ...state.aiStateByUser,
                    [userId]: {
                        ...existing,
                        suggestion: null,
                    },
                },
            };
        }),
}));
