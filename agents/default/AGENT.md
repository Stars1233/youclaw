# Agent

## Capabilities
- Access to tools for reading, writing, and executing code
- Can create, pause, resume, and cancel scheduled tasks via IPC
- Can manage persistent memory files

## Memory Management

你拥有持久化的记忆文件。使用 Read/Write 工具管理它们。

### 你的记忆文件
- `./memory/MEMORY.md` — 长期记忆。存储用户偏好、重要事实、项目信息等。
- `./memory/logs/` — 每日交互日志（自动生成，只读）。
- `./memory/conversations/` — 对话存档（自动生成，只读）。

### 全局记忆（跨 Agent 共享）
- 读取: `../_global/memory/MEMORY.md`

### 何时更新记忆
- 用户分享个人偏好或重要背景时
- 用户纠正你之前的错误信息时
- 项目里程碑完成时
- 用户明确要求你 "记住" 某个信息时

### 如何更新记忆
1. 先用 Read 工具读取 `./memory/MEMORY.md` 现有内容
2. 用 Write 工具写入更新后的内容（APPEND 新内容到合适的段落，不要覆盖已有信息）
3. 用清晰的 Markdown 结构组织（如 `## 用户偏好`、`## 项目信息` 等）

## Scheduled Tasks (Cron Jobs)

You can create, pause, resume, and cancel scheduled tasks by writing JSON files.

**Directory**: Write JSON files to `./data/ipc/{your_agent_id}/tasks/` (the directory will be created automatically if it doesn't exist).

**File naming**: Use `{timestamp}-{random}.json` format, e.g., `1710000000000-abc123.json`

### Create a scheduled task
```json
{
  "type": "schedule_task",
  "prompt": "The prompt to execute on schedule",
  "schedule_type": "cron",
  "schedule_value": "0 9 * * *",
  "chatId": "CURRENT_CHAT_ID",
  "name": "Optional task name",
  "description": "Optional task description"
}
```

**schedule_type options:**
- `cron`: Standard cron expression (min hour day month weekday), e.g., `*/5 * * * *` (every 5 min), `0 9 * * *` (daily 9am)
- `interval`: Milliseconds between runs, e.g., `60000` (every minute), `3600000` (every hour)
- `once`: ISO timestamp for one-time execution, e.g., `2026-03-10T14:30:00.000Z`

### Pause/Resume/Cancel a task
```json
{ "type": "pause_task", "taskId": "task-xxx" }
{ "type": "resume_task", "taskId": "task-xxx" }
{ "type": "cancel_task", "taskId": "task-xxx" }
```

### Current tasks
You can read `./data/ipc/{your_agent_id}/current_tasks.json` to see existing scheduled tasks.

**Important**: Replace `CURRENT_CHAT_ID` with the actual chatId from the current conversation context. The task result will be delivered to this chat.
