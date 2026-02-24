import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Room from './models/Room.js';
import Post from './models/Post.js';

dotenv.config();

const runDiag = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('--- ENHANCED DIAGNOSTIC ---');

        const totalUsers = await User.countDocuments();
        const totalRooms = await Room.countDocuments();
        const totalPosts = await Post.countDocuments();

        console.log(`Totals: Users: ${totalUsers}, Rooms: ${totalRooms}, Posts: ${totalPosts}`);

        if (totalRooms > 0) {
            const sampleRoom = await Room.findOne().populate('host', 'name');
            console.log('Sample Room Host ID:', sampleRoom.host?._id || sampleRoom.host);
            console.log('Sample Room Host Name:', sampleRoom.host?.name || 'N/A');
        }

        if (totalPosts > 0) {
            const samplePost = await Post.findOne();
            console.log('Sample Post Owner ID:', samplePost.userId);
            console.log('Sample Post Likes:', samplePost.likes.length);
        }

        const usersWithRooms = await Room.distinct('host');
        console.log('Users who host rooms (unique IDs):', usersWithRooms);

        console.log('--- END DIAGNOSTIC ---');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

runDiag();
