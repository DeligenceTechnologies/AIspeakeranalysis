import openai from "../../lib/openai";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST" });
    }

    const { transcriptText } = req.body || {};

    if (!transcriptText || typeof transcriptText !== "string") {
      return res.status(400).json({ error: "Missing transcriptText" });
    }

    const prompt = `
You are analyzing a speaker-labeled transcript.

Your job is to correctly understand the context of the conversation, whether it is:
- a legal discussion,
- a law firm discussion,
- an insurance discussion,
- an educational conversation,
- a podcast,
- an interview,
- a business meeting,
- or any other multi-speaker conversation.

You must ALWAYS return meaningful structured output even if no legal case is discussed.

Return STRICT JSON only in the following format:

{
  "conversation_type": "legal | educational | podcast | interview | meeting | general",
  "title": "short title",
  "main_topic": "one or two sentence description of what the conversation is about",
  "overall_summary": "a well-written summary of the whole conversation in 8-12 lines",
  "final_context_or_verdict": "the concluding message, final takeaway, final recommendation, or closing context of the conversation",
  "key_points": [
    "point 1",
    "point 2",
    "point 3"
  ],
  "speaker_highlights": [
    {
      "speaker": "Speaker A",
      "role_in_conversation": "host | guest | lawyer | narrator | participant | unknown",
      "summary": "what this speaker mainly contributed"
    }
  ],
  "cases_discussed": [
    {
      "case_title": "short case title",
      "case_summary": "summary of that case",
      "emphasis_points": [
        "point 1",
        "point 2"
      ],
      "final_verdict": "final conclusion / recommendation / outcome for that case",
      "speakers_involved": ["Speaker A", "Speaker B"],
      "notable_numbers": [
        {
          "label": "amount or date or duration",
          "value": "text value",
          "context": "why it matters"
        }
      ]
    }
  ]
}

Rules:
1. If the conversation is NOT legal or has NO case discussion, then return "cases_discussed": [].
2. Even if "cases_discussed" is empty, you MUST still provide:
   - conversation_type
   - title
   - main_topic
   - overall_summary
   - final_context_or_verdict
   - key_points
   - speaker_highlights
3. If the transcript includes examples, teaching points, or explanations, capture them properly.
4. If it is a legal discussion, extract each case separately and include a final verdict for each case if available.
5. Do not say "no output" or return an empty object.
6. Output valid JSON only. No markdown. No code fences.

Transcript:
${transcriptText}
`;

    const r = await openai.responses.create({
      model: "gpt-4o",
      input: prompt,
    });

    let text = r.output_text || "";

    // clean accidental markdown fences if present
    text = text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (parseErr) {
      return res.status(200).json({
        conversation_type: "general",
        title: "Transcript Analysis",
        main_topic: "Unable to strictly parse JSON response, but transcript was processed.",
        overall_summary: text,
        final_context_or_verdict: "The conversation was analyzed, but the structured JSON could not be parsed cleanly.",
        key_points: [],
        speaker_highlights: [],
        cases_discussed: []
      });
    }

    return res.status(200).json(json);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: "Analysis failed",
      detail: String(e?.message || e),
    });
  }
}