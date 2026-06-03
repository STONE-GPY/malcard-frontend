/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSituationStore } from '../stores/useSituationStore';
import { tokens } from '../theme/tokens';
import TopBar from '../components/common/TopBar';
import { IconMic, IconVolume } from '../components/icons';
import { cancelSpeech, playReference } from '../lib/speech';

const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function SituationStep3Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentSituation, currentPuzzleIndex, nextPuzzle } = useSituationStore();

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'success' | 'fail' | 'error' | 'unsupported'>('idle');
  const [failCount, setFailCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!currentSituation || currentSituation.id !== id) {
      navigate(`/situations/${id}/step1`, { replace: true });
    }
  }, [currentSituation, id, navigate]);

  useEffect(() => {
    if (!SpeechRecognition) {
      // 브라우저가 Web Speech Recognition을 지원하지 않음(Firefox 등). 'error'와
      // 구분해 Chrome/Edge 안내 + 건너뛰기 UI를 보여준다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFeedback('unsupported');
      setErrorMessage(t('situation.speechUnsupported'));
      return;
    }

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
      setFeedback('error');
      setErrorMessage(
        event.error === 'not-allowed'
          ? t('situation.micDenied')
          : t('situation.speechError'),
      );
    };

    recognitionRef.current = recognition;

    return () => {
      recognitionRef.current?.abort();
      cancelSpeech();
    };
  }, [t]);

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

  // 모범 응답(듣기 예시) 재생: audio_path 우선, 없으면 TTS.
  const handleListen = () => {
    playReference(puzzle.sentence, puzzle.audio_path, {
      onstart: () => setIsListening(true),
      onend: () => setIsListening(false),
    });
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
        title={t('situation.speechTitle', {
          current: currentPuzzleIndex + 1,
          total: currentSituation.puzzles.length,
        })}
        onBack={() => navigate(`/situations/${currentSituation.id}/step2`)}
      />

      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginTop: 20, marginBottom: 40, padding: 24, background: '#FFFFFF', borderRadius: 16, width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', textAlign: 'center' }}>
          <div data-testid="situation-target-sentence" style={{ fontSize: 24, fontWeight: 'bold', color: '#0F172A', lineHeight: 1.4 }}>
            {puzzle.sentence}
          </div>
          {/* 기획서 4-2: 모범 응답 오디오는 '듣기 예시'로 우선 활용 — 아이가
              먼저 듣고 따라 말한다. audio_path 우선, 없으면 TTS. */}
          <button
            data-testid="situation-listen"
            onClick={handleListen}
            aria-pressed={isListening}
            style={{
              marginTop: 16,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 999,
              background: isListening ? tokens.primaryGradFlat : '#FFFFFF',
              color: isListening ? '#FFFFFF' : tokens.primary,
              border: `1px solid ${tokens.primary}`,
              fontSize: 14,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            <IconVolume size={18} style={{ color: isListening ? '#FFFFFF' : tokens.primary }} />
            {t('situation.listen')}
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <div data-testid="situation-transcript" style={{ minHeight: 60, marginBottom: 40, fontSize: 18, color: isRecording ? tokens.primary : '#475569', textAlign: 'center' }}>
            {transcript || (isRecording ? t('situation.listening') : t('situation.micPrompt'))}
          </div>

          {feedback === 'success' && (
            <div data-testid="situation-speech-success" style={{ color: '#10B981', fontWeight: 'bold', fontSize: 20, marginBottom: 20 }}>
              {t('situation.success')}
            </div>
          )}
          {feedback === 'fail' && (
            <div style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 16, marginBottom: 20 }}>
              {t('situation.fail', { count: failCount })}
            </div>
          )}
          {feedback === 'error' && (
            <div data-testid="situation-speech-error" style={{ color: '#EF4444', fontSize: 14, marginBottom: 20, maxWidth: '80%', lineHeight: 1.5 }}>
              {errorMessage}
            </div>
          )}
          {feedback === 'unsupported' && (
            <div
              data-testid="situation-speech-unsupported"
              style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1D4ED8',
                fontSize: 14,
                lineHeight: 1.6,
                padding: '14px 16px',
                borderRadius: 12,
                marginBottom: 24,
                maxWidth: '90%',
                textAlign: 'center',
              }}
            >
              {errorMessage}
            </div>
          )}

          {feedback !== 'success' && feedback !== 'error' && feedback !== 'unsupported' && failCount < 3 ? (
            <button
              data-testid="situation-mic"
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
              data-testid="situation-next"
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
              {feedback === 'unsupported' || feedback === 'error'
                ? t('situation.speechSkip')
                : currentPuzzleIndex < currentSituation.puzzles.length - 1
                  ? t('situation.nextSentence')
                  : t('situation.viewResult')}
            </button>
          )}

          {transcript && !isRecording && feedback === 'idle' && (
            <button
              data-testid="situation-check-speech"
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
              {t('situation.checkPronunciation')}
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
