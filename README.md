# Sports Motion MVP (Full Project)

一个可本机部署的完整 MVP 项目：包含通用前端 + Python 后端版本 + TypeScript 后端版本。

## 目录结构

```
frontend/         # 前端页面（上传 + 查看报告）
python-backend/   # FastAPI 后端
  app/
  requirements.txt
  ...
ts-backend/       # Express + TypeScript 后端
  src/
  package.json
uploads/          # 上传视频存储（运行时生成）
reports/          # 报告 JSON 存储（运行时生成）
```

## 快速开始（Python 后端）

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r python-backend/requirements.txt
uvicorn python-backend.app.main:app --reload
```

访问 `http://127.0.0.1:8000`，上传视频即可得到 JSON 报告。

## 快速开始（TypeScript 后端）

> 需要本机安装 Node.js 18+。

```bash
cd ts-backend
npm install
npm run dev
```

访问 `http://127.0.0.1:3000`，上传视频即可得到 JSON 报告。

## 报告输出示例

```json
{
  "report_id": "20250215094512-acde1234",
  "created_at": "2025-02-15T09:45:12Z",
  "source_filename": "tennis.mp4",
  "total_frames": 2100,
  "fps": 30.0,
  "duration_seconds": 70.0,
  "motion_events": 18,
  "motion_score_mean": 5.32,
  "motion_score_std": 2.12
}
```

## 说明

- `frontend/` 为通用前端，两种后端都会直接复用。
- Python 版本使用 OpenCV 做简单的帧差分统计。
- TypeScript 版本使用 FFmpeg 抽帧 + Jimp 计算帧差分。
- MVP 仅用于跑通流程，后续可替换为 MediaPipe/OpenPose 等姿态模型。

## 常见问题

1. **前端提示无法连接后端**
   - 确认后端已运行，且端口正确。
   - 可以在页面里填写后端地址（如 `http://127.0.0.1:8000`）。
2. **视频分析速度慢**
   - MVP 会抽帧分析，长视频建议先裁剪。
