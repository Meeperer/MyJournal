import type { Metadata } from "next";
import { Yatra_One, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { RegisterSw } from "@/components/RegisterSw";

const yatraOne = Yatra_One({
  variable: "--font-yatra",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Myjo – Your Journal",
  description: "A calm, reflective space for your thoughts. Write in a softly lit, intimate journal.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${yatraOne.variable} ${dmSans.variable} antialiased grain animate-in`}>
        <a
          href="#main"
          className="skip-link absolute left-4 top-4 z-[100] rounded bg-[var(--accent)] px-4 py-2 text-[var(--btn-text)] outline-none"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
            <RegisterSw />
            <div id="main">{children}</div>
            <OfflineIndicator />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
