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
import { cardUiExtras, emojiForType } from '../data/cards';

export function decorateCard(card: BackendCard): Card {
  const extras = cardUiExtras[card.id] ?? {};
  return {
    ...card,
    emoji: extras.emoji ?? emojiForType(card.type),
    romanized: extras.romanized,
    difficulty: extras.difficulty,
    phonemes: extras.phonemes,
  };
}

// Split a Korean string into per-syllable labels (drop spaces/punctuation).
function syllablesOf(text: string): string[] {
  return text.replace(/[\s?!.,]/g, '').split('').filter((c) => c.length > 0);
}

function issueLabel(it: BackendIssue): string {
  return it.syllable_label ?? it.ko ?? '';
}

function issueTarget(it: BackendIssue): string {
  return it.target ?? it.expected ?? '';
}

function issueUser(it: BackendIssue): string {
  return it.user ?? it.actual ?? '';
}

function issueNote(it: BackendIssue): string | undefined {
  return it.note ?? it.hint;
}

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
    const issue = issuesByLabel.get(ko) ?? issuesByIdx.get(i);
    if (!issue) {
      return { ko, target: '', user: '', correct: true };
    }
    return {
      ko,
      target: issueTarget(issue),
      user: issueUser(issue),
      correct: false,
      note: issueNote(issue),
    };
  });
}

// Synthesize a stylized pitch curve from prosody metrics so the chart still tells
// a useful story. Backend gives slope_diff/pearson per syllable, not raw pitch.
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
  if (score >= 90) return '훌륭해요!';
  if (score >= 80) return '잘했어요!';
  if (score >= 60) return '조금만 더!';
  return '다시 도전!';
}

function pickIntonationWarning(prosody: BackendProsodyPoint[]): string {
  if (prosody.length === 0) return '억양 데이터가 없어요';
  const last = prosody[prosody.length - 1];
  if (last && last.slope_diff < -0.05) return '문장 끝 억양이 부족해요';
  if (last && last.slope_diff > 0.1) return '문장 끝 억양이 과해요';
  const avgPearson =
    prosody.reduce((a, b) => a + (b.pearson ?? 0), 0) / Math.max(prosody.length, 1);
  if (avgPearson < 0.5) return '억양 흐름을 더 다듬어 보세요';
  return '억양이 자연스러워요';
}

function pickAiFeedback(
  status: string,
  reference: string,
  score: number,
  issues: BackendIssue[],
  fallback?: string,
): string {
  if (fallback) return fallback;
  if (status === 'retry') {
    return '녹음 신호가 부족해요. 조용한 곳에서 한 번 더 또렷하게 말해 주세요.';
  }
  if (status === 'discarded') {
    return '결과 신뢰도가 낮아요. 마이크와 환경을 확인하고 다시 시도해 보세요.';
  }
  if (issues.length === 0) {
    return `완벽해요! 🎉 "${reference}" 발음이 자연스러워요. 같은 호흡으로 다른 카드도 도전해보세요.`;
  }
  const wrong = issues[0];
  const label = issueLabel(wrong);
  const note = issueNote(wrong);
  return `전체적으로 잘했어요 (${score}점). '${label}' 발음을 다시 한 번 다듬어 보세요${note ? ` — ${note}` : ''}.`;
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
