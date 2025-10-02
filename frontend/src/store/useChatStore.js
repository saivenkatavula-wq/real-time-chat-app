import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
    messages: [],
    selectedUser: null,
    isMessagesLoading: false,

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
            set((state) => ({ messages: [...state.messages, res.data] }));
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
}));
