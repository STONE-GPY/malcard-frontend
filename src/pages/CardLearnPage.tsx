import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCardStore } from '../stores/useCardStore';
import { useRecorder } from '../hooks/useRecorder';
import { tokens } from '../theme/tokens';
import { IconArrowLeft, IconMic, IconStop, IconVolume } from '../components/icons';
import { categoryIdForType } from '../data/cards';

const MAX_DURATION_MS = 12_000;
const MIN_DURATION_MS = 800;

const TYPE_LABEL: Record<string, string> = {
  '일상문장': '일상',
  '관용구': '관용구',
  '상황별': '상황',
  '단어': '단어',
};

export default function CardLearnPage() {
  const navigate = useNavigate();
  const { currentCard, setAudioBlob, currentPosition } = useCardStore();
  const recorder = useRecorder({ maxDurationMs: MAX_DURATION_MS, minDurationMs: MIN_DURATION_MS });

  useEffect(() => {
    if (!currentCard) navigate('/', { replace: true });
  }, [currentCard, navigate]);

  // Auto-submit when recording produces a blob
  useEffect(() => {
    if (recorder.status === 'preview' && recorder.audioBlob) {
      setAudioBlob(recorder.audioBlob);
      navigate('/loading');
    }
  }, [recorder.status, recorder.audioBlob, setAudioBlob, navigate]);

  const handleTTS = useCallback(() => {
    if (!currentCard) return;
    const utterance = new SpeechSynthesisUtterance(currentCard.korean);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  }, [currentCard]);

  const toggleRecord = useCallback(() => {
    if (recorder.status === 'recording') recorder.stop();
    else recorder.start();
  }, [recorder]);

  const position = useMemo(() => currentPosition(), [currentPosition]);
  const pct = position.total > 0 ? (position.index / position.total) * 100 : 0;

  if (!currentCard) return null;

  const recording = recorder.status === 'recording';
  const denied = recorder.status === 'denied';
  const errored = recorder.status === 'error';

  // Resolve category id from backend type
  const _categoryId = categoryIdForType(currentCard.type);
  void _categoryId;
  const typeLabel = TYPE_LABEL[currentCard.type] ?? currentCard.type;

  return (
    <div
      data-testid="learn-page"
      style={{
        minHeight: '100%',
        background: tokens.bgGrad,
        color: '#0F172A',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: `26px ${tokens.pad}px 14px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate('/')}
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
            <IconArrowLeft size={20} />
          </button>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', letterSpacing: -0.2 }}>
            {typeLabel}
          </div>
          <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>
            {position.index} / {position.total}
          </div>
        </div>
        <div
          style={{
            height: 6,
            background: tokens.primarySoft,
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: tokens.primaryGradFlat,
              borderRadius: 999,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      <div
        style={{
          margin: `${tokens.gap + 8}px ${tokens.pad}px 0`,
          padding: `${tokens.pad + 12}px ${tokens.pad + 4}px ${tokens.pad + 8}px`,
          background: '#FFFFFF',
          borderRadius: tokens.radiusXl,
          boxShadow: `0 24px 48px -16px ${tokens.primaryShadowSoft}, 0 4px 14px -6px rgba(15,23,42,0.08)`,
          border: '1px solid rgba(99,102,241,0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: tokens.emojiBig,
            height: tokens.emojiBig,
            borderRadius: tokens.radiusLg,
            background: tokens.emojiBgGrad,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: tokens.emojiBigFs,
            marginBottom: 18,
            filter: `drop-shadow(0 6px 12px ${tokens.primaryShadowSoft})`,
          }}
        >
          {currentCard.emoji ?? '📝'}
        </div>
        <h2
          style={{
            fontFamily: '"Noto Sans KR", system-ui, sans-serif',
            fontSize: tokens.korean,
            fontWeight: 700,
            letterSpacing: -1.2,
            lineHeight: 1.15,
            color: '#0F172A',
            margin: 0,
          }}
        >
          {currentCard.korean}
        </h2>
        {currentCard.romanized && (
          <div
            style={{
              fontSize: 15,
              color: tokens.primaryDark,
              fontStyle: 'italic',
              marginTop: 8,
              fontWeight: 500,
              letterSpacing: 0.1,
            }}
          >
            {currentCard.romanized}
          </div>
        )}
        <div style={{ fontSize: 16, color: '#475569', marginTop: 14, fontWeight: 500 }}>
          {currentCard.russian}
        </div>
        {currentCard.prompt_question && (
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 6 }}>
            {currentCard.prompt_question}
          </div>
        )}
        <button
          onClick={handleTTS}
          style={{
            marginTop: 22,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 22px',
            borderRadius: 999,
            background: '#0F172A',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 4px 14px -2px rgba(15,23,42,0.25)',
          }}
        >
          <IconVolume size={18} stroke={2.2} /> 예문 듣기
        </button>
      </div>

      {currentCard.phonemes && currentCard.phonemes.length > 0 && (
        <div
          style={{
            margin: `${tokens.gap + 8}px ${tokens.pad}px 0`,
            padding: 18,
            background: '#FFFFFF',
            borderRadius: tokens.radiusLg,
            border: '1px solid rgba(15,23,42,0.05)',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: '#94A3B8',
              marginBottom: 12,
            }}
          >
            발음 힌트
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {currentCard.phonemes.map((p, i) => (
              <div
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 999,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    fontFamily: '"Noto Sans KR", system-ui',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#0F172A',
                  }}
                >
                  {p.ko}
                </span>
                <span style={{ color: tokens.primaryDark, fontSize: 12, fontWeight: 500 }}>
                  {p.ipa}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          marginTop: 'auto',
          padding: '20px 24px 36px',
          background:
            'linear-gradient(180deg, rgba(250,250,252,0) 0%, rgba(250,250,252,0.96) 30%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 20,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: denied || errored ? '#EF4444' : recording ? '#EF4444' : '#475569',
            marginBottom: 14,
            letterSpacing: -0.1,
            textAlign: 'center',
          }}
        >
          {denied
            ? '마이크 권한을 허용해 주세요'
            : errored
              ? recorder.errorMessage ?? '녹음을 시작할 수 없어요'
              : recording
                ? '녹음 중… 다시 눌러 정지'
                : '눌러서 말하기'}
        </div>

        {recording && (
          <div
            data-testid="recording-wave"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginBottom: 14,
              height: 24,
            }}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: 24,
                  borderRadius: 2,
                  background: '#EF4444',
                  animation: `mc-wave 0.${6 + (i % 3)}s ease-in-out ${i * 0.06}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        <button
          onClick={toggleRecord}
          aria-label={recording ? '정지' : '녹음 시작'}
          style={{
            width: tokens.fab,
            height: tokens.fab,
            borderRadius: '50%',
            background: recording
              ? 'linear-gradient(135deg, #F87171 0%, #EF4444 60%, #DC2626 100%)'
              : tokens.primaryGrad,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: recording
              ? '0 12px 28px -4px rgba(239,68,68,0.55)'
              : `0 12px 28px -4px ${tokens.primaryShadow}, 0 4px 12px -2px ${tokens.primaryShadowSoft}`,
            animation: recording ? 'mc-pulse 1.4s infinite' : 'none',
          }}
        >
          {recording ? <IconStop size={28} /> : <IconMic size={32} stroke={2.2} />}
        </button>
      </div>
    </div>
  );
}
