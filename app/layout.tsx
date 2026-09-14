import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DesignModeProvider, DesignModeScript } from "@/components/DesignModeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Untungin",
  description: "Kelola bisnis reseller: produk, pesanan, dan untung.",
  appleWebApp: {
    capable: true,
    title: "Untungin",
    statusBarStyle: "default",
  },
  other: {
    // Next only emits the newer "mobile-web-app-capable" from appleWebApp.capable;
    // pre-16.4 iOS Safari needs this legacy name for true standalone mode.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // App theme is user-toggled (dark by default), not OS-driven, so this is
  // a single static color matching --bg-base for the default (dark) theme.
  themeColor: "#05070d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <head>
        <DesignModeScript />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <DesignModeProvider>{children}</DesignModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
