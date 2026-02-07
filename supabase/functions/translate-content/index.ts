import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  nl: "Dutch",
  ro: "Romanian",
  es: "Spanish",
  de: "German",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, texts, targetLanguage } = await req.json();

    if (!targetLanguage || targetLanguage === "en") {
      // No translation needed
      if (texts) {
        return new Response(
          JSON.stringify({ translatedTexts: texts }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ translatedText: text }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetLangName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Handle batch translation
    if (texts && Array.isArray(texts)) {
      const combinedText = texts.map((t, i) => `[${i}] ${t}`).join("\n---SEPARATOR---\n");
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a professional translator for industrial safety content. Translate the following texts to ${targetLangName}. 
              
IMPORTANT RULES:
- Maintain the exact same formatting (line breaks, bullet points, etc.)
- Keep technical terms accurate for safety contexts
- Preserve the numbered markers like [0], [1], etc. at the start of each section
- Keep the ---SEPARATOR--- markers between sections
- Translate naturally while being precise about safety information
- Do not add any explanations, just provide the translation`,
            },
            {
              role: "user",
              content: combinedText,
            },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Translation API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const translatedCombined = data.choices[0]?.message?.content || combinedText;
      
      // Parse the translated text back into array
      const translatedTexts = translatedCombined
        .split("---SEPARATOR---")
        .map((part: string) => {
          // Remove the [n] prefix
          return part.trim().replace(/^\[\d+\]\s*/, "");
        });

      // Ensure we have the same number of translations
      while (translatedTexts.length < texts.length) {
        translatedTexts.push(texts[translatedTexts.length]);
      }

      return new Response(
        JSON.stringify({ translatedTexts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle single text translation
    if (!text) {
      return new Response(
        JSON.stringify({ translatedText: "" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a professional translator for industrial safety content. Translate the following text to ${targetLangName}. 
            
IMPORTANT RULES:
- Maintain the exact same formatting (line breaks, bullet points, etc.)
- Keep technical terms accurate for safety contexts
- Translate naturally while being precise about safety information
- Do not add any explanations, just provide the translation`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Translation API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const translatedText = data.choices[0]?.message?.content || text;

    return new Response(
      JSON.stringify({ translatedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
