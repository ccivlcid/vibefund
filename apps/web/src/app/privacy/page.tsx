import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '개인정보처리방침 | VibeFund',
  description: 'VibeFund 개인정보처리방침',
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="text-sm font-medium text-teal-600 hover:underline">
          ← VibeFund로 돌아가기
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">개인정보처리방침</h1>
      <p className="mt-2 text-sm text-slate-500">최종 업데이트: 2026년 2월</p>

      <div className="prose prose-slate mt-8 max-w-none text-sm text-slate-700">
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">1. 수집하는 개인정보 항목</h2>
          <p>서비스는 다음의 개인정보를 수집할 수 있습니다.</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>필수:</strong> 이메일, 비밀번호(암호화 저장), 이름</li>
            <li><strong>선택:</strong> 프로필 이미지 URL, 소개(bio)</li>
            <li><strong>자동 수집:</strong> 서비스 이용 기록, 로그인 시각 등</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">2. 수집 목적</h2>
          <p>
            수집한 개인정보는 회원 식별·서비스 제공·검증 질문·댓글 작성자 표시·신고 처리·
            서비스 개선 및 안전한 운영을 위하여 사용됩니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">3. 보관 기간</h2>
          <p>
            회원 탈퇴 시 또는 수집 목적 달성 시까지 보관하며, 관계 법령에 따라 보존이
            필요한 경우 해당 기간 동안 보관합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">4. 제3자 제공</h2>
          <p>
            서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
            다만 법령에 의한 경우 등 예외가 있는 경우에는 해당 법령에 따릅니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">5. 파기</h2>
          <p>
            보관 기간이 지나거나 목적이 달성된 개인정보는 지체 없이 파기하며,
            전자적 파일은 복구 불가한 방법으로 삭제합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">6. 문의</h2>
          <p>
            개인정보 처리와 관련한 문의·열람·정정·삭제 요청은 서비스 내 안내된
            연락처 또는 이메일로 요청하실 수 있습니다.
          </p>
        </section>
      </div>

      <div className="mt-10 border-t border-slate-200 pt-6">
        <Link href="/terms" className="text-sm font-medium text-teal-600 hover:underline">
          이용약관 보기
        </Link>
      </div>
    </div>
  )
}
