import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { OnlineStatusProvider } from "@/context/OnlineStatusContext";
import { FriendRequestProvider } from "@/context/FriendRequestContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { DirectMessageNotificationProvider } from "@/context/DirectMessageNotificationContext";
import { MentionNotificationProvider } from "@/context/MentionNotificationContext";
import AiAssistant from "@/components/AiAssistant/AiAssistant";
import Tutorial from "@/components/Tutorial/Tutorial";
import AuthHydrationProvider from "@/components/AuthHydrationProvider";

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
            <AuthHydrationProvider>
              <OnlineStatusProvider>
                <FriendRequestProvider>
                  <DirectMessageNotificationProvider>
                    <MentionNotificationProvider>
                      {children}
                      <AiAssistant />
                      <Tutorial />
                    </MentionNotificationProvider>
                  </DirectMessageNotificationProvider>
                </FriendRequestProvider>
              </OnlineStatusProvider>
            </AuthHydrationProvider>
          </AntdRegistry>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
