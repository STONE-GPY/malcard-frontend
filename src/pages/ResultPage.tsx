import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCardStore } from '../stores/useCardStore';
import { useHistoryStore } from '../stores/useHistoryStore';
import TopNav from '../components/common/TopNav';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

export default function ResultPage() {
  const navigate = useNavigate();
  const { analysisResult, currentCard, audioBlob, nextCard, setAudioBlob, setAnalysisResult } = useCardStore();
  const recordAttempt = useHistoryStore((s) => s.recordAttempt);
  const isFavorite = useHistoryStore((s) => s.isFavorite);
  const toggleFavorite = useHistoryStore((s) => s.toggleFavorite);
  const recordedRef = useRef(false);

  useEffect(() => {
    if (!analysisResult || !currentCard) {
      navigate('/', { replace: true });
      return;
    }
    if (recordedRef.current) return;
    recordedRef.current = true;
    recordAttempt(currentCard.id, analysisResult.score);
  }, [analysisResult, currentCard, navigate, recordAttempt]);

  if (!analysisResult || !currentCard) return null;

  const { score, phonemes, intonation, llmFeedback } = analysisResult;
  const correctCount = phonemes.filter((p) => p.correct).length;

  const chartData = phonemes.map((p, i) => ({
    name: p.char,
    native: intonation.referenceF0[i] ?? 0,
    user: intonation.userF0[i] ?? 0,
  }));

  const handleRetry = () => {
    setAudioBlob(null);
    setAnalysisResult(null);
    navigate('/learn');
  };

  const handleNext = () => {
    nextCard();
    navigate('/learn');
  };

  const handleDownload = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `malcard-${currentCard.id}-${Date.now()}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fav = isFavorite(currentCard.id);

  return (
    <div style={{ paddingBottom: 20 }}>
      <TopNav title="카드 결과" rightContent={
        <button
          onClick={handleDownload}
          aria-label="녹음 파일 다운로드"
          disabled={!audioBlob}
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--color-surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            opacity: audioBlob ? 1 : 0.4,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D2A26" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      } />

      <div style={{
        margin: '12px 20px', background: 'var(--color-surface)', borderRadius: 'var(--radius-2xl)',
        overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          background: 'var(--color-primary-gradient)', padding: 22, textAlign: 'center', color: 'white',
          position: 'relative',
        }}>
          <button
            onClick={() => toggleFavorite(currentCard.id)}
            aria-label={fav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 32, height: 32, borderRadius: 10,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={fav ? 'white' : 'none'} stroke="white" strokeWidth="2">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
            </svg>
          </button>
          <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 14 }}>"{currentCard.korean}"</div>
          <div style={{ width: 90, height: 90, margin: '0 auto 10px', position: 'relative' }}>
            <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="45" cy="45" r="39" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="7" />
              <circle cx="45" cy="45" r="39" fill="none" stroke="white" strokeWidth="7"
                strokeLinecap="round" strokeDasharray={245} strokeDashoffset={245 - (245 * score / 100)} />
            </svg>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              fontSize: 28, fontWeight: 900,
            }}>
              {score}<span style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>점</span>
            </div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>
            {score >= 80 ? '잘하고 있어요! 👏' : score >= 60 ? '조금만 더 연습해요! 💪' : '다시 도전해봐요! 🔥'}
          </div>
        </div>

        <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{currentCard.emoji}</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#2D2A26' }}>{currentCard.korean}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{currentCard.romanize}</div>
          </div>
        </div>
      </div>

      <div style={{
        margin: '0 20px 12px', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
        padding: 16, border: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#2D2A26' }}>음소 분석</h3>
          <span style={{
            marginLeft: 'auto', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
            background: 'var(--color-success-light)', color: '#43A047',
          }}>{correctCount}/{phonemes.length} 정확</span>
        </div>

        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          {phonemes.map((p, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '6px 6px', borderRadius: 10, minWidth: 40,
              background: p.correct ? '#F0FDF0' : '#FFF0F0',
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: p.correct ? '#43A047' : '#E53935' }}>{p.char}</div>
              <div style={{
                fontSize: 10, color: p.correct ? 'var(--color-text-tertiary)' : '#E53935',
                textDecoration: p.correct ? 'none' : 'line-through',
              }}>{p.ipa}</div>
              {!p.correct && p.targetIpa && (
                <div style={{ fontSize: 10, color: '#43A047', fontWeight: 700 }}>→ {p.targetIpa}</div>
              )}
            </div>
          ))}
        </div>

        {phonemes.some((p) => !p.correct) && (
          <div style={{
            borderRadius: 10, padding: '10px 12px',
            display: 'flex', alignItems: 'flex-start', gap: 8,
            background: 'var(--color-error-light)', border: '1px solid #FFE0E0',
            fontSize: 12, color: '#C62828', lineHeight: 1.5,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E53935" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>
              <strong>'{phonemes.find((p) => !p.correct)?.char}'</strong> 발음을 조금 더 또렷하게 해보세요. 입 모양과 혀 위치를 확인하면서 다시 한 번 따라 말해보세요.
            </span>
          </div>
        )}
      </div>

      <div style={{
        margin: '0 20px 12px', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
        padding: 16, border: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#2D2A26' }}>억양 분석</h3>
          <span style={{
            marginLeft: 'auto', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
            background: 'var(--color-warning-light)', color: '#F57C00',
          }}>상승 부족</span>
        </div>

        <div style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8C857A' }} />
              <YAxis hide domain={['auto', 'auto']} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="native" stroke="#6C5CE7" strokeWidth={2} dot={false} name="네이티브" />
              <Line type="monotone" dataKey="user" stroke="#F57C00" strokeWidth={2} strokeDasharray="4 3" dot={false} name="내 발음" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{
          marginTop: 10, borderRadius: 10, padding: '10px 12px',
          background: 'var(--color-primary-light)',
          display: 'flex', alignItems: 'flex-start', gap: 8,
          fontSize: 12, color: 'var(--color-primary-dark)', lineHeight: 1.5,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span>{intonation.feedback}</span>
        </div>
      </div>

      <div style={{
        margin: '0 20px 12px', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
        padding: 16, border: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#2D2A26' }}>AI 코칭</h3>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'var(--color-primary-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 14, fontWeight: 800,
          }}>M</div>
          <div style={{
            flex: 1, background: 'var(--color-bg)', borderRadius: 14,
            borderTopLeftRadius: 4, padding: 12,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>MalCard AI</div>
            <div style={{ fontSize: 12, color: '#4A4640', lineHeight: 1.6 }}>{llmFeedback}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 20px', display: 'flex', gap: 10 }}>
        <button onClick={handleRetry} style={{
          flex: 1, padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 800,
          background: 'var(--color-surface)', color: 'var(--color-primary)',
          border: '2px solid var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          다시 녹음
        </button>
        <button onClick={handleNext} style={{
          flex: 1, padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 800,
          background: 'var(--color-primary-gradient)', color: 'white', border: 'none',
          boxShadow: '0 4px 14px rgba(108,92,231,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          다음 카드
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
