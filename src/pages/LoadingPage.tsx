import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCardStore } from '../stores/useCardStore';
import { analyzer } from '../lib/analyzer';
import type { AnalysisStep } from '../types';

const steps: { key: AnalysisStep; label: string; desc: string }[] = [
  { key: 'upload', label: '음성 수신 완료', desc: '오디오 업로드됨' },
  { key: 'phoneme', label: '발음 분석 중...', desc: '음소 단위로 비교 중' },
  { key: 'intonation', label: '억양 분석', desc: '피치 곡선 추출' },
  { key: 'feedback', label: '피드백 생성', desc: 'AI 교정 조언' },
];

const stepOrder: AnalysisStep[] = ['upload', 'phoneme', 'intonation', 'feedback'];

function getStepState(current: AnalysisStep, step: AnalysisStep) {
  const ci = stepOrder.indexOf(current);
  const si = stepOrder.indexOf(step);
  if (si < ci) return 'done';
  if (si === ci) return 'active';
  return 'waiting';
}

export default function LoadingPage() {
  const navigate = useNavigate();
  const {
    analysisStep,
    setAnalysisStep,
    setAnalysisResult,
    audioBlob,
    currentCard,
  } = useCardStore();

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

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100dvh', padding: '40px 24px',
    }}>
      {/* Card visual with stack */}
      <div style={{ width: 100, height: 130, margin: '0 auto 28px', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 3, left: 5, right: 5, bottom: -3,
          background: '#EFEBE5', borderRadius: 16, zIndex: 0,
        }} />
        <div style={{
          position: 'absolute', top: 6, left: 10, right: 10, bottom: -6,
          background: 'var(--color-muted)', borderRadius: 16, zIndex: 0,
        }} />
        <div style={{
          width: '100%', height: '100%', background: 'var(--color-surface)', borderRadius: 16,
          boxShadow: '0 4px 16px rgba(108,92,231,0.12)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 1, overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 4,
            background: 'var(--color-primary-gradient)',
          }} />
          <div style={{ fontSize: 32, marginBottom: 6 }}>🎙️</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#2D2A26' }}>분석 중</div>
        </div>
      </div>

      <div style={{ fontSize: 20, fontWeight: 800, color: '#2D2A26', marginBottom: 6, textAlign: 'center' }}>
        카드를 뒤집고 있어요
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 36 }}>
        발음을 분석하고 피드백을 준비해요
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300 }}>
        {steps.map((step) => {
          const state = getStepState(analysisStep, step.key);
          return (
            <div key={step.key} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 14,
              background: state === 'done' ? '#FAFFF9' : 'var(--color-surface)',
              border: `1.5px solid ${state === 'active' ? 'var(--color-primary)' : state === 'done' ? 'var(--color-success)' : 'var(--color-border)'}`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: state === 'active' ? 'var(--color-primary-light)' : state === 'done' ? 'var(--color-success-light)' : 'var(--color-bg)',
              }}>
                {state === 'done' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#43A047" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                ) : state === 'active' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DDD8D0" strokeWidth="2">
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: state === 'waiting' ? '#C4BEB6' : '#2D2A26' }}>
                  {step.label}
                </div>
                <div style={{ fontSize: 11, color: state === 'waiting' ? '#DDD8D0' : 'var(--color-text-tertiary)', marginTop: 1 }}>
                  {step.desc}
                </div>
              </div>
              {state === 'active' && (
                <div style={{ display: 'flex', gap: 3 }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{
                      width: 4, height: 4, borderRadius: '50%', background: 'var(--color-primary)',
                      animation: `bounce 1.4s infinite ease-in-out ${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => navigate('/learn', { replace: true })}
        style={{
          marginTop: 24, padding: '10px 18px', borderRadius: 12,
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)',
        }}
      >
        분석 취소
      </button>

      <div style={{
        marginTop: 24, padding: '14px 16px',
        background: 'var(--color-surface)', borderRadius: 14, border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: 300, width: '100%',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
        <span style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.5 }}>
          러시아어 화자는 <strong style={{ color: 'var(--color-primary)' }}>'ㅂ'과 'ㅃ'</strong> 구분이 어려울 수 있어요. 입술을 꽉 다물었다 터뜨려 보세요!
        </span>
      </div>
    </div>
  );
}
