import Link from "next/link";
import { signOut } from "@/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header
        className="flex items-center justify-between px-9 py-4 text-white shadow-md"
        style={{
          background: "linear-gradient(135deg, var(--brand-green) 0%, var(--brand-green-dark) 100%)",
        }}
      >
        <div className="font-bold text-lg tracking-tight">
          Al-Ismat Academy <span className="font-normal text-sm opacity-85 ml-1.5">Attendance</span>
        </div>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link className="hover:opacity-100 opacity-90 border-b-2 border-transparent hover:border-white/70 pb-1" href="/students">
            Students
          </Link>
          <Link className="hover:opacity-100 opacity-90 border-b-2 border-transparent hover:border-white/70 pb-1" href="/reports">
            Reports
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="hover:opacity-100 opacity-90 border-b-2 border-transparent hover:border-white/70 pb-1 cursor-pointer" type="submit">
              Logout
            </button>
          </form>
        </nav>
      </header>
      <main className="max-w-4xl w-full mx-auto px-6 py-9">{children}</main>
    </>
  );
}
