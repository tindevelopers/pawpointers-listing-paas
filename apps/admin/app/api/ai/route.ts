import { NextRequest } from "next/server";
import { streamText } from "ai";
import { kbSearchTool } from "@/lib/ai/tools";
import { assertAIConfig, defaultChatModel } from "@/lib/ai/models";

const systemPrompt =
  "You are the SaaS Admin copilot. Ground answers in the knowledge base tool when possible. " +
  "Cite titles and links. If no KB result is relevant, answer concisely and ask for clarification.";

export async function POST(req: NextRequest) {
  try {
    assertAIConfig();
    const { messages } = await req.json();

    if (!defaultChatModel) {
      return new Response(
        JSON.stringify({ error: "AI model is not configured." }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const result = await streamText({
      model: defaultChatModel,
      system: systemPrompt,
      messages,
      tools: {
        kbSearch: kbSearchTool,
      },
      maxSteps: 4,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("[api/ai] error", error);
    return new Response(
      JSON.stringify({ error: "Unable to process request" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}


