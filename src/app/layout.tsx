import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BOBO",
  description: "BOBO — bakery-to-cafés daily delivery platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
