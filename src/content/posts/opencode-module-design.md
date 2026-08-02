---
title: "OpenCode 源码解析：模块设计"
description: "拆解 OpenCode 的 Agent Loop、工具系统、记忆与压缩机制。"
date: 2026-07-27
category: "源码解析"
tags: ["OpenCode","Agent Loop","工具调用","记忆系统"]
cover: "/images/posts/e10521fe8041.svg"
coverAlt: "OpenCode Agent Loop 架构图"
featured: false
draft: false
---
## Agent Loop
opencode agent loop 的主心智模型：

<!-- 这是一个文本绘图，源码为：flowchart TD
  A[用户输入<br/>API / TUI / 命令] --> B[SessionPrompt.prompt<br/>提示入口]
  B --> C[createUserMessage<br/>写入用户消息和 Parts]
  C --> D[更新会话时间<br/>写入临时工具权限]
  D --> E[SessionPrompt.loop<br/>进入会话循环]
  E --> F[runLoop<br/>while true 主循环]

  F --> G[读取有效历史<br/>filterCompactedEffect]
  G --> H[定位最近消息<br/>lastUser / lastAssistant / lastFinished]

  H --> I{上一轮是否已完成?}
  I -- 是 --> Z[返回最后一条助手消息]
  I -- 否 --> J{是否有待处理任务?}

  J -- 子任务 subtask --> K[handleSubtask<br/>运行子 Agent 会话]
  K --> F

  J -- 压缩任务 compaction --> L[SessionCompaction.process<br/>生成上下文摘要]
  L --> F

  J -- 没有 --> M{是否上下文溢出?}
  M -- 是 --> N[SessionCompaction.create<br/>写入压缩任务 Part]
  N --> F

  M -- 否 --> O[读取当前 Agent 和 Model]
  O --> P[insertReminders<br/>插入规划/执行提醒]
  P --> Q[创建助手消息<br/>Assistant Message]
  Q --> R[SessionProcessor.create<br/>创建流事件处理器]

  R --> S[resolveTools<br/>解析可用工具]
  S --> S1[ToolRegistry<br/>内置工具 / 插件工具 / MCP 工具]
  S1 --> S2[权限过滤<br/>Agent 权限 + Session 权限]
  S2 --> T[构造模型上下文<br/>system / 环境 / skills / instructions / 历史]

  T --> U[MessageV2.toModelMessagesEffect<br/>Session 历史转模型消息]
  U --> V[SessionProcessor.process<br/>开始处理一次模型调用]
  V --> W[LLM.stream<br/>调用模型流式输出]

  W --> X[SessionProcessor 处理流事件<br/>文本 / reasoning / 工具 / step / 错误]
  X --> X1[写回 Session<br/>updateMessage / updatePart / updatePartDelta]
  X1 --> Y{本轮结果}

  Y -- continue<br/>继续 --> F
  Y -- compact<br/>需要压缩 --> N
  Y -- stop<br/>停止 --> Z
 -->
![](/images/posts/e10521fe8041.svg)

<!-- 这是一个文本绘图，源码为：sequenceDiagram
  participant 用户 as 用户/API
  participant 编排器 as SessionPrompt
  participant 会话 as Session 存储
  participant 工具注册 as ToolRegistry
  participant 处理器 as SessionProcessor
  participant 模型 as LLM.stream
  participant 工具 as Tool 执行器
  participant 压缩 as Compaction

  用户->>编排器: prompt(input)
  编排器->>会话: updateMessage(用户消息)
  编排器->>会话: updatePart(用户消息 Parts)
  编排器->>编排器: loop(sessionID)

  loop Agent 主循环
    编排器->>会话: 读取压缩后的有效历史 filterCompactedEffect(sessionID)
    编排器->>编排器: 检查最近的用户消息 / 助手消息 / 已完成消息

    alt 存在子任务 Part
      编排器->>编排器: handleSubtask() 运行子 Agent
      编排器->>会话: 写入 task 工具结果

    else 存在压缩任务 Part
      编排器->>压缩: process() 执行上下文压缩
      压缩->>会话: 写入摘要型助手消息

    else 上下文溢出
      编排器->>压缩: create() 创建压缩任务
      压缩->>会话: 写入 compaction 用户消息和 Part

    else 正常模型执行
      编排器->>工具注册: resolveTools(agent, model)
      工具注册-->>编排器: 返回 AI SDK tools

      编排器->>会话: updateMessage(助手消息)
      编排器->>处理器: create(助手消息)
      编排器->>处理器: process(模型输入)
      处理器->>模型: stream(input)

      模型-->>处理器: 文本 / reasoning / 工具 / step 事件
      处理器->>会话: updatePart / updatePartDelta

      alt 模型调用工具
        模型->>工具: execute(args)
        工具-->>模型: 返回工具结果
        模型-->>处理器: tool-result
        处理器->>会话: 写入 completed 工具 Part
      end

      处理器-->>编排器: 返回 continue / stop / compact
    end
  end

  编排器-->>用户: 返回最后一条助手消息
 -->
