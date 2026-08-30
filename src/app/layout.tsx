import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProcessTwin | Process design workspace",
  description: "Design, simulate, and review business processes alongside an AI agent.",
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
