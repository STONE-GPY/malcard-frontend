import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSituationStore } from '../stores/useSituationStore';
import { tokens } from '../theme/tokens';
import TopBar from '../components/common/TopBar';
import { getSituationTitle } from '../i18n/situationText';

export default function SituationResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { currentSituation } = useSituationStore();

  useEffect(() => {
    if (!currentSituation || currentSituation.id !== id) {
      navigate('/', { replace: true });
    }
  }, [currentSituation, id, navigate]);

  if (!currentSituation || currentSituation.id !== id) return null;

  const title = getSituationTitle(currentSituation, i18n.language);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: tokens.pageBg,
      }}
    >
      <TopBar title={t('situation.resultTitle')} onBack={() => navigate('/')} />

      <div data-testid="situation-result" style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 80, marginBottom: 24 }}>&#10024;</div>

        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginBottom: 12, textAlign: 'center' }}>
          {t('situation.resultHeading', { title })}
        </h1>

        <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 48 }}>
          {t('situation.resultSummary', { count: currentSituation.puzzles.length })}
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
          {t('situation.otherSituations')}
        </button>
      </div>
    </div>
  );
}