![](/images/posts/e6641c360fec.svg)

**工具调用时序图**

<!-- 这是一个文本绘图，源码为：sequenceDiagram
  participant 模型 as LLM 模型
  participant 处理器 as SessionProcessor
  participant 工具 as Tool 执行
  participant 会话 as Session 记忆

  模型->>处理器: tool-input-start
  处理器->>会话: 写入 pending 工具 Part

  模型->>处理器: tool-call 参数
  处理器->>会话: 更新为 running

  模型->>工具: execute(args)
  工具-->>模型: 工具结果

  模型->>处理器: tool-result
  处理器->>会话: 更新为 completed 工具 Part

  处理器-->>处理器: 返回 continue
  处理器->>会话: 下一轮重新读取历史
 -->
![](/images/posts/c1c25519ac39.svg)

opencode 的 agent loop 是一个 session 驱动的 ReAct 循环：

```latex
读 session 记忆
  -> 选择 agent/model/tools
  -> 调 LLM
  -> 把文本、工具调用、工具结果、patch、token 写回 session
  -> 根据结果继续、停止或压缩
```

## 工具模块
工具层可以分成四层：

```latex
Tool 定义层
  -> ToolRegistry 注册/筛选层
  -> SessionPrompt.resolveTools 适配层
  -> LLM/Processor 调用与落盘层
```

**工具层架构图**

<!-- 这是一张图片，ocr 内容为： -->
![](/images/posts/9857476dc246.webp)

### **工具规范**
工具统一用 `Tool.Def` 。

```typescript
{
  id: string
  description: string
  parameters: Schema
  execute(args, ctx): Effect<{
    title: string
    metadata: Record<string, unknown>
    output: string
    attachments?: FilePart[]
  }>
}
```

工具执行时会拿到 `Tool.Context`：

```typescript
{
  sessionID,
  messageID,
  agent,
  abort,
  callID,
  messages,
  metadata(...),
  ask(...)
}
```

两个最重要的上下文函数：

`ctx.ask(...)`：发起权限请求，例如 bash/edit/write/task 这类敏感工具。

`ctx.metadata(...)`：更新工具运行中的标题和 metadata，让 UI 能看到工具正在做什么。

`Tool.define()` 还会统一做两件事：

+ 参数 schema 校验
+ 工具输出截断，避免超长 output 塞爆上下文

### **内置工具**
`ToolRegistry` 初始化内置工具：

