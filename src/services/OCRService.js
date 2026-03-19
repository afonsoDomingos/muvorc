import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do PDF.js (CDN fixo para compatibilidade)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

let persistentWorker = null;
let currentProgressHandler = null;

const getWorker = async (onProgress) => {
    // Atualizar o handler global sem reconfigurar o worker (evita DataCloneError)
    currentProgressHandler = onProgress;

    if (persistentWorker) {
        return persistentWorker;
    }

    console.log('[NEURAL] Inicializando motor de reconhecimento...');
    // No Tesseract 5+, o logger é passado na criação e gerido internamente pelo main thread
    persistentWorker = await createWorker('por+eng', 1, {
        logger: m => {
            if (m.status === 'recognizing text' && typeof currentProgressHandler === 'function') {
                currentProgressHandler(Math.floor(m.progress * 100));
            }
        },
        cachePath: 'neural-cache',
    });
    return persistentWorker;
};

export const warmUp = async () => {
    try {
        await getWorker(() => { });
        console.log('[NEURAL] Motor aquecido e pronto.');
    } catch (e) {
        console.error('[NEURAL] Erro no pré-aquecimento:', e);
    }
};

export const processImage = async (imageFile, onProgress) => {
    let worker;
    try {
        console.time('[NEURAL] OCR Imagem');
        worker = await getWorker(onProgress);
        const { data: { text } } = await worker.recognize(imageFile);
        console.timeEnd('[NEURAL] OCR Imagem');
        return text;
    } catch (error) {
        console.error('OCR Error:', error);
        throw new Error('Falha ao processar imagem. Verifique o formato e a clareza do ficheiro.');
    }
};

export const processPdf = async (pdfFile, onProgress) => {
    let worker;
    try {
        console.time('[NEURAL] OCR PDF');
        const arrayBuffer = await pdfFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        let fullText = '';

        worker = await getWorker(() => { });

        for (let i = 1; i <= numPages; i++) {
            console.log(`[NEURAL] Processando página ${i}/${numPages}`);
            const page = await pdf.getPage(i);

            // Reduzir um pouco o scale para 1.5 para maior velocidade sem perda crítica de precisão
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;
            const imageData = canvas.toDataURL('image/jpeg', 0.85); // JPEG é mais leve que PNG

            const { data: { text } } = await worker.recognize(imageData);

            // Atualizar progresso global
            onProgress(Math.floor((i / numPages) * 100));
            fullText += `--- Página ${i} ---\n${text}\n\n`;

            // Limpeza de canvas para libertar memória
            canvas.width = 0;
            canvas.height = 0;
        }

        console.timeEnd('[NEURAL] OCR PDF');
        return fullText;
    } catch (error) {
        console.error('PDF OCR Error:', error);
        throw new Error('Falha no motor neural. Garante que o PDF não está protegido.');
    }
};
