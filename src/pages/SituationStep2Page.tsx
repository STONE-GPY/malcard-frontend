import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSituationStore } from '../stores/useSituationStore';
import { tokens } from '../theme/tokens';
import TopBar from '../components/common/TopBar';
import { IconVolume } from '../components/icons';
import { cancelSpeech, playReference } from '../lib/speech';

export default function SituationStep2Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    currentSituation,
    currentPuzzleIndex,
    slots,
    usedWordIndices,
    initPuzzle,
    placeWord,
    removeWord,
    checkPuzzleAnswer,
  } = useSituationStore();

  // True once the puzzle is solved correctly — reveals the success banner with
  // an OPTIONAL "listen" button and the "continue to STEP 3" button. We no
  // longer auto-play the answer or auto-advance: the learner chooses when to
  // hear the model utterance and when to move on.
  const [solved, setSolved] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!currentSituation || currentSituation.id !== id) {
      navigate(`/situations/${id}/step1`, { replace: true });
      return;
    }

    if (slots.length === 0) {
      initPuzzle();
    }
  }, [currentSituation, id, navigate, slots.length, initPuzzle]);

  // Step2 remounts on every visit (nextPuzzle advances the index from Step3 and
  // routes back here), so `solved`/`isListening` start false naturally — we only
  // need to stop any lingering reference audio when leaving the screen.
  useEffect(() => () => cancelSpeech(), []);

  if (!currentSituation || slots.length === 0) return null;

  const puzzle = currentSituation.puzzles[currentPuzzleIndex];
  if (!puzzle) return null;

  // 기획서 3-2: 정답 완성 시 성공 애니메이션을 보여준다. 자동 재생/자동 전환은
  // 하지 않고, 학습자가 원할 때만 정답 발화를 듣고(handleListen) STEP3로
  // 넘어간다(handleContinue).
  const handleCheck = () => {
    if (checkPuzzleAnswer()) setSolved(true);
  };

  // 성공 후 선택적으로 정답 발화를 들려준다: 모범 응답 오디오(audio_path)가 있으면
  // 그것을, 없으면 TTS로 정답 문장을 재생한다.
  const handleListen = () => {
    playReference(puzzle.sentence, puzzle.audio_path, {
      onstart: () => setIsListening(true),
      onend: () => setIsListening(false),
    });
  };

  const handleContinue = () => {
    navigate(`/situations/${currentSituation.id}/step3`);
  };

  const allSlotsFilled = slots.every((s) => s !== null);

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
        title={t('situation.makeSentenceTitle', {
          current: currentPuzzleIndex + 1,
          total: currentSituation.puzzles.length,
        })}
        onBack={() => navigate(`/situations/${currentSituation.id}/step1`)}
      />

      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 32, fontSize: 16, color: '#475569', textAlign: 'center' }}>
          {t('situation.makeSentencePrompt1')}<br />{t('situation.makeSentencePrompt2')}
        </div>

        <div
          data-testid="situation-slots"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            minHeight: 120,
            padding: 16,
            background: '#FFFFFF',
            borderRadius: tokens.radiusMd,
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
            border: '1px dashed #CBD5E1',
            alignContent: 'flex-start'
          }}
        >
          {slots.map((slot, i) => (
            <div
              key={i}
              data-testid="situation-slot"
              onClick={() => {
                if (slot) removeWord(i);
              }}
              style={{
                padding: '10px 16px',
                background: slot ? (slot.isWrong ? '#FEF2F2' : '#EFF6FF') : 'transparent',
                border: slot
                  ? `2px solid ${slot.isWrong ? '#EF4444' : tokens.primary}`
                  : '2px solid transparent',
                borderBottom: slot && !slot.isWrong ? `4px solid ${tokens.primary}88` : undefined,
                borderRadius: tokens.radiusSm,
                fontSize: 16,
                fontWeight: 'bold',
                color: slot ? (slot.isWrong ? '#EF4444' : tokens.primary) : 'transparent',
                cursor: slot ? 'pointer' : 'default',
                minWidth: 60,
                textAlign: 'center',
                boxShadow: slot ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                position: 'relative'
              }}
            >
              {slot ? slot.word : '___'}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', marginBottom: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {puzzle.initialWords?.map((word, idx) => {
              const isUsed = usedWordIndices.includes(idx);
              return (
                <button
                  key={idx}
                  data-testid="situation-word"
                  data-word={word}
                  disabled={isUsed}
                  onClick={() => placeWord(idx, word)}
                  style={{
                    padding: '12px 20px',
                    background: isUsed ? '#F1F5F9' : '#FFFFFF',
                    border: `1px solid ${isUsed ? '#E2E8F0' : '#CBD5E1'}`,
                    borderBottom: isUsed ? '1px solid #E2E8F0' : '3px solid #94A3B8',
                    borderRadius: tokens.radiusMd,
                    fontSize: 16,
                    fontWeight: 600,
                    color: isUsed ? '#94A3B8' : '#0F172A',
                    cursor: isUsed ? 'default' : 'pointer',
                    transform: isUsed ? 'none' : 'translateY(-2px)',
                    transition: 'all 0.1s',
                  }}
                >
                  {word}
                </button>
              );
            })}
          </div>
        </div>

        {solved && (
          <div
            data-testid="situation-puzzle-success"
            style={{
              marginBottom: 12,
              padding: '14px 16px',
              background: '#ECFDF5',
              border: '1px solid #6EE7B7',
              borderRadius: tokens.radiusMd,
              color: '#047857',
              animation: 'mc-fade-up 0.3s both',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 'bold', textAlign: 'center' }}>
              {t('situation.puzzleSuccess')}
            </div>
            {/* 선택적 듣기: 학습자가 원할 때만 정답 발화를 들려준다. */}
            <button
              data-testid="situation-puzzle-listen"
              onClick={handleListen}
              aria-pressed={isListening}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
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
        )}

        {solved ? (
          <button
            data-testid="situation-puzzle-continue"
            onClick={handleContinue}
            style={{
              width: '100%',
              padding: 16,
              background: tokens.primaryGradFlat,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: tokens.radiusMd,
              fontSize: 16,
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: `0 4px 12px ${tokens.primaryShadow}`,
            }}
          >
            {t('situation.puzzleContinue')}
          </button>
        ) : (
          <button
            data-testid="situation-check-puzzle"
            disabled={!allSlotsFilled}
            onClick={handleCheck}
            style={{
              width: '100%',
              padding: 16,
              background: allSlotsFilled ? tokens.primaryGradFlat : '#E2E8F0',
              color: allSlotsFilled ? '#FFFFFF' : '#94A3B8',
              border: 'none',
              borderRadius: tokens.radiusMd,
              fontSize: 16,
              fontWeight: 'bold',
              cursor: allSlotsFilled ? 'pointer' : 'not-allowed',
              boxShadow: allSlotsFilled ? `0 4px 12px ${tokens.primaryShadow}` : 'none',
            }}
          >
            {t('situation.check')}
          </button>
        )}
      </div>
    </div>
  );
}
