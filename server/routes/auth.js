import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// This would normally be handled by a passport strategy or a direct Google OAuth flow
// For now, mirroring a common pattern where frontend sends the Google token
router.post('/google', async (req, res) => {
    const { googleId, name, email, picture } = req.body;

    try {
        let user = await User.findOne({ googleId });

        // Generate a fallback avatar if Google picture is missing or consistently for brand identity
        const avatarUrl = `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(name || email)}`;

        if (!user) {
            user = new User({
                googleId,
                name,
                email,
                picture: picture || avatarUrl
            });
            await user.save();
        } else if (!user.picture || user.picture.includes('googleusercontent')) {
            // Update to our generated avatar if the old one is failing or missing
            user.picture = avatarUrl;
            await user.save();
        }

        const payload = {
            id: user._id,
            name: user.name,
            email: user.email
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: payload });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export default router;
