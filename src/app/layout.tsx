import type { Metadata } from "next";
import { Lora, Playfair_Display, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevPlay — Red social para devs de videojuegos indie",
  description: "Conecta creadores de juegos 2D/3D con testers. Descubre betas exclusivas, mira directos y únete a la comunidad.",
  keywords: ["DevPlay", "indie games", "game dev", "betas", "streaming", "comunidad"],
  authors: [{ name: "DevPlay" }],
  openGraph: {
    title: "DevPlay",
    description: "Red social para devs de videojuegos indie y testers",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${lora.variable} ${playfair.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Providers>
            {children}
            <Toaster />
            <SonnerToaster position="top-right" richColors />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
