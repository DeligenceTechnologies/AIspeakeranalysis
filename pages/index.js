import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [speakers, setSpeakers] = useState(null);
  const [fullText, setFullText] = useState("");
  const [cases, setCases] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [rawAnalysis, setRawAnalysis] = useState(null);
  const [error, setError] = useState("");

  async function onUpload() {
    try {
      setError("");
      setLoading(true);
      setSpeakers(null);
      setCases(null);
      setAnalysis(null);
      setRawAnalysis(null);
      setFullText("");

      if (!file) throw new Error("Please select an audio file.");

      // 1) Transcribe + diarize
      const form = new FormData();
      form.append("audio", file);

      const tRes = await fetch("/api/transcribe", { method: "POST", body: form });
      const tJson = await tRes.json();
      if (!tRes.ok) throw new Error(tJson.error || "Transcribe failed");

      setSpeakers(tJson.speakers);
      setFullText(tJson.fullText);

      // 2) Analyze conversation / cases
      const aRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptText: tJson.fullText }),
      });

      const aJson = await aRes.json();
      if (!aRes.ok) throw new Error(aJson.error || "Analyze failed");

      setAnalysis(aJson);
      setCases(aJson.cases_discussed || []);

      if (!aJson || typeof aJson !== "object") {
        setRawAnalysis(aJson);
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "ui-sans-serif", padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>
          Law Firm Audio → Speakers, Dialogues, Case Summaries
        </h1>
      </div>

      <div style={{ marginTop: 14, padding: 14, border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ padding: 8, border: "1px solid #e5e7eb", borderRadius: 10 }}
          />

          <button
            onClick={onUpload}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: loading ? "#9ca3af" : "#111827",
              color: "white",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Processing..." : "Upload & Process"}
          </button>
        </div>

        {error ? (
          <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 700 }}>{error}</div>
        ) : null}

        <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
          Tip: Keep files under ~25MB (or compress to mp3).
        </div>
      </div>

      {analysis ? (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
            Conversation Analysis
          </h2>

          <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>
              {analysis.title || "Conversation Summary"}
            </div>

            <div style={{ marginTop: 6, color: "#374151", fontSize: 14 }}>
              <b>Type:</b> {analysis.conversation_type || "general"}
            </div>

            <div style={{ marginTop: 10 }}>
              <b>Main Topic:</b>
              <div style={{ marginTop: 4, lineHeight: 1.5 }}>
                {analysis.main_topic || "Not available"}
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <b>Overall Summary:</b>
              <div style={{ marginTop: 4, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {analysis.overall_summary || "Not available"}
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <b>Final Context / Verdict:</b>
              <div style={{ marginTop: 4, lineHeight: 1.5 }}>
                {analysis.final_context_or_verdict || "Not available"}
              </div>
            </div>

            {analysis.key_points?.length ? (
              <div style={{ marginTop: 10 }}>
                <b>Key Points:</b>
                <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                  {analysis.key_points.map((point, idx) => (
                    <li key={idx} style={{ marginBottom: 6 }}>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {analysis.speaker_highlights?.length ? (
              <div style={{ marginTop: 10 }}>
                <b>Speaker Highlights:</b>
                <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                  {analysis.speaker_highlights.map((sp, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 10,
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        background: "#fafafa",
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>
                        {sp.speaker} {sp.role_in_conversation ? `(${sp.role_in_conversation})` : ""}
                      </div>
                      <div style={{ marginTop: 4, lineHeight: 1.5 }}>
                        {sp.summary}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {cases && cases.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
            Detected Case Summaries
          </h2>
          <div style={{ display: "grid", gap: 12 }}>
            {cases.map((c, idx) => (
              <div key={idx} style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>
                  Case {idx + 1}: {c.case_title || "Untitled"}
                </div>

                <div style={{ marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
                  {c.case_summary}
                </div>

                {c.emphasis_points?.length ? (
                  <>
                    <div style={{ marginTop: 10, fontWeight: 800 }}>Emphasis points</div>
                    <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                      {c.emphasis_points.map((p, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>{p}</li>
                      ))}
                    </ul>
                  </>
                ) : null}

                {c.final_verdict ? (
                  <div style={{ marginTop: 10 }}>
                    <b>Final Verdict:</b>
                    <div style={{ marginTop: 4, lineHeight: 1.5 }}>{c.final_verdict}</div>
                  </div>
                ) : null}

                <div style={{ marginTop: 10, color: "#374151", fontSize: 13 }}>
                  <b>Speakers involved:</b> {(c.speakers_involved || []).join(", ")}
                </div>

                {c.notable_numbers?.length ? (
                  <div style={{ marginTop: 10 }}>
                    <b>Notable Numbers:</b>
                    <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                      {c.notable_numbers.map((n, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          <b>{n.label}:</b> {n.value} {n.context ? `— ${n.context}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {speakers ? (
        <div style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
            Speakers & Dialogues
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            {Object.keys(speakers).map((spk) => (
              <div key={spk} style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>{spk}</div>
                <div style={{ maxHeight: 280, overflow: "auto", lineHeight: 1.4 }}>
                  {speakers[spk].map((u, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ color: "#6b7280", fontSize: 12 }}>
                        {u.start != null && u.end != null ? `(${u.start} → ${u.end})` : ""}
                      </div>
                      <div>{u.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>
              Show full diarized transcript text
            </summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                padding: 12,
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                marginTop: 8,
              }}
            >
              {fullText}
            </pre>
          </details>
        </div>
      ) : null}

      {rawAnalysis ? (
        <div style={{ marginTop: 16, padding: 14, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <div style={{ fontWeight: 900 }}>Analysis output (raw)</div>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>
            {JSON.stringify(rawAnalysis, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}