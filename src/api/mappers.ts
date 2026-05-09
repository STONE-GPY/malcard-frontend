import type {
  AnalysisResult,
  BackendAlignmentStep,
  BackendCard,
  BackendFullResponse,
  BackendIssue,
  BackendProsodyPoint,
  BackendReferencePhoneme,
  Card,
  IntonationPointUi,
  IssueCardUi,
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
const issueTarget = (it: BackendIssue): string =>
  it.target ?? it.expected ?? it.ref_token ?? '';
const issueUser = (it: BackendIssue): string =>
  it.user ?? it.actual ?? it.hyp_token ?? '';
const issueNote = (it: BackendIssue): string | undefined =>
  it.note ?? it.hint ?? it.description;

function hasSyllableMapping(issues: BackendIssue[]): boolean {
  return issues.some(
    (it) => typeof it.syllable_idx === 'number' || !!it.syllable_label || !!it.ko,
  );
}

// Group flat IPA tokens into one bucket per Hangul syllable. The backend ships
// syllable_position="unknown" for every token, but `category` (vowel/consonant)
// is reliable, so we can approximate Korean's CV / CVC structure: one syllable
// per vowel nucleus, with leading consonants as onset and trailing consonants
// as coda. Best-effort for words with batchim — the algorithm tacks every
// consonant after a vowel onto the next syllable's onset rather than the
// current syllable's coda. Falls back to "no IPA hint" when the resulting
// syllable count doesn't match the Hangul reference text.
function groupIpaBySyllable(tokens: BackendReferencePhoneme[]): string[][] {
  const groups: string[][] = [];
  let pending: string[] = [];
  for (const t of tokens) {
    if (t.category === 'vowel') {
      groups.push([...pending, t.token]);
      pending = [];
    } else {
      pending.push(t.token);
    }
  }
  if (pending.length > 0) {
    if (groups.length > 0) groups[groups.length - 1].push(...pending);
    else groups.push(pending);
  }
  return groups;
}

// Same vowel-grouping logic as `groupIpaBySyllable` but returns a flat array
// where `map[i]` is the syllable index for reference token `i`. Used to turn
// alignment.steps' `ref_index` into a Hangul syllable.
function buildTokenToSyllableMap(tokens: BackendReferencePhoneme[]): number[] {
  const map: number[] = new Array(tokens.length);
  let syllableIdx = 0;
  let pendingStart = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].category === 'vowel') {
      for (let j = pendingStart; j <= i; j++) map[j] = syllableIdx;
      pendingStart = i + 1;
      syllableIdx++;
    }
  }
  // Trailing consonants → last syllable (CVC final coda)
  if (pendingStart < tokens.length) {
    const lastSyl = Math.max(0, syllableIdx - 1);
    for (let j = pendingStart; j < tokens.length; j++) map[j] = lastSyl;
  }
  return map;
}

// Build the per-syllable phoneme cards. The real backend produces IPA-level
// issues without syllable-index mapping (it can't reliably pin an inserted
// vowel to one Hangul syllable), so previously we mis-attributed every IPA
// issue to the Nth Hangul syllable and painted random syllables red. We now
// only paint syllables when the backend explicitly provides a mapping; the
// IPA-level errors are surfaced separately via `issues` cards.
function buildPhonemes(
  referenceText: string,
  issues: BackendIssue[],
  referencePhonemes?: BackendReferencePhoneme[],
): PhonemeResultUi[] {
  const syls = syllablesOf(referenceText);
  // Build per-syllable IPA hints when reference phoneme tokens are present
  // AND the grouping happens to land on the same syllable count as the
  // Hangul text. If counts disagree we hide the IPA hint rather than show
  // a misaligned one.
  let ipaForSyl: (i: number) => string | undefined = () => undefined;
  if (referencePhonemes && referencePhonemes.length > 0) {
    const groups = groupIpaBySyllable(referencePhonemes);
    if (groups.length === syls.length) {
      ipaForSyl = (i) => groups[i].join('');
    }
  }

  if (syls.length === 0 && issues.length > 0) {
    return issues.map((it) => ({
      ko: issueLabel(it) || '?',
      target: issueTarget(it),
      user: issueUser(it),
      correct: false,
      note: issueNote(it),
    }));
  }

  // No syllable-level mapping available — show all syllables as neutral
  // (correct: true) and let the dedicated issues section carry the detail.
  if (!hasSyllableMapping(issues)) {
    return syls.map((ko, i) => ({
      ko,
      target: '',
      user: '',
      correct: true,
      ipa: ipaForSyl(i),
    }));
  }

  const issuesByLabel = new Map<string, BackendIssue>();
  const issuesByIdx = new Map<number, BackendIssue>();
  issues.forEach((it) => {
    const label = issueLabel(it);
    if (label) issuesByLabel.set(label, it);
    if (typeof it.syllable_idx === 'number') issuesByIdx.set(it.syllable_idx, it);
  });

  return syls.map((ko, i) => {
    const issue = issuesByIdx.get(i) ?? issuesByLabel.get(ko);
    if (!issue) {
      return { ko, target: '', user: '', correct: true, ipa: ipaForSyl(i) };
    }
    return {
      ko,
      target: issueTarget(issue),
      user: issueUser(issue),
      correct: false,
      note: issueNote(issue),
      ipa: ipaForSyl(i),
    };
  });
}

