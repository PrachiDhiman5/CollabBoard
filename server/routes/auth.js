import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

import axios from 'axios';

const router = express.Router();

// Optimized Google Login - Verifies Access Token directly from Google on the server
router.post('/google', async (req, res) => {
    const { idToken } = req.body; // Actually contains the access_token from implicit flow

    try {
        console.log("DEBUG: Verifying Google Token on backend...");
        // Fetch user info from Google using the access token
        const googleRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${idToken}` }
        });

        const { sub: googleId, name, email, picture } = googleRes.data;

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
