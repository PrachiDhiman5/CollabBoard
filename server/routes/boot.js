import express from 'express';
import { protect as auth } from '../middleware/auth.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Post from '../models/Post.js';
import mongoose from 'mongoose';

const router = express.Router();

// Batch Boot Request - Fetches all initial dashboard/profile data in one go
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const id = new mongoose.Types.ObjectId(userId);

        console.log(`Mega-Boot requested for user: ${userId}`);

        const [
            user,
            history,
            publicRooms,
            trending,
            leaderboard,
            stats,
            suggestionsRaw,
            allPosts,
            topHashtags
        ] = await Promise.all([
            // 1. Full User Data (Notifications/Friends)
            User.findById(userId).populate('friends', 'name picture').populate('notifications.from', 'name picture').lean(),

            // 2. Room History
            Room.find({ $or: [{ host: id }, { participants: id }] })
                .select('-objects')
                .populate('host', 'name picture')
                .sort({ updatedAt: -1 })
                .limit(10)
                .lean(),

            // 3. Public Rooms
            Room.find({ isPublic: true })
                .select('-objects')
                .populate('host', 'name picture')
                .sort({ updatedAt: -1 })
                .limit(10)
                .lean(),

            // 4. Trending Data
            Post.aggregate([
                { $sort: { createdAt: -1 } },
                { $addFields: { likesCount: { $size: "$likes" } } },
                { $sort: { likesCount: -1 } },
                { $limit: 1 },
                { $project: { image: 1, caption: 1, userName: 1, userPicture: 1, likes: 1, createdAt: 1, userId: 1 } }
            ]),

            // 5. Leaderboard
            Post.aggregate([
                { $group: { _id: '$userId', userName: { $first: '$userName' }, userPicture: { $first: '$userPicture' }, totalLikes: { $sum: { $size: '$likes' } } } },
                { $sort: { totalLikes: -1 } },
                { $limit: 5 }
            ]),

            // 6. Statistics (Counts)
            Promise.all([
                Room.countDocuments({ $or: [{ host: id }, { participants: id }] }),
                Room.countDocuments({ $or: [{ host: id }, { participants: id }], isPublic: true })
            ]),

            // 7. Suggestions (Quick logic)
            Room.find({ $or: [{ host: id }, { participants: id }] })
                .sort({ updatedAt: -1 })
                .limit(3)
                .populate('participants', 'name picture')
                .lean(),

            // 8. Gallery Feed (Full)
            Post.find().sort({ createdAt: -1 }).limit(20).lean(),

            // 9. Top Hashtags
            Post.aggregate([
                { $unwind: '$hashtags' },
                { $group: { _id: '$hashtags', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        // Process Suggestions (Fast-track)
        let suggestions = [];
        if (suggestionsRaw && suggestionsRaw.length > 0) {
            const friendIds = new Set(user.friends.map(f => (f._id || f).toString()));
            const potentialMap = new Map();

            suggestionsRaw.forEach(room => {
                room.participants.forEach(p => {
                    const pId = p._id.toString();
                    if (pId !== userId && !friendIds.has(pId)) {
                        potentialMap.set(pId, p);
                    }
                });
            });
            const targetIds = Array.from(potentialMap.keys()).slice(0, 5);
            if (targetIds.length > 0) {
                const targetUsers = await User.find({ _id: { $in: targetIds } }).select('friendRequests').lean();
                suggestions = targetIds.map(tId => {
                    const p = potentialMap.get(tId);
                    const tUser = targetUsers.find(u => u._id.toString() === tId);
                    const isPending = tUser?.friendRequests.some(r => r.from.toString() === userId);
                    return { ...p, requestStatus: isPending ? 'pending' : 'none' };
                });
            }
        }

        const trendingPost = trending.length > 0 ? trending[0] : null;

        res.json({
            profile: {
                stats: {
                    totalRooms: stats[0],
                    publicRoomsCount: stats[1],
                    isTrending: trendingPost?.userId?.toString() === userId
                },
                notifications: user.notifications || [],
                friends: user.friends || [],
                suggestions: suggestions
            },
            rooms: {
                history,
                publicRooms
            },
            gallery: {
                trending: { trendingPost, topHashtags },
                leaderboard,
                posts: allPosts
            }
        });
    } catch (err) {
        console.error("Boot Error:", err);
        res.status(500).send('Server Error during Boot');
    }
});

export default router;
