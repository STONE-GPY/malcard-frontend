import type { Card, CategoryId, AnalysisResult, EvaluationStatus } from '../types';

// Frontend filter chips. apiType is sent as the `type` query param to /cards.
export interface CategoryDef {
  id: CategoryId;
  label: string;
  apiType?: string; // backend `type` filter value
}

export const categories: CategoryDef[] = [
  { id: 'all', label: '전체' },
  { id: 'daily', label: '일상', apiType: '일상문장' },
  { id: 'idioms', label: '관용구', apiType: '관용구' },
  { id: 'situations', label: '상황', apiType: '상황별' },
  { id: 'words', label: '단어', apiType: '단어' },
];

// Map between backend type string ↔ frontend filter id
export function categoryIdForType(type: string): Exclude<CategoryId, 'all'> {
  const found = categories.find((c) => c.apiType === type);
  return (found?.id ?? 'daily') as Exclude<CategoryId, 'all'>;
}

export function emojiForType(type: string): string {
  switch (type) {
    case '일상문장':
      return '💬';
    case '관용구':
      return '🐯';
    case '상황별':
      return '🎯';
    case '단어':
      return '📚';
    default:
      return '📝';
  }
}

export interface Deck {
  id: string;
  emoji: string;
  title: string;
  titleKo: string;
  count: number;
}

export const decks: Deck[] = [
  { id: 'hospital', emoji: '🏥', title: '병원', titleKo: 'Hospital', count: 24 },
  { id: 'cafe', emoji: '☕', title: '카페', titleKo: 'Cafe', count: 18 },
  { id: 'travel', emoji: '✈️', title: '여행', titleKo: 'Travel', count: 32 },
  { id: 'shopping', emoji: '🛍️', title: '쇼핑', titleKo: 'Shopping', count: 21 },
];

// Mock cards in the BACKEND schema (so the mock client returns the same shape as the API)
export const mockBackendCards: Omit<Card, keyof Pick<Card, 'emoji' | 'romanized' | 'difficulty' | 'phonemes'>>[] = [
  {
    id: 'life_01',
    type: '일상문장',
    korean: '안녕하세요',
    russian: 'Здравствуйте',
    prompt_question: '정중한 인사 표현입니다.',
    phoneme_focus: '받침',
  },
  {
    id: 'life_02',
    type: '일상문장',
    korean: '감사합니다',
    russian: 'Спасибо',
    prompt_question: '감사 인사 표현입니다.',
    phoneme_focus: '받침',
  },
  {
    id: 'life_03',
    type: '일상문장',
    korean: '밥 먹었어요?',
    russian: 'Ты поел?',
    prompt_question: '식사하셨어요? (안부 인사)',
  },
  {
    id: 'sit_01',
    type: '상황별',
    korean: '어디가 아프세요?',
    russian: 'Где у вас болит?',
    prompt_question: '병원에서 환자에게 묻는 말이에요.',
    phoneme_focus: '격음',
  },
  {
    id: 'word_01',
    type: '단어',
    korean: '비가 와요',
    russian: 'Идёт дождь',
    prompt_question: '비가 내리고 있어요.',
  },
  {
    id: 'idi_01',
    type: '관용구',
    korean: '호랑이도 제 말 하면 온다',
    russian: 'Лёгок на помине',
    prompt_question: '말하면 나타난다는 속담이에요.',
  },
  {
    id: 'sit_02',
    type: '상황별',
    korean: '커피 한 잔 주세요',
    russian: 'Один кофе, пожалуйста',
    prompt_question: '카페에서 주문하기.',
    phoneme_focus: '격음',
  },
  {
    id: 'word_02',
    type: '단어',
    korean: '공부',
    russian: 'Учёба',
    prompt_question: '학습 · 공부하다.',
  },
];

