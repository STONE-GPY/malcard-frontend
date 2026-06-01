import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSituationStore } from '../stores/useSituationStore';
import { getSituation } from '../api/situations';
import { tokens } from '../theme/tokens';
import { difficultyMeta } from '../data/cards';
import { IconChevronRight, IconVolume } from '../components/icons';
import TopBar from '../components/common/TopBar';
import { getSituationLocation, getSituationTitle } from '../i18n/situationText';
import { cancelSpeech, speakText } from '../lib/speech';

export default function SituationStep1Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { initSituation, currentSituation } = useSituationStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const sit = await getSituation(id);
        initSituation(sit);
      } catch (err) {
        console.error('Failed to load situation', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, initSituation]);

  // Stop any dialogue TTS when leaving the screen.
  useEffect(() => () => cancelSpeech(), []);

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center' }}>{t('situation.loading')}</div>;
  }

  if (error || !currentSituation || currentSituation.id !== id) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: tokens.pageBg }}>
        <TopBar title={t('situation.errorTitle')} onBack={() => navigate('/')} />
        <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>!</div>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 24 }}>
            {t('situation.notFound')}
          </div>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              background: tokens.primaryGradFlat,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: tokens.radiusMd,
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {t('situation.backHome')}
          </button>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    navigate(`/situations/${currentSituation.id}/step2`);
  };

  const title = getSituationTitle(currentSituation, i18n.language);
  const location = getSituationLocation(currentSituation, i18n.language);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: tokens.pageBg,
      }}
    >
      <TopBar title={title} onBack={() => navigate('/')} />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48 }}>{currentSituation.icon}</div>
          <div style={{ fontWeight: 'bold', fontSize: 18, color: '#0F172A' }}>
            {location}
          </div>
          {/* 기획서 3-4: 레벨(난이도) 표시 */}
          {(() => {
            const diff = currentSituation.difficulty ?? 'medium';
            const meta = difficultyMeta[diff];
            return (
              <span
                data-testid="situation-difficulty-badge"
                style={{
                  display: 'inline-block',
                  marginTop: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: meta.bg,
                  color: meta.color,
                }}
              >
                {t(`difficulty.${diff}`)}
              </span>
            );
          })()}
        </div>

        {currentSituation.dialogue.map((line, idx) => {
          const char = currentSituation.characters.find((c) => c.id === line.character);
          // Assign a stable bubble tint per character id. We do NOT claim any
          // bubble is "you" — the data has no learner role and several
          // situations have 3+ speakers, so binary me/other rendering would
          // mislabel them. All lines are left-aligned with avatar + name.
          const charIdx = char
            ? currentSituation.characters.findIndex((c) => c.id === char.id)
            : -1;
          const tints = ['#FFFFFF', '#EEF2FF', '#FEF3C7', '#DCFCE7'];
          const bubbleBg = charIdx >= 0 ? tints[charIdx % tints.length] : '#FFFFFF';

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: '#E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0,
                  fontSize: 16,
                }}
              >
                {char?.avatar || '?'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '78%' }}>
                {char?.name && (
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                    {char.name}
                  </div>
                )}
                {/* 기획서 STEP1: 아이는 대화를 '읽거나 들으며' 맥락을 파악한다.
                    각 말풍선을 탭하면 해당 줄을 TTS로 들려준다. */}
                <button
                  data-testid="situation-dialogue-listen"
                  onClick={() => speakText(line.text)}
                  aria-label={t('situation.listenLine')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 16px',
                    borderRadius: 16,
                    borderTopLeftRadius: 4,
                    border: 'none',
                    background: bubbleBg,
                    color: '#0F172A',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    fontSize: 15,
                    lineHeight: 1.5,
                    textAlign: 'left',
                    cursor: 'pointer',
                    font: 'inherit',
                  }}
                >
                  <span style={{ flex: 1 }}>{line.text}</span>
                  <IconVolume size={16} style={{ color: tokens.primary, flexShrink: 0 }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: 20, background: '#FFFFFF', borderTop: '1px solid #E2E8F0' }}>
        <button
          data-testid="situation-start"
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            boxShadow: `0 4px 12px ${tokens.primaryShadow}`,
          }}
        >
          {t('situation.start')}
          <IconChevronRight size={20} style={{ color: '#FFFFFF' }} />
        </button>
      </div>
    </div>
  );
}
