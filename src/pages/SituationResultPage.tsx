import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSituationStore } from '../stores/useSituationStore';
import { tokens } from '../theme/tokens';
import TopBar from '../components/common/TopBar';

export default function SituationResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentSituation } = useSituationStore();

  useEffect(() => {
    // If there is no situation loaded or the URL ID doesn't match the current store state, redirect.
    if (!currentSituation || currentSituation.id !== id) {
      navigate('/', { replace: true });
    }
  }, [currentSituation, id, navigate]);

  if (!currentSituation || currentSituation.id !== id) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: tokens.pageBg,
      }}
    >
      <TopBar title="상황 학습 완료" onBack={() => navigate('/')} />

      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 80, marginBottom: 24 }}>🎉</div>

        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginBottom: 12, textAlign: 'center' }}>
          수고하셨습니다!<br/>'{currentSituation.title}' 상황을<br/>완벽하게 마스터했어요.
        </h1>

        <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 48 }}>
          총 {currentSituation.puzzles.length}개의 문장을 학습했습니다.
        </p>

        <button
          onClick={() => navigate('/')}
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
          다른 상황 학습하기
        </button>
      </div>
    </div>
  );
}
