import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "VendorBridge | Procurement ERP System",
  description: "VendorBridge ERP system for enterprise procurement, RFQ lifecycle administration, bid evaluations, and auditing logs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <ThemeProvider>
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
