/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSituationStore } from '../stores/useSituationStore';
import { tokens } from '../theme/tokens';
import TopBar from '../components/common/TopBar';
import { IconMic } from '../components/icons';

// Minimal polyfill for window.SpeechRecognition
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function SituationStep3Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentSituation, currentPuzzleIndex, nextPuzzle } = useSituationStore();

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'success' | 'fail'>('idle');
  const [failCount, setFailCount] = useState(0);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!currentSituation || currentSituation.id !== id) {
      navigate(`/situations/${id}/step1`, { replace: true });
    }
  }, [currentSituation, id, navigate]);

  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'ko-KR';

      recognition.onstart = () => {
        setIsRecording(true);
        setTranscript('');
        setFeedback('idle');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  if (!currentSituation) return null;

  const puzzle = currentSituation.puzzles[currentPuzzleIndex];
  if (!puzzle) return null;

  const handleMicClick = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const normalizeText = (text: string) => {
    return text.replace(/[.,!?]/g, '').replace(/\s+/g, '').trim();
  };

  const handleCheck = () => {
    const target = normalizeText(puzzle.sentence);
    const spoken = normalizeText(transcript);

    if (spoken === target) {
      setFeedback('success');
    } else {
      setFeedback('fail');
      setFailCount((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    const hasMore = nextPuzzle();
    if (hasMore) {
      navigate(`/situations/${currentSituation.id}/step2`);
    } else {
      navigate(`/situations/${currentSituation.id}/result`, { replace: true });
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: tokens.pageBg,
      }}
    >
      <TopBar
        title={`발음 연습 (${currentPuzzleIndex + 1}/${currentSituation.puzzles.length})`}
        onBack={() => navigate(`/situations/${currentSituation.id}/step2`)}
      />

      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        <div style={{ marginTop: 20, marginBottom: 40, padding: 24, background: '#FFFFFF', borderRadius: 16, width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#0F172A', lineHeight: 1.4 }}>
            {puzzle.sentence}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <div style={{ minHeight: 60, marginBottom: 40, fontSize: 18, color: isRecording ? tokens.primary : '#475569', textAlign: 'center' }}>
            {transcript || (isRecording ? '듣고 있어요...' : '마이크 버튼을 누르고 말해보세요')}
          </div>

          {feedback === 'success' && (
            <div style={{ color: '#10B981', fontWeight: 'bold', fontSize: 20, marginBottom: 20 }}>
              훌륭해요! 🎉
            </div>
          )}
          {feedback === 'fail' && (
            <div style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 16, marginBottom: 20 }}>
              다시 한번 말해보세요 (틀린 횟수: {failCount})
            </div>
          )}

          {feedback !== 'success' && (failCount < 3) ? (
            <button
              onClick={handleMicClick}
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: isRecording ? '#FEF2F2' : tokens.primaryGradFlat,
                border: isRecording ? `2px solid #EF4444` : 'none',
                color: isRecording ? '#EF4444' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isRecording ? `0 0 0 8px #FEF2F2` : `0 8px 24px ${tokens.primaryShadow}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                animation: isRecording ? 'pulse 1.5s infinite' : 'none',
              }}
            >
              <IconMic size={36} style={{ color: isRecording ? '#EF4444' : '#FFFFFF' }} />
            </button>
          ) : (
            <button
              onClick={handleNext}
              style={{
                width: '100%',
                padding: 16,
                background: tokens.primaryGradFlat,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: tokens.radiusMd,
                fontSize: 16,
                fontWeight: 'bold',
                boxShadow: `0 4px 12px ${tokens.primaryShadow}`,
                cursor: 'pointer',
              }}
            >
              {currentPuzzleIndex < currentSituation.puzzles.length - 1 ? '다음 문장으로' : '결과 보기'}
            </button>
          )}

          {transcript && !isRecording && feedback === 'idle' && (
            <button
              onClick={handleCheck}
              style={{
                marginTop: 24,
                padding: '12px 24px',
                background: '#FFFFFF',
                color: tokens.primary,
                border: `1px solid ${tokens.primary}`,
                borderRadius: tokens.radiusMd,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              발음 확인하기
            </button>
          )}

          <style>{`
            @keyframes pulse {
              0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
              70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
              100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}
