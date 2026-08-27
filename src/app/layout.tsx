import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProcessTwin",
  description: "ProcessTwin WebMCP smoke test",
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
