import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { categories } from '../data/cards';
import {
  addCustomPhonemeCard,
  addCustomSituation,
  loadCustomPhonemeCardsAsync,
  loadCustomSituationsAsync,
  makeCustomId,
  removeCustomPhonemeCard,
  removeCustomSituation,
} from '../data/adminCards';
import { isLocalhost } from '../lib/adminEnv';
import { tokens } from '../theme/tokens';
import { IconArrowLeft } from '../components/icons';
import type { BackendCard, Situation } from '../types';

// Default speakers for an authored situation. The dialogue editor only lets the
// author pick between these two; richer casts can be hand-edited in the
// exported JSON if ever needed.
const DEFAULT_CHARACTERS = [
  { id: 'me', name: '나', avatar: '🙂' },
  { id: 'other', name: '상대', avatar: '🧑' },
];

type AdminTab = 'phoneme' | 'situation';

interface DialogueDraft {
  character: string;
  text: string;
  isTarget: boolean;
}
interface PuzzleDraft {
  sentence: string;
  level: number;
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('phoneme');
  // Authored cards are persisted on the dev server (data/adminCards.ts), so load
  // them asynchronously into state and re-fetch after every add/remove.
  const [customPhoneme, setCustomPhoneme] = useState<BackendCard[]>([]);
  const [customSituations, setCustomSituations] = useState<Situation[]>([]);
  const reload = useCallback(() => {
    void loadCustomPhonemeCardsAsync().then(setCustomPhoneme);
    void loadCustomSituationsAsync().then(setCustomSituations);
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);

  // Access is gated to the developer's own machine — see lib/adminEnv.
  if (!isLocalhost()) return <Navigate to="/" replace />;

  return (
    <div
      style={{
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
          padding: `24px ${tokens.pad}px 40px`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <button
            onClick={() => navigate('/')}
            aria-label="홈으로"
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              background: '#FFFFFF',
              border: '1px solid rgba(15,23,42,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
            }}
          >
            <IconArrowLeft size={18} />
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>
            카드 관리
          </h1>
        </div>
        <div style={{ fontSize: 13, color: '#64748B', marginBottom: 18 }}>
          로컬 전용 · 추가한 카드는 서버 파일에 영구 저장되어 모든 기기(폰 포함)에 바로 반영됩니다.
        </div>

        {/* Tab switch */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 20,
            padding: 4,
            background: '#EEF0F4',
            borderRadius: 999,
          }}
        >
          {(['phoneme', 'situation'] as const).map((tb) => {
            const active = tab === tb;
            return (
              <button
                key={tb}
                data-testid={`admin-tab-${tb}`}
                onClick={() => setTab(tb)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 999,
                  border: 'none',
                  background: active ? '#FFFFFF' : 'transparent',
                  color: active ? tokens.primary : '#64748B',
                  fontWeight: active ? 700 : 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  boxShadow: active ? '0 2px 8px -2px rgba(15,23,42,0.12)' : 'none',
                }}
              >
                {tb === 'phoneme' ? '발음 카드' : '상황 카드'}
              </button>
            );
          })}
        </div>

        {tab === 'phoneme' ? (
          <PhonemeCardEditor
            cards={customPhoneme}
            onChange={reload}
          />
        ) : (
          <SituationCardEditor
            situations={customSituations}
            onChange={reload}
          />
        )}
      </div>
    </div>
  );
}

// ── Shared field styles ───────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#475569',
  marginBottom: 4,
  display: 'block',
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: tokens.radiusSm,
  border: '1px solid #CBD5E1',
  fontSize: 14,
  background: '#FFFFFF',
  boxSizing: 'border-box',
};
const fieldGap: React.CSSProperties = { marginBottom: 12 };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={fieldGap}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  testid,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  testid?: string;
}) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '13px 0',
        borderRadius: tokens.radiusMd,
        border: 'none',
        background: disabled ? '#CBD5E1' : tokens.primaryGradFlat,
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        marginTop: 4,
      }}
    >
      {children}
    </button>
  );
}

