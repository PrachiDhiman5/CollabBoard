import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixIndexes() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        const db = mongoose.connection.db;
        const collection = db.collection('users');

        console.log('Checking indexes...');
        const indexes = await collection.indexes();
        console.log('Current indexes:', indexes.map(i => i.name));

        if (indexes.some(i => i.name === 'username_1')) {
            console.log('Dropping "username_1" index...');
            await collection.dropIndex('username_1');
            console.log('Index dropped successfully!');
        } else {
            console.log('"username_1" index not found. No action needed.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error fixing indexes:', err);
        process.exit(1);
    }
}

fixIndexes();
