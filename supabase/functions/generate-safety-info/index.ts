import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { machineName, description, manualContent } = await req.json();

    if (!machineName) {
      throw new Error("Missing required field: machineName");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const contextInfo = manualContent 
      ? `\n\nManual content:\n${manualContent}`
      : description 
        ? `\n\nDescription: ${description}`
        : "";

    const prompt = `Generate safety information for a machine called "${machineName}".${contextInfo}

Provide:
1. The most common injury type associated with this machine (e.g., "Crushing Hazard", "Electrical Shock", "Laceration Risk")
2. A critical safety warning message that should be shown to operators before using this machine. This should be 1-3 sentences that clearly communicate the primary dangers.

Return as JSON with "common_injury" and "safety_warning" fields.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a safety expert specializing in industrial equipment. Generate accurate, concise safety information. Always respond with valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_safety_info",
              description: "Generate safety information for a machine",
              parameters: {
                type: "object",
                properties: {
                  common_injury: { 
                    type: "string",
                    description: "The most common injury type (e.g., 'Crushing Hazard')"
                  },
                  safety_warning: { 
                    type: "string",
                    description: "Critical safety warning message (1-3 sentences)"
                  },
                },
                required: ["common_injury", "safety_warning"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_safety_info" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("Invalid response from AI");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ 
        common_injury: parsed.common_injury,
        safety_warning: parsed.safety_warning,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