```latex
invalid
模型工具调用修复失败时的兜底工具。正常情况下模型不该主动用它。比如模型调用了不存在的工具，或参数坏到无法修复，系统会转成 invalid，输出错误说明。
question
向用户提问。用于需求不清、需要用户做选择、需要确认偏好时。它会把问题发到 UI/TUI，拿到用户回答后，把回答作为工具结果返回给模型。
bash
执行 shell 命令。
read
读取文件或目录。文件内容会带行号返回。支持 offset / limit，也能读取图片/PDF 并作为附件返回。
glob
按文件名模式找文件。
grep
按正则搜索文件内容。
edit
对已有文件做精确字符串替换。适合小改动、局部替换。
write
写完整文件。会覆盖目标文件。
task
启动一个子 agent。它是 subagent 编排的核心工具。
它会：
1.创建或复用子 session
2.把 prompt 发给指定 subagent
3.等待子 agent 完成
4.把结果作为 task 工具输出返回主 agent
webfetch
抓取指定 URL 内容，返回 markdown/text/html。适合用户给了具体网页、文档链接时读取内容。
todowrite
维护任务列表
websearch
实时网页搜索，基于 Exa。适合查最新信息、新闻、当前文档、网页资料。
codesearch
代码/文档搜索，基于 Exa Code API。适合查库、SDK、API、框架用法，例如 React、FastAPI、Next.js 等。
skill
加载 skill 指令。
apply_patch
用 patch 语言批量增删改文件。适合模型生成结构化补丁，尤其是 GPT 系模型会优先暴露这个工具，而不是普通 edit/write。
lsp
调用 Language Server Protocol，适合语义级代码探索，比如查定义、查引用、查调用关系。
plan_exit
规划模式结束工具。
```

还有两类动态工具，由用户自己配置：

```latex
配置目录里的 tool/*.js 或 tools/*.ts
插件暴露的 plugin.tool
```

这些会被转换成统一的 `Tool.Def`。

MCP 工具不直接进 `ToolRegistry.builtin/custom`，而是在 `SessionPrompt.resolveTools()` 里额外合并。

**怎么决定“有哪些工具可用”**

第一层：Registry 按模型/provider 过滤。

主要规则：

```latex
websearch / codesearch
  -> 只有 provider 是 opencode 或开启 Exa 时可用

apply_patch
  -> GPT 系且不是 oss/gpt-4 时可用

edit/write
  -> apply_patch 不可用时才暴露
```

第二层：ToolRegistry 动态增强描述。

`task` 工具会注入当前 agent 可以调用的 subagent 列表。

`skill` 工具会注入当前 agent 可用的 skill 列表。

这会影响模型“知道有哪些子 agent/skill 可以用”。

第三层：LLM 层按权限和用户工具开关再过滤。

```typescript
resolveTools(input)
```

它会去掉：

```latex
用户本轮显式禁用的工具
agent/session permission 禁用的工具
```

然后 `streamText` 里传：

```typescript
activeTools: Object.keys(tools).filter((x) => x !== "invalid")
tools
toolChoice
```

**怎么决定“调用哪个工具”**

这个要分清楚：opencode 决定“给模型哪些工具”，但具体调用哪个工具，通常由模型根据工具描述、参数 schema、上下文自主决定。

流程是：

```latex
opencode 暴露工具集合
  -> 模型看到工具名/描述/参数
  -> 模型生成 tool-call
  -> AI SDK 调用对应 execute(args)
```

例外/约束：

+ `toolChoice: "required"` 时，模型必须调用工具，例如结构化输出 `StructuredOutput`。
+ 工具被 permission deny 时不会暴露或执行会被拒绝。
+ 参数不合法时，`Tool.define()` 会返回 schema 校验错误。
+ 工具名大小写不匹配时，`LLM.experimental_repairToolCall` 会尝试转小写修复；修不好会调用 `invalid` 工具。

**工具调用如何落盘**

工具调用状态由 `SessionProcessor` 记录。

<!-- 这是一个文本绘图，源码为：sequenceDiagram
  participant 模型 as LLM 模型
  participant SDK as AI SDK
  participant 工具 as Tool.execute
  participant 处理器 as SessionProcessor
  participant 会话 as Session Store

  模型-->>处理器: tool-input-start
  处理器->>会话: 写入 ToolPart pending

  模型-->>处理器: tool-call(args)
  处理器->>会话: 更新 ToolPart running + input

  SDK->>工具: execute(args, Tool.Context)
  工具->>工具: ctx.ask 权限检查
  工具->>处理器: ctx.metadata 更新运行信息
  工具-->>SDK: output / metadata / attachments

  模型-->>处理器: tool-result
  处理器->>会话: 更新 ToolPart completed

  处理器-->>会话: 下一轮模型上下文包含工具结果 -->
![](/images/posts/d1a45249c141.svg)

`ToolPart` 状态机：

```latex
pending -> running -> completed
                   -> error
```

