import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { adminDb } from "@/lib/firebase/admin";
import { logError, logInfo } from "@/lib/server/log";

const OPENAI_MAX_BYTES = 25 * 1024 * 1024;
const RETRY_AFTER_MS = 10 * 60 * 1000;

export function sttProvider() {
  if (process.env.DEEPGRAM_API_KEY) return "deepgram";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

function s3Config() {
  const region = process.env.LIVEKIT_EGRESS_S3_REGION;
  const bucket = process.env.LIVEKIT_EGRESS_S3_BUCKET;
  const key = process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY;
  const secret = process.env.LIVEKIT_EGRESS_S3_SECRET;
  if (!region || !bucket || !key || !secret) return null;
  return { region, bucket, key, secret };
}

export function transcriptUrl(recording, publicHost) {
  if (!recording?.filepath || !publicHost) return null;
  return `${publicHost.replace(/\/$/, "")}/${recording.filepath.replace(/^\//, "")}`;
}

async function fetchAudio(recording) {
  const cfg = s3Config();
  if (!cfg || !recording.filepath) return null;
  const s3 = new S3Client({
    region: cfg.region,
    credentials: { accessKeyId: cfg.key, secretAccessKey: cfg.secret },
  });
  const out = await s3.send(
    new GetObjectCommand({ Bucket: cfg.bucket, Key: recording.filepath })
  );
  const chunks = [];
  for await (const chunk of out.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function transcribeDeepgram({ buffer, url }) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  const endpoint = "https://api.deepgram.com/v1/listen?smart_format=true&model=nova-2";
  let res;
  if (buffer) {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/octet-stream" },
      body: buffer,
    });
  } else if (url) {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } else {
    throw new Error("No audio source available for transcription");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.err_msg || "Deepgram transcription failed");
  return data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
}

async function transcribeOpenAI(buffer) {
  if (!buffer) throw new Error("No audio source available for transcription");
  if (buffer.length > OPENAI_MAX_BYTES) {
    throw new Error(
      `Recording too large for Whisper (limit ${OPENAI_MAX_BYTES / 1024 / 1024}MB). Use Deepgram or a shorter file.`
    );
  }
  const form = new FormData();
  form.append("file", new Blob([buffer]), "recording.mp4");
  form.append("model", "whisper-1");
  form.append("response_format", "text");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI transcription failed: ${res.status} ${err.slice(0, 200)}`);
  }
  return (await res.text()).trim();
}

export async function transcribeRecording(recording) {
  const provider = sttProvider();
  if (!provider) {
    logInfo("transcription.skipped", { recordingId: recording.id, reason: "no-provider" });
    return { ok: false, error: "No transcription provider configured (DEEPGRAM_API_KEY or OPENAI_API_KEY)" };
  }
  if (recording.transcriptionStatus === "complete") {
    return { ok: true, cached: true };
  }
  if (
    recording.transcriptionStatus === "processing" &&
    recording.transcribedAt &&
    Date.now() - recording.transcribedAt.toMillis() < RETRY_AFTER_MS
  ) {
    return { ok: true, cached: true };
  }

  const ref = adminDb().collection("recordings").doc(recording.id);
  await ref
    .update({ transcriptionStatus: "processing", transcribedAt: new Date() })
    .catch((err) => {
      logError("transcription.mark_processing_failed", { recordingId: recording.id, error: err.message });
    });

  try {
    let buffer = null;
    let url = null;
    if (s3Config()) {
      buffer = await fetchAudio(recording);
    }
    if (!buffer) {
      url = transcriptUrl(recording, process.env.LIVEKIT_EGRESS_S3_PUBLIC_URL) || recording.resultUrl || null;
    }

    const text = provider === "deepgram"
      ? await transcribeDeepgram({ buffer, url })
      : await transcribeOpenAI(buffer);

    await ref.update({
      transcriptionStatus: text ? "complete" : "failed",
      transcript: text || "",
      transcribedAt: new Date(),
    });
    logInfo("transcription.completed", { recordingId: recording.id, provider, chars: text.length });
    return { ok: true, chars: text.length };
  } catch (err) {
    await ref
      .update({ transcriptionStatus: "failed", transcript: "", transcribedAt: new Date() })
      .catch((err2) => {
        logError("transcription.mark_failed_failed", { recordingId: recording.id, error: err2.message });
      });
    logError("transcription.failed", { recordingId: recording.id, provider, error: err.message });
    return { ok: false, error: err.message };
  }
}
