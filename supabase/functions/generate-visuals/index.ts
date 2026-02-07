import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { machineId, machineName, instructions, userPrompt } = await req.json();

    if (!machineId || !machineName) {
      return new Response(JSON.stringify({ error: "Machine ID and name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AZERION_API_KEY = Deno.env.get("AZERION_API_KEY");
    if (!AZERION_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = new OpenAI({
      baseURL: "https://api.azerion.ai/v1",
      apiKey: AZERION_API_KEY,
    });

    const instructionContext = instructions
      ? instructions.map((i: { title: string; content: string }) => `${i.title}: ${i.content}`).join("\n")
      : "";

    const prompt = userPrompt
      ? `Based on these machine instructions: ${instructionContext}\n\nUser request: ${userPrompt}\n\nProvide a detailed technical description and safety analysis for the ${machineName}.`
      : `Provide a detailed technical overview and safety guidelines for the ${machineName} based on these instructions: ${instructionContext}`;

    const response = await client.chat.completions.create({
      model: "gemini-3-pro-preview",
      messages: [
        { role: "system", content: "You are a professional industrial safety assistant." },
        { role: "user", content: prompt },
      ],
      max_tokens: 1024,
      temperature: 0.7,
      stream: false,
    });

    const textResponse = response.choices[0].message.content;

    return new Response(
      JSON.stringify({
        description: textResponse,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error generating response:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
