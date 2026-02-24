import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Post from '../models/Post.js';
import { protect as auth } from '../middleware/auth.js';

const router = express.Router();

// Get Profile Stats & Achievement
router.get('/stats', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('Fetching stats for userId:', userId);

        const id = new mongoose.Types.ObjectId(userId);

        // Room counts - More inclusive
        const rooms = await Room.find({
            $or: [{ host: id }, { participants: id }]
        });
        console.log('Rooms found for stats:', rooms.length);
        const totalRooms = rooms.length;
        const privateRooms = rooms.filter(r => !r.isPublic).map(r => ({ id: r.roomId, name: r.name }));
        const publicRoomsCount = rooms.filter(r => r.isPublic).length;

        // Trending Status (#1) using Aggregation
        const trendingPosts = await Post.aggregate([
            { $addFields: { likesCount: { $size: "$likes" } } },
            { $sort: { likesCount: -1 } },
            { $limit: 1 }
        ]);

        const isTrending = trendingPosts.length > 0 && trendingPosts[0].userId.toString() === userId;

        res.json({
            totalRooms,
            privateRooms,
            publicRoomsCount,
            isTrending,
            trendingPostId: isTrending ? trendingPosts[0]._id : null
        });
    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).send('Server Error');
    }
});

// Get Suggested Friends from Last Recent Room
router.get('/suggested-friends', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const id = new mongoose.Types.ObjectId(userId);

        const recentRooms = await Room.find({
            $or: [{ host: id }, { participants: id }]
        }).sort({ createdAt: -1 }).limit(5).populate('participants', 'name picture');

        if (!recentRooms || recentRooms.length === 0) return res.json([]);

        // Filter out self and existing friends from all recent rooms
        const user = await User.findById(id);
        const friendIds = user.friends.map(f => f.toString());

        let allPotential = [];
        recentRooms.forEach(room => {
            allPotential = [...allPotential, ...room.participants];
        });

        // Unique and filtered, with status check
        const uniqueWithStatus = [];
        const seenIds = new Set();
        seenIds.add(userId);

        for (const p of allPotential) {
            const pId = p._id.toString();
            if (!seenIds.has(pId) && !friendIds.includes(pId)) {
                // Check if we sent them a request
                const receiver = await User.findById(p._id);
                const isPending = receiver?.friendRequests.some(r => r.from.toString() === userId);

                uniqueWithStatus.push({
                    ...p.toObject(),
                    requestStatus: isPending ? 'pending' : 'none'
                });
                seenIds.add(pId);
            }
        }

        console.log('Total suggestions pooled:', uniqueWithStatus.length);
        res.json(uniqueWithStatus.slice(0, 5));
    } catch (err) {
        console.error("Suggestions Error:", err);
        res.status(500).send('Server Error');
    }
});

// Send Friend Request
router.post('/friend-request/send', auth, async (req, res) => {
    try {
        const { toUserId } = req.body;
        const fromUserId = req.user.id;

        if (toUserId === fromUserId) return res.status(400).json({ message: "Cannot friend yourself" });

        const receiver = await User.findById(toUserId);
        if (!receiver) return res.status(404).json({ message: "User not found" });

        // Check if already friends or request pending
        const alreadyRequested = receiver.friendRequests.some(r => r.from.toString() === fromUserId);
        if (alreadyRequested) return res.status(400).json({ message: "Request already sent" });

        receiver.friendRequests.push({ from: fromUserId });

        // Notification
        const sender = await User.findById(fromUserId);
        receiver.notifications.push({
            type: 'friend_request',
            from: fromUserId,
            fromName: sender.name,
            text: `${sender.name} sent you a friend request`
        });

        await receiver.save();
        res.json({ message: "Request sent" });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Accept/Reject Friend Request
router.post('/friend-request/respond', auth, async (req, res) => {
    try {
        const { requestId, action } = req.body; // requestId can be userId
        const userId = req.user.id;

        const user = await User.findById(userId);
        // Find by request _id OR by 'from' userId
        const currentIndex = user.friendRequests.findIndex(r =>
            r._id.toString() === requestId || r.from.toString() === requestId
        );

        if (currentIndex === -1) return res.status(404).json({ message: "Request not found" });

        const request = user.friendRequests[currentIndex];
        const requesterId = request.from;

        if (action === 'accept') {
            user.friends.push(requesterId);
            const requester = await User.findById(requesterId);
            requester.friends.push(userId);

            requester.notifications.push({
                type: 'friend_request_accepted',
                from: userId,
                fromName: user.name,
                text: `${user.name} accepted your friend request`
            });

            await requester.save();
        }

        // Update the current user's notification that triggered this
        const notificationIndex = user.notifications.findIndex(n =>
            n.from.toString() === requesterId.toString() && n.type === 'friend_request'
        );
        if (notificationIndex !== -1) {
            user.notifications[notificationIndex].type = 'friend_request_resolved';
            user.notifications[notificationIndex].text = `You ${action}ed ${user.notifications[notificationIndex].fromName}'s friend request`;
        }

        user.friendRequests.splice(currentIndex, 1);
        await user.save();

        res.json({ message: `Request ${action}ed` });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Get Notifications
router.get('/notifications', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('notifications.from', 'name picture');
        res.json(user.notifications.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Get Friend List
router.get('/friends', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('friends', 'name picture');
        res.json(user.friends || []);
    } catch (err) {
        console.error("Friends Error:", err);
        res.status(500).send('Server Error');
    }
});

export default router;
