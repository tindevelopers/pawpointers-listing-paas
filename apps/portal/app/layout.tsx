import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ChatWidget } from "@/components/chat";
import { VisualEditing } from "@/components/builder/VisualEditing";
import { ReviewsProviderWrapper } from "@/components/ReviewsProviderWrapper";

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Your Platform";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${PLATFORM_NAME} - Find What You're Looking For`,
  description:
    "Discover the best listings on this platform. Search, browse, and find exactly what you need.",
  icons: {
    icon: '/images/favicon.ico',
  },
};

/**
 * Root Layout for Consumer Portal
 * 
 * CUSTOMIZE: Update the ChatWidget props for your platform branding.
 * Set AI_GATEWAY_URL + AI_GATEWAY_API_KEY (or OPENAI_API_KEY) to enable AI chat.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only show chat widget if AI is configured
  const showChat =
    (!!process.env.AI_GATEWAY_URL && !!process.env.AI_GATEWAY_API_KEY) ||
    !!process.env.OPENAI_API_KEY;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ReviewsProviderWrapper>
          {children}
          {/* Builder.io Visual Editing - enables editing pages directly on your site */}
          <VisualEditing />
          {/* CUSTOMIZE: Update chat widget styling and messages */}
          {showChat && (
            <ChatWidget
              position="bottom-right"
              primaryColor="#3b82f6"
              title="Need help?"
              welcomeMessage={`Hi! I'm here to help you find what you're looking for on ${PLATFORM_NAME}. Ask me anything about our listings.`}
              placeholder="Type your question..."
            />
          )}
        </ReviewsProviderWrapper>
      </body>
    </html>
  );
}
