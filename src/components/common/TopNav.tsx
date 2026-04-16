import { useNavigate } from 'react-router-dom';

interface TopNavProps {
  title: string;
  rightContent?: React.ReactNode;
}

export default function TopNav({ title, rightContent }: TopNavProps) {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '54px 20px 12px',
    }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          width: 40, height: 40,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D2A26" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#2D2A26' }}>{title}</span>
      <div style={{ width: 40 }}>{rightContent}</div>
    </div>
  );
}
