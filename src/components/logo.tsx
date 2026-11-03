export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#ffffff" fillOpacity="0.14" />
      <path d="M24 9a15 15 0 1 0 10.6 25.6A12 12 0 1 1 24 9Z" fill="#a7f3d0" />
      <path d="m31.5 14 1.4 3 3.1.4-2.3 2.1.6 3.1-2.8-1.6-2.8 1.6.6-3.1-2.3-2.1 3.1-.4Z" fill="#fde68a" />
      <path d="M17 30.5c2.6-1.3 5-1.3 7 0 2-1.3 4.4-1.3 7 0v-8.5c-2.6-1.3-5-1.3-7 0-2-1.3-4.4-1.3-7 0Z" fill="#ffffff" />
      <path d="M24 22v8.5" stroke="#047857" strokeWidth="1.2" />
    </svg>
  );
}
