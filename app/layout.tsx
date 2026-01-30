import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NE Manchester Land Map",
  description: "Interactive land parcel mapping for Manchester North Eastern constituency",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
