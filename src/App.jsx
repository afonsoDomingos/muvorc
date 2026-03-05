import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, CheckCircle2, Loader2, Copy, Download, RefreshCcw, Search, Sun, Moon, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useDropzone } from 'react-dropzone';
import { processImage, processPdf } from './services/OCRService';

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
      <button
        onClick={toggleTheme}
        className="absolute top-8 right-8 p-3 rounded-full glass border border-opacity-50 hover:scale-110 transition-transform z-50 shadow-sm"
        title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
      >
        {theme === 'dark' ? <Sun className="w-5 h-5 text-main" /> : <Moon className="w-5 h-5 text-main" />}
      </button>

      <main className="flex-1 grid md:grid-cols-12 gap-10 min-h-0 mt-8">
        {/* Sessão de Upload */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-12 lg:col-span-5 flex flex-col gap-6 min-h-0"
        >
          <div
            {...getRootProps()}
            className={`
              glass rounded-[2rem] p-10 flex flex-col items-center justify-center border-2 border-dashed flex-1
              transition-all duration-500 cursor-pointer group relative overflow-hidden
              ${isDragActive ? 'border-main' : 'border-secondary opacity-40 hover:opacity-100'}
            `}
          >
            <input {...getInputProps()} />

            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  key="file-selected"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center z-10"
                >
                  <div className="bg-main bg-opacity-10 p-6 rounded-3xl mb-6 inline-block">
                    <CheckCircle2 className="w-12 h-12 text-main" />
                  </div>
                  <h3 className="text-xl font-bold text-main mb-2 truncate max-w-[250px]">{file.name}</h3>
                  <p className="text-secondary font-mono text-xs uppercase tracking-widest font-bold">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • PRONTO PARA SCAN
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="no-file"
                  className="text-center z-10"
                >
                  <div className="bg-main bg-opacity-5 p-8 rounded-[2rem] mb-6 inline-block group-hover:scale-110 transition-transform duration-500 border border-main border-opacity-10">
                    <Upload className="w-12 h-12 text-secondary" />
                  </div>
                  <h3 className="text-2xl font-black text-main mb-2 tracking-tight">ENVIAR ARQUIVO</h3>
                  <p className="text-secondary text-xs font-bold uppercase tracking-[0.3em]">
                    PDF • IMAGENS • DOCUMENTOS
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleProcess}
            disabled={!file || loading}
            className="w-full py-6 rounded-2xl font-black text-xs flex items-center justify-center gap-4 shrink-0 btn-premium uppercase tracking-[0.4em] shadow-xl"
          >
            {loading ? (
              <div className="flex items-center gap-4">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>PROCESSANDO {progress}%</span>
              </div>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>INICIAR DIGITALIZAÇÃO</span>
              </>
            )}
          </motion.button>
        </motion.section>

        {/* Sessão de Resultado */}
        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-12 lg:col-span-7 glass rounded-[2.5rem] p-10 flex flex-col min-h-0 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between mb-8 shrink-0">
            <h2 className="text-[10px] font-black flex items-center gap-5 text-main uppercase tracking-[0.6em]">
              <span className="w-2.5 h-2.5 bg-main rounded-full animate-pulse shadow-sm" />
              Painel de Extração
            </h2>
            <div className="flex gap-3">
              {result && (
                <>
                  <motion.button whileHover={{ y: -2 }} onClick={handleCopy} className="p-3 bg-panel border border-opacity-50 rounded-xl transition-all text-main" title="Copiar Texto">
                    <Copy className="w-5 h-5" />
                  </motion.button>
                  <motion.button whileHover={{ y: -2 }} onClick={handleDownload} className="p-3 bg-panel border border-opacity-50 rounded-xl transition-all text-main" title="Baixar TXT">
                    <Download className="w-5 h-5" />
                  </motion.button>
                </>
              )}
              {file && !loading && (
                <motion.button whileHover={{ rotate: 90 }} onClick={handleReset} className="p-3 bg-panel opacity-50 hover:opacity-100 border border-opacity-20 rounded-xl transition-all text-main" title="Reiniciar">
                  <RefreshCcw className="w-5 h-5" />
                </motion.button>
              )}
            </div>
          </div>

          <div className="flex-1 panel rounded-3xl p-8 overflow-y-auto font-mono text-sm leading-relaxed text-main custom-scrollbar selection:bg-main selection:text-transparent">
            {error ? (
              <div className="h-full flex flex-col items-center justify-center font-mono text-xs uppercase tracking-widest text-center">
                <div className="bg-red-500 bg-opacity-10 text-red-500 px-8 py-5 rounded-2xl border border-red-500 border-opacity-20 flex flex-col items-center gap-4">
                  <AlertCircle className="w-8 h-8" />
                  <p className="max-w-[300px] leading-loose">{error}</p>
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
                    className="w-44 h-44 border-[1px] border-dashed border-main opacity-20 rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl font-extralight text-main tracking-widest">{progress}%</span>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0, 0.1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 border border-main rounded-full"
                  />
                </div>
                <p className="font-bold uppercase tracking-[0.5em] text-[11px] text-secondary animate-pulse">Neural Engine Processando</p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-main text-center select-none">
                <FileText className="w-24 h-24 mb-10 opacity-10" />
                <p className="text-xs font-black uppercase tracking-[0.8em]">Sistema em Espera</p>
                <p className="text-[10px] uppercase tracking-[0.4em] mt-8">Aguardando entrada de dados neurais</p>
              </div>
            )}
          </div>
        </motion.section>
      </main>

      <footer className="shrink-0 pb-12 flex justify-between items-center opacity-40 border-t border-opacity-10 pt-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-main">
          OCRMUV <span className="mx-6 text-main opacity-20">|</span> 0.2v CORE
        </p>
        <div className="flex gap-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-main">
            Secure Data
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-main">
            Pure JS Engine
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
