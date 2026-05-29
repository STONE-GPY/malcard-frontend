import { useEffect, useMemo, useState } from 'react';
import { situations } from '../data/situations';
import type { Situation } from '../types';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCardStore } from '../stores/useCardStore';
import { useHistoryStore } from '../stores/useHistoryStore';
import { categories, decks, difficultyMeta } from '../data/cards';
import BottomNav from '../components/common/BottomNav';
import { IconChevronRight, IconFlame } from '../components/icons';
import { tokens } from '../theme/tokens';
import { useCards } from '../hooks/useCards';
import { errorI18nKey } from '../api/client';
import { streakDays } from '../lib/stats';
import type { Card, CategoryId } from '../types';

export default function CardSelectPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { selectedCategory, setCategory, setCurrentCard, setCardList } = useCardStore();
  const { cards, loading, error, reload } = useCards(selectedCategory);
  const history = useHistoryStore((s) => s.history);
  // Selected deck filters the visible card list to the keywords of that deck.
  // Null = no deck filter, show all cards in the current category.
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

  // Reset deck filter whenever the category tab changes (e.g. user moves away
  // from 상황 to 일상 — a deck filter from 상황 wouldn't make sense).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedDeckId(null);
  }, [selectedCategory]);

  // Decks are only meaningful inside the situations category.
  const showDecks = selectedCategory === 'situations';

  // Apply deck keyword filter on top of the category filter when a deck is
  // selected. The full-resolution card list (decks visible) ignores the deck
  // filter; the filtered list is what the rendered card rows iterate.
  const activeDeck = selectedDeckId
    ? decks.find((d) => d.id === selectedDeckId) ?? null
    : null;
  const visibleCards = useMemo(() => {
    if (!activeDeck) return cards;
    return cards.filter((c) =>
      activeDeck.keywords.some((kw) => c.korean.includes(kw)),
    );
  }, [cards, activeDeck]);

  useEffect(() => {
    setCardList(visibleCards);
  }, [visibleCards, setCardList]);

  const streak = useMemo(() => streakDays(history), [history]);

  const handleCardClick = (card: Card) => {
    setCurrentCard(card);
    navigate('/learn');
  };

  // Deck click now FILTERS the card list instead of auto-navigating into a
  // single matching card. Click again on the active deck to clear the filter.
  const handleDeckClick = (deckId: string) => {
    setSelectedDeckId((current) => (current === deckId ? null : deckId));
  };

  return (
    <div
      style={{
        // Outer is flex column; inner wrapper owns the scroll.
        // (overflow:auto + flex column on the same element shrinks children
        // instead of scrolling — see ProfilePage for the trap that hit.)
        height: '100%',
        background: tokens.pageBg,
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
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
          {t('app.greeting')}
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
          {t('app.name')}
        </h1>
        <div style={{ fontSize: 15, color: '#64748B', marginTop: 6, fontWeight: 400 }}>
          {t('app.tagline')}
        </div>
        {streak > 0 && (
          <div
            data-testid="streak-chip"
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
            <IconFlame size={14} stroke={2.4} /> {t('cards.streak', { count: streak })}
          </div>
        )}
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
              onClick={() => setCategory(cat.id as CategoryId)}
              data-testid={`category-${cat.id}`}
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
                whiteSpace: 'nowrap',
              }}
            >
              {t(cat.labelKey)}
            </button>
          );
        })}
      </div>

      {showDecks && (
        <div
          style={{
            // Wrapped chip group: every filter is visible at once with no
            // hidden-on-scroll items and no need for drag-to-scroll. Filters
            // are a small fixed set (6 decks) so multi-row chips read better
            // than a horizontal scroller.
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            padding: `2px ${tokens.pad}px 14px`,
          }}
        >
          {decks.map((deck, i) => {
            const isActive = selectedDeckId === deck.id;
            const accent = tokens.deckAccents[i] ?? tokens.primary;
            return (
              <button
                key={deck.id}
                onClick={() => handleDeckClick(deck.id)}
                aria-pressed={isActive}
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: isActive ? 'none' : `1px solid ${accent}33`,
                  background: isActive ? accent : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : accent,
                  fontWeight: isActive ? 700 : 600,
                  fontSize: 13,
                  letterSpacing: -0.1,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  boxShadow: isActive
                    ? `0 4px 12px -4px ${accent}66`
                    : '0 1px 2px rgba(15,23,42,0.04)',
                  transition: 'background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>{deck.emoji}</span>
                <span>{t(deck.titleKey)}</span>
                <span
                  style={{
                    fontSize: 11,
                    opacity: 0.75,
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 600,
                  }}
                >
                  {deck.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <SectionLabel>
        {activeDeck
          ? `${t(activeDeck.titleKey)} · ${visibleCards.length}`
          : `${t('cards.sectionList')} · ${visibleCards.length}`}
      </SectionLabel>

      <div
        style={{
          padding: `4px ${tokens.pad}px 20px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {loading && <ListSkeleton />}
        {!loading && error && (
          <div
            data-testid="cards-error"
            style={{
              padding: '20px 16px',
              textAlign: 'center',
              background: '#FEF2F2',
              borderRadius: tokens.radiusMd,
              border: '1px solid #FECACA',
              color: '#991B1B',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
              {t(errorI18nKey(error.code))}
            </div>
            <button
              onClick={reload}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                background: '#fff',
                color: '#991B1B',
                border: '1px solid #FECACA',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {t('cards.retry')}
            </button>
          </div>
        )}
        {!loading && !error && visibleCards.length === 0 && (
          <div
            data-testid="empty-cards"
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: tokens.radiusMd,
              border: tokens.border,
              color: '#64748B',
              fontSize: 14,
            }}
          >
            {t('cards.empty')}
          </div>
        )}
        {selectedCategory === 'situations' ? (
          <>
            {!loading && !error && situations.map((situation) => (
              <SituationCardItem
                key={situation.id}
                situation={situation}
                onClick={() => navigate(`/situations/${situation.id}/step1`)}
              />
            ))}
          </>
        ) : (
          <>
            {!loading && !error && visibleCards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card)}
            data-testid="card-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: `${tokens.cardPad}px ${tokens.cardPad}px ${tokens.cardPad}px ${tokens.cardPad + 2}px`,
              background: '#FFFFFF',
              border: tokens.border,
              borderLeft: `4px solid ${
                card.difficulty ? difficultyMeta[card.difficulty].color : tokens.primary
              }`,
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
                {card.korean}
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
                {card.russian}
              </div>
            </div>
            {card.difficulty && (
              <div
                style={{
                  padding: '4px 9px',
                  borderRadius: 999,
                  background: difficultyMeta[card.difficulty].bg,
                  color: difficultyMeta[card.difficulty].color,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.1,
                  flexShrink: 0,
                }}
              >
                {t(`difficulty.${card.difficulty}`)}
              </div>
            )}
            <IconChevronRight size={18} style={{ color: '#CBD5E1', flexShrink: 0 }} />
          </button>
        ))}
          </>
        )}
      </div>
      </div>

      <BottomNav />
    </div>
  );
}


function SituationCardItem({ situation, onClick }: { situation: Situation, onClick: () => void }) {
  const meta = difficultyMeta[situation.difficulty || 'medium'];
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        background: '#FFFFFF',
        padding: '16px',
        borderRadius: tokens.radiusMd,
        border: 'none',
        boxShadow: '0 2px 4px rgba(15,23,42,0.03), 0 8px 16px -8px rgba(15,23,42,0.04)',
        textAlign: 'left',
        cursor: 'pointer',
        width: '100%',
        marginBottom: '12px'
      }}
    >
      <div style={{
        fontSize: 32, marginRight: 16, width: 48, height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F8FAFC', borderRadius: '50%'
      }}>
        {situation.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>{situation.unit_title || '상황'}</span>
          <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 999, background: meta.bg, color: meta.color, fontWeight: 700 }}>
            {meta.label}
          </span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{situation.title}</div>
        <div style={{ fontSize: 13, color: '#94A3B8' }}>{situation.puzzles?.length || 0}문장 • {situation.location}</div>
      </div>
      <IconChevronRight size={20} style={{ color: "#CBD5E1" }} />
    </button>
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

function ListSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          data-testid="card-skeleton"
          style={{
            height: 70,
            background: '#F1F5F9',
            borderRadius: tokens.radiusMd,
            opacity: 1 - i * 0.18,
            animation: 'mc-dots 1.4s infinite',
          }}
        />
      ))}
    </>
  );
}
