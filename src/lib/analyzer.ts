import type { AnalysisResult, AnalysisStep, Card, PhonemeResult } from '../types';

export interface AnalyzeOptions {
  onStep?: (step: AnalysisStep) => void;
  signal?: AbortSignal;
}

export interface Analyzer {
  analyze: (audio: Blob, card: Card, options?: AnalyzeOptions) => Promise<AnalysisResult>;
}

const STEP_DELAYS: Record<AnalysisStep, number> = {
  upload: 0,
  phoneme: 1500,
  intonation: 2500,
  feedback: 2500,
};

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pseudoRandom(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 10_000) / 10_000;
  };
}

function buildPhonemes(card: Card, rand: () => number): PhonemeResult[] {
  const hints = card.phonemeHints;
  if (hints && hints.length > 0) {
    return hints.map((h) => ({
      char: h.char,
      ipa: h.ipa,
      correct: rand() > 0.18,
      targetIpa: h.ipa,
    }));
  }
  const chars = card.korean.replace(/[?!.,\s]/g, '').split('');
  return chars.map((char) => ({
    char,
    ipa: '/?/',
    correct: rand() > 0.18,
  }));
}

function buildIntonation(length: number, rand: () => number) {
  const base = 165 + Math.floor(rand() * 20);
  const referenceF0 = Array.from({ length }, (_, i) => {
    const t = i / Math.max(length - 1, 1);
    return Math.round(base + Math.sin(t * Math.PI) * 18 - t * 25);
  });
  const userF0 = referenceF0.map((v) => v + Math.round((rand() - 0.5) * 18));
  return {
    userF0,
    referenceF0,
    direction: 'rising' as const,
    feedback: '의문문이므로 문장 끝에서 억양을 더 올려주세요.',
  };
}

function buildScore(phonemes: PhonemeResult[]): number {
  const correct = phonemes.filter((p) => p.correct).length;
  const ratio = correct / Math.max(phonemes.length, 1);
  return Math.round(60 + ratio * 35);
}

function buildFeedback(card: Card, phonemes: PhonemeResult[]): string {
  const wrong = phonemes.find((p) => !p.correct);
  if (!wrong) {
    return `완벽해요! 🎉 "${card.korean}" 발음이 자연스러워요. 같은 호흡으로 다른 카드도 도전해보세요.`;
  }
  return `전체적으로 잘했어요! 🎉 '${wrong.char}'의 발음을 조금 더 또렷하게 해보세요. 입 모양과 혀 위치를 확인하면서 다시 한 번 따라 말해보세요.`;
}

export const mockAnalyzer: Analyzer = {
  async analyze(_audio, card, { onStep, signal } = {}) {
    const rand = pseudoRandom(hashSeed(card.id + Date.now().toString()));

    onStep?.('upload');
    await wait(STEP_DELAYS.phoneme, signal);

    onStep?.('phoneme');
    const phonemes = buildPhonemes(card, rand);
    await wait(STEP_DELAYS.intonation, signal);

    onStep?.('intonation');
    const intonation = buildIntonation(phonemes.length, rand);
    await wait(STEP_DELAYS.feedback, signal);

    onStep?.('feedback');
    const score = buildScore(phonemes);
    const llmFeedback = buildFeedback(card, phonemes);

    return { score, phonemes, intonation, llmFeedback };
  },
};

export const analyzer: Analyzer = mockAnalyzer;
