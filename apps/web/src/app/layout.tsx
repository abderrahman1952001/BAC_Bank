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
  title: "مِراس | منصة التحضير للبكالوريا الجزائرية",
  description:
    "منصة البكالوريا الجزائرية للمكتبة، التدريب، وتتبع الإتقان في مساحة واحدة.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <>
      <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
      {children}
    </>
  );

  return (
    <html
      lang="ar"
      dir="rtl"
      data-theme="dark"
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <body
        className={`${cairo.variable} ${tajawal.variable}`}
        suppressHydrationWarning
      >
        <ClerkProvider
          afterSignOutUrl="/auth"
          signInUrl="/auth/sign-in"
          signUpUrl="/auth/sign-up"
        >
          {content}
        </ClerkProvider>
      </body>
    </html>
  );
}
