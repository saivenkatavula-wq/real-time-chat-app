import express from "express";
import {
    getFriends,
    getPendingFriendRequests,
    respondToFriendRequest,
    sendFriendRequest,
} from "../controllers/friend.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protectRoute, getFriends);
router.get("/requests", protectRoute, getPendingFriendRequests);
router.post("/request", protectRoute, sendFriendRequest);
router.post("/respond", protectRoute, respondToFriendRequest);

export default router;
