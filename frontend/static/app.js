const analyzeButton = document.getElementById("analyzeButton");
const resultArea = document.getElementById("result");
const fileInput = document.getElementById("videoFile");
const baseUrlInput = document.getElementById("baseUrl");

const getBaseUrl = () => {
  const value = baseUrlInput.value.trim();
  if (!value) {
    return window.location.origin;
  }
  return value.replace(/\/$/, "");
};

const setResult = (payload) => {
  resultArea.textContent = JSON.stringify(payload, null, 2);
};

analyzeButton.addEventListener("click", async () => {
  if (!fileInput.files.length) {
    setResult({ error: "请先选择视频文件。" });
    return;
  }

  analyzeButton.disabled = true;
  resultArea.textContent = "正在上传并分析，请稍候…";

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  try {
    const response = await fetch(`${getBaseUrl()}/analyze`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text();
      setResult({ error: message || "分析失败" });
      return;
    }

    const data = await response.json();
    setResult(data);
  } catch (error) {
    setResult({ error: error.message || "无法连接后端" });
  } finally {
    analyzeButton.disabled = false;
  }
});
