import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { getAIClient } from "@listing-platform/ai";

/**
 * Basic AI Chatbot Backend
 * 
 * Simple chat endpoint that works with:
 * - Vercel AI Gateway (preferred)
 * - Direct OpenAI API (fallback)
 * 
 * Supports streaming responses for real-time chat experience.
 */

const SYSTEM_PROMPT = `You are a helpful AI assistant. Provide clear, concise, and accurate responses to user questions. 
Be friendly and professional. If you don't know something, say so honestly.`;

export async function POST(req: NextRequest) {
  try {
    // Get the AI client (gateway first, fallback to direct OpenAI)
    const { chatModel, resolvedConfig } = getAIClient();

    // Parse request body
    const body = await req.json();
    const { messages, systemPrompt } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Use custom system prompt if provided, otherwise use default
    const finalSystemPrompt = systemPrompt || SYSTEM_PROMPT;

    // Stream the response
    const result = await streamText({
      model: chatModel,
      system: finalSystemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      maxTokens: resolvedConfig.maxTokens,
      temperature: resolvedConfig.temperature,
    });

    // Return streaming response
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("[api/chat] Error:", error);
    
    // Check if it's a configuration error
    if (error instanceof Error && error.message.includes("Missing AI configuration")) {
      return NextResponse.json(
        {
          error: "AI is not configured",
          message: "Please set AI_GATEWAY_URL/AI_GATEWAY_API_KEY or OPENAI_API_KEY in your environment variables.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to process chat request",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for health check
 */
export async function GET() {
  try {
    const { chatModel } = getAIClient();
    return NextResponse.json({
      status: "ok",
      endpoint: "/api/chat",
      model: chatModel ? "configured" : "not configured",
      streaming: true,
      methods: ["POST"],
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      endpoint: "/api/chat",
      error: error instanceof Error ? error.message : "Unknown error",
      methods: ["POST"],
    });
  }
}

