import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSituationStore } from '../stores/useSituationStore';
import { tokens } from '../theme/tokens';
import TopBar from '../components/common/TopBar';
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

  // True once the puzzle is solved correctly — drives the success animation
  // and the reference-audio playback before advancing to STEP 3.
  const [solved, setSolved] = useState(false);
  const advancingRef = useRef(false);

  useEffect(() => {
    if (!currentSituation || currentSituation.id !== id) {
      navigate(`/situations/${id}/step1`, { replace: true });
      return;
    }

    if (slots.length === 0) {
      initPuzzle();
    }
  }, [currentSituation, id, navigate, slots.length, initPuzzle]);

  // Reset the solved flag whenever a new puzzle is initialised (slots reset to
  // all-empty) so the success state doesn't leak across puzzles, and stop any
  // lingering audio when leaving the screen.
  useEffect(() => {
    advancingRef.current = false;
    setSolved(false);
    return () => cancelSpeech();
  }, [currentPuzzleIndex]);

  if (!currentSituation || slots.length === 0) return null;

  const puzzle = currentSituation.puzzles[currentPuzzleIndex];
  if (!puzzle) return null;

  // 기획서 3-2: 정답 완성 시 애니메이션 + 정답 문장 자동 음성 재생 →
  // 따라 말하기(STEP3) 진입. 모범 응답 오디오(audio_path)가 있으면 그것을,
  // 없으면 TTS로 정답 문장을 들려준 뒤 STEP3로 넘어간다.
  const handleCheck = () => {
    const isPerfect = checkPuzzleAnswer();
    if (!isPerfect || advancingRef.current) return;
    advancingRef.current = true;
    setSolved(true);

    let navigated = false;
    const advance = () => {
      if (navigated) return;
      navigated = true;
      navigate(`/situations/${currentSituation.id}/step3`);
    };
    playReference(puzzle.sentence, puzzle.audio_path, { onend: advance });
    // 재생이 끝나면 바로 진입하되, onend를 보장하지 않는 음성 엔진을 위해
    // 상한 타이머로 진입을 보강한다(짧은 문장 청취 후 자연스럽게 전환).
    window.setTimeout(advance, 2500);
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
              padding: '12px 16px',
              background: '#ECFDF5',
              border: '1px solid #6EE7B7',
              borderRadius: tokens.radiusMd,
              color: '#047857',
              fontSize: 15,
              fontWeight: 'bold',
              textAlign: 'center',
              animation: 'mc-fade-up 0.3s both',
            }}
          >
            {t('situation.puzzleSuccess')}
          </div>
        )}

        <button
          data-testid="situation-check-puzzle"
          disabled={!allSlotsFilled || solved}
          onClick={handleCheck}
          style={{
            width: '100%',
            padding: 16,
            background: allSlotsFilled && !solved ? tokens.primaryGradFlat : '#E2E8F0',
            color: allSlotsFilled && !solved ? '#FFFFFF' : '#94A3B8',
            border: 'none',
            borderRadius: tokens.radiusMd,
            fontSize: 16,
            fontWeight: 'bold',
            cursor: allSlotsFilled && !solved ? 'pointer' : 'not-allowed',
            boxShadow: allSlotsFilled && !solved ? `0 4px 12px ${tokens.primaryShadow}` : 'none',
          }}
        >
          {t('situation.check')}
        </button>
      </div>
    </div>
  );
}
