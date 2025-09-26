import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import {connectDB} from "./lib/db.js";

dotenv.config({ path: '../.env.local' });
const app = express()
const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(cookieParser());
app.get('/', (req, res) => {
    res.send("🚀 API is running");
});
app.use("/api/auth", authRoutes)
app.use("/api/message", messageRoutes)

app.listen(PORT, () => {
    console.log('Server is running on port on PORT:', PORT);
    connectDB()
});