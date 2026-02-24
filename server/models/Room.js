import mongoose from 'mongoose';

const canvasObjectSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { type: String, required: true },
    properties: { type: mongoose.Schema.Types.Mixed, required: true },
    layer: { type: Number, default: 0 },
    creatorId: { type: String }, // Can be socketId or email
    createdAt: { type: Date, default: Date.now }
}, { _id: false });

const roomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    name: { type: String, default: 'Untitled Board' },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isPublic: { type: Boolean, default: false },
    objects: [canvasObjectSchema],
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Room = mongoose.model('Room', roomSchema);
export default Room;
