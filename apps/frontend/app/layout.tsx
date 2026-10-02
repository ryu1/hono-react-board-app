import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '🚀 超高速フルスタック・タスクボード',
  description: 'End-to-End 型安全なフルスタック・カンバンアプリ',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  )
}