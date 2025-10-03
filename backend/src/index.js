import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from "cors"
import path from "path"

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import friendRoutes from "./routes/friend.route.js";
import userRoutes from "./routes/user.route.js";
import aiRoutes from "./routes/ai.route.js";
import {connectDB} from "./lib/db.js";
import {app, server} from "./lib/socket.js";

dotenv.config();
const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
    }))
app.use("/api/auth", authRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/friends", friendRoutes)
app.use("/api/users", userRoutes)
app.use("/api/ai", aiRoutes)

if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, '../frontend/dist');
    app.use(express.static(distPath));
    app.use((req, res, next) => {
        if (req.path.startsWith("/api/")) return next();
        res.sendFile(path.join(distPath, "index.html"));
    });
}


server.listen(PORT, () => {
    console.log('Server is running on port on PORT:', PORT);
    connectDB()
});
