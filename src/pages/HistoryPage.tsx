import { useMemo, useState } from 'react';
import { historySessions, weekData, type HistorySession } from '../data/cards';
import BottomNav from '../components/common/BottomNav';
import { tokens } from '../theme/tokens';

const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'good', label: '90+' },
  { id: 'work', label: '복습 필요' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 90 ? '#10B981' : score >= 75 ? tokens.primary : score >= 60 ? '#F59E0B' : '#EF4444';
  const bg =
    score >= 90 ? '#ECFDF5' : score >= 75 ? tokens.primarySoft : score >= 60 ? '#FFFBEB' : '#FEF2F2';
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
  if (v === 0) {
    return <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>—</span>;
  }
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
  const [filter, setFilter] = useState<FilterId>('all');

  const grouped = useMemo(() => {
    return historySessions.reduce<Record<string, HistorySession[]>>((m, s) => {
      (m[s.day] = m[s.day] ?? []).push(s);
      return m;
    }, {});
  }, []);

  const totalCards = historySessions.length;
  const avg = Math.round(historySessions.reduce((a, b) => a + b.score, 0) / totalCards);
  const totalMin = weekData.reduce((a, b) => a + b.m, 0);
  const maxBar = Math.max(...weekData.map((w) => w.m));

  const visibleSessions = (sessions: HistorySession[]) => {
    if (filter === 'good') return sessions.filter((s) => s.score >= 90);
    if (filter === 'work') return sessions.filter((s) => s.score < 80);
    return sessions;
  };

  return (
    <div
      style={{
        minHeight: '100%',
        background: tokens.pageBg,
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
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
          나의 학습 기록
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.7, lineHeight: 1.1, margin: 0 }}>
          기록
        </h1>
        <div style={{ fontSize: 14, color: '#64748B', marginTop: 6 }}>
          이번 주 · 카드 {totalCards}장 · 평균 {avg}점
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
          { lbl: '총 카드', val: String(totalCards), sub: '+3 오늘' },
          { lbl: '평균 점수', val: String(avg), sub: '↑ 4점' },
          { lbl: '학습 시간', val: `${totalMin}분`, sub: '이번 주' },
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
            <div style={{ fontSize: 10, color: tokens.primary, fontWeight: 600, marginTop: 1 }}>
              {s.sub}
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
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>이번 주 활동</div>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>분 · 평균 점수</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
          {weekData.map((w, i) => {
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
                  {w.avg}
                </div>
                <div
                  style={{
                    width: '100%',
                    height: h,
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
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
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
              {f.label}
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
        {Object.entries(grouped).map(([day, sessions]) => {
          const vis = visibleSessions(sessions);
          if (vis.length === 0) return null;
          return (
            <div key={day}>
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
                <span>{day}</span>
                <span style={{ color: '#CBD5E1', fontWeight: 500, letterSpacing: 0 }}>
                  {vis.length}회
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {vis.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      background: '#FFFFFF',
                      border: tokens.border,
                      borderRadius: tokens.radiusMd,
                      boxShadow: tokens.shadowSm,
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
                      {s.time}
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
                        {s.card}
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
                        <span>{s.cat}</span>
                        <span style={{ color: '#CBD5E1' }}>·</span>
                        <span style={{ whiteSpace: 'nowrap' }}>
                          <Delta v={s.delta} />
                        </span>
                      </div>
                    </div>
                    <ScorePill score={s.score} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
