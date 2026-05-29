import { IconChevronRight } from '../icons';

export default function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <IconChevronRight size={24} style={{ transform: 'rotate(180deg)', color: '#0F172A' }} />
      </button>
      <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: 18 }}>{title}</div>
      <div style={{ width: 24 }} />
    </div>
  );
}
