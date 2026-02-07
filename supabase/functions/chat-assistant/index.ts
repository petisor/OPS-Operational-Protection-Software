import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Configuration missing (API Key or Supabase)");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: message },
    ];

    // Use Lovable AI API
    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 1024,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    // Stream the response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || "";
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch (e) {
                  // Skip malformed JSON
                }
              }
            }
          }
        } finally {
          controller.close();
        }
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
