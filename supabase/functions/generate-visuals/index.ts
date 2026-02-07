import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { machineId, machineName, instructions, userPrompt } = await req.json();

    if (!machineId || !machineName) {
      return new Response(
        JSON.stringify({ error: 'Machine ID and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context from instructions
    const instructionContext = instructions 
      ? instructions.map((i: { title: string; content: string }) => `${i.title}: ${i.content}`).join('\n')
      : '';

    // Generate prompt based on whether user provided a custom prompt
    const imagePrompt = userPrompt 
      ? `Create a clear, professional industrial safety illustration for ${machineName}. 
         User request: ${userPrompt}
         Context from machine manual: ${instructionContext}
         Style: Clean technical illustration, high contrast, easy to understand, safety-focused.`
      : `Create a clear, professional industrial safety illustration showing the ${machineName} machine.
         Context from machine manual: ${instructionContext}
         Show the machine in a clean, professional style with clear labeling of key parts.
         Style: Technical illustration, high contrast, industrial safety documentation style.`;

    // Call Lovable AI image generation
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: imagePrompt
          }
        ],
        modalities: ['image', 'text']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Extract image from response
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content || 'Visual generated successfully';

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'No image was generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        imageUrl,
        description: textResponse
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating visual:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
