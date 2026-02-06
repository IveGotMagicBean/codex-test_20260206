import path from "node:path";
import fs from "node:fs/promises";

import express from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

import { analyzeVideo } from "./videoAnalysis";

const baseDir = path.resolve(__dirname, "..", "..");
const uploadDir = path.join(baseDir, "uploads");
const reportDir = path.join(baseDir, "reports");
const frontendDir = path.join(baseDir, "frontend");
const staticDir = path.join(frontendDir, "static");

await fs.mkdir(uploadDir, { recursive: true });
await fs.mkdir(reportDir, { recursive: true });

const app = express();
const upload = multer({ dest: uploadDir });

app.use("/static", express.static(staticDir));

app.get("/", (_req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "missing file" });
      return;
    }

    const reportId = `${Date.now()}-${uuidv4().slice(0, 8)}`;
    const reportPath = path.join(reportDir, `${reportId}.json`);

    const result = await analyzeVideo(req.file.path, reportPath);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get("/reports/:reportId", async (req, res) => {
  const reportPath = path.join(reportDir, `${req.params.reportId}.json`);
  try {
    const data = await fs.readFile(reportPath, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(404).json({ error: "report not found" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`TS backend listening on http://127.0.0.1:${port}`);
});