// IPA-level issue cards. The backend already ships these with Korean
// `description` + `tip`, so we just normalize the shape and surface them in
// the result UI. `phonemes` provides the per-syllable IPA hints; `steps` is
// alignment.coarse.steps from the backend — when present, we use the exact
// `ref_index` of each substitution/deletion to pin it to the right syllable
// (instead of returning every syllable that happens to contain the token).
// For insertions we use the surrounding `ref_index`/`hyp_index` to locate the
// nearest reference syllable.
function buildIssueCards(
  issues: BackendIssue[],
  phonemes: PhonemeResultUi[],
  steps: BackendAlignmentStep[] | undefined,
  tokenToSyllable: number[] | undefined,
): IssueCardUi[] {
  const norm = (s: 'low' | 'medium' | 'high' | string | undefined): IssueCardUi['severity'] =>
    s === 'medium' || s === 'high' ? s : 'low';

  // Helpers ----------------------------------------------------------------
  const syllableLabelForRefIdx = (idx: number | null | undefined): string | null => {
    if (idx == null || !tokenToSyllable) return null;
    const sylIdx = tokenToSyllable[idx];
    if (sylIdx == null || sylIdx < 0 || sylIdx >= phonemes.length) return null;
    return phonemes[sylIdx].ko;
  };

  // An insertion at hyp_index `hi` means the user produced an extra phone
  // BEFORE the reference position that matched at hyp position hi+1. So we
  // prefer the smallest hyp_index > hi with a real ref_index ("the syllable
  // the user was about to pronounce when they slipped in the extra sound").
  // Falls back to the previous matched ref position if the insertion is at
  // the very end of the utterance.
  const syllableForInsertion = (hypIdx: number | null | undefined): string | null => {
    if (hypIdx == null || !steps) return null;
    let after: number | null = null;
    let afterHyp = Infinity;
    let before: number | null = null;
    let beforeHyp = -Infinity;
    for (const s of steps) {
      if (s.hyp_index == null || s.ref_index == null) continue;
      if (s.hyp_index > hypIdx && s.hyp_index < afterHyp) {
        afterHyp = s.hyp_index;
        after = s.ref_index;
      }
      if (s.hyp_index < hypIdx && s.hyp_index > beforeHyp) {
        beforeHyp = s.hyp_index;
        before = s.ref_index;
      }
    }
    return syllableLabelForRefIdx(after ?? before);
  };

  // Walk steps and collect (refIndex, hypIndex) entries that match an issue's
  // (ref_token, hyp_token) pair. Returns Hangul syllable labels for those
  // positions (deduped, in original order).
  const findRelatedFromSteps = (it: BackendIssue): string[] => {
    if (!steps) return [];
    const refSym = it.ref_token ?? null;
    const hypSym = it.hyp_token ?? null;
    const labels: string[] = [];
    const seen = new Set<string>();
    for (const s of steps) {
      const sRef = s.ref_token?.symbol ?? null;
      const sHyp = s.hyp_token?.symbol ?? null;
      let label: string | null = null;
      if (s.op === 'substitute' && sRef === refSym && sHyp === hypSym) {
        label = syllableLabelForRefIdx(s.ref_index);
      } else if (s.op === 'delete' && sRef === refSym && hypSym == null) {
        label = syllableLabelForRefIdx(s.ref_index);
      } else if (s.op === 'insert' && sHyp === hypSym && refSym == null) {
        label = syllableForInsertion(s.hyp_index);
      }
      if (label && !seen.has(label)) {
        seen.add(label);
        labels.push(label);
      }
    }
    return labels;
  };

  // Fallback for when alignment steps aren't available: scan syllable IPAs
  // for any occurrence of the offending token. Coarse — a single token can
  // match multiple syllables — but better than no hint at all.
  const findRelatedByToken = (token: string | null | undefined): string[] => {
    if (!token || token === '∅') return [];
    return phonemes
      .filter((p) => p.ipa && p.ipa.includes(token))
      .map((p) => p.ko);
  };

  // Build cards ------------------------------------------------------------
  return issues
    .map((it) => {
      const ref = it.ref_token ?? it.expected ?? it.target ?? '∅';
      const hyp = it.hyp_token ?? it.actual ?? it.user ?? '?';
      const description = it.description ?? it.note ?? it.hint ?? '';
      const tip = it.tip ?? '';
      if (!description && !tip) return null;
      // Prefer the precise lookup via alignment steps; fall back to the
      // coarse token-scan if steps aren't provided (e.g. mock scenarios).
      let relatedSyllables = findRelatedFromSteps(it);
      if (relatedSyllables.length === 0) {
        const seek = ref && ref !== '∅' ? ref : hyp;
        relatedSyllables = findRelatedByToken(seek);
      }
      return {
        refToken: ref || '∅',
        hypToken: hyp || '?',
        severity: norm(it.severity),
        description,
        tip,
        relatedSyllables,
      } satisfies IssueCardUi;
    })
    .filter((x): x is IssueCardUi => x !== null);
}

