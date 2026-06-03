// Shared speech-output helpers for the situation pipeline.
//
// 기획서 4-2: 모범 응답 오디오는 '듣기 예시'로 우선 활용한다(아이가 먼저 듣고
// 따라 말하기).
//
// TTS 우선순위 (사용자 요구):
//   1. 백엔드 /tts — Google Cloud TTS 우선, 실패 시 edge-tts (서버가 내부 처리)
//   2. 브라우저 기본 TTS(SpeechSynthesis) — 위가 모두 실패할 때 최후 폴백
// playReference는 그보다 앞에 (0) 제작자가 등록한 오디오 파일(audio_path)을 둔다.

import { API_BASE_URL } from '../api/client';

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

/** Build the backend TTS URL (Google→edge handled server-side). Null when no
 *  API base is configured. */
function backendTtsUrl(text: string): string | null {
  if (typeof API_BASE_URL !== 'string' || !API_BASE_URL) return null;
  return `${API_BASE_URL}/tts?text=${encodeURIComponent(text)}`;
}

/** Last-resort browser TTS (SpeechSynthesis). Always cancels anything queued
 *  first. No-op (but still fires onend) when TTS is absent so callers keep a
 *  single completion path. */
function browserSpeak(text: string, opts: SpeakOptions): void {
  if (!isTtsSupported()) {
    opts.onend?.();
    return;
  }
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = opts.lang ?? 'ko-KR';
  utterance.rate = opts.rate ?? 0.85;
  if (opts.onstart) utterance.onstart = opts.onstart;
  utterance.onend = () => opts.onend?.();
  utterance.onerror = () => opts.onend?.();
  speechSynthesis.speak(utterance);
}

/**
 * Speak Korean text. Tries the backend /tts audio first (Google→edge); if that
 * fails to load/play, falls back to the browser's built-in TTS. onstart/onend
 * fire once for whichever path actually plays.
 */
export function speakText(text: string, opts: SpeakOptions = {}): void {
  if (!text) {
    opts.onend?.();
    return;
  }
  cancelSpeech();

  const url = backendTtsUrl(text);
  if (url) {
    try {
      const audio = new Audio(url);
      activeAudio = audio;
      if (opts.onstart) audio.onplay = opts.onstart;
      audio.onended = () => {
        if (activeAudio === audio) activeAudio = null;
        opts.onend?.();
      };
      // Network/server/format failure → browser TTS fallback.
      audio.onerror = () => {
        if (activeAudio === audio) activeAudio = null;
        browserSpeak(text, opts);
      };
      void audio.play().catch(() => {
        if (activeAudio === audio) activeAudio = null;
        browserSpeak(text, opts);
      });
      return;
    } catch {
      // Constructor/play threw synchronously — fall through to browser TTS.
    }
  }

  browserSpeak(text, opts);
}

/**
 * Play the reference audio for a sentence: prefer the producer-supplied audio
 * file (spec 4-2), then fall back to the TTS chain (backend Google→edge, then
 * browser). Returns immediately; completion is signalled through onend.
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
      // If the file 404s or the format is unsupported, fall back to the TTS
      // chain so the learner still gets a listening example.
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
      // Constructor/play threw synchronously — fall through to TTS chain.
    }
  }
  speakText(text, opts);
}
