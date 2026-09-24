import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Radio,
  Sparkles,
  Send,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  Package,
  Activity,
  PhoneCall,
  PhoneOff,
} from 'lucide-react';
import { PurchaseOrder } from '../types';
import { LiveAudioPlayer, LiveMicRecorder } from '../utils/audioStream';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: PurchaseOrder[];
  userEmail?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
}

const PREBUILT_VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

const SUGGESTED_PROMPTS = [
  'When does my download link expire?',
  'What is my license key for my purchase?',
  'How does the webhook verify HMAC tokens?',
  'How do I setup 2FA for my account?',
  'What digital asset formats are supported?',
];

export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  isOpen,
  onClose,
  orders,
  userEmail,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isGeminiSpeaking, setIsGeminiSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [audioLevel, setAudioLevel] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [statusMessage, setStatusMessage] = useState('Ready to connect');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const recorderRef = useRef<LiveMicRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentGeminiMsgRef = useRef<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentGeminiMsgRef.current]);

  // Clean up when modal closes
  useEffect(() => {
    if (!isOpen) {
      disconnect();
    }
  }, [isOpen]);

  const disconnect = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsMicActive(false);
    setIsGeminiSpeaking(false);
    setAudioLevel(0);
    setStatusMessage('Disconnected');
  };

  const startVoiceSession = async () => {
    setErrorText(null);
    setIsConnecting(true);
    setStatusMessage('Connecting to Gemini 3.8 Live...');

    try {
      // Determine WebSocket URL (ws:// or wss://)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Initialize audio player
      const player = new LiveAudioPlayer((isPlaying) => {
        setIsGeminiSpeaking(isPlaying);
      });
      playerRef.current = player;
      await player.resume();

      // Initialize mic recorder
      const recorder = new LiveMicRecorder();
      recorderRef.current = recorder;

      ws.onopen = () => {
        console.log('[VoiceChat] WebSocket connection open');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'ready' || data.type === 'status') {
            setIsConnecting(false);
            setIsConnected(true);
            setStatusMessage('Connected to Gemini 3.8 Live. Start speaking!');

            // Send contextual prompt with the user's active orders
            const orderSummary = orders
              .map(
                (o) =>
                  `Order #${o.orderId}: ${o.productTitle} ($${o.amount}), Key: ${o.licenseKey || 'N/A'}, Status: ${o.status}, Expires: ${o.downloadExpiresAt}`
              )
              .join('; ');

            ws.send(
              JSON.stringify({
                action: 'context',
                text: `Active buyer: ${userEmail || 'ouqbah@gmail.com'}. Current digital purchases: [${orderSummary || 'No purchases yet'}]. Please address questions about their assets or digital delivery platform with this knowledge.`,
              })
            );

            // Add system greeting to messages
            setMessages((prev) => [
              ...prev,
              {
                id: `msg_${Date.now()}`,
                sender: 'gemini',
                text: "Hello! I'm your OmniVault Voice Concierge powered by Gemini 3.8 Live. I can help with your digital orders, expiring download links, license keys, and security settings. How can I assist you?",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);

            // Start microphone streaming
            startRecording(ws, recorder);
          } else if (data.type === 'audio') {
            if (!isMuted && playerRef.current) {
              playerRef.current.playChunk(data.audio);
            }
          } else if (data.type === 'text') {
            // Streaming text response from model
            currentGeminiMsgRef.current += data.text;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.sender === 'gemini') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: last.text + data.text },
                ];
              } else {
                return [
                  ...prev,
                  {
                    id: `gemini_${Date.now()}`,
                    sender: 'gemini',
                    text: data.text,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ];
              }
            });
          } else if (data.type === 'interrupted') {
            // Barge-in: user started speaking while Gemini was playing audio
            playerRef.current?.stopAll();
            setIsGeminiSpeaking(false);
            setStatusMessage('Listening to you...');
          } else if (data.type === 'turnComplete') {
            setIsGeminiSpeaking(false);
            currentGeminiMsgRef.current = '';
          } else if (data.type === 'error') {
            setErrorText(data.error);
            setStatusMessage('Error encountered');
          }
        } catch (err) {
          console.error('[VoiceChat] Message parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[VoiceChat] WebSocket error:', err);
        setErrorText('Connection error. Please verify the server is running.');
        setIsConnecting(false);
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        setIsMicActive(false);
        setIsGeminiSpeaking(false);
        setStatusMessage('Session closed');
      };
    } catch (err: any) {
      console.error('[VoiceChat] Startup error:', err);
      setErrorText(err?.message || 'Could not start voice session');
      setIsConnecting(false);
    }
  };

  const startRecording = async (ws: WebSocket, recorder: LiveMicRecorder) => {
    try {
      await recorder.start(
        (base64Pcm) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ audio: base64Pcm }));
          }
        },
        (level) => {
          setAudioLevel(level);
        }
      );
      setIsMicActive(true);
      setStatusMessage('Listening...');
    } catch (err: any) {
      console.error('[VoiceChat] Mic access error:', err);
      setErrorText(
        'Microphone permission was denied. Please allow microphone access to talk in real-time.'
      );
      setIsMicActive(false);
    }
  };

  const toggleMic = async () => {
    if (!recorderRef.current || !wsRef.current) return;

    if (isMicActive) {
      recorderRef.current.stop();
      setIsMicActive(false);
      setAudioLevel(0);
      setStatusMessage('Microphone muted');
    } else {
      await startRecording(wsRef.current, recorderRef.current);
    }
  };

  const handleSendText = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Add user message to conversation list
    setMessages((prev) => [
      ...prev,
      {
        id: `user_${Date.now()}`,
        sender: 'user',
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    wsRef.current.send(JSON.stringify({ text: text.trim() }));
    if (!textToSend) {
      setInputText('');
    }
    setStatusMessage('Gemini 3.8 Live is thinking...');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl h-[90vh] max-h-[800px] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-cyan-950/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/30 text-white">
              <Radio className="w-5 h-5 animate-pulse" />
              {isConnected && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900 shadow" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  OmniVault Voice Concierge
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  gemini-3.8-live
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? isGeminiSpeaking
                        ? 'bg-cyan-400 animate-ping'
                        : isMicActive
                        ? 'bg-emerald-400 animate-pulse'
                        : 'bg-emerald-500'
                      : isConnecting
                      ? 'bg-amber-400 animate-bounce'
                      : 'bg-slate-600'
                  }`}
                />
                {statusMessage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice select */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs text-slate-300">
              <span className="text-slate-400">Voice:</span>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                disabled={isConnected}
                className="bg-transparent text-cyan-300 font-medium focus:outline-none cursor-pointer"
              >
                {PREBUILT_VOICES.map((v) => (
                  <option key={v} value={v} className="bg-slate-900 text-white">
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Mute output toggle */}
            {isConnected && (
              <button
                onClick={() => {
                  if (playerRef.current && !isMuted) {
                    playerRef.current.stopAll();
                  }
                  setIsMuted(!isMuted);
                }}
                className={`p-2 rounded-lg text-xs font-medium border transition-colors ${
                  isMuted
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title={isMuted ? 'Unmute Audio' : 'Mute Audio Output'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorText && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center justify-between">
            <span>{errorText}</span>
            <button
              onClick={() => setErrorText(null)}
              className="text-red-400 hover:text-red-200 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Visualizer & Connection Hero Area */}
        <div className="relative p-5 border-b border-slate-800/80 bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center">
          {/* Audio Visualizer Circle */}
          <div className="relative flex items-center justify-center my-3">
            {/* Outer pulsating wave rings */}
            {isConnected && (
              <>
                <div
                  className={`absolute w-36 h-36 rounded-full transition-all duration-300 pointer-events-none ${
                    isGeminiSpeaking
                      ? 'bg-cyan-500/20 animate-ping'
                      : isMicActive && audioLevel > 15
                      ? 'bg-emerald-500/25 animate-pulse scale-110'
                      : 'bg-blue-500/10'
                  }`}
                  style={{
                    transform: `scale(${1 + (audioLevel / 100) * 0.4})`,
                  }}
                />
                <div
                  className={`absolute w-28 h-28 rounded-full border border-dashed transition-all duration-200 pointer-events-none ${
                    isGeminiSpeaking
                      ? 'border-cyan-400 animate-spin'
                      : 'border-slate-700'
                  }`}
                />
              </>
            )}

            {/* Main Action Button */}
            {!isConnected ? (
              <button
                onClick={startVoiceSession}
                disabled={isConnecting}
                className="group relative z-10 flex flex-col items-center justify-center w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-xl shadow-cyan-600/30 hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
              >
                {isConnecting ? (
                  <RefreshCw className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    <PhoneCall className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold mt-1 tracking-wide">START</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-4 z-10">
                {/* Mic toggle */}
                <button
                  onClick={toggleMic}
                  className={`flex flex-col items-center justify-center w-20 h-20 rounded-full text-white shadow-lg transition-all active:scale-95 ${
                    isMicActive
                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-600/30'
                      : 'bg-slate-800 border border-slate-700 text-slate-400'
                  }`}
                >
                  {isMicActive ? (
                    <>
                      <Mic className="w-7 h-7 animate-pulse" />
                      <span className="text-[10px] font-semibold mt-1">MIC ON</span>
                    </>
                  ) : (
                    <>
                      <MicOff className="w-7 h-7" />
                      <span className="text-[10px] font-semibold mt-1">MUTED</span>
                    </>
                  )}
                </button>

                {/* End call button */}
                <button
                  onClick={disconnect}
                  className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-red-600/90 text-white shadow-lg shadow-red-600/25 hover:bg-red-500 transition-all active:scale-95"
                  title="Disconnect Voice Session"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span className="text-[9px] font-semibold mt-0.5">END</span>
                </button>
              </div>
            )}
          </div>

          {/* Real-time Level Bars */}
          {isConnected && isMicActive && (
            <div className="flex items-center gap-1 mt-2 h-4">
              {[...Array(12)].map((_, i) => {
                const isActive = audioLevel > i * 8;
                return (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      isActive
                        ? 'bg-gradient-to-t from-emerald-500 to-cyan-400'
                        : 'bg-slate-800'
                    }`}
                    style={{
                      height: isActive ? `${Math.min(16, 4 + (audioLevel / 100) * 14)}px` : '4px',
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Helper caption */}
          <p className="text-xs text-slate-400 mt-2 text-center">
            {!isConnected
              ? 'Click START to initiate low-latency bidirectional voice conversation with Gemini 3.8 Live.'
              : isGeminiSpeaking
              ? 'Gemini 3.8 Live is speaking... Speak any time to interrupt!'
              : isMicActive
              ? 'Speak naturally into your microphone at 16kHz PCM.'
              : 'Microphone is muted. Tap Mic to resume speaking.'}
          </p>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            Try asking:
          </span>
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (!isConnected) {
                  startVoiceSession().then(() => {
                    setTimeout(() => handleSendText(prompt), 1200);
                  });
                } else {
                  handleSendText(prompt);
                }
              }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700/80 whitespace-nowrap transition-colors shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Conversation Transcript Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Activity className="w-10 h-10 mb-3 text-slate-600 opacity-60 animate-pulse" />
              <p className="text-sm font-medium text-slate-400">Live Voice Conversation History</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                When you converse with Gemini 3.8 Live, real-time speech and generated responses will appear here.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-500 px-1">
                    {isUser ? (
                      <span>You</span>
                    ) : (
                      <span className="text-cyan-400 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Gemini 3.8 Live ({selectedVoice})
                      </span>
                    )}
                    <span>&bull;</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-md ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Text Input Fallback Bar */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendText();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isConnected
                  ? 'Or type your question to speak it via Gemini Live...'
                  : 'Start voice session above, or type question here...'
              }
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-colors shadow"
              title="Send to Live Session"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
