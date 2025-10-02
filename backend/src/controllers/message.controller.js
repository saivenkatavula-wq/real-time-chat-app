import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import {getReceiverSocketId, io} from "../lib/socket.js";

export const getUsersForSidebar = async(req, res) => {
    try{
        const userWithFriends = await User.findById(req.user._id).populate(
            "friends",
            "fullName email profilePic"
        );

        res.status(200).json(userWithFriends?.friends || []);
    }catch (error){
        console.error("Error in getUsersForSidebar:", error.message);
        res.status(500).json({error: "Internal server error"});

    }
};

export const getMessages = async(req, res) => {
    try{
        const {id: userToChatId} = req.params
        const myId = req.user._id;

        const isFriend = req.user.friends?.some((friendId) => friendId.toString() === userToChatId);
        if (!isFriend) {
            return res.status(403).json({error: "You can only view messages from friends"});
        }

        const messages = await Message.find({
            $or: [
                {senderId: myId, receiverId: userToChatId},
                {senderId: userToChatId, receiverId: myId}
            ]
        }).sort({createdAt: 1});
        res.status(200).json(messages)
    } catch (error){
        console.log("Error in getMessages controller: ", error.message);
        res.status(500).json({error: "Internal server error"})
    }
}

export const sendMessage = async(req, res) => {
    try{
        const {text, image} = req.body;
        const {id: receiverId} = req.params;
        const senderId = req.user._id;

        const isFriend = req.user.friends?.some((friendId) => friendId.toString() === receiverId);
        if (!isFriend) {
            return res.status(403).json({error: "You can only message your friends"});
        }

        let imageUrl;
        if (image) {
            //uploading base64 image to cloudinary
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        });

        await newMessage.save();

        const messageResponse = {
            ...newMessage.toObject(),
            senderId: newMessage.senderId.toString(),
            receiverId: newMessage.receiverId.toString(),
        };

        const receiverSocketId = getReceiverSocketId(receiverId);
        if(receiverSocketId){
            io.to(receiverSocketId).emit("newMessage", messageResponse);
        }

        res.status(201).json(messageResponse)
    }catch (error){
        console.log("Error in sendMessage controller: ", error.message);
        res.status(500).json({error: "Internal server error"});

    }
};

export const deleteMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const userId = req.user._id.toString();

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }

        if (message.senderId.toString() !== userId) {
            return res.status(403).json({ error: "You can only delete your own messages" });
        }

        if (!message.isDeleted) {
            message.text = "";
            message.image = null;
            message.isDeleted = true;
            message.deletedAt = new Date();
            message.deletedBy = req.user._id;

            await message.save();
        }

        const messageResponse = {
            ...message.toObject(),
            senderId: message.senderId.toString(),
            receiverId: message.receiverId.toString(),
            deletedBy: message.deletedBy?.toString() || null,
        };

        const participants = [
            message.senderId.toString(),
            message.receiverId.toString(),
        ];

        participants.forEach((participantId) => {
            const socketId = getReceiverSocketId(participantId);
            if (socketId) {
                io.to(socketId).emit("messageDeleted", messageResponse);
            }
        });

        res.status(200).json(messageResponse);
    } catch (error) {
        console.log("Error in deleteMessage controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
