import { useCallback, useEffect, useRef, useState } from 'react';
import { float32ToWav } from '../lib/wav';

export type RecorderStatus =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'preview'
  | 'denied'
  | 'error';

interface UseRecorderOptions {
  minDurationMs?: number;
  maxDurationMs?: number;
  silenceThreshold?: number;
  silenceDurationMs?: number;
}

interface UseRecorderReturn {
  status: RecorderStatus;
  audioBlob: Blob | null;
  durationMs: number;
  level: number;
  errorMessage: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export function useRecorder(opts: UseRecorderOptions = {}): UseRecorderReturn {
  const minDuration = opts.minDurationMs ?? 800;
  const maxDuration = opts.maxDurationMs ?? 12_000;
  const silenceThreshold = opts.silenceThreshold ?? 0.02;
  const silenceDuration = opts.silenceDurationMs ?? 1500;

  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  // Accumulated raw PCM captured straight off the mic source — the exact signal
  // the level meter measures, so a non-zero meter guarantees non-zero audio.
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const captureRateRef = useRef(16000);
  const finalizedRef = useRef(false);
  const startedAtRef = useRef(0);
  const lastSpeechAtRef = useRef(0);
  const hasSpokenRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const maxTimerRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (maxTimerRef.current !== null) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // Concatenate captured PCM → resample to 16 kHz mono WAV → preview.
  const finalize = useCallback(async () => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;

    const chunks = pcmChunksRef.current;
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const pcm = new Float32Array(total);
    let offset = 0;
    for (const c of chunks) {
      pcm.set(c, offset);
      offset += c.length;
    }
    const rate = captureRateRef.current;
    cleanup();

    try {
      const wav = await float32ToWav(pcm, rate, 16000);
      setAudioBlob(wav);
    } catch (err) {
      console.error('[useRecorder] WAV encode failed', err);
      setStatus('error');
      setErrorMessage('녹음을 처리하지 못했습니다.');
      return;
    }
    setStatus('preview');
  }, [cleanup]);

  const stop = useCallback(() => {
    if (finalizedRef.current) return;
    void finalize();
  }, [finalize]);

  const start = useCallback(async () => {
    setErrorMessage(null);
    setAudioBlob(null);
    setDurationMs(0);
    setLevel(0);
    setStatus('requesting');

    // CRITICAL: Create the AudioContext synchronously within the click-handler
    // frame, BEFORE any await. Chrome's autoplay policy puts a context that is
    // created after an await into "suspended" state. When suspended the
    // ScriptProcessorNode onaudioprocess callbacks still fire, but inputBuffer
    // is filled with zeros — not real mic data — producing a silent WAV.
    // Creating the context here (while the user-gesture activation is still
    // live) ensures it starts in "running" state.
    const Ctx =
      window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!Ctx) {
      setStatus('error');
      setErrorMessage('AudioContext를 지원하지 않는 브라우저입니다.');
      return;
    }
    const audioCtx = new Ctx();
    audioCtxRef.current = audioCtx;
    captureRateRef.current = audioCtx.sampleRate;

    try {
      // Disable Chrome's built-in audio processing — echo cancellation and
      // noise suppression can aggressively suppress mic input to near-zero when
      // the AudioContext is also connected to the destination node.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      // Safety net: if the permission dialog exhausted the transient user
      // activation the context may still be suspended — resume it explicitly.
      if (audioCtx.state !== 'running') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Capture raw PCM straight off the mic source. ScriptProcessorNode is
      // deprecated but universally supported and avoids the MediaRecorder →
      // decodeAudioData → re-render chain that intermittently produced silent
      // WAVs. Output is left as zeros (no echo back to speakers).
      pcmChunksRef.current = [];
      finalizedRef.current = false;
      hasSpokenRef.current = false;
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (finalizedRef.current) return;
        pcmChunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);

      const buffer = new Float32Array(analyser.fftSize);
      const tick = () => {
        const a = analyserRef.current;
        if (!a) return;
        a.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
        const rms = Math.sqrt(sum / buffer.length);
        const elapsed = performance.now() - startedAtRef.current;
        setLevel(Math.min(1, rms * 4));
        setDurationMs(elapsed);

        const now = performance.now();
        if (rms > silenceThreshold) {
          hasSpokenRef.current = true;
          lastSpeechAtRef.current = now;
        }

        if (
          hasSpokenRef.current &&
          elapsed >= minDuration &&
          now - lastSpeechAtRef.current >= silenceDuration
        ) {
          stop();
          return;
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      startedAtRef.current = performance.now();
      lastSpeechAtRef.current = startedAtRef.current;
      setStatus('recording');
      rafRef.current = requestAnimationFrame(tick);

      maxTimerRef.current = window.setTimeout(() => stop(), maxDuration);
    } catch (err) {
      const e = err as DOMException;
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setStatus('denied');
      } else {
        setStatus('error');
        setErrorMessage(e.message || '녹음을 시작할 수 없습니다.');
      }
      cleanup();
    }
  }, [maxDuration, minDuration, silenceDuration, silenceThreshold, stop, cleanup]);

  const reset = useCallback(() => {
    finalizedRef.current = true;
    pcmChunksRef.current = [];
    cleanup();
    setStatus('idle');
    setAudioBlob(null);
    setDurationMs(0);
    setLevel(0);
    setErrorMessage(null);
  }, [cleanup]);

  return { status, audioBlob, durationMs, level, errorMessage, start, stop, reset };
}
