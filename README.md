# Discord Bot

## NVIDIA NIM / GPT-OSS 20B + 聯網搜尋

在 `.env` 設定以下環境變數：

```dotenv
NVIDIA_API_KEY=your_nvidia_api_key
TAVILY_API_KEY=your_tavily_api_key
```

啟動 bot 後，在 Discord 訊息中提及 bot 並附上問題，即會透過 NVIDIA NIM 的 GPT-OSS 20B 產生串流回覆。遇到最新資訊、時效性內容或明確要求搜尋時，模型若知道官方來源就直接讀取該 HTTPS 網頁或 API；不知道來源時才呼叫 Tavily 搜尋，答案會附上來源連結。

`TAVILY_API_KEY` 未設定時，一般問答仍可使用，但聯網搜尋會回報未設定，不會假裝已搜尋。可在 [Tavily](https://app.tavily.com/) 申請免費 API key。

可選設定：

```dotenv
# 預設：openai/gpt-oss-20b
NVIDIA_NIM_MODEL=openai/gpt-oss-20b

# 預設：1024
NVIDIA_NIM_MAX_TOKENS=1024

# 串流請求逾時毫秒數，預設：180000
NVIDIA_NIM_TIMEOUT_MS=180000

# 搜尋逾時毫秒數，預設：20000
WEB_SEARCH_TIMEOUT_MS=20000

# 直接讀取官方網頁/API 的逾時與大小限制
DIRECT_FETCH_TIMEOUT_MS=15000
DIRECT_FETCH_MAX_BYTES=1000000

# 搜尋模式：auto、always、off；預設：auto
WEB_SEARCH_MODE=auto

# Tavily 搜尋速度／品質：ultra-fast、fast、basic、advanced；預設：fast
TAVILY_SEARCH_DEPTH=fast

# 每次搜尋結果數，預設：5，最大：10
TAVILY_MAX_RESULTS=5

# 一次回答最多搜尋輪數，預設：2，最大：5
NVIDIA_NIM_MAX_TOOL_ROUNDS=2

# Kimi K3 推理強度：low、high、max；預設：low（最快）
NVIDIA_NIM_REASONING_EFFORT=low

# 自訂 system prompt
NVIDIA_NIM_SYSTEM_PROMPT=You are a helpful Discord assistant.

# 若使用自行部署的 NIM，可覆寫 API URL
NVIDIA_NIM_URL=https://integrate.api.nvidia.com/v1/chat/completions
```
