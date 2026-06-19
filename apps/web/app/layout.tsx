import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'LexAI – AI Legal Intelligence Platform',
    template: '%s | LexAI',
  },
  description: 'AI-powered legal intelligence platform for Indian law practitioners. Case analysis, precedent search, and legal document drafting.',
  keywords: ['legal AI', 'Indian law', 'case analysis', 'legal drafting', 'precedent search'],
  authors: [{ name: 'LexAI Team' }],
  openGraph: {
    title: 'LexAI – AI Legal Intelligence Platform',
    description: 'AI-powered legal intelligence platform for Indian law practitioners.',
    url: 'https://lexai.app',
    siteName: 'LexAI',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LexAI – AI Legal Intelligence Platform',
    description: 'AI-powered legal intelligence platform for Indian law practitioners.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: '#1e293b',
  width: 'device-width',
  initialScale: 1,
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
