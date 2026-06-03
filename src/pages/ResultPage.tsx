import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from 'recharts';
import { useCardStore } from '../stores/useCardStore';
import { useHistoryStore } from '../stores/useHistoryStore';
import { tokens } from '../theme/tokens';
import {
  IconAlert,
  IconArrowRight,
  IconRotate,
  IconSparkle,
  IconX,
} from '../components/icons';
import { errorI18nKey } from '../api/client';
import { dailyProgress, recentAttempts } from '../lib/stats';

function ScoreRing({ score }: { score: number }) {
  const size = 92;
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={8}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#fff"
          strokeWidth={8}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: -0.5 }}>
          {score}
        </div>
        <div style={{ fontSize: 10, opacity: 0.85, fontWeight: 600, letterSpacing: 0.6 }}>
          / 100
        </div>
      </div>
    </div>
  );
}

const sectionStyle: CSSProperties = {
  margin: `${tokens.gap + 8}px ${tokens.pad}px 0`,
  padding: 18,
  background: '#FFFFFF',
  borderRadius: tokens.radiusLg,
  border: '1px solid rgba(15,23,42,0.05)',
  boxShadow: '0 1px 3px rgba(15,23,42,0.03), 0 4px 14px -8px rgba(15,23,42,0.06)',
};

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}

// Render an IPA string with substrings matching any of `targets` underlined
// in red — visually links the syllable card to the IPA-level issue cards.
function renderIpaWithHighlight(ipa: string, targets: string[]): ReactNode {
  // Sort by length so longer matches (e.g. "jʌ") win over shorter ones ("j").
  const sorted = [...targets].filter(Boolean).sort((a, b) => b.length - a.length);
  if (sorted.length === 0) return ipa;
  const out: ReactNode[] = [];
  let i = 0;
  while (i < ipa.length) {
    const hit = sorted.find((t) => ipa.startsWith(t, i));
    if (hit) {
      out.push(
        <span
          key={`h-${i}`}
          style={{ color: '#991B1B', fontWeight: 800, textDecoration: 'underline' }}
        >
          {hit}
        </span>,
      );
      i += hit.length;
    } else {
      let j = i + 1;
      while (j < ipa.length && !sorted.some((t) => ipa.startsWith(t, j))) j++;
      out.push(<span key={`p-${i}`}>{ipa.slice(i, j)}</span>);
      i = j;
    }
  }
  return out;
}

