import type { AnalysisResult, AnalysisStep, Card, PhonemeResult } from '../types';
import { mockResultForDemo } from '../data/cards';

export interface AnalyzeOptions {
  onStep?: (step: AnalysisStep) => void;
  signal?: AbortSignal;
}

export interface Analyzer {
  analyze: (audio: Blob, card: Card, options?: AnalyzeOptions) => Promise<AnalysisResult>;
}

const STEP_DELAYS: Record<AnalysisStep, number> = {
  upload: 0,
  phoneme: 900,
  intonation: 1100,
  feedback: 1100,
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
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) | 0;
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
  return card.phonemes.map((p) => ({
    ko: p.ko,
    user: p.ipa,
    target: p.ipa,
    correct: rand() > 0.18,
  }));
}

function buildIntonation(phonemes: PhonemeResult[], rand: () => number) {
  const len = phonemes.length;
  const base = 60 + Math.floor(rand() * 8);
  return phonemes.map((p, i) => {
    const t = i / Math.max(len - 1, 1);
    const native = Math.round(base + t * 28 + Math.sin(t * Math.PI) * 6);
    const mine = native + Math.round((rand() - 0.6) * 12);
    return { c: p.ko, native, mine };
  });
}

function buildScore(phonemes: PhonemeResult[]): number {
  const correct = phonemes.filter((p) => p.correct).length;
  const ratio = correct / Math.max(phonemes.length, 1);
  return Math.round(60 + ratio * 35);
}

function buildFeedback(card: Card, phonemes: PhonemeResult[]): string {
  const wrong = phonemes.find((p) => !p.correct);
  if (!wrong) {
    return `완벽해요! 🎉 "${card.ko}" 발음이 자연스러워요. 같은 호흡으로 다른 카드도 도전해보세요.`;
  }
  return `전체적으로 잘했어요! '${wrong.ko}' 발음을 조금 더 또렷하게 해보세요. 입 모양과 혀 위치를 확인하면서 다시 한 번 따라 말해보세요.`;
}

export const mockAnalyzer: Analyzer = {
  async analyze(_audio, card, { onStep, signal } = {}) {
    const rand = pseudoRandom(hashSeed(`${card.id}-${Date.now()}`));

    onStep?.('upload');
    await wait(STEP_DELAYS.phoneme, signal);

    onStep?.('phoneme');
    const phonemes = buildPhonemes(card, rand);
    await wait(STEP_DELAYS.intonation, signal);

    onStep?.('intonation');
    const intonation = buildIntonation(phonemes, rand);
    await wait(STEP_DELAYS.feedback, signal);

    onStep?.('feedback');
    const score = buildScore(phonemes);
    const aiFeedback = buildFeedback(card, phonemes);
    const wrong = phonemes.find((p) => !p.correct);

    return {
      score,
      message: score >= 80 ? '잘했어요!' : score >= 60 ? '조금만 더!' : '다시 도전!',
      messageEn: score >= 80 ? 'Great job!' : 'Keep going!',
      phonemes,
      intonation,
      intonationWarning: wrong ? '문장 끝 억양이 부족해요' : '억양이 자연스러워요',
      aiFeedback,
    };
  },
};

export const demoAnalyzer: Analyzer = {
  async analyze(_audio, _card, { onStep, signal } = {}) {
    onStep?.('upload');
    await wait(STEP_DELAYS.phoneme, signal);
    onStep?.('phoneme');
    await wait(STEP_DELAYS.intonation, signal);
    onStep?.('intonation');
    await wait(STEP_DELAYS.feedback, signal);
    onStep?.('feedback');
    return mockResultForDemo;
  },
};

export const analyzer: Analyzer = mockAnalyzer;
