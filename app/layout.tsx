import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bulkine – Build Your Best Body",
  description: "Personalized fitness plans to help you bulk up and reach your goals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
