import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCardStore } from '../stores/useCardStore';
import { analyzer } from '../lib/analyzer';
import { tokens } from '../theme/tokens';
import { tipKeys } from '../data/cards';
import { IconSparkle } from '../components/icons';
import { ApiError } from '../api/client';

export default function LoadingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    setAnalysisResult,
    setAnalysisError,
    audioBlob,
    currentCard,
  } = useCardStore();

  const [tipKey] = useState(() => tipKeys[Math.floor(Math.random() * tipKeys.length)]);

  useEffect(() => {
    if (!currentCard || !audioBlob) {
      navigate('/', { replace: true });
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setAnalysisError(null);

    analyzer
      .analyze(audioBlob, currentCard, { signal: controller.signal })
      .then((result) => {
        if (cancelled) return;
        setAnalysisResult(result);
        navigate('/result', { replace: true });
      })
      .catch((err) => {
        if ((err as DOMException)?.name === 'AbortError') return;
        if (cancelled) return;
        if (err instanceof ApiError) {
          setAnalysisError({ code: err.code, message: err.message });
        } else {
          setAnalysisError({
            code: 'PIPELINE_ERROR',
            message: (err as Error).message ?? '',
          });
        }
        navigate('/result', { replace: true });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [audioBlob, currentCard, navigate, setAnalysisError, setAnalysisResult]);

  return (
    <div
      data-testid="loading-page"
      style={{
        // Own the scroll inside #root. Loading is short, but consistent with
        // the rest of the app — and safe if step descriptions ever grow.
        height: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
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
            animation: 'mc-bounce 2s ease-in-out infinite',
          }}
        >
          {[0, 0.8, 1.6].map((d) => (
            <div
              key={d}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `2px solid rgba(99,102,241,0.4)`,
                animation: `mc-ring 2.4s ease-out ${d}s infinite`,
              }}
            />
          ))}
          <IconSparkle size={56} stroke={2} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, margin: 0 }}>
          {t('loading.title')}
        </h2>
        <div style={{ fontSize: 15, color: '#64748B', marginTop: 8, fontWeight: 500 }}>
          {t('loading.subtitle')}
        </div>
      </div>

      {/*
        Indeterminate progress bar — honest abstraction. The backend is
        monolithic (no per-step events) so showing a 4-step checklist
        misled users into thinking the pipeline had reached "feedback
        generation" even on retry/discarded paths that abort early at the
        audio gate. A continuous shimmer just says "we're working" without
        claiming to know which stage.
      */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: tokens.radiusLg,
          padding: 16,
          border: '1px solid rgba(15,23,42,0.05)',
          boxShadow: '0 4px 16px -8px rgba(15,23,42,0.08)',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#0F172A',
              letterSpacing: -0.1,
            }}
          >
            {t('loading.progressLabel')}
          </span>
          <div style={{ display: 'flex', gap: 4 }} aria-hidden="true">
            {[0, 1, 2].map((d) => (
              <div
                key={d}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: tokens.primary,
                  animation: `mc-dots 1.2s ease-in-out ${d * 0.16}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
        <div
          role="progressbar"
          aria-label={t('loading.title')}
          style={{
            height: 8,
            borderRadius: 999,
            background: tokens.primarySoft,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 999,
              background: `linear-gradient(90deg, transparent 0%, ${tokens.primary} 50%, transparent 100%)`,
              animation: 'mc-progress-sweep 1.6s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <div
        style={{
          background: `linear-gradient(135deg, ${tokens.streakA} 0%, ${tokens.streakB} 100%)`,
          borderRadius: tokens.radiusMd,
          padding: '14px 16px',
          display: 'flex',
          gap: 12,
          border: '1px solid rgba(245,158,11,0.18)',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tokens.streakText,
            flexShrink: 0,
          }}
        >
          <IconSparkle size={18} stroke={2.2} />
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: tokens.streakText,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 3,
            }}
          >
            {t('loading.tipLabel')}
          </div>
          <div
            style={{ fontSize: 13, color: tokens.streakText, lineHeight: 1.45, fontWeight: 500 }}
          >
            {t(tipKey)}
          </div>
        </div>
      </div>
    </div>
  );
}
