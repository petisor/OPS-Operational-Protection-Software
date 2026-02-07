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
      ? `Based on the following machine manual for "${machineName}", generate clear step-by-step operating instructions. Each step should be numbered and have a title and detailed content explaining how to safely and effectively operate the machine.

Manual content:
${manualContent}

Generate 5-10 detailed instructional steps in JSON format as an array of objects with "step_number", "title", and "content" fields.`
      : `Generate step-by-step operating instructions for a machine called "${machineName}". Create clear, professional instructions that cover basic operation. Each step should be numbered and have a title and detailed content.

Generate 5-10 detailed instructional steps in JSON format as an array of objects with "step_number", "title", and "content" fields.`;

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
            content: "You are an expert technical writer specializing in industrial equipment documentation. Generate clear, safety-conscious operating instructions. Always respond with valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_instructions",
              description: "Generate operating instructions for a machine",
              parameters: {
                type: "object",
                properties: {
                  instructions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        step_number: { type: "number" },
                        title: { type: "string" },
                        content: { type: "string" },
                      },
                      required: ["step_number", "title", "content"],
                    },
                  },
                },
                required: ["instructions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_instructions" } },
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
    const instructions = parsed.instructions;

    // Delete existing instructions for this machine
    await supabase
      .from("machine_instructions")
      .delete()
      .eq("machine_id", machineId);

    // Insert new instructions
    const instructionsToInsert = instructions.map((inst: { step_number: number; title: string; content: string }) => ({
      machine_id: machineId,
      step_number: inst.step_number,
      title: inst.title,
      content: inst.content,
    }));

    const { error: insertError } = await supabase
      .from("machine_instructions")
      .insert(instructionsToInsert);

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save instructions");
    }

    return new Response(
      JSON.stringify({ success: true, count: instructions.length }),
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
