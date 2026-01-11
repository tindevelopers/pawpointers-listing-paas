import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ChatWidget } from "@/components/chat";
import { VisualEditing } from "@/components/builder/VisualEditing";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Listing Platform - Find What You're Looking For",
  description: "Discover the best listings on our platform. Search, browse, and find exactly what you need.",
  icons: {
    icon: '/images/favicon.ico',
  },
};

/**
 * Root Layout for Consumer Portal
 * 
 * CUSTOMIZE: Update the ChatWidget props for your platform branding.
 * Set OPENAI_API_KEY environment variable to enable AI chat.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only show chat widget if AI is configured
  const showChat = !!process.env.OPENAI_API_KEY;

  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        {/* Builder.io Visual Editing - enables editing pages directly on your site */}
        <VisualEditing />
        {/* CUSTOMIZE: Update chat widget styling and messages */}
        {showChat && (
          <ChatWidget
            position="bottom-right"
            primaryColor="#3b82f6"
            title="Need help?"
            welcomeMessage="Hi! I'm here to help you find what you're looking for. Ask me anything about our listings!"
            placeholder="Type your question..."
          />
        )}
      </body>
    </html>
  );
}

