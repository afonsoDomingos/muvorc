import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { HfInference } from '@huggingface/inference';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'ocrmuv_super_secret_key_2024';
const hfInputToken = process.env.HF_TOKEN || '';
const hf = new HfInference(hfInputToken);

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
    companyLogo: String,
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
        const adminEmail = 'admin@ocrmuv.com';
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
        console.log(`[AUTH] Register Attempt: ${email}`);

        if (!email || !password) {
            console.warn(`[AUTH] Register Blocked: Missing credentials for ${email}`);
            return res.status(400).json({ error: 'Email e password são obrigatórios' });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            console.warn(`[AUTH] Register Failed: Email already exists: ${email}`);
            return res.status(400).json({ error: 'Este email já está registado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email: email.toLowerCase(), password: hashedPassword, name, companyName });
        await newUser.save();

        console.log(`[AUTH] Register Success: ${email}`);
        res.status(201).json({ message: 'Conta criada com sucesso!' });
    } catch (error) {
        console.error('[AUTH] Registration Server Error:', error);
        res.status(500).json({ error: 'Erro interno ao criar conta' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`[AUTH] Login Attempt: ${email}`);

        if (!email || !password) {
            console.warn(`[AUTH] Login Blocked: Missing credentials for ${email}`);
            return res.status(400).json({ error: 'Credenciais incompletas' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.warn(`[AUTH] Login Failed: User not found: ${email}`);
            return res.status(401).json({ error: 'Utilizador não encontrado' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.warn(`[AUTH] Login Failed: Incorrect password for ${email}`);
            return res.status(401).json({ error: 'Palavra-passe incorreta' });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        console.log(`[AUTH] Login Success: ${email} (${user.role})`);

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
        console.error('[AUTH] Login Server Error:', error);
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

app.patch('/api/user/profile', authenticate, async (req, res) => {
    try {
        const { name, companyName, logoBase64 } = req.body;
        const updateData = { name, companyName };

        if (logoBase64) {
            const uploadRes = await cloudinary.uploader.upload(logoBase64, {
                folder: 'ocrmuv_logos',
                transformation: [{ width: 200, height: 200, crop: 'limit' }]
            });
            updateData.companyLogo = uploadRes.secure_url;
        }

        const user = await User.findByIdAndUpdate(req.userId, updateData, { new: true }).select('-password');
        res.json({ message: 'Perfil atualizado!', user });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
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

app.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar utilizadores' });
    }
});

app.patch('/api/admin/user/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { role, subscription, password } = req.body;
        const updateData = { role, subscription };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updated = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ message: 'Utilizador atualizado', data: updated });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar utilizador' });
    }
});

app.delete('/api/admin/user/:id', authenticate, isAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Utilizador removido' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao apagar utilizador' });
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

// AI Routes
app.post('/api/ai/chat', authenticate, async (req, res) => {
    try {
        const { documentText, query } = req.body;
        const prompt = `System: You are MUV Neural Guide, an AI assistant analyzing a document.\n\nDocument Text: ${documentText?.substring(0, 1500) || ''}\n\nUser Question: ${query}\n\nAnswer concisely based on the document:`;

        const response = await hf.textGeneration({
            model: 'meta-llama/Llama-3.1-8B-Instruct',
            inputs: prompt,
            parameters: { max_new_tokens: 250, temperature: 0.5 },
        });

        const answer = response.generated_text.replace(prompt, '').trim();
        res.json({ answer });
    } catch (error) {
        console.error('AI Chat Error:', error);
        // Fallback se a API falhar ou token não estiver configurado
        res.json({ answer: 'O modelo de IA (OpenSource) requer que defina as variáveis no backend ou pode estar indisponível. Baseado nos meus dados locais de fallback, o documento parece estar processado corretamente. Verifique o uso de chave.' });
    }
});

app.post('/api/ai/analyze-chart', authenticate, async (req, res) => {
    try {
        const { documentText } = req.body;
        const prompt = `System: Analyze the numbers in this text and create a JSON object for a chart. Format: {"title":"Values","type":"bar","data":[{"name":"Item","value":100}]}. Use real data from the text if available, otherwise make up a placeholder based on text context. Output ONLY valid JSON, nothing else.\n\nText: ${documentText?.substring(0, 500) || ''}\n\nJSON Output:`;

        const response = await hf.textGeneration({
            model: 'meta-llama/Llama-3.1-8B-Instruct',
            inputs: prompt,
            parameters: { max_new_tokens: 250, temperature: 0.1 },
        });

        const textRes = response.generated_text.replace(prompt, '').trim();
        const jsonStart = textRes.indexOf('{');
        const jsonEnd = textRes.lastIndexOf('}');

        if (jsonStart !== -1 && jsonEnd !== -1) {
            const chartData = JSON.parse(textRes.substring(jsonStart, jsonEnd + 1));
            return res.json(chartData);
        }
        throw new Error('Formato inválido retornado pela IA');
    } catch (error) {
        console.error('AI Analyze Error:', error);
        // Fallback Chart Data
        res.json({
            title: "Resultados Automáticos (Fallback)",
            type: "bar",
            data: [
                { name: "Receitas", value: 12500 },
                { name: "Despesas", value: 4300 },
                { name: "Impostos", value: 3100 },
                { name: "Lucro", value: 5100 }
            ]
        });
    }
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor pronto na porta ${PORT}`);
    });
}

export default app;
