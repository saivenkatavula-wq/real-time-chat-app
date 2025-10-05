import {Server} from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server,{
    cors:{
        origin: ["http://localhost:5173"]
    },
});

export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}


// used to store online users
const userSocketMap = {};

async function fetchFriendIds(userId) {
    try {
        const user = await User.findById(userId).select("friends");
        if (!user) return [];
        return user.friends.map((id) => id.toString());
    } catch (error) {
        console.error("Error fetching friend ids", error.message);
        return [];
    }
}

export async function emitOnlineFriends(userId, friendsList) {
    const socketId = userSocketMap[userId];
    if (!socketId) return;

    const socket = io.sockets.sockets.get(socketId);

    let friendIds = friendsList;
    if (!friendIds) {
        friendIds = await fetchFriendIds(userId);
    }

    if (socket) {
        socket.friendIds = friendIds || [];
    }

    const onlineFriendIds = (friendIds || [])
        .map((id) => id.toString())
        .filter((id) => Boolean(userSocketMap[id]));

    io.to(socketId).emit("getOnlineUsers", onlineFriendIds);
}

async function notifyFriends(friendIds) {
    if (!friendIds || friendIds.length === 0) return;
    await Promise.all(friendIds.map((friendId) => emitOnlineFriends(friendId.toString())));
}

io.on("connection", async (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId
    if(userId) {
        userSocketMap[userId] = socket.id
        socket.userId = userId;

        const friendIds = await fetchFriendIds(userId);
        socket.friendIds = friendIds;

        await emitOnlineFriends(userId, friendIds);
        await notifyFriends(friendIds);
    }

    socket.on("call:offer", ({ targetUserId, offer, callType, caller }) => {
        if (!userId || !targetUserId || !offer) return;

        const targetSocketId = userSocketMap[targetUserId];
        if (!targetSocketId) {
            io.to(socket.id).emit("call:error", { message: "User is offline" });
            return;
        }

        io.to(targetSocketId).emit("call:offer", {
            offer,
            callType,
            caller: {
                _id: userId,
                fullName: caller?.fullName || "Unknown caller",
                profilePic: caller?.profilePic || null,
            },
        });
    });

    socket.on("call:answer", ({ targetUserId, answer }) => {
        if (!userId || !targetUserId || !answer) return;
        const targetSocketId = userSocketMap[targetUserId];
        if (!targetSocketId) {
            io.to(socket.id).emit("call:error", { message: "User is offline" });
            return;
        }

        io.to(targetSocketId).emit("call:answer", { answer });
    });

    socket.on("call:ice-candidate", ({ targetUserId, candidate }) => {
        if (!userId || !targetUserId || !candidate) return;
        const targetSocketId = userSocketMap[targetUserId];
        if (!targetSocketId) return;
        io.to(targetSocketId).emit("call:ice-candidate", { candidate });
    });

    socket.on("call:decline", ({ targetUserId, reason }) => {
        if (!userId || !targetUserId) return;
        const targetSocketId = userSocketMap[targetUserId];
        if (!targetSocketId) {
            io.to(socket.id).emit("call:end", { reason: "offline" });
            return;
        }
        io.to(targetSocketId).emit("call:decline", { reason });
    });

    socket.on("call:end", ({ targetUserId, reason }) => {
        if (!userId || !targetUserId) return;
        const targetSocketId = userSocketMap[targetUserId];
        if (!targetSocketId) {
            io.to(socket.id).emit("call:end", { reason: "offline" });
            return;
        }
        io.to(targetSocketId).emit("call:end", { reason: reason || "ended" });
    });

    socket.on("disconnect", async () => {
        console.log("A user disconnected", socket.id);
        delete userSocketMap[userId];

        if (userId) {
            const friendIds = socket.friendIds || (await fetchFriendIds(userId));
            await notifyFriends(friendIds);
        }
    });
});

export {io, app, server};
