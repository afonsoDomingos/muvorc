import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, CheckCircle2, Loader2, Copy, Download,
  RefreshCcw, Search, Sun, Moon, AlertCircle, Sparkles,
  Shield, Zap, Globe, Menu, X, User, HelpCircle, ArrowRight,
  Cpu, Lock, Database, Headphones, Mail, Key, LogOut, Trash2
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
  const [activeOverlay, setActiveOverlay] = useState(null); // 'precos' | 'tech' | 'privacy' | 'support' | 'auth' | 'dashboard'

  // Auth State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ocrmuv_token'));
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authData, setAuthData] = useState({ email: '', password: '', name: '' });
  const [userHistory, setUserHistory] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (token) {
      if (!user) fetchUser();
      if (activeOverlay === 'dashboard') fetchHistory();
    }
  }, [token, user, activeOverlay]);

  const fetchUser = async () => {
    try {
      const apiUrl = import.meta.env.MODE === 'development' ? 'http://localhost:5000/api/auth/me' : '/api/auth/me';
      const res = await axios.get(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data);
    } catch (err) {
      logout();
    }
  };

  const fetchHistory = async () => {
    try {
      const apiUrl = import.meta.env.MODE === 'development' ? 'http://localhost:5000/api/ocr/history' : '/api/ocr/history';
      const res = await axios.get(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
      setUserHistory(res.data);
    } catch (err) {
      console.error('Erro ao carregar histórico');
    }
  };

  const logout = () => {
    localStorage.removeItem('ocrmuv_token');
    setToken(null);
    setUser(null);
    setActiveOverlay(null);
  };

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

      // Persistência
      try {
        const apiUrl = import.meta.env.MODE === 'development' ? 'http://localhost:5000/api/ocr/save' : '/api/ocr/save';

        let imageBase64 = null;
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          imageBase64 = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
        }

        await axios.post(apiUrl, {
          token,
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
      setError('Falha no motor neural. Garante que o ficheiro é legível.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    const endpoint = authMode === 'login' ? 'login' : 'register';
    const apiUrl = import.meta.env.MODE === 'development' ? `http://localhost:5000/api/auth/${endpoint}` : `/api/auth/${endpoint}`;

    try {
      const res = await axios.post(apiUrl, authData);
      if (authMode === 'login') {
        localStorage.setItem('ocrmuv_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        setActiveOverlay(null);
      } else {
        setAuthMode('login');
        alert('Conta criada! Inicia sessão agora.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro na autenticação');
    }
  };

  const deleteRecord = async (id) => {
    try {
      const apiUrl = import.meta.env.MODE === 'development' ? `http://localhost:5000/api/ocr/${id}` : `/api/ocr/${id}`;
      await axios.delete(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
      fetchHistory();
    } catch (err) {
      alert('Erro ao apagar');
    }
  };

  // Overlay Components
  const AuthOverlay = () => (
    <div className="max-w-md mx-auto py-10 flex flex-col items-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-8">
        <User className="w-8 h-8" />
      </div>
      <h2 className="text-4xl font-black mb-10 tracking-tighter text-center">
        {authMode === 'login' ? 'Ben-vindo de volta.' : 'Cria o teu futuro.'}
      </h2>
      <form className="w-full flex flex-col gap-4" onSubmit={handleAuth}>
        {authMode === 'register' && (
          <div className="panel flex items-center px-6 focus-within:border-blue-500 transition-all">
            <User className="w-5 h-5 opacity-30" />
            <input
              type="text" placeholder="Nome Completo" className="bg-transparent border-none outline-none py-5 px-4 w-full text-sm font-bold"
              required value={authData.name} onChange={e => setAuthData({ ...authData, name: e.target.value })}
            />
          </div>
        )}
        <div className="panel flex items-center px-6 focus-within:border-blue-500 transition-all">
          <Mail className="w-5 h-5 opacity-30" />
          <input
            type="email" placeholder="Endereço Email" className="bg-transparent border-none outline-none py-5 px-4 w-full text-sm font-bold"
            required value={authData.email} onChange={e => setAuthData({ ...authData, email: e.target.value })}
          />
        </div>
        <div className="panel flex items-center px-6 focus-within:border-blue-500 transition-all">
          <Key className="w-5 h-5 opacity-30" />
          <input
            type="password" placeholder="Palavra-passe" className="bg-transparent border-none outline-none py-5 px-4 w-full text-sm font-bold"
            required value={authData.password} onChange={e => setAuthData({ ...authData, password: e.target.value })}
          />
        </div>

        {error && <p className="text-red-500 text-[10px] font-black uppercase text-center">{error}</p>}

        <button type="submit" className="btn-tesla-blue py-5 rounded-lg font-black tracking-widest text-xs mt-4">
          {authMode === 'login' ? 'ENTRAR AGORA' : 'CRIAR CONTA PROFISSIONAL'}
        </button>
      </form>

      <button
        onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        className="mt-8 text-[11px] font-black text-muted hover:text-blue-500 transition-colors uppercase tracking-widest"
      >
        {authMode === 'login' ? 'Não tens conta? Regista-te' : 'Já tens conta? Entra'}
      </button>
    </div>
  );

  const DashboardOverlay = () => (
    <div className="flex flex-col gap-12">
      <div className="flex justify-between items-end border-b border-gray-500/10 pb-10">
        <div>
          <h2 className="text-5xl font-black tracking-tighter mb-2">Painel de Controlo.</h2>
          <p className="text-muted text-sm font-bold">Olá, {user?.name || 'Utilizador'}. Estás no plano <span className="text-blue-500">{user?.subscription}</span>.</p>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-xs font-black text-red-500 bg-red-500/5 px-6 py-3 rounded-lg hover:bg-red-500/10 transition-all">
          <LogOut className="w-4 h-4" /> TERMINAR SESSÃO
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        {/* User Stats & Subscription */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="glass p-8 flex flex-col gap-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 text-main">Subscrição Atual</h4>
            <h3 className="text-3xl font-black text-main">{user?.subscription}</h3>
            <div className="w-full h-1 bg-gray-500/10 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-1/4" />
            </div>
            <p className="text-[10px] font-bold text-muted uppercase">25% do limite diário utilizado</p>
            <button onClick={() => setActiveOverlay('precos')} className="btn-tesla-blue py-4 mt-2 text-[10px] font-black uppercase">Fazer Upgrade</button>
          </div>

          <div className="panel p-8 flex flex-col gap-3">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Segurança</h4>
            <p className="text-xs font-bold text-secondary">Último acesso: {new Date().toLocaleDateString()}</p>
            <button className="text-[10px] font-black text-blue-500 text-left mt-2 hover:underline">Alterar Palavra-passe</button>
          </div>
        </div>

        {/* Files Management */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 text-main mb-2">Arquivos Guardados recentemente</h4>
          {userHistory.length === 0 ? (
            <div className="panel p-20 flex flex-col items-center justify-center opacity-20 border-dashed">
              <FileText className="w-12 h-12 mb-4" />
              <p className="text-xs font-black uppercase tracking-widest">Nenhum arquivo guardado</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 h-[500px] overflow-y-auto custom-scrollbar pr-4">
              {userHistory.map(item => (
                <div key={item._id} className="glass p-6 flex items-center justify-between group">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-gray-500/5 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h5 className="font-black text-sm text-main">{item.fileName}</h5>
                      <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                        {new Date(item.createdAt).toLocaleDateString()} • {(item.fileSize / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setResult(item.extractedText); setActiveOverlay(null); }} className="p-3 bg-gray-500/5 hover:bg-gray-500/10 rounded-lg text-main" title="Ver Texto"><Search className="w-4 h-4" /></button>
                    <button onClick={() => deleteRecord(item._id)} className="p-3 bg-red-500/5 hover:bg-red-500/10 rounded-lg text-red-500" title="Apagar"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const PricingOverlay = () => (
    <div className="flex flex-col items-center">
      <h2 className="text-4xl font-black mb-12 tracking-tighter">Escolha o seu Futuro.</h2>
      <div className="grid md:grid-cols-3 gap-8 w-full">
        {[
          { name: 'LOCAL', price: '$0', sub: '0 MT', features: ['5 Scans por dia', 'Processamento Local', 'Exportar TXT'], btn: 'Plano Grátis' },
          { name: 'HYPER', price: '$19', sub: '1.200 MT', features: ['Scans Ilimitados', 'Sincronização Cloud', 'Motor Prioritário', 'Suporte 24h'], active: true, btn: 'Subscrever' },
          { name: 'NEURAL', price: '$49', sub: '3.100 MT', features: ['Acesso via API', 'Múltiplos Utilizadores', 'Segurança Bancária', 'Painel Admin'], btn: 'Contactar Equipa' }
        ].map((plan) => (
          <div key={plan.name} className={`glass p-10 flex flex-col gap-6 relative ${plan.active ? 'border-blue-500 border-2' : ''}`}>
            <span className="text-xs font-black uppercase tracking-[0.4em] opacity-40">{plan.name}</span>
            <div>
              <h3 className="text-5xl font-black text-main">{plan.price}<span className="text-sm opacity-30 font-bold">/mês</span></h3>
              <p className="text-sm font-bold text-blue-500 mt-1">{plan.sub}</p>
            </div>
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
        <p className="text-muted text-sm leading-loose">O OCRMUV utiliza redes neuronais via WASM para processar documentos diretamente no hardware do utilizador. Zero latência, máxima precisão.</p>
        <div className="flex gap-4">
          {['WASM', 'RE-NEURAL', 'PDF-JS', 'AXIOS-CLOUD'].map(t => <span key={t} className="px-4 py-2 bg-gray-500/5 rounded text-[10px] font-black tracking-widest">{t}</span>)}
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

  return (
    <div className="min-h-screen bg-color flex flex-col transition-all duration-700 font-sans">

      {/* Top Navigation Bar - Tesla Style */}
      <nav className="flex items-center justify-between px-8 py-4 z-[110] bg-color">
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

          <div className="flex gap-2">
            {user ? (
              <button
                onClick={() => setActiveOverlay('dashboard')}
                className="flex items-center gap-3 glass px-4 py-2 hover:bg-gray-500/5 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-black text-white uppercase italic">
                  {user.name?.[0] || 'U'}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-main hidden md:inline">{user.name?.split(' ')[0]}</span>
              </button>
            ) : (
              <button onClick={() => setActiveOverlay('auth')} className="nav-link !flex items-center gap-2">
                <User className="w-4 h-4" /> <span className="hidden md:inline">Entrar</span>
              </button>
            )}
            <button className="p-2 hover:bg-gray-500/10 rounded-lg transition-all hidden md:block"><Globe className="w-5 h-5 text-main" /></button>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[100] ${theme === 'dark' ? 'bg-black/90' : 'bg-white/95'} backdrop-blur-3xl pt-24 px-8 md:px-20 overflow-y-auto custom-scrollbar transition-all duration-500`}
          >
            <div className="max-w-[1400px] mx-auto pb-20">
              <button
                onClick={() => setActiveOverlay(null)}
                className="mb-10 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted hover:text-main transition-colors"
                id="close-overlay"
              >
                <X className="w-4 h-4" /> Fechar Secção
              </button>

              {activeOverlay === 'precos' && <PricingOverlay />}
              {activeOverlay === 'tech' && <TechOverlay />}
              {activeOverlay === 'privacy' && (
                <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-10">
                  <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500"><Lock className="w-10 h-10" /></div>
                  <h2 className="text-5xl font-black tracking-tighter italic text-main">Privacidade é o <br />nosso Standard.</h2>
                  <div className="grid gap-6 text-left w-full mt-10">
                    {[{ t: 'Processamento Local', d: 'Documentos processados em tempo real no browser.' }, { t: 'AES-256 Cloud', d: 'Arquivos sincronizados são cifrados antes do upload.' }, { t: 'Soberania Digital', d: 'Tu controlas quando e o quê apagar.' }].map(p => (
                      <div key={p.t} className="panel p-8"><h4 className="font-black text-lg mb-2 text-main">{p.t}</h4><p className="text-sm text-secondary font-medium">{p.d}</p></div>
                    ))}
                  </div>
                </div>
              )}
              {activeOverlay === 'support' && (
                <div className="text-center py-10">
                  <h2 className="text-5xl font-black tracking-tighter mb-12 text-main">Suporte Prioritário.</h2>
                  <div className="grid md:grid-cols-3 gap-8 w-full max-w-4xl mx-auto mb-12">
                    {[{ icon: <Headphones />, title: 'Chat Pro', desc: 'Atendimento 24/7 para planos Hyper.' }, { icon: <HelpCircle />, title: 'Documentação', desc: 'Aprenda a integrar via API.' }, { icon: <Globe />, title: 'Fórum', desc: 'Dicas de visão computacional.' }].map(s => (
                      <div key={s.title} className="glass p-10 flex flex-col items-center gap-6"><div className="text-blue-500">{s.icon}</div><h4 className="font-black text-sm text-main">{s.title}</h4><p className="text-[10px] text-muted font-bold">{s.desc}</p></div>
                    ))}
                  </div>
                  <button className="btn-tesla-blue px-10 py-5 rounded-full font-black text-xs">CONTACTAR ADMINISTRAÇÃO</button>
                </div>
              )}
              {activeOverlay === 'auth' && <AuthOverlay />}
              {activeOverlay === 'dashboard' && <DashboardOverlay />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main UI (Input/Output) - Identical to Tesla style previously built */}
      <main className="flex-1 flex flex-col px-8 md:px-16 pt-2 pb-8 max-w-[1600px] mx-auto w-full relative">
        <header className="mb-8 text-center md:text-left">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-black text-main tracking-tighter">
            Poder Neural. <span className="text-secondary opacity-50">Privado por Desenho.</span>
          </motion.h1>
        </header>

        <div className="flex-1 grid lg:grid-cols-12 gap-10">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="lg:col-span-12 xl:col-span-5 flex flex-col gap-6">
            <div {...getRootProps()} className={`glass min-h-[400px] flex flex-col items-center justify-center p-12 transition-all duration-300 cursor-pointer ${isDragActive ? 'border-blue-500 border-2 shadow-2xl' : 'hover:border-main/20'}`}>
              <input {...getInputProps()} />
              <div className="w-24 h-24 rounded-3xl bg-gray-500/5 flex items-center justify-center mb-8">
                {file ? <CheckCircle2 className="w-12 h-12 text-blue-500" /> : <Upload className="w-12 h-12 text-main/10" />}
              </div>
              <h2 className="text-2xl font-black text-main mb-2">{file ? file.name : 'Digitalização em Espera'}</h2>
              <p className="text-muted text-[10px] font-black uppercase tracking-[0.4em] text-center">Arraste para o Campo de Foco</p>
            </div>
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={handleProcess} disabled={!file || loading}
              className={`w-full py-5 rounded-lg flex items-center justify-center gap-4 transition-all ${!file || loading ? 'bg-gray-500/10 text-muted cursor-not-allowed' : 'btn-tesla-blue shadow-2xl'}`}>
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /><span className="font-black text-tiny tracking-[0.2em]">{progress}%</span></> : <><Zap className="w-5 h-5" /><span className="font-black text-tiny tracking-[0.2em]">EXECUTAR SCAN</span></>}
            </motion.button>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="lg:col-span-12 xl:col-span-7 glass p-10 flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0 underline-offset-8">
              <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-blue-500" /><h3 className="text-[10px] font-black uppercase tracking-[0.6em] text-main">Terminal Neural</h3></div>
              <div className="flex gap-2">
                {result && <><button onClick={handleCopy} className="p-3 bg-gray-500/5 hover:bg-gray-500/10 rounded-xl text-main"><Copy className="w-4 h-4" /></button></>}
                <button onClick={() => { setResult(''); setFile(null); }} className="p-3 bg-gray-500/5 hover:bg-gray-500/10 rounded-xl text-main"><RefreshCcw className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 panel p-10 overflow-y-auto custom-scrollbar font-mono text-sm leading-relaxed text-main selection:bg-blue-500 selection:text-white">
              {error ? <p className="text-red-500 font-bold">{error}</p> : result ? <pre className="whitespace-pre-wrap">{result}</pre> : loading ? <div className="h-full flex flex-col items-center justify-center gap-6 text-muted font-black uppercase text-[10px] tracking-widest"><Loader2 className="animate-spin w-10 h-10" /> A ler v2.0...</div> : <div className="h-full flex flex-col items-center justify-center opacity-10 text-main font-black uppercase text-[10px] tracking-[0.5em]"><FileText className="w-16 h-16 mb-4" /> Vazio</div>}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Multi-column Footer */}
      <footer className="shrink-0 px-8 py-8 border-t border-gray-500/10 max-w-[1600px] mx-auto w-full opacity-50 hover:opacity-100 transition-opacity">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] font-black text-muted uppercase tracking-widest">
          <p>© 2024 OCRMUV Inc. <span className="mx-4 text-gray-500/20">|</span> Automating Intelligence</p>
          <div className="flex items-center gap-10">
            {['Privacidade', 'Termos', 'Contatos', 'API'].map(link => <button key={link} onClick={() => setActiveOverlay(link === 'Privacidade' ? 'privacy' : 'support')} className="hover:text-blue-500 transition-colors">{link}</button>)}
          </div>
        </div>
      </footer>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} className="fixed inset-0 bg-color z-[200] p-12 flex flex-col">
            <div className="flex justify-end mb-12"><button onClick={() => setIsMenuOpen(false)}><X className="w-10 h-10 text-main" /></button></div>
            {['Início', 'Tecnologia', 'Privacidade', 'Planos', 'Suporte', user ? 'Dashboard' : 'Entrar'].map((item) => (
              <button key={item} className="text-4xl font-black text-main tracking-tighter text-left mb-6" onClick={() => {
                if (item === 'Entrar') setActiveOverlay('auth');
                else if (item === 'Dashboard') setActiveOverlay('dashboard');
                else if (item === 'Início') setActiveOverlay(null);
                else setActiveOverlay(item.toLowerCase());
                setIsMenuOpen(false);
              }}>{item}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
