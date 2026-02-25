import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import compression from 'compression';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import User from './models/User.js';
import Message from './models/Message.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import postRoutes from './routes/posts.js';
import profileRoutes from './routes/profile.js';
import chatRoutes from './routes/chat.js';
import bootRoutes from './routes/boot.js';


// Diagnostic: List all env keys (not values) for debugging Railway deployment
console.log('Environment Diagnosis:');
console.log('Current Shell Env Keys:', Object.keys(process.env).filter(key => !key.includes('SECRET') && !key.includes('PASSWORD') && !key.includes('TOKEN')));

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || process.env.MONGODBURL;

if (!MONGODB_URI) {
    console.error('CRITICAL ERROR: MONGODB_URI is not defined in environment variables.');
    console.error('Expected one of: MONGODB_URI, MONGO_URI, DATABASE_URL, MONGODBURL');
    process.exit(1);
}

const app = express();
app.use(compression());
const server = http.createServer(app);

const allowedOrigins = [
    process.env.CLIENT_URL,
    "https://collab-board-rosy.vercel.app",
    "http://localhost:5174",
    "http://localhost:5173"
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    maxAge: 86400 // Cache preflight requests for 24 hours
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/boot', bootRoutes);


// Basic Route
app.get('/', (req, res) => {
    res.send('Whiteboard API is running...');
});

// Socket.io Logic
const rooms = {}; // Track participants per room

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', ({ roomId, user }) => {
        socket.join(roomId);
        socket.user = user;
        socket.roomId = roomId;

        if (!rooms[roomId]) rooms[roomId] = [];

        // Prevent duplicate user entries
        const participantIdx = rooms[roomId].findIndex(p => p.socketId === socket.id);
        if (participantIdx === -1) {
            rooms[roomId].push({
                socketId: socket.id,
                userId: user.id || user._id,
                name: user.name,
                picture: user.picture
            });
        }

        console.log(`User ${user.name} joined room ${roomId}`);

        // Broadcast join message
        socket.to(roomId).emit('receive-message', {
            id: Date.now(),
            name: 'System',
            text: `${user.name} joined the room`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: true
        });

        // Sync participants list to ALL in room
        io.in(roomId).emit('update-participants', rooms[roomId]);
    });

    socket.on('element-update', ({ roomId, elements }) => {
        socket.to(roomId).emit('elements-sync', elements);
    });

    socket.on('canvas-clear', (roomId) => {
        socket.to(roomId).emit('elements-sync', []);
    });

    socket.on('cursor-move', ({ roomId, x, y, name, color, picture }) => {
        socket.to(roomId).emit('cursor-update', { id: socket.id, x, y, name, color, picture });
    });

    socket.on('send-message', (msgData) => {
        io.in(msgData.roomId).emit('receive-message', msgData);
    });

    socket.on('host-action', ({ roomId, action, targetId, targetName }) => {
        if (action === 'kick' || action === 'block') {
            io.to(targetId).emit('kicked');
        }
        io.in(roomId).emit('host-action-notice', { action, targetName });
    });

    // WebRTC Signaling
    socket.on('webrtc-offer', (data) => {
        io.to(data.to).emit('webrtc-offer', { from: socket.id, offer: data.offer });
    });

    socket.on('webrtc-answer', (data) => {
        io.to(data.to).emit('webrtc-answer', { from: socket.id, answer: data.answer });
    });

    socket.on('webrtc-ice-candidate', (data) => {
        io.to(data.to).emit('webrtc-ice-candidate', { from: socket.id, candidate: data.candidate });
    });

    // Screen Share Logic
    socket.on('start-screen-share', (roomId) => {
        socket.to(roomId).emit('screen-share-started', socket.id);
    });

    socket.on('stop-screen-share', (roomId) => {
        socket.to(roomId).emit('screen-share-stopped');
    });

    socket.on('webrtc-screen-offer', (data) => {
        io.to(data.to).emit('webrtc-screen-offer', { from: socket.id, offer: data.offer });
    });

    socket.on('webrtc-screen-answer', (data) => {
        io.to(data.to).emit('webrtc-screen-answer', { from: socket.id, answer: data.answer });
    });

    socket.on('webrtc-screen-ice', (data) => {
        io.to(data.to).emit('webrtc-screen-ice', { from: socket.id, candidate: data.candidate });
    });

    // Private Messaging & Status
    socket.on('register-user', (userId) => {
        socket.userId = userId;
        socket.join(userId); // Join a room named after the userId for private messaging
        io.emit('user-status', { userId, status: 'online' });
    });

    socket.on('private-message', async ({ to, text, fromName, fromPicture }) => {
        try {
            // Real-time delivery
            io.to(to).emit('private-message', {
                from: socket.userId,
                fromName,
                fromPicture,
                text,
                createdAt: new Date()
            });

            // Trigger instant UI refresh for receiver
            io.to(to).emit('notification', {
                type: 'message',
                fromName,
                text: `New message: ${text.substring(0, 30)}...`
            });

            // Database Persistence
            if (socket.userId) {
                const newMessage = new Message({
                    sender: socket.userId,
                    receiver: to,
                    text: text
                });
                await newMessage.save();
            }

            // Persistence as notification
            if (socket.userId) {
                const receiver = await User.findById(to);
                if (receiver) {
                    receiver.notifications.push({
                        type: 'message',
                        from: socket.userId,
                        fromName,
                        text: `New message: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`
                    });
                    await receiver.save();
                }
            }
        } catch (err) {
            console.error("Private Message Error:", err);
        }
    });

    socket.on('disconnect', () => {
        if (socket.userId) {
            io.emit('user-status', { userId: socket.userId, status: 'offline' });
        }
        if (socket.roomId && socket.user) {
            rooms[socket.roomId] = rooms[socket.roomId]?.filter(p => p.socketId !== socket.id);

            socket.to(socket.roomId).emit('receive-message', {
                id: Date.now(),
                name: 'System',
                text: `${socket.user.name} left the room`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isSystem: true
            });

            // Sync updated list
            io.in(socket.roomId).emit('update-participants', rooms[socket.roomId]);
            socket.to(socket.roomId).emit('user-disconnected', socket.id);
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
console.log('Attempting to connect to MongoDB...');
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Successfully connected to MongoDB');
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error details:', err);
    });
