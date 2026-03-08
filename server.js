import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'ocrmuv_super_secret_key_2024';

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Conectado ao MongoDB'))
    .catch((err) => console.error('❌ Erro MongoDB:', err));

// Schemas
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    companyName: String,
    role: { type: String, default: 'user' }, // user, admin
    subscription: { type: String, default: 'LOCAL' }, // LOCAL, HYPER, NEURAL
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
});

const OCRSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fileName: String,
    fileSize: Number,
    extractedText: String,
    imageUrl: String,
    folder: { type: String, default: 'Geral' },
    createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', UserSchema);
const OCR = mongoose.model('OCR', OCRSchema);

const PaymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    planName: String,
    amount: String,
    currency: String,
    proofUrl: String,
    status: { type: String, default: 'pending' }, // pending, approved, rejected
    createdAt: { type: Date, default: Date.now },
});

const Payment = mongoose.model('Payment', PaymentSchema);

// Admin Seed function
const seedAdmin = async () => {
    try {
        const adminEmail = 'admin@orcmuv.com';
        const hashedPassword = await bcrypt.hash('@Admin123@', 10);
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (!existingAdmin) {
            const admin = new User({
                email: adminEmail,
                password: hashedPassword,
                name: 'Diretor de Sistemas',
                companyName: 'OCRMUV Tech',
                role: 'admin',
                subscription: 'GLOBAL NEURAL'
            });
            await admin.save();
            console.log('👑 Admin Base Criado: admin@orcmuv.com');
        } else {
            existingAdmin.password = hashedPassword;
            existingAdmin.companyName = 'OCRMUV Tech';
            existingAdmin.role = 'admin';
            existingAdmin.subscription = 'GLOBAL NEURAL';
            await existingAdmin.save();
            console.log('👑 Admin Base Resetado: admin@orcmuv.com');
        }
    } catch (err) {
        console.error('Erro ao criar admin:', err);
    }
};
seedAdmin();

// Middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Não autorizado' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        // Update lastActive timestamp without awaiting (bg update)
        User.findByIdAndUpdate(req.userId, { lastActive: new Date() }).exec().catch(err => console.error('LastActive update failed:', err));
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

const isAdmin = async (req, res, next) => {
    const user = await User.findById(req.userId);
    if (user?.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Acesso negado: Requer privilégios de admin' });
    }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, companyName } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email e password são obrigatórios' });

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) return res.status(400).json({ error: 'Este email já está registado' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email: email.toLowerCase(), password: hashedPassword, name, companyName });
        await newUser.save();
        res.status(201).json({ message: 'Conta criada com sucesso!' });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Erro interno ao criar conta' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Credenciais incompletas' });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(401).json({ error: 'Utilizador não encontrado' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Palavra-passe incorreta' });

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                email: user.email,
                name: user.name,
                companyName: user.companyName,
                subscription: user.subscription,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Erro no servidor durante a autenticação' });
    }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar perfil' });
    }
});

// Admin Routes
app.get('/api/admin/stats', authenticate, isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalOCR = await OCR.countDocuments();
        const pendingPayments = await Payment.countDocuments({ status: 'pending' });

        // Count users active in the last 24 hours
        const activeTimeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeUsersCount = await User.countDocuments({ lastActive: { $gte: activeTimeThreshold } });

        const recentOCR = await OCR.find().sort({ createdAt: -1 }).limit(5).populate('userId', 'email name');
        res.json({ totalUsers, totalOCR, pendingPayments, recentOCR, activeUsersCount });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar estatísticas' });
    }
});

app.get('/api/admin/payments', authenticate, isAdmin, async (req, res) => {
    try {
        const payments = await Payment.find().populate('userId', 'email name').sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar pagamentos' });
    }
});

app.patch('/api/admin/payment/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { status, subscription } = req.body;
        const payment = await Payment.findByIdAndUpdate(req.params.id, { status }, { new: true });

        if (status === 'approved' && subscription) {
            await User.findByIdAndUpdate(payment.userId, { subscription });
        }

        res.json({ message: 'Estado do pagamento atualizado', data: payment });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar pagamento' });
    }
});

// User Payments
app.post('/api/payments/upload', authenticate, async (req, res) => {
    try {
        const { planName, amount, currency, imageBase64 } = req.body;

        const uploadRes = await cloudinary.uploader.upload(imageBase64, {
            folder: 'ocrmuv_payments',
        });

        const newPayment = new Payment({
            userId: req.userId,
            planName,
            amount,
            currency,
            proofUrl: uploadRes.secure_url
        });

        await newPayment.save();
        res.status(201).json({ message: 'Comprovativo enviado com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao enviar comprovativo' });
    }
});

// OCR Routes
app.post('/api/ocr/save', async (req, res) => {
    try {
        const { fileName, fileSize, extractedText, imageBase64, token, folder } = req.body;
        let userId = null;

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.userId;
        }

        let imageUrl = '';
        if (imageBase64) {
            const uploadRes = await cloudinary.uploader.upload(imageBase64, {
                folder: 'ocrmuv',
            });
            imageUrl = uploadRes.secure_url;
        }

        const newOCR = new OCR({
            userId,
            fileName,
            fileSize,
            extractedText,
            imageUrl,
            folder: folder || 'Geral'
        });

        await newOCR.save();
        res.status(201).json({ message: 'Estatísticas guardadas com sucesso!', data: newOCR });
    } catch (error) {
        console.error('SERVER ERROR:', error);
        res.status(500).json({ error: 'Erro ao guardar dados' });
    }
});

app.get('/api/ocr/history', authenticate, async (req, res) => {
    try {
        const history = await OCR.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao procurar histórico' });
    }
});

// Delete OCR record
app.delete('/api/ocr/:id', authenticate, async (req, res) => {
    try {
        await OCR.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        res.json({ message: 'Ficheiro removido' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover' });
    }
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor pronto na porta ${PORT}`);
    });
}

export default app;
