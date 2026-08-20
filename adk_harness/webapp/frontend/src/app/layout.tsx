import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Basic ADK Harness",
  description: "A chatbot template built on the A2UI spec",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
