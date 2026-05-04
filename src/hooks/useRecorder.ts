import { useCallback, useEffect, useRef, useState } from 'react';

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

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
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
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state === 'recording') rec.stop();
  }, []);

  const start = useCallback(async () => {
    setErrorMessage(null);
    setAudioBlob(null);
    setDurationMs(0);
    setLevel(0);
    setStatus('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const Ctx =
        window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
      if (!Ctx) throw new Error('AudioContext unsupported');
      const audioCtx = new Ctx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      hasSpokenRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setStatus('preview');
        cleanup();
      };

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
      recorder.start();
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
    cleanup();
    setStatus('idle');
    setAudioBlob(null);
    setDurationMs(0);
    setLevel(0);
    setErrorMessage(null);
  }, [cleanup]);

  return { status, audioBlob, durationMs, level, errorMessage, start, stop, reset };
}
