export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body style={{ fontFamily: 'ui-sans-serif, system-ui' }}>{children}</body>
    </html>
  );
}