下一轮 `MessageV2.toModelMessagesEffect()` 会把 completed tool part 转成模型能理解的 tool result。于是模型就能基于工具结果继续推理。

**权限**

工具权限是三处共同作用：

```latex
Agent.permission
Session.permission
Tool.Context.ask()
```


<!-- 这是一个文本绘图，源码为：flowchart LR
  A[Agent 权限规则] --> C[Permission.merge]
  B[Session 临时权限] --> C
  C --> D[ctx.ask]
  D --> E{allow / ask / deny}
  E -- allow --> F[继续执行工具]
  E -- ask --> G[向用户请求批准]
  G --> F
  E -- deny --> H[工具失败/停止] -->
![](/images/posts/68132ceaa5a7.svg)

`resolveTools()` 给每个工具注入 `ctx.ask`。

## 记忆模块
<!-- 这是一个文本绘图，源码为：flowchart TD
  User[用户输入] --> Create[创建用户消息<br/>SessionPrompt.createUserMessage]
  Create --> Store[(会话消息存储<br/>Session Message Store)]

  Model[模型流 / 工具执行] --> Processor[会话处理器<br/>SessionProcessor]
  Processor --> Parts[消息片段<br/>Message Parts]
  Parts --> Store

  Parts --> Text[文本片段<br/>用户文本 / 助手回复]
  Parts --> Reasoning[推理片段<br/>模型 reasoning 流]
  Parts --> Tool[工具片段<br/>工具输入 / 输出 / 错误]
  Parts --> Step[步骤片段<br/>step-start / step-finish]
  Parts --> Patch[补丁片段<br/>文件变更摘要]
  Parts --> CompactMark[压缩片段<br/>上下文压缩标记]

  Store --> ReadHistory[读取有效历史<br/>过滤已压缩内容]
  ReadHistory --> Convert[转换为模型消息<br/>toModelMessagesEffect]
  Convert --> Model

  Step --> Snapshot[代码快照<br/>Snapshot]
  Snapshot --> Diff[计算文件差异<br/>SessionSummary.computeDiff]
  Diff --> Summary[(会话摘要<br/>文件数 / 新增 / 删除)]
  Summary --> Store

  Store --> Overflow{上下文是否过长?}
  Overflow -- 是 --> Compaction[上下文压缩<br/>SessionCompaction]
  Compaction --> CompactSummary[压缩后的任务摘要]
  CompactSummary --> Store
  Overflow -- 否 --> ReadHistory

  Tool --> Truncate[工具输出截断<br/>避免结果过长]
  Truncate --> Store
 -->
![](/images/posts/e4ed25c95b3b.svg)

**核心设计**

opencode 的记忆模块是围绕 `Session` 事件日志设计的。每次对话、工具调用、模型输出、文件 diff、token usage 都会变成 message 或 part 写回 session。

主要有三层：

```latex
Session
  └── Message
        └── Part
```

`Session` 是一次会话。

`Message` 是 user / assistant 消息。

`Part` 是消息里的细粒度内容，比如文本、工具调用、reasoning、step、patch、compaction。

**记忆如何进入下一轮模型**

```latex
session 历史
  -> filterCompactedEffect()
  -> toModelMessagesEffect()
  -> LLM.stream()
```

也就是说，模型看到的是经过处理后的 session 历史。已压缩的旧内容会被摘要替代，最近几轮会尽量保留原始细节。

### **工具调用记忆**
工具调用也被当作记忆保存：

<!-- 这是一个文本绘图，源码为：sequenceDiagram
  participant 模型 as 模型
  participant 处理器 as SessionProcessor<br/>会话处理器
  participant 工具 as 工具执行器
  participant 会话 as Session Store<br/>会话存储

  模型->>处理器: 开始生成工具输入
  处理器->>会话: 写入“等待中”的工具记录

  模型->>处理器: 发起工具调用<br/>工具名 + 参数
  处理器->>会话: 更新为“运行中”<br/>保存工具参数

  处理器->>工具: 执行工具
  工具->>处理器: 返回结果 / 附件 / 元数据

  处理器->>会话: 更新为“已完成”<br/>保存输出、附件、元数据

  会话->>模型: 下一轮对话时<br/>工具结果重新进入上下文
 -->
