import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { machineName, manualContent, category, count = 30 } = await req.json();

    if (!machineName || !category) {
      return new Response(
        JSON.stringify({ error: 'machineName and category are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let prompt = '';
    
    if (category === 'safety') {
      prompt = `You are a safety expert for industrial equipment. Generate exactly ${count} safety check questions for a ${machineName}.

${manualContent ? `Based on this machine manual content:\n${manualContent}\n\n` : ''}

Focus on:
- "Warnings", "Cautions", and "Danger" zones
- Safety precautions before operation
- Pre-operation inspection items
- Personal protective equipment (PPE) requirements
- Emergency procedures awareness

For each question, determine whether the CORRECT answer is "YES" (meaning the condition is safe/present) or "NO" (meaning absence indicates safety).

IMPORTANT: Mix the correct answers! Some questions should have "YES" as correct, others should have "NO" as correct. This prevents workers from blindly clicking YES.

Examples of YES = correct: "Is the emergency stop button accessible?", "Are all safety guards in place?"
Examples of NO = correct: "Is there any visible damage to the hydraulic lines?", "Are there any unusual noises coming from the engine?"

Return a JSON array with this exact format:
[
  { "question": "Question text here?", "correct_answer": true, "order_index": 1 },
  { "question": "Question text here?", "correct_answer": false, "order_index": 2 }
]

Where correct_answer is true if "YES" is the safe answer, false if "NO" is the safe answer.
Only return the JSON array, no other text.`;
    } else {
      prompt = `You are a machine operation expert. Generate exactly ${count} usage/operation knowledge check questions for a ${machineName}.

${manualContent ? `Based on this machine manual content:\n${manualContent}\n\n` : ''}

Focus on:
- Operation procedures and steps
- How to use specific controls and features
- Proper usage instructions
- Loading and unloading procedures
- Maintenance indicators and warnings during operation

For each question, determine whether the CORRECT answer is "YES" or "NO".

IMPORTANT: Mix the correct answers! Some questions should have "YES" as correct, others should have "NO" as correct.

Examples of YES = correct: "Should you warm up the engine before full operation?", "Is it necessary to check fuel levels before starting?"
Examples of NO = correct: "Should you operate the machine on slopes exceeding 30 degrees?", "Is it safe to exceed the maximum load capacity?"

Return a JSON array with this exact format:
[
  { "question": "Question text here?", "correct_answer": true, "order_index": 1 },
  { "question": "Question text here?", "correct_answer": false, "order_index": 2 }
]

Where correct_answer is true if "YES" is the safe/correct answer, false if "NO" is the correct answer.
Only return the JSON array, no other text.`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON from the response
    let questions;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse questions from AI response');
    }

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating questions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
