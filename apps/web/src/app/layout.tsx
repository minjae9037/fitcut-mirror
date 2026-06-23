import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fitcut Mirror",
  description: "AI hairstyle simulation for salon consultation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
