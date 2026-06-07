// Shared analysis-result presentation, extracted from ResultPage so the
// standalone pronunciation flow (/result) and the situation pronunciation step
// (/situations/:id/step3) render the SAME score / phoneme / issues / prosody /
// feedback UI from one source of truth. Page-level chrome (daily progress,
// history mini chart, action bar, retry/discarded banners) stays on the pages.

import { useMemo, type ReactNode } from 'react';
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
} from 'recharts';
import { tokens } from '../../theme/tokens';
import { IconAlert, IconSparkle } from '../icons';
import { sectionStyle } from './resultHelpers';
import type { AnalysisResult } from '../../types';

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

/** The purple score hero card. `reference` is the target sentence shown in quotes. */
export function ScoreCard({ result, reference }: { result: AnalysisResult; reference: string }) {
  const { t } = useTranslation();
  return (
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
      <ScoreRing score={result.score} />
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
          {t(result.message)}
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
          «{reference}»
        </div>
      </div>
    </div>
  );
}

export function PhonemeSection({ result }: { result: AnalysisResult }) {
  const { t } = useTranslation();
  const r = result;
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
  const flaggedCount = r.phonemes.filter((p) => !p.correct || isFlagged(p.ko)).length;
  const correctCount = r.phonemes.length - flaggedCount;
  const wrongPhoneme = r.phonemes.find((p) => !p.correct);

  return (
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
  );
}

export function IssuesSection({ result }: { result: AnalysisResult }) {
  const { t } = useTranslation();
  const r = result;
  if (r.issues.length === 0) return null;
  return (
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
  );
}

export function ProsodySection({ result }: { result: AnalysisResult }) {
  const { t } = useTranslation();
  const r = result;
  if (!(r.prosodyExecuted && r.prosody && r.prosody.points.length > 0)) return null;
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
}

export function FeedbackBubble({ text }: { text: string }) {
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