// Optional UI extras keyed by card id (not from backend)
export const cardUiExtras: Record<string, {
  emoji?: string;
  romanized?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  phonemes?: { ko: string; ipa: string }[];
}> = {
  life_01: {
    emoji: '👋',
    romanized: 'annyeonghaseyo',
    difficulty: 'easy',
    phonemes: [
      { ko: '안', ipa: '/an/' },
      { ko: '녕', ipa: '/njʌŋ/' },
      { ko: '하', ipa: '/ha/' },
      { ko: '세', ipa: '/se/' },
      { ko: '요', ipa: '/jo/' },
    ],
  },
  life_02: {
    emoji: '🙏',
    romanized: 'gamsahamnida',
    difficulty: 'easy',
    phonemes: [
      { ko: '감', ipa: '/kam/' },
      { ko: '사', ipa: '/sa/' },
      { ko: '합', ipa: '/hap/' },
      { ko: '니', ipa: '/ni/' },
      { ko: '다', ipa: '/da/' },
    ],
  },
  life_03: {
    emoji: '🍚',
    romanized: 'bap meogeosseoyo?',
    difficulty: 'medium',
    phonemes: [
      { ko: '밥', ipa: '/pap/' },
      { ko: '먹', ipa: '/mʌk/' },
      { ko: '었', ipa: '/ʌt/' },
      { ko: '어', ipa: '/ʌ/' },
      { ko: '요', ipa: '/jo/' },
    ],
  },
  sit_01: {
    emoji: '💊',
    romanized: 'eodiga apeuseyo?',
    difficulty: 'hard',
    phonemes: [
      { ko: '어', ipa: '/ʌ/' },
      { ko: '디', ipa: '/di/' },
      { ko: '가', ipa: '/ka/' },
      { ko: '아', ipa: '/a/' },
      { ko: '프', ipa: '/pʰɯ/' },
      { ko: '세', ipa: '/se/' },
      { ko: '요', ipa: '/jo/' },
    ],
  },
  word_01: {
    emoji: '🌧️',
    romanized: 'biga wayo',
    difficulty: 'easy',
    phonemes: [
      { ko: '비', ipa: '/pi/' },
      { ko: '가', ipa: '/ka/' },
      { ko: '와', ipa: '/wa/' },
      { ko: '요', ipa: '/jo/' },
    ],
  },
  idi_01: {
    emoji: '🐯',
    romanized: 'horangi-do je mal hamyeon onda',
    difficulty: 'hard',
  },
  sit_02: {
    emoji: '☕',
    romanized: 'keopi han jan juseyo',
    difficulty: 'medium',
    phonemes: [
      { ko: '커', ipa: '/kʰʌ/' },
      { ko: '피', ipa: '/pʰi/' },
      { ko: '한', ipa: '/han/' },
      { ko: '잔', ipa: '/tɕan/' },
    ],
  },
  word_02: {
    emoji: '📚',
    romanized: 'gongbu',
    difficulty: 'easy',
    phonemes: [
      { ko: '공', ipa: '/koŋ/' },
      { ko: '부', ipa: '/pu/' },
    ],
  },
};

export interface DifficultyMeta {
  label: string;
  color: string;
  bg: string;
  dot: string;
}

export const difficultyMeta: Record<NonNullable<Card['difficulty']>, DifficultyMeta> = {
  easy: { label: '쉬움', color: '#10B981', bg: '#ECFDF5', dot: '#10B981' },
  medium: { label: '보통', color: '#F59E0B', bg: '#FFFBEB', dot: '#F59E0B' },
  hard: { label: '어려움', color: '#EF4444', bg: '#FEF2F2', dot: '#EF4444' },
};

export const tips: string[] = [
  '학습자는 ㅂ과 ㅃ을 자주 헷갈려요 — 서로 다른 자음입니다',
  'ㅡ는 입술을 풀고 «으» 소리를 내는 모음이에요',
  '한국어 의문문에서는 문장 끝 음을 올려주세요',
  '격음(ㅍ, ㅌ, ㅋ)은 강한 숨을 함께 내뱉어야 해요',
];