// ── Phoneme card editor ───────────────────────────────────────────────────────
function PhonemeCardEditor({
  cards,
  onChange,
}: {
  cards: BackendCard[];
  onChange: () => void;
}) {
  const phonemeTypes = useMemo(
    () =>
      categories
        .filter((c) => c.apiType && c.id !== 'situations')
        .map((c) => c.apiType as string),
    [],
  );

  const [type, setType] = useState(phonemeTypes[0] ?? '생활문장');
  const [korean, setKorean] = useState('');
  const [russian, setRussian] = useState('');
  const [prompt, setPrompt] = useState('');
  const [phonemeFocus, setPhonemeFocus] = useState('');

  const canAdd = korean.trim() && russian.trim() && prompt.trim();

  const handleAdd = () => {
    if (!canAdd) return;
    const card: BackendCard = {
      id: makeCustomId('card'),
      type,
      korean: korean.trim(),
      russian: russian.trim(),
      prompt_question: prompt.trim(),
      phoneme_focus: phonemeFocus.trim() || undefined,
    };
    setKorean('');
    setRussian('');
    setPrompt('');
    setPhonemeFocus('');
    void addCustomPhonemeCard(card).then(onChange);
  };

  return (
    <div>
      <SectionCard title="새 발음 카드">
        <Field label="카테고리">
          <select
            data-testid="admin-phoneme-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={inputStyle}
          >
            {phonemeTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="한국어 문장 *">
          <input
            data-testid="admin-phoneme-korean"
            value={korean}
            onChange={(e) => setKorean(e.target.value)}
            placeholder="예: 어디서 내려요?"
            style={inputStyle}
          />
        </Field>
        <Field label="러시아어 번역 *">
          <input
            data-testid="admin-phoneme-russian"
            value={russian}
            onChange={(e) => setRussian(e.target.value)}
            placeholder="Где выходить?"
            style={inputStyle}
          />
        </Field>
        <Field label="안내 문구 *">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="버스나 지하철에서 자주 쓰는 말이에요."
            style={inputStyle}
          />
        </Field>
        <Field label="음소 포커스 (선택)">
          <input
            value={phonemeFocus}
            onChange={(e) => setPhonemeFocus(e.target.value)}
            placeholder="ㄹ 받침"
            style={inputStyle}
          />
        </Field>
        <PrimaryButton testid="admin-phoneme-add" onClick={handleAdd} disabled={!canAdd}>
          발음 카드 추가
        </PrimaryButton>
      </SectionCard>

      <CustomList
        title={`추가한 발음 카드 (${cards.length})`}
        empty="아직 추가한 발음 카드가 없어요."
        exportDisabled={cards.length === 0}
        onExport={() => downloadJson('custom-phoneme-cards.json', cards)}
      >
        {cards.map((c) => (
          <ListRow
            key={c.id}
            title={c.korean}
            subtitle={`${c.type} · ${c.russian}`}
            onRemove={() => {
              void removeCustomPhonemeCard(c.id).then(onChange);
            }}
          />
        ))}
      </CustomList>
    </div>
  );
}

// ── Situation card editor ─────────────────────────────────────────────────────
function SituationCardEditor({
  situations,
  onChange,
}: {
  situations: Situation[];
  onChange: () => void;
}) {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('💬');
  const [location, setLocation] = useState('');
  const [level, setLevel] = useState(1);
  const [unitTitle, setUnitTitle] = useState('');
  const [dialogue, setDialogue] = useState<DialogueDraft[]>([
    { character: 'other', text: '', isTarget: false },
  ]);
  const [puzzles, setPuzzles] = useState<PuzzleDraft[]>([{ sentence: '', level: 1 }]);

  const validPuzzles = puzzles.filter((p) => p.sentence.trim());
  const canAdd = title.trim() && location.trim() && validPuzzles.length > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    const id = makeCustomId('sit');
    const situation: Situation = {
      id,
      title: title.trim(),
      icon: icon.trim() || '💬',
      location: location.trim(),
      level,
      unit_title: unitTitle.trim() || undefined,
      difficulty: level === 1 ? 'easy' : level >= 3 ? 'hard' : 'medium',
      characters: DEFAULT_CHARACTERS,
      dialogue: dialogue
        .filter((d) => d.text.trim())
        .map((d) => ({ character: d.character, text: d.text.trim(), isTarget: d.isTarget })),
      puzzles: validPuzzles.map((p, i) => ({
        id: `${id}_p${i + 1}`,
        sentence: p.sentence.trim(),
        answer: p.sentence.trim().split(/\s+/),
        level: p.level,
      })),
    };
    setTitle('');
    setLocation('');
    setUnitTitle('');
    setDialogue([{ character: 'other', text: '', isTarget: false }]);
    setPuzzles([{ sentence: '', level: 1 }]);
    void addCustomSituation(situation).then(onChange);
  };

  return (
    <div>
      <SectionCard title="새 상황 카드">
        <Field label="제목 *">
          <input
            data-testid="admin-situation-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="병원 접수하기"
            style={inputStyle}
          />
        </Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ width: 90 }}>
            <Field label="아이콘">
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="💬"
                style={{ ...inputStyle, textAlign: 'center' }}
              />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="장소 *">
              <input
                data-testid="admin-situation-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="병원"
                style={inputStyle}
              />
            </Field>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ width: 110 }}>
            <Field label="난이도(레벨)">
              <select
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                style={inputStyle}
              >
                <option value={1}>입문 (1)</option>
                <option value={2}>중급 (2)</option>
                <option value={3}>심화 (3)</option>
              </select>
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="유닛 제목 (선택)">
              <input
                value={unitTitle}
                onChange={(e) => setUnitTitle(e.target.value)}
                placeholder="유닛 1 · 병원"
                style={inputStyle}
              />
            </Field>
          </div>
        </div>

        {/* Dialogue editor */}
        <label style={{ ...labelStyle, marginTop: 6 }}>대화 (선택)</label>
        {dialogue.map((d, i) => (
          <div
            key={i}
            style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}
          >
            <select
              value={d.character}
              onChange={(e) => {
                const next = [...dialogue];
                next[i] = { ...d, character: e.target.value };
                setDialogue(next);
              }}
              style={{ ...inputStyle, width: 76, padding: '10px 6px' }}
            >
              {DEFAULT_CHARACTERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              value={d.text}
              onChange={(e) => {
                const next = [...dialogue];
                next[i] = { ...d, text: e.target.value };
                setDialogue(next);
              }}
              placeholder="대사"
              style={{ ...inputStyle, flex: 1 }}
            />
            <label style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={d.isTarget}
                onChange={(e) => {
                  const next = [...dialogue];
                  next[i] = { ...d, isTarget: e.target.checked };
                  setDialogue(next);
                }}
              />{' '}
              목표
            </label>
            <RemoveX
              onClick={() => setDialogue(dialogue.filter((_, idx) => idx !== i))}
            />
          </div>
        ))}
        <AddRowButton
          label="+ 대화 줄 추가"
          onClick={() =>
            setDialogue([...dialogue, { character: 'other', text: '', isTarget: false }])
          }
        />

        {/* Puzzle editor */}
        <label style={{ ...labelStyle, marginTop: 14 }}>연습 문장 (퍼즐) *</label>
        <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6 }}>
          띄어쓰기 기준으로 단어가 분리되어 퍼즐이 만들어집니다.
        </div>
        {puzzles.map((p, i) => (
          <div
            key={i}
            style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}
          >
            <input
              data-testid={`admin-situation-puzzle-${i}`}
              value={p.sentence}
              onChange={(e) => {
                const next = [...puzzles];
                next[i] = { ...p, sentence: e.target.value };
                setPuzzles(next);
              }}
              placeholder="나는 지난주에 배가 아팠어요."
              style={{ ...inputStyle, flex: 1 }}
            />
            <select
              value={p.level}
              onChange={(e) => {
                const next = [...puzzles];
                next[i] = { ...p, level: Number(e.target.value) };
                setPuzzles(next);
              }}
              style={{ ...inputStyle, width: 84, padding: '10px 6px' }}
            >
              <option value={1}>입문</option>
              <option value={2}>중급</option>
              <option value={3}>심화</option>
            </select>
            <RemoveX onClick={() => setPuzzles(puzzles.filter((_, idx) => idx !== i))} />
          </div>
        ))}
        <AddRowButton
          label="+ 문장 추가"
          onClick={() => setPuzzles([...puzzles, { sentence: '', level: 1 }])}
        />

        <div style={{ marginTop: 16 }}>
          <PrimaryButton testid="admin-situation-add" onClick={handleAdd} disabled={!canAdd}>
            상황 카드 추가
          </PrimaryButton>
        </div>
      </SectionCard>

      <CustomList
        title={`추가한 상황 카드 (${situations.length})`}
        empty="아직 추가한 상황 카드가 없어요."
        exportDisabled={situations.length === 0}
        onExport={() => downloadJson('custom-situations.json', situations)}
      >
        {situations.map((s) => (
          <ListRow
            key={s.id}
            title={`${s.icon} ${s.title}`}
            subtitle={`${s.location} · 문장 ${s.puzzles?.length ?? 0}개 · L${s.level}`}
            onRemove={() => {
              void removeCustomSituation(s.id).then(onChange);
            }}
          />
        ))}
      </CustomList>
    </div>
  );
}

