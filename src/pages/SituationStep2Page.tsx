import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSituationStore } from '../stores/useSituationStore';
import { tokens } from '../theme/tokens';
import TopBar from '../components/common/TopBar';

export default function SituationStep2Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!currentSituation || currentSituation.id !== id) {
      navigate(`/situations/${id}/step1`, { replace: true });
      return;
    }

    if (slots.length === 0) {
      initPuzzle();
    }
  }, [currentSituation, id, navigate, slots.length, initPuzzle]);

  if (!currentSituation || slots.length === 0) return null;

  const puzzle = currentSituation.puzzles[currentPuzzleIndex];
  if (!puzzle) return null;

  const handleCheck = () => {
    const isPerfect = checkPuzzleAnswer();
    if (isPerfect) {
      setTimeout(() => {
        navigate(`/situations/${currentSituation.id}/step3`);
      }, 500);
    }
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
        title={`문장 만들기 (${currentPuzzleIndex + 1}/${currentSituation.puzzles.length})`}
        onBack={() => navigate(`/situations/${currentSituation.id}/step1`)}
      />

      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 32, fontSize: 16, color: '#475569', textAlign: 'center' }}>
          단어 카드를 순서대로 눌러<br/>문장을 완성해보세요.
        </div>

        <div
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

        <button
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
          확인하기
        </button>
      </div>
    </div>
  );
}
