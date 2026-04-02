import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { OnlineStatusProvider } from "@/context/OnlineStatusContext";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "TeamNest",
  description: "Team collaboration platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AntdRegistry>
            <OnlineStatusProvider>
              {children}
            </OnlineStatusProvider>
          </AntdRegistry>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
