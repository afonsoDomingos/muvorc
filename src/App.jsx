import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, CheckCircle2, Loader2, Copy, Download,
  RefreshCcw, Search, Sun, Moon, AlertCircle, Sparkles,
  Shield, Zap, Globe, Menu, X, User, HelpCircle, ArrowRight,
  Cpu, Lock, Database, Headphones, Mail, Key, LogOut, Trash2,
  BarChart3, Users, Settings, Activity, Camera, Building2,
  Edit3, Save, ChevronDown, Home, MessageSquare, PieChart, Send
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useDropzone } from 'react-dropzone';
import { processImage, processPdf, warmUp } from './services/OCRService';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { pack, Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart as RechartsPie, Pie, Cell, AreaChart, Area, LineChart, Line, Legend } from 'recharts';

const App = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState('');
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isMainSidebarOpen, setIsMainSidebarOpen] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState('ocr');
  const [isEditing, setIsEditing] = useState(false);
  const [folderName, setFolderName] = useState('Geral');
  // Auth State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ocrmuv_token'));
  const [authMode, setAuthMode] = useState('login');
  const [authData, setAuthData] = useState({ email: '', password: '', name: '', companyName: '' });
  const [userHistory, setUserHistory] = useState([]);
  const [currency, setCurrency] = useState('USD');

  // Admin State
  const [adminStats, setAdminStats] = useState({ totalUsers: 0, totalOCR: 0, pendingPayments: 0, recentOCR: [] });
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminPayments, setAdminPayments] = useState([]);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  const [paymentProofLoading, setPaymentProofLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = React.useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [currentRecordId, setCurrentRecordId] = useState(null);
  const [activeImage, setActiveImage] = useState(null);

  // AI & Analytics State
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiMode, setAiMode] = useState('chat');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const showNotify = (message, type = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev.slice(-2), { id, message, type }]); // Keep only last 3
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const requestConfirm = (title, message, onConfirm) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    warmUp(); // Pré-aquecer motor neural
  }, [theme]);

  useEffect(() => {
    if (token) {
      if (!user) fetchUser();
      if (activeOverlay === 'dashboard') fetchHistory();
      if (activeOverlay === 'admin' && user?.role === 'admin') {
        fetchAdminData();
        fetchAdminPayments();
      }
    }
  }, [token, user, activeOverlay]);

  const fetchUser = async () => {
    try {
      const apiUrl = '/api/auth/me';
      const res = await axios.get(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data);
    } catch (err) {
      logout();
    }
  };

  const fetchHistory = async () => {
    try {
      const apiUrl = '/api/ocr/history';
      const res = await axios.get(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
      setUserHistory(res.data);
    } catch (err) {
      console.error('Erro ao carregar histórico');
    }
  };

  const fetchAdminData = async () => {
    try {
      const baseUrl = '/api/admin';
      const [statsRes, usersRes] = await Promise.all([
        axios.get(`${baseUrl}/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${baseUrl}/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setAdminStats(statsRes.data);
      setAdminUsers(usersRes.data);
    } catch (err) {
      console.error('Erro admin:', err);
    }
  };

  const fetchAdminPayments = async () => {
    try {
      const apiUrl = '/api/admin/payments';
      const res = await axios.get(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
      setAdminPayments(res.data);
    } catch (err) {
      console.error('Erro pagamentos:', err);
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
    if (!token) {
      showNotify('⚠️ Acesso restrito. Inicia sessão para utilizar o poder neural do OCRMUV.', 'error');
      setActiveOverlay('auth');
      return;
    }
    if (!file) return;
    setLoading(true);
    setProgress(0);
    setError(null);
    setCurrentRecordId(null); // Reset when starting new process
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
        colors: theme === 'dark' ? ['#ffffff', '#3d69e1', '#000000'] : ['#3d69e1', '#171a20', '#888888']
      });
    } catch (err) {
      setError('Falha no motor neural. Garante que o ficheiro é legível.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      setLoading(true);
      const apiUrl = currentRecordId ? `/api/ocr/${currentRecordId}` : '/api/ocr/save';
      const method = currentRecordId ? 'put' : 'post';

      // If it's a new scan, we might want to send the image base64
      let imageBase64 = null;
      if (!currentRecordId && file) {
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
      }

      await axios({
        method,
        url: apiUrl,
        data: {
          token,
          fileName: file?.name || 'scan_muv.txt',
          fileSize: file?.size || 0,
          extractedText: result,
          folder: folderName,
          imageBase64
        }
      });

      showNotify(currentRecordId ? 'Arquivo Atualizado!' : `Arquivo Guardado em: ${folderName.toUpperCase()}`);
      if (!currentRecordId) fetchHistory();
    } catch (saveErr) {
      showNotify('Erro ao sincronizar histórico', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(result, 180);
    doc.text(splitText, 15, 20);
    doc.save(`${file?.name || 'DOC'}_muv_export.pdf`);
    showNotify('PDF Gerado com Sucesso');
  };

  const exportToWord = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun(result)],
          }),
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${file?.name || 'DOC'}_muv_export.docx`);
    showNotify('Word DOCX Gerado');
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([[result]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MUV_OCR_DATA");
    XLSX.writeFile(wb, `${file?.name || 'DOC'}_muv_export.xlsx`);
    showNotify('Excel XLSX Gerado');
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !result) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await axios.post('/api/ai/chat', { documentText: result, query: userMsg }, { headers: { Authorization: `Bearer ${token}` } });
      setChatMessages(prev => [...prev, { text: res.data.answer, sender: 'ai' }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { text: 'Erro ao interagir com o motor neural de I.A. Tente novamente.', sender: 'system' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const generateChart = async () => {
    if (!result) return;
    setAiMode('chart');
    if (chartData) return;
    setChartLoading(true);
    try {
      const res = await axios.post('/api/ai/analyze-chart', { documentText: result }, { headers: { Authorization: `Bearer ${token}` } });
      setChartData(res.data);
    } catch (err) {
      showNotify('Erro ao gerar análise financeira visual', 'error');
    } finally {
      setChartLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    const endpoint = authMode === 'login' ? 'login' : 'register';
    const apiUrl = `/api/auth/${endpoint}`;

    // Normalize and trim data
    const payload = {
      ...authData,
      email: authData.email.trim().toLowerCase(),
      password: authData.password.trim()
    };

    try {
      console.log(`[AUTH] Enviando pedido de ${authMode} para: ${apiUrl}`);
      const res = await axios.post(apiUrl, payload);
      console.log(`[AUTH] Resposta recebida:`, res.status);

      if (authMode === 'login') {
        localStorage.setItem('ocrmuv_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        setActiveOverlay(null);
        showNotify('Sessão iniciada com sucesso!');
      } else {
        setAuthMode('login');
        showNotify('Conta criada! Inicia sessão agora.');
      }
    } catch (err) {
      console.error(`[AUTH] Erro no ${authMode}:`, err.response?.data || err.message);
      setError(err.response?.data?.error || 'Erro na autenticação. Verifique os dados.');
    }
  };

  const deleteRecord = async (id) => {
    try {
      const apiUrl = `/api/ocr/${id}`;
      await axios.delete(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
      fetchHistory();
    } catch (err) {
      showNotify('Erro ao apagar', 'error');
    }
  };

  const deleteUser = async (id) => {
    requestConfirm(
      'Apagar Utilizador',
      'Tem a certeza que deseja apagar este utilizador e todos os seus dados? Esta ação é irreversível.',
      async () => {
        try {
          const apiUrl = `/api/admin/user/${id}`;
          await axios.delete(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
          fetchAdminData();
          showNotify('Utilizador removido com sucesso');
        } catch (err) {
          showNotify('Erro ao apagar utilizador', 'error');
        }
      }
    );
  };

  const approvePayment = async (id, status, subscription) => {
    const labels = { approved: 'Aprovado ✓', rejected: 'Rejeitado ✗', suspended: 'Suspenso ⏸' };
    try {
      const apiUrl = `/api/admin/payment/${id}`;
      await axios.patch(apiUrl, { status, subscription }, { headers: { Authorization: `Bearer ${token}` } });
      showNotify(`Pagamento ${labels[status] || status}`);
      fetchAdminData();
      fetchAdminPayments();
    } catch (err) {
      showNotify('Erro ao processar pagamento', 'error');
    }
  };

  const handleUpdateProfile = async (profileData) => {
    try {
      const res = await axios.patch('/api/user/profile', profileData, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data.user);
      showNotify('Perfil atualizado com sucesso!');
    } catch (err) {
      showNotify('Erro ao atualizar perfil', 'error');
    }
  };

  const updateUser = async (id, data) => {
    try {
      const apiUrl = `/api/admin/user/${id}`;
      await axios.patch(apiUrl, data, { headers: { Authorization: `Bearer ${token}` } });
      showNotify('Utilizador atualizado com sucesso');
      fetchAdminData();
    } catch (err) {
      showNotify('Erro ao atualizar utilizador', 'error');
    }
  };

  const handlePasswordChange = async (id) => {
    const newPass = prompt("Insira a nova palavra-passe para este utilizador:");
    if (!newPass) return;
    if (newPass.length < 6) return showNotify('Palavra-passe muito curta (min 6 caracteres)', 'error');

    try {
      await axios.patch(`/api/admin/user/${id}`, { password: newPass }, { headers: { Authorization: `Bearer ${token}` } });
      showNotify('Palavra-passe atualizada com sucesso');
    } catch (err) {
      showNotify('Erro ao atualizar palavra-passe', 'error');
    }
  };

  const handlePaymentUpload = async (plan, amount, curr, fileProof) => {
    if (!token) return setActiveOverlay('auth');
    setPaymentProofLoading(true);
    try {
      const reader = new FileReader();
      const imageBase64 = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(fileProof);
      });

      const apiUrl = import.meta.env.MODE === 'development' ? 'http://127.0.0.1:5000/api/payments/upload' : '/api/payments/upload';
      await axios.post(apiUrl, {
        planName: plan,
        amount,
        currency: curr,
        imageBase64
      }, { headers: { Authorization: `Bearer ${token}` } });

      showNotify('Comprovativo enviado! Aguarde a aprovação.');
      setSelectedPlanForPayment(null);
    } catch (err) {
      showNotify('Erro ao enviar comprovativo', 'error');
    } finally {
      setPaymentProofLoading(false);
    }
  };

  const startCamera = async () => {
    if (!token) {
      showNotify('📸 Inicia sessão para utilizar o Scan Mobile.', 'error');
      setActiveOverlay('auth');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      showNotify('Erro ao aceder à câmara', 'error');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');

    // Convert dataUrl to File object
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const capturedFile = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setFile(capturedFile);
        stopCamera();
        setResult('');
      });
  };

  const exchangeRates = {
    USD: { symbol: '$', rate: 1, suffix: '' },
    EUR: { symbol: '€', rate: 0.92, suffix: '' },
    MZN: { symbol: '', rate: 63.8, suffix: ' MT' }
  };

  const formatPrice = (usdPrice) => {
    const { symbol, rate, suffix } = exchangeRates[currency];
    const converted = usdPrice * rate;
    if (usdPrice === 0) return currency === 'MZN' ? `0 MT` : `${symbol}0`;
    const formatted = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(converted);
    return `${symbol}${formatted}${suffix}`;
  };

  // Overlay Components




  return (
    <div className="min-h-screen bg-color flex flex-col transition-all duration-700 font-sans relative">
      <nav className="flex items-center justify-between px-12 py-8 z-[110] bg-transparent text-main">
        <div className="flex items-center gap-6 cursor-pointer" onClick={() => setActiveOverlay(null)}>
          <span className="font-black text-2xl tracking-tighter text-white">OCRMUV</span>
          <div className="h-4 w-[1px] bg-white/10 hidden md:block" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 hidden md:block">Neural Engine</span>
        </div>

        <div className="hidden lg:flex items-center gap-2">
          {[
            { label: 'Início', key: null },
            { label: 'Tecnologia', key: 'tech' },
            { label: 'Planos', key: 'planos' },
            { label: 'Suporte', key: 'support' }
          ].map(i => (
            <button key={i.label} onClick={() => setActiveOverlay(i.key)} className="nav-link !text-[9px]">{i.label}</button>
          ))}
        </div>

        <div className="flex items-center gap-6">
          <button onClick={toggleTheme} className="p-2.5 hover:bg-white/5 rounded-full transition-all border border-transparent hover:border-white/5">
            {theme === 'dark' ? <Sun className="w-4 h-4 text-white" /> : <Moon className="w-4 h-4 text-white" />}
          </button>

          <div className="h-6 w-[1px] bg-white/10" />

          {user ? (
            <button onClick={() => setActiveOverlay('dashboard')} className="flex items-center gap-4 group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform overflow-hidden border border-blue-500/30">
                {user.companyLogo ? (
                  <img src={user.companyLogo} className="w-full h-full object-cover" alt="User Logo" />
                ) : (
                  user.name?.[0] || 'U'
                )}
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-[10px] font-black uppercase tracking-widest text-white">{user.name?.split(' ')[0]}</span>
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Pro member</span>
              </div>
            </button>
          ) : (
            <button onClick={() => setActiveOverlay('auth')} className="btn-tesla-blue !py-3 !px-6 !rounded-full !text-[9px]">Aceder ao Terminal</button>
          )}
          <button className="p-2 lg:hidden" onClick={() => setIsMenuOpen(true)}><Menu className="w-6 h-6 text-white" /></button>
        </div>
      </nav>

      <AnimatePresence>
        {activeOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[100] ${theme === 'dark' ? 'bg-black/90' : 'bg-white/95'} backdrop-blur-3xl pt-16 px-8 md:px-20 overflow-hidden custom-scrollbar transition-all duration-500 flex flex-col`}
          >
            <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col pb-10">
              <button
                onClick={() => {
                  if (activeOverlay === 'admin') setActiveOverlay('dashboard');
                  else setActiveOverlay(null);
                }}
                className="mb-10 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted hover:text-main"
              >
                <X className="w-4 h-4" /> {activeOverlay === 'admin' ? 'Voltar ao Dashboard' : 'Fechar Secção'}
              </button>

              {activeOverlay === 'auth' && (
                <AuthOverlay
                  authMode={authMode}
                  setAuthMode={setAuthMode}
                  authData={authData}
                  setAuthData={setAuthData}
                  handleAuth={handleAuth}
                  error={error}
                />
              )}
              {activeOverlay === 'dashboard' && (
                <DashboardOverlay
                  user={user}
                  userHistory={userHistory}
                  deleteRecord={deleteRecord}
                  setResult={setResult}
                  setActiveOverlay={setActiveOverlay}
                  logout={logout}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  setActiveImage={setActiveImage}
                  setFolderName={setFolderName}
                  setFile={setFile}
                  setCurrentRecordId={setCurrentRecordId}
                  handleUpdateProfile={handleUpdateProfile}
                />
              )}
              {activeOverlay === 'admin' && (
                <AdminOverlay
                  adminStats={adminStats}
                  adminPayments={adminPayments}
                  adminUsers={adminUsers}
                  approvePayment={approvePayment}
                  deleteUser={deleteUser}
                  updateUser={updateUser}
                  handlePasswordChange={handlePasswordChange}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
              )}
              {activeOverlay === 'planos' && (
                <PlanosOverlay
                  selectedPlanForPayment={selectedPlanForPayment}
                  setSelectedPlanForPayment={setSelectedPlanForPayment}
                  currency={currency}
                  setCurrency={setCurrency}
                  formatPrice={formatPrice}
                  handlePaymentUpload={handlePaymentUpload}
                  paymentProofLoading={paymentProofLoading}
                  token={token}
                  setActiveOverlay={setActiveOverlay}
                />
              )}
              {activeOverlay === 'tech' && <TechOverlay />}
              {activeOverlay === 'privacy' && <PrivacyOverlay />}
              {activeOverlay === 'support' && <SupportOverlay setActiveOverlay={setActiveOverlay} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Collapsible Main Sidebar */}
        <motion.aside
          initial={false}
          animate={{
            width: isMainSidebarOpen ? 280 : 0,
            opacity: isMainSidebarOpen ? 1 : 0,
            marginRight: isMainSidebarOpen ? 24 : 0
          }}
          className="bg-color border-r border-gray-500/10 hidden xl:flex flex-col py-8 overflow-hidden whitespace-nowrap z-[90]"
        >
          <div className="px-8 flex flex-col gap-10">
            {user && (
              <div className="flex flex-col gap-4">
                <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted opacity-30">Administração</h5>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'ocr', icon: <Cpu className="w-4 h-4" />, label: 'Terminal OCR' },
                    { id: 'home', icon: <Activity className="w-4 h-4" />, label: 'Painel Geral' },
                    { id: 'archive', icon: <FileText className="w-4 h-4" />, label: 'Arquivo Digital' },
                    { id: 'team', icon: <Users className="w-4 h-4" />, label: 'Colaboradores' },
                    { id: 'billing', icon: <Key className="w-4 h-4" />, label: 'Faturação' }
                  ].map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setActiveMainTab(item.id);
                        if (item.id !== 'ocr') {
                          setActiveTab(item.id);
                          setActiveOverlay('dashboard');
                        } else {
                          setActiveOverlay(null);
                        }
                      }}
                      className={`flex items-center gap-4 text-xs font-bold p-3 rounded-lg cursor-pointer transition-all ${(item.id === 'ocr' && !activeOverlay) || (activeOverlay === 'dashboard' && activeTab === item.id)
                        ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                        : 'text-main hover:bg-main/5'
                        }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                  {user.role === 'admin' && (
                    <div
                      onClick={() => setActiveOverlay('admin')}
                      className={`flex items-center gap-4 text-xs font-bold p-3 rounded-lg cursor-pointer transition-all ${activeOverlay === 'admin' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'text-main hover:bg-main/5'
                        }`}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Admin Control</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!user && (
              <div className="flex flex-col gap-4">
                <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted opacity-30">Quick Access</h5>
                <div className="flex flex-col gap-2">
                  {[
                    { icon: <Activity className="w-4 h-4" />, label: 'Estado Total' },
                    { icon: <Database className="w-4 h-4" />, label: 'Segurança Local' },
                    { icon: <Globe className="w-4 h-4" />, label: 'Nós Ativos' }
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-4 text-xs font-bold text-main p-2 hover:bg-main/5 rounded-lg cursor-pointer">
                      <span className="text-blue-500">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted opacity-30">Recent Files</h5>
              <div className="flex flex-col gap-3">
                {userHistory.slice(0, 3).map(item => (
                  <div key={item._id} onClick={() => { setResult(item.extractedText); setActiveOverlay(null); showNotify('Arquivo carregado'); }} className="panel p-3 cursor-pointer group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[9px] font-black truncate">{item.fileName}</p>
                        <p className="text-[7px] text-muted uppercase">{(item.fileSize / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto glass p-6 border-blue-500/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-main">Motor Estabilizado</span>
              </div>
              <p className="text-[8px] text-muted leading-relaxed uppercase font-bold">V.2.1 BUILD CORPORATE <br /> ACTIVE NODE ID: MUV77</p>
            </div>
          </div>

        </motion.aside>

        <main className="flex-1 flex flex-col px-8 md:px-16 pt-2 pb-4 max-w-[1600px] mx-auto w-full relative overflow-hidden">

          <AnimatePresence>
            {isCameraActive && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-4">
                <div className="relative w-full max-w-2xl aspect-[3/4] md:aspect-video bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-[2px] border-white/20 m-12 rounded-xl pointer-events-none flex items-center justify-center">
                    <p className="text-white/20 text-[8px] font-black uppercase tracking-[1em] rotate-90 md:rotate-0">Alinhar Documento</p>
                  </div>
                  <button onClick={stopCamera} className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-xl transition-all"><X /></button>
                </div>
                <div className="mt-12 flex items-center gap-10">
                  <button onClick={stopCamera} className="p-4 text-white/40 hover:text-white transition-colors"><X className="w-8 h-8" /></button>
                  <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-95 transition-all p-1">
                    <div className="w-full h-full border-4 border-black rounded-full" />
                  </button>
                  <div className="w-8 h-8 opacity-0" />
                </div>
                <p className="mt-8 text-white/40 text-[10px] font-black uppercase tracking-[0.4em]">Modo Scan Ativo</p>
              </motion.div>
            )}
          </AnimatePresence>

          <header className="mb-8 flex justify-between items-start shrink-0">
            <div className="text-center md:text-left">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl md:text-5xl font-black text-main tracking-tighter leading-tight"
              >
                <Typewriter text="Inteligência Documental" speed={80} iterate={false} />
                <span className="text-secondary opacity-50 italic block md:inline md:ml-3">Corporativa.</span>
              </motion.h1>
              <p className="mt-3 text-muted font-medium text-xs md:text-sm max-w-2xl">
                <Typewriter text="A produtividade da sua empresa elevada por redes neuronais privadas." speed={30} iterate={false} delay={1500} />
              </p>
            </div>
            <button
              onClick={() => setIsMainSidebarOpen(!isMainSidebarOpen)}
              className={`hidden xl:flex items-center gap-3 glass px-6 py-3 border transition-all duration-500 ${isMainSidebarOpen ? 'border-blue-500/40 bg-blue-500/5 text-blue-500' : 'border-main/10 text-muted hover:text-main'}`}
            >
              {isMainSidebarOpen ? <ArrowRight className="w-4 h-4 rotate-180" /> : <Menu className="w-4 h-4" />}
              <span className="text-[9px] font-black uppercase tracking-[0.3em]">{isMainSidebarOpen ? 'Esconder' : 'Menu'}</span>
            </button>
          </header>


          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-8 min-h-0 mb-8 p-1">
            <div className="grid lg:grid-cols-12 gap-8 shrink-0">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`lg:col-span-12 xl:col-span-4 flex flex-col gap-6 min-h-[400px] transition-all`}>
                <div className="flex flex-col gap-6 shrink-0 h-full">
                  <div {...getRootProps()} className={`glass flex-1 flex flex-col items-center justify-center p-12 transition-all duration-500 cursor-pointer relative overflow-hidden group ${isDragActive ? 'border-blue-500 ring-4 ring-blue-500/10' : 'hover:border-blue-500/30'}`}>
                    {/* Decorative Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Scanning Laser Effect when drag active or file selected */}
                    {(isDragActive || file) && (
                      <motion.div
                        initial={{ top: '0%' }}
                        animate={{ top: '100%' }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent z-10 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                      />
                    )}

                    <input {...getInputProps()} />
                    <motion.div
                      animate={file ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                      transition={{ duration: 0.5 }}
                      className="w-24 h-24 rounded-[32px] bg-gray-500/5 flex items-center justify-center mb-8 border border-white/5 shadow-inner transition-transform group-hover:scale-110 duration-500 relative z-20"
                    >
                      {file ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <CheckCircle2 className="w-10 h-10 text-blue-500" />
                        </motion.div>
                      ) : (
                        <Upload className="w-10 h-10 text-white/20 group-hover:text-blue-500 transition-colors" />
                      )}
                    </motion.div>

                    <h2 className="text-2xl font-black text-white mb-2 tracking-tight uppercase relative z-20">
                      {file ? (
                        <Typewriter text={file.name} speed={30} />
                      ) : (
                        'ENVIAR FICHEIRO'
                      )}
                    </h2>
                    <p className="text-blue-500/60 text-[10px] font-black uppercase tracking-[0.4em] mb-4 relative z-20 text-center">
                      {file ? `${(file.size / 1024).toFixed(1)} KB • PRONTO PARA SCAN` : 'PDF • IMAGENS • DOCUMENTOS'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <button
                      onClick={handleProcess}
                      disabled={!file || loading}
                      className={`w-full py-5 rounded-2xl flex items-center justify-center gap-4 transition-all duration-500 ${!file || loading ? 'bg-white/5 text-white/20 border border-white/5' : 'btn-tesla-blue'}`}
                    >
                      {loading ? (
                        <><Loader2 className="animate-spin w-5 h-5" /> <span className="font-black text-xs">{progress}%</span></>
                      ) : (
                        <><Search className="w-5 h-5" /> <span className="text-[11px] font-black tracking-[0.3em] uppercase">INICIAR SCAN</span></>
                      )}
                    </button>

                    <button onClick={startCamera} className="glass py-4 flex items-center justify-center gap-3 hover:bg-blue-500/5 transition-all border border-white/5">
                      <Camera className="w-5 h-5 text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Abrir Câmara</span>
                    </button>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className={`lg:col-span-12 xl:col-span-8 glass p-0 flex flex-col min-h-[400px] overflow-hidden relative transition-all`}>
                <div className="flex justify-between items-center p-8 border-b border-white/5 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white">EXTRACTION PANEL</h3>
                  </div>
                  <div className="flex gap-3">
                    {result && (
                      <>
                        <button
                          onClick={() => setShowAiPanel(!showAiPanel)}
                          className={`p-3 rounded-xl transition-all shadow-xl shadow-blue-500/10 ${showAiPanel ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'} animate-pulse`}
                          title={showAiPanel ? 'Fechar I.A.' : 'Analisar com I.A'}
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setIsEditing(!isEditing)}
                          className={`p-3 rounded-xl transition-all ${isEditing ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}
                          title={isEditing ? 'Guardar Edição' : 'Editar Texto'}
                        >
                          {isEditing ? <CheckCircle2 className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                        </button>

                        <div className="relative group/download">
                          <button className="p-3 bg-white/5 text-white/40 hover:text-white rounded-xl transition-all flex items-center gap-2 group/btn">
                            <Download className="w-4 h-4" />
                            <ChevronDown className="w-3 h-3 opacity-50 group-hover/btn:opacity-100" />
                          </button>
                          <div className="absolute right-0 top-full mt-2 w-48 glass border-white/5 opacity-0 group-hover/download:opacity-100 scale-95 group-hover/download:scale-100 pointer-events-none group-hover/download:pointer-events-auto transition-all z-[100] shadow-2xl bg-[#0a0a0a]">
                            <div onClick={exportToPDF} className="p-4 text-[9px] font-black uppercase tracking-widest hover:bg-blue-500/10 cursor-pointer border-b border-white/5 transition-all text-white/70 hover:text-white">Download PDF</div>
                            <div onClick={exportToWord} className="p-4 text-[9px] font-black uppercase tracking-widest hover:bg-blue-500/10 cursor-pointer border-b border-white/5 transition-all text-white/70 hover:text-white">Download Word</div>
                            <div onClick={exportToExcel} className="p-4 text-[9px] font-black uppercase tracking-widest hover:bg-blue-500/10 cursor-pointer transition-all text-white/70 hover:text-white">Download Excel</div>
                          </div>
                        </div>

                        <button onClick={() => { navigator.clipboard.writeText(result); showNotify('Copiado!'); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all"><Copy className="w-4 h-4" /></button>
                      </>
                    )}
                    <button onClick={() => { setResult(''); setFile(null); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all"><RefreshCcw className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar font-mono text-sm leading-relaxed text-white selection:bg-blue-500/30 bg-[#050505]/40 terminal-glow">
                  {error ? (
                    <div className="h-full flex items-center justify-center text-red-500 gap-3 bg-red-500/5 rounded-2xl border border-red-500/10 p-8">
                      <AlertCircle className="w-6 h-6" />
                      <span className="font-bold">{error}</span>
                    </div>
                  ) : result ? (
                    isEditing ? (
                      <textarea
                        value={result}
                        onChange={(e) => setResult(e.target.value)}
                        className="w-full h-full bg-transparent border-none focus:ring-0 text-white font-mono text-sm leading-relaxed outline-none resize-none custom-scrollbar"
                        spellCheck="false"
                        placeholder="Edite o conteúdo aqui..."
                      />
                    ) : (
                      <Typewriter text={result} speed={2} />
                    )
                  ) : loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-8 py-12">
                      <NeuralProcessor progress={progress} />
                      <div className="flex flex-col items-center gap-2">
                        <span className="font-black uppercase text-[12px] tracking-[0.6em] text-blue-500 animate-pulse">Processamento Neural</span>
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest italic font-mono">
                          Analizando camadas de dados... {progress}%
                        </span>
                      </div>
                      <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-white/5">
                      <div className="mb-6 relative">
                        <FileText className="w-24 h-24" />
                        <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full" />
                      </div>
                      <span className="font-black uppercase text-[12px] tracking-[1em] mb-2">SYSTEM STANDBY</span>
                      <span className="font-bold uppercase text-[8px] tracking-[0.3em] opacity-50">Aguardando entrada de dados neurais</span>
                    </div>
                  )}
                </div>

                {result && (
                  <div className="p-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 bg-black/40">
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                      <span className="text-[8px] font-black text-muted uppercase tracking-widest opacity-40">DESTINO DO ARQUIVO</span>
                      <div className="relative">
                        <select
                          value={folderName}
                          onChange={(e) => setFolderName(e.target.value)}
                          className="w-full md:w-56 bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-[10px] font-black text-white uppercase focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer appearance-none outline-none"
                        >
                          <option value="Geral" className="bg-black">Pasta Geral</option>
                          <option value="Financeiro" className="bg-black">Financeiro</option>
                          <option value="Recibos" className="bg-black">Recibos</option>
                          <option value="Contratos" className="bg-black">Contratos</option>
                          <option value="RH" className="bg-black">Recursos Humanos</option>
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
                      </div>
                    </div>
                    <button onClick={handleSave} className="w-full md:w-auto flex items-center justify-center gap-4 glass px-12 py-4 bg-blue-500 text-white border-blue-600/20 hover:bg-blue-700 transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20">
                      <Save className="w-4 h-4" /> SINCRONIZAR NO ARQUIVO
                    </button>
                  </div>
                )}
              </motion.div>

              <AnimatePresence>
                {showAiPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 40 }}
                    className="lg:col-span-12 glass p-0 flex flex-col min-h-[600px] overflow-hidden relative border-blue-500/30 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] mb-12"
                  >
                    <div className="flex justify-between items-center p-8 border-b border-blue-500/20 shrink-0 bg-blue-500/5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-4 mb-1">
                          <Sparkles className="w-5 h-5 text-blue-500" />
                          <h3 className="text-[12px] font-black uppercase tracking-[0.5em] text-blue-500">MUV NEURAL COMMAND CENTER</h3>
                        </div>
                        <p className="text-[8px] text-muted font-bold uppercase tracking-widest ml-9">Llama 3.1 8B Instruct • Inteligência Analítica Ativa</p>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => setShowAiPanel(false)} className="p-3 glass hover:bg-red-500/20 text-white/50 hover:text-red-500 transition-all border-none">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 min-h-0 bg-[#050505]/60 divide-x divide-white/5">
                      {/* LEFT SIDE: Chat */}
                      <div className="flex flex-col min-h-0 border-r border-white/5 h-full">
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex flex-col gap-6">
                          {chatMessages.length === 0 && (
                            <div className="m-auto py-20 text-center flex flex-col items-center max-w-[200px]">
                              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 relative">
                                <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                                <Sparkles className="w-8 h-8 text-blue-500 relative z-10" />
                              </div>
                              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-main mb-2">Consciência Neural</h4>
                              <p className="text-[9px] font-bold text-muted uppercase tracking-widest leading-relaxed opacity-40">Tire dúvidas sobre o seu documento.</p>
                            </div>
                          )}
                          {chatMessages.map((msg, i) => (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              key={i}
                              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`p-4 rounded-2xl text-xs leading-relaxed max-w-[90%] relative group ${msg.sender === 'user'
                                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none shadow-[0_10px_20px_rgba(37,99,235,0.2)]'
                                  : `glass border ${msg.sender === 'system' ? 'border-red-500/30 text-red-400 bg-red-500/5' : 'border-white/10 text-gray-200 bg-white/5'} rounded-tl-none`
                                }`}>
                                {msg.sender === 'ai' && (
                                  <div className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                                    Neural Agent
                                  </div>
                                )}
                                <Typewriter text={msg.text} speed={5} iterate={false} />
                              </div>
                            </motion.div>
                          ))}
                          {chatLoading && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start">
                              <div className="glass border border-blue-500/30 p-4 rounded-2xl rounded-tl-none flex gap-3 items-center bg-blue-500/5">
                                <div className="flex gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
                                </div>
                                <span className="text-[9px] uppercase tracking-[0.2em] font-black text-blue-500/70">Processando...</span>
                              </div>
                            </motion.div>
                          )}
                          <div ref={chatEndRef} />
                        </div>
                        <div className="p-8 border-t border-white/10 bg-black/40">
                          <div className="relative">
                            <input
                              type="text"
                              value={chatInput}
                              onChange={e => setChatInput(e.target.value)}
                              placeholder="Perguntar algo..."
                              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-6 pr-14 py-4 text-xs text-white"
                            />
                            <button onClick={handleSendMessage} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-500 text-white rounded-xl">
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT SIDE: Charts */}
                      <div className="flex flex-col min-h-0 p-8">
                        <div className="flex justify-between items-center mb-8">
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-500">Análise Visual de Dados</h4>
                          <button onClick={generateChart} disabled={chartLoading} className="px-4 py-2 glass bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-500 hover:text-white transition-all">
                            {chartLoading ? 'Gerando...' : 'Atualizar Gráfico'}
                          </button>
                        </div>

                        {chartData ? (
                          <div className="flex-1 flex flex-col pt-4 h-full">
                            <div className="flex justify-between items-start mb-8">
                              <div>
                                <h4 className="text-[12px] uppercase tracking-widest font-black text-blue-500">{chartData.title || 'Análise de Métrica'}</h4>
                                <p className="text-[8px] text-muted uppercase font-bold mt-1 tracking-tighter">Motor Neural Llama 3.1 • {chartData.type || 'Padrão'}</p>
                              </div>
                              <div className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[8px] font-black text-blue-500 uppercase tracking-widest">LIVE ANALYTICS</div>
                            </div>

                            <div className="flex-1 min-h-[350px] mb-8 relative">
                              <ResponsiveContainer width="100%" height="100%">
                                {chartData.type === 'pie' ? (
                                  <RechartsPie data={chartData.data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5}>
                                    {chartData.data.map((_, i) => <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'][i % 5]} stroke="rgba(255,255,255,0.05)" />)}
                                    <Tooltip contentStyle={{ backgroundColor: '#050505', border: '1px solid #1e3a8a', borderRadius: '16px' }} />
                                  </RechartsPie>
                                ) : chartData.type === 'line' ? (
                                  <LineChart data={chartData.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis dataKey="name" stroke="#ffffff30" fontSize={9} />
                                    <YAxis stroke="#ffffff30" fontSize={9} />
                                    <Tooltip contentStyle={{ backgroundColor: '#050505', border: '1px solid #3b82f6', borderRadius: '16px' }} />
                                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} dot={{ fill: '#3b82f6', r: 5 }} />
                                  </LineChart>
                                ) : chartData.type === 'area' ? (
                                  <AreaChart data={chartData.data}>
                                    <defs>
                                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis dataKey="name" stroke="#ffffff30" fontSize={9} />
                                    <YAxis stroke="#ffffff30" fontSize={9} />
                                    <Tooltip contentStyle={{ backgroundColor: '#050505', border: '1px solid #3b82f6', borderRadius: '16px' }} />
                                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                                  </AreaChart>
                                ) : (
                                  <BarChart data={chartData.data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis dataKey="name" stroke="#ffffff30" fontSize={9} />
                                    <YAxis stroke="#ffffff30" fontSize={9} />
                                    <Tooltip cursor={{ fill: '#ffffff03' }} contentStyle={{ backgroundColor: '#050505', border: '1px solid #3b82f6', borderRadius: '16px' }} />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                      {chartData.data.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#3b82f6' : '#8b5cf6'} />)}
                                    </Bar>
                                  </BarChart>
                                )}
                              </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                              <div className="glass p-6 border-white/5 bg-white/[0.02] rounded-2xl hover:border-blue-500/30 transition-all">
                                <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-2">Neural Avg</p>
                                <p className="text-2xl font-black text-main">{(chartData.data.reduce((a, b) => a + b.value, 0) / chartData.data.length).toFixed(1)}</p>
                              </div>
                              <div className="glass p-6 border-white/5 bg-white/[0.02] rounded-2xl hover:border-blue-500/30 transition-all">
                                <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-2">Pico Neural</p>
                                <p className="text-2xl font-black text-blue-500">{Math.max(...chartData.data.map(d => d.value))}</p>
                              </div>
                              <div className="glass p-6 border-white/5 bg-white/[0.02] rounded-2xl hover:border-blue-500/30 transition-all">
                                <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-2">Volume</p>
                                <p className="text-2xl font-black text-main">{chartData.data.length} <span className="text-[10px] text-muted">pts</span></p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="m-auto text-center opacity-30 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                              <PieChart className="w-8 h-8 text-white" />
                            </div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-2">Matrix Aguardando</h4>
                            <p className="text-[9px] font-bold text-muted uppercase tracking-widest leading-relaxed max-w-[180px]">As métricas serão geradas automaticamente após o processamento.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>

        {/* Right Floating Menu */}
        <div className="fixed right-8 top-1/2 -translate-y-1/2 z-[100] hidden xl:flex flex-col items-center">
          <div className="glass p-2 flex flex-col items-center gap-4 border-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            <button onClick={() => setActiveOverlay(null)} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-blue-500/20 text-blue-500 w-full hover:bg-blue-500/30 transition-all group">
              <Home className="w-4 h-4" />
              <span className="text-[8px] font-black uppercase tracking-tighter">Home</span>
            </button>

            <button onClick={startCamera} title="Digitalizar" className="p-4 rounded-xl text-white/40 hover:bg-white/5 hover:text-white transition-all">
              <Camera className="w-5 h-5" />
            </button>

            <button title="Vídeo Scan" className="p-4 rounded-xl text-white/40 hover:bg-white/5 hover:text-white transition-all">
              <BarChart3 className="w-5 h-5" />
            </button>

            <div className="w-full h-[1px] bg-white/5 my-2" />

            <button onClick={() => setActiveOverlay('dashboard')} className="px-2 py-3 w-full rounded-xl hover:bg-white/5 transition-all flex flex-col items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[8px] font-black uppercase tracking-tighter text-white/40">Manage</span>
            </button>
          </div>
        </div>
      </div >


      <footer className="shrink-0 px-12 py-8 border-t border-white/5 max-w-[1600px] mx-auto w-full opacity-40 hover:opacity-100 transition-opacity flex justify-between items-center gap-6 text-[9px] font-black text-white uppercase tracking-[0.3em]">
        <div className="flex items-center gap-6">
          <span>OCRMUV</span>
          <div className="h-3 w-[1px] bg-white/20" />
          <span>0.1V CORE</span>
        </div>

        <div className="flex items-center gap-12">
          <span>SECURE PIPELINE</span>
          <span>CLIENT-SIDE ONLY</span>
        </div>
      </footer>

      {/* Custom Notification & Confirm Systems */}
      <NotifyContainer notifications={notifications} />
      <ConfirmModal
        settings={confirmModal}
        onClose={() => setConfirmModal({ ...confirmModal, show: false })}
      />
      <AnimatePresence>
        {activeImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveImage(null)}
            className="fixed inset-0 z-[500] bg-black/95 flex items-center justify-center p-10 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="relative max-w-full max-h-full"
            >
              <img src={activeImage} alt="Original document" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
              <button
                className="absolute -top-12 right-0 text-white flex items-center gap-2 text-[10px] font-black uppercase"
                onClick={() => setActiveImage(null)}
              >
                <X className="w-6 h-6" /> Fechar Visualização
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;

const Typewriter = ({ text, speed = 50, delay = 0, iterate = false }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [started, setStarted] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      // For very long text, type multiple characters at once to keep it fast
      const charsToAppend = Math.max(1, Math.floor(text.length / 500));
      const nextText = text.slice(0, i + charsToAppend);
      setDisplayedText(nextText);
      i += charsToAppend;

      if (i >= text.length) {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, started]);

  return (
    <span className="whitespace-pre-wrap relative">
      {displayedText}
      {started && displayedText.length < text.length && (
        <span className="inline-block w-[6px] h-[15px] bg-blue-500 ml-1 animate-pulse" />
      )}
    </span>
  );
};

// --- Beautiful UI Feedback Components ---

const NotifyContainer = ({ notifications }) => (
  <div className="fixed top-10 right-10 z-[300] flex flex-col gap-4 pointer-events-none">
    <AnimatePresence mode="popLayout">
      {notifications.map(n => (
        <motion.div
          key={n.id}
          layout
          initial={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.8, x: 20, transition: { duration: 0.2 } }}
          className={`glass px-8 py-5 flex items-center gap-5 border shadow-2xl min-w-[320px] backdrop-blur-3xl overflow-hidden relative group/notify ${n.type === 'error' ? 'border-red-500/30 bg-red-500/5' : 'border-blue-500/30 bg-blue-500/5'
            }`}
        >
          {/* Animated background glow */}
          <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-[40px] opacity-20 transition-all group-hover/notify:scale-150 ${n.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`} />

          <div className="relative z-10">
            {n.type === 'error' ? (
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/20">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                <Sparkles className="w-5 h-5 text-blue-500" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-main">
              {n.type === 'error' ? 'ALERTA DE SISTEMA' : 'NOTIFICAÇÃO NEURAL'}
            </span>
            <span className="text-[10px] font-bold text-secondary lowercase tracking-wide first-letter:uppercase">
              {n.message}
            </span>
          </div>

          {/* Progress bar timer */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 4, ease: 'linear' }}
            className={`absolute bottom-0 left-0 h-[3px] z-20 ${n.type === 'error' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
              }`}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

const NeuralProcessor = ({ progress }) => {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Outer Rings */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 border-[2px] border-dashed border-blue-500/20 rounded-full"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-4 border-[1px] border-blue-500/10 rounded-full"
      />

      {/* Central Core */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          boxShadow: [
            '0 0 20px rgba(59,130,246,0.2)',
            '0 0 50px rgba(59,130,246,0.4)',
            '0 0 20px rgba(59,130,246,0.2)',
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-20 h-20 rounded-[24px] bg-blue-600/20 border border-blue-500/40 flex items-center justify-center relative z-10 backdrop-blur-md"
      >
        <Cpu className="w-8 h-8 text-blue-500" />

        {/* Progress Text */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-2xl font-black text-white font-mono">{progress}%</span>
        </div>
      </motion.div>

      {/* Orbiting Particles */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <motion.div
          key={i}
          animate={{
            rotate: [deg, deg + 360],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{
            rotate: { duration: 8 - i, repeat: Infinity, ease: 'linear' },
            scale: { duration: 2, repeat: Infinity }
          }}
          className="absolute w-2 h-2 rounded-full bg-blue-400/40 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
          style={{ transformOrigin: 'center center', top: '10%', left: '50%', marginTop: '-4px', marginLeft: '-4px' }}
        />
      ))}
    </div>
  );
};

const ConfirmModal = ({ settings, onClose }) => (
  <AnimatePresence>
    {settings.show && (
      <div className="fixed inset-0 z-[400] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="glass p-8 max-w-sm w-full relative z-[410] border-main/10 border flex flex-col gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tighter text-main">{settings.title}</h3>
              <p className="text-[10px] font-medium text-muted mt-1 uppercase tracking-widest leading-relaxed">{settings.message}</p>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest border border-main/10 rounded hover:bg-main/5 transition-all text-muted"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                settings.onConfirm?.();
                onClose();
              }}
              className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest bg-red-500 text-white rounded hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
            >
              Confirmar
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const Sidebar = ({ items, activeTab, setActiveTab }) => (
  <aside className="w-64 shrink-0 flex flex-col gap-2 border-r border-gray-500/10 pr-8">
    <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted mb-4 opacity-30">Navegação</h5>
    {items.map(item => (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={`flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-300 group ${activeTab === item.id
          ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
          : 'text-muted hover:bg-gray-500/5 hover:text-main'
          }`}
      >
        <div className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
          {item.icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-left">{item.label}</span>
      </button>
    ))}
  </aside>
);


// --- Stable Overlay Components ---

const AuthOverlay = ({ authMode, setAuthMode, authData, setAuthData, handleAuth, error }) => (
  <div className="flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16 flex-1 py-2 max-w-5xl mx-auto w-full h-full overflow-hidden">
    {/* Left Side: Brand & Benefits */}
    <div className="flex flex-col gap-6 flex-1 max-w-md hidden lg:flex">
      <div className="flex flex-col gap-2">
        <h2 className="text-5xl font-black text-main tracking-tighter leading-none">
          {authMode === 'login' ? 'BEM-VINDO DE VOLTA.' : 'JUNTE-SE À ELITE.'}
        </h2>
        <div className="h-1 w-16 bg-blue-500 rounded-full mt-2 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
      </div>

      <p className="text-muted text-[11px] leading-relaxed font-bold uppercase tracking-wider opacity-60">
        Aceda ao motor neural de processamento documental mais avançado do mercado. 100% privado, 100% industrial.
      </p>

      <div className="grid gap-4">
        {[
          { icon: <Shield className="w-4 h-4" />, title: 'Privacy First', desc: 'Dados locais. Zero fugas.' },
          { icon: <Zap className="w-4 h-4" />, title: 'Turbo Neural', desc: 'OCR em milissegundos.' },
          { icon: <Database className="w-4 h-4" />, title: 'Smart Archive', desc: 'Gestão cloud inteligente.' }
        ].map(benefit => (
          <div key={benefit.title} className="flex gap-4 items-center group">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-blue-500 border border-white/5 group-hover:border-blue-500/30 transition-all shadow-xl">
              {benefit.icon}
            </div>
            <div>
              <h4 className="text-[10px] font-black text-main uppercase tracking-widest">{benefit.title}</h4>
              <p className="text-[8px] text-muted font-bold uppercase opacity-50">{benefit.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Right Side: Auth Form */}
    <div className="glass p-6 md:p-10 w-full max-w-md flex flex-col gap-6 border-white/10 border relative overflow-hidden group/form">
      {/* Decorative background scan line */}
      <motion.div
        animate={{ left: ['-100%', '200%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        className="absolute top-0 bottom-0 w-[1px] bg-blue-500/20 z-0 pointer-events-none"
      />

      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" />
          <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.4em]">Protocolo {authMode === 'login' ? '01-LOGIN' : '02-REGISTO'}</span>
        </div>
        <h3 className="text-2xl font-black text-main tracking-tighter uppercase italic leading-none">
          {authMode === 'login' ? 'Terminal de Acesso' : 'Solicitar Credenciais'}
        </h3>
        <p className="text-[8px] font-black text-muted uppercase tracking-[0.4em] mt-1">
          {authMode === 'login' ? 'Insira os seus dados de operador para autenticação' : 'Preencha o formulário para iniciar o protocolo de entrada'}
        </p>
      </div>

      <form onSubmit={handleAuth} className="flex flex-col gap-4 relative z-10">
        {authMode === 'register' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="companyName" className="text-[9px] font-black uppercase tracking-[0.3em] text-muted ml-1">Organização Enterprise</label>
              <div className="relative">
                <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50" />
                <input id="companyName" required type="text" placeholder="NOME DA EMPRESA" className="panel w-full py-3.5 pl-14 pr-6 text-xs font-black uppercase tracking-widest text-main focus:border-blue-500 outline-none transition-all placeholder:text-muted/30" value={authData.companyName} onChange={e => setAuthData({ ...authData, companyName: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="representative" className="text-[9px] font-black uppercase tracking-[0.3em] text-muted ml-1">Identidade do Operador</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50" />
                <input id="representative" required type="text" placeholder="NOME COMPLETO" className="panel w-full py-3.5 pl-14 pr-6 text-xs font-black uppercase tracking-widest text-main focus:border-blue-500 outline-none transition-all placeholder:text-muted/30" value={authData.name} onChange={e => setAuthData({ ...authData, name: e.target.value })} />
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="authEmail" className="text-[9px] font-black uppercase tracking-[0.3em] text-muted ml-1">Canal de Comunicação (Email)</label>
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50" />
            <input id="authEmail" required type="email" placeholder="digite seu email..." className="panel w-full py-3.5 pl-14 pr-6 text-xs font-medium text-main focus:border-blue-500 outline-none transition-all placeholder:text-muted/30" value={authData.email} onChange={e => setAuthData({ ...authData, email: e.target.value })} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="authPassword" className="text-[9px] font-black uppercase tracking-[0.3em] text-muted ml-1">Chave Encriptada</label>
          <div className="relative">
            <Key className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50" />
            <input id="authPassword" required type="password" placeholder="••••••••" className="panel w-full py-3.5 pl-14 pr-6 text-xs font-medium text-main focus:border-blue-500 outline-none transition-all placeholder:text-muted/30" value={authData.password} onChange={e => setAuthData({ ...authData, password: e.target.value })} />
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-[9px] font-black uppercase tracking-widest">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </motion.div>
        )}

        <button type="submit" className="btn-tesla-blue py-4 mt-2 text-[10px] font-black uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(59,130,246,0.25)] hover:shadow-blue-500/40 transition-all active:scale-95 group">
          <span className="flex items-center justify-center gap-3">
            {authMode === 'login' ? 'AUTENTICAR NO SISTEMA' : 'SOLICITAR ACESSO NEURAL'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
      </form>

      <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-[9px] font-black text-muted uppercase tracking-[0.2em] hover:text-blue-500 transition-colors relative z-10 text-center">
        {authMode === 'login' ? 'SOLICITAR ACESSO PARA NOVA ENTIDADE' : 'JÁ POSSUI CREDENCIAIS DE OPERADOR?'}
      </button>
    </div>
  </div>
);

const DashboardOverlay = ({ user, userHistory, deleteRecord, setResult, setActiveOverlay, logout, activeTab, setActiveTab, handleUpdateProfile, setActiveImage, setFolderName, setFile, setCurrentRecordId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFolder, setFilterFolder] = useState('Todos');

  const filteredHistory = userHistory.filter(item => {
    const matchSearch = item.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.extractedText?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFolder = filterFolder === 'Todos' || item.folder === filterFolder;
    return matchSearch && matchFolder;
  });

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', companyName: user?.companyName || '' });
  const [logoPreview, setLogoPreview] = useState(user?.companyLogo || null);
  const [logoFile, setLogoFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const handleLogoSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setLogoFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await handleUpdateProfile({ name: profileForm.name, companyName: profileForm.companyName, logoBase64: logoFile ? logoPreview : undefined });
    } finally {
      setSavingProfile(false);
    }
  };

  const sidebarItems = [
    { id: 'home', label: 'Painel Geral', icon: <Activity className="w-4 h-4" /> },
    { id: 'archive', label: 'Arquivo Digital', icon: <FileText className="w-4 h-4" /> },
    { id: 'team', label: 'Colaboradores', icon: <Users className="w-4 h-4" /> },
    { id: 'billing', label: 'Faturação', icon: <Key className="w-4 h-4" /> },
    { id: 'profile', label: 'Meu Perfil', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="flex gap-12">
      <Sidebar items={sidebarItems} activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="flex justify-between items-end border-b border-gray-500/10 pb-6">
          <div>
            <h2 className="text-3xl font-black tracking-tighter mb-1">{sidebarItems.find(i => i.id === activeTab)?.label}.</h2>
            <p className="text-muted text-[10px] font-bold uppercase tracking-widest">
              Operador: {user?.name || 'Utilizador'}
              {user?.companyName && <span className="opacity-50"> // {user.companyName}</span>}
            </p>
          </div>
          <div className="flex gap-3">
            {user?.role === 'admin' && (
              <button onClick={() => setActiveOverlay('admin')} className="flex items-center gap-2 text-xs font-black text-blue-500 bg-blue-500/5 px-6 py-3 rounded-lg hover:bg-blue-500/10 transition-all border border-blue-500/20">
                <Settings className="w-4 h-4" /> ADMINISTRAÇÃO
              </button>
            )}
            <button onClick={logout} className="flex items-center gap-2 text-xs font-black text-red-500 bg-red-500/5 px-6 py-3 rounded-lg hover:bg-red-500/10 transition-all">
              <LogOut className="w-4 h-4" /> TERMINAR SESSÃO
            </button>
          </div>
        </div>

        {activeTab === 'home' && (
          <div className="grid lg:grid-cols-12 gap-8 flex-1 overflow-hidden">
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="glass p-6 flex flex-col gap-3 border-blue-500/10 border">
                <h4 className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40">Subscrição Atual</h4>
                <h3 className="text-2xl font-black text-main">{user?.subscription}</h3>
                <div className="w-full h-1 bg-gray-500/10 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-1/4" /></div>
                <p className="text-[9px] font-bold text-muted uppercase tracking-tighter">25% do limite diário utilizado</p>
                <button onClick={() => setActiveOverlay('planos')} className="btn-tesla-blue py-3.5 mt-2 text-[10px] font-black uppercase">Fazer Upgrade</button>
              </div>
              <div className="panel p-6 flex flex-col gap-2">
                <h4 className="text-[9px] font-black uppercase tracking-widest opacity-40">Resumo Semanal</h4>
                <p className="text-xs font-bold text-main">12 Documentos Processados</p>
                <p className="text-[8px] text-muted uppercase">Economia de 4.5h de trabalho</p>
              </div>
            </div>
            <div className="lg:col-span-8 grid grid-cols-2 gap-4 h-fit">
              <div onClick={() => setActiveTab('archive')} className="glass p-6 flex flex-col gap-3 hover:border-blue-500/30 transition-all cursor-pointer">
                <Search className="w-5 h-5 text-blue-500" />
                <h4 className="font-black text-xs uppercase italic">Pesquisa Inteligente</h4>
                <p className="text-[9px] text-muted leading-relaxed uppercase tracking-tighter">Procure em todos os seus documentos arquivados usando palavras-chave ou datas.</p>
              </div>
              <div onClick={() => setActiveTab('archive')} className="glass p-6 flex flex-col gap-3 hover:border-blue-500/30 transition-all cursor-pointer">
                <Download className="w-5 h-5 text-blue-500" />
                <h4 className="font-black text-xs uppercase italic">Exportação Batch</h4>
                <p className="text-[9px] text-muted leading-relaxed uppercase tracking-tighter">Exporte os dados extraídos para Excel, CSV ou formatados para o seu ERP.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'archive' && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 text-main">Repositório Neural</h4>
              <div className="flex gap-4">
                <select
                  value={filterFolder}
                  onChange={(e) => setFilterFolder(e.target.value)}
                  className="panel px-4 py-2 text-[10px] font-bold w-40 cursor-pointer appearance-none bg-black/40 text-white"
                >
                  <option value="Todos">Todas as Pastas</option>
                  <option value="Geral">Geral</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Recibos">Recibos</option>
                  <option value="Contratos">Contratos</option>
                  <option value="RH">Recursos Humanos</option>
                </select>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por conteúdo ou nome..."
                  className="panel px-4 py-2 text-[10px] font-bold w-64 text-white"
                />
              </div>
            </div>
            {filteredHistory.length === 0 ? (
              <div className="panel p-20 flex flex-col items-center justify-center opacity-20 border-dashed">
                <FileText className="w-12 h-12 mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">Nenhum registo encontrado</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-4">
                {filteredHistory.map(item => (
                  <div key={item._id} className="glass p-6 flex items-center justify-between group hover:border-blue-500/20 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-gray-500/5 rounded-xl flex items-center justify-center"><FileText className="w-6 h-6 text-blue-500" /></div>
                      <div>
                        <h5 className="font-black text-sm">{item.fileName}</h5>
                        <div className="flex items-center gap-3">
                          <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString()} • {(item.fileSize / 1024).toFixed(0)} KB</p>
                          <span className="text-[8px] font-black bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-sm uppercase">{item.folder || 'Geral'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      {item.imageUrl && (
                        <button
                          onClick={() => setActiveImage(item.imageUrl)}
                          className="p-3 bg-blue-500/5 hover:bg-blue-500/10 rounded-lg text-blue-500"
                          title="Ver Original"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setResult(item.extractedText);
                          setCurrentRecordId(item._id);
                          setFolderName(item.folder || 'Geral');
                          setFile({ name: item.fileName, size: item.fileSize });
                          setActiveOverlay(null);
                        }}
                        className="p-3 bg-gray-500/5 hover:bg-gray-500/10 rounded-lg text-main"
                        title="Abrir e Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteRecord(item._id)} className="p-3 bg-red-500/5 hover:bg-red-500/10 rounded-lg text-red-500" title="Apagar"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 text-main">Gestão de Equipa</h4>
                <p className="text-[10px] text-muted uppercase mt-1">Controle quem tem acesso aos scans da empresa</p>
              </div>
              <button onClick={() => showNotify('Apenas disponível no Plano GLOBAL', 'error')} className="btn-tesla-blue px-6 py-3 text-[10px] font-black uppercase">Adicionar Membro</button>
            </div>

            <div className="glass overflow-hidden border-main/5 flex-1">
              <div className="overflow-y-auto max-h-[calc(100vh-350px)] custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-main/5 text-[9px] font-black uppercase tracking-widest text-muted sticky top-0 bg-black z-10">
                      <th className="px-8 py-4">Colaborador</th>
                      <th className="px-8 py-4">Cargo</th>
                      <th className="px-8 py-4">Acessos</th>
                      <th className="px-8 py-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-main/5">
                    <tr className="text-[11px] font-bold text-main hover:bg-main/5 transition-colors">
                      <td className="px-8 py-4 flex items-center gap-4">
                        <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 text-[10px] overflow-hidden">
                          {user?.companyLogo ? <img src={user.companyLogo} className="w-full h-full object-cover" alt="Logo" /> : user?.name?.[0]}
                        </div>
                        <div>
                          <p>{user?.name} (Você)</p>
                          <p className="text-[8px] text-muted uppercase tracking-tighter opacity-50">{user?.email}</p>
                        </div>
                      </td>
                      <td className="px-8 py-4 opacity-60 uppercase tracking-widest text-[8px]">Representante Legal</td>
                      <td className="px-8 py-4"><span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full text-[8px] uppercase">Acesso Total</span></td>
                      <td className="px-8 py-4 text-muted">---</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="p-6 text-center opacity-30 border-t border-main/5">
                <p className="text-[9px] font-black uppercase tracking-widest italic tracking-[0.2em]">Upgrade necessário para adicionar mais membros</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="flex flex-col gap-10">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="glass p-8 flex flex-col gap-4 border-blue-500/20">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Plano Ativo</h4>
                <div className="flex items-center gap-4">
                  <h3 className="text-4xl font-black text-main uppercase">{user?.subscription}</h3>
                  <div className="px-3 py-1 bg-blue-500 text-white text-[8px] font-black uppercase rounded">ATIVO</div>
                </div>
                <p className="text-xs text-muted leading-relaxed">A sua subscrição renova automaticamente a cada 30 dias. Utilize este painel para gerir recibos e upgrades.</p>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => setActiveOverlay('planos')} className="btn-tesla-blue px-6 py-3 text-[10px] font-black uppercase">Mudar de Plano</button>
                  <button onClick={() => showNotify('Recibos carregados em nova janela')} className="panel px-6 py-3 text-[10px] font-black uppercase hover:bg-main/5">Ver Faturas</button>
                </div>
              </div>

              <div className="panel p-8 flex flex-col gap-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Metas de Consumo</h4>
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-2"><span className="text-muted">Volume de OCR</span> <span className="text-main">1.2k / 10k</span></div>
                    <div className="w-full h-1.5 bg-main/5 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-[12%]" /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-2"><span className="text-muted">Armazenamento Cloud</span> <span className="text-main">45MB / 5GB</span></div>
                    <div className="w-full h-1.5 bg-main/5 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-[5%]" /></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest opacity-30">Histórico de Transações</h4>
              <div className="panel p-20 flex flex-col items-center justify-center opacity-20 border-dashed">
                <Lock className="w-10 h-10 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma transação registada este mês</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="flex flex-col gap-8 max-w-lg">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 text-main mb-1">Identidade da Empresa</h4>
              <p className="text-[10px] text-muted">Atualize o logótipo, nome e representante da sua organização.</p>
            </div>

            {/* Logo Upload */}
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-xl bg-main/5 border-2 border-dashed border-main/20 overflow-hidden flex items-center justify-center flex-shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  : <Building2 className="w-8 h-8 text-muted opacity-30" />}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="logoUpload" className="btn-tesla-blue px-5 py-2.5 text-[10px] font-black uppercase cursor-pointer inline-flex items-center gap-2">
                  <Upload className="w-3 h-3" /> Carregar Logótipo
                </label>
                <input id="logoUpload" type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
                <p className="text-[9px] text-muted">PNG, JPG ou SVG. Máx 2MB.</p>
              </div>
            </div>

            {/* Name & Company fields */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted">Nome do Representante</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50" />
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                    className="panel w-full py-3 pl-12 pr-5 text-sm font-medium text-main focus:border-blue-500 outline-none transition-all"
                    placeholder="O seu nome"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted">Nome da Empresa</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50" />
                  <input
                    type="text"
                    value={profileForm.companyName}
                    onChange={e => setProfileForm(p => ({ ...p, companyName: e.target.value }))}
                    className="panel w-full py-3 pl-12 pr-5 text-sm font-medium text-main focus:border-blue-500 outline-none transition-all"
                    placeholder="Nome da empresa"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="btn-tesla-blue py-3.5 text-[10px] font-black uppercase flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingProfile ? 'A guardar...' : 'Guardar Alterações'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};


const AdminOverlay = ({ adminStats, adminPayments, adminUsers, approvePayment, deleteUser, updateUser, handlePasswordChange, activeTab, setActiveTab }) => {
  const sidebarItems = [
    { id: 'home', label: 'Estatísticas', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'payments', label: 'Verificações', icon: <Shield className="w-4 h-4" /> },
    { id: 'users', label: 'Utilizadores', icon: <Users className="w-4 h-4" /> },
    { id: 'system', label: 'Estado do Motor', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="flex gap-12 pb-20">
      <Sidebar items={sidebarItems} activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col gap-12">
        <div className="flex justify-between items-end border-b border-gray-500/10 pb-10">
          <div>
            <h2 className="text-5xl font-black tracking-tighter mb-2">{sidebarItems.find(i => i.id === activeTab)?.label}.</h2>
            <p className="text-muted text-sm font-bold uppercase tracking-widest text-blue-500">Gestão Global do Sistema OCRMUV</p>
          </div>
        </div>

        {activeTab === 'home' && (
          <>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { icon: <Users />, label: 'Utilizadores', value: adminStats.totalUsers },
                { icon: <Zap />, label: 'Ativos (24h)', value: adminStats.activeUsersCount || 0 },
                { icon: <Activity />, label: 'Scans Totais', value: adminStats.totalOCR },
                { icon: <Shield />, label: 'Estado Motor', value: 'Online' }
              ].map(stat => (
                <div key={stat.label} className="glass p-8 flex flex-col gap-4 transition-all hover:border-blue-500/30">
                  <div className="text-blue-500">{stat.icon}</div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">{stat.label}</h4>
                  <p className="text-3xl font-black">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="panel p-10 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500"><Activity className="w-6 h-6" /></div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest">Atividade Recente do Servidor</h4>
                  <p className="text-[10px] text-muted uppercase mt-1">Nível de ocupação: 14% • Tempo de Resposta: 45ms</p>
                </div>
              </div>
              <button className="btn-tesla-blue px-8 py-3 text-[10px] font-black uppercase">Ver Logs Totais</button>
            </div>
          </>
        )}

        {activeTab === 'payments' && (
          <div className="flex flex-col gap-6">
            {/* Summary counters */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Pendentes', count: adminPayments.filter(p => p.status === 'pending').length, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                { label: 'Aprovados', count: adminPayments.filter(p => p.status === 'approved').length, color: 'text-green-400', bg: 'bg-green-400/10' },
                { label: 'Rejeitados / Suspensos', count: adminPayments.filter(p => p.status === 'rejected' || p.status === 'suspended').length, color: 'text-red-400', bg: 'bg-red-400/10' },
              ].map(stat => (
                <div key={stat.label} className={`panel p-4 flex flex-col gap-1 ${stat.bg} border-0`}>
                  <span className={`text-2xl font-black ${stat.color}`}>{stat.count}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted">{stat.label}</span>
                </div>
              ))}
            </div>

            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 text-main">Todos os Pagamentos</h4>
            <div className="grid lg:grid-cols-2 gap-4 max-h-[800px] overflow-y-auto custom-scrollbar pr-4">
              {adminPayments.length === 0 && (
                <div className="panel p-20 flex flex-col items-center justify-center opacity-20 border-dashed w-full lg:col-span-2">
                  <Activity className="w-10 h-10 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sem pagamentos registados</p>
                </div>
              )}
              {adminPayments.map(p => {
                const statusStyles = {
                  pending: { label: 'PENDENTE', cls: 'text-yellow-400 bg-yellow-400/10' },
                  approved: { label: 'APROVADO', cls: 'text-green-400 bg-green-400/10' },
                  rejected: { label: 'REJEITADO', cls: 'text-red-400 bg-red-400/10' },
                  suspended: { label: 'SUSPENSO', cls: 'text-orange-400 bg-orange-400/10' },
                };
                const s = statusStyles[p.status] || statusStyles.pending;
                return (
                  <div key={p._id} className="glass p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-black text-sm">{p.userId?.name || 'Utilizador'}</h5>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.cls}`}>{s.label}</span>
                        </div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{p.userId?.email} • {p.planName}</p>
                        <p className="text-sm font-black text-blue-500 mt-1">{p.amount} {p.currency}</p>
                      </div>
                    </div>
                    {p.proofUrl && (
                      <a href={p.proofUrl} target="_blank" rel="noreferrer" className="block w-full h-32 rounded-lg bg-gray-500/5 border border-gray-500/10 overflow-hidden relative group">
                        <img src={p.proofUrl} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-all" alt="Comprovativo" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/40 text-[10px] font-black uppercase tracking-widest text-white">Ver Comprovativo</div>
                      </a>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => approvePayment(p._id, 'approved', p.planName)}
                        disabled={p.status === 'approved'}
                        title="Aprovar"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[9px] font-black uppercase rounded-lg text-green-400 bg-green-400/5 hover:bg-green-400/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                      </button>
                      <button
                        onClick={() => approvePayment(p._id, 'suspended')}
                        disabled={p.status === 'suspended'}
                        title="Suspender"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[9px] font-black uppercase rounded-lg text-orange-400 bg-orange-400/5 hover:bg-orange-400/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Shield className="w-3.5 h-3.5" /> Suspender
                      </button>
                      <button
                        onClick={() => approvePayment(p._id, 'rejected')}
                        disabled={p.status === 'rejected'}
                        title="Rejeitar"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[9px] font-black uppercase rounded-lg text-red-400 bg-red-400/5 hover:bg-red-400/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <X className="w-3.5 h-3.5" /> Rejeitar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="flex flex-col gap-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-2 text-main">Base de Utilizadores Registados</h4>
            <div className="grid gap-4 max-h-[1000px] overflow-y-auto custom-scrollbar pr-4">
              {adminUsers.map(u => (
                <div key={u._id} className="glass p-6 flex items-center justify-between hover:border-blue-500/20 transition-all gap-8">
                  <div className="flex items-center gap-4 flex-1 min-w-[150px]">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-black overflow-hidden shrink-0 border border-blue-500/20">
                      {u.companyLogo ? <img src={u.companyLogo} className="w-full h-full object-cover" alt="Logo" /> : (u.name?.[0] || 'U')}
                    </div>
                    <div>
                      <h5 className="font-black text-sm">{u.name || 'Sem Nome'}</h5>
                      <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{u.email}</p>
                      {u.companyName && <p className="text-[8px] font-black text-blue-500 uppercase mt-1">{u.companyName}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black uppercase opacity-40">Cargo</span>
                      <select
                        value={u.role}
                        onChange={(e) => updateUser(u._id, { role: e.target.value })}
                        className="bg-black/20 dark:bg-white/5 border border-main/10 rounded px-3 py-1.5 text-[10px] font-black text-main focus:border-blue-500 outline-none cursor-pointer"
                      >
                        <option value="user" className="text-black bg-white dark:text-white dark:bg-black">Utilizador</option>
                        <option value="admin" className="text-black bg-white dark:text-white dark:bg-black">Administrador</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black uppercase opacity-40">Plano Ativo</span>
                      <select
                        value={u.subscription}
                        onChange={(e) => updateUser(u._id, { subscription: e.target.value })}
                        className="bg-black/20 dark:bg-white/5 border border-main/10 rounded px-3 py-1.5 text-[10px] font-black text-main focus:border-blue-500 outline-none cursor-pointer"
                      >
                        <option value="LOCAL" className="text-black bg-white dark:text-white dark:bg-black">LOCAL</option>
                        <option value="HYPER" className="text-black bg-white dark:text-white dark:bg-black">HYPER</option>
                        <option value="NEURAL" className="text-black bg-white dark:text-white dark:bg-black">NEURAL</option>
                        <option value="GLOBAL NEURAL" className="text-black bg-white dark:text-white dark:bg-black">GLOBAL NEURAL</option>
                      </select>
                    </div>

                    {u.email !== 'admin@ocrmuv.com' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePasswordChange(u._id)}
                          className="p-3 text-blue-500 bg-blue-500/5 hover:bg-blue-500/10 rounded-lg transition-all self-end"
                          title="Alterar Senha"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteUser(u._id)}
                          className="p-3 text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-all self-end"
                          title="Apagar Utilizador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="panel p-20 flex flex-col items-center justify-center opacity-20 border-dashed italic">
            <Cpu className="w-12 h-12 mb-4" />
            <h4 className="text-sm font-black uppercase">Monitorização em Tempo Real</h4>
            <p className="text-[10px] uppercase mt-2">Versão do motor: Tesseract WASM 5.1.0 • PDF.js 4.10</p>
          </div>
        )}
      </div>
    </div>
  );
};


const PlanosOverlay = ({ selectedPlanForPayment, setSelectedPlanForPayment, currency, setCurrency, formatPrice, handlePaymentUpload, paymentProofLoading, token, setActiveOverlay }) => (
  <div className="flex flex-col items-center">
    <h2 className="text-4xl font-black mb-6 tracking-tighter text-main">Escolha o seu Futuro.</h2>

    {selectedPlanForPayment ? (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass p-12 max-w-xl w-full flex flex-col gap-8 border-blue-500/30 border">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black text-main underline underline-offset-8 decoration-blue-500">Pagamento {selectedPlanForPayment.name}</h3>
          <button onClick={() => setSelectedPlanForPayment(null)} className="p-2 hover:bg-gray-500/5 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <div className="panel p-8 flex flex-col gap-6 bg-blue-500/5 border-blue-500/10">
          <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]" /><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Dados Bancários para Upload</p></div>
          <div className="grid gap-4">
            <div className="flex justify-between text-xs font-bold border-b border-gray-500/5 pb-2"><span className="text-muted">Banco</span> <span className="text-main">Millennium Bim</span></div>
            <div className="flex justify-between text-xs font-bold border-b border-gray-500/5 pb-2"><span className="text-muted">Titular</span> <span className="text-main italic font-black">MUV DIGITAL Lda</span></div>
            <div className="flex justify-between text-xs font-bold border-b border-gray-500/5 pb-2"><span className="text-muted">NIB</span> <span className="text-main font-mono text-blue-500">0033 0000 1234 5678 9012 3</span></div>
            <div className="flex justify-between text-xs font-bold pt-2"><span className="text-muted">Total a Pagar</span> <span className="text-2xl font-black text-main">{formatPrice(selectedPlanForPayment.usd)}</span></div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted ml-2">Anexar Comprovativo de Pagamento</label>
          <input
            type="file"
            id="payment-upload"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files[0];
              if (f) handlePaymentUpload(selectedPlanForPayment.name, formatPrice(selectedPlanForPayment.usd), currency, f);
            }}
          />
          <label htmlFor="payment-upload" className={`cursor-pointer group glass border-2 border-dashed border-gray-500/20 hover:border-blue-500/40 p-10 flex flex-col items-center gap-5 transition-all duration-300 ${paymentProofLoading ? 'pointer-events-none opacity-50' : ''}`}>
            {paymentProofLoading ? <Loader2 className="animate-spin w-10 h-10 text-blue-500" /> : <Upload className="w-10 h-10 text-muted group-hover:text-blue-500 transition-colors" />}
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-main mb-1">{paymentProofLoading ? 'A CARREGAR SISTEMA...' : 'CLICAR PARA CARREGAR FOTO'}</p>
              <p className="text-[8px] font-bold text-muted uppercase tracking-widest">PNG, JPG ou JPEG até 5MB</p>
            </div>
          </label>
        </div>
      </motion.div>
    ) : (
      <>
        <div className="flex glass p-1 gap-1 mb-12 rounded-full overflow-hidden">
          {['USD', 'EUR', 'MZN'].map(c => <button key={c} onClick={() => setCurrency(c)} className={`px-6 py-2 text-[10px] font-black tracking-widest transition-all rounded-full ${currency === c ? 'bg-blue-500 text-white' : 'hover:bg-main/5 text-muted'}`}>{c}</button>)}
        </div>
        <div className="grid md:grid-cols-3 gap-8 w-full">
          {[
            { name: 'BUSINESS', usd: 0, features: ['5 Scans / Colaborador', 'Gestão de Arquivos', 'Exportação Padrão'], btn: 'Começar Grátis' },
            { name: 'ENTERPRISE HYPER', usd: 19, features: ['Volume Ilimitado', 'Sincronização Multi-Sede', 'Segurança AES-256', 'Suporte Prioritário'], active: true, btn: 'Adquirir Licença' },
            { name: 'GLOBAL NEURAL', usd: 49, features: ['Acesso via API Enterprise', 'Usuários Ilimitados', 'SLA de 99.9%', 'Painel Admin Avançado'], btn: 'Contactar Equipa' }
          ].map(plan => (
            <div key={plan.name} className={`glass p-10 flex flex-col gap-6 relative ${plan.active ? 'border-blue-500 border-2 shadow-2xl' : ''}`}>
              <span className="text-xs font-black uppercase tracking-[0.4em] opacity-40 text-main">{plan.name}</span>
              <div><h3 className="text-5xl font-black text-main">{formatPrice(plan.usd)}<span className="text-sm opacity-30 font-bold">/mês</span></h3><p className="text-[10px] font-bold text-muted mt-2 uppercase tracking-widest">Cobrado anualmente</p></div>
              <ul className="flex flex-col gap-4 flex-1">{plan.features.map(f => <li key={f} className="text-xs font-bold text-secondary flex items-center gap-2"><ArrowRight className="w-3 h-3 text-blue-500" /> {f}</li>)}</ul>
              <button
                onClick={() => {
                  if (plan.usd === 0) return;
                  if (!token) return setActiveOverlay('auth');
                  setSelectedPlanForPayment(plan);
                }}
                className={`w-full py-4 font-black tracking-widest text-[10px] uppercase rounded transition-all active:scale-95 ${plan.active ? 'btn-tesla-blue shadow-lg hover:shadow-blue-500/20' : 'panel hover:bg-main/5'}`}
              >
                {plan.btn}
              </button>
            </div>
          ))}
        </div>
      </>
    )}
  </div>
);

const TechOverlay = () => (
  <div className="grid md:grid-cols-2 gap-20">
    <div className="flex flex-col gap-10">
      <h2 className="text-5xl font-black tracking-tighter text-main">Tecnologia de <br />Próxima Geração.</h2>
      <p className="text-muted text-sm leading-loose">Software local-first que utiliza visão computacional via browser. A nossa arquitetura utiliza Tesseract.js sob WebAssembly, garantindo que nenhum documento sensível saia da infraestrutura da sua empresa.</p>
    </div>
    <div className="grid grid-cols-2 gap-6">
      {[{ icon: <Cpu />, title: 'Motor WASM' }, { icon: <Database />, title: 'Local-First' }, { icon: <Shield />, title: 'AES-256' }, { icon: <Globe />, title: 'Distribuído' }].map(item => (
        <div key={item.title} className="glass p-6"><div className="text-blue-500 mb-4">{item.icon}</div><h4 className="font-black text-sm text-main">{item.title}</h4></div>
      ))}
    </div>
  </div>
);

const PrivacyOverlay = () => (
  <div className="max-w-3xl mx-auto flex flex-col gap-12">
    <div className="text-center">
      <h2 className="text-5xl font-black tracking-tighter text-main mb-4">Privacidade Enterprise.</h2>
      <p className="text-muted text-sm font-bold uppercase tracking-widest text-blue-500">O seu dado nunca sai do browser.</p>
    </div>
    <div className="grid gap-8">
      <div className="glass p-10 flex flex-col gap-4">
        <h3 className="text-xl font-black text-main">Segurança por Desenho</h3>
        <p className="text-muted text-sm leading-relaxed">Ao contrário de soluções cloud tradicionais, o OCRMUV processa o reconhecimento de texto diretamente no hardware do utilizador. Isto elimina riscos de intermediação de dados e fugas de informação.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="panel p-8"><h4 className="font-black text-blue-500 text-[10px] uppercase mb-4 tracking-widest">Sem Logs de Dados</h4><p className="text-xs text-secondary font-medium">Não armazenamos o conteúdo dos seus documentos. As estatísticas são meramente metadados de volume e performance.</p></div>
        <div className="panel p-8"><h4 className="font-black text-blue-500 text-[10px] uppercase mb-4 tracking-widest">Conformidade GDPR/LGPD</h4><p className="text-xs text-secondary font-medium">Arquitetura totalmente compatível com as normas internacionais de proteção de dados e privacidade corporativa.</p></div>
      </div>
    </div>
  </div>
);

const SupportOverlay = ({ setActiveOverlay }) => (
  <div className="max-w-4xl mx-auto flex flex-col gap-12">
    <div className="flex flex-col gap-4">
      <h2 className="text-5xl font-black tracking-tighter text-main">Suporte Prioritário.</h2>
      <p className="text-muted text-sm font-medium">A nossa equipa de engenharia está disponível para integrar o OCRMUV no seu fluxo de trabalho corporativo.</p>
    </div>
    <div className="grid md:grid-cols-3 gap-6">
      <div className="glass p-8 flex flex-col gap-6">
        <Mail className="text-blue-500 w-8 h-8" />
        <div><h4 className="font-black text-sm text-main">Email Industrial</h4><p className="text-[10px] font-bold text-muted mt-1 uppercase tracking-widest">enterprise@ocrmuv.com</p></div>
        <button className="btn-tesla-blue py-3 text-[10px] font-black uppercase">Enviar Ticket</button>
      </div>
      <div className="glass p-8 flex flex-col gap-6">
        <Headphones className="text-blue-500 w-8 h-8" />
        <div><h4 className="font-black text-sm text-main">Linha Direta</h4><p className="text-[10px] font-bold text-muted mt-1 uppercase tracking-widest">+258 84 000 0000</p></div>
        <button className="panel py-3 text-[10px] font-black uppercase hover:bg-main/5">Ligar Agora</button>
      </div>
      <div className="glass p-8 flex flex-col gap-6 border-blue-500/20">
        <HelpCircle className="text-blue-500 w-8 h-8" />
        <div><h4 className="font-black text-sm text-main">Centro de Ajuda</h4><p className="text-[10px] font-bold text-muted mt-1 uppercase tracking-widest">Documentação API</p></div>
        <button className="panel py-3 text-[10px] font-black uppercase hover:bg-main/5">Ver Docs</button>
      </div>
    </div>
  </div>
);
