import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const AZERION_API_KEY = Deno.env.get("AZERION_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!AZERION_API_KEY || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Configuration missing (API Key or Supabase)");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const client = new OpenAI({
      baseURL: "https://api.azerion.ai/v1",
      apiKey: AZERION_API_KEY,
    });

    const { data: machine } = await supabase
      .from("machines")
      .select("name, description, safety_warning, common_injury")
      .eq("id", machineId)
      .single();

    if (!machine) {
      throw new Error("Machine not found");
    }

    const { data: instructions } = await supabase
      .from("machine_instructions")
      .select("step_number, title, content")
      .eq("machine_id", machineId)
      .order("step_number");

    const { data: warnings } = await supabase
      .from("machine_warnings")
      .select("title, content, severity")
      .eq("machine_id", machineId)
      .eq("is_approved", true)
      .order("order_index");

    let context = `Machine: ${machine.name}\n`;
    if (machine.description) context += `Description: ${machine.description}\n`;
    context += `Safety Warning: ${machine.safety_warning}\n`;
    context += `Common Injury: ${machine.common_injury}\n\n`;

    if (instructions?.length) {
      context += "Operating Instructions:\n";
      instructions.forEach((inst) => {
        context += `Step ${inst.step_number}: ${inst.title}\n${inst.content}\n\n`;
      });
    }

    if (warnings?.length) {
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

    const response = await client.chat.completions.create({
      model: "gemini-3-pro-preview",
      messages: [
        { role: "system", content: systemPrompt },
        ...(conversationHistory || []),
        { role: "user", content: message },
      ],
      max_tokens: 1024,
      temperature: 0.7,
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
