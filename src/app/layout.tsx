import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Monarch — MCP Control Plane",
  description: "Manage all your MCP servers from one place",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
