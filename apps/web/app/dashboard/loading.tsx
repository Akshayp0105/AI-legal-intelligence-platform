export default function DashboardLoading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--navy-deep)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid rgba(212,160,23,0.2)',
            borderTopColor: 'var(--amber)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <p
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            fontFamily: 'var(--font-body)',
          }}
        >
          Loading LexAI...
        </p>
      </div>
    </div>
  )
}
