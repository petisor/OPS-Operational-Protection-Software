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

    // Fetch all machine data in parallel
    const [machineResult, instructionsResult, warningsResult, manualsResult, qaResult] = await Promise.all([
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
        .select("file_name, extracted_content")
        .eq("machine_id", machineId),
      supabase
        .from("machine_manual_qa")
        .select("question, answer, category")
        .eq("machine_id", machineId),
    ]);

    const machine = machineResult.data;
    const instructions = instructionsResult.data;
    const warnings = warningsResult.data;
    const manuals = manualsResult.data;
    const qaPairs = qaResult.data;

    if (!machine) {
      throw new Error("Machine not found");
    }

    // Build comprehensive context
    let context = `# Machine Information\n`;
    context += `Name: ${machine.name}\n`;
    if (machine.description) context += `Description: ${machine.description}\n`;
    context += `Safety Warning: ${machine.safety_warning}\n`;
    context += `Common Injury Risk: ${machine.common_injury}\n\n`;

    // Add operating instructions
    if (instructions?.length) {
      context += `# Operating Instructions\n`;
      instructions.forEach((inst) => {
        context += `## Step ${inst.step_number}: ${inst.title}\n${inst.content}\n\n`;
      });
    }

    // Add safety warnings
    if (warnings?.length) {
      context += `# Safety Warnings\n`;
      warnings.forEach((warn) => {
        context += `## [${warn.severity.toUpperCase()}] ${warn.title}\n${warn.content}\n\n`;
      });
    }

    // Add Q&A pairs from manual (most important for answering questions)
    if (qaPairs?.length) {
      context += `# Frequently Asked Questions (from Official Manual)\n`;
      
      // Group by category
      const categories = [...new Set(qaPairs.map(q => q.category))];
      categories.forEach(category => {
        context += `\n## ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
        qaPairs
          .filter(q => q.category === category)
          .forEach(qa => {
            context += `\n**Q: ${qa.question}**\nA: ${qa.answer}\n`;
          });
      });
      context += "\n";
    }

    // Add manual content (truncated to avoid token limits)
    if (manuals?.length) {
      const manualContent = manuals
        .filter(m => m.extracted_content)
        .map(m => m.extracted_content)
        .join("\n\n");
      
      if (manualContent) {
        // Limit manual content to leave room for other context
        const truncatedManual = manualContent.slice(0, 40000);
        context += `# Full Manual Content\n${truncatedManual}\n`;
      }
    }

    const systemPrompt = `You are an expert assistant for the "${machine.name}" machine. You have been trained on the official machine manual and have comprehensive knowledge about this equipment.

Your knowledge base includes:
- Complete operating instructions
- Safety procedures and warnings
- Maintenance requirements
- Troubleshooting guides
- Technical specifications
- Emergency procedures

IMPORTANT GUIDELINES:
1. Always prioritize safety - if there's any safety concern, mention it prominently
2. Give specific, actionable answers based on the manual content
3. Reference specific sections or steps when applicable
4. If asked about something not in your knowledge base, clearly state that and recommend consulting a supervisor or the physical manual
5. Never guess or provide potentially dangerous advice
6. Be concise but thorough

REFERENCE MATERIAL:
${context}`;

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
        temperature: 0.5,
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
