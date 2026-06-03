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
  // Real backend (pronunciation_backend_pipeline) shape — IPA-token level.
  // The backend already produces user-facing Korean strings in `description`
  // and `tip`; the legacy expected/actual/note keys above are mock-only.
  issue_type?: string;
  severity?: 'low' | 'medium' | 'high' | string;
  description?: string;
  tip?: string;
  ref_token?: string | null;
  hyp_token?: string | null;
  cost?: number;
  acceptable?: boolean;
}

// UI-shaped issue card (after mapping). Surfaces an IPA-level mismatch with
// the backend-authored Korean description and tip.
export interface IssueCardUi {
  refToken: string;       // expected IPA (or '∅' for insertions)
  hypToken: string;       // observed IPA
  severity: 'low' | 'medium' | 'high';
  description: string;
  tip: string;
  /** Hangul syllables whose IPA contains the offending token — best-effort
   *  hint about WHERE in the utterance to apply the correction. May be empty
   *  when the IPA can't be resolved to any syllable. */
  relatedSyllables: string[];
}

export interface BackendReferencePhoneme {
  index: number;
  token: string;
  category: 'vowel' | 'consonant' | string;
  syllable_position?: string;
}

export interface BackendAlignmentStep {
  op: 'match' | 'substitute' | 'insert' | 'delete' | string;
  ref_token: { symbol: string; category?: string } | null;
  hyp_token: { symbol: string; category?: string } | null;
  ref_index: number | null;
  hyp_index: number | null;
  error_type?: string;
  cost?: number;
}

export interface BackendPhonemeResult {
  status: { evaluation_status: EvaluationStatus; status_message?: string };
  llm_feedback_input?: {
    reference_text?: string;
    score_breakdown?: BackendScoreBreakdown;
    issues?: BackendIssue[];
    feedback?: string;
  };
  prosody_input?: {
    reference_phonemes?: BackendReferencePhoneme[];
    [k: string]: unknown;
  };
  /** Full debug payload mirroring the saved artifact JSON. We only depend on
   *  `alignment.coarse.steps` so we can pin each IPA-level issue to its exact
   *  reference position; everything else is opaque. */
  full_payload?: {
    alignment?: {
      coarse?: {
        steps?: BackendAlignmentStep[];
      };
    };
  };
}

/** F0 comparison plot (lens-rule v3): per MFCC-DTW path-step z-score curves. */
export interface ProsodyBoundary {
  path_step: number;
  /** eojeol label at this step; the last entry is the end sentinel (label === null). */
  label: string | null;
}

export interface ProsodyPlot {
  learner_f0_zscore: number[];
  native_f0_zscore: number[];
  learner_time_at_step: number[]; // seconds, per step
  eojeol_boundaries: ProsodyBoundary[];
}

export interface ProsodyRecordWindow {
  learner_time_ratio?: [number, number];
  delta_diff?: number;
  syllable?: string;
}

/** Rule-based prosody finding (pitch_rising_excess, pitch_offset, …). */
export interface ProsodyRecord {
  eojeol_idx: number;
  rule_label: string;
  severity: 'minor' | 'major';
  trigger_lens?: string;
  evidence_metrics?: {
    eojeol_label?: string;
    windows?: ProsodyRecordWindow[];
    [k: string]: unknown;
  };
  syllable_hint?: string | null;
  feedback_text: string;
}

/** /analysis/full `prosody_result` = analyze() output. `{}` when not executed. */
export interface BackendProsodyResult {
  reference_text?: string;
  records?: ProsodyRecord[];
  summary_when_no_outlier?: string | null;
  prosody_plot?: ProsodyPlot;
}

export interface BackendFullResponse {
  phoneme_result: BackendPhonemeResult;
  prosody_result: BackendProsodyResult;
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
  /** Expected IPA for this Hangul syllable (e.g. "디" → "ti"). Best-effort:
   *  derived by grouping reference phonemes around vowel nuclei when the
   *  backend doesn't provide explicit syllable boundaries. May be undefined
   *  when syllable count and IPA group count don't agree. */
  ipa?: string;
}

/** One point of the F0 comparison chart, keyed by MFCC-DTW path step. */
export interface ProsodyPointUi {
  step: number;
  t: number; // learner time at this step (seconds)
  native: number | null;
  mine: number | null;
}

export interface ProsodyBoundaryUi {
  step: number;
  label: string;
}

export interface ProsodyZoneUi {
  from: number;
  to: number;
  rule: string;
  severity: 'minor' | 'major';
}

export interface ProsodyUi {
  points: ProsodyPointUi[];
  /** Labeled eojeol boundaries (end sentinel excluded) — drives X-axis ticks. */
  boundaries: ProsodyBoundaryUi[];
  maxStep: number;
  /** Problem regions derived from records, shaded on the chart. */
  zones: ProsodyZoneUi[];
  records: ProsodyRecord[];
  /** summary_when_no_outlier (present when records is empty). */
  summary?: string | null;
}

export interface AnalysisResult {
  status: EvaluationStatus;
  statusMessage?: string;
  score: number;
  message: string;
  scoreBreakdown?: BackendScoreBreakdown;
  phonemes: PhonemeResultUi[];
  /** IPA-level issue cards from the backend (description + tip in Korean). */
  issues: IssueCardUi[];
  /** F0 comparison chart + rule-based prosody feedback (undefined when not executed). */
  prosody?: ProsodyUi;
  aiFeedback: string;
  prosodyExecuted: boolean;
}

export type AnalysisStep = 'upload' | 'phoneme' | 'intonation' | 'feedback';

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

// --- New Types for Situation-Based Learning ---

export interface Character {
  id: string;
  name: string;
  avatar: string;
}

export interface DialogueLine {
  character: string;     // references Character.id
  text: string;
  isTarget?: boolean;
}

export interface PuzzleSentence {
  id: string;
  sentence: string;         // original full sentence
  answer: string[];         // correct order of words
  initialWords?: string[];  // randomly shuffled words (added on client)
  level: number;
  audio_path?: string | null;
}

export interface Situation {
  id: string;
  unit?: number;
  unit_title?: string;
  title: string;
  icon: string;
  location: string;
  level: number;
  grade?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  characters: Character[];
  dialogue: DialogueLine[];
  puzzles: PuzzleSentence[];
}
