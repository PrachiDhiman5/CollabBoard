import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

import { OAuth2Client } from 'google-auth-library';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Optimized Google Login - Verifies ID Token directly from Google on the server
router.post('/google', async (req, res) => {
    const { idToken } = req.body; // Client now sends idToken instead of raw user data

    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { sub: googleId, name, email, picture } = ticket.getPayload();

        console.log(`DEBUG: Fast Auth verified for: ${email}`);

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
