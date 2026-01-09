import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Sidebar from "@/components/Layout/Sidebar";
import { getSession } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "iMag Messager",
  description: "Next Gen Messaging",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers user={session?.user}>
          <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            {session?.user && <Sidebar />}
            <main style={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden' }}>
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
