import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { AuthGuard } from '@/components/auth-guard'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VibeFund',
  description: '창의적인 프로젝트를 위한 크라우드 펀딩 플랫폼',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${geist.className} bg-gray-50 text-gray-900 antialiased`}>
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              <AuthGuard>{children}</AuthGuard>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
