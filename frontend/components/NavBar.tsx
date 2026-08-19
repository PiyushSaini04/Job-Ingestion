"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

const links = [
  { href: '/', label: 'Jobs' },
  { href: '/status', label: 'Status' }
];

export function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--background)_74%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] text-sm font-semibold text-[color:var(--accent)] shadow-[var(--shadow-soft)] transition group-hover:scale-[1.02]">
            JI
          </span>
          <div className="hidden sm:block">
            <p className="font-display text-base font-semibold tracking-tight text-[color:var(--text-primary)]">
              Job Ingestion
            </p>
            <p className="text-xs text-[color:var(--text-secondary)]">Part 1 feed</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Primary">
          {links.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  'ui-focus rounded-full px-4 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] text-[color:var(--text-primary)]'
                    : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--surface)] hover:text-[color:var(--text-primary)]'
                ].join(' ')}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <button
            type="button"
            className="ui-focus inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] shadow-[var(--shadow-soft)] md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            <span className="sr-only">Toggle navigation</span>
            <span className="flex flex-col gap-1.5">
              <span className="h-0.5 w-4 rounded bg-current" />
              <span className="h-0.5 w-4 rounded bg-current" />
              <span className="h-0.5 w-4 rounded bg-current" />
            </span>
          </button>
        </div>
      </div>

      <div className={open ? 'border-t border-[color:var(--border)] md:hidden' : 'hidden'}>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <ThemeToggle />
          </div>
          {links.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={[
                  'ui-focus rounded-2xl px-4 py-3 text-sm font-medium transition',
                  active
                    ? 'bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] text-[color:var(--text-primary)]'
                    : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--surface)] hover:text-[color:var(--text-primary)]'
                ].join(' ')}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
