import { ChatPanel } from "@/components/ai/ChatPanel";
import TenantBreadcrumbs from "@/components/tenant/TenantBreadcrumbs";

export default function AiAssistantPage() {
  return (
    <div className="space-y-6">
      <TenantBreadcrumbs
        items={[
          { label: "AI Assistant", href: "/ai-assistant" },
          { label: "Chat", href: "/ai-assistant" },
        ]}
      />

      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          AI Assistant
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ask questions about your workspace. Answers will use the knowledge base
          first, then the AI Gateway model.
        </p>
        <ChatPanel />
      </div>
    </div>
  );
}

