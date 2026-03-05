import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, CheckCircle2, Loader2, Copy, Download,
  RefreshCcw, Search, Sun, Moon, AlertCircle, Sparkles,
  Shield, Zap, Globe, Menu, X, User, HelpCircle, ArrowRight,
  Cpu, Lock, Database, Headphones
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
  const [activeOverlay, setActiveOverlay] = useState(null); // 'precos' | 'tech' | 'privacy' | 'support'

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

  // Overlay Components
  const PricingOverlay = () => (
    <div className="flex flex-col items-center">
      <h2 className="text-4xl font-black mb-12 tracking-tighter">Escolha o seu Futuro.</h2>
      <div className="grid md:grid-cols-3 gap-8 w-full">
        {[
          { name: 'LOCAL', price: '0€', features: ['5 Scans por dia', 'Processamento Local', 'Exportar TXT'], btn: 'Começar Agora' },
          { name: 'HYPER', price: '19€', features: ['Scans Ilimitados', 'Sincronização Cloud', 'Motor Prioritário', 'Suporte 24h'], active: true, btn: 'Subscrever' },
          { name: 'NEURAL', price: '49€', features: ['Acesso via API', 'Múltiplos Utilizadores', 'Segurança Bancária', 'Painel Admin'], btn: 'Contactar' }
        ].map((plan) => (
          <div key={plan.name} className={`glass p-10 flex flex-col gap-6 relative ${plan.active ? 'border-blue-500 border-2' : ''}`}>
            <span className="text-xs font-black uppercase tracking-[0.4em] opacity-40">{plan.name}</span>
            <h3 className="text-5xl font-black text-main">{plan.price}<span className="text-sm opacity-30 font-bold">/mês</span></h3>
            <ul className="flex flex-col gap-4 flex-1">
              {plan.features.map(f => <li key={f} className="text-xs font-bold text-secondary flex items-center gap-2"><ArrowRight className="w-3 h-3 text-blue-500" /> {f}</li>)}
            </ul>
            <button className={`w-full py-4 font-black tracking-widest text-[10px] uppercase rounded ${plan.active ? 'btn-tesla-blue' : 'panel hover:bg-main/5'}`}>{plan.btn}</button>
          </div>
        ))}
      </div>
    </div>
  );

  const TechOverlay = () => (
    <div className="grid md:grid-cols-2 gap-20">
      <div className="flex flex-col gap-10">
        <h2 className="text-5xl font-black tracking-tighter">Tecnologia de <br />Próxima Geração.</h2>
        <p className="text-muted text-sm leading-loose">O OCRMUV utiliza redes neuronais avançadas via WASM (WebAssembly) para processar documentos com precisão industrial diretamente no hardware do utilizador.</p>
        <div className="flex gap-4">
          {['WASM', 'RE-NEURAL', 'PDF-JS', 'REACT'].map(t => <span key={t} className="px-4 py-2 bg-gray-500/5 rounded text-[10px] font-black tracking-widest">{t}</span>)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        {[
          { icon: <Cpu />, title: 'Motor WASM', desc: 'Performance nativa no browser.' },
          { icon: <Database />, title: 'Local-First', desc: 'Dados processados onde pertencem.' },
          { icon: <Shield />, title: 'AES-256', desc: 'Criptografia de nível militar.' },
          { icon: <Globe />, title: 'Distribuído', desc: 'Sem tempos de resposta de servidor.' }
        ].map(item => (
          <div key={item.title} className="glass p-6 flex flex-col gap-4">
            <div className="text-blue-500">{item.icon}</div>
            <h4 className="font-black text-sm">{item.title}</h4>
            <p className="text-[10px] text-muted font-bold leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const PrivacyOverlay = () => (
    <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-10">
      <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
        <Lock className="w-10 h-10" />
      </div>
      <h2 className="text-5xl font-black tracking-tighter italic">Privacidade é o <br />nosso Standard.</h2>
      <div className="grid gap-6 text-left w-full mt-10">
        {[
          { t: 'Processamento Local', d: 'Os seus documentos nunca carregam para os nossos servidores enquanto usa o motor local.' },
          { t: 'Sem Rastreio', d: 'Não vendemos nem processamos os seus dados para marketing ou treino de IA de terceiros.' },
          { t: 'Controlo Total', d: 'Pode apagar o seu histórico sincronizado no painel de administração a qualquer momento.' }
        ].map(p => (
          <div key={p.t} className="panel p-8">
            <h4 className="font-black text-lg mb-2">{p.t}</h4>
            <p className="text-sm text-secondary font-medium">{p.d}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const SupportOverlay = () => (
    <div className="flex flex-col items-center gap-12 text-center py-10">
      <h2 className="text-5xl font-black tracking-tighter">Como podemos <br />ajudar hoje?</h2>
      <div className="grid md:grid-cols-3 gap-8 w-full max-w-4xl">
        {[
          { icon: <Headphones />, title: 'Chat ao Vivo', desc: 'Tempo de espera médio de 2 min.' },
          { icon: <HelpCircle />, title: 'Base de Conhecimento', desc: 'Tutoriais e FAQs detalhadas.' },
          { icon: <Globe />, title: 'Comunidade', desc: 'Fórum oficial para utilizadores Pro.' }
        ].map(s => (
          <div key={s.title} className="glass p-10 flex flex-col items-center gap-6 cursor-pointer hover:border-blue-500 transition-all">
            <div className="text-blue-500">{s.icon}</div>
            <h4 className="font-black text-sm">{s.title}</h4>
            <p className="text-[10px] text-muted font-bold">{s.desc}</p>
          </div>
        ))}
      </div>
      <button className="btn-tesla-blue px-12 py-5 font-black tracking-widest text-xs rounded-full">ABRIR TICKET DE SUPORTE</button>
    </div>
  );

  return (
    <div className="h-screen max-h-screen bg-color flex flex-col overflow-hidden transition-all duration-700 font-sans">

      {/* Top Navigation Bar - Tesla Style */}
      <nav className="flex items-center justify-between px-8 py-4 z-[110]">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveOverlay(null)}>
          <Sparkles className="w-6 h-6 text-main" />
          <span className="font-black text-xl tracking-[-1.5px] text-main">OCRMUV</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-1">
          <button onClick={() => setActiveOverlay(null)} className="nav-link">Início</button>
          <button onClick={() => setActiveOverlay('tech')} className="nav-link">Tecnologia</button>
          <button onClick={() => setActiveOverlay('privacy')} className="nav-link">Privacidade</button>
          <button onClick={() => setActiveOverlay('precos')} className="nav-link">Planos</button>
          <button onClick={() => setActiveOverlay('support')} className="nav-link">Suporte</button>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 hover:bg-gray-500/10 rounded-lg transition-all" title="Alternar Tema">
            {theme === 'dark' ? <Sun className="w-5 h-5 text-main" /> : <Moon className="w-5 h-5 text-main" />}
          </button>

          <div className="hidden md:flex gap-2">
            <button className="p-2 hover:bg-gray-500/10 rounded-lg transition-all" onClick={() => setActiveOverlay('support')}><HelpCircle className="w-5 h-5 text-main" /></button>
            <button className="p-2 hover:bg-gray-500/10 rounded-lg transition-all"><Globe className="w-5 h-5 text-main" /></button>
            <button className="p-2 hover:bg-gray-500/10 rounded-lg transition-all"><User className="w-5 h-5 text-main" /></button>
          </div>

          <button className="p-2 lg:hidden" onClick={() => setIsMenuOpen(true)}>
            <Menu className="w-6 h-6 text-main" />
          </button>
        </div>
      </nav>

      {/* Overlays System */}
      <AnimatePresence>
        {activeOverlay && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.98 }}
            className="fixed inset-0 z-[100] bg-color pt-24 px-8 md:px-20 overflow-y-auto custom-scrollbar transition-colors duration-700"
          >
            <div className="max-w-[1400px] mx-auto pb-20">
              <button
                onClick={() => setActiveOverlay(null)}
                className="mb-10 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted hover:text-main transition-colors"
              >
                <X className="w-4 h-4" /> Fechar Secção
              </button>

              {activeOverlay === 'precos' && <PricingOverlay />}
              {activeOverlay === 'tech' && <TechOverlay />}
              {activeOverlay === 'privacy' && <PrivacyOverlay />}
              {activeOverlay === 'support' && <SupportOverlay />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                ${isDragActive ? 'border-blue-500 border-2 shadow-[0_0_20px_rgba(61,105,225,0.2)]' : ''}
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
                  <span className="font-black tracking-[0.2em] text-xs">A PROCESSAR {progress}%</span>
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6" />
                  <span className="font-black tracking-[0.2em] text-xs">INICIAR DIGITALIZAÇÃO</span>
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
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(61,105,225,0.8)]" />
                <h3 className="text-xs font-black uppercase tracking-[0.6em] text-main">Output Neural v2.0</h3>
              </div>

              <div className="flex gap-2">
                {result && (
                  <>
                    <button onClick={handleCopy} className="p-3 bg-gray-500/5 hover:bg-gray-500/10 rounded-xl transition-all" title="Copiar"><Copy className="w-5 h-5 text-main" /></button>
                    <button onClick={handleDownload} className="p-3 bg-gray-500/5 hover:bg-gray-500/10 rounded-xl transition-all" title="Download"><Download className="w-5 h-5 text-main" /></button>
                  </>
                )}
                <button onClick={() => { setResult(''); setFile(null); }} className="p-3 bg-gray-500/5 hover:bg-gray-500/10 rounded-xl transition-all" title="Reiniciar"><RefreshCcw className="w-5 h-5 text-main" /></button>
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
                  <div className="w-64 h-[4px] bg-gray-500/10 relative overflow-hidden rounded-full">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="absolute inset-y-0 left-0 bg-blue-500"
                    />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[1em] text-muted animate-pulse">A analisar pacotes neurais...</p>
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
            <p className="text-muted text-xs max-w-xs leading-loose font-medium">
              Elevando a inteligência documental a um nível tecnológico superior através de visão computacional local.
            </p>
          </div>
          <div className="flex flex-col gap-4 text-[11px] font-bold uppercase tracking-widest text-secondary">
            <span className="text-main mb-2">Produto</span>
            <button onClick={() => setActiveOverlay(null)} className="text-left hover:text-blue-500 transition-colors">Visão Geral</button>
            <button onClick={() => setActiveOverlay('tech')} className="text-left hover:text-blue-500 transition-colors">Tecnologia</button>
            <button onClick={() => setActiveOverlay('privacy')} className="text-left hover:text-blue-500 transition-colors">Segurança</button>
          </div>
          <div className="flex flex-col gap-4 text-[11px] font-bold uppercase tracking-widest text-secondary">
            <span className="text-main mb-2">Empresa</span>
            <a href="#" className="hover:text-blue-500 transition-colors">Sobre Nós</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Carreiras</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Investidores</a>
          </div>
          <div className="flex flex-col gap-4 text-[11px] font-bold uppercase tracking-widest text-secondary">
            <span className="text-main mb-2">Legal</span>
            <button onClick={() => setActiveOverlay('privacy')} className="text-left hover:text-blue-500 transition-colors">Privacidade</button>
            <a href="#" className="hover:text-blue-500 transition-colors">Termos</a>
            <button onClick={() => setActiveOverlay('support')} className="text-left hover:text-blue-500 transition-colors">Contactos</button>
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
            className="fixed inset-0 bg-color z-[200] p-8 flex flex-col"
          >
            <div className="flex justify-end p-4">
              <button onClick={() => setIsMenuOpen(false)}><X className="w-8 h-8 text-main" /></button>
            </div>
            <div className="flex flex-col gap-10 mt-12 text-center">
              {['Início', 'Tecnologia', 'Privacidade', 'Planos', 'Suporte'].map((item) => (
                <button
                  key={item}
                  className="text-3xl font-black text-main tracking-tighter"
                  onClick={() => {
                    if (item === 'Início') setActiveOverlay(null);
                    else if (item === 'Planos') setActiveOverlay('precos');
                    else if (item === 'Tecnologia') setActiveOverlay('tech');
                    else if (item === 'Privacidade') setActiveOverlay('privacy');
                    else if (item === 'Suporte') setActiveOverlay('support');
                    setIsMenuOpen(false);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
