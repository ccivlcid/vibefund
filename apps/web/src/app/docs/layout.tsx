export default function DocsLayout({ children }: { children: React.ReactNode }) {
  // Swagger UI를 전체화면으로 표시하기 위해 기본 레이아웃(헤더/푸터) 제거
  return <>{children}</>
}
