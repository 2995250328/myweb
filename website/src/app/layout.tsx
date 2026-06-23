import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "街头健身进阶与肩袖恢复工作台",
  description:
    "云端同步的街头健身进阶计划、肩袖恢复方案、训练记录和完整 PDF 原文查看。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
