import type { Metadata } from "next";
import { Inter, Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";
import RootProvider from "./components/RootProvider";
import ClientLayoutWrapper from "./components/ClientLayoutWrapper";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat App",
  description: "Modern chat application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true} className={`${inter.variable} ${manrope.variable} ${geistMono.variable} antialiased font-sans`} >
        <RootProvider>

          <ClientLayoutWrapper>
            {children}
          </ClientLayoutWrapper>
        </RootProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
