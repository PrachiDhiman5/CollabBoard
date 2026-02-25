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
        const id = new mongoose.Types.ObjectId(userId);

        // Optimized counts using countDocuments
        const [totalRooms, publicRoomsCount, privateRooms] = await Promise.all([
            Room.countDocuments({ $or: [{ host: id }, { participants: id }] }),
            Room.countDocuments({ $or: [{ host: id }, { participants: id }], isPublic: true }),
            Room.find({ $or: [{ host: id }, { participants: id }], isPublic: false })
                .select('roomId name')
                .lean()
        ]);

        // Trending Status (#1)
        const trendingPosts = await Post.aggregate([
            { $addFields: { likesCount: { $size: "$likes" } } },
            { $sort: { likesCount: -1 } },
            { $limit: 1 },
            { $project: { userId: 1 } }
        ]);

        const isTrending = trendingPosts.length > 0 && trendingPosts[0].userId.toString() === userId;

        res.json({
            totalRooms,
            privateRooms: privateRooms.map(r => ({ id: r.roomId, name: r.name })),
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
        }).sort({ updatedAt: -1 }).limit(1).populate('participants', 'name picture');

        if (!recentRooms || recentRooms.length === 0) return res.json([]);

        const user = await User.findById(id).select('friends');
        const friendIds = new Set(user.friends.map(f => f.toString()));

        const potentialMap = new Map();
        recentRooms.forEach(room => {
            room.participants.forEach(p => {
                const pId = p._id.toString();
                if (pId !== userId && !friendIds.has(pId)) {
                    potentialMap.set(pId, p);
                }
            });
        });

        const targetIds = Array.from(potentialMap.keys()).slice(0, 10);
        if (targetIds.length === 0) return res.json([]);

        // Batch fetch users to check pending status (Fixes N+1)
        const targetUsers = await User.find({ _id: { $in: targetIds } }).select('friendRequests');

        const suggestions = targetIds.map(tId => {
            const p = potentialMap.get(tId);
            const tUser = targetUsers.find(u => u._id.toString() === tId);
            const isPendingFromMe = tUser?.friendRequests.some(r => r.from.toString() === userId);
            const isPendingToMe = user.friendRequests?.some(r => r.from.toString() === tId);

            return {
                ...p.toObject(),
                requestStatus: (isPendingFromMe || isPendingToMe) ? 'pending' : 'none'
            };
        });

        res.json(suggestions.slice(0, 5));
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

        // Check if already friends or request pending (EITHER DIRECTION)
        const me = await User.findById(fromUserId);
        const alreadyRequestedByMe = receiver.friendRequests.some(r => r.from.toString() === fromUserId);
        const alreadyRequestedByThem = me.friendRequests.some(r => r.from.toString() === toUserId);
        const areAlreadyFriends = receiver.friends.includes(fromUserId);

        if (alreadyRequestedByMe || alreadyRequestedByThem || areAlreadyFriends) {
            return res.status(400).json({ message: "Relationship already exists or request pending" });
        }

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
        } else if (action === 'reject') {
            const requester = await User.findById(requesterId);
            if (requester) {
                requester.notifications.push({
                    type: 'friend_request_rejected',
                    from: userId,
                    fromName: user.name,
                    text: `${user.name} declined your friend request`
                });
                await requester.save();
            }
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
