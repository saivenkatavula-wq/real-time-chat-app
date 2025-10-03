import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { suggestReply } from "../controllers/ai.controller.js";

const router = express.Router();

router.post("/suggest-reply/:id", protectRoute, suggestReply);

export default router;

