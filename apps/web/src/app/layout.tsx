import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Cairo, Tajawal } from "next/font/google";
import "./globals.css";
import { getThemeInitScript } from "@/lib/theme";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  variable: "--font-display",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "BAC Bank | Premium Algerian BAC QBank",
  description:
    "منصة مراجعة مميزة لطلبة البكالوريا في الجزائر: مواضيع منظمة وجلسات دراسة ذكية.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} ${tajawal.variable}`}
        suppressHydrationWarning
      >
        <ClerkProvider
          afterSignOutUrl="/auth"
          signInUrl="/auth/sign-in"
          signUpUrl="/auth/sign-up"
        >
          <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
