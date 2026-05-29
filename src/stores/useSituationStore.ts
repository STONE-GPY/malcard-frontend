import { create } from 'zustand';
import type { Situation } from '../types';

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}


export type StepType = 'dialogue' | 'puzzle' | 'speak' | 'result';

export interface Slot {
  id: string; // unique identifier for the slot instance
  word: string; // the word placed in the slot
  originalIndex: number; // index from initialWords
  isWrong: boolean; // whether this slot was marked as wrong during a check
}

export interface SituationState {
  currentSituation: Situation | null;
  currentStep: StepType;
  currentPuzzleIndex: number;

  // Puzzle state
  slots: (Slot | null)[]; // Array representing the slots, null if empty
  usedWordIndices: number[]; // Indices of initialWords that have been placed in slots
  hintCount: number;

  // Actions
  initSituation: (situation: Situation) => void;
  setStep: (step: StepType) => void;
  nextPuzzle: () => boolean; // Returns true if moved to next puzzle, false if all puzzles done

  // Puzzle Actions
  initPuzzle: () => void;
  placeWord: (wordIndex: number, word: string) => void;
  removeWord: (slotIndex: number) => void;
  checkPuzzleAnswer: () => boolean; // Returns true if perfectly correct
  useHint: () => void;
  resetPuzzle: () => void;
}

export const useSituationStore = create<SituationState>((set, get) => ({
  currentSituation: null,
  currentStep: 'dialogue',
  currentPuzzleIndex: 0,

  slots: [],
  usedWordIndices: [],
  hintCount: 0,

  initSituation: (situation: Situation) => {
    set({
      currentSituation: situation,
      currentStep: 'dialogue',
      currentPuzzleIndex: 0,
      slots: [],
      usedWordIndices: [],
      hintCount: 0,
    });
  },

  setStep: (step: StepType) => {
    set({ currentStep: step });
  },

  nextPuzzle: () => {
    const { currentSituation, currentPuzzleIndex } = get();
    if (!currentSituation) return false;

    if (currentPuzzleIndex < currentSituation.puzzles.length - 1) {
      set({
        currentPuzzleIndex: currentPuzzleIndex + 1,
        currentStep: 'puzzle' // Stay in puzzle step, but new puzzle
      });
      get().initPuzzle();
      return true;
    }
    return false; // No more puzzles
  },

  initPuzzle: () => {
    const { currentSituation, currentPuzzleIndex } = get();
    if (!currentSituation) return;

    const puzzle = currentSituation.puzzles[currentPuzzleIndex];
    if (!puzzle) return;

    // Shuffle the puzzle answer to generate initialWords dynamically on initialization
    let initialWords = shuffleArray(puzzle.answer);
    if (puzzle.answer.length > 1) {
      let attempts = 0;
      while (
        JSON.stringify(initialWords) === JSON.stringify(puzzle.answer) &&
        attempts < 5
      ) {
        initialWords = shuffleArray(puzzle.answer);
        attempts++;
      }
    }

    // Create a new situation object with the mutated puzzle
    const newPuzzles = [...currentSituation.puzzles];
    newPuzzles[currentPuzzleIndex] = {
      ...puzzle,
      initialWords,
    };

    // Initialize slots with nulls, equal to the length of the answer
    const initialSlots = Array(puzzle.answer.length).fill(null);

    set({
      currentSituation: { ...currentSituation, puzzles: newPuzzles },
      slots: initialSlots,
      usedWordIndices: [],
      hintCount: 0,
    });
  },

  placeWord: (wordIndex: number, word: string) => {
    const { slots, usedWordIndices } = get();

    // Find first empty slot
    const emptyIndex = slots.findIndex((s) => s === null);
    if (emptyIndex === -1) return; // All slots full

    if (usedWordIndices.includes(wordIndex)) return; // Already used

    const newSlots = [...slots];
    newSlots[emptyIndex] = {
      id: `slot-${Date.now()}-${wordIndex}`,
      word,
      originalIndex: wordIndex,
      isWrong: false,
    };

    set({
      slots: newSlots,
      usedWordIndices: [...usedWordIndices, wordIndex],
    });
  },

  removeWord: (slotIndex: number) => {
    const { slots, usedWordIndices } = get();
    const slot = slots[slotIndex];

    if (!slot) return;

    const newSlots = [...slots];
    newSlots[slotIndex] = null;

    // Remove from used indices
    const newUsedIndices = usedWordIndices.filter((idx) => idx !== slot.originalIndex);

    set({
      slots: newSlots,
      usedWordIndices: newUsedIndices,
    });
  },

  checkPuzzleAnswer: () => {
    const { slots, currentSituation, currentPuzzleIndex } = get();
    if (!currentSituation) return false;

    const puzzle = currentSituation.puzzles[currentPuzzleIndex];
    if (!puzzle) return false;

    let isPerfect = true;
    const newSlots = [...slots];

    for (let i = 0; i < puzzle.answer.length; i++) {
      const slot = newSlots[i];
      if (!slot) {
        isPerfect = false;
        continue; // Empty slot is implicitly wrong
      }

      if (slot.word !== puzzle.answer[i]) {
        isPerfect = false;
        newSlots[i] = { ...slot, isWrong: true };
      } else {
        newSlots[i] = { ...slot, isWrong: false };
      }
    }

    set({ slots: newSlots });
    return isPerfect;
  },

  useHint: () => {
    const { hintCount } = get();
    set({ hintCount: hintCount + 1 });
  },

  resetPuzzle: () => {
    get().initPuzzle();
  },
}));
