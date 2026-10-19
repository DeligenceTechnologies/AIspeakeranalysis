export function groupBySpeaker(diarized) {
  const speakers = {};
  const segments = diarized?.segments || [];

  for (const seg of segments) {
    const speaker = seg.speaker ? `Speaker ${seg.speaker}` : "Speaker ?";
    const text = (seg.text || "").trim();
    const start = seg.start ?? null;
    const end = seg.end ?? null;

    if (!text) continue;

    if (!speakers[speaker]) speakers[speaker] = [];
    speakers[speaker].push({ start, end, text });
  }

  const fullText = segments
    .filter((seg) => seg.text)
    .map((seg) => `[Speaker ${seg.speaker}] ${seg.text}`)
    .join("\n");

  return { speakers, fullText };
}