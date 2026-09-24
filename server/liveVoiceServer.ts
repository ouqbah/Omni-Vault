import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export function setupLiveVoiceServer(httpServer: any) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req: any, socket: any, head: any) => {
    try {
      const url = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
      if (url.pathname === '/live') {
        wss.handleUpgrade(req, socket, head, (clientWs) => {
          wss.emit('connection', clientWs, req);
        });
      }
    } catch (err) {
      console.error('[WebSocket Upgrade Error]:', err);
    }
  });

  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('[Live Voice] Client connected to Gemini Live voice socket');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      clientWs.send(JSON.stringify({
        type: 'error',
        error: 'GEMINI_API_KEY is not configured on the server. Please check your environment secret configuration.',
      }));
      clientWs.close();
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    let session: any = null;
    let isAlive = true;

    try {
      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'You are OmniVault Voice Concierge, an intelligent, friendly real-time voice assistant for OmniVault Digital Delivery platform. You assist buyers and merchants with digital fulfillment inquiries, temporary download link expiration rules, PDF eBooks and vector asset downloads, license key checks, automated HTML receipts, Web Push notifications, and TOTP Two-Factor Authentication. Keep your spoken responses concise, natural, warm, and directly helpful (1 to 3 sentences per reply).',
        },
        callbacks: {
          onopen: () => {
            console.log('[Live Voice] Gemini Live session connected');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'status',
                status: 'connected',
                model: 'gemini-3.8-live',
                message: 'Live voice session connected to Gemini 3.8 Live.'
              }));
            }
          },
          onmessage: (message: LiveServerMessage) => {
            if (!isAlive || clientWs.readyState !== WebSocket.OPEN) return;

            const parts = message.serverContent?.modelTurn?.parts;
            if (parts && parts.length > 0) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  clientWs.send(JSON.stringify({
                    type: 'audio',
                    audio: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                  }));
                }
                if (part.text) {
                  clientWs.send(JSON.stringify({
                    type: 'text',
                    text: part.text,
                  }));
                }
              }
            }

            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }

            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ type: 'turnComplete' }));
            }
          },
          onclose: () => {
            console.log('[Live Voice] Gemini session closed');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'status', status: 'closed' }));
            }
          },
          onerror: (err) => {
            console.error('[Live Voice] Gemini session error:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'error', error: 'Gemini Live encountered an error.' }));
            }
          },
        },
      });

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'ready',
          model: 'gemini-3.8-live',
          voice: 'Zephyr',
        }));
      }

    } catch (err: any) {
      console.error('[Live Voice] Failed to initialize Gemini Live session:', err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          error: `Could not connect to Gemini Live: ${err?.message || err}`,
        }));
      }
      return;
    }

    clientWs.on('message', (raw) => {
      try {
        const payload = JSON.parse(raw.toString());
        if (payload.audio && session) {
          session.sendRealtimeInput({
            audio: {
              data: payload.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (payload.text && session) {
          session.sendClientContent({
            turns: [
              {
                role: 'user',
                parts: [{ text: payload.text }],
              },
            ],
            turnComplete: true,
          });
        } else if (payload.action === 'context' && payload.text && session) {
          session.sendClientContent({
            turns: [
              {
                role: 'user',
                parts: [{ text: `[System Context for user]: ${payload.text}` }],
              },
            ],
            turnComplete: false,
          });
        }
      } catch (err) {
        console.error('[Live Voice] Error handling client message:', err);
      }
    });

    const cleanup = () => {
      isAlive = false;
      if (session) {
        try {
          session.close();
        } catch (e) {
          // ignore
        }
        session = null;
      }
    };

    clientWs.on('close', cleanup);
    clientWs.on('error', cleanup);
  });

  return wss;
}
