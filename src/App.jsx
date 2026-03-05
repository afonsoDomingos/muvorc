import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, CheckCircle2, Loader2, Copy, Download,
  RefreshCcw, Search, Sun, Moon, AlertCircle, Sparkles,
  Shield, Zap, Globe, Menu, X, User, HelpCircle
} from 'lucide-react';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        console.log('Modo Offline: Estatísticas não persistidas.');
      }

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: theme === 'dark' ? ['#ffffff', '#3d69e1', '#000000'] : ['#3d69e1', '#171a20', '#888888']
      });
    } catch (err) {
      setError('Erro catastrófico no motor neural. Tente novamente com uma imagem mais nítida.');
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
    element.download = `ocrmuv-${new Date().getTime()}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="h-screen max-h-screen bg-color flex flex-col overflow-hidden transition-all duration-700">

      {/* Top Navigation Bar - Tesla Style */}
      <nav className="flex items-center justify-between px-8 py-4 z-50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-main" />
          <span className="font-black text-xl tracking-[-1.5px] text-main">OCRMUV</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-1">
          {['Início', 'Tecnologia', 'Privacidade', 'Planos', 'Suporte'].map((item) => (
            <a key={item} href="#" className="nav-link">{item}</a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 hover:bg-gray-500/10 rounded-lg transition-all" title="Alternar Tema">
            {theme === 'dark' ? <Sun className="w-5 h-5 text-main" /> : <Moon className="w-5 h-5 text-main" />}
          </button>

          <div className="hidden md:flex gap-2">
            <button className="p-2 hover:bg-gray-500/10 rounded-lg transition-all"><HelpCircle className="w-5 h-5 text-main" /></button>
            <button className="p-2 hover:bg-gray-500/10 rounded-lg transition-all"><Globe className="w-5 h-5 text-main" /></button>
            <button className="p-2 hover:bg-gray-500/10 rounded-lg transition-all"><User className="w-5 h-5 text-main" /></button>
          </div>

          <button className="p-2 lg:hidden" onClick={() => setIsMenuOpen(true)}>
            <Menu className="w-6 h-6 text-main" />
          </button>
        </div>
      </nav>

      {/* Main Experience */}
      <main className="flex-1 flex flex-col px-8 md:px-16 pt-2 pb-8 max-w-[1600px] mx-auto w-full min-h-0">
        <header className="mb-8 text-center md:text-left">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-main tracking-tighter"
          >
            Poder Neural. <span className="text-secondary opacity-50">Privado por Desenho.</span>
          </motion.h1>
        </header>

        <div className="flex-1 grid lg:grid-cols-12 gap-10 min-h-0">

          {/* Card Esquerdo: Input */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-12 xl:col-span-5 flex flex-col gap-6 min-h-0"
          >
            <div
              {...getRootProps()}
              className={`
                glass flex-1 flex flex-col items-center justify-center p-12 transition-all duration-300 cursor-pointer
                ${isDragActive ? 'border-blue-500 border-2' : ''}
                hover:border-main/20
              `}
            >
              <input {...getInputProps()} />
              <div className="w-24 h-24 rounded-3xl bg-gray-500/5 flex items-center justify-center mb-8">
                {file ? <CheckCircle2 className="w-12 h-12 text-blue-500" /> : <Upload className="w-12 h-12 text-main/10" />}
              </div>
              <h2 className="text-2xl font-black text-main mb-2">
                {file ? file.name : 'Comece a Digitalizar'}
              </h2>
              <p className="text-muted text-sm font-medium uppercase tracking-widest text-center">
                Solte o seu arquivo ou clique para selecionar
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleProcess}
              disabled={!file || loading}
              className={`
                w-full py-5 rounded-lg flex items-center justify-center gap-4 transition-all
                ${!file || loading ? 'bg-gray-500/10 text-muted cursor-not-allowed' : 'btn-tesla-blue shadow-xl'}
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="font-bold tracking-widest">PROCESSANDO {progress}%</span>
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6" />
                  <span className="font-bold tracking-widest">INICIAR DIGITALIZAÇÃO</span>
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Card Direito: Resultado */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-12 xl:col-span-7 glass p-10 flex flex-col min-h-0"
          >
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-[0.6em] text-main">Output Neural v2.0</h3>
              </div>

              <div className="flex gap-2">
                {result && (
                  <>
                    <button onClick={handleCopy} className="p-3 bg-gray-500/5 hover:bg-gray-500/10 rounded-xl transition-all" title="Copiar"><Copy className="w-5 h-5" /></button>
                    <button onClick={handleDownload} className="p-3 bg-gray-500/5 hover:bg-gray-500/10 rounded-xl transition-all" title="Download"><Download className="w-5 h-5" /></button>
                  </>
                )}
                <button onClick={() => { setResult(''); setFile(null); }} className="p-3 bg-gray-500/5 hover:bg-gray-500/10 rounded-xl transition-all" title="Reiniciar"><RefreshCcw className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex-1 panel p-10 overflow-y-auto custom-scrollbar font-mono text-sm leading-relaxed text-main selection:bg-blue-500 selection:text-white">
              {error ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4 text-red-500">
                  <AlertCircle className="w-12 h-12" />
                  <p className="font-bold max-w-sm">{error}</p>
                </div>
              ) : result ? (
                <pre className="whitespace-pre-wrap">{result}</pre>
              ) : loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-6">
                  <div className="w-64 h-[2px] bg-gray-500/10 relative overflow-hidden rounded-full">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="absolute inset-y-0 left-0 bg-blue-500"
                    />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted">A analisar pacotes de dados...</p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-10 text-main select-none">
                  <FileText className="w-24 h-24 mb-6" />
                  <p className="text-xs font-black uppercase tracking-[0.8em]">Aguardando Entrada</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Multi-column Footer - Tesla Inspired */}
      <footer className="shrink-0 px-8 py-10 border-t border-gray-500/10 max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
          <div className="col-span-2">
            <h4 className="font-black text-lg mb-4 text-main tracking-tighter">OCRMUV</h4>
            <p className="text-muted text-xs max-w-xs leading-relaxed">
              Elevando a inteligência documental a um novo patamar tecnológico. Totalmente local, ultra-privado e desenhado para o futuro.
            </p>
          </div>
          <div className="flex flex-col gap-4 text-[11px] font-bold uppercase tracking-widest text-secondary">
            <span className="text-main mb-2">Produto</span>
            <a href="#" className="hover:text-blue-500 transition-colors">Visão Geral</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Tecnologia</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Segurança</a>
          </div>
          <div className="flex flex-col gap-4 text-[11px] font-bold uppercase tracking-widest text-secondary">
            <span className="text-main mb-2">Empresa</span>
            <a href="#" className="hover:text-blue-500 transition-colors">Sobre Nós</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Carreiras</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Investidores</a>
          </div>
          <div className="flex flex-col gap-4 text-[11px] font-bold uppercase tracking-widest text-secondary">
            <span className="text-main mb-2">Legal</span>
            <a href="#" className="hover:text-blue-500 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Termos</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Contactos</a>
          </div>
        </div>
        <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold text-muted uppercase tracking-widest">
          <p>© 2024 OCRMUV Inc. <span className="mx-4 text-gray-500/20">|</span> Todos os Direitos Reservados</p>
          <div className="flex items-center gap-8">
            <span className="flex items-center gap-2"><Shield className="w-3 h-3" /> Camada Segura</span>
            <span className="flex items-center gap-2"><Globe className="w-3 h-3" /> Rede Local</span>
          </div>
        </div>
      </footer>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 bg-color z-[100] p-8 flex flex-col"
          >
            <div className="flex justify-end p-4">
              <button onClick={() => setIsMenuOpen(false)}><X className="w-8 h-8 text-main" /></button>
            </div>
            <div className="flex flex-col gap-10 mt-12 text-center">
              {['Início', 'Tecnologia', 'Privacidade', 'Planos', 'Suporte'].map((item) => (
                <a key={item} href="#" className="text-3xl font-black text-main tracking-tighter" onClick={() => setIsMenuOpen(false)}>{item}</a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
