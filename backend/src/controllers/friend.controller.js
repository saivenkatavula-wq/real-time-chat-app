import FriendRequest from "../models/friendRequest.model.js";
import User from "../models/user.model.js";
import { emitOnlineFriends, getReceiverSocketId, io } from "../lib/socket.js";

export const sendFriendRequest = async (req, res) => {
    try {
        const senderId = req.user._id;
        const { receiverId } = req.body;

        if (!receiverId) {
            return res.status(400).json({ message: "Receiver id is required" });
        }

        if (receiverId === String(senderId)) {
            return res.status(400).json({ message: "You cannot send a request to yourself" });
        }

        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ message: "User not found" });
        }

        const sender = await User.findById(senderId);
        const alreadyFriends = sender.friends.some((id) => id.equals(receiverId));
        if (alreadyFriends) {
            return res.status(400).json({ message: "You are already friends" });
        }

        const incomingPending = await FriendRequest.findOne({
            sender: receiverId,
            receiver: senderId,
            status: "pending",
        });

        if (incomingPending) {
            return res.status(400).json({ message: "This user already sent you a request" });
        }

        const existing = await FriendRequest.findOne({ sender: senderId, receiver: receiverId });

        if (existing) {
            if (existing.status === "pending") {
                return res.status(400).json({ message: "Friend request already sent" });
            }

            existing.status = "pending";
            existing.createdAt = new Date();
            await existing.save();

            const populated = await existing.populate("receiver", "fullName email profilePic");

            const receiverSocketId = getReceiverSocketId(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("friendRequest:new", await existing.populate("sender", "fullName email profilePic"));
            }

            return res.status(200).json(populated);
        }

        const friendRequest = await FriendRequest.create({ sender: senderId, receiver: receiverId });
        const populatedRequest = await friendRequest.populate("sender", "fullName email profilePic");

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("friendRequest:new", populatedRequest);
        }

        res.status(201).json(populatedRequest);
    } catch (error) {
        console.log("Error in sendFriendRequest controller:", error.message);
        if (error.code === 11000) {
            return res.status(400).json({ message: "Friend request already sent" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getPendingFriendRequests = async (req, res) => {
    try {
        const requests = await FriendRequest.find({
            receiver: req.user._id,
            status: "pending",
        }).populate("sender", "fullName email profilePic");

        res.status(200).json(requests);
    } catch (error) {
        console.log("Error in getPendingFriendRequests controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const respondToFriendRequest = async (req, res) => {
    try {
        const { requestId, action } = req.body;
        if (!requestId || !["accept", "decline"].includes(action)) {
            return res.status(400).json({ message: "Invalid request payload" });
        }

        const request = await FriendRequest.findById(requestId)
            .populate("sender", "fullName email profilePic")
            .populate("receiver", "fullName email profilePic");

        if (!request) {
            return res.status(404).json({ message: "Friend request not found" });
        }

        if (String(request.receiver._id) !== String(req.user._id)) {
            return res.status(403).json({ message: "Not authorized to respond" });
        }

        if (request.status !== "pending") {
            return res.status(400).json({ message: "Request already handled" });
        }

        if (action === "accept") {
            request.status = "accepted";
            await request.save();

            await User.findByIdAndUpdate(request.sender._id, {
                $addToSet: { friends: request.receiver._id },
            });

            await User.findByIdAndUpdate(request.receiver._id, {
                $addToSet: { friends: request.sender._id },
            });

            const receiverSocketId = getReceiverSocketId(request.sender._id.toString());
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("friendRequest:update", {
                    requestId,
                    status: "accepted",
                    friend: request.receiver,
                });
            }

            await emitOnlineFriends(request.sender._id.toString());
            await emitOnlineFriends(request.receiver._id.toString());

            res.status(200).json({
                status: "accepted",
                friend: request.sender,
            });
        } else {
            request.status = "declined";
            await request.save();

            const receiverSocketId = getReceiverSocketId(request.sender._id.toString());
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("friendRequest:update", {
                    requestId,
                    status: "declined",
                });
            }

            res.status(200).json({ status: "declined" });
        }
    } catch (error) {
        console.log("Error in respondToFriendRequest controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getFriends = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate("friends", "fullName email profilePic");
        res.status(200).json(user.friends);
    } catch (error) {
        console.log("Error in getFriends controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};
