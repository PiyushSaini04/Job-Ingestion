export function Footer() {
  return (
    <footer className="border-t border-[color:var(--border)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-[color:var(--text-secondary)] sm:px-6 lg:px-8 sm:flex-row sm:items-center sm:justify-between">
        <p>Built for explainable ingestion and a cleaner browsing experience.</p>
        <p>Dark theme by default, light theme available.</p>
      </div>
    </footer>
  );
}
