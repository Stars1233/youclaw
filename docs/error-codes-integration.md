# 后端错误码集成文档

## 概述

YouClaw 前端已支持结构化错误码识别机制。当后端（自有 AI 接口代理层）返回特定错误时，前端会根据 `errorCode` 字段展示不同的 UI 反馈（如积分不足弹窗）。

---

## 错误码枚举

| 错误码 | 含义 | 前端行为 |
|--------|------|----------|
| `INSUFFICIENT_CREDITS` | 用户积分/余额不足 | 弹出充值弹窗，点击跳转官网支付页 |
| `AUTH_FAILED` | API 认证失败（Key 无效/过期） | 显示错误消息 |
| `MODEL_CONNECTION_FAILED` | 模型服务连接失败 | 显示错误消息 |
| `NETWORK_ERROR` | 网络不可达 | 显示错误消息 |
| `RATE_LIMITED` | 请求频率超限 | 显示错误消息 |
| `UNKNOWN` | 未分类错误 | 显示原始错误消息 |

---

## 后端 API 接口要求

### 场景：AI 接口代理层返回积分不足

当自有 AI 接口检测到用户积分不足时，应返回包含以下关键词之一的错误信息：

```
insufficient / credit / balance / quota
```

YouClaw 后端（`src/agent/runtime.ts`）会通过正则匹配自动识别并转换为 `INSUFFICIENT_CREDITS` 错误码。

### 匹配规则

```typescript
// runtime.ts 中的错误匹配逻辑
if (/insufficient|credit|balance|quota/i.test(rawError)) {
  errorCode = 'INSUFFICIENT_CREDITS'
}
if (/401|unauthorized|authentication/i.test(rawError)) {
  errorCode = 'AUTH_FAILED'
}
if (/ECONNREFUSED|ENOTFOUND|fetch failed|network/i.test(rawError)) {
  errorCode = 'NETWORK_ERROR'
}
if (/rate.?limit|too many requests|429/i.test(rawError)) {
  errorCode = 'RATE_LIMITED'
}
```

### 推荐的错误响应格式

后端 AI 接口（自有接口）在积分不足时，推荐返回以下格式之一：

**方式 1：HTTP 状态码 + 错误消息**
```json
HTTP 402 Payment Required
{
  "error": {
    "message": "Insufficient credit balance",
    "type": "insufficient_credits"
  }
}
```

**方式 2：HTTP 状态码 + 简单消息**
```json
HTTP 403 Forbidden
{
  "error": "insufficient balance"
}
```

**方式 3：兼容 Anthropic/OpenAI 格式**
```json
HTTP 429 Too Many Requests
{
  "error": {
    "message": "You have exceeded your credit quota. Please visit the billing page to add more credits.",
    "type": "insufficient_quota"
  }
}
```

> **关键要求**：错误消息文本中必须包含 `insufficient`、`credit`、`balance`、`quota` 中至少一个关键词（不区分大小写），YouClaw 才能正确识别为积分不足错误。

---

## SSE 事件格式

错误通过 SSE（Server-Sent Events）推送到前端，格式如下：

```
event: error
data: {"type":"error","agentId":"default","chatId":"xxx","error":"Insufficient credits or API quota. Please check your account balance.","errorCode":"INSUFFICIENT_CREDITS"}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | `string` | 是 | 固定值 `"error"` |
| `agentId` | `string` | 是 | 当前 Agent ID |
| `chatId` | `string` | 是 | 当前对话 ID |
| `error` | `string` | 是 | 用户可读的错误描述 |
| `errorCode` | `string` | 否 | 错误码枚举值（见上表） |

---

## 前端处理流程

```
AI 接口返回错误
    ↓
claude-agent-sdk 抛出异常
    ↓
runtime.ts humanizeError() 解析错误 → 返回 { message, errorCode }
    ↓
EventBus 发送 error 事件（含 errorCode）
    ↓
SSE 推送到前端
    ↓
useChat 接收事件
    ├── errorCode === 'INSUFFICIENT_CREDITS' → 弹出充值弹窗
    └── 其他 → 显示错误消息 (⚠️ xxx)
    ↓
用户点击"立即充值" → openPayPage() → 打开官网支付页
    ↓
支付完成 → 自动轮询余额更新
```

---

## 扩展指南

### 添加新的错误码

1. **在 `src/events/types.ts` 中添加枚举值：**
   ```typescript
   export enum ErrorCode {
     INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
     AUTH_FAILED = 'AUTH_FAILED',
     // 新增:
     MODEL_OVERLOADED = 'MODEL_OVERLOADED',
   }
   ```

2. **在 `src/agent/runtime.ts` 的 `humanizeError()` 中添加匹配规则：**
   ```typescript
   if (/overloaded|capacity|503/i.test(raw)) {
     return { message: '模型服务繁忙，请稍后重试', errorCode: ErrorCode.MODEL_OVERLOADED }
   }
   ```

3. **在前端 `useChat.ts` 中处理新错误码：**
   ```typescript
   case 'error':
     if (event.errorCode === 'MODEL_OVERLOADED') {
       // 自定义 UI 处理
     }
   ```

---

## ReadmeX Server 侧改动

ReadmeX 后端（`readmex-server`）已完成以下改动，确保积分不足时返回标准化错误：

### 新增文件

| 文件 | 说明 |
|------|------|
| `InsufficientCreditsException.java` | 积分不足专用异常类，携带 `currentBalance` 字段 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `OpenApiProxyController.java` | `checkBalance()` 改为抛出 `InsufficientCreditsException`，错误消息包含 `"Insufficient credit balance"` |
| `CreditService.java` | `consume()` 余额不足时也抛出 `InsufficientCreditsException` |
| `GlobalExceptionHandler.java` | 新增 `handleInsufficientCredits()` 处理器，返回 HTTP 402 + Claude API 兼容错误格式 |

### 实际返回格式

当积分不足时，ReadmeX Server 返回：

```
HTTP 402 Payment Required
Content-Type: application/json

{
  "type": "error",
  "error": {
    "type": "insufficient_credits",
    "message": "Insufficient credit balance. Current balance: 0"
  }
}
```

`claude-agent-sdk` 收到 HTTP 402 后会抛出异常，异常消息中包含 `"Insufficient credit balance"`，
被 YouClaw 的 `runtime.ts` 匹配到 `insufficient|credit|balance` 规则，转为 `INSUFFICIENT_CREDITS` 错误码。

### 两处检查点

1. **请求前检查**（`OpenApiProxyController.checkBalance`）：用户发起请求时，余额 ≤ 0 直接拒绝
2. **扣费时检查**（`CreditService.consume`）：流式请求完成后扣费时，余额不足也会报错

---

## 测试建议

可通过修改 AI 接口的 mock 响应来测试积分不足流程：

```bash
# 临时让 AI 接口返回积分不足错误
curl -X POST http://localhost:3000/api/agents/default/message \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "test"}'
```

确认：
1. 聊天区域显示 `⚠️ Insufficient credits or API quota...` 错误消息
2. 同时弹出充值弹窗，显示当前余额
3. 点击"立即充值"跳转到官网支付页
4. 支付完成后余额自动更新
