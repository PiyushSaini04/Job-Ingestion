"use client";

import { useEffect, useState } from 'react';

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > window.innerHeight * 1.1);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="ui-focus fixed bottom-5 right-5 z-30 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm font-medium text-[color:var(--text-primary)] shadow-[var(--shadow-elevated)] transition hover:bg-[color:var(--surface-hover)]"
      aria-label="Back to top"
    >
      Back to top
    </button>
  );
}
