import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '이용약관 | VibeFund',
  description: 'VibeFund 서비스 이용약관',
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="text-sm font-medium text-teal-600 hover:underline">
          ← VibeFund로 돌아가기
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">이용약관</h1>
      <p className="mt-2 text-sm text-slate-500">최종 업데이트: 2026년 2월</p>

      <div className="prose prose-slate mt-8 max-w-none text-sm text-slate-700">
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">제1조 (목적)</h2>
          <p>
            본 약관은 VibeFund(이하 &quot;서비스&quot;)가 제공하는 웹 서비스의 이용과 관련하여
            서비스와 이용자 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">제2조 (정의)</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>&quot;서비스&quot;: VibeFund가 운영하는 데이터 기반 Pre-Seed 투자 허브 플랫폼</li>
            <li>&quot;이용자&quot;: 서비스에 접속하여 본 약관에 따라 이용하는 회원 및 비회원</li>
            <li>&quot;회원&quot;: 서비스에 가입하여 계정을 보유한 자</li>
            <li>&quot;콘텐츠&quot;: 프로젝트, 댓글, 검증 응답 등 이용자가 게시한 정보</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">제3조 (약관의 효력 및 변경)</h2>
          <p>
            서비스는 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며,
            변경 시 서비스 내 공지 또는 이메일 등으로 안내합니다. 변경된 약관은 공지 후
            효력이 발생합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">제4조 (서비스 이용)</h2>
          <p>
            이용자는 서비스를 통해 프로젝트 등록·검증 질문 응답·댓글 작성 등 본 서비스가
            제공하는 기능을 이용할 수 있습니다. 이용 시 타인의 권리를 침해하거나
            법령·공서양속에 위배되는 행위를 해서는 안 됩니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">제5조 (운영자 연락처)</h2>
          <p>
            서비스 이용과 관련한 문의·신고는 서비스 내 안내된 채널 또는
            개인정보처리방침에 명시된 연락처로 연락해 주시기 바랍니다.
          </p>
        </section>
      </div>

      <div className="mt-10 border-t border-slate-200 pt-6">
        <Link href="/privacy" className="text-sm font-medium text-teal-600 hover:underline">
          개인정보처리방침 보기
        </Link>
      </div>
    </div>
  )
}
