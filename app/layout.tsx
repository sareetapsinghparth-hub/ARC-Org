import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReasonLens · Engineering Physics",
  description: "Ask questions about your Engineering Physics material and get answers grounded in cited document passages.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
