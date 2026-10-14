import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Education Data Investigator",
  description: "Explore edtech vendors, subprocessors, ownership, lawsuits, controversies, and the state systems student data flows into.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
