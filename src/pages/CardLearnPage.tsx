import { useNavigate } from 'react-router-dom';
import { useCardStore } from '../stores/useCardStore';
import TopNav from '../components/common/TopNav';
import { useRef, useCallback } from 'react';

export default function CardLearnPage() {
  const navigate = useNavigate();
  const { currentCard, isRecording, setIsRecording, setAudioBlob } = useCardStore();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleTTS = useCallback(() => {
    if (!currentCard) return;
    const utterance = new SpeechSynthesisUtterance(currentCard.korean);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  }, [currentCard]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        navigate('/loading');
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert('마이크 접근 권한이 필요합니다.');
    }
  }, [setIsRecording, setAudioBlob, navigate]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [setIsRecording]);

  if (!currentCard) {
    navigate('/');
    return null;
  }

  return (
    <div>
      <TopNav title={currentCard.subcategory ?? '학습'} rightContent={
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>1 / 4</span>
      } />

      {/* Progress Bar */}
      <div style={{ padding: '4px 20px 20px' }}>
        <div style={{ height: 4, background: 'var(--color-muted)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '25%', background: 'var(--color-primary)', borderRadius: 4 }} />
        </div>
      </div>

      {/* The Card */}
      <div style={{ padding: '0 20px' }}>
        <div style={{
          background: 'var(--color-surface)', borderRadius: 'var(--radius-2xl)',
          overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          {/* Gradient stripe */}
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

      {/* Card stack shadows */}
      <div style={{ padding: '0 20px', marginTop: -2 }}>
        <div style={{ height: 6, margin: '0 8px', background: '#EFEBE5', borderRadius: '0 0 16px 16px' }} />
        <div style={{ height: 4, margin: '0 16px', background: 'var(--color-muted)', borderRadius: '0 0 12px 12px' }} />
      </div>

      {/* Phoneme Hints */}
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

      {/* Recording Section */}
      <div style={{
        position: 'fixed', bottom: 0, width: '100%', maxWidth: 430,
        background: 'var(--color-surface)', borderRadius: '22px 22px 0 0',
        padding: '20px 20px 36px', textAlign: 'center',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
      }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          {isRecording ? '녹음 중... 다시 눌러서 종료' : '버튼을 누르고 따라 말해보세요'}
        </div>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            width: 64, height: 64, borderRadius: '50%',
            background: isRecording
              ? 'linear-gradient(135deg, #EF5350, #FF8A80)'
              : 'var(--color-primary-gradient)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isRecording
              ? '0 4px 18px rgba(239,83,80,0.35)'
              : '0 4px 18px rgba(108,92,231,0.35)',
          }}
        >
          {isRecording ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="white" strokeWidth="2" />
              <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" />
            </svg>
          )}
        </button>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {isRecording ? '탭하여 녹음 종료' : '탭하여 녹음 시작'}
        </div>
      </div>
    </div>
  );
}
