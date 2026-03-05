import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, CheckCircle2, Loader2, Copy, Download, RefreshCcw, Search, Sun, Moon, AlertCircle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useDropzone } from 'react-dropzone';
import { processImage, processPdf } from './services/OCRService';
import axios from 'axios';

const App = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState('');
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const onDrop = useCallback((acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult('');
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    },
    multiple: false
  });

  const handleProcess = async () => {
    if (!file) return;

    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await processPdf(file, setProgress);
      } else {
        text = await processImage(file, setProgress);
      }

      setResult(text);

      // Enviar estatísticas para o Banco de Dados e Cloudinary (Cloud-Ready)
      try {
        const apiUrl = import.meta.env.MODE === 'development'
          ? 'http://localhost:5000/api/ocr/save'
          : '/api/ocr/save';

        let imageBase64 = null;
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          imageBase64 = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
        }

        await axios.post(apiUrl, {
          fileName: file.name,
          fileSize: file.size,
          extractedText: text.substring(0, 1000),
          imageBase64: imageBase64
        });
      } catch (saveErr) {
        console.log('Modo Offline: Estatísticas não persistidas no servidor.');
      }

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: theme === 'dark' ? ['#ffffff', '#888888', '#000000'] : ['#000000', '#444444', '#888888']
      });
    } catch (err) {
      setError('Erro ao processar o documento. Verifique se o arquivo está nítido e tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const fileNode = new Blob([result], { type: 'text/plain' });
    element.href = URL.createObjectURL(fileNode);
    element.download = `ocrmuv-resultado-${new Date().getTime()}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  const handleReset = () => {
    setFile(null);
    setResult('');
    setProgress(0);
    setError(null);
  };

  return (
    <div className="h-screen max-h-screen p-6 md:p-12 max-w-[1400px] mx-auto flex flex-col gap-8 overflow-hidden relative">
      <div className="flex justify-between items-center w-full z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-main rounded-xl flex items-center justify-center">
            <Sparkles className="text-bg-color w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-main">OCR<span className="opacity-50">MUV</span></h1>
        </div>
        <button
          onClick={toggleTheme}
          className="p-3 rounded-full glass border-2 border-main hover:scale-110 transition-transform shadow-lg"
          title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-main" /> : <Moon className="w-5 h-5 text-main" />}
        </button>
      </div>

      <main className="flex-1 grid md:grid-cols-12 gap-8 min-h-0 pt-4">
        {/* Sessão de Upload */}
        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="md:col-span-12 lg:col-span-5 flex flex-col gap-6 min-h-0"
        >
          <div
            {...getRootProps()}
            className={`
              glass rounded-[2.5rem] p-12 flex flex-col items-center justify-center border-4 border-dashed flex-1
              transition-all duration-300 cursor-pointer group relative overflow-hidden
              ${isDragActive ? 'border-main bg-main bg-opacity-5' : 'border-current border-opacity-20 hover:border-opacity-100 hover:bg-main hover:bg-opacity-5'}
            `}
          >
            <input {...getInputProps()} />

            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  key="file-selected"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center z-10"
                >
                  <div className="bg-main p-8 rounded-[2rem] mb-6 inline-block shadow-2xl">
                    <CheckCircle2 className="w-16 h-16 text-bg-color" />
                  </div>
                  <h3 className="text-3xl font-black text-main mb-3 truncate max-w-[300px]">{file.name}</h3>
                  <p className="text-main font-mono text-xs uppercase tracking-[0.3em] font-black">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • PRONTO
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="no-file"
                  className="text-center z-10 flex flex-col items-center"
                >
                  <div className="bg-main bg-opacity-10 p-10 rounded-[3rem] mb-8 group-hover:bg-opacity-20 transition-all duration-500 border-2 border-main border-opacity-10 shadow-inner">
                    <Upload className="w-20 h-20 text-main" />
                  </div>
                  <h3 className="text-4xl font-black text-main mb-4 tracking-tighter">ENVIAR ARQUIVO</h3>
                  <p className="text-main text-sm font-bold uppercase tracking-[0.4em] opacity-60">
                    PDF • IMAGENS • DOCUMENTOS
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleProcess}
            disabled={!file || loading}
            className="w-full py-8 rounded-[2rem] font-black text-lg flex items-center justify-center gap-5 shrink-0 btn-premium uppercase tracking-[0.5em] shadow-2xl"
          >
            {loading ? (
              <div className="flex items-center gap-5">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>PROCESSANDO {progress}%</span>
              </div>
            ) : (
              <>
                <Search className="w-7 h-7" />
                <span className="glow-text">INICIAR SCAN</span>
              </>
            )}
          </motion.button>
        </motion.section>

        {/* Sessão de Resultado */}
        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-12 lg:col-span-7 glass rounded-[2.5rem] p-10 flex flex-col min-h-0 shadow-2xl border-2 border-main border-opacity-10"
        >
          <div className="flex items-center justify-between mb-8 shrink-0">
            <h2 className="text-xs font-black flex items-center gap-6 text-main uppercase tracking-[0.8em]">
              <div className="w-3 h-3 bg-main rounded-full shadow-[0_0_15px_var(--text-main)]" />
              Painel de Extração
            </h2>
            <div className="flex gap-4">
              {result && (
                <>
                  <motion.button whileHover={{ y: -3 }} onClick={handleCopy} className="p-4 bg-main bg-opacity-10 border-2 border-main border-opacity-20 rounded-2xl transition-all text-main" title="Copiar Texto">
                    <Copy className="w-6 h-6" />
                  </motion.button>
                  <motion.button whileHover={{ y: -3 }} onClick={handleDownload} className="p-4 bg-main bg-opacity-10 border-2 border-main border-opacity-20 rounded-2xl transition-all text-main" title="Baixar TXT">
                    <Download className="w-6 h-6" />
                  </motion.button>
                </>
              )}
              {file && !loading && (
                <motion.button whileHover={{ rotate: 90 }} onClick={handleReset} className="p-4 bg-red-500 bg-opacity-10 opacity-60 hover:opacity-100 border-2 border-red-500 border-opacity-20 rounded-2xl transition-all text-red-500" title="Reiniciar">
                  <RefreshCcw className="w-6 h-6" />
                </motion.button>
              )}
            </div>
          </div>

          <div className="flex-1 panel rounded-[2rem] p-10 overflow-y-auto font-mono text-base leading-relaxed text-main custom-scrollbar selection:bg-main selection:text-transparent border-2 border-main border-opacity-5">
            {error ? (
              <div className="h-full flex flex-col items-center justify-center font-mono text-xs uppercase tracking-widest text-center">
                <div className="bg-red-500 bg-opacity-10 text-red-500 px-10 py-8 rounded-3xl border-2 border-red-500 border-opacity-20 flex flex-col items-center gap-6 shadow-2xl">
                  <AlertCircle className="w-12 h-12" />
                  <p className="max-w-[350px] leading-loose font-bold">{error}</p>
                </div>
              </div>
            ) : result ? (
              <pre className="whitespace-pre-wrap">{result}</pre>
            ) : loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-12">
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="w-56 h-56 border-2 border-dashed border-main opacity-30 rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl font-black text-main tracking-tighter">{progress}%</span>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0, 0.2] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 border-2 border-main rounded-full"
                  />
                </div>
                <p className="font-black uppercase tracking-[0.8em] text-[12px] text-main opacity-60 animate-pulse">Neural Engine Processando</p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-main text-center select-none">
                <FileText className="w-32 h-32 mb-12 opacity-10" />
                <p className="text-sm font-black uppercase tracking-[1em]">Standby</p>
                <p className="text-[10px] uppercase tracking-[0.4em] mt-10">Neural Data Stream Waiting</p>
              </div>
            )}
          </div>
        </motion.section>
      </main>

      <footer className="shrink-0 pb-12 flex justify-between items-center opacity-60 border-t-2 border-main border-opacity-10 pt-10">
        <p className="text-[12px] font-black uppercase tracking-[0.6em] text-main">
          OCRMUV <span className="mx-8 text-main opacity-20">|</span> 0.2v HYPER-SCAN
        </p>
        <div className="flex gap-12">
          <p className="text-[12px] font-black uppercase tracking-[0.6em] text-main border-b-2 border-main">
            SECURE
          </p>
          <p className="text-[12px] font-black uppercase tracking-[0.6em] text-main border-b-2 border-main">
            LOCAL
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
