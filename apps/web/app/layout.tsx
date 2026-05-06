import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LexAI – AI Legal Intelligence Platform',
  description: 'AI-powered legal intelligence platform for Indian law practitioners. Case analysis, precedent search, and legal document drafting.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </head>
        <body style={{ fontFamily: "'Inter', sans-serif" }}>{children}</body>
      </html>
    </ClerkProvider>
  )
}
