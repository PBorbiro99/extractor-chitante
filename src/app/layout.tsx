import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Extractor Chitanțe',
  description: 'Extrage date din chitanțe și le salvează în Google Sheets',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
