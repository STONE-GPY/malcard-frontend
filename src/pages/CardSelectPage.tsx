import { useNavigate } from 'react-router-dom';
import { useCardStore } from '../stores/useCardStore';
import { useHistoryStore } from '../stores/useHistoryStore';
import { situationGroups } from '../data/cards';
import BottomNav from '../components/common/BottomNav';
import type { CardCategory } from '../types';

const categoryTabs: { key: CardCategory | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'daily', label: '일상 문장' },
  { key: 'idiom', label: '관용 표현' },
  { key: 'situation', label: '상황별' },
  { key: 'word', label: '기본 단어' },
];

const situationColors = {
  indigo: 'linear-gradient(150deg, #6C5CE7, #A29BFE)',
  orange: 'linear-gradient(150deg, #F57C00, #FFB74D)',
  teal: 'linear-gradient(150deg, #00897B, #4DB6AC)',
} as const;

const difficultyBorder = { easy: '#66BB6A', medium: '#FFA726', hard: '#EF5350' } as const;

export default function CardSelectPage() {
  const navigate = useNavigate();
  const { selectedCategory, setCategory, filteredCards, setCurrentCard } = useCardStore();
  const history = useHistoryStore((s) => s.history);
  const favorites = useHistoryStore((s) => s.favorites);
  const cards = filteredCards();

  const handleCardClick = (card: typeof cards[0]) => {
    setCurrentCard(card);
    navigate('/learn');
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 8px' }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#2D2A26' }}>
          Mal<span style={{ color: 'var(--color-primary)' }}>Card</span>
        </div>
        <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 4 }}>
          오늘의 카드를 골라보세요
        </div>
      </div>

      {/* Category Chips */}
      <div style={{
        display: 'flex', gap: 8, padding: '16px 20px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {categoryTabs.map((tab) => {
          const active = selectedCategory === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setCategory(tab.key)}
              style={{
                padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                whiteSpace: 'nowrap',
                background: active ? 'var(--color-primary)' : 'var(--color-surface)',
                color: active ? 'white' : '#6B6560',
                border: active ? 'none' : '1.5px solid var(--color-muted)',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Situation Decks */}
      {(selectedCategory === 'all' || selectedCategory === 'situation') && (
        <>
          <div style={{ padding: '8px 20px 12px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#2D2A26' }}>상황별 카드덱</h2>
          </div>
          <div style={{
            display: 'flex', gap: 12, padding: '0 20px 4px',
            overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 24,
          }}>
            {situationGroups.map((group) => (
              <div key={group.id} style={{
                minWidth: 150, flexShrink: 0, borderRadius: 'var(--radius-xl)', padding: 18,
                color: 'white', background: situationColors[group.color],
                boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
              }}>
                <span style={{ fontSize: 30, marginBottom: 12, display: 'block' }}>{group.emoji}</span>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 3 }}>{group.title}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>카드 {group.cardCount}장</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Section Title */}
      <div style={{ padding: '8px 20px 12px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#2D2A26' }}>
          {selectedCategory === 'all' ? '일상 문장' : categoryTabs.find(t => t.key === selectedCategory)?.label}
        </h2>
      </div>

      {/* Card List */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cards.map((card) => {
          const cardHistory = history[card.id];
          const isFav = favorites.includes(card.id);
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              style={{
                background: 'var(--color-surface)', borderRadius: 14,
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                borderLeft: `4px solid ${difficultyBorder[card.difficulty]}`,
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>
                {card.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2,
                }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#2D2A26' }}>{card.korean}</span>
                  {isFav && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--color-primary)" stroke="var(--color-primary)" strokeWidth="2" aria-label="즐겨찾기">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
                    </svg>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#A09A92' }}>{card.translation}</div>
              </div>
              {cardHistory && (
                <div style={{
                  padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                  background: cardHistory.bestScore >= 80
                    ? 'var(--color-success-light)'
                    : cardHistory.bestScore >= 60
                      ? 'var(--color-warning-light)'
                      : 'var(--color-error-light)',
                  color: cardHistory.bestScore >= 80
                    ? '#43A047'
                    : cardHistory.bestScore >= 60
                      ? '#F57C00'
                      : '#E53935',
                }}>
                  {cardHistory.bestScore}점
                </div>
              )}
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
