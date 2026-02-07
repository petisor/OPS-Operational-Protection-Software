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
    const { machineId, message, conversationHistory } = await req.json();

    if (!machineId || !message) {
      throw new Error("Missing required fields: machineId, message");
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

    // Fetch machine info
    const { data: machine } = await supabase
      .from("machines")
      .select("name, description, safety_warning, common_injury")
      .eq("id", machineId)
      .single();

    if (!machine) {
      throw new Error("Machine not found");
    }

    // Fetch instructions for context
    const { data: instructions } = await supabase
      .from("machine_instructions")
      .select("step_number, title, content")
      .eq("machine_id", machineId)
      .order("step_number");

    // Fetch approved warnings for context
    const { data: warnings } = await supabase
      .from("machine_warnings")
      .select("title, content, severity")
      .eq("machine_id", machineId)
      .eq("is_approved", true)
      .order("order_index");

    // Build context from available data
    let context = `Machine: ${machine.name}\n`;
    if (machine.description) {
      context += `Description: ${machine.description}\n`;
    }
    context += `Safety Warning: ${machine.safety_warning}\n`;
    context += `Common Injury: ${machine.common_injury}\n\n`;

    if (instructions && instructions.length > 0) {
      context += "Operating Instructions:\n";
      instructions.forEach((inst) => {
        context += `Step ${inst.step_number}: ${inst.title}\n${inst.content}\n\n`;
      });
    }

    if (warnings && warnings.length > 0) {
      context += "\nSafety Warnings:\n";
      warnings.forEach((warn) => {
        context += `[${warn.severity.toUpperCase()}] ${warn.title}: ${warn.content}\n\n`;
      });
    }

    const systemPrompt = `You are a helpful assistant specialized in answering questions about the "${machine.name}" machine. Use the following reference material to answer questions accurately. If you don't know something or it's not covered in the reference material, say so honestly.

Reference Material:
${context}

Important guidelines:
- Always prioritize safety information
- Be clear and concise
- If asked about something not covered in the material, suggest consulting the full manual or a supervisor
- Never give advice that could be dangerous`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: message },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service quota exceeded. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
