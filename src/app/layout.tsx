export const metadata = {
  title: 'Q&A Telegram Nutrition Bot',
  description: 'A Q&A RAG based Telegram Bot about nutrition which use Atlas Vector Search as a vector store',
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
