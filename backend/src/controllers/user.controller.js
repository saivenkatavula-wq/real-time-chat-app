import User from "../models/user.model.js";

export const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || !query.trim()) {
            return res.status(400).json({ message: "Search query is required" });
        }

        const regex = new RegExp(query.trim(), "i");
        const users = await User.find({
            _id: { $ne: req.user._id },
            $or: [{ email: regex }, { fullName: regex }],
        }).select("fullName email profilePic");

        if (!users.length) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(users);
    } catch (error) {
        console.log("Error in searchUsers controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};
