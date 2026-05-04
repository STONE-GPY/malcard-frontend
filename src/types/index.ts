export type Difficulty = 'easy' | 'medium' | 'hard';
export type CardCategory = 'daily' | 'idioms' | 'situations' | 'words';

export interface Phoneme {
  ko: string;
  ipa: string;
}

export interface Card {
  id: number;
  emoji: string;
  ko: string;
  romanized: string;
  ru: string;
  category: CardCategory;
  difficulty: Difficulty;
  phonemes: Phoneme[];
}

export interface Deck {
  id: string;
  emoji: string;
  title: string;
  titleKo: string;
  count: number;
}

export interface DifficultyMeta {
  label: string;
  color: string;
  bg: string;
  dot: string;
}

export interface PhonemeResult {
  ko: string;
  user: string;
  target: string;
  correct: boolean;
  note?: string;
}

export interface IntonationPoint {
  c: string;
  native: number;
  mine: number;
}

export interface AnalysisResult {
  score: number;
  message: string;
  messageEn: string;
  phonemes: PhonemeResult[];
  intonation: IntonationPoint[];
  intonationWarning: string;
  aiFeedback: string;
}

export type AnalysisStep = 'upload' | 'phoneme' | 'intonation' | 'feedback';
