import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SK hynix AI News",
  description:
    "AI-powered daily semiconductor, AI, and technology news briefing platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}