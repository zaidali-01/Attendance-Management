import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import { ToastProvider } from "@/components/toast";
import { UserProvider } from "@/components/user-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Al-Ismat Academy · Student Portal",
    template: "%s · Al-Ismat Academy",
  },
  description: "Students, monthly fees, fee challans and attendance for Al-Ismat Academy.",
};

export const viewport: Viewport = {
  themeColor: "#047857",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <UserProvider>
          <ToastProvider>
            <Nav />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
            <footer className="no-print border-t border-emerald-900/10 py-5 text-center text-xs text-emerald-900/50">
              Al-Ismat Academy · Since 2006
            </footer>
          </ToastProvider>
        </UserProvider>
      </body>
    </html>
  );
}
