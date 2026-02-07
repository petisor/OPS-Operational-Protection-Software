import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pdf from "https://esm.sh/pdf-parse@1.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper to extract text from PDF
async function extractPdfText(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch PDF: ${response.status}`);
      return "";
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    const data = await pdf(buffer);
    // Limit to first 50000 chars to avoid token limits
    return data.text?.slice(0, 50000) || "";
  } catch (error) {
    console.error("Error parsing PDF:", error);
    return "";
  }
}

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

    // Fetch all machine data in parallel
    const [machineResult, instructionsResult, warningsResult, manualsResult] = await Promise.all([
      supabase
        .from("machines")
        .select("name, description, safety_warning, common_injury")
        .eq("id", machineId)
        .single(),
      supabase
        .from("machine_instructions")
        .select("step_number, title, content")
        .eq("machine_id", machineId)
        .order("step_number"),
      supabase
        .from("machine_warnings")
        .select("title, content, severity")
        .eq("machine_id", machineId)
        .eq("is_approved", true)
        .order("order_index"),
      supabase
        .from("machine_manuals")
        .select("file_name, file_url")
        .eq("machine_id", machineId),
    ]);

    const machine = machineResult.data;
    const instructions = instructionsResult.data;
    const warnings = warningsResult.data;
    const manuals = manualsResult.data;

    if (!machine) {
      throw new Error("Machine not found");
    }

    // Build context
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

    // Extract text from manuals (PDFs)
    if (manuals?.length) {
      context += "\n--- MACHINE MANUAL CONTENT ---\n\n";
      
      for (const manual of manuals) {
        if (manual.file_url) {
          console.log(`Processing manual: ${manual.file_name}`);
          const manualText = await extractPdfText(manual.file_url);
          if (manualText) {
            context += `Manual: ${manual.file_name}\n`;
            context += `${manualText}\n\n`;
          }
        }
      }
    }

    const systemPrompt = `You are a helpful assistant specialized in answering questions about the "${machine.name}" machine. Use the following reference material to answer questions accurately. The reference material includes the official machine manual, operating instructions, and safety warnings.

If you don't know something or it's not covered in the reference material, say so honestly.

Reference Material:
${context}

Important guidelines:
- Always prioritize safety information
- Be clear and concise
- Reference specific sections from the manual when applicable
- If asked about something not covered in the material, suggest consulting the full manual or a supervisor
- Never give advice that could be dangerous`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: message },
    ];

    // Use Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 2048,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Lovable AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    // Pass the SSE stream directly to the client
    return new Response(response.body, {
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
