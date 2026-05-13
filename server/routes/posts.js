import express from 'express';
import Post from '../models/Post.js';
import User from '../models/User.js';
import { protect as auth } from '../middleware/auth.js';
import { appendNotification } from '../utils/notifications.js';

const router = express.Router();

// Create Post
router.post('/', auth, async (req, res) => {
    try {
        const { image, caption, hashtags } = req.body;
        const newPost = new Post({
            userId: req.user.id,
            userName: req.user.name,
            userPicture: req.user.picture,
            image,
            caption,
            hashtags
        });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get Feed (Sorted by recent with pagination)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
        const skip = (page - 1) * limit;

        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Post.countDocuments();

        res.json({
            posts,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalPosts: total
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Like a post
router.post('/:id/like', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.likes.some(id => id.toString() === req.user.id)) {
            post.likes = post.likes.filter(id => id.toString() !== req.user.id);
        } else {
            post.likes.push(req.user.id);
            post.dislikes = post.dislikes.filter(id => id.toString() !== req.user.id);

            // Add Notification for owner
            if (post.userId.toString() !== req.user.id) {
                const owner = await User.findById(post.userId);
                if (owner) {
                    appendNotification(owner, {
                        type: 'like',
                        from: req.user.id,
                        fromName: req.user.name,
                        postId: post._id,
                        text: `${req.user.name} liked your post: "${post.caption.substring(0, 30)}${post.caption.length > 30 ? '...' : ''}"`
                    });
                    await owner.save();
                }
            }
        }

        await post.save();
        res.json(post);
    } catch (err) {
        res.status(500).send('Server Error'); // Changed error message
    }
});

// Dislike a post
router.post('/:id/dislike', auth, async (req, res) => { // Changed protect to auth
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const disliked = post.dislikes.some(id => id.toString() === req.user.id);
        if (disliked) {
            post.dislikes = post.dislikes.filter(id => id.toString() !== req.user.id);
        } else {
            post.dislikes.push(req.user.id);
            post.likes = post.likes.filter(id => id.toString() !== req.user.id);
        }
        await post.save();
        res.json(post);
    } catch (err) {
        res.status(500).send('Server Error'); // Changed error message
    }
});

// Add a comment
router.post('/:id/comment', auth, async (req, res) => {
    try {
        const { text } = req.body; // Destructured text from req.body
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const newComment = { // Created newComment object
            userId: req.user.id,
            userName: req.user.name,
            text
        };
        post.comments.push(newComment);

        // Add Notification for owner
        if (post.userId.toString() !== req.user.id) {
            const owner = await User.findById(post.userId);
            if (owner) {
                appendNotification(owner, {
                    type: 'comment',
                    from: req.user.id,
                    fromName: req.user.name,
                    postId: post._id,
                    text: `${req.user.name} commented on your post: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`
                });
                await owner.save();
            }
        }

        await post.save();
        res.json(post);
    } catch (err) {
        res.status(500).send('Server Error'); // Changed error message
    }
});

// Trending: gallery spotlight = post with the most likes (all-time), ties broken by recency
router.get('/trending', async (req, res) => {
    try {
        const [trendingPosts, topHashtags] = await Promise.all([
            Post.aggregate([
                { $addFields: { likesCount: { $size: { $ifNull: ['$likes', []] } } } },
                { $sort: { likesCount: -1, createdAt: -1 } },
                { $limit: 1 },
                { $project: { image: 1, caption: 1, userName: 1, userPicture: 1, likes: 1, createdAt: 1, userId: 1 } }
            ]),
            Post.aggregate([
                { $match: { hashtags: { $exists: true, $ne: [] } } },
                { $unwind: '$hashtags' },
                { $match: { hashtags: { $nin: [null, ''] } } },
                { $group: { _id: '$hashtags', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        const trendingPost = trendingPosts.length > 0 ? trendingPosts[0] : null;

        res.json({ trendingPost, topHashtags });
    } catch (err) {
        console.error("Trending Error:", err);
        res.status(500).json({ message: err.message });
    }
});

// Leaderboard Data (Top 10 users by total likes)
router.get('/leaderboard', async (req, res) => {
    try {
        const leaderboard = await Post.aggregate([
            {
                $group: {
                    _id: '$userId',
                    userName: { $first: '$userName' },
                    userPicture: { $first: '$userPicture' },
                    totalLikes: { $sum: { $size: { $ifNull: ['$likes', []] } } },
                    postCount: { $sum: 1 }
                }
            },
            { $sort: { totalLikes: -1 } },
            { $limit: 10 }
        ]);
        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
