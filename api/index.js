import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

// Schema
const OCRSchema = new mongoose.Schema({
    fileName: String,
    fileSize: Number,
    extractedText: String,
    imageUrl: String,
    createdAt: { type: Date, default: Date.now },
});

const OCR = mongoose.model('OCR', OCRSchema);

// Routes
app.post('/api/ocr/save', async (req, res) => {
    try {
        const { fileName, fileSize, extractedText, imageBase64 } = req.body;

        let imageUrl = '';
        if (imageBase64) {
            const uploadRes = await cloudinary.uploader.upload(imageBase64, {
                folder: 'ocrmuv',
            });
            imageUrl = uploadRes.secure_url;
        }

        const newOCR = new OCR({
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

app.get('/api/ocr/history', async (req, res) => {
    try {
        const history = await OCR.find().sort({ createdAt: -1 }).limit(10);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao procurar histórico' });
    }
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor pronto na porta ${PORT}`);
    });
}

export default app;
