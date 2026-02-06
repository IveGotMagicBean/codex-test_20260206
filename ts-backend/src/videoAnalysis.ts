import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import Jimp from "jimp";

ffmpeg.setFfmpegPath(ffmpegPath as string);

export type AnalysisResult = {
  report_id: string;
  created_at: string;
  source_filename: string;
  total_frames: number;
  fps: number;
  duration_seconds: number;
  motion_events: number;
  motion_score_mean: number;
  motion_score_std: number;
};

const scoreMotion = async (prevPath: string, nextPath: string) => {
  const prevImage = await Jimp.read(prevPath);
  const nextImage = await Jimp.read(nextPath);
  const diff = Jimp.diff(prevImage, nextImage);
  return diff.percent * 255;
};

const countPeaks = (scores: number[], threshold: number) => {
  let count = 0;
  let armed = true;
  for (const score of scores) {
    if (armed && score >= threshold) {
      count += 1;
      armed = false;
    } else if (!armed && score < threshold * 0.7) {
      armed = true;
    }
  }
  return count;
};

const parseFps = (rate?: string) => {
  if (!rate) return 30;
  const [num, den] = rate.split("/").map(Number);
  if (!den || Number.isNaN(num) || Number.isNaN(den)) return 30;
  return num / den;
};

export const analyzeVideo = async (
  videoPath: string,
  reportPath: string,
): Promise<AnalysisResult> => {
  const metadata = await new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  const videoStream = metadata.streams.find((stream) => stream.codec_type === "video");
  const fps = parseFps(videoStream?.r_frame_rate);
  const durationSeconds = Number(videoStream?.duration || metadata.format.duration || 0);
  const totalFrames = Math.round(durationSeconds * fps);

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sports-motion-"));
  const framePattern = path.join(tempDir, "frame-%04d.jpg");
  const sampleFps = 2;

  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([`-vf fps=${sampleFps}`])
      .output(framePattern)
      .on("end", () => resolve())
      .on("error", (error) => reject(error))
      .run();
  });

  const frameFiles = (await fs.readdir(tempDir))
    .filter((name) => name.endsWith(".jpg"))
    .sort()
    .map((name) => path.join(tempDir, name));

  const scores: number[] = [];
  for (let index = 1; index < frameFiles.length; index += 1) {
    const score = await scoreMotion(frameFiles[index - 1], frameFiles[index]);
    scores.push(score);
  }

  await Promise.all(frameFiles.map((file) => fs.unlink(file)));
  await fs.rmdir(tempDir);

  if (!scores.length) scores.push(0);

  const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const variance =
    scores.reduce((sum, value) => sum + (value - mean) ** 2, 0) / scores.length;
  const std = Math.sqrt(variance);
  const threshold = mean + std * 1.2;

  const result: AnalysisResult = {
    report_id: path.basename(reportPath, ".json"),
    created_at: new Date().toISOString(),
    source_filename: path.basename(videoPath),
    total_frames: totalFrames,
    fps,
    duration_seconds: durationSeconds,
    motion_events: countPeaks(scores, threshold),
    motion_score_mean: mean,
    motion_score_std: std,
  };

  await fs.writeFile(reportPath, JSON.stringify(result, null, 2), "utf-8");
  return result;
};