export default function ResultPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    analysisResult,
    analysisError,
    currentCard,
    nextCard,
    setAudioBlob,
    setAnalysisResult,
    setAnalysisError,
  } = useCardStore();
  const recordAttempt = useHistoryStore((s) => s.recordAttempt);
  const history = useHistoryStore((s) => s.history);
  const goal = useHistoryStore((s) => s.goal);
  const lastSeenGoalDate = useHistoryStore((s) => s.lastSeenGoalDate);
  const markGoalSeenToday = useHistoryStore((s) => s.markGoalSeenToday);
  const recordedRef = useRef(false);
  const navigatedToCompleteRef = useRef(false);

  useEffect(() => {
    if (!analysisError && (!analysisResult || !currentCard)) {
      navigate('/', { replace: true });
      return;
    }
    if (recordedRef.current) return;
    if (analysisResult && currentCard && analysisResult.status === 'ready') {
      recordedRef.current = true;
      recordAttempt({
        cardId: currentCard.id,
        score: analysisResult.score,
        korean: currentCard.korean,
        type: currentCard.type,
      });
    }
  }, [analysisResult, analysisError, currentCard, recordAttempt, navigate]);

  const today = new Date();
  const todayKeyStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const progress = dailyProgress(history, goal, today);

  // After recordAttempt fires, jump to /daily-complete the first time today's goal is achieved.
  useEffect(() => {
    if (!recordedRef.current) return;
    if (!analysisResult || analysisResult.status !== 'ready') return;
    if (navigatedToCompleteRef.current) return;
    if (progress.achieved && lastSeenGoalDate !== todayKeyStr) {
      navigatedToCompleteRef.current = true;
      markGoalSeenToday();
      navigate('/daily-complete', { replace: false });
    }
  }, [progress.achieved, lastSeenGoalDate, todayKeyStr, analysisResult, markGoalSeenToday, navigate]);

  if (!currentCard && !analysisError) return null;

  const handleRetry = () => {
    setAudioBlob(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    navigate('/learn');
  };
  const handleNext = () => {
    setAnalysisError(null);
    nextCard();
    navigate('/learn');
  };
  const handleClose = () => {
    setAnalysisError(null);
    navigate('/');
  };

  // Error path
  if (analysisError) {
    return (
      <PageShell
        title={t('result.title')}
        onClose={handleClose}
        actions={<ActionsBar onRetry={handleRetry} onNext={handleNext} />}
      >
        <div
          data-testid="result-error"
          style={{
            margin: `12px ${tokens.pad}px 0`,
            padding: 20,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: tokens.radiusLg,
            color: '#991B1B',
            animation: 'mc-fade-up 0.4s both',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            {t('result.errorTitle')}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            {t(errorI18nKey(analysisError.code))}
          </div>
          <div style={{ fontSize: 11, marginTop: 8, opacity: 0.6 }}>
            {t('result.errorCode', { code: analysisError.code })}
          </div>
        </div>
      </PageShell>
    );
  }

  if (!analysisResult || !currentCard) return null;

  const r = analysisResult;

  // retry / discarded
  if (r.status === 'retry' || r.status === 'discarded') {
    const isRetry = r.status === 'retry';
    return (
      <PageShell
        title={t('result.title')}
        onClose={handleClose}
        actions={<ActionsBar onRetry={handleRetry} onNext={handleNext} />}
      >
        <div
          data-testid={isRetry ? 'retry-banner' : 'discarded-banner'}
          style={{
            margin: `12px ${tokens.pad}px 0`,
            padding: 20,
            background: isRetry ? '#FFFBEB' : '#FEF2F2',
            border: `1px solid ${isRetry ? '#FDE68A' : '#FECACA'}`,
            borderRadius: tokens.radiusLg,
            color: isRetry ? '#B45309' : '#991B1B',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            animation: 'mc-fade-up 0.4s both',
          }}
        >
          <div style={{ flexShrink: 0, marginTop: 2 }}>
            <IconAlert size={22} stroke={2.2} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              {isRetry ? t('result.retryBannerTitle') : t('result.discardedBannerTitle')}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              {isRetry ? t('result.retryBannerBody') : t('result.discardedBannerBody')}
            </div>
            {r.statusMessage && (
              <div style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>
                {t('result.detail')}: {r.statusMessage}
              </div>
            )}
          </div>
        </div>
        <FeedbackBubble text={resolveFeedback(t, r.aiFeedback)} />
      </PageShell>
    );
  }

  // ready
  // Use the precise syllable list each issue card resolved to (via alignment
  // ref_index) instead of "any syllable containing the IPA token". This keeps
  // 서/려 from being flagged when the actual issue was only at 어, and lets
  // each syllable highlight its OWN matching tokens rather than every issue's.
  const flaggedSyllables = useMemo(
    () => new Set(r.issues.flatMap((i) => i.relatedSyllables)),
    [r.issues],
  );
  const tokensForSyllable = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const iss of r.issues) {
      if (!iss.refToken || iss.refToken === '∅') continue;
      for (const syl of iss.relatedSyllables) {
        const arr = map.get(syl) ?? [];
        if (!arr.includes(iss.refToken)) arr.push(iss.refToken);
        map.set(syl, arr);
      }
    }
    return map;
  }, [r.issues]);
  const isFlagged = (ko: string) => flaggedSyllables.has(ko);
  const flaggedCount = r.phonemes.filter(
    (p) => !p.correct || isFlagged(p.ko),
  ).length;
  const correctCount = r.phonemes.length - flaggedCount;
  const wrongPhoneme = r.phonemes.find((p) => !p.correct);
  const attempts = recentAttempts(history, String(currentCard.id));

  return (
    <PageShell
      title={t('result.title')}
      onClose={handleClose}
      actions={<ActionsBar onRetry={handleRetry} onNext={handleNext} />}
    >
      <div
        data-testid="score-card"
        style={{
          margin: `8px ${tokens.pad}px 0`,
          padding: 24,
          background: tokens.primaryGrad,
          borderRadius: tokens.radiusLg,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          boxShadow: `0 16px 36px -10px ${tokens.primaryShadow}`,
          position: 'relative',
          overflow: 'hidden',
          animation: 'mc-flip-in 0.6s cubic-bezier(.2,.8,.2,1) both',
          perspective: 800,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -50,
            right: -30,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
          }}
        />
        <ScoreRing score={r.score} />
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              opacity: 0.8,
              lineHeight: 1.3,
            }}
          >
            {t('result.totalScore')}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: -0.4,
              marginTop: 6,
              lineHeight: 1.25,
            }}
          >
            {t(r.message)}
          </div>
          <div
            style={{
              fontFamily: '"Noto Sans KR", system-ui',
              fontSize: 13,
              marginTop: 8,
              opacity: 0.92,
              fontWeight: 500,
              lineHeight: 1.4,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            «{currentCard.korean}»
          </div>
        </div>
      </div>

      {/* Daily progress mini bar */}
      <div
        style={{
          margin: `${tokens.gap + 8}px ${tokens.pad}px 0`,
          padding: '12px 14px',
          background: '#FFFFFF',
          borderRadius: tokens.radiusMd,
          border: tokens.border,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: tokens.shadowSm,
        }}
        data-testid="daily-progress"
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: '#94A3B8',
            }}
          >
            {t('result.todayProgressLabel')}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            {progress.current} / {progress.target}{' '}
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>
              ({goal.type === 'cardCount' ? t('goal.typeCount') : t('goal.typeAvg')})
            </span>
          </div>
          <div
            style={{
              marginTop: 6,
              height: 6,
              background: tokens.primarySoft,
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress.ratio * 100}%`,
                height: '100%',
                background: tokens.primaryGradFlat,
                borderRadius: 999,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
        {progress.achieved && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#10B981',
              background: '#ECFDF5',
              padding: '4px 8px',
              borderRadius: 999,
            }}
          >
            ✓
          </div>
        )}
      </div>

      <div style={sectionStyle} data-testid="phoneme-section">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>
            {t('result.phonemeSection')}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#10B981',
              background: '#ECFDF5',
              padding: '4px 9px',
              borderRadius: 999,
            }}
          >
            {t('result.accuracy', { correct: correctCount, total: r.phonemes.length })}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          {r.phonemes.map((p, i) => {
            const flagged = !p.correct || isFlagged(p.ko);
            const sylTokens = tokensForSyllable.get(p.ko) ?? [];
            return (
              <div
                key={i}
                style={{
                  flex: '1 1 auto',
                  minWidth: 64,
                  padding: '10px 8px',
                  borderRadius: tokens.radiusSm,
                  background: flagged ? '#FEF2F2' : '#ECFDF5',
                  border: `1.5px solid ${flagged ? '#FECACA' : '#A7F3D0'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: '"Noto Sans KR", system-ui',
                    fontSize: 22,
                    fontWeight: 700,
                    color: flagged ? '#991B1B' : '#065F46',
                    lineHeight: 1,
                  }}
                >
                  {p.ko}
                </span>
                {p.ipa ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: 0.2,
                      color: flagged ? '#DC2626' : '#10B981',
                      fontFamily: '"Noto Sans", system-ui',
                    }}
                  >
                    {flagged && sylTokens.length > 0
                      ? renderIpaWithHighlight(p.ipa, sylTokens)
                      : p.ipa}
                  </span>
                ) : !p.correct ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {p.user && (
                      <span style={{ color: '#DC2626', textDecoration: 'line-through' }}>
                        {p.user}
                      </span>
                    )}
                    <span style={{ color: '#94A3B8' }}>→</span>
                    <span style={{ color: '#10B981' }}>{p.target}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        {wrongPhoneme && (
          <div
            style={{
              marginTop: 12,
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: tokens.radiusSm,
              padding: '12px 14px',
              display: 'flex',
              gap: 10,
            }}
          >
            <div style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }}>
              <IconAlert size={18} stroke={2.2} />
            </div>
            <div style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.5 }}>
              <b style={{ fontFamily: '"Noto Sans KR", system-ui' }}>{wrongPhoneme.ko}</b>{' '}
              {t('result.correctionPrefix')}{' '}
              {wrongPhoneme.user && (
                <code style={{ background: '#FEE2E2', padding: '1px 5px', borderRadius: 4 }}>
                  {wrongPhoneme.user}
                </code>
              )}{' '}
              {t('result.correctionMid')}{' '}
              {wrongPhoneme.target && (
                <code
                  style={{
                    background: '#DCFCE7',
                    color: '#065F46',
                    padding: '1px 5px',
                    borderRadius: 4,
                  }}
                >
                  {wrongPhoneme.target}
                </code>
              )}
              {wrongPhoneme.note ? ` — ${wrongPhoneme.note}` : ''}.
            </div>
          </div>
        )}
      </div>

      {r.issues.length > 0 && (
        <div style={sectionStyle} data-testid="issues-section">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>
              {t('result.issuesTitle')}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#94A3B8',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {r.issues.length}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {r.issues.map((iss, i) => {
              const sevColor =
                iss.severity === 'high'
                  ? '#DC2626'
                  : iss.severity === 'medium'
                    ? '#D97706'
                    : '#6366F1';
              const sevBg =
                iss.severity === 'high'
                  ? '#FEF2F2'
                  : iss.severity === 'medium'
                    ? '#FFFBEB'
                    : tokens.primarySoft;
              return (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    borderRadius: tokens.radiusSm,
                    background: sevBg,
                    border: `1px solid ${sevColor}33`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      flexWrap: 'wrap',
                    }}
                  >
                    <code
                      style={{
                        background: '#FEE2E2',
                        color: '#991B1B',
                        padding: '2px 7px',
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      {iss.hypToken}
                    </code>
                    <span style={{ color: '#94A3B8' }}>→</span>
                    <code
                      style={{
                        background: '#DCFCE7',
                        color: '#065F46',
                        padding: '2px 7px',
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      {iss.refToken}
                    </code>
                    {iss.relatedSyllables.length > 0 && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          color: sevColor,
                          background: '#FFFFFF',
                          padding: '2px 8px',
                          borderRadius: 999,
                          border: `1px solid ${sevColor}33`,
                        }}
                      >
                        <span style={{ opacity: 0.7 }}>📍</span>
                        <span style={{ fontFamily: '"Noto Sans KR", system-ui' }}>
                          {iss.relatedSyllables.join(' · ')}
                        </span>
                      </span>
                    )}
                  </div>
                  {iss.description && (
                    <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.45 }}>
                      {iss.description}
                    </div>
                  )}
                  {iss.tip && (
                    <div
                      style={{
                        fontSize: 12,
                        color: sevColor,
                        lineHeight: 1.4,
                        marginTop: 2,
                      }}
                    >
                      💡 {iss.tip}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {r.prosodyExecuted && r.prosody && r.prosody.points.length > 0 && (() => {
        const p = r.prosody;
        const zoneFill = (sev: 'minor' | 'major') =>
          sev === 'major' ? 'rgba(231,76,60,0.09)' : 'rgba(243,156,18,0.10)';
        const sevColor = (sev: 'minor' | 'major') => (sev === 'major' ? '#E74C3C' : '#F39C12');
        return (
          <div style={sectionStyle} data-testid="intonation-section">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>
                {t('result.intonation')}
              </div>
              {p.records.length > 0 ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#FEF3C7',
                    color: '#B45309',
                    padding: '5px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    border: '1px solid rgba(245,158,11,0.2)',
                  }}
                >
                  <IconAlert size={12} stroke={2.4} />{' '}
                  {t('result.prosodyIssues', { count: p.records.length })}
                </div>
              ) : (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#DCFCE7',
                    color: '#15803D',
                    padding: '5px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    border: '1px solid rgba(34,197,94,0.2)',
                  }}
                >
                  {p.summary || t('result.prosodyGood')}
                </div>
              )}
            </div>

            <div style={{ height: 200, margin: '0 -8px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={p.points} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
                  {p.zones.map((z, i) => (
                    <ReferenceArea
                      key={`z${i}`}
                      x1={z.from}
                      x2={z.to}
                      y1={-3.5}
                      y2={3.5}
                      fill={zoneFill(z.severity)}
                      stroke="none"
                      ifOverflow="hidden"
                    />
                  ))}
                  <ReferenceLine y={0} stroke="rgba(0,0,0,0.18)" strokeDasharray="6 4" />
                  {p.boundaries.map((b, i) => (
                    <ReferenceLine key={`b${i}`} x={b.step} stroke="#CBD5E1" strokeDasharray="4 4" />
                  ))}
                  <XAxis
                    dataKey="step"
                    type="number"
                    domain={[0, p.maxStep]}
                    ticks={p.boundaries.map((b) => b.step)}
                    tickFormatter={(v) => p.boundaries.find((b) => b.step === v)?.label ?? ''}
                    tick={{ fontSize: 12, fill: '#64748B', fontFamily: 'Noto Sans KR' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[-3.5, 3.5]}
                    allowDataOverflow
                    ticks={[-3, -2, -1, 0, 1, 2, 3]}
                    width={24}
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0F172A',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: 12,
                      color: '#fff',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                    }}
                    labelStyle={{ color: '#A5B4FC', fontWeight: 600 }}
                    itemStyle={{ color: '#fff' }}
                    labelFormatter={(_label, payload) => {
                      const pt = payload?.[0]?.payload as { t?: number; step?: number } | undefined;
                      if (typeof pt?.t === 'number') return `${pt.t.toFixed(2)}s`;
                      return `step ${pt?.step ?? ''}`;
                    }}
                    formatter={(value) => (typeof value === 'number' ? value.toFixed(2) : '—')}
                  />
                  <Line
                    type="monotone"
                    dataKey="native"
                    stroke="#185FA5"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                    name={t('result.native')}
                  />
                  <Line
                    type="monotone"
                    dataKey="mine"
                    stroke="#993C1D"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                    name={t('result.mine')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 16,
                justifyContent: 'center',
                marginTop: 4,
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 14, height: 3, background: '#185FA5', borderRadius: 2 }} />
                <span style={{ color: '#475569', fontWeight: 500 }}>{t('result.native')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 14, height: 3, background: '#993C1D', borderRadius: 2 }} />
                <span style={{ color: '#475569', fontWeight: 500 }}>{t('result.mine')}</span>
              </div>
            </div>

            {p.records.length > 0 && (
              <div
                data-testid="prosody-records"
                style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}
              >
                {p.records.map((rec, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#F8FAFC',
                      borderRadius: 10,
                      borderLeft: `3px solid ${sevColor(rec.severity)}`,
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: sevColor(rec.severity),
                          flexShrink: 0,
                        }}
                      />
                      {rec.evidence_metrics?.eojeol_label && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                          {rec.evidence_metrics.eojeol_label}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.55 }}>
                      {rec.feedback_text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Score history mini chart */}
      <div style={sectionStyle} data-testid="history-mini">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>
            {t('result.historyTitle')}
          </div>
        </div>
        {attempts.length <= 1 ? (
          <div style={{ fontSize: 13, color: '#94A3B8' }}>{t('result.historyEmpty')}</div>
        ) : (
          <div style={{ height: 80 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={attempts.slice(-10).map((a, i) => ({ i: i + 1, score: a.score }))}
                margin={{ top: 4, right: 4, left: -32, bottom: 0 }}
              >
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  contentStyle={{
                    background: '#0F172A',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 11,
                    color: '#fff',
                  }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#A5B4FC' }}
                />
                <Bar dataKey="score" fill={tokens.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <FeedbackBubble text={resolveFeedback(t, r.aiFeedback)} />
    </PageShell>
  );
}

// Resolve a feedback descriptor produced by the analyzer:
//   "feedback.perfect|<ref>"            → t('feedback.perfect', { ref })
//   "feedback.imperfect|<ko>|<score>|<note>"
//   plain string → returned as-is
function resolveFeedback(
  t: (key: string, vars?: Record<string, string | number>) => string,
  descriptor: string,
): string {
  if (!descriptor) return '';
  if (descriptor === 'feedback.retry' || descriptor === 'feedback.discarded') {
    return t(descriptor);
  }
  const [head, ...rest] = descriptor.split('|');
  if (head === 'feedback.perfect') {
    return t('feedback.perfect', { ref: rest[0] ?? '' });
  }
  if (head === 'feedback.imperfect') {
    const [ko = '', score = '0', note = ''] = rest;
    const noteSuffix = note ? interpolate(t('feedback.noteSuffix'), { note }) : '';
    return interpolate(t('feedback.imperfect'), { ko, score, noteSuffix });
  }
  return descriptor;
}

function PageShell({
  title,
  onClose,
  actions,
  children,
}: {
  title: string;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div
      data-testid="result-page"
      style={{
        // Outer is flex column; the middle wrapper owns the scroll.
        // Actions bar (if any) sits OUTSIDE the scroll wrapper so it is always
        // pinned to the bottom of the page (no need for sticky/marginTop:auto
        // tricks). Putting overflow:auto on the same element as flex column
        // would shrink children instead of scrolling — see ProfilePage fix.
        height: '100%',
        background: tokens.pageBg,
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
      <div
        style={{
          padding: `26px ${tokens.pad}px 14px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ width: 40 }} />
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>{title}</div>
        <button
          onClick={onClose}
          aria-label={t('result.closeAria')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            background: '#FFFFFF',
            border: '1px solid rgba(15,23,42,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          }}
        >
          <IconX size={20} />
        </button>
      </div>
      {children}
      </div>
      {actions}
    </div>
  );
}

function FeedbackBubble({ text }: { text: string }) {
  const { t } = useTranslation();
  return (
    <div style={sectionStyle} data-testid="ai-bubble">
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: tokens.primaryGradFlat,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <IconSparkle size={20} stroke={2.2} />
        </div>
        <div
          style={{
            background: '#F1F5F9',
            borderRadius: tokens.radiusSm,
            borderTopLeftRadius: 4,
            padding: '12px 14px',
            fontSize: 14,
            lineHeight: 1.5,
            color: '#0F172A',
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: tokens.primary,
              marginBottom: 4,
              letterSpacing: 0.1,
            }}
          >
            {t('result.aiCoaching')}
          </div>
          {text}
        </div>
      </div>
    </div>
  );
}

function ActionsBar({ onRetry, onNext }: { onRetry: () => void; onNext: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        marginTop: 20,
        padding: '14px 20px 30px',
        background: 'rgba(250,250,252,0.94)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(15,23,42,0.06)',
        display: 'flex',
        gap: 10,
        zIndex: 20,
      }}
    >
      <button
        onClick={onRetry}
        style={{
          flex: 1,
          padding: '14px 16px',
          borderRadius: tokens.radiusMd,
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          color: '#0F172A',
          fontSize: 15,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
        }}
      >
        <IconRotate size={18} stroke={2.2} /> {t('result.actionRetry')}
      </button>
      <button
        onClick={onNext}
        style={{
          flex: 1,
          padding: '14px 16px',
          borderRadius: tokens.radiusMd,
          background: tokens.primaryGrad,
          color: '#fff',
          fontSize: 15,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          boxShadow: `0 8px 18px -6px ${tokens.primaryShadow}`,
        }}
      >
        {t('result.actionNext')} <IconArrowRight size={18} stroke={2.4} />
      </button>
    </div>
  );
}
