import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from "cors"
import path from "path"

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import {connectDB} from "./lib/db.js";
import * as bodyParser from "express";
import {app, server} from "./lib/socket.js";

dotenv.config({ path: '../.env.local' });
const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
    }))
app.get('/', (req, res) => {
    res.send("🚀 API is running");
});
app.use("/api/auth", authRoutes)
app.use("/api/messages", messageRoutes)

if(process.env.NODE_ENV==="production"){
    app.use(express.static(path.join(__dirname, "../frontend/dist")));


    app.get("*", (req,res) =>{
       res.sendFile(path.join(__dirname, "../frontend", "dist","index.html"));
    });
}


server.listen(PORT, () => {
    console.log('Server is running on port on PORT:', PORT);
    connectDB()
});