function buildIntonation(
  referenceText: string,
  prosody: BackendProsodyPoint[],
): IntonationPointUi[] {
  const syls = syllablesOf(referenceText);
  const baseLow = 60;
  const baseHigh = 92;

  // No real prosody data — return empty so the UI hides the intonation
  // section entirely instead of fabricating a flat native==mine line that
  // implies analysis succeeded.
  if (prosody.length === 0) {
    return [];
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
  // Empty prosody is handled upstream by buildIntonation returning [] so the
  // intonation section doesn't render at all — no warning needed here.
  if (prosody.length === 0) return '';
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
  // Prefer the backend-authored Korean description + tip when present —
  // they carry concrete, actionable advice ("입 벌림과 혀 위치를 ...").
  // Only fall back to the i18n template when the backend didn't write any.
  const description = wrong.description?.trim();
  const tip = wrong.tip?.trim();
  if (description || tip) {
    return [description, tip].filter(Boolean).join(' ');
  }
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

  const referencePhonemes = res.phoneme_result.prosody_input?.reference_phonemes;
  const phonemes = buildPhonemes(reference, issues, referencePhonemes);
  const alignmentSteps = res.phoneme_result.full_payload?.alignment?.coarse?.steps;
  const tokenToSyllable = referencePhonemes
    ? buildTokenToSyllableMap(referencePhonemes)
    : undefined;
  return {
    status,
    statusMessage,
    score,
    message: pickFeedbackMessage(score),
    scoreBreakdown: breakdown,
    phonemes,
    issues: buildIssueCards(issues, phonemes, alignmentSteps, tokenToSyllable),
    intonation: buildIntonation(reference, res.prosody_result ?? []),
    intonationWarning: pickIntonationWarning(res.prosody_result ?? []),
    aiFeedback: pickAiFeedback(status, reference, score, issues, llmFeedback),
    prosodyExecuted: res.pipeline_state?.prosody_executed ?? false,
  };
}

// Dev-only window export so the in-browser dev panel and tests can rerun the
// mapper against a saved backend response without going through the analyzer.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as Window & { __mapAnalysisResponse?: typeof mapAnalysisResponse }).__mapAnalysisResponse =
    mapAnalysisResponse;
}
