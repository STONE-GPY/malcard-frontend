export type Difficulty = 'easy' | 'medium' | 'hard';
export type CardCategory = 'daily' | 'idiom' | 'situation' | 'word';

export interface Card {
  id: string;
  korean: string;
  romanize: string;
  translation: string; // Russian translation
  emoji: string;
  category: CardCategory;
  subcategory?: string;
  difficulty: Difficulty;
  phonemeHints?: PhonemeHint[];
}

export interface PhonemeHint {
  char: string;
  ipa: string;
}

export interface SituationGroup {
  id: string;
  title: string;
  emoji: string;
  cardCount: number;
  color: 'indigo' | 'orange' | 'teal';
}

export interface PhonemeResult {
  char: string;
  ipa: string;
  targetIpa?: string;
  correct: boolean;
}

export interface IntonationData {
  userF0: number[];
  referenceF0: number[];
  direction: 'rising' | 'falling';
  feedback: string;
}

export interface AnalysisResult {
  score: number;
  phonemes: PhonemeResult[];
  intonation: IntonationData;
  llmFeedback: string;
}

export type AnalysisStep = 'upload' | 'phoneme' | 'intonation' | 'feedback';
