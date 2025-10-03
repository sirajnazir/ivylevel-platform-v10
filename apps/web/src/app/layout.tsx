import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Jenny Agent Test UI',
  description: 'Test UI for IvyLevel Agent',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}