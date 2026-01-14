import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "生成AIニュースキュレーション",
  description: "生成AIに関する最新ニュースをキュレーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
