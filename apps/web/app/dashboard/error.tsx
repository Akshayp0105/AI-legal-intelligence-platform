'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)',
            border: '2px solid rgba(239,68,68,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 24,
          }}
        >
          !
        </div>
        <h2
          style={{
            color: '#fff',
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 8,
            fontFamily: 'var(--font-display)',
          }}
        >
          Something went wrong
        </h2>
        <p
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            background: 'var(--amber)',
            color: 'var(--navy)',
            border: 'none',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
