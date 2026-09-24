/**
 * Audio processing utilities for Gemini 3.8 Live API
 * Handles 16kHz PCM recording and 24kHz PCM smooth queue playback.
 */

// Convert Float32Array (-1.0 to 1.0) into 16-bit linear PCM Base64 string
export function float32To16BitPcmBase64(input: Float32Array): string {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); // Little endian
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64-encoded 24kHz 16-bit linear PCM to AudioBuffer
export function base64PcmToAudioBuffer(
  base64: string,
  audioCtx: AudioContext,
  sampleRate = 24000
): AudioBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const int16Array = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    const val = int16Array[i];
    float32Array[i] = val < 0 ? val / 32768 : val / 32767;
  }

  const audioBuffer = audioCtx.createBuffer(1, float32Array.length, sampleRate);
  audioBuffer.copyToChannel(float32Array, 0);
  return audioBuffer;
}

// Seamless streaming audio player for Gemini 24kHz PCM chunks
export class LiveAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onPlaybackStateChange?: (isPlaying: boolean) => void;

  constructor(onPlaybackStateChange?: (isPlaying: boolean) => void) {
    this.onPlaybackStateChange = onPlaybackStateChange;
  }

  private initCtx() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
      this.nextStartTime = 0;
    }
  }

  async resume() {
    this.initCtx();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  playChunk(base64Data: string) {
    if (!base64Data) return;
    this.initCtx();
    if (!this.audioCtx) return;

    try {
      const buffer = base64PcmToAudioBuffer(base64Data, this.audioCtx, 24000);
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioCtx.destination);

      const currentTime = this.audioCtx.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += buffer.duration;
      this.activeSources.push(source);
      this.onPlaybackStateChange?.(true);

      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index > -1) {
          this.activeSources.splice(index, 1);
        }
        if (this.activeSources.length === 0) {
          this.onPlaybackStateChange?.(false);
        }
      };
    } catch (err) {
      console.warn('[LiveAudioPlayer] Could not decode audio chunk:', err);
    }
  }

  stopAll() {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // already stopped
      }
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
    this.onPlaybackStateChange?.(false);
  }

  destroy() {
    this.stopAll();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {
        // ignore
      }
    }
    this.audioCtx = null;
  }
}

// Microphone capture stream at 16kHz PCM
export class LiveMicRecorder {
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isRecording = false;

  async start(
    onAudioChunk: (base64Pcm: string) => void,
    onAudioLevel?: (level: number) => void
  ) {
    if (this.isRecording) return;

    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioCtxClass({ sampleRate: 16000 });
    await this.audioCtx.resume();

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const source = this.audioCtx.createMediaStreamSource(this.stream);
    // Buffer size 4096 gives ~256ms chunk at 16kHz
    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);

    // Mute gain node so user does not hear their own mic echoing in their speakers
    const silentGain = this.audioCtx.createGain();
    silentGain.gain.value = 0;

    this.processor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputData = e.inputBuffer.getChannelData(0);

      // Compute simple audio volume level (RMS) for UI feedback
      if (onAudioLevel) {
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const level = Math.min(100, Math.round(rms * 250));
        onAudioLevel(level);
      }

      const base64Pcm = float32To16BitPcmBase64(inputData);
      onAudioChunk(base64Pcm);
    };

    source.connect(this.processor);
    this.processor.connect(silentGain);
    silentGain.connect(this.audioCtx.destination);

    this.isRecording = true;
  }

  stop() {
    this.isRecording = false;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {
        // ignore
      }
      this.audioCtx = null;
    }
  }

  get active() {
    return this.isRecording;
  }
}
