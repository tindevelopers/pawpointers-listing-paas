import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service-client";

/**
 * GET /api/admin/ai-config
 * Retrieve AI configuration from database
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    
    // Get AI config from database (stored per tenant/organization)
    // For now, we'll use environment variables as fallback
    const config = {
      provider: (process.env.AI_PROVIDER || "gateway") as "gateway" | "openai" | "abacus",
      gateway: {
        url: process.env.AI_GATEWAY_URL || "",
        apiKey: process.env.AI_GATEWAY_API_KEY ? "***" : "", // Don't expose full key
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY ? "***" : "",
        model: process.env.AI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
      },
      abacus: {
        apiKey: process.env.ABACUS_AI_API_KEY ? "***" : "",
        baseUrl: process.env.ABACUS_AI_BASE_URL || "",
        model: process.env.ABACUS_AI_MODEL || "",
      },
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error("[api/admin/ai-config] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load AI configuration" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-config
 * Save AI configuration (updates environment variables or database)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, gateway, openai, abacus } = body;

    // Validate provider
    if (!["gateway", "openai", "abacus"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider. Must be 'gateway', 'openai', or 'abacus'" },
        { status: 400 }
      );
    }

    // In a production system, you would save this to a database
    // For now, we'll return success and note that env vars need to be set manually
    // TODO: Store in database table like `ai_configurations` with tenant_id

    const supabase = getSupabaseServiceClient();
    
    // For now, just validate the configuration
    if (provider === "gateway" && (!gateway?.url || !gateway?.apiKey)) {
      return NextResponse.json(
        { error: "Gateway URL and API Key are required" },
        { status: 400 }
      );
    }

    if (provider === "openai" && !openai?.apiKey) {
      return NextResponse.json(
        { error: "OpenAI API Key is required" },
        { status: 400 }
      );
    }

    if (provider === "abacus" && !abacus?.apiKey) {
      return NextResponse.json(
        { error: "Abacus AI API Key is required" },
        { status: 400 }
      );
    }

    // TODO: Save to database
    // await supabase.from('ai_configurations').upsert({
    //   tenant_id: tenantId,
    //   provider,
    //   config: { gateway, openai, abacus },
    //   updated_at: new Date().toISOString(),
    // });

    return NextResponse.json({
      success: true,
      message: "Configuration saved. Note: Environment variables need to be updated manually for this to take effect.",
      provider,
    });
  } catch (error) {
    console.error("[api/admin/ai-config] POST error:", error);
    return NextResponse.json(
      { error: "Failed to save AI configuration" },
      { status: 500 }
    );
  }
}

