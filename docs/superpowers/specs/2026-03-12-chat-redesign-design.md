# Chat 页面重设计 — 设计文档

## 概述

将 Chat 页面及全局导航重设计为 Claude.ai 风格，包括：
- 去掉 Topbar，改为可展开/收起的左侧 Sidebar（融合导航+会话列表）
- 重构 Chat 页面，拆分 God Component，使用 PromptInput 组件
- 新增 Tool Use 折叠式可视化

## 参考

Claude.ai 的核心交互模式：
- Sidebar 收起时只显示图标栏（~52px），展开时显示导航+会话列表（~260px）
- 导航图标始终在 Sidebar 顶部区域，展开时加文字标签
- 消息区居中，最大化内容空间
- Tool Use 以折叠块内联在消息流中

## 组件架构

```
Shell (重构)
├── AppSidebar (新组件，替代 Sidebar + Topbar)
│   ├── SidebarHeader        — ☰ 展开/收起、🔍 搜索、✏️ 新建
│   ├── SidebarNav           — 页面导航图标（展开时带文字）
│   ├── SidebarChatList      — 会话列表（仅 Chat 路由下显示）
│   ├── SidebarFooter        — 设置 + 语言切换
│   └── useSidebar hook      — 展开/收起状态（localStorage 持久化）
│
├── ChatPage (重构)
│   ├── ChatWelcome          — 新对话欢迎页（居中输入框+快捷提示）
│   ├── ChatMessages         — 消息列表容器（Conversation 组件包裹）
│   │   ├── UserMessage      — 用户消息（头像+右对齐气泡）
│   │   ├── AssistantMessage — AI 回复（头像+Streamdown 渲染）
│   │   └── ToolUseBlock     — tool_use 折叠展示（新组件）
│   ├── ChatInput            — 基于 PromptInput 的输入区
│   └── useChat hook         — 增加 tool_use 事件处理
│
└── <其他页面不变>
```

## 详细设计

### 1. AppSidebar

#### 1.1 状态管理

`useSidebar()` hook：
- `isCollapsed: boolean` — 展开/收起状态
- `toggle()` / `collapse()` / `expand()` — 操作方法
- 状态持久化到 `localStorage('youclaw-sidebar-collapsed')`
- 通过 `SidebarContext` 共享给子组件

#### 1.2 收起状态（~52px）

纵向排列，居中对齐：
1. **顶部操作区**：
   - ☰ 展开按钮
   - ✏️ 新建对话按钮
   - 🔍 搜索按钮（点击弹出 Popover 搜索框）
2. **分隔线**
3. **页面导航图标**：
   - 💬 Chat（active 时高亮背景）
   - 🤖 Agents
   - ⏰ Cron
   - 🧠 Memory
   - 🧩 Skills
   - ••• 更多（点击 Popover 展示 Globe/Logs/System）
4. **弹性空间**
5. **底部**：⚙️ 设置 + 语言切换

#### 1.3 展开状态（~260px）

1. **顶部操作栏**（水平排列）：
   - 左：☰ 收起按钮
   - 右：🔍 搜索、✏️ 新建对话
2. **页面导航**（纵向列表，图标+文字标签）：
   - 💬 Chat、🤖 Agents、⏰ Cron、🧠 Memory、🧩 Skills、••• More
   - 当前页面高亮显示
3. **分隔线**（仅 Chat 路由下显示以下区域）
4. **会话列表**：
   - 按日期分组（今天/昨天/更早）
   - 每项显示对话名称，hover 显示 `...` 操作菜单
   - 当前对话高亮
   - 支持搜索过滤
5. **底部**：⚙️ 设置 | 语言切换

#### 1.4 过渡动画

- `transition-all duration-200 ease-in-out`
- 宽度从 52px ↔ 260px 平滑过渡
- 文字标签在展开时 fade in

#### 1.5 Electron 适配

- macOS：收起状态顶部留出交通灯空间（padding-top）
- Windows：无特殊处理（原 Topbar 的 titleBarOverlay 空间需重新考虑）
- `WebkitAppRegion: 'drag'` 应用在 Sidebar 顶部区域

### 2. Shell 重构

**现有：**
```
<Topbar />
<div flex>
  <Sidebar />       ← 固定 220px
  <main>{children}</main>
</div>
```

**新：**
```
<div flex>
  <AppSidebar />   ← 52px / 260px 可切换
  <main>{children}</main>
</div>
```

- 删除 `Topbar` 组件
- 删除 `Sidebar` 组件
- 新增 `AppSidebar` 组件
- `SettingsDialog` 保留，触发入口移至 Sidebar 底部

### 3. ChatPage 重构

#### 3.1 ChatWelcome（新对话状态）

- 输入框在页面垂直居中
- 上方显示 Logo + "有什么可以帮你的？"
- Agent 选择在输入框内部（PromptInputSelect）
- 可选：快捷提示按钮（"分析代码"、"写测试"等）
- 发送第一条消息后，输入框过渡到底部固定位置

#### 3.2 ChatMessages（对话状态）

