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

    // Download the PDF
    const pdfResponse = await fetch(manual.file_url);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.status}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    console.log(`Downloaded PDF, size: ${pdfBuffer.byteLength} bytes`);

    // Use Gemini to extract text content from the PDF
    const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a document processor. Extract ALL text content from this PDF document for the "${machineName}" machine. 
Include:
- All instructions, procedures, and steps
- Safety warnings and precautions
- Maintenance requirements
- Technical specifications
- Troubleshooting information

Output the extracted text in a clean, readable format. Preserve section headers and structure.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 16000,
        temperature: 0.1,
      }),
    });

    if (!extractResponse.ok) {
      const errorText = await extractResponse.text();
      console.error("AI extraction error:", errorText);
      throw new Error("Failed to extract text from PDF");
    }

    const extractData = await extractResponse.json();
    const extractedContent = extractData.choices?.[0]?.message?.content || "";

    console.log(`Extracted ${extractedContent.length} characters from PDF`);

    if (!extractedContent || extractedContent.length < 100) {
      throw new Error("Failed to extract meaningful content from PDF");
    }

    // Save extracted content to database
    await supabase
      .from("machine_manuals")
      .update({ extracted_content: extractedContent })
      .eq("id", manualId);

    // Generate Q&A pairs using AI
    const qaResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing machine manuals and creating educational Q&A pairs. Create comprehensive question-answer pairs that cover all important topics from the manual.

Return ONLY a valid JSON array with objects containing: question, answer, and category.
Categories must be one of: safety, operation, maintenance, troubleshooting, specifications, emergency
Do not include any markdown formatting or code blocks, just the raw JSON array.`,
          },
          {
            role: "user",
            content: `Analyze this manual content for the "${machineName}" and generate 15-25 comprehensive Q&A pairs covering:
- Safety procedures and warnings (MOST IMPORTANT)
- Operating instructions and startup/shutdown procedures
- Maintenance requirements
- Troubleshooting common issues
- Technical specifications
- Emergency procedures

Manual Content:
${extractedContent.slice(0, 50000)}

Return a JSON array like: [{"question": "...", "answer": "...", "category": "..."}]`,
          },
        ],
        max_tokens: 8000,
        temperature: 0.3,
      }),
    });

    if (!qaResponse.ok) {
      console.error("AI Q&A generation error:", await qaResponse.text());
      // Still save the extracted content even if Q&A fails
      return new Response(
        JSON.stringify({
          success: true,
          extractedLength: extractedContent.length,
          qaPairsGenerated: 0,
          message: "Content extracted but Q&A generation failed",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const qaData = await qaResponse.json();
    let qaContent = qaData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle markdown code blocks)
    qaContent = qaContent.trim();
    if (qaContent.startsWith("```json")) {
      qaContent = qaContent.slice(7);
    }
    if (qaContent.startsWith("```")) {
      qaContent = qaContent.slice(3);
    }
    if (qaContent.endsWith("```")) {
      qaContent = qaContent.slice(0, -3);
    }

    let qaPairs: Array<{ question: string; answer: string; category: string }> = [];
    try {
      qaPairs = JSON.parse(qaContent.trim());
      if (!Array.isArray(qaPairs)) {
        qaPairs = [];
      }
    } catch (parseError) {
      console.error("Failed to parse Q&A JSON:", parseError);
      qaPairs = [];
    }

    console.log(`Generated ${qaPairs.length} Q&A pairs`);

    // Delete old Q&A pairs for this manual and insert new ones
    await supabase.from("machine_manual_qa").delete().eq("manual_id", manualId);

    if (qaPairs.length > 0) {
      const validCategories = ["safety", "operation", "maintenance", "troubleshooting", "specifications", "emergency", "general"];
      const qaRecords = qaPairs.map((qa) => ({
        machine_id: machineId,
        manual_id: manualId,
        question: qa.question || "",
        answer: qa.answer || "",
        category: validCategories.includes(qa.category?.toLowerCase()) ? qa.category.toLowerCase() : "general",
      })).filter(qa => qa.question && qa.answer);

      if (qaRecords.length > 0) {
        await supabase.from("machine_manual_qa").insert(qaRecords);
      }
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
