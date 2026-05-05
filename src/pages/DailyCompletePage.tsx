import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useHistoryStore } from '../stores/useHistoryStore';
import { dailyProgress } from '../lib/stats';
import { tokens } from '../theme/tokens';
import { IconArrowRight, IconSparkle } from '../components/icons';

export default function DailyCompletePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const history = useHistoryStore((s) => s.history);
  const goal = useHistoryStore((s) => s.goal);
  const progress = dailyProgress(history, goal);

  // Defensive: if user lands here without having achieved the goal, send home.
  useEffect(() => {
    if (!progress.achieved) navigate('/', { replace: true });
  }, [progress.achieved, navigate]);

  const labelKey = goal.type === 'cardCount' ? 'daily.label.cardCount' : 'daily.label.avgScore';

  return (
    <div
      data-testid="daily-complete"
      style={{
        minHeight: '100%',
        background: tokens.bgGrad,
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        padding: '34px 24px 30px',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: tokens.primaryGrad,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: `0 24px 48px -10px ${tokens.primaryShadow}`,
            position: 'relative',
            marginBottom: 28,
            animation: 'mc-flip-in 0.7s cubic-bezier(.2,.8,.2,1) both',
          }}
        >
          <IconSparkle size={56} stroke={2} />
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>
          {t('daily.title')}
        </h2>
        <div style={{ fontSize: 15, color: '#64748B', marginTop: 10, fontWeight: 500 }}>
          {t('daily.subtitle')}
        </div>

        <div
          style={{
            marginTop: 28,
            padding: '18px 22px',
            background: '#FFFFFF',
            borderRadius: tokens.radiusLg,
            border: tokens.border,
            boxShadow: tokens.shadowSm,
            minWidth: 220,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: '#94A3B8',
            }}
          >
            {t(labelKey)}
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: -1,
              marginTop: 6,
              color: tokens.primaryDark,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {t('daily.progress', { current: progress.current, target: progress.target })}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button
          onClick={() => navigate('/', { replace: true })}
          data-testid="daily-back-home"
          style={{
            flex: 1,
            padding: '14px 16px',
            borderRadius: tokens.radiusMd,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            color: '#0F172A',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {t('daily.backHome')}
        </button>
        <button
          onClick={() => navigate(-1)}
          data-testid="daily-keep-going"
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
          {t('daily.keepGoing')} <IconArrowRight size={18} stroke={2.4} />
        </button>
      </div>
    </div>
  );
}
