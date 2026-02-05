// Supabase Edge Function: AI Review Moderation
// Analyzes reviews for content violations and bot detection

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface ModerationRequest {
  review_id: string;
  review_content?: string;
  review_rating: number;
  user_id: string;
  listing_id: string;
}

interface ModerationResult {
  approved: boolean;
  confidence: number;
  reasons: string[];
  botScore: number;
  botReasons: string[];
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "authorization, content-type",
        },
      });
    }

    const { review_id, review_content, review_rating, user_id, listing_id } =
      await req.json() as ModerationRequest;

    if (!review_id) {
      return new Response(
        JSON.stringify({ error: "review_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get review details from database
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", review_id)
      .single();

    if (reviewError || !review) {
      return new Response(
        JSON.stringify({ error: "Review not found", details: reviewError }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const content = review_content || review.content || "";
    const rating = review_rating || review.rating;

    // Update moderation queue to mark as processing
    await supabase
      .from("review_moderation_queue")
      .update({
        edge_function_invoked_at: new Date().toISOString(),
      })
      .eq("review_id", review_id);

    // Perform bot detection
    const botDetection = await detectBot(supabase, user_id, listing_id, content);

    // Perform AI content moderation
    const aiModeration = await moderateContent(content);

    // Combine results
    const confidence = aiModeration.confidence;
    const botScore = botDetection.score;
    const approved = 
      aiModeration.approved && 
      botScore < 0.7 && // Less than 70% bot likelihood
      confidence > 0.85; // More than 85% confidence it's clean

    const reasons = [...aiModeration.reasons];
    if (botScore > 0.5) {
      reasons.push(`Bot detection score: ${(botScore * 100).toFixed(0)}%`);
    }
    reasons.push(...botDetection.reasons);

    // Determine moderation status
    let aiModerationStatus: "approved" | "rejected" | "needs_review" = "needs_review";
    if (approved) {
      aiModerationStatus = "approved";
    } else if (aiModeration.approved === false || botScore > 0.8) {
      aiModerationStatus = "rejected";
    }

    // Update moderation queue with results
    const { error: updateError } = await supabase
      .from("review_moderation_queue")
      .update({
        ai_moderation_status: aiModerationStatus,
        ai_moderation_score: confidence,
        ai_moderation_reasons: {
          content_moderation: aiModeration.reasons,
          bot_detection: botDetection.reasons,
          overall_confidence: confidence,
          bot_score: botScore,
        },
        bot_detection_score: botScore,
        bot_detection_reasons: botDetection.reasons,
        ai_processed_at: new Date().toISOString(),
        moderation_processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("review_id", review_id);

    if (updateError) {
      console.error("Error updating moderation queue:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        review_id,
        approved,
        confidence,
        botScore,
        reasons,
        aiModerationStatus,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Moderation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

// AI Content Moderation using OpenAI Moderation API
async function moderateContent(
  content: string
): Promise<{ approved: boolean; confidence: number; reasons: string[] }> {
  if (!content || content.trim().length === 0) {
    return {
      approved: true,
      confidence: 1.0,
      reasons: [],
    };
  }

  // If no OpenAI API key, use basic rule-based moderation
  if (!OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not set, using basic moderation");
    return basicModeration(content);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        input: content,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return basicModeration(content);
    }

    const data = await response.json();
    const result = data.results[0];

    // Check if flagged
    const flagged = result.flagged;
    const categories = result.categories;
    const categoryScores = result.category_scores;

    const reasons: string[] = [];
    if (flagged) {
      Object.keys(categories).forEach((category) => {
        if (categories[category]) {
          const score = categoryScores[category];
          reasons.push(`${category} (${(score * 100).toFixed(0)}%)`);
        }
      });
    }

    // Calculate confidence (inverse of highest category score)
    const maxScore = Math.max(...Object.values(categoryScores) as number[]);
    const confidence = 1 - maxScore;

    return {
      approved: !flagged,
      confidence: Math.max(0, confidence), // Ensure non-negative
      reasons,
    };
  } catch (error) {
    console.error("OpenAI moderation error:", error);
    return basicModeration(content);
  }
}

// Basic rule-based moderation fallback
function basicModeration(
  content: string
): { approved: boolean; confidence: number; reasons: string[] } {
  const reasons: string[] = [];
  let approved = true;

  // Check for common profanity patterns (basic)
  const profanityPatterns = [
    /\b(fuck|shit|damn|hell|ass|bitch|bastard)\b/gi,
    /\b(crap|piss|dick|cock|pussy)\b/gi,
  ];

  for (const pattern of profanityPatterns) {
    if (pattern.test(content)) {
      approved = false;
      reasons.push("Profanity detected");
      break;
    }
  }

  // Check for excessive capitalization (potential spam)
  const upperCaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (upperCaseRatio > 0.5 && content.length > 20) {
    reasons.push("Excessive capitalization");
  }

  // Confidence based on whether we found issues
  const confidence = approved ? 0.7 : 0.3; // Lower confidence for basic moderation

  return { approved, confidence, reasons };
}

// Bot Detection
async function detectBot(
  supabase: any,
  user_id: string,
  listing_id: string,
  content: string
): Promise<{ score: number; reasons: string[] }> {
  const reasons: string[] = [];
  let botScore = 0;

  try {
    // Check 1: User review frequency (multiple reviews in short time)
    const { data: recentReviews } = await supabase
      .from("reviews")
      .select("id, created_at")
      .eq("user_id", user_id)
      .gte("created_at", new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order("created_at", { ascending: false });

    if (recentReviews && recentReviews.length > 3) {
      botScore += 0.3;
      reasons.push(`High review frequency: ${recentReviews.length} reviews in last hour`);
    }

    // Check 2: User account age and activity
    const { data: user } = await supabase
      .from("users")
      .select("created_at")
      .eq("id", user_id)
      .single();

    if (user) {
      const accountAge = Date.now() - new Date(user.created_at).getTime();
      const hoursOld = accountAge / (1000 * 60 * 60);

      if (hoursOld < 24) {
        botScore += 0.2;
        reasons.push("New account (less than 24 hours old)");
      }

      // Check if user has other activity
      const { count: listingCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user_id);

      const { count: bookingCount } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id);

      if (listingCount === 0 && bookingCount === 0 && hoursOld < 168) {
        botScore += 0.2;
        reasons.push("No other platform activity");
      }
    }

    // Check 3: Content patterns (repetitive, generic)
    if (content) {
      const words = content.toLowerCase().split(/\s+/);
      const uniqueWords = new Set(words);
      const repetitionRatio = uniqueWords.size / words.length;

      if (repetitionRatio < 0.3 && words.length > 10) {
        botScore += 0.2;
        reasons.push("Repetitive content detected");
      }

      // Check for generic bot-like phrases
      const genericPhrases = [
        "great service",
        "highly recommend",
        "very satisfied",
        "excellent quality",
      ];
      const hasGenericPhrase = genericPhrases.some((phrase) =>
        content.toLowerCase().includes(phrase)
      );

      if (hasGenericPhrase && content.length < 50) {
        botScore += 0.1;
        reasons.push("Generic review content");
      }
    }

    // Check 4: Same user reviewing same listing multiple times
    const { count: duplicateCount } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("listing_id", listing_id);

    if (duplicateCount && duplicateCount > 1) {
      botScore += 0.3;
      reasons.push("Multiple reviews for same listing");
    }

    // Normalize bot score to 0-1 range
    botScore = Math.min(1, botScore);

  } catch (error) {
    console.error("Bot detection error:", error);
  }

  return { score: botScore, reasons };
}
