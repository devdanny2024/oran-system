import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "../src/app/components/ui/sonner";

export const metadata: Metadata = {
  title: "Smart Home Automation Platform",
  description: "ORAN Smart Home Automation Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

