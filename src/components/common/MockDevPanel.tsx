// Floating in-app developer panel for mock-mode testing. Lets the user:
//   • Toggle between mock and the real backend at runtime (no .env edits)
//   • Pick a scenario the mock analyzer should return on the next analyze()
//
// Renders as a small badge in the bottom-right corner inside #root. Click to
// expand the panel; selections persist to localStorage so a page reload keeps
// the chosen mode/scenario. Always rendered — when the env file says
// VITE_USE_MOCK_API=false (real backend default) the panel still lets the
// developer flip to mock without touching the file system.

import { useEffect, useState } from 'react';
import { USE_MOCK_API, useMockApi, setMockApiOverride } from '../../api/client';
import {
  SCENARIOS,
  getActiveScenario,
  setActiveScenario,
  type ScenarioId,
} from '../../lib/mockScenarios';
import { tokens } from '../../theme/tokens';

export default function MockDevPanel() {
  const [open, setOpen] = useState(false);
  const [mockOn, setMockOn] = useState(() => useMockApi());
  const [scenario, setScenario] = useState<ScenarioId>(() => getActiveScenario());

  // Re-read from storage when the panel opens so a tab opened in another window
  // doesn't show stale values.
  useEffect(() => {
    if (!open) return;
    setMockOn(useMockApi());
    setScenario(getActiveScenario());
  }, [open]);

  const handleToggleMock = (next: boolean) => {
    setMockOn(next);
    setMockApiOverride(next === USE_MOCK_API ? null : next);
  };

  const handlePickScenario = (id: ScenarioId) => {
    setScenario(id);
    setActiveScenario(id);
  };

  const activeMeta = SCENARIOS.find((s) => s.id === scenario) ?? SCENARIOS[0];

  // Collapsed badge
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="개발자 패널 열기"
        style={{
          position: 'absolute',
          right: 10,
          bottom: 90,
          zIndex: 60,
          padding: '6px 10px',
          borderRadius: 999,
          background: mockOn ? tokens.primary : '#0F172A',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.4,
          boxShadow: '0 6px 16px -6px rgba(0,0,0,0.35)',
          opacity: 0.85,
          cursor: 'pointer',
          font: 'inherit',
          border: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>{mockOn ? '🧪 MOCK' : '🌐 REAL'}</span>
        {mockOn && (
          <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 600 }}>
            {activeMeta.label.split(' ')[0]}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        right: 10,
        bottom: 90,
        zIndex: 60,
        width: 280,
        maxWidth: 'calc(100% - 20px)',
        padding: 14,
        background: '#FFFFFF',
        borderRadius: 14,
        border: '1px solid rgba(15,23,42,0.08)',
        boxShadow: '0 18px 36px -10px rgba(15,23,42,0.25)',
        fontSize: 13,
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: -0.2 }}>
          개발자 패널
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="닫기"
          style={{
            width: 24,
            height: 24,
            borderRadius: 999,
            background: '#F1F5F9',
            color: '#475569',
            font: 'inherit',
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '8px 10px',
          background: '#F8FAFC',
          borderRadius: 10,
          cursor: 'pointer',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 12 }}>
          {mockOn ? '🧪 Mock 모드' : '🌐 Real 백엔드'}
        </span>
        <input
          type="checkbox"
          checked={mockOn}
          onChange={(e) => handleToggleMock(e.target.checked)}
          style={{ width: 36, height: 20, cursor: 'pointer' }}
        />
      </label>

      {mockOn && (
        <>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.6,
              color: '#94A3B8',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            시나리오 (다음 분석부터 적용)
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              maxHeight: 280,
              overflowY: 'auto',
            }}
          >
            {SCENARIOS.map((s) => {
              const active = s.id === scenario;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handlePickScenario(s.id)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: active ? tokens.primarySoft : 'transparent',
                    border: active ? `1px solid ${tokens.primary}` : '1px solid #E2E8F0',
                    color: '#0F172A',
                    cursor: 'pointer',
                    font: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <span style={{ fontWeight: active ? 700 : 600, fontSize: 12 }}>
                    {s.label}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748B', lineHeight: 1.35 }}>
                    {s.description}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div
        style={{
          fontSize: 10,
          color: '#94A3B8',
          marginTop: 4,
          lineHeight: 1.4,
        }}
      >
        설정은 브라우저 localStorage에 저장돼요. .env: <code>VITE_USE_MOCK_API={String(USE_MOCK_API)}</code>
      </div>
    </div>
  );
}
