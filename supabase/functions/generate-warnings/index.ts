import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { machineId, machineName, manualContent } = await req.json();

    if (!machineId || !machineName) {
      throw new Error("Missing required fields: machineId, machineName");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const prompt = manualContent
      ? `Based on the following machine manual for "${machineName}", generate comprehensive safety warnings and liability notices. Each warning should cover a specific safety hazard or risk that the operator must acknowledge before using the machine. Focus on:
- Physical dangers (crushing, cutting, burns, electrical hazards)
- PPE requirements
- Environmental hazards
- Liability and legal notices
- Emergency procedures

Manual content:
${manualContent}

Generate 5-10 detailed warnings in JSON format as an array of objects with "title", "content", "severity" (low/medium/high/critical), and "order_index" (starting from 0) fields.`
      : `Generate comprehensive safety warnings and liability notices for a machine called "${machineName}". Each warning should cover a specific safety hazard or risk that the operator must acknowledge. Focus on:
- Physical dangers
- PPE requirements  
- Environmental hazards
- Liability notices
- Emergency procedures

Generate 5-10 detailed warnings in JSON format as an array of objects with "title", "content", "severity" (low/medium/high/critical), and "order_index" (starting from 0) fields.`;

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
            content: "You are a workplace safety expert and legal compliance specialist. Generate comprehensive safety warnings that cover all potential liabilities. Be thorough about potential hazards. Always respond with valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_warnings",
              description: "Generate safety warnings and liability notices for a machine",
              parameters: {
                type: "object",
                properties: {
                  warnings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        content: { type: "string" },
                        severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                        order_index: { type: "number" },
                      },
                      required: ["title", "content", "severity", "order_index"],
                    },
                  },
                },
                required: ["warnings"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_warnings" } },
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
    const warnings = parsed.warnings;

    // Delete existing unapproved warnings for this machine (keep approved ones)
    await supabase
      .from("machine_warnings")
      .delete()
      .eq("machine_id", machineId)
      .eq("is_approved", false);

    // Insert new warnings (unapproved by default)
    const warningsToInsert = warnings.map((warn: { title: string; content: string; severity: string; order_index: number }) => ({
      machine_id: machineId,
      title: warn.title,
      content: warn.content,
      severity: warn.severity,
      order_index: warn.order_index,
      is_approved: false,
    }));

    const { error: insertError } = await supabase
      .from("machine_warnings")
      .insert(warningsToInsert);

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save warnings");
    }

    return new Response(
      JSON.stringify({ success: true, count: warnings.length }),
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
