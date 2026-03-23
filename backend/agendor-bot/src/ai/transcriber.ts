import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { config } from "../config";
import { logger } from "../utils/logger";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export async function transcribeAudio(audioBuffer: Buffer): Promise<string | null> {
  const tempPath = path.join(os.tmpdir(), `agendor-audio-${Date.now()}.ogg`);

  try {
    fs.writeFileSync(tempPath, audioBuffer);

    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: fs.createReadStream(tempPath),
      language: "pt",
      response_format: "text",
    });

    const text = (transcription as unknown as string).trim();
    logger.info(`[Whisper] Transcrição: ${text}`);
    return text || null;
  } catch (err) {
    logger.error(err, "[Whisper] Erro na transcrição de áudio");
    return null;
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}
