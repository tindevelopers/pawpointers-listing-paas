import { NextRequest } from "next/server";
import { streamText } from "ai";
import { kbSearchTool } from "@/lib/ai/tools";
import { getAIClient } from "@listing-platform/ai";

const systemPrompt =
  "You are the SaaS Admin copilot. Ground answers in the knowledge base tool when possible. " +
  "Cite titles and links. If no KB result is relevant, answer concisely and ask for clarification.";

export async function POST(req: NextRequest) {
  try {
    // Get the AI client (gateway first, fallback to direct OpenAI)
    const { chatModel, resolvedConfig } = getAIClient();

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const result = await streamText({
      model: chatModel,
      system: systemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      tools: {
        kbSearch: kbSearchTool,
      },
      maxSteps: 4,
      maxTokens: resolvedConfig.maxTokens,
      temperature: resolvedConfig.temperature,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("[api/ai] error", error);
    
    // Provide more specific error messages
    if (error instanceof Error && error.message.includes("Missing AI configuration")) {
      return new Response(
        JSON.stringify({
          error: "AI is not configured",
          message: "Please set AI_GATEWAY_URL/AI_GATEWAY_API_KEY or OPENAI_API_KEY in your environment variables.",
        }),
        { status: 503, headers: { "content-type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Unable to process request",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}


