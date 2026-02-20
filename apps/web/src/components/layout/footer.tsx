export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-gray-900">VibeFund</p>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} VibeFund. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
