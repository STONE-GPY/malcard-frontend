import { useEffect, useRef, useState } from 'react';
import { listCards, toUiCards } from '../api/cards';
import { categories, type CategoryDef } from '../data/cards';
import type { Card, CategoryId } from '../types';
import { ApiError } from '../api/client';

interface UseCardsState {
  cards: Card[];
  total: number;
  loading: boolean;
  error: { code: string; message: string } | null;
  reload: () => void;
}

export function useCards(categoryId: CategoryId): UseCardsState {
  const [cards, setCards] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [tick, setTick] = useState(0);
  const reqRef = useRef(0);

  useEffect(() => {
    const cat: CategoryDef | undefined = categories.find((c) => c.id === categoryId);
    const reqId = ++reqRef.current;
    const controller = new AbortController();
    // The hook synchronizes with the network: each effect run is the start of a
    // new request whose state we surface through React state. Resetting loading
    // and error here is intentional, not cascading.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    listCards({ type: cat?.apiType, limit: 50, offset: 0, signal: controller.signal })
      .then((res) => {
        if (reqId !== reqRef.current) return;
        setCards(toUiCards(res.items));
        setTotal(res.total);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (reqId !== reqRef.current) return;
        if (err instanceof ApiError) {
          setError({ code: err.code, message: err.message });
        } else {
          setError({ code: 'UNKNOWN', message: (err as Error).message });
        }
      })
      .finally(() => {
        if (reqId !== reqRef.current) return;
        setLoading(false);
      });

    return () => controller.abort();
  }, [categoryId, tick]);

  return { cards, total, loading, error, reload: () => setTick((t) => t + 1) };
}
