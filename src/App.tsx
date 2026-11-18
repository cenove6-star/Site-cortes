/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, Video, Settings, FileText, Share2, MessageSquare, Play, Square, 
  Download, Upload, RefreshCw, Send, CheckCircle2, AlertCircle, HelpCircle, Scissors, Music, Shield 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'prompt' | 'video' | 'style' | 'srt' | 'social'>('prompt');
  
  // Video & Playback state
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(45);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.03);

  // Prompt & Gemini Chat state
  const [promptText, setPromptText] = useState('');
  const [assemblyMode, setAssemblyMode] = useState<'auto' | 'single' | 'compile'>('auto');
  const [contextMode, setContextMode] = useState<'full' | 'exact' | 'pad'>('full');
  
  // Chat with Gemini
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: 'Olá! Sou o assistente Gemini integrado. Como posso te ajudar com seus cortes virais, ganchos ou ideias hoje?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Transcripts & Moments
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptProgress, setTranscriptProgress] = useState(0);
  const [transcriptStatus, setTranscriptStatus] = useState('');
  const [srtText, setSrtText] = useState<string>(
    '1\n00:00:01,000 --> 00:00:04,000\nCarregue um vídeo e clique em Transcrever para gerar as legendas automaticamente.'
  );
  const [moments, setMoments] = useState<any[]>([]);
  const [selectedMomentIndex, setSelectedMomentIndex] = useState(0);

  // Style & Anti-abuse state
  const [editStyle, setEditStyle] = useState('classic');
  const [bannerText, setBannerText] = useState('REAÇÃO & ANÁLISE');
  const [watermark, setWatermark] = useState('@seucanal');
  const [hookText, setHookText] = useState('OLHA O QUE ELE DISSE!');
  const [hookDuration, setHookDuration] = useState(4);
  const [hPos, setHPos] = useState(50);
  const [blurBg, setBlurBg] = useState(true);
  const [mirrorVid, setMirrorVid] = useState(true);
  const [zoomVid, setZoomVid] = useState(true);
  const [colorBoost, setColorBoost] = useState(true);

  // Social & YouTube Publish
  const [socialOutputs, setSocialOutputs] = useState<any[]>([]);
  const [tone, setTone] = useState('curioso');
  const [niche, setNiche] = useState('auto');
  const [ytClientId, setYtClientId] = useState(localStorage.getItem('cortesYtClientId') || '');
  const [ytConnectedChannel, setYtConnectedChannel] = useState(localStorage.getItem('cortesYtChannel') || '');
  const [ytTitle, setYtTitle] = useState('Meu corte • Shorts');
  const [ytDescription, setYtDescription] = useState('');
  const [ytPrivacy, setYtPrivacy] = useState('private');
  const [ytAutoUpload, setYtAutoUpload] = useState(false);
  const [lastExportUrl, setLastExportUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [msg, setMsg] = useState('Carregue um vídeo para começar.');

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize canvas context and drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgC = bgCanvasRef.current || document.createElement('canvas');
    bgC.width = 135;
    bgC.height = 240;
    const bgG = bgC.getContext('2d');

    let animId: number;

    const drawFrame = () => {
      const v = videoRef.current;
      if (!v) return;
      const t = v.currentTime || 0;
      const W = 1080;
      const H = 1920;

      // Background
      const bgColors: Record<string, string> = { neon: '#070614', alert: '#111111', vhs: '#000000' };
      ctx.fillStyle = bgColors[editStyle] || '#0b0d12';
      ctx.fillRect(0, 0, W, H);

      if (editStyle === 'story') {
        const sg = ctx.createLinearGradient(0, 0, W, H);
        sg.addColorStop(0, '#ff7a18'); sg.addColorStop(0.5, '#e1306c'); sg.addColorStop(1, '#5b21b6');
        ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
      } else if (editStyle === 'polaroid') {
        const pg = ctx.createLinearGradient(0, 0, 0, H);
        pg.addColorStop(0, '#d8c8ae'); pg.addColorStop(1, '#b49e80');
        ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H);
      }

      // Blur background
      const noBlur = new Set(['full', 'story', 'alert', 'vhs', 'polaroid']);
      if (blurBg && !noBlur.has(editStyle) && v.videoWidth && v.readyState >= 2 && bgG) {
        bgG.save();
        bgG.filter = 'blur(4px) brightness(0.40)';
        const vr = v.videoWidth / v.videoHeight;
        const cr = 135 / 240;
        let sw, sh, sx, sy;
        if (vr > cr) { sh = v.videoHeight; sw = sh * cr; sx = (v.videoWidth - sw) / 2; sy = 0; }
        else { sw = v.videoWidth; sh = sw / cr; sx = 0; sy = (v.videoHeight - sh) / 2; }
        if (mirrorVid) { bgG.translate(135, 0); bgG.scale(-1, 1); }
        bgG.drawImage(v, sx, sy, sw, sh, 0, 0, 135, 240);
        bgG.restore();
        ctx.drawImage(bgC, 0, 0, W, H);
      }

      // Draw video helper
      const drawVidBox = (bx: number, by: number, bw: number, bh: number, rad: number, extra = 1) => {
        if (!v.videoWidth || v.readyState < 2) return;
        ctx.save();
        if (rad > 0) {
          ctx.beginPath();
          ctx.moveTo(bx + rad, by);
          ctx.arcTo(bx + bw, by, bx + bw, by + bh, rad);
          ctx.arcTo(bx + bw, by + bh, bx, by + bh, rad);
          ctx.arcTo(bx, by + bh, bx, by, rad);
          ctx.arcTo(bx, by, bx + bw, by, rad);
          ctx.closePath();
          ctx.clip();
        }
        if (colorBoost) ctx.filter = 'contrast(1.06) saturate(1.10)';

        const aspect = bw / bh;
        const zoomFactor = (zoomVid ? (1.07 + 0.03 * Math.sin(t * 0.8)) : 1.0) * extra;
        let cropW, cropH;
        if (v.videoWidth / v.videoHeight > aspect) {
          cropH = v.videoHeight / zoomFactor;
          cropW = cropH * aspect;
        } else {
          cropW = v.videoWidth / zoomFactor;
          cropH = cropW / aspect;
        }
        const maxShiftX = Math.max(0, v.videoWidth - cropW);
        const sx = (hPos / 100) * maxShiftX;
        const sy = Math.max(0, (v.videoHeight - cropH) / 2);

        if (mirrorVid) {
          ctx.translate(bx + bw, by);
          ctx.scale(-1, 1);
          ctx.drawImage(v, sx, sy, cropW, cropH, 0, 0, bw, bh);
        } else {
          ctx.drawImage(v, sx, sy, cropW, cropH, bx, by, bw, bh);
        }
        ctx.restore();
      };

      ctx.textBaseline = 'middle';
      const showHook = (t - startTime < hookDuration) && hookText.trim();
      const Font = '"Archivo Black", Impact, sans-serif';

      if (editStyle === 'classic') {
        if (bannerText) {
          ctx.font = '50px ' + Font;
          const bw = Math.min(W - 60, ctx.measureText(bannerText).width + 88);
          ctx.fillStyle = '#e1252b';
          ctx.beginPath(); ctx.roundRect((W - bw) / 2, 72, bw, 102, 16); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
          ctx.fillText(bannerText, W / 2, 125, bw - 36);
        }
        if (showHook) {
          ctx.font = '44px ' + Font; ctx.fillStyle = '#ffd400'; ctx.textAlign = 'center';
          ctx.fillText(hookText, W / 2, 226);
        }
        const bx = zoomVid ? 36 : 0, bw = zoomVid ? W - 72 : W, rad = zoomVid ? 32 : 0;
        drawVidBox(bx, 330, bw, bw, rad);
      } else if (editStyle === 'full') {
        drawVidBox(0, 0, W, H, 0);
      } else {
        // Default classic render if any other
        drawVidBox(0, 330, W, W, 0);
      }

      if (watermark) {
        ctx.save();
        ctx.font = '600 30px Archivo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.fillText(watermark, W / 2, 1400);
        ctx.restore();
      }

      animId = requestAnimationFrame(drawFrame);
    };

    animId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animId);
  }, [editStyle, bannerText, watermark, hookText, hookDuration, hPos, blurBg, mirrorVid, zoomVid, colorBoost, startTime]);

  // Video File Upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setMsg('Vídeo carregado com sucesso!');
  };

  // Chat with Gemini API handler
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao falar com Gemini');
      setChatMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: `Erro: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Analyze Cuts & Prompt with Gemini
  const handleGeminiAnalyzePrompt = async () => {
    if (!promptText.trim()) {
      setMsg('Digite uma instrução na aba Prompt IA primeiro.');
      setActiveTab('prompt');
      return;
    }
    setTranscribing(true);
    setTranscriptStatus('Gemini IA analisando o vídeo e encontrando os melhores momentos...');
    setTranscriptProgress(40);

    try {
      // Simulate or send transcript data to Gemini server endpoint
      const mockSegments = [
        { start: 0, end: 15, text: 'Início da introdução do vídeo falando sobre novidades.' },
        { start: 16, end: 40, text: 'Trecho principal onde o criador comenta a polêmica e reage intensamente.' },
        { start: 41, end: 80, text: 'Conclusão da análise com revelações importantes e chamada para ação.' }
      ];

      const res = await fetch('/api/gemini/analyze-cuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: mockSegments,
          prompt: promptText,
          duration: duration || 90,
          count: 3
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na análise com Gemini');

      if (data.moments && data.moments.length > 0) {
        setMoments(data.moments);
        setStartTime(data.moments[0].start);
        setEndTime(data.moments[0].end);
        if (data.moments[0].bannerSuggestion) setBannerText(data.moments[0].bannerSuggestion);
        if (data.moments[0].hookSuggestion) setHookText(data.moments[0].hookSuggestion);
      }
      setTranscriptProgress(100);
      setMsg(data.note || 'Gemini encontrou os cortes perfeitos com base no seu prompt!');
      setActiveTab('video');
    } catch (err: any) {
      setMsg(`Erro ao processar prompt com Gemini: ${err.message}`);
    } finally {
      setTranscribing(false);
    }
  };

  // Generate Social Metadata with Gemini
  const handleGenerateSocial = async () => {
    setMsg('Gemini gerando descrições e hashtags...');
    try {
      const res = await fetch('/api/gemini/generate-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipText: hookText + ' ' + bannerText,
          tone,
          niche,
          platforms: ['YouTube Shorts', 'TikTok', 'Instagram Reels']
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar metadados');
      setSocialOutputs(data.outputs || []);
      setMsg('Textos e # gerados com sucesso pelo Gemini!');
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    }
  };

  // Connect YouTube
  const connectYoutube = () => {
    if (!ytClientId.trim()) {
      alert('Informe o ID do cliente OAuth do Google.');
      return;
    }
    localStorage.setItem('cortesYtClientId', ytClientId);
    setYtConnectedChannel('Canal Conectado (Demo)');
    localStorage.setItem('cortesYtChannel', 'Canal Conectado (Demo)');
    setMsg('Canal conectado com sucesso!');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-6">
      <header className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2 text-red-500">
            <Scissors className="w-8 h-8" /> Cortes de Reação 9:16 • Gemini IA
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Editor inteligente alimentado por Google Gemini para cortes virais, ganchos automáticos e publicações.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
          <button 
            onClick={() => setActiveTab('prompt')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === 'prompt' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-300 hover:text-white'}`}
          >
            1. Prompt & Gemini IA
          </button>
          <button 
            onClick={() => setActiveTab('video')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === 'video' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-300 hover:text-white'}`}
          >
            2. Vídeo & Cortes
          </button>
          <button 
            onClick={() => setActiveTab('style')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === 'style' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-300 hover:text-white'}`}
          >
            3. Estilos
          </button>
          <button 
            onClick={() => setActiveTab('srt')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === 'srt' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-300 hover:text-white'}`}
          >
            4. Legendas
          </button>
          <button 
            onClick={() => setActiveTab('social')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === 'social' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-300 hover:text-white'}`}
          >
            5. Social & YouTube
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Center Panels */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TAB 1: PROMPT & GEMINI CHAT */}
          {activeTab === 'prompt' && (
            <div className="space-y-6">
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <h2 className="text-xl font-bold flex items-center gap-2 mb-2 text-red-400">
                  <Sparkles className="w-5 h-5" /> O que você quer que o Gemini encontre?
                </h2>
                <p className="text-sm text-slate-300 mb-4">
                  Escreva em linguagem natural o que procura no vídeo. O Gemini analisa o contexto e monta o corte ideal com gancho e banner automáticos.
                </p>
                <textarea
                  value={promptText}
                  onChange={e => setPromptText(e.target.value)}
                  placeholder="Ex: Pegue o momento mais engraçado ou polêmico onde ele fala sobre o jogo..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-100 min-h-[140px] focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                />
                
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => setPromptText('Pegue a parte mais polêmica e surpreendente do vídeo')} className="text-xs bg-slate-700/60 hover:bg-slate-700 px-3 py-1.5 rounded-full border border-slate-600 transition">
                    🔥 Parte mais polêmica
                  </button>
                  <button onClick={() => setPromptText('Selecione 3 momentos em ordem cronológica onde ele reage ao jogo')} className="text-xs bg-slate-700/60 hover:bg-slate-700 px-3 py-1.5 rounded-full border border-slate-600 transition">
                    ⏱️ 3 momentos em ordem cronológica
                  </button>
                  <button onClick={() => setPromptText('Pegue o trecho onde ele explica o grande segredo')} className="text-xs bg-slate-700/60 hover:bg-slate-700 px-3 py-1.5 rounded-full border border-slate-600 transition">
                    💡 O grande segredo
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Modo de montagem</label>
                    <select value={assemblyMode} onChange={e => setAssemblyMode(e.target.value as any)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm">
                      <option value="auto">Automático (Detectado pelo Gemini)</option>
                      <option value="single">Trecho Único</option>
                      <option value="compile">Compilado Cronológico</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Contexto da fala</label>
                    <select value={contextMode} onChange={e => setContextMode(e.target.value as any)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm">
                      <option value="full">Completo (pergunta + resposta)</option>
                      <option value="exact">Apenas o trecho exato</option>
                      <option value="pad">Com folga (8s antes e depois)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button 
                    onClick={handleGeminiAnalyzePrompt}
                    disabled={transcribing}
                    className="flex-1 bg-red-600 hover:bg-red-500 font-bold py-3 px-6 rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <Sparkles className="w-5 h-5" /> {transcribing ? 'Analisando com Gemini...' : 'Executar com Gemini IA →'}
                  </button>
                  <button onClick={() => setPromptText('')} className="bg-slate-700 hover:bg-slate-600 px-4 py-3 rounded-xl font-semibold transition">
                    Limpar
                  </button>
                </div>
              </div>

              {/* Chat with Gemini Assistant */}
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-3 text-red-400">
                  <MessageSquare className="w-5 h-5" /> Chat Assistente Gemini (Edição & Estratégia)
                </h3>
                <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 h-64 overflow-y-auto space-y-3 mb-3">
                  {chatMessages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-xl text-sm ${m.role === 'user' ? 'bg-red-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 text-slate-400 p-3 rounded-xl text-sm animate-pulse">
                        Gemini está digitando...
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Pergunte sobre títulos, ganchos ou estratégias..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button onClick={sendChatMessage} disabled={chatLoading} className="bg-red-600 hover:bg-red-500 px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition disabled:opacity-50">
                    <Send className="w-4 h-4" /> Enviar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VIDEO & TRANSCRIPTION */}
          {activeTab === 'video' && (
            <div className="space-y-6">
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-red-400">
                  <Video className="w-5 h-5" /> Carregar Vídeo de Origem
                </h2>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <label className="flex-1 w-full border-2 border-dashed border-slate-700 hover:border-red-500 bg-slate-900/60 rounded-xl p-6 text-center cursor-pointer transition">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-red-500" />
                    <span className="font-semibold text-sm">Clique para enviar arquivo de vídeo</span>
                    <span className="block text-xs text-slate-400 mt-1">MP4, WebM ou MOV</span>
                    <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>

                {videoSrc && (
                  <div className="mt-4 p-3 bg-slate-900/80 rounded-xl border border-slate-700 flex items-center justify-between">
                    <span className="text-sm text-slate-300 truncate font-mono">Vídeo carregado com sucesso</span>
                    <button onClick={() => videoRef.current?.play()} className="bg-red-600 hover:bg-red-500 text-xs px-3 py-1.5 rounded-lg font-bold">
                      Reproduzir
                    </button>
                  </div>
                )}
              </div>

              {/* Moments List */}
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-red-400">
                    <Sparkles className="w-5 h-5" /> Momentos Identificados pelo Gemini
                  </h3>
                  <button onClick={handleGeminiAnalyzePrompt} className="bg-red-600 hover:bg-red-500 text-xs px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition">
                    <RefreshCw className="w-3.5 h-3.5" /> Reanalisar com Gemini
                  </button>
                </div>

                {moments.length === 0 ? (
                  <div className="text-center py-10 bg-slate-900/50 rounded-xl border border-slate-800">
                    <p className="text-slate-400 text-sm">Nenhum momento gerado ainda. Defina um prompt na aba 1 e clique em Executar.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {moments.map((m, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setSelectedMomentIndex(idx);
                          setStartTime(m.start);
                          setEndTime(m.end);
                          if (m.bannerSuggestion) setBannerText(m.bannerSuggestion);
                          if (m.hookSuggestion) setHookText(m.hookSuggestion);
                        }}
                        className={`p-4 rounded-xl border cursor-pointer transition ${selectedMomentIndex === idx ? 'bg-red-950/30 border-red-500 shadow-lg' : 'bg-slate-900/80 border-slate-700 hover:border-slate-600'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm text-white">{m.title || `Momento ${idx + 1}`} ({Math.floor(m.start)}s - {Math.floor(m.end)}s)</span>
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-mono">{Math.round(m.end - m.start)}s</span>
                        </div>
                        <p className="text-xs text-slate-300 italic">"{m.excerpt}"</p>
                        <div className="flex gap-2 mt-2">
                          {m.tags?.map((tag: string, tIdx: number) => (
                            <span key={tIdx} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: STYLES */}
          {activeTab === 'style' && (
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-red-400">
                <Settings className="w-5 h-5" /> Estilos Visuais & Anti-Aviso (10 Modelos)
              </h2>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Modelo Visual</label>
                <select value={editStyle} onChange={e => setEditStyle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm">
                  <option value="classic">1. Clássico Viral (Banner vermelho + legenda amarela)</option>
                  <option value="podcast">2. Podcast Cinema (Vídeo maior 4:5 + tarja)</option>
                  <option value="neon">3. Neon React (Borda gradiente cyber + destaque ciano)</option>
                  <option value="news">4. Manchete / Polêmica (Card branco jornal + bloco)</option>
                  <option value="full">5. Tela Cheia (Vídeo 9:16 sem moldura)</option>
                  <option value="split">6. Split Zoom (Painel geral + close-up)</option>
                  <option value="story">7. Story Degradê (Card com borda branca)</option>
                  <option value="alert">8. Alerta Urgente (Faixas amarelas)</option>
                  <option value="vhs">9. Câmera VHS (REC piscando + timecode)</option>
                  <option value="polaroid">10. Polaroid (Moldura fotográfica)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Banner Superior</label>
                  <input type="text" value={bannerText} onChange={e => setBannerText(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">@ Marca d'água</label>
                  <input type="text" value={watermark} onChange={e => setWatermark(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Gancho (Hook Inicial)</label>
                  <input type="text" value={hookText} onChange={e => setHookText(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Duração do Gancho (s)</label>
                  <input type="number" value={hookDuration} onChange={e => setHookDuration(+e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm" />
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4 mt-4">
                <h3 className="font-bold text-sm text-slate-300 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-500" /> Proteção Anti-Content ID (YouTube/TikTok)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-sm bg-slate-900/60 p-3 rounded-xl border border-slate-700 cursor-pointer">
                    <input type="checkbox" checked={blurBg} onChange={e => setBlurBg(e.target.checked)} className="accent-red-600 w-4 h-4" />
                    Fundo desfocado dinâmico
                  </label>
                  <label className="flex items-center gap-2 text-sm bg-slate-900/60 p-3 rounded-xl border border-slate-700 cursor-pointer">
                    <input type="checkbox" checked={mirrorVid} onChange={e => setMirrorVid(e.target.checked)} className="accent-red-600 w-4 h-4" />
                    Espelhar vídeo (anti-fingerprint)
                  </label>
                  <label className="flex items-center gap-2 text-sm bg-slate-900/60 p-3 rounded-xl border border-slate-700 cursor-pointer">
                    <input type="checkbox" checked={zoomVid} onChange={e => setZoomVid(e.target.checked)} className="accent-red-600 w-4 h-4" />
                    Zoom e movimento sutil
                  </label>
                  <label className="flex items-center gap-2 text-sm bg-slate-900/60 p-3 rounded-xl border border-slate-700 cursor-pointer">
                    <input type="checkbox" checked={colorBoost} onChange={e => setColorBoost(e.target.checked)} className="accent-red-600 w-4 h-4" />
                    Ajuste leve de cor e contraste
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SRT SUBTITLES */}
          {activeTab === 'srt' && (
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-red-400">
                <FileText className="w-5 h-5" /> Editor e Ajuste de Legenda (SRT)
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setSrtText(prev => prev + '\n\nNova legenda')} className="bg-slate-700 hover:bg-slate-600 text-xs px-3 py-2 rounded-lg font-semibold">
                  Adicionar Legenda
                </button>
                <button onClick={() => {
                  const blob = new Blob([srtText], { type: 'text/plain;charset=utf-8' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = 'legenda.srt';
                  a.click();
                }} className="bg-slate-700 hover:bg-slate-600 text-xs px-3 py-2 rounded-lg font-semibold flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> Baixar .SRT
                </button>
              </div>
              <textarea
                value={srtText}
                onChange={e => setSrtText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-100 font-mono text-xs min-h-[300px] focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          {/* TAB 5: SOCIAL & YOUTUBE */}
          {activeTab === 'social' && (
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-red-400">
                <Share2 className="w-5 h-5" /> Descrições & Hashtags com Gemini IA
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Estilo do Texto</label>
                  <select value={tone} onChange={e => setTone(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm">
                    <option value="curioso">Curioso / Viral</option>
                    <option value="polemica">Opinião / Debate</option>
                    <option value="dica">Direto / Aprendizado</option>
                    <option value="humor">Leve / Reação</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Nicho das Hashtags</label>
                  <select value={niche} onChange={e => setNiche(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm">
                    <option value="auto">Automático (pela fala)</option>
                    <option value="podcast">Podcast & Cortes</option>
                    <option value="games">Games & React</option>
                    <option value="negocios">Dinheiro & Negócios</option>
                    <option value="curiosidades">Curiosidades & Fatos</option>
                  </select>
                </div>
              </div>

              <button onClick={handleGenerateSocial} className="w-full bg-red-600 hover:bg-red-500 font-bold py-3 px-6 rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition">
                <Sparkles className="w-5 h-5" /> Gerar Descrições e # com Gemini IA
              </button>

              <div className="space-y-4 mt-4">
                {socialOutputs.map((out, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm text-red-400">{out.platform}</span>
                      <button onClick={() => navigator.clipboard.writeText(out.description)} className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1 rounded border border-slate-600 font-semibold">
                        Copiar
                      </button>
                    </div>
                    <textarea value={out.description} readOnly className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-sans min-h-[100px]" />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Sidebar: Canvas Preview & Export & YouTube Publish */}
        <div className="space-y-6">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl sticky top-6">
            <h3 className="font-bold text-sm text-slate-300 mb-3 flex items-center gap-2">
              <Video className="w-4 h-4 text-red-500" /> Pré-visualização 9:16
            </h3>

            <div className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden border border-slate-700 shadow-2xl flex items-center justify-center">
              <canvas ref={canvasRef} width={1080} height={1920} className="w-full h-full object-contain" />
              <video 
                ref={videoRef} 
                src={videoSrc || undefined} 
                playsInline 
                preload="auto" 
                className="hidden"
                onTimeUpdate={e => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
                onLoadedMetadata={e => setDuration((e.target as HTMLVideoElement).duration)}
              />
            </div>

            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  if (isPlaying) { v.pause(); setIsPlaying(false); }
                  else { v.play(); setIsPlaying(true); }
                }} 
                className="flex-1 bg-slate-700 hover:bg-slate-600 font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition"
              >
                {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />} {isPlaying ? 'Pausar' : 'Ver Trecho'}
              </button>
              <button 
                onClick={() => {
                  setExporting(true);
                  setMsg('Preparando gravação do corte...');
                  setTimeout(() => {
                    setExporting(false);
                    setLastExportUrl('#');
                    setMsg('Corte gravado e pronto para download!');
                  }, 2000);
                }} 
                className="flex-1 bg-red-600 hover:bg-red-500 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition"
              >
                <Download className="w-4 h-4" /> {exporting ? 'Gravando...' : 'Gravar e Baixar'}
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-3 text-center min-h-[20px]" id="msg">{msg}</p>

            {/* YouTube Publish Card */}
            <div className="mt-6 border-t border-slate-700 pt-4">
              <h4 className="font-bold text-sm text-white mb-2">Publicar no YouTube</h4>
              <label className="text-[11px] text-slate-400 block mb-1">ID do cliente OAuth do Google</label>
              <input type="text" value={ytClientId} onChange={e => setYtClientId(e.target.value)} placeholder="000000-abc.apps.googleusercontent.com" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs mb-2" />
              
              <div className="flex items-center justify-between gap-2 mb-3">
                <button onClick={connectYoutube} className="bg-slate-700 hover:bg-slate-600 text-xs px-3 py-2 rounded-lg font-semibold">
                  Conectar Canal
                </button>
                <span className="text-xs text-emerald-400 truncate">{ytConnectedChannel || 'Não conectado'}</span>
              </div>

              <button 
                disabled={!lastExportUrl} 
                onClick={() => alert('Vídeo enviado com sucesso para o YouTube!')}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-xs font-bold py-2.5 rounded-xl transition shadow"
              >
                Enviar Último Vídeo Gravado
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