![](/images/posts/7e3461b2f8ec.svg)

所以模型能“记住”刚才读了什么文件、bash 输出是什么、apply_patch 改了哪些文件，本质上是因为这些结果都变成了 `tool part`，下一轮又被 `toModelMessagesEffect()` 转回模型消息。

### **压缩记忆**
当 token 溢出时：

<!-- 这是一个文本绘图，源码为：flowchart LR
  Full[完整历史] --> Select[选择要压缩的旧 turn]
  Select --> Summarize[compaction agent 生成摘要]
  Summarize --> Keep[保留最近几轮原文]
  Keep --> NewContext[摘要 + 最近原文]
  NewContext --> NextLLM[下一轮模型上下文] -->
![](/images/posts/490ce2835886.svg)

压缩摘要的结构包含：

```latex
Goal  目标
Constraints & Preferences  约束&偏好
Progress  进度
Key Decisions  关键决策
Next Steps  下一步行动
Critical Context  关键上下文
Relevant Files  相关文件
```

### 三层记忆模型—Session、Message、Part
opencode 记忆系统的主干：

```latex
Session
  └── Message
        └── Part
```

可以把它类比成：

```latex
一次会话
  └── 一轮用户/助手消息
        └── 这条消息里的结构化片段
```

**Session 层**

`Session` 表示一整个会话，是最高层的容器。

核心字段：

```typescript
{
  id,
  slug,
  projectID,
  workspaceID?,
  directory,
  parentID?,
  title,
  version,
  summary?,
  permission?,
  revert?,
  time
}
```

它回答的是：“这次对话属于哪里、叫什么、状态如何？”

几个关键含义：

`id`：会话唯一 ID。

`slug`：短标识，常用于 plan 文件名。

`projectID` / `directory`：这个会话绑定的项目和工作目录。

`parentID`：父会话。subagent 会创建子 session，所以 agent 编排天然是 session tree。

`title`：会话标题，初始自动生成，后续可由 title agent 生成。

`summary`：整个 session 的 diff 摘要，比如改了几个文件、增删多少行。

`permission`：session 级工具权限覆盖，例如某次请求临时禁用 bash。

`revert`：撤销状态，记录可回滚到哪个 message/part/snapshot。

`time`：创建、更新、压缩、归档时间。

**<u>Session 层不保存具体文本，它保存“会话元信息”。</u>**

**Message 层**

`Message` 是一次会话里的消息头。

Message 有两种：

```typescript
User | Assistant
```

User message 表示用户输入：

```typescript
{
  id,
  sessionID,
  role: "user",
  time: { created },
  agent,
  model,
  system?,
  tools?,
  format?,
  summary?
}
```

它回答的是：“用户这一轮想让哪个 agent、哪个 model、带什么临时配置来处理？”

`agent`：比如 `build`、`plan`。

`model`：本轮使用的 provider/model。

`tools`：本轮工具开关。

`format`：是否要求 JSON schema 输出。

`system`：用户附加 system prompt。

Assistant message 表示模型/agent 的一次响应：

```typescript
{
  id,
  sessionID,
  role: "assistant",
  parentID,
  agent,
  modelID,
  providerID,
  path,
  cost,
  tokens,
  finish?,
  error?,
  summary?,
  structured?
}
```

它回答的是：“agent 这一轮执行结果是什么状态？”

`parentID`：指向对应 user message。

`agent`：实际执行的 agent。

`path`：执行时 cwd/root。

`cost` / `tokens`：模型消耗。

`finish`：结束原因，比如 `stop` 或 `tool-calls`。

`error`：失败信息。

`summary`：是否是上下文压缩摘要消息。

Message 层也不一定直接保存正文，正文主要在 Part 层。

**Part 层**

`Part` 是消息的实际内容片段。

所有 Part 都有：

```typescript
{
  id,
  sessionID,
  messageID,
  type
}
```

它回答的是：“这条消息里具体发生了什么？”

常见 Part 类型：

`text`：文本内容。

```typescript
{
  type: "text",
  text,
  synthetic?,
  ignored?,
  time?,
  metadata?
}
```

