import type {
  AnalysisResult,
  BackendCard,
  BackendFullResponse,
  BackendIssue,
  BackendProsodyPoint,
  Card,
  IntonationPointUi,
  PhonemeResultUi,
} from '../types';
import { difficultyForCard, emojiForCard } from '../data/cards';

export function decorateCard(card: BackendCard): Card {
  return {
    ...card,
    emoji: emojiForCard(card),
    difficulty: difficultyForCard(card),
    // romanized + per-syllable phoneme breakdown not provided by backend.
  };
}

function syllablesOf(text: string): string[] {
  return text.replace(/[\s?!.,]/g, '').split('').filter((c) => c.length > 0);
}

const issueLabel = (it: BackendIssue): string => it.syllable_label ?? it.ko ?? '';
const issueTarget = (it: BackendIssue): string => it.target ?? it.expected ?? '';
const issueUser = (it: BackendIssue): string => it.user ?? it.actual ?? '';
const issueNote = (it: BackendIssue): string | undefined => it.note ?? it.hint;

function buildPhonemes(referenceText: string, issues: BackendIssue[]): PhonemeResultUi[] {
  const syls = syllablesOf(referenceText);
  if (syls.length === 0 && issues.length > 0) {
    return issues.map((it) => ({
      ko: issueLabel(it) || '?',
      target: issueTarget(it),
      user: issueUser(it),
      correct: false,
      note: issueNote(it),
    }));
  }

  const issuesByLabel = new Map<string, BackendIssue>();
  const issuesByIdx = new Map<number, BackendIssue>();
  issues.forEach((it, i) => {
    const label = issueLabel(it);
    if (label) issuesByLabel.set(label, it);
    if (typeof it.syllable_idx === 'number') issuesByIdx.set(it.syllable_idx, it);
    else issuesByIdx.set(i, it);
  });

  return syls.map((ko, i) => {
    const issue = issuesByIdx.get(i) ?? issuesByLabel.get(ko);
    if (!issue) return { ko, target: '', user: '', correct: true };
    return {
      ko,
      target: issueTarget(issue),
      user: issueUser(issue),
      correct: false,
      note: issueNote(issue),
    };
  });
}

function buildIntonation(
  referenceText: string,
  prosody: BackendProsodyPoint[],
): IntonationPointUi[] {
  const syls = syllablesOf(referenceText);
  const baseLow = 60;
  const baseHigh = 92;

  if (prosody.length === 0) {
    return syls.map((c, i) => {
      const t = i / Math.max(syls.length - 1, 1);
      const native = Math.round(baseLow + t * (baseHigh - baseLow));
      return { c, native, mine: native };
    });
  }

  return prosody.map((p, i) => {
    const t = i / Math.max(prosody.length - 1, 1);
    const native = Math.round(baseLow + t * (baseHigh - baseLow));
    const deviation = (p.slope_diff ?? 0) * 35;
    const mine = Math.round(Math.max(40, Math.min(100, native + deviation)));
    return { c: p.syllable_label || syls[i] || '?', native, mine };
  });
}

function pickFeedbackMessage(score: number): string {
  if (score >= 90) return 'message.excellent';
  if (score >= 80) return 'message.great';
  if (score >= 60) return 'message.keepGoing';
  return 'message.tryAgain';
}

function pickIntonationWarning(prosody: BackendProsodyPoint[]): string {
  if (prosody.length === 0) return 'intonation.empty';
  const last = prosody[prosody.length - 1];
  if (last && last.slope_diff < -0.05) return 'intonation.endRiseLow';
  if (last && last.slope_diff > 0.1) return 'intonation.endRiseHigh';
  const avgPearson =
    prosody.reduce((a, b) => a + (b.pearson ?? 0), 0) / Math.max(prosody.length, 1);
  if (avgPearson < 0.5) return 'intonation.choppy';
  return 'intonation.natural';
}

function pickAiFeedback(
  status: string,
  reference: string,
  score: number,
  issues: BackendIssue[],
  fallback?: string,
): string {
  if (fallback) return fallback;
  if (status === 'retry') return 'feedback.retry';
  if (status === 'discarded') return 'feedback.discarded';
  if (issues.length === 0) {
    return `feedback.perfect|${reference}`;
  }
  const wrong = issues[0];
  const label = issueLabel(wrong);
  const note = issueNote(wrong) ?? '';
  return `feedback.imperfect|${label}|${score}|${note}`;
}

export function mapAnalysisResponse(
  res: BackendFullResponse,
  referenceText: string,
): AnalysisResult {
  const status = res.phoneme_result.status.evaluation_status;
  const statusMessage = res.phoneme_result.status.status_message;
  const breakdown = res.phoneme_result.llm_feedback_input?.score_breakdown;
  const issues = res.phoneme_result.llm_feedback_input?.issues ?? [];
  const reference = res.phoneme_result.llm_feedback_input?.reference_text ?? referenceText;
  const llmFeedback = res.phoneme_result.llm_feedback_input?.feedback;
  const score = Math.round(breakdown?.overall ?? 0);

  return {
    status,
    statusMessage,
    score,
    message: pickFeedbackMessage(score),
    scoreBreakdown: breakdown,
    phonemes: buildPhonemes(reference, issues),
    intonation: buildIntonation(reference, res.prosody_result ?? []),
    intonationWarning: pickIntonationWarning(res.prosody_result ?? []),
    aiFeedback: pickAiFeedback(status, reference, score, issues, llmFeedback),
    prosodyExecuted: res.pipeline_state?.prosody_executed ?? false,
  };
}
