import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pdf from "https://esm.sh/pdf-parse@1.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    return data.text || "";
  } catch (error) {
    console.error("Error parsing PDF:", error);
    return "";
  }
}

async function generateQAPairs(
  machineName: string,
  manualContent: string,
  apiKey: string
): Promise<Array<{ question: string; answer: string; category: string }>> {
  try {
    // Truncate content to avoid token limits
    const truncatedContent = manualContent.slice(0, 60000);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing machine manuals and creating educational Q&A pairs. Extract the most important information from the manual and create comprehensive question-answer pairs that cover:
- Safety procedures and warnings
- Operating instructions and startup/shutdown procedures
- Maintenance requirements
- Troubleshooting common issues
- Technical specifications
- Emergency procedures

Return a JSON array with objects containing: question, answer, and category (one of: safety, operation, maintenance, troubleshooting, specifications, emergency).
Return ONLY valid JSON, no markdown formatting.`,
          },
          {
            role: "user",
            content: `Analyze this manual for the "${machineName}" and generate 15-25 comprehensive Q&A pairs covering all important topics:

${truncatedContent}

Return a JSON array like: [{"question": "...", "answer": "...", "category": "..."}]`,
          },
        ],
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", await response.text());
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    
    const qaPairs = JSON.parse(jsonStr.trim());
    return Array.isArray(qaPairs) ? qaPairs : [];
  } catch (error) {
    console.error("Error generating Q&A pairs:", error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { manualId, machineId } = await req.json();

    if (!manualId || !machineId) {
      throw new Error("Missing required fields: manualId, machineId");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !supabaseUrl || !supabaseServiceKey) {
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

    // Step 1: Extract text from PDF
    const extractedContent = await extractPdfText(manual.file_url);
    
    if (!extractedContent) {
      throw new Error("Failed to extract text from PDF");
    }

    console.log(`Extracted ${extractedContent.length} characters from PDF`);

    // Step 2: Save extracted content to database
    await supabase
      .from("machine_manuals")
      .update({ extracted_content: extractedContent })
      .eq("id", manualId);

    // Step 3: Generate Q&A pairs using AI
    const qaPairs = await generateQAPairs(machineName, extractedContent, LOVABLE_API_KEY);
    
    console.log(`Generated ${qaPairs.length} Q&A pairs`);

    // Step 4: Delete old Q&A pairs for this manual and insert new ones
    await supabase.from("machine_manual_qa").delete().eq("manual_id", manualId);

    if (qaPairs.length > 0) {
      const qaRecords = qaPairs.map((qa) => ({
        machine_id: machineId,
        manual_id: manualId,
        question: qa.question,
        answer: qa.answer,
        category: qa.category || "general",
      }));

      await supabase.from("machine_manual_qa").insert(qaRecords);
    }

    return new Response(
      JSON.stringify({
        success: true,
        extractedLength: extractedContent.length,
        qaPairsGenerated: qaPairs.length,
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
