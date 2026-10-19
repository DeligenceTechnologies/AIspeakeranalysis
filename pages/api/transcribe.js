import fs from "fs";
import multiparty from "multiparty";
import openai from "../../lib/openai";
import { groupBySpeaker } from "../../lib/formatTranscript";

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const form = new multiparty.Form({
      maxFilesSize: 25 * 1024 * 1024,
    });

    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST" });
    }

    const { files } = await parseMultipart(req);
    const audioArr = files?.audio;
    const audioFile = Array.isArray(audioArr) ? audioArr[0] : null;

    if (!audioFile?.path) {
      return res
        .status(400)
        .json({ error: "No audio file uploaded. Field name must be 'audio'." });
    }

    const stream = fs.createReadStream(audioFile.path);

    const diarized = await openai.audio.transcriptions.create({
      file: stream,
      model: "gpt-4o-transcribe-diarize",
      response_format: "diarized_json",
      chunking_strategy: "auto",
    });

    const { speakers, fullText } = groupBySpeaker(diarized);

    return res.status(200).json({
      diarized,
      speakers,
      fullText,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: "Transcription failed",
      detail: String(e?.message || e),
    });
  }
}