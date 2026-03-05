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
    subscription: { type: String, default: 'LOCAL' }, // LOCAL, HYPER, NEURAL
    createdAt: { type: Date, default: Date.now }
});

const OCRSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fileName: String,
    fileSize: Number,
    extractedText: String,
    imageUrl: String,
    createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', UserSchema);
const OCR = mongoose.model('OCR', OCRSchema);

// Middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Não autorizado' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword, name });
        await newUser.save();
        res.status(201).json({ message: 'Conta criada com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar conta. Email já pode estar em uso.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { email: user.email, name: user.name, subscription: user.subscription } });
    } catch (error) {
        res.status(500).json({ error: 'Erro no servidor' });
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

// OCR Routes
app.post('/api/ocr/save', async (req, res) => {
    try {
        const { fileName, fileSize, extractedText, imageBase64, token } = req.body;
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