export const mockResultForDemo: AnalysisResult = {
  status: 'ready' as EvaluationStatus,
  score: 84,
  message: '잘했어요!',
  phonemes: [
    { ko: '어', user: '/ʌ/', target: '/ʌ/', correct: true },
    { ko: '디', user: '/di/', target: '/di/', correct: true },
    { ko: '가', user: '/ka/', target: '/ka/', correct: true },
    { ko: '아', user: '/a/', target: '/a/', correct: true },
    { ko: '프', user: '/pu/', target: '/pʰɯ/', correct: false, note: '격음 ㅍ로 발음하고 모음은 ㅜ가 아닌 ㅡ로' },
    { ko: '세', user: '/se/', target: '/se/', correct: true },
    { ko: '요', user: '/jo/', target: '/jo/', correct: true },
  ],
  intonation: [
    { c: '어', native: 62, mine: 60 },
    { c: '디', native: 70, mine: 66 },
    { c: '가', native: 68, mine: 64 },
    { c: '아', native: 72, mine: 70 },
    { c: '프', native: 78, mine: 68 },
    { c: '세', native: 85, mine: 72 },
    { c: '요', native: 92, mine: 70 },
  ],
  intonationWarning: '문장 끝 억양이 부족해요',
  aiFeedback:
    '전체적으로 발음이 깨끗했어요 — 모음을 정확하게 잘 내고 있습니다. 다만 ㅍ 발음에 주의해 주세요.',
  prosodyExecuted: true,
};

export interface HistorySession {
  id: number;
  day: string;
  time: string;
  card: string;
  cat: string;
  score: number;
  delta: number;
}

export const historySessions: HistorySession[] = [
  { id: 1, day: '오늘', time: '14:20', card: '어디가 아프세요?', cat: '병원', score: 84, delta: +6 },
  { id: 2, day: '오늘', time: '09:48', card: '커피 한 잔 주세요', cat: '카페', score: 91, delta: +4 },
  { id: 3, day: '오늘', time: '09:42', card: '안녕하세요', cat: '일상', score: 96, delta: +1 },
  { id: 4, day: '어제', time: '21:05', card: '비가 와요', cat: '날씨', score: 78, delta: -3 },
  { id: 5, day: '어제', time: '20:58', card: '감사합니다', cat: '일상', score: 89, delta: +5 },
  { id: 6, day: '4월 25일', time: '11:14', card: '밥 먹었어요?', cat: '일상', score: 72, delta: -2 },
  { id: 7, day: '4월 25일', time: '11:08', card: '공부', cat: '단어', score: 95, delta: +8 },
  { id: 8, day: '4월 24일', time: '19:32', card: '호랑이도 제 말 하면', cat: '관용구', score: 64, delta: 0 },
];

export interface WeekDay {
  d: string;
  m: number;
  avg: number;
  today?: boolean;
}

export const weekData: WeekDay[] = [
  { d: '월', m: 12, avg: 76 },
  { d: '화', m: 18, avg: 82 },
  { d: '수', m: 8, avg: 71 },
  { d: '목', m: 22, avg: 85 },
  { d: '금', m: 16, avg: 79 },
  { d: '토', m: 24, avg: 88 },
  { d: '일', m: 14, avg: 84, today: true },
];

export interface Achievement {
  id: number;
  emoji: string;
  name: string;
  sub: string;
  earned: boolean;
  progress?: number;
}

export const achievements: Achievement[] = [
  { id: 1, emoji: '🔥', name: '12일 연속', sub: '매일 학습', earned: true },
  { id: 2, emoji: '🎯', name: '정확왕', sub: '90+ 10회', earned: true },
  { id: 3, emoji: '🏥', name: '병원 완주', sub: '병원 24장', earned: true },
  { id: 4, emoji: '☕', name: '카페 마스터', sub: '18 / 18', earned: false, progress: 0.66 },
  { id: 5, emoji: '🐯', name: '관용구', sub: '5 / 20', earned: false, progress: 0.25 },
  { id: 6, emoji: '✈️', name: '여행 준비', sub: '12 / 32', earned: false, progress: 0.37 },
];
