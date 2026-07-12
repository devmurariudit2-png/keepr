import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keepr — Never lose a lead again.",
  description: "Keepr captures, qualifies, and books incoming real estate leads automatically.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
