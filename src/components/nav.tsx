"use client";

import { CalendarCheck, ChevronDown, Home, KeyRound, LogOut, Menu, ReceiptText, Settings, UserCircle, Users, Wallet, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./logo";
import { useUser } from "./user-context";

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/students", label: "Students", icon: Users },
  { href: "/fees", label: "Fees", icon: Wallet },
  { href: "/challans", label: "Challans", icon: ReceiptText },
  { href: "/reports", label: "Attendance Report", icon: CalendarCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  if (pathname === "/login") return null;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // Full reload so no data from this session stays in memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }

  return (
    <header className="no-print sticky top-0 z-40 bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 text-white shadow-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" onClick={() => setOpen(false)}>
          <Logo className="h-9 w-9 shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-base font-bold tracking-tight">Al-Ismat Academy</span>
            <span className="block truncate text-[11px] font-medium text-emerald-100/80">Student Portal</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          <nav className="flex items-center gap-0.5">
            {LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                  isActive(href) ? "bg-white/15 text-white" : "text-emerald-50/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
          {user && (
            <div className="relative ml-2" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-lg border border-white/20 px-2.5 py-1.5 text-sm hover:bg-white/10"
                aria-expanded={menuOpen}
              >
                <UserCircle className="h-4 w-4" />
                {user.username}
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl bg-white text-emerald-950 shadow-lg ring-1 ring-emerald-900/10">
                  <div className="border-b border-emerald-900/10 px-4 py-3">
                    <div className="font-semibold">{user.username}</div>
                    <div className="text-xs text-emerald-900/55">Administrator</div>
                  </div>
                  <Link href="/account" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-emerald-50">
                    <KeyRound className="h-4 w-4 text-emerald-700" /> Change password
                  </Link>
                  <button onClick={logout} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-white/10 px-4 pb-4 lg:hidden">
          {user && (
            <div className="mt-3 mb-1 flex items-center gap-2 px-3 text-sm text-emerald-50/85">
              <UserCircle className="h-5 w-5" />
              <span className="font-semibold text-white">{user.username}</span>
            </div>
          )}
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`mt-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${isActive(href) ? "bg-white/15" : "hover:bg-white/10"}`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className={`mt-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${isActive("/account") ? "bg-white/15" : "hover:bg-white/10"}`}
          >
            <KeyRound className="h-5 w-5" />
            Change password
          </Link>
          <button onClick={logout} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-white/10">
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </nav>
      )}
    </header>
  );
}
