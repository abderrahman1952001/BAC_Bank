import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { getThemeInitScript } from "@/lib/theme";

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
  return (
    <html
      lang="ar"
      dir="rtl"
      data-theme="dark"
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
        <ClerkProvider
          afterSignOutUrl="/auth"
          signInUrl="/auth/sign-in"
          signUpUrl="/auth/sign-up"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