- 使用 `Conversation` + `ConversationContent` 包裹（auto-scroll）
- 消息居中 `max-w-3xl`
- `ConversationScrollButton` 在底部

**UserMessage 组件：**
- 头像（蓝色渐变背景 + User 图标） + 用户名标签
- 右对齐气泡样式
- 白色/主色背景，圆角

**AssistantMessage 组件：**
- 头像（紫色渐变背景 + Bot 图标） + "Assistant" 标签
- 左对齐，全宽 Markdown 渲染（MessageContent + MessageResponse）
- hover 时显示操作按钮（复制、重新生成）
- 内联 ToolUseBlock

#### 3.3 ToolUseBlock（新组件）

**收起状态：**
```
┌──────────────────────────────────────┐
│ 🔧 read_file("src/db/...")        ▶ │
└──────────────────────────────────────┘
```

**展开状态：**
```
┌──────────────────────────────────────┐
│ 🔧 read_file                      ▼ │
│──────────────────────────────────────│
│ 输入: { path: "src/db/index.ts" }   │
│ 输出: (内容预览，截断)              │
└──────────────────────────────────────┘
```

- 默认收起，点击展开/收起
- 进行中状态：脉冲动画 + "正在使用 xxx..."
- 多个连续 tool_use 堆叠显示："使用了 N 个工具 ▶"
- 样式：`border-left: 3px solid primary`，浅色背景

#### 3.4 ChatInput

基于已有的 `PromptInput` 组件体系：

```tsx
<PromptInput onSubmit={handleSubmit}>
  <PromptInputTextarea placeholder={t.chat.placeholder} />
  <PromptInputFooter>
    <PromptInputTools>
      <PromptInputButton>📎 附件</PromptInputButton>
      <PromptInputSelect>  {/* Agent 选择器 */}
        <PromptInputSelectTrigger>
          <PromptInputSelectValue />
        </PromptInputSelectTrigger>
        <PromptInputSelectContent>
          {agents.map(a => <PromptInputSelectItem .../>)}
        </PromptInputSelectContent>
      </PromptInputSelect>
    </PromptInputTools>
    <PromptInputSubmit status={chatStatus} onStop={handleStop} />
  </PromptInputFooter>
</PromptInput>
```

- 底部固定，居中 `max-w-3xl`
- 支持附件粘贴/拖拽（PromptInput 内置）
- Enter 发送，Shift+Enter 换行（内置）

### 4. 数据层改动

#### 4.1 Message 类型扩展

```typescript
export type ToolUseItem = {
  id: string
  name: string
  input: Record<string, unknown>
  output?: string
  status: 'running' | 'done' | 'error'
}

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  toolUse?: ToolUseItem[]  // 新增
}
```

#### 4.2 useChat hook 改动

- 处理 `tool_use` SSE 事件：
  - 收到 `tool_use` 事件时，追加到当前 streaming 消息的 `toolUse` 数组
  - `tool_use` 事件包含 `{ tool: string, input?: object, output?: string, status: string }`
- 新增 `chatStatus` 派生状态，映射到 PromptInputSubmit 的 status

#### 4.3 useSSE hook

- 现有的 `tool_use` 事件监听已存在，只需在 useChat 中处理

### 5. 删除对话改进

- 用 shadcn/ui 的 `AlertDialog` 替代原生 `confirm()`
- 在 Sidebar 会话列表的 hover `...` 菜单中触发
- 删除当前对话后自动切换到新对话状态

## 改动范围汇总

| 文件 | 操作 | 说明 |
|------|------|------|
| `components/layout/Topbar.tsx` | 删除 | 功能融入 AppSidebar |
| `components/layout/Sidebar.tsx` | 删除 | 被 AppSidebar 替代 |
| `components/layout/Shell.tsx` | 重构 | 去掉 Topbar，使用 AppSidebar |
| `components/layout/AppSidebar.tsx` | 新建 | 可展开/收起的统一侧栏 |
| `hooks/useSidebar.ts` | 新建 | Sidebar 状态管理 |
| `pages/Chat.tsx` | 重构 | 拆分子组件，去掉会话列表 |
| `components/chat/ChatWelcome.tsx` | 新建 | 欢迎页 |
| `components/chat/ChatMessages.tsx` | 新建 | 消息列表 |
| `components/chat/UserMessage.tsx` | 新建 | 用户消息组件 |
| `components/chat/AssistantMessage.tsx` | 新建 | AI 消息组件 |
| `components/chat/ToolUseBlock.tsx` | 新建 | Tool Use 折叠展示 |
| `components/chat/ChatInput.tsx` | 新建 | 基于 PromptInput 的输入区 |
| `hooks/useChat.ts` | 修改 | 增加 tool_use 处理、chatStatus |
| `hooks/useSSE.ts` | 无改动 | 已支持 tool_use 事件 |

## 不在范围内

- 路由结构不变
- 其他页面（Agents/Cron/Memory 等）不变
- 后端 API 不变
- i18n 翻译 key 需新增但结构不变
