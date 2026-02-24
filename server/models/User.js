import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    picture: String,
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendRequests: [{
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
        createdAt: { type: Date, default: Date.now }
    }],
    notifications: [{
        type: { type: String }, // 'like', 'comment', 'friend_request'
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        fromName: String,
        postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
        text: String,
        isRead: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
export default User;
