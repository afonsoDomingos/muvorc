import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do PDF.js (CDN fixo para compatibilidade)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

const getWorker = async (onProgress) => {
    const worker = await createWorker('por+eng', 1, {
        logger: m => {
            if (m.status === 'recognizing text') {
                onProgress(Math.floor(m.progress * 100));
            }
        },
        errorHandler: err => console.error('Tesseract Worker Error:', err)
    });
    return worker;
};

export const processImage = async (imageFile, onProgress) => {
    let worker;
    try {
        worker = await getWorker(onProgress);
        const { data: { text } } = await worker.recognize(imageFile);
        await worker.terminate();
        return text;
    } catch (error) {
        console.error('OCR Error:', error);
        if (worker) await worker.terminate();
        throw new Error('Falha ao processar imagem. Verifique o formato e a clareza do ficheiro.');
    }
};

export const processPdf = async (pdfFile, onProgress) => {
    let worker;
    try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        let fullText = '';

        // Criar um único worker para todas as páginas (mais rápido)
        worker = await getWorker((p) => {
            // Progresso individual será tratado dentro do loop
        });

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;
            const imageData = canvas.toDataURL('image/png');

            const { data: { text } } = await worker.recognize(imageData);

            // Atualizar progresso global
            onProgress(Math.floor((i / numPages) * 100));

            fullText += `--- Página ${i} ---\n${text}\n\n`;
        }

        await worker.terminate();
        return fullText;
    } catch (error) {
        console.error('PDF OCR Error:', error);
        if (worker) await worker.terminate();
        throw new Error('Falha no motor neural. Garante que o PDF não está protegido ou corrompido.');
    }
};
