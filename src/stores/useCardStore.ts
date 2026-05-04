import { create } from 'zustand';
import type { Card, CardCategory, AnalysisResult, AnalysisStep } from '../types';
import { cards } from '../data/cards';

interface CardStore {
  // Card selection
  selectedCategory: CardCategory | 'all';
  setCategory: (category: CardCategory | 'all') => void;
  filteredCards: () => Card[];

  // Learning
  currentCard: Card | null;
  setCurrentCard: (card: Card) => void;
  nextCard: () => void;
  currentPosition: () => { index: number; total: number };

  // Recording
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  audioBlob: Blob | null;
  setAudioBlob: (blob: Blob | null) => void;

  // Analysis
  analysisStep: AnalysisStep;
  setAnalysisStep: (step: AnalysisStep) => void;
  analysisResult: AnalysisResult | null;
  setAnalysisResult: (result: AnalysisResult | null) => void;
}

export const useCardStore = create<CardStore>((set, get) => ({
  selectedCategory: 'all',
  setCategory: (category) => set({ selectedCategory: category }),
  filteredCards: () => {
    const { selectedCategory } = get();
    if (selectedCategory === 'all') return cards;
    return cards.filter((c) => c.category === selectedCategory);
  },

  currentCard: null,
  setCurrentCard: (card) => set({ currentCard: card }),
  nextCard: () => {
    const { currentCard, filteredCards } = get();
    const filtered = filteredCards();
    if (filtered.length === 0) return;
    const idx = currentCard ? filtered.findIndex((c) => c.id === currentCard.id) : -1;
    const nextIdx = idx >= 0 ? (idx + 1) % filtered.length : 0;
    set({
      currentCard: filtered[nextIdx],
      analysisResult: null,
      audioBlob: null,
    });
  },
  currentPosition: () => {
    const { currentCard, filteredCards } = get();
    const filtered = filteredCards();
    if (!currentCard || filtered.length === 0) return { index: 0, total: filtered.length };
    const idx = filtered.findIndex((c) => c.id === currentCard.id);
    return { index: idx >= 0 ? idx + 1 : 1, total: filtered.length };
  },

  isRecording: false,
  setIsRecording: (recording) => set({ isRecording: recording }),
  audioBlob: null,
  setAudioBlob: (blob) => set({ audioBlob: blob }),

  analysisStep: 'upload',
  setAnalysisStep: (step) => set({ analysisStep: step }),
  analysisResult: null,
  setAnalysisResult: (result) => set({ analysisResult: result }),
}));
