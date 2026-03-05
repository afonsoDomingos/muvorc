# OCRMUV - OCR SaaS Professional

**OCRMUV** é uma aplicação SaaS de alto desempenho para extração de texto (OCR) de imagens e documentos PDF. Construída com um foco absoluto em privacidade e performance, todo o processamento é realizado diretamente no navegador do utilizador, garantindo que nenhum documento sensível saia da máquina local.

## ✨ Funcionalidades

- **OCR de PDF e Imagens**: Suporte completo para ficheiros PDF (incluindo múltiplas páginas), PNG, JPG e JPEG.
- **Privacidade Total**: Processamento 100% client-side utilizando `Tesseract.js` e `PDF.js`.
- **Interface Dual-Mode**: Alternância suave entre **Modo Escuro (Noir)** e **Modo Claro (Minimalista)**.
- **Design de Alta Performance**: UI otimizada para produtividade, com layout fixo e zero scrolling.
- **Exportação Rápida**: Opções para copiar texto para a área de transferência ou descarregar como ficheiro `.txt`.
- **Feedback Neural**: Indicadores de progresso em tempo real com estética técnica e moderna.

## 🚀 Tecnologias

- **Frontend**: React.js + Vite
- **Estilização**: Tailwind CSS + Framer Motion (Animações)
- **Motor OCR**: Tesseract.js
- **Processamento de PDF**: PDF.js (Mozilla)
- **Ícones**: Lucide React

## 📦 Como Executar Localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/afonsoDomingos/muvorc.git
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## 🌐 Deploy na Vercel

O projecto está configurado para deploy imediato na Vercel.

1. Conecte o seu GitHub à conta da Vercel.
2. Selecione o repositório `muvorc`.
3. Utilize as configurações padrão de Vite:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

---
Desenvolvido por **Afosno Domingos** | 2024
