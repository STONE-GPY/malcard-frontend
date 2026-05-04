import { useNavigate } from 'react-router-dom';
import { useCardStore } from '../stores/useCardStore';
import { categories, decks, difficultyMeta } from '../data/cards';
import BottomNav from '../components/common/BottomNav';
import { IconChevronRight, IconFlame } from '../components/icons';
import { tokens } from '../theme/tokens';
import type { Card, CardCategory } from '../types';

export default function CardSelectPage() {
  const navigate = useNavigate();
  const { selectedCategory, setCategory, filteredCards, setCurrentCard } = useCardStore();
  const cards = filteredCards();
  const showDecks = selectedCategory === 'all' || selectedCategory === 'situations';

  const handleCardClick = (card: Card) => {
    setCurrentCard(card);
    navigate('/learn');
  };

  const handleDeckClick = () => {
    // Deck demo: pick the hospital example card
    const demoCard = cards.find((c) => c.id === 4) ?? cards[0];
    if (demoCard) {
      setCurrentCard(demoCard);
      navigate('/learn');
    }
  };

  return (
    <div
      style={{
        minHeight: '100%',
        background: tokens.pageBg,
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: `28px ${tokens.pad}px 18px` }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: tokens.primary,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          좋은 아침이에요, 안나
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: -0.8,
            lineHeight: 1.1,
            margin: 0,
            color: '#0F172A',
          }}
        >
          MalCard
        </h1>
        <div style={{ fontSize: 15, color: '#64748B', marginTop: 6, fontWeight: 400 }}>
          카드로 한국어를 배우세요 — 듣고, 따라 말하고, 발음을 다듬어 보세요
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 999,
            background: `linear-gradient(135deg, ${tokens.streakA} 0%, ${tokens.streakB} 100%)`,
            color: tokens.streakText,
            fontSize: 13,
            fontWeight: 600,
            marginTop: 14,
          }}
        >
          <IconFlame size={14} stroke={2.4} /> 12일 연속 학습 중
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          padding: `6px ${tokens.pad}px 14px`,
          scrollbarWidth: 'none',
        }}
      >
        {categories.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id as CardCategory | 'all')}
              style={{
                flexShrink: 0,
                padding: '10px 18px',
                borderRadius: 999,
                border: active ? 'none' : '1px solid #E2E8F0',
                background: active ? tokens.primaryGradFlat : '#FFFFFF',
                color: active ? '#FFFFFF' : tokens.chipText,
                fontWeight: active ? 600 : 500,
                fontSize: 14,
                letterSpacing: -0.1,
                boxShadow: active
                  ? `0 6px 16px -4px ${tokens.primaryShadow}`
                  : '0 1px 2px rgba(15,23,42,0.04)',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {showDecks && (
        <>
          <SectionLabel>상황별 학습</SectionLabel>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              padding: `0 ${tokens.pad}px 6px`,
            }}
          >
            {decks.map((deck, i) => (
              <button
                key={deck.id}
                onClick={handleDeckClick}
                style={{
                  width: '100%',
                  height: 148,
                  borderRadius: tokens.radiusLg,
                  background: tokens.deckGrads[i] ?? tokens.deckGrads[0],
                  padding: tokens.cardPad + 4,
                  position: 'relative',
                  textAlign: 'left',
                  color: '#fff',
                  boxShadow: `0 14px 28px -10px ${tokens.deckAccents[i]}66, 0 4px 8px -4px ${tokens.deckAccents[i]}40`,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.18)',
                    filter: 'blur(8px)',
                  }}
                />
                <div
                  style={{
                    fontSize: 44,
                    lineHeight: 1,
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
                  }}
                >
                  {deck.emoji}
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 500, marginBottom: 2 }}>
                    {deck.titleKo}
                  </div>
                  <div
                    style={{
                      fontSize: 19,
                      fontWeight: 700,
                      letterSpacing: -0.3,
                      lineHeight: 1.15,
                    }}
                  >
                    {deck.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      marginTop: 8,
                      fontWeight: 500,
                      padding: '4px 9px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.22)',
                      backdropFilter: 'blur(6px)',
                      display: 'inline-block',
                    }}
                  >
                    카드 {deck.count}장
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <SectionLabel>
        {showDecks ? '전체 카드' : '카드 목록'} · {cards.length}
      </SectionLabel>
      <div
        style={{
          padding: `4px ${tokens.pad}px 20px`,
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.listGap,
        }}
      >
        {cards.map((card) => {
          const diff = difficultyMeta[card.difficulty];
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: `${tokens.cardPad}px ${tokens.cardPad}px ${tokens.cardPad}px ${tokens.cardPad + 2}px`,
                background: '#FFFFFF',
                border: tokens.border,
                borderLeft: `4px solid ${diff.color}`,
                borderRadius: tokens.radiusMd,
                textAlign: 'left',
                boxShadow: tokens.shadowSm,
                width: '100%',
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: tokens.radiusSm,
                  background: tokens.primaryTint,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  flexShrink: 0,
                }}
              >
                {card.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: '"Noto Sans KR", -apple-system, system-ui, sans-serif',
                    fontSize: 17,
                    fontWeight: 600,
                    color: '#0F172A',
                    letterSpacing: -0.3,
                    lineHeight: 1.25,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {card.ko}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: '#64748B',
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {card.ru}
                </div>
              </div>
              <div
                style={{
                  padding: '4px 9px',
                  borderRadius: 999,
                  background: diff.bg,
                  color: diff.color,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.1,
                  flexShrink: 0,
                }}
              >
                {diff.label}
              </div>
              <IconChevronRight size={18} style={{ color: '#CBD5E1', flexShrink: 0 }} />
            </button>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: '#94A3B8',
        padding: `0 ${tokens.pad}px`,
        marginBottom: 12,
        marginTop: 14,
      }}
    >
      {children}
    </div>
  );
}
