export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200/80 bg-white/80">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-gray-700"><span className="text-indigo-600">Vibe</span>Fund</p>
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} VibeFund. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
