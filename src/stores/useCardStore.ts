import { create } from 'zustand';
import type { Card, CategoryId, AnalysisResult, AnalysisStep } from '../types';

interface CardStore {
  // Filter
  selectedCategory: CategoryId;
  setCategory: (category: CategoryId) => void;

  // Current card (the page that lists cards owns the list; store only holds the chosen one)
  currentCard: Card | null;
  setCurrentCard: (card: Card) => void;

  // Sequencing within current category list (provided by caller)
  cardList: Card[];
  setCardList: (list: Card[]) => void;
  nextCard: () => void;
  currentPosition: () => { index: number; total: number };

  // Recording
  audioBlob: Blob | null;
  setAudioBlob: (blob: Blob | null) => void;

  // Analysis
  analysisStep: AnalysisStep;
  setAnalysisStep: (step: AnalysisStep) => void;
  analysisResult: AnalysisResult | null;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  analysisError: { code: string; message: string } | null;
  setAnalysisError: (err: { code: string; message: string } | null) => void;
}

export const useCardStore = create<CardStore>((set, get) => ({
  selectedCategory: 'all',
  setCategory: (category) => set({ selectedCategory: category }),

  currentCard: null,
  setCurrentCard: (card) => set({ currentCard: card }),

  cardList: [],
  setCardList: (list) => set({ cardList: list }),

  nextCard: () => {
    const { currentCard, cardList } = get();
    if (cardList.length === 0) return;
    const idx = currentCard ? cardList.findIndex((c) => c.id === currentCard.id) : -1;
    const nextIdx = idx >= 0 ? (idx + 1) % cardList.length : 0;
    set({
      currentCard: cardList[nextIdx],
      analysisResult: null,
      audioBlob: null,
      analysisError: null,
    });
  },

  currentPosition: () => {
    const { currentCard, cardList } = get();
    if (!currentCard || cardList.length === 0) return { index: 0, total: cardList.length };
    const idx = cardList.findIndex((c) => c.id === currentCard.id);
    return { index: idx >= 0 ? idx + 1 : 1, total: cardList.length };
  },

  audioBlob: null,
  setAudioBlob: (blob) => set({ audioBlob: blob }),

  analysisStep: 'upload',
  setAnalysisStep: (step) => set({ analysisStep: step }),
  analysisResult: null,
  setAnalysisResult: (result) => set({ analysisResult: result }),
  analysisError: null,
  setAnalysisError: (err) => set({ analysisError: err }),
}));
