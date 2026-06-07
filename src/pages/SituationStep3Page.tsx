import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSituationStore } from '../stores/useSituationStore';
import { useHistoryStore } from '../stores/useHistoryStore';
import { useRecorder } from '../hooks/useRecorder';
import { analyzer } from '../lib/analyzer';
import { tokens } from '../theme/tokens';
import TopBar from '../components/common/TopBar';
import {
  IconAlert,
  IconArrowRight,
  IconMic,
  IconRotate,
  IconSparkle,
  IconStop,
  IconVolume,
} from '../components/icons';
import { ApiError, errorI18nKey } from '../api/client';
import { cancelSpeech, playReference } from '../lib/speech';
import {
  FeedbackBubble,
  IssuesSection,
  PhonemeSection,
  ProsodySection,
  ScoreCard,
} from '../components/result/ResultSections';
import { resolveFeedback } from '../components/result/resultHelpers';
import type { AnalysisResult, Card } from '../types';

const MAX_DURATION_MS = 12_000;
const MIN_DURATION_MS = 800;

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Phase = 'record' | 'analyzing' | 'result';

// 기획서 STEP3 (따라 말하기): 기존 발음 연습 워크플로우와 동일하게 — 마이크로
// 녹음 → 백엔드 분석(/analysis/full, mock 시 mockAnalyzer) → 음소/억양/AI 피드백
// 결과를 보여준다. (이전의 브라우저 SpeechRecognition 단순 일치 판정에서 교체)
export default function SituationStep3Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentSituation, currentPuzzleIndex, nextPuzzle } = useSituationStore();
  const recordAttempt = useHistoryStore((s) => s.recordAttempt);

  const recorder = useRecorder({ maxDurationMs: MAX_DURATION_MS, minDurationMs: MIN_DURATION_MS });
  const [phase, setPhase] = useState<Phase>('record');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [isListening, setIsListening] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!currentSituation || currentSituation.id !== id) {
      navigate(`/situations/${id}/step1`, { replace: true });
    }
  }, [currentSituation, id, navigate]);

  // Stop any in-flight TTS / analysis when leaving the screen.
  useEffect(() => {
    return () => {
      cancelSpeech();
      abortRef.current?.abort();
    };
  }, []);

  const puzzle = currentSituation?.puzzles[currentPuzzleIndex];

  // Synthetic Card so the shared analyzer (which keys off `korean`) can run on
  // the puzzle's model sentence exactly like the standalone pronunciation flow.
  const card: Card | null = useMemo(() => {
    if (!currentSituation || !puzzle) return null;
    return {
      id: `sit-${currentSituation.id}-${puzzle.id}`,
      type: '상황형회화',
      korean: puzzle.sentence,
      russian: '',
      prompt_question: '',
    };
  }, [currentSituation, puzzle]);

  const runAnalyze = useCallback(
    (blob: Blob) => {
      if (!card) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setError(null);
      setResult(null);
      setPhase('analyzing');

      analyzer
        .analyze(blob, card, { signal: controller.signal })
        .then((res) => {
          if (controller.signal.aborted) return;
          setResult(res);
          setPhase('result');
          // Persist to history (기록) just like the standalone pronunciation flow
          // in ResultPage — each successful analysis is one attempt.
          if (res.status === 'ready') {
            recordAttempt({
              cardId: card.id,
              score: res.score,
              korean: card.korean,
              type: card.type,
            });
          }
        })
        .catch((err) => {
          if ((err as DOMException)?.name === 'AbortError') return;
          if (err instanceof ApiError) {
            setError({ code: err.code, message: err.message });
          } else {
            setError({ code: 'PIPELINE_ERROR', message: (err as Error).message ?? '' });
          }
          setPhase('result');
        });
    },
    [card, recordAttempt],
  );

  // Auto-submit when recording produces a blob (mirrors CardLearnPage). The
  // setState inside runAnalyze is the external sync from the audio subsystem
  // finishing, not a cascading render.
  useEffect(() => {
    if (phase === 'record' && recorder.status === 'preview' && recorder.audioBlob) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      runAnalyze(recorder.audioBlob);
    }
  }, [phase, recorder.status, recorder.audioBlob, runAnalyze]);

  if (!currentSituation || !puzzle || !card) return null;

  const handleMicClick = () => {
    if (recorder.status === 'recording') recorder.stop();
    else recorder.start();
  };

  // 모범 응답(듣기 예시) 재생: audio_path 우선, 없으면 TTS.
  const handleListen = () => {
    playReference(puzzle.sentence, puzzle.audio_path, {
      onstart: () => setIsListening(true),
      onend: () => setIsListening(false),
    });
  };

  const handleRerecord = () => {
    abortRef.current?.abort();
    recorder.reset();
    setResult(null);
    setError(null);
    setPhase('record');
  };

  const handleNext = () => {
    const hasMore = nextPuzzle();
    if (hasMore) {
      navigate(`/situations/${currentSituation.id}/step2`);
    } else {
      navigate(`/situations/${currentSituation.id}/result`, { replace: true });
    }
  };

  const isLast = currentPuzzleIndex >= currentSituation.puzzles.length - 1;
  const nextLabel = isLast ? t('situation.viewResult') : t('situation.nextSentence');

  const recording = recorder.status === 'recording';
  const denied = recorder.status === 'denied';
  const errored = recorder.status === 'error';
  const remaining = Math.max(0, MAX_DURATION_MS - recorder.durationMs);

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

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Target sentence + optional reference playback — always visible so the
            learner can re-listen before re-recording. */}
        {phase !== 'analyzing' && (
          <div style={{ padding: 20, paddingBottom: 0 }}>
            <div
              style={{
                padding: 24,
                background: '#FFFFFF',
                borderRadius: 16,
                width: '100%',
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                textAlign: 'center',
              }}
            >
              <div
                data-testid="situation-target-sentence"
                style={{ fontSize: 24, fontWeight: 'bold', color: '#0F172A', lineHeight: 1.4 }}
              >
                {puzzle.sentence}
              </div>
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
          </div>
        )}

        {/* ---- RECORD PHASE ---- */}
        {phase === 'record' && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              padding: 20,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: denied || errored ? '#EF4444' : recording ? '#EF4444' : '#475569',
                marginBottom: 14,
                textAlign: 'center',
              }}
            >
              {denied
                ? t('situation.micDenied')
                : errored
                  ? recorder.errorMessage ?? t('situation.speechError')
                  : recording
                    ? t('situation.recording')
                    : t('situation.micPrompt')}
            </div>

            {recording && (
              <div
                data-testid="record-timer"
                style={{
                  fontSize: 12,
                  color: '#64748B',
                  marginBottom: 14,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <span style={{ color: '#0F172A', fontWeight: 700 }}>
                  {formatTime(recorder.durationMs)}
                </span>
                <span style={{ color: '#94A3B8', margin: '0 6px' }}>·</span>
                {t('learn.remainingLabel')} {formatTime(remaining)}
              </div>
            )}

            <button
              data-testid="situation-mic"
              onClick={handleMicClick}
              aria-label={recording ? t('situation.recording') : t('situation.micPrompt')}
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: recording ? '#FEF2F2' : tokens.primaryGradFlat,
                border: recording ? `2px solid #EF4444` : 'none',
                color: recording ? '#EF4444' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: recording ? `0 0 0 8px #FEF2F2` : `0 8px 24px ${tokens.primaryShadow}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                animation: recording ? 'pulse 1.5s infinite' : 'none',
              }}
            >
              {recording ? (
                <IconStop size={32} style={{ color: '#EF4444' }} />
              ) : (
                <IconMic size={36} style={{ color: '#FFFFFF' }} />
              )}
            </button>

            <style>{`
              @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
                100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
              }
            `}</style>
          </div>
        )}

        {/* ---- ANALYZING PHASE ---- */}
        {phase === 'analyzing' && (
          <div
            data-testid="situation-analyzing"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              padding: 40,
              gap: 18,
            }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: tokens.primaryGrad,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: `0 16px 36px -10px ${tokens.primaryShadow}`,
                animation: 'mc-bounce 2s ease-in-out infinite',
              }}
            >
              <IconSparkle size={44} stroke={2} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>
              {t('loading.title')}
            </div>
            <div style={{ fontSize: 14, color: '#64748B' }}>{t('loading.subtitle')}</div>
          </div>
        )}

        {/* ---- RESULT PHASE ---- */}
        {phase === 'result' && (
          <div style={{ paddingBottom: 20 }}>
            {error ? (
              <div
                data-testid="situation-result-error"
                style={{
                  margin: `16px ${tokens.pad}px 0`,
                  padding: 20,
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: tokens.radiusLg,
                  color: '#991B1B',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                  {t('result.errorTitle')}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{t(errorI18nKey(error.code))}</div>
              </div>
            ) : result && (result.status === 'retry' || result.status === 'discarded') ? (
              <div
                data-testid="situation-result-banner"
                style={{
                  margin: `16px ${tokens.pad}px 0`,
                  padding: 20,
                  background: result.status === 'retry' ? '#FFFBEB' : '#FEF2F2',
                  border: `1px solid ${result.status === 'retry' ? '#FDE68A' : '#FECACA'}`,
                  borderRadius: tokens.radiusLg,
                  color: result.status === 'retry' ? '#B45309' : '#991B1B',
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
                    {result.status === 'retry'
                      ? t('result.retryBannerTitle')
                      : t('result.discardedBannerTitle')}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                    {result.status === 'retry'
                      ? t('result.retryBannerBody')
                      : t('result.discardedBannerBody')}
                  </div>
                </div>
              </div>
            ) : result ? (
              <>
                <ScoreCard result={result} reference={puzzle.sentence} />
                <PhonemeSection result={result} />
                <IssuesSection result={result} />
                <ProsodySection result={result} />
                <FeedbackBubble text={resolveFeedback(t, result.aiFeedback)} />
              </>
            ) : null}

            <div
              style={{
                display: 'flex',
                gap: 10,
                padding: `20px ${tokens.pad}px 0`,
              }}
            >
              <button
                data-testid="situation-rerecord"
                onClick={handleRerecord}
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
                  cursor: 'pointer',
                }}
              >
                <IconRotate size={18} stroke={2.2} /> {t('result.actionRetry')}
              </button>
              <button
                data-testid="situation-next"
                onClick={handleNext}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: tokens.radiusMd,
                  background: tokens.primaryGradFlat,
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  boxShadow: `0 8px 18px -6px ${tokens.primaryShadow}`,
                  cursor: 'pointer',
                }}
              >
                {nextLabel} <IconArrowRight size={18} stroke={2.4} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
