import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCardStore } from '../stores/useCardStore';
import { analyzer } from '../lib/analyzer';
import { tokens } from '../theme/tokens';
import { tips } from '../data/cards';
import { IconCheck, IconSparkle } from '../components/icons';
import type { AnalysisStep } from '../types';

const STEP_ORDER: AnalysisStep[] = ['upload', 'phoneme', 'intonation', 'feedback'];
const STEP_LABELS = ['음성 업로드 완료', '음소 분석 중', '억양 추출 중', '피드백 생성 중'];

export default function LoadingPage() {
  const navigate = useNavigate();
  const { analysisStep, setAnalysisStep, setAnalysisResult, audioBlob, currentCard } =
    useCardStore();

  const [tip] = useState(() => tips[Math.floor(Math.random() * tips.length)]);

  useEffect(() => {
    if (!currentCard || !audioBlob) {
      navigate('/', { replace: true });
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setAnalysisStep('upload');

    analyzer
      .analyze(audioBlob, currentCard, {
        onStep: (step) => {
          if (!cancelled) setAnalysisStep(step);
        },
        signal: controller.signal,
      })
      .then((result) => {
        if (cancelled) return;
        setAnalysisResult(result);
        navigate('/result', { replace: true });
      })
      .catch((err) => {
        if ((err as DOMException)?.name === 'AbortError') return;
        console.error('analyze failed', err);
        navigate('/learn', { replace: true });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [audioBlob, currentCard, navigate, setAnalysisResult, setAnalysisStep]);

  const currentIdx = STEP_ORDER.indexOf(analysisStep);
  const stepStatus = (i: number) =>
    i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'wait';

  return (
    <div
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
          음성을 분석하고 있어요
        </h2>
        <div style={{ fontSize: 15, color: '#64748B', marginTop: 8, fontWeight: 500 }}>
          잠시만 기다려 주세요…
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          background: '#FFFFFF',
          borderRadius: tokens.radiusLg,
          padding: 16,
          border: '1px solid rgba(15,23,42,0.05)',
          boxShadow: '0 4px 16px -8px rgba(15,23,42,0.08)',
          marginBottom: 14,
        }}
      >
        {STEP_LABELS.map((label, i) => {
          const s = stepStatus(i);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 6px',
                opacity: s === 'wait' ? 0.5 : 1,
                transition: 'opacity 0.3s ease',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background:
                    s === 'done'
                      ? '#10B981'
                      : s === 'active'
                        ? tokens.primaryGradFlat
                        : '#E2E8F0',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: s === 'active' ? `0 0 0 4px ${tokens.primarySoft}` : 'none',
                }}
              >
                {s === 'done' ? <IconCheck size={16} stroke={3} /> : i + 1}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: s === 'wait' ? 500 : 600,
                  color: s === 'wait' ? '#94A3B8' : '#0F172A',
                  flex: 1,
                  letterSpacing: -0.1,
                }}
              >
                {label}
              </div>
              {s === 'active' && (
                <div style={{ display: 'flex', gap: 4 }}>
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
              )}
            </div>
          );
        })}
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
            학습 팁
          </div>
          <div
            style={{ fontSize: 13, color: tokens.streakText, lineHeight: 1.45, fontWeight: 500 }}
          >
            {tip}
          </div>
        </div>
      </div>
    </div>
  );
}
