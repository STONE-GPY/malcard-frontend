import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCardStore } from '../stores/useCardStore';
import TopNav from '../components/common/TopNav';
import LevelMeter from '../components/common/LevelMeter';
import { useRecorder } from '../hooks/useRecorder';

const MAX_DURATION_MS = 12_000;
const MIN_DURATION_MS = 800;

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CardLearnPage() {
  const navigate = useNavigate();
  const { currentCard, setAudioBlob, currentPosition } = useCardStore();
  const recorder = useRecorder({ maxDurationMs: MAX_DURATION_MS, minDurationMs: MIN_DURATION_MS });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!currentCard) navigate('/', { replace: true });
  }, [currentCard, navigate]);

  const previewUrl = useMemo(
    () => (recorder.audioBlob ? URL.createObjectURL(recorder.audioBlob) : null),
    [recorder.audioBlob],
  );

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleTTS = useCallback(() => {
    if (!currentCard) return;
    const utterance = new SpeechSynthesisUtterance(currentCard.korean);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  }, [currentCard]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!recorder.audioBlob) return;
    setAudioBlob(recorder.audioBlob);
    navigate('/loading');
  }, [recorder.audioBlob, setAudioBlob, navigate]);

  const handleRetry = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    recorder.reset();
  }, [recorder]);

  const position = useMemo(() => currentPosition(), [currentPosition]);
  const progressPct = position.total > 0 ? (position.index / position.total) * 100 : 0;

  if (!currentCard) return null;

  const { status, durationMs, level, errorMessage } = recorder;
  const tooShort = status === 'preview' && durationMs < MIN_DURATION_MS;

  return (
    <div>
      <TopNav title={currentCard.subcategory ?? '학습'} rightContent={
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>
          {position.index} / {position.total}
        </span>
      } />

      <div style={{ padding: '4px 20px 20px' }}>
        <div style={{ height: 4, background: 'var(--color-muted)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: 'var(--color-primary)',
            borderRadius: 4,
            transition: 'width 200ms ease',
          }} />
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        <div style={{
          background: 'var(--color-surface)', borderRadius: 'var(--radius-2xl)',
          overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{ height: 5, background: 'var(--color-primary-gradient)' }} />

          <div style={{ padding: '28px 24px 24px', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'var(--color-bg)', padding: '5px 12px', borderRadius: 16,
              fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 20,
            }}>
              {currentCard.emoji} {currentCard.subcategory ?? currentCard.category}
            </div>

            <div style={{ fontSize: 48, marginBottom: 18 }}>{currentCard.emoji}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#2D2A26', marginBottom: 8, lineHeight: 1.3 }}>
              {currentCard.korean}
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>{currentCard.romanize}</div>
            <div style={{ fontSize: 13, color: '#C4BEB6', marginBottom: 24 }}>{currentCard.translation}</div>

            <button onClick={handleTTS} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--color-primary-light)', padding: '12px 22px', borderRadius: 'var(--radius-md)',
              fontSize: 14, fontWeight: 700, color: 'var(--color-primary)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              예시 발음 듣기
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px', marginTop: -2 }}>
        <div style={{ height: 6, margin: '0 8px', background: '#EFEBE5', borderRadius: '0 0 16px 16px' }} />
        <div style={{ height: 4, margin: '0 16px', background: 'var(--color-muted)', borderRadius: '0 0 12px 12px' }} />
      </div>

      {currentCard.phonemeHints && (
        <div style={{
          margin: '20px 20px 0', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
          padding: 16, border: '1px solid var(--color-border)',
        }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: '#2D2A26', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            발음 힌트
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {currentCard.phonemeHints.map((h, i) => (
              <div key={i} style={{
                padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                background: 'var(--color-bg)', fontSize: 13, fontWeight: 600, color: '#2D2A26',
              }}>
                {h.char} <span style={{ color: 'var(--color-primary)', fontSize: 11, marginLeft: 2 }}>{h.ipa}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* spacer for fixed bottom area */}
      <div style={{ height: 220 }} />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, margin: '0 auto',
        width: '100%', maxWidth: 430,
        background: 'var(--color-surface)', borderRadius: '22px 22px 0 0',
        padding: '20px 20px 36px', textAlign: 'center',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
      }}>
        {status === 'denied' && (
          <PermissionDeniedView onRetry={() => recorder.start()} />
        )}

        {status === 'error' && (
          <ErrorView message={errorMessage ?? '녹음을 시작할 수 없습니다.'} onRetry={() => recorder.start()} />
        )}

        {status === 'requesting' && (
          <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            마이크를 준비하고 있어요...
          </div>
        )}

        {status === 'recording' && (
          <RecordingView
            level={level}
            durationMs={durationMs}
            maxDurationMs={MAX_DURATION_MS}
            onStop={recorder.stop}
          />
        )}

        {status === 'preview' && previewUrl && (
          <PreviewView
            audioRef={audioRef}
            url={previewUrl}
            isPlaying={isPlaying}
            durationMs={durationMs}
            tooShort={tooShort}
            onTogglePlay={togglePlay}
            onEnded={() => setIsPlaying(false)}
            onRetry={handleRetry}
            onSubmit={handleSubmit}
          />
        )}

        {status === 'idle' && (
          <IdleView onStart={() => recorder.start()} />
        )}
      </div>
    </div>
  );
}

function IdleView({ onStart }: { onStart: () => void }) {
  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
        버튼을 누르고 따라 말해보세요
      </div>
      <button
        onClick={onStart}
        aria-label="녹음 시작"
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--color-primary-gradient)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 18px rgba(108,92,231,0.35)',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="white" strokeWidth="2" />
          <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" />
        </svg>
      </button>
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
        탭하여 녹음 시작
      </div>
    </>
  );
}

