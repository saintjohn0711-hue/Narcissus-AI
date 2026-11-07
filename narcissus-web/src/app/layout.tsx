import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const display = localFont({
  src: [
    {
      path: "./fonts/cormorant-garamond-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/cormorant-garamond-600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/cormorant-garamond-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-display",
  display: "swap",
});

const body = localFont({
  src: [
    { path: "./fonts/outfit-300.woff2", weight: "300", style: "normal" },
    { path: "./fonts/outfit-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/outfit-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/outfit-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Narcissus",
    template: "%s · Narcissus",
  },
  description:
    "Your Reflection, Your Rules — likeness edits, Muses, stories, and discovery",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
