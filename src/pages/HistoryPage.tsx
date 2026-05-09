import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useHistoryStore } from '../stores/useHistoryStore';
import { useCardStore } from '../stores/useCardStore';
import BottomNav from '../components/common/BottomNav';
import { tokens } from '../theme/tokens';
import {
  averageBestScore,
  dayLabelForToday,
  flattenSessions,
  streakDays,
  timeOf,
  totalUniqueCardsLearned,
  weekActivity,
  type SessionEntry,
} from '../lib/stats';
import { mockBackendCards } from '../data/cards';
import { decorateCard } from '../api/mappers';

const FILTERS = ['all', 'best', 'review', 'week'] as const;
type FilterId = (typeof FILTERS)[number];

const REVIEW_THRESHOLD = 70;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 90
      ? '#10B981'
      : score >= 75
        ? tokens.primary
        : score >= 60
          ? '#F59E0B'
          : '#EF4444';
  const bg =
    score >= 90
      ? '#ECFDF5'
      : score >= 75
        ? tokens.primarySoft
        : score >= 60
          ? '#FFFBEB'
          : '#FEF2F2';
  return (
    <div
      style={{
        padding: '5px 10px',
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: -0.2,
        flexShrink: 0,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {score}
    </div>
  );
}

function Delta({ v }: { v: number }) {
  if (v === 0) return <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>—</span>;
  const up = v > 0;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: up ? '#10B981' : '#EF4444',
      }}
    >
      {up ? '↑' : '↓'} {Math.abs(v)}
    </span>
  );
}