function RecordingView({
  level, durationMs, maxDurationMs, onStop,
}: {
  level: number;
  durationMs: number;
  maxDurationMs: number;
  onStop: () => void;
}) {
  const remaining = Math.max(0, maxDurationMs - durationMs);
  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <LevelMeter level={level} active />
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14,
      }}>
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
          background: 'var(--color-error)',
          animation: 'pulse 1.2s infinite ease-in-out',
        }} />
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
          {formatTime(durationMs)}
        </span>
        <span style={{ color: 'var(--color-text-tertiary)' }}>
          · 남은 시간 {formatTime(remaining)}
        </span>
      </div>
      <button
        onClick={onStop}
        aria-label="녹음 종료"
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, #EF5350, #FF8A80)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 18px rgba(239,83,80,0.35)',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
        탭하여 녹음 종료 · 잠시 멈추면 자동 종료
      </div>
    </>
  );
}

function PreviewView({
  audioRef, url, isPlaying, durationMs, tooShort,
  onTogglePlay, onEnded, onRetry, onSubmit,
}: {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  url: string;
  isPlaying: boolean;
  durationMs: number;
  tooShort: boolean;
  onTogglePlay: () => void;
  onEnded: () => void;
  onRetry: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <audio ref={audioRef} src={url} onEnded={onEnded} preload="auto" />
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
        녹음을 들어보고 분석을 시작하세요
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14,
      }}>
        <button
          onClick={onTogglePlay}
          aria-label={isPlaying ? '재생 일시정지' : '녹음 재생'}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--color-primary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(108,92,231,0.3)',
          }}
        >
          {isPlaying ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          )}
        </button>
        <div style={{
          fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 700, color: '#2D2A26',
        }}>
          {formatTime(durationMs)}
        </div>
      </div>
      {tooShort && (
        <div style={{
          fontSize: 11, color: 'var(--color-warning)', marginBottom: 10,
        }}>
          녹음이 너무 짧아요. 다시 녹음하는 것을 추천드려요.
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onRetry}
          style={{
            flex: 1, padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 800,
            background: 'var(--color-surface)', color: 'var(--color-primary)',
            border: '2px solid var(--color-primary)',
          }}
        >
          다시 녹음
        </button>
        <button
          onClick={onSubmit}
          style={{
            flex: 1, padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 800,
            background: 'var(--color-primary-gradient)', color: 'white',
            boxShadow: '0 4px 14px rgba(108,92,231,0.25)',
          }}
        >
          분석하기
        </button>
      </div>
    </>
  );
}

function PermissionDeniedView({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <div style={{ fontSize: 28, marginBottom: 6 }}>🎙️</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#2D2A26', marginBottom: 6 }}>
        마이크 권한이 필요해요
      </div>
      <div style={{
        fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14, lineHeight: 1.5,
      }}>
        브라우저 주소창의 자물쇠 아이콘에서 마이크 접근을 허용한 뒤 다시 시도해주세요.
      </div>
      <button
        onClick={onRetry}
        style={{
          padding: '12px 24px', borderRadius: 12, fontSize: 13, fontWeight: 800,
          background: 'var(--color-primary)', color: 'white',
        }}
      >
        다시 시도
      </button>
    </>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <>
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-error)', marginBottom: 6 }}>
        녹음 오류
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
        {message}
      </div>
      <button
        onClick={onRetry}
        style={{
          padding: '12px 24px', borderRadius: 12, fontSize: 13, fontWeight: 800,
          background: 'var(--color-primary)', color: 'white',
        }}
      >
        다시 시도
      </button>
    </>
  );
}
