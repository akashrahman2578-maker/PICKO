import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Picko Shop",
  description: "Premium online shopping experience by Picko Shop",
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