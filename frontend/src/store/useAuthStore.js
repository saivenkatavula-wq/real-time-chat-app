import {create} from "zustand"
import {axiosInstance} from "../lib/axios.js";
import toast from "react-hot-toast";
import {io} from "socket.io-client"
import {useFriendStore} from "./useFriendStore.js";

const BASE_URL= import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";
export const useAuthStore = create((set, get) => ({
    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isUpdatingName: false,
    isCheckingAuth: true,
    onlineUsers: [],
    socket: null,



    checkAuth: async() => {
        try {
            const res = await axiosInstance.get("/auth/check");

            set({authUser: res.data});
            const friendStore = useFriendStore.getState();
            friendStore.fetchFriends();
            friendStore.fetchPendingRequests();
            get().connectSocket()
        }catch (error) {
            console.log("Error in checkAuth: ", error);
            set({authUser: null});
            useFriendStore.getState().reset();
        }finally {
            set({isCheckingAuth: false});
        }
    },

    signup: async (data) => {
        set({isSigningUp: true});
        try{
            const res = await axiosInstance.post("/auth/signup", data);
            set({authUser: res.data});
            toast.success("Account created successfully");
            useFriendStore.getState().reset();
            get().connectSocket();
        } catch (error){
            toast.error(error.response?.data?.message || "Failed to sign up");
            console.log("Error in signup: ", error);
        } finally{
            set({isSigningUp: false});
        }
    },

    login: async (data) => {
        set({ isLoggingIn: true});
        try{
            const res = await axiosInstance.post("/auth/login", data);
            set({authUser: res.data});
            toast.success("logged in successfully");

            const friendStore = useFriendStore.getState();
            friendStore.fetchFriends();
            friendStore.fetchPendingRequests();
            get().connectSocket()
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to login");
        }finally {
            set({isLoggingIn: false});
        }
    },

    logout: async () => {
        try {
            await axiosInstance.post("/auth/logout");
            set({authUser: null});
            toast.success("Logged out successfully");
            get().disconnectSocket();
            useFriendStore.getState().reset();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to logout");
        }
    },

    updateProfile: async (data) => {
        set({isUpdatingProfile: true});
        try{
            const res = await axiosInstance.put("/auth/update-profile", data);
            set({authUser: res.data});
            toast.success("Profile Updated Successfully");
        }catch (error){
            console.log("error in update profile: ", error);
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            set({ isUpdatingProfile: false});
        }
    },

    updateName: async (data) => {
        set({isUpdatingName: true});
        try{
            const res = await axiosInstance.put("/auth/update-name", data);
            set({authUser: res.data});
            toast.success("Name Updated Successfully");
        }catch (error){
            console.log("error in update Name: ", error);
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            set({ isUpdatingName: false});
        }
    },

    connectSocket: () => {
        const {authUser} = get()
        if(!authUser || get().socket?.connected) return;

        const socket = io(BASE_URL, {
            query: {
                userId: authUser._id,
            },
        });
        socket.connect();
        set({socket: socket});

        socket.on("getOnlineUsers" ,(userIds) => {
            set({onlineUsers: userIds})
        })

        socket.on("friendRequest:new", (request) => {
            useFriendStore.getState().addIncomingRequest(request);
        });

        socket.on("friendRequest:update", (payload) => {
            useFriendStore.getState().handleRequestUpdate(payload);
        });
    },

    disconnectSocket: () => {
        const socket = get().socket;
        if(!socket) return;

        socket.off("getOnlineUsers");
        socket.off("friendRequest:new");
        socket.off("friendRequest:update");

        if(socket.connected) socket.disconnect();
        set({socket: null, onlineUsers: []});
    },
}));