// ── Small shared building blocks ──────────────────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: tokens.radiusLg,
        border: '1px solid rgba(15,23,42,0.06)',
        padding: 18,
        marginBottom: 18,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, letterSpacing: -0.3 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function CustomList({
  title,
  empty,
  children,
  onExport,
  exportDisabled,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
  onExport: () => void;
  exportDisabled?: boolean;
}) {
  const hasItems = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>{title}</div>
        <button
          data-testid="admin-export"
          onClick={onExport}
          disabled={exportDisabled}
          style={{
            padding: '7px 12px',
            borderRadius: 999,
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            color: exportDisabled ? '#CBD5E1' : tokens.primary,
            fontSize: 12,
            fontWeight: 700,
            cursor: exportDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          JSON 내보내기
        </button>
      </div>
      {hasItems ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
      ) : (
        <div
          style={{
            padding: '20px 16px',
            textAlign: 'center',
            background: '#FFFFFF',
            borderRadius: tokens.radiusMd,
            border: '1px dashed #CBD5E1',
            color: '#94A3B8',
            fontSize: 13,
          }}
        >
          {empty}
        </div>
      )}
    </div>
  );
}

function ListRow({
  title,
  subtitle,
  onRemove,
}: {
  title: string;
  subtitle: string;
  onRemove: () => void;
}) {
  return (
    <div
      data-testid="admin-custom-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        background: '#FFFFFF',
        borderRadius: tokens.radiusMd,
        border: '1px solid rgba(15,23,42,0.06)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#0F172A',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#64748B',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {subtitle}
        </div>
      </div>
      <button
        onClick={onRemove}
        aria-label="삭제"
        style={{
          padding: '6px 10px',
          borderRadius: 999,
          border: '1px solid #FECACA',
          background: '#FEF2F2',
          color: '#DC2626',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        삭제
      </button>
    </div>
  );
}

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 999,
        border: '1px dashed #CBD5E1',
        background: '#F8FAFC',
        color: tokens.primary,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function RemoveX({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="줄 삭제"
      style={{
        width: 30,
        height: 30,
        flexShrink: 0,
        borderRadius: 999,
        border: '1px solid #E2E8F0',
        background: '#FFFFFF',
        color: '#94A3B8',
        fontSize: 16,
        lineHeight: 1,
        cursor: 'pointer',
      }}
    >
      ×
    </button>
  );
}
