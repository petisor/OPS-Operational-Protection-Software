import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { manualId, machineId } = await req.json();

    if (!manualId || !machineId) {
      throw new Error("Missing required fields: manualId, machineId");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get manual and machine info
    const [manualResult, machineResult] = await Promise.all([
      supabase.from("machine_manuals").select("*").eq("id", manualId).single(),
      supabase.from("machines").select("name").eq("id", machineId).single(),
    ]);

    if (!manualResult.data || !machineResult.data) {
      throw new Error("Manual or machine not found");
    }

    const manual = manualResult.data;
    const machineName = machineResult.data.name;

    console.log(`Processing manual: ${manual.file_name} for ${machineName}`);

    // Get public URL for the PDF - Gemini will fetch it directly
    const { data: urlData } = supabase.storage
      .from("machine-manuals")
      .getPublicUrl(manual.file_url);
    
    const publicUrl = urlData.publicUrl;
    console.log(`Using public URL for AI processing: ${publicUrl}`);

    // Use Gemini to extract content AND generate Q&A in a single call to minimize memory usage
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: `You are an expert at analyzing machine operation manuals for the "${machineName}" machine.

Fetch and analyze this PDF manual: ${publicUrl}

Generate a comprehensive analysis with:
1. A summary of the manual's key content (500-1000 words)
2. 15-25 Q&A pairs covering critical topics

Categories for Q&A (use exactly these):
- safety: PPE, warnings, hazards, emergency procedures
- operation: startup, shutdown, controls, procedures
- maintenance: regular tasks, schedules, inspections
- troubleshooting: common problems and solutions
- specifications: technical limits, measurements

IMPORTANT: Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "summary": "Comprehensive summary of the manual...",
  "qa_pairs": [
    {"question": "What PPE is required?", "answer": "...", "category": "safety"},
    {"question": "How do you start the machine?", "answer": "...", "category": "operation"}
  ]
}`,
          },
        ],
        max_tokens: 8000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI processing error:", errorText);
      throw new Error("Failed to process manual with AI");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Clean markdown formatting
    content = content.trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error("JSON parse error. Content preview:", content.substring(0, 500));
      throw new Error("Failed to parse AI response");
    }

    const { summary, qa_pairs } = parsed;

    if (!summary || !qa_pairs || !Array.isArray(qa_pairs)) {
      throw new Error("Invalid response structure");
    }

    console.log(`Extracted summary (${summary.length} chars) and ${qa_pairs.length} Q&A pairs`);

    // Save extracted content
    await supabase
      .from("machine_manuals")
      .update({ extracted_content: summary })
      .eq("id", manualId);

    // Delete old Q&A pairs and insert new ones
    await supabase.from("machine_manual_qa").delete().eq("manual_id", manualId);

    if (qa_pairs.length > 0) {
      const validCategories = ["safety", "operation", "maintenance", "troubleshooting", "specifications", "emergency", "general"];
      const qaRecords = qa_pairs
        .map((qa: { question: string; answer: string; category?: string }) => ({
          machine_id: machineId,
          manual_id: manualId,
          question: qa.question || "",
          answer: qa.answer || "",
          category: validCategories.includes(qa.category?.toLowerCase() || "") 
            ? qa.category!.toLowerCase() 
            : "general",
        }))
        .filter((qa) => qa.question && qa.answer);

      if (qaRecords.length > 0) {
        await supabase.from("machine_manual_qa").insert(qaRecords);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summaryLength: summary.length,
        qaPairsGenerated: qa_pairs.length,
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
