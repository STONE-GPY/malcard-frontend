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
  currentIndex: number;
  setCurrentCard: (card: Card) => void;
  nextCard: () => void;

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
  currentIndex: 0,
  setCurrentCard: (card) => {
    const index = cards.findIndex((c) => c.id === card.id);
    set({ currentCard: card, currentIndex: index });
  },
  nextCard: () => {
    const { currentIndex, filteredCards } = get();
    const filtered = filteredCards();
    const nextIndex = (currentIndex + 1) % filtered.length;
    set({ currentCard: filtered[nextIndex], currentIndex: nextIndex, analysisResult: null, audioBlob: null });
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
