import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppStoreProvider } from "@/lib/store";
import { ToastProvider } from "@/lib/toast";
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
  title: "SignalArc — An evidence-backed map of the world",
  description:
    "A personal world-intelligence app: follow evolving stories with cited timelines, explainable relevance, and material-change notifications.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900 dark:bg-[#0b0f1f] dark:text-slate-100">
        <AppStoreProvider>
          <ToastProvider>{children}</ToastProvider>
        </AppStoreProvider>
      </body>
    </html>
  );
}
