import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
import { userMessageFor } from '../api/client';

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

export default function ResultPage() {
  const navigate = useNavigate();
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
  const recordedRef = useRef(false);

  useEffect(() => {
    if (!analysisError && (!analysisResult || !currentCard)) {
      navigate('/', { replace: true });
      return;
    }
    if (recordedRef.current) return;
    if (analysisResult && currentCard && analysisResult.status === 'ready') {
      recordedRef.current = true;
      recordAttempt(currentCard.id, analysisResult.score);
    }
  }, [analysisResult, analysisError, currentCard, navigate, recordAttempt]);

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

  // Error path (network/server error)
  if (analysisError) {
    return (
      <PageShell title="결과" onClose={handleClose}>
        <ErrorBlock
          message={userMessageFor(analysisError.code, analysisError.message)}
          code={analysisError.code}
        />
        <ActionsBar onRetry={handleRetry} onNext={handleNext} primaryLabel="다시 녹음" />
      </PageShell>
    );
  }

  if (!analysisResult || !currentCard) return null;

  const r = analysisResult;

  // retry / discarded — degraded UI
  if (r.status === 'retry' || r.status === 'discarded') {
    return (
      <PageShell title="결과" onClose={handleClose}>
        <StatusBanner status={r.status} message={r.statusMessage} />
        <FeedbackBubble text={r.aiFeedback} />
        <ActionsBar onRetry={handleRetry} onNext={handleNext} />
      </PageShell>
    );
  }

  // ready — full result
  const correctCount = r.phonemes.filter((p) => p.correct).length;
  const wrongPhoneme = r.phonemes.find((p) => !p.correct);

  return (
    <PageShell title="결과" onClose={handleClose}>
      <ScoreCard
        score={r.score}
        message={r.message}
        koSentence={currentCard.korean}
      />

      <div style={sectionStyle} data-testid="phoneme-section">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>음소 분석</div>
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
            {correctCount}/{r.phonemes.length} 정확
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          {r.phonemes.map((p, i) => (
            <div
              key={i}
              style={{
                flex: '1 1 auto',
                minWidth: 64,
                padding: '10px 8px',
                borderRadius: tokens.radiusSm,
                background: p.correct ? '#ECFDF5' : '#FEF2F2',
                border: `1.5px solid ${p.correct ? '#A7F3D0' : '#FECACA'}`,
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
                  color: p.correct ? '#065F46' : '#991B1B',
                  lineHeight: 1,
                }}
              >
                {p.ko}
              </span>
              {p.correct ? (
                p.target && (
                  <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>
                    {p.target}
                  </span>
                )
              ) : (
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
              )}
            </div>
          ))}
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
              <b style={{ fontFamily: '"Noto Sans KR", system-ui' }}>{wrongPhoneme.ko}</b> 발음이 정확하지 않아요
              {wrongPhoneme.user && (
                <>
                  {' — '}
                  <code style={{ background: '#FEE2E2', padding: '1px 5px', borderRadius: 4 }}>
                    {wrongPhoneme.user}
                  </code>
                </>
              )}
              {wrongPhoneme.target && (
                <>
                  {' '}대신{' '}
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
                </>
              )}
              {wrongPhoneme.note ? ` — ${wrongPhoneme.note}` : ''}.
            </div>
          </div>
        )}
      </div>

      {r.prosodyExecuted && r.intonation.length > 0 && (
        <div style={sectionStyle} data-testid="intonation-section">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>억양</div>
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
              <IconAlert size={12} stroke={2.4} /> {r.intonationWarning}
            </div>
          </div>
          <div style={{ height: 160, margin: '0 -8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={r.intonation} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="c"
                  tick={{ fontSize: 12, fill: '#64748B', fontFamily: 'Noto Sans KR' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[40, 100]}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
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
                />
                <Line
                  type="monotone"
                  dataKey="native"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
                  name="원어민"
                />
                <Line
                  type="monotone"
                  dataKey="mine"
                  stroke={tokens.primaryDark}
                  strokeWidth={3}
                  strokeDasharray="6 5"
                  dot={{ r: 4, fill: tokens.primaryDark, strokeWidth: 0 }}
                  name="내 목소리"
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
              <div style={{ width: 14, height: 3, background: '#10B981', borderRadius: 2 }} />
              <span style={{ color: '#475569', fontWeight: 500 }}>원어민</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 14,
                  height: 3,
                  borderRadius: 2,
                  background: `repeating-linear-gradient(90deg, ${tokens.primaryDark} 0 4px, transparent 4px 7px)`,
                }}
              />
              <span style={{ color: '#475569', fontWeight: 500 }}>내 목소리</span>
            </div>
          </div>
        </div>
      )}

      <FeedbackBubble text={r.aiFeedback} />
      <ActionsBar onRetry={handleRetry} onNext={handleNext} />
    </PageShell>
  );
}

function PageShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      data-testid="result-page"
      style={{
        minHeight: '100%',
        background: tokens.pageBg,
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
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
          aria-label="닫기"
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
  );
}

function ScoreCard({
  score,
  message,
  koSentence,
}: {
  score: number;
  message: string;
  koSentence: string;
}) {
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
      <ScoreRing score={score} />
      <div style={{ flex: 1, position: 'relative' }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            opacity: 0.8,
          }}
        >
          총점
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: -0.4,
            marginTop: 4,
            lineHeight: 1.15,
          }}
        >
          {message}
        </div>
        <div
          style={{
            fontFamily: '"Noto Sans KR", system-ui',
            fontSize: 14,
            marginTop: 10,
            opacity: 0.95,
            fontWeight: 500,
          }}
        >
          «{koSentence}»
        </div>
      </div>
    </div>
  );
}

function StatusBanner({ status, message }: { status: 'retry' | 'discarded'; message?: string }) {
  const isRetry = status === 'retry';
  return (
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
      }}
    >
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        <IconAlert size={22} stroke={2.2} />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
          {isRetry ? '다시 녹음해 주세요' : '결과를 신뢰하기 어려워요'}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          {isRetry
            ? '녹음에서 발화가 충분히 감지되지 않았어요. 조용한 환경에서 또렷하게 다시 녹음해 주세요.'
            : '음성 신호가 매우 약해 분석 결과를 사용하기 어려워요. 마이크 거리와 환경을 확인해 주세요.'}
        </div>
        {message && (
          <div style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>
            상세: {message}
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorBlock({ message, code }: { message: string; code: string }) {
  return (
    <div
      data-testid="result-error"
      style={{
        margin: `12px ${tokens.pad}px 0`,
        padding: 20,
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: tokens.radiusLg,
        color: '#991B1B',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>분석 오류</div>
      <div style={{ fontSize: 13, lineHeight: 1.5 }}>{message}</div>
      <div style={{ fontSize: 11, marginTop: 8, opacity: 0.6 }}>코드: {code}</div>
    </div>
  );
}

function FeedbackBubble({ text }: { text: string }) {
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
            MalCard AI
          </div>
          {text}
        </div>
      </div>
    </div>
  );
}

function ActionsBar({
  onRetry,
  onNext,
  primaryLabel = '다음 카드',
}: {
  onRetry: () => void;
  onNext: () => void;
  primaryLabel?: string;
}) {
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
        <IconRotate size={18} stroke={2.2} /> 다시 녹음
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
        {primaryLabel} <IconArrowRight size={18} stroke={2.4} />
      </button>
    </div>
  );
}
