import express from 'express';
import Room from '../models/Room.js';
import { protect as auth } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Create a room
router.post('/create', auth, async (req, res) => {
    try {
        const { name, isPublic } = req.body;
        const roomId = crypto.randomBytes(4).toString('hex');
        const newRoom = new Room({
            roomId,
            name: name || 'Untitled Board',
            isPublic: isPublic || false,
            host: req.user.id,
            participants: [req.user.id]
        });
        await newRoom.save();
        res.json(newRoom);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Get Public Rooms
router.get('/public', auth, async (req, res) => {
    try {
        const rooms = await Room.find({ isPublic: true })
            .populate('host', 'name picture')
            .sort({ updatedAt: -1 })
            .limit(20)
            .lean();
        res.json(rooms);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Get User's Recent Rooms
router.get('/history', auth, async (req, res) => {
    try {
        const rooms = await Room.find({
            $or: [
                { host: req.user.id },
                { participants: req.user.id }
            ]
        })
            .populate('host', 'name picture')
            .sort({ updatedAt: -1 })
            .limit(10)
            .lean();
        res.json(rooms);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Join/Fetch a room by ID
router.get('/:roomId', auth, async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId })
            .populate('host', 'name picture')
            .populate('participants', 'name picture');

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Strict Authorization for Private Rooms
        const userId = req.user.id;
        const isHost = room.host?._id?.toString() === userId || room.host?.toString() === userId;
        const isParticipant = room.participants.some(p => p._id.toString() === userId || p.toString() === userId);

        if (!room.isPublic && !isHost && !isParticipant) {
            return res.status(403).json({ message: 'Access denied. This is a private room.' });
        }

        // Add user to participants if not already there (only if room is public or they are already authorized)
        if (!isParticipant) {
            room.participants.push(userId);
            await room.save();
        }

        res.json(room);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Update room objects (persistence)
router.post('/:roomId/objects', auth, async (req, res) => {
    try {
        const { objects } = req.body;
        const room = await Room.findOneAndUpdate(
            { roomId: req.params.roomId },
            { $set: { objects, updatedAt: Date.now() } },
            { new: true }
        );
        res.json(room);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

export default router;
