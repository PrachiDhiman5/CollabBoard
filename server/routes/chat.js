import express from 'express';
import Message from '../models/Message.js';
import { protect as auth } from '../middleware/auth.js';

const router = express.Router();

// Get chat history with a friend
router.get('/history/:friendId', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const friendId = req.params.friendId;

        const messages = await Message.find({
            $or: [
                { sender: userId, receiver: friendId },
                { sender: friendId, receiver: userId }
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

export default router;
