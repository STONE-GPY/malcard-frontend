import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSituationStore } from '../stores/useSituationStore';
import { getSituation } from '../api/situations';
import { tokens } from '../theme/tokens';
import { IconChevronRight } from '../components/icons';
import TopBar from '../components/common/TopBar';

export default function SituationStep1Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { initSituation, currentSituation } = useSituationStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const sit = await getSituation(id);
        initSituation(sit);
      } catch (err) {
        console.error('Failed to load situation', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, initSituation]);

  if (loading || !currentSituation) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  const handleNext = () => {
    // Go to Step 2 (first puzzle)
    navigate(`/situations/${currentSituation.id}/step2`);
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
      <TopBar title={currentSituation.title} onBack={() => navigate('/')} />

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
            {currentSituation.location}
          </div>
        </div>

        {/* Dialogue Bubbles */}
        {currentSituation.dialogue.map((line, idx) => {
          const char = currentSituation.characters.find((c) => c.id === line.character);
          // Simple rule: if it's the first character, they are 'left', else 'right'
          const isMe = currentSituation.characters.indexOf(char!) !== 0;

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: isMe ? 'row-reverse' : 'row',
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
                {char?.avatar || '👤'}
              </div>

              <div
                style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: 16,
                  background: isMe ? tokens.primary : '#FFFFFF',
                  color: isMe ? '#FFFFFF' : '#0F172A',
                  borderTopRightRadius: isMe ? 4 : 16,
                  borderTopLeftRadius: isMe ? 16 : 4,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  fontSize: 15,
                  lineHeight: 1.5,
                }}
              >
                {line.text}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: 20, background: '#FFFFFF', borderTop: '1px solid #E2E8F0' }}>
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            boxShadow: `0 4px 12px ${tokens.primaryShadow}`,
          }}
        >
          학습 시작하기
          <IconChevronRight size={20} style={{ color: "#FFFFFF" }} />
        </button>
      </div>
    </div>
  );
}
