import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Summit Scrap — Physics Climber",
  description: "A tiny original physics-climbing challenge.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
