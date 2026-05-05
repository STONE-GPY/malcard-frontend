// Backend card schema (per /cards spec)
export interface BackendCard {
  id: string;
  type: string; // Korean type label (e.g. "일상문장")
  korean: string;
  russian: string;
  prompt_question: string;
  phoneme_focus?: string;
}

// UI augmentation fields not provided by backend
export interface CardUiExtras {
  emoji?: string;
  romanized?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  phonemes?: { ko: string; ipa: string }[];
}

export type Card = BackendCard & CardUiExtras;

// Frontend filter category id (mapped to backend `type` query param via apiType)
export type CategoryId = 'all' | 'daily' | 'idioms' | 'situations' | 'words';

// Backend analysis response (subset we depend on)
export type EvaluationStatus = 'ready' | 'retry' | 'discarded';

export interface BackendScoreBreakdown {
  overall: number;
  consonant?: number;
  vowel?: number;
  coda?: number;
  fluency_like?: number;
}

export interface BackendIssue {
  syllable_idx?: number;
  syllable_label?: string;
  expected?: string;
  actual?: string;
  target?: string;
  user?: string;
  ko?: string;
  hint?: string;
  note?: string;
}

export interface BackendPhonemeResult {
  status: { evaluation_status: EvaluationStatus; status_message?: string };
  llm_feedback_input?: {
    reference_text?: string;
    score_breakdown?: BackendScoreBreakdown;
    issues?: BackendIssue[];
    feedback?: string;
  };
  prosody_input?: unknown;
}

export interface BackendProsodyPoint {
  syllable_idx: number;
  syllable_label: string;
  native_start: number;
  learner_start: number;
  rmse: number;
  pearson: number;
  slope_diff: number;
  duration_ratio: number;
}

export interface BackendFullResponse {
  phoneme_result: BackendPhonemeResult;
  prosody_result: BackendProsodyPoint[];
  pipeline_state: {
    prosody_executed: boolean;
    reason: string;
  };
}

// UI-shaped analysis result (after mapping)
export interface PhonemeResultUi {
  ko: string;
  user: string;
  target: string;
  correct: boolean;
  note?: string;
}

export interface IntonationPointUi {
  c: string;
  native: number;
  mine: number;
}

export interface AnalysisResult {
  status: EvaluationStatus;
  statusMessage?: string;
  score: number;
  message: string;
  scoreBreakdown?: BackendScoreBreakdown;
  phonemes: PhonemeResultUi[];
  intonation: IntonationPointUi[];
  intonationWarning: string;
  aiFeedback: string;
  prosodyExecuted: boolean;
}

export type AnalysisStep = 'upload' | 'phoneme' | 'intonation' | 'feedback';

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