export default function HistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const history = useHistoryStore((s) => s.history);
  const setCurrentCard = useCardStore((s) => s.setCurrentCard);
  const [filter, setFilter] = useState<FilterId>('all');

  const sessions = useMemo(() => flattenSessions(history), [history]);
  const week = useMemo(() => weekActivity(history), [history]);
  const streak = useMemo(() => streakDays(history), [history]);
  const learned = useMemo(() => totalUniqueCardsLearned(history), [history]);
  const avg = useMemo(() => averageBestScore(history), [history]);
  const maxBar = useMemo(() => Math.max(1, ...week.map((w) => w.m)), [week]);

  const [pageOpenedAt] = useState(() => Date.now());
  const filtered = useMemo(() => {
    if (filter === 'best') return sessions.filter((s) => s.score >= 90);
    if (filter === 'review') return sessions.filter((s) => s.score < REVIEW_THRESHOLD);
    if (filter === 'week') return sessions.filter((s) => pageOpenedAt - s.attemptedAt < WEEK_MS);
    return sessions;
  }, [filter, sessions, pageOpenedAt]);

  const grouped = useMemo(() => {
    const out: { dayKey: string; label: string; items: SessionEntry[] }[] = [];
    const map = new Map<string, { label: string; items: SessionEntry[] }>();
    for (const s of filtered) {
      const lbl = dayLabelForToday(s.attemptedAt);
      const key = lbl;
      let entry = map.get(key);
      if (!entry) {
        entry = { label: lbl, items: [] };
        map.set(key, entry);
        out.push({ dayKey: key, label: lbl, items: entry.items });
      }
      entry.items.push(s);
    }
    return out;
  }, [filtered]);

  const handleSessionClick = (cardId: string) => {
    const backendCard = mockBackendCards.find((c) => c.id === cardId);
    if (!backendCard) return;
    setCurrentCard(decorateCard(backendCard));
    navigate('/learn');
  };

  return (
    <div
      data-testid="history-page"
      style={{
        // Outer is flex column; inner wrapper owns the scroll.
        // (Putting overflow:auto + flex column on the SAME element causes
        // children to flex-shrink instead of overflowing into a scrollbar.)
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
      <div style={{ padding: `28px ${tokens.pad}px 14px` }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: tokens.primary,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {t('history.eyebrow')}
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.7, lineHeight: 1.1, margin: 0 }}>
          {t('history.title')}
        </h1>
        <div style={{ fontSize: 14, color: '#64748B', marginTop: 6 }}>
          {t('history.summary', { cards: learned, avg })}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          padding: `0 ${tokens.pad}px 4px`,
        }}
      >
        {[
          { lbl: t('history.stats.totalCards'), val: String(learned) },
          { lbl: t('history.stats.avgScore'), val: String(avg) },
          { lbl: t('history.stats.streak'), val: String(streak) },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              padding: '12px 10px',
              background: '#FFFFFF',
              borderRadius: tokens.radiusMd,
              border: tokens.border,
              boxShadow: tokens.shadowSm,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: '#94A3B8',
              }}
            >
              {s.lbl}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: -0.5,
                marginTop: 2,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {s.val}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          margin: `${tokens.gap + 6}px ${tokens.pad}px 0`,
          padding: '16px 16px 12px',
          background: '#FFFFFF',
          borderRadius: tokens.radiusLg,
          border: tokens.border,
          boxShadow: tokens.shadowSm,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>
            {t('history.weeklyTitle')}
          </div>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
            {t('history.weeklyHint')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
          {week.map((w, i) => {
            const h = (w.m / maxBar) * 86;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: '#94A3B8',
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {w.avg || ''}
                </div>
                <div
                  style={{
                    width: '100%',
                    height: Math.max(4, h),
                    background: w.today ? tokens.primaryGradFlat : tokens.primarySoft,
                    borderRadius: 6,
                    transition: 'height 0.4s ease',
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: w.today ? 700 : 500,
                    color: w.today ? tokens.primary : '#64748B',
                  }}
                >
                  {w.d}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          padding: `${tokens.gap + 6}px ${tokens.pad}px 10px`,
          scrollbarWidth: 'none',
        }}
      >
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              data-testid={`filter-${f}`}
              style={{
                flexShrink: 0,
                padding: '8px 14px',
                borderRadius: 999,
                border: active ? 'none' : '1px solid #E2E8F0',
                background: active ? tokens.primaryGradFlat : '#FFFFFF',
                color: active ? '#FFFFFF' : tokens.chipText,
                fontWeight: active ? 600 : 500,
                fontSize: 13,
                whiteSpace: 'nowrap',
                boxShadow: active ? `0 6px 16px -4px ${tokens.primaryShadow}` : 'none',
              }}
            >
              {t(`history.filters.${f}`)}
            </button>
          );
        })}
      </div>

      <div
        style={{
          padding: `0 ${tokens.pad}px 24px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {sessions.length === 0 && (
          <div
            data-testid="history-empty"
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: tokens.radiusMd,
              border: tokens.border,
              color: '#64748B',
              fontSize: 14,
            }}
          >
            {t('history.empty')}
          </div>
        )}
        {sessions.length > 0 && filtered.length === 0 && (
          <div
            data-testid="history-empty-filter"
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: tokens.radiusMd,
              border: tokens.border,
              color: '#64748B',
              fontSize: 14,
            }}
          >
            {t('cards.empty')}
          </div>
        )}
        {grouped.map(({ dayKey, label, items }) => (
          <div key={dayKey}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: '#94A3B8',
                marginBottom: 8,
                marginTop: 4,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                {label === 'today'
                  ? t('history.today')
                  : label === 'yesterday'
                    ? t('history.yesterday')
                    : label}
              </span>
              <span style={{ color: '#CBD5E1', fontWeight: 500, letterSpacing: 0 }}>
                {t('history.sessionCount', { count: items.length })}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((s, idx) => (
                <button
                  key={`${s.cardId}-${s.attemptedAt}-${idx}`}
                  onClick={() => handleSessionClick(s.cardId)}
                  data-testid="history-session"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: '#FFFFFF',
                    border: tokens.border,
                    borderRadius: tokens.radiusMd,
                    boxShadow: tokens.shadowSm,
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: '#94A3B8',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: -0.1,
                      width: 40,
                      flexShrink: 0,
                    }}
                  >
                    {timeOf(s.attemptedAt)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: '"Noto Sans KR", system-ui',
                        fontSize: 15,
                        fontWeight: 600,
                        letterSpacing: -0.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {s.korean}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#64748B',
                        marginTop: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.type && <span>{s.type}</span>}
                      <span style={{ color: '#CBD5E1' }}>·</span>
                      <Delta v={s.delta} />
                    </div>
                  </div>
                  <ScorePill score={s.score} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      </div>

      <BottomNav />
    </div>
  );
}
