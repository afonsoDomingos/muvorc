import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const processImage = async (imageFile, onProgress) => {
    const worker = await createWorker('por+eng', 1, {
        logger: m => {
            if (m.status === 'recognizing text') {
                onProgress(Math.floor(m.progress * 100));
            }
        }
    });

    try {
        const { data: { text } } = await worker.recognize(imageFile);
        await worker.terminate();
        return text;
    } catch (error) {
        console.error('OCR Error:', error);
        await worker.terminate();
        throw error;
    }
};

export const processPdf = async (pdfFile, onProgress) => {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;

        // Converter canvas para base64/blob para o Tesseract
        const imageData = canvas.toDataURL('image/png');

        const pageText = await processImage(imageData, (progress) => {
            // Calcular progresso global baseado na página atual
            const globalProgress = Math.floor(((i - 1) / numPages) * 100 + (progress / numPages));
            onProgress(globalProgress);
        });

        fullText += `--- Página ${i} ---\n${pageText}\n\n`;
    }

    return fullText;
};
