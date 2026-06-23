import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "街头健身进阶与肩袖恢复工作台",
  description: "整合街头健身进阶计划、肩袖恢复方案、训练记录和完整 PDF 原文查看。",
};

export default function CalisthenicsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
