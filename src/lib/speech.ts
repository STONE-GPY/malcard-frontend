// Shared speech-output helpers for the situation pipeline.
//
// 기획서 4-2: 모범 응답 오디오는 '듣기 예시'로 우선 활용한다(아이가 먼저 듣고
// 따라 말하기). 우선순위는 (1) 제작자가 등록한 오디오 파일(audio_path),
// (2) 없으면 브라우저 TTS(SpeechSynthesis) 최후 대안. 두 경로를 한 함수로
// 묶어 Step1/Step2/Step3에서 동일하게 쓴다.

let activeAudio: HTMLAudioElement | null = null;

/** Stop any in-flight TTS utterance and any HTMLAudioElement we started. */
export function cancelSpeech(): void {
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel();
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
}

/** True when the browser exposes the Web Speech synthesis API. */
export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

interface SpeakOptions {
  lang?: string;
  rate?: number;
  onstart?: () => void;
  onend?: () => void;
}

/**
 * Speak Korean text via SpeechSynthesis. Always cancels anything queued first
 * so we never double-speak. No-op (but still fires onend) when TTS is absent
 * so callers can keep a single completion path.
 */
export function speakText(text: string, opts: SpeakOptions = {}): void {
  if (!text) {
    opts.onend?.();
    return;
  }
  if (!isTtsSupported()) {
    opts.onend?.();
    return;
  }
  cancelSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = opts.lang ?? 'ko-KR';
  utterance.rate = opts.rate ?? 0.85;
  if (opts.onstart) utterance.onstart = opts.onstart;
  utterance.onend = () => opts.onend?.();
  utterance.onerror = () => opts.onend?.();
  speechSynthesis.speak(utterance);
}

/**
 * Play the reference audio for a sentence: prefer the producer-supplied
 * audio file, fall back to TTS. Returns immediately; completion is signalled
 * through onend. Resolving audio_path against the dev/prod base keeps it
 * working whether the path is absolute or app-relative.
 */
export function playReference(
  text: string,
  audioPath: string | null | undefined,
  opts: SpeakOptions = {},
): void {
  cancelSpeech();
  if (audioPath) {
    try {
      const audio = new Audio(audioPath);
      activeAudio = audio;
      if (opts.onstart) audio.onplay = opts.onstart;
      const done = () => {
        if (activeAudio === audio) activeAudio = null;
        opts.onend?.();
      };
      audio.onended = done;
      // If the file 404s or the format is unsupported, fall back to TTS so the
      // learner still gets a listening example (spec: TTS is the fallback).
      audio.onerror = () => {
        if (activeAudio === audio) activeAudio = null;
        speakText(text, opts);
      };
      void audio.play().catch(() => {
        if (activeAudio === audio) activeAudio = null;
        speakText(text, opts);
      });
      return;
    } catch {
      // Constructor/play threw synchronously — fall through to TTS.
    }
  }
  speakText(text, opts);
}
