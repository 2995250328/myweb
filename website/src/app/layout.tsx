import type { Metadata } from "next";
import { AppProvider } from "@/context/AppContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "TorchLeet — PyTorch Interview Prep",
  description:
    "Practice PyTorch problems for ML/AI interviews. 79 questions from basic to expert, tagged with real interview companies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="h-full font-mono">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
