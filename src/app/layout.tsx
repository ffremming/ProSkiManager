import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "../components/layout/NavBar";

export const metadata: Metadata = {
  title: "Ski Classics Manager",
  description: "Manage your pro ski classics team in the browser",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
