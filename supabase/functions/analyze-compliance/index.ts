import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SYSTEM_PROMPT = `You are an occupational safety compliance reviewer. Compare a safety procedure against the provided OSHA requirements. Be practical and actionable. Do not invent rules beyond what is provided. Return JSON only.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { procedureText, rulesBlock, strictMode, moduleName } = await req.json();

    if (!procedureText || typeof procedureText !== "string") {
      return new Response(
        JSON.stringify({ error: "procedureText is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userPrompt = `Module: ${moduleName}
${strictMode ? "STRICT MODE: Aggressively flag vague language, missing specifics, and ambiguous wording.\n" : ""}
=== OSHA REQUIREMENTS / RULES ===
${rulesBlock}

=== PROCEDURE TEXT TO REVIEW ===
${procedureText}

Compare the procedure against the rules. For each issue, quote a short, exact substring from the procedure as "evidence" (or "Not found" if the requirement is absent).`;

    const tools = [
      {
        type: "function",
        function: {
          name: "submit_compliance_report",
          description: "Submit the structured compliance review.",
          parameters: {
            type: "object",
            properties: {
              overall_status: { type: "string", enum: ["Compliant", "Partially Compliant", "Non-Compliant"] },
              summary: { type: "string", description: "2-4 sentences" },
              issues: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    severity: { type: "string", enum: ["High", "Medium", "Low"] },
                    why_it_matters: { type: "string" },
                    recommendation: { type: "string" },
                    evidence: { type: "string" },
                  },
                  required: ["title", "severity", "why_it_matters", "recommendation", "evidence"],
                  additionalProperties: false,
                },
              },
              strengths: { type: "array", items: { type: "string" } },
              rules_considered: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                  },
                  required: ["id", "title"],
                  additionalProperties: false,
                },
              },
            },
            required: ["overall_status", "summary", "issues", "strengths", "rules_considered"],
            additionalProperties: false,
          },
        },
      },
    ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "submit_compliance_report" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await resp.text();
      console.error("AI gateway error:", resp.status, text);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call returned", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Model did not return a structured response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const report = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-compliance error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