用户输入、助手回复、系统自动插入的 reminder 都可以是 text part。

`file`：文件或附件。

```typescript
{
  type: "file",
  mime,
  filename?,
  url,
  source?
}
```

用户附加文件、图片、MCP resource、LSP symbol 来源都可以放这里。

`reasoning`：模型 reasoning 流。

```typescript
{
  type: "reasoning",
  text,
  metadata?,
  time
}
```

`tool`：工具调用记录。

```typescript
{
  type: "tool",
  callID,
  tool,
  state,
  metadata?
}
```

工具 state 有：

```typescript
pending -> running -> completed | error
```

这是 agent 能“记住工具结果”的关键。

`step-start` / `step-finish`：模型 step 边界。

```typescript
{
  type: "step-start",
  snapshot?
}

{
  type: "step-finish",
  reason,
  snapshot?,
  cost,
  tokens
}
```

用于记录一次模型调用的开始、结束、费用、token 和文件快照。

`patch`：文件改动摘要。

```typescript
{
  type: "patch",
  hash,
  files
}
```

`compaction`：上下文压缩任务。

```typescript
{
  type: "compaction",
  auto,
  overflow?,
  tail_start_id?
}
```

`subtask`：子 agent 任务。

```typescript
{
  type: "subtask",
  prompt,
  description,
  agent,
  model?,
  command?
}
```

数据库上对应 `PartTable`，见 [session.sql.ts](/Users/ljn/Documents/GitHub/opencode/packages/opencode/src/session/session.sql.ts:61)。

**三层如何关联**

关系字段是：

```latex
Session.id
  = Message.sessionID

Message.id
  = Part.messageID

Session.id
  = Part.sessionID
```

为什么 Part 也存 `sessionID`？因为这样可以直接按 session 查 part，方便索引、删除、同步和事件发布。

实际结构像这样：

```typescript
const session = {
  id: "ses_123",
  title: "Implement auth",
}

const userMessage = {
  id: "msg_001",
  sessionID: "ses_123",
  role: "user",
  agent: "build",
  model: { providerID: "openai", modelID: "gpt-5" },
}

const userTextPart = {
  id: "prt_001",
  sessionID: "ses_123",
  messageID: "msg_001",
  type: "text",
  text: "帮我实现登录",
}

const assistantMessage = {
  id: "msg_002",
  sessionID: "ses_123",
  parentID: "msg_001",
  role: "assistant",
  agent: "build",
  modelID: "gpt-5",
  providerID: "openai",
}

const toolPart = {
  id: "prt_002",
  sessionID: "ses_123",
  messageID: "msg_002",
  type: "tool",
  tool: "read",
  callID: "call_abc",
  state: {
    status: "completed",
    input: { filePath: "src/auth.ts" },
    output: "...file content...",
    title: "",
    metadata: {},
    time: { start: 1, end: 2 },
  },
}
```

**为什么要拆成三层**

因为 agent 执行不是简单聊天，它有很多结构化过程：

```latex
用户文本
模型文本流
模型 reasoning 流
工具调用输入
工具执行输出
工具错误
文件附件
文件 diff
token/cost
上下文压缩摘要
子 agent 任务
```

如果都塞进一条字符串，会很难做：

+ 工具结果回放
+ 流式 UI
+ 权限审批展示
+ 历史压缩
+ 文件 diff 统计
+ retry/error 恢复
+ subagent session tree
+ JSON schema 输出
+ 多 provider tool message 转换

所以 opencode 选择：

```latex
Session 管会话
Message 管轮次和角色
Part 管具体内容和执行痕迹
```

**模型上下文如何生成**

每次调用模型时，并不是直接拿数据库文本拼 prompt，而是：

```latex
Session.messages()
  -> MessageV2.filterCompactedEffect()
  -> MessageV2.toModelMessagesEffect()
  -> LLM.stream()
```

`toModelMessagesEffect()` 会把 Part 转成模型能理解的消息：

```latex
text part      -> user/assistant text
file part      -> file attachment
tool part      -> tool call/result
reasoning part -> reasoning
compaction part -> "What did we do so far?"
subtask part   -> "The following tool was executed by the user"
```
