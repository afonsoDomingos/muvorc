import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    companyName: String,
    role: { type: String, default: 'user' },
    subscription: { type: String, default: 'LOCAL' },
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

async function verify() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const user = await User.findOne({ email: 'admin@orcmuv.com' });
        if (user) {
            console.log('User Found:');
            console.log('- Email:', user.email);
            console.log('- Role:', user.role);
            console.log('- Subscription:', user.subscription);

            const isMatch = await bcrypt.compare('@Admin123@', user.password);
            console.log('- Password Match (@Admin123@):', isMatch);
        } else {
            console.log('User NOT found!');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

verify();
