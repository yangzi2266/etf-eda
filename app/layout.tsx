import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ETF SIGNAL | 네이버 ETF 라이브 대시보드",
  description: "네이버 금융 데이터를 기반으로 운용사·시장·상품별 ETF를 실시간 분석하는 대시보드",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
