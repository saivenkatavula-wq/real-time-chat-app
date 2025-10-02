import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const initialState = {
    friends: [],
    pendingRequests: [],
    searchResults: [],
    isLoadingFriends: false,
    isLoadingRequests: false,
    isSearching: false,
    searchError: null,
};

export const useFriendStore = create((set, get) => ({
    ...initialState,

    reset: () => set({ ...initialState }),

    fetchFriends: async () => {
        if (get().isLoadingFriends) return;
        set({ isLoadingFriends: true });
        try {
            const res = await axiosInstance.get("/friends");
            set({ friends: res.data });
        } catch (error) {
            console.error("Failed to fetch friends", error);
            toast.error(error.response?.data?.message || "Failed to load friends");
            set({ friends: [] });
        } finally {
            set({ isLoadingFriends: false });
        }
    },

    fetchPendingRequests: async () => {
        if (get().isLoadingRequests) return;
        set({ isLoadingRequests: true });
        try {
            const res = await axiosInstance.get("/friends/requests");
            set({ pendingRequests: res.data });
        } catch (error) {
            console.error("Failed to fetch pending requests", error);
            toast.error(error.response?.data?.message || "Failed to load requests");
            set({ pendingRequests: [] });
        } finally {
            set({ isLoadingRequests: false });
        }
    },

    searchUsers: async (query) => {
        if (!query || !query.trim()) {
            set({ searchResults: [], searchError: null });
            return;
        }
        set({ isSearching: true, searchError: null });
        try {
            const res = await axiosInstance.get(`/users/search`, {
                params: { query },
            });
            set({ searchResults: res.data, searchError: null });
        } catch (error) {
            const message = error.response?.data?.message || "User not found";
            set({ searchResults: [], searchError: message });
        } finally {
            set({ isSearching: false });
        }
    },

    clearSearchResults: () => set({ searchResults: [], searchError: null }),

    sendFriendRequest: async (receiverId) => {
        try {
            await axiosInstance.post("/friends/request", { receiverId });
            toast.success("Friend request sent");
            // refresh pending requests for sender view if they open modal later
            get().fetchPendingRequests();
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send request");
            return false;
        }
    },

    respondToRequest: async ({ requestId, action }) => {
        try {
            const res = await axiosInstance.post("/friends/respond", { requestId, action });

            set((state) => {
                const partial = {
                    pendingRequests: state.pendingRequests.filter((request) => request._id !== requestId),
                };

                if (res.data.status === "accepted" && res.data.friend) {
                    const exists = state.friends.some((friend) => friend._id === res.data.friend._id);
                    if (!exists) {
                        partial.friends = [...state.friends, res.data.friend];
                    }
                }

                return partial;
            });

            if (res.data.status === "accepted") {
                toast.success("Friend request accepted");
            }

            if (res.data.status === "declined") {
                toast.success("Friend request declined");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to respond to request");
        }
    },

    addIncomingRequest: (request) => {
        set((state) => {
            const exists = state.pendingRequests.some((item) => item._id === request._id);
            if (exists) return {};
            return { pendingRequests: [...state.pendingRequests, request] };
        });
    },

    handleRequestUpdate: ({ requestId, status, friend }) => {
        set((state) => {
            const update = {
                pendingRequests: state.pendingRequests.filter((request) => request._id !== requestId),
            };

            if (status === "accepted" && friend) {
                const alreadyFriend = state.friends.some((item) => item._id === friend._id);
                if (!alreadyFriend) {
                    update.friends = [...state.friends, friend];
                }
            }

            return update;
        });

        if (status === "accepted") {
            toast.success("Friend request accepted");
        } else if (status === "declined") {
            toast("Friend request declined", { icon: "ℹ️" });
        }
    },
}));
