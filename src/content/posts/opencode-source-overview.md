---
title: "OpenCode 源码解析：总体概览"
description: "从系统逻辑架构、核心执行序列和项目目录理解 OpenCode 的整体设计。"
date: 2026-07-27
category: "源码解析"
tags: ["OpenCode","AI Agent","TypeScript","源码阅读"]
cover: "/images/posts/f3ca24187fbe.svg"
coverAlt: "OpenCode 系统逻辑架构图"
featured: false
draft: false
---
# 1. 系统逻辑架构
<!-- 这是一个文本绘图，源码为：graph TB
    subgraph Clients
        CLI[CLI / TUI]
        Web[Web App / Desktop]
        SDK[JS SDK]
        API[HTTP API]
    end

    subgraph Application_Layer
        Server[OpenCode Server<br/>Hono / Routes]
        Bus[Global Bus / SSE]
        Auth[Auth / Permission]
    end

    subgraph Agent_Runtime
        Session[Session Manager]
        Prompt[Prompt Processor]
        Agent[Agent Config / Planner]
        LLM[LLM Service]
        ToolReg[Tool Registry]
    end

    subgraph Integration
        Files[File System]
        Shell[Shell / Bash]
        MCP[MCP Client]
        LSP[LSP Client]
        Plugin[Plugin System]
    end

    subgraph Data
        DB[(SQLite / Storage)]
        Snapshot[Git Snapshot]
    end

    subgraph External
        Models[Model Providers<br/>Anthropic / OpenAI]
        MCPServers[External MCP Servers]
    end

    %% 关系连线
    Clients --> Server
    Server --> Bus
    Server --> Session

    Session --> Prompt
    Prompt --> Agent
    Prompt --> LLM
    LLM --> ToolReg

    ToolReg --> Files
    ToolReg --> Shell
    ToolReg --> MCP
    ToolReg --> LSP
    ToolReg --> Plugin
    ToolReg --> Auth

    Session --> DB
    Session --> Snapshot

    LLM --> Models
    MCP --> MCPServers

    Bus -.-> |推送事件| Clients
    DB --> Bus -->
![](/images/posts/f3ca24187fbe.svg)

### 1. Clients（客户端层）
这是使用 OpenCode 的入口，它提供了四种互动方式：

+ **CLI / TUI**：命令行界面 / 文字图形界面。
+ **Web App / Desktop**：网页版或桌面版应用。
+ **JS SDK**：JavaScript 开发工具包。可以在你自己的 JS/TS 项目里调用 OpenCode 的能力（例如 `opencode.chat("帮我解释这段代码")`）。
+ **HTTP API**：通过 HTTP 请求调用 OpenCode。可以用任何编程语言（Python、Go 等）发送 HTTP 请求来使用它。

### 2. Application Layer（应用服务层）
发出的请求首先会到达这一层，它负责接待、广播和安保。

+ **OpenCode Server / Hono**：系统的主服务器，使用 Hono 框架（一个轻量级 Web 框架）运行。它接收来自客户端的请求，并分发给内部模块处理。
+ **Global Bus / SSE**：全局事件总线 + 服务器推送事件。当agent内部做了任何事（比如开始思考、调用了某个工具），就会通过这个系统实时推送给客户端，然后就能在界面上能看到“正在思考…”、“正在读取文件…”等实时状态。
+ **Auth / Permission**：认证与权限管理。检查你有没有权限执行某些敏感操作（比如修改系统文件、运行 shell 命令）。如果遇到危险操作，它会先请示你，你同意后才继续。

### 3. Agent Runtime（智能体运行时）
这是最核心的决策部分，负责“理解问题、思考、行动”。

+ **Session Manager**：会话管理器。每个对话就是一个“会话”，它负责创建、保存、恢复会话。你问的“帮我写代码”和后续的追问都在同一个会话里。
+ **Prompt Processor**：提示处理器。它把你的原始问题和历史对话整理成一段完整的“指令”（prompt），交给大模型。
+ **Agent Config / Planner**：智能体配置与规划器。定义了当前会话使用哪个“智能体”配置（比如是编程助手模式、还是数据库查询模式），并可能对复杂任务进行步骤规划（先读文件、再搜索、最后编辑）。
+ **LLM Service**：大语言模型服务。负责调用真正的大模型。它把 prompt 发给模型，并接收模型的流式输出（文本、推理过程、工具调用请求）。
+ **Tool Registry**：工具注册表。所有机器人能用的“工具”（读文件、执行 shell、搜索代码等）都登记在这里。当模型说要使用某个工具时，Tool Registry 就会找到并执行它。

### 4. Integration（集成层）
这里实现了机器人具体能做的各种事情，每个都是一个独立能力。

+ **File System**：文件系统操作。读/写/编辑/搜索文件，创建目录等。
+ **Shell / Bash**：执行 shell 命令。可以运行 `ls`、`git status`、`npm install` 等终端命令。
+ **MCP Client**：MCP（模型上下文协议）客户端。MCP 是一个标准协议，允许机器人连接外部工具服务器（比如数据库查询工具、API 调用工具）。这个客户端负责与这些外部服务器通信。
+ **LSP Client**：语言服务器协议客户端。LSP 是编辑器（如 VSCode）用来提供代码补全、跳转定义、重构的协议。机器人通过它可以获得代码的深度理解（比如“找出所有调用了这个函数的地方”）。
+ **Plugin System**：插件系统。允许第三方开发者增加新的工具或行为。如果机器人原来不会做某件事，你可以写一个插件来扩展它。

### 5. Data（数据层）
+ **SQLite / Storage**：本地 SQLite 数据库。存储所有会话记录、消息、工具执行的结果。重启机器人会话也不会丢。
+ **Git Snapshot**：Git 快照。在机器人修改文件之前或之后，它会自动创建一个 Git 快照，方便你回滚或查看改动。相当于一个自动的版本备份。

### 6. External（外部依赖）
+ **Model Providers**：模型提供商（如 OpenAI、Anthropic、本地模型）。机器人自己不会思考，它的大脑实际上托管在这些公司的云端（或你自己部署的模型服务器）。
+ **External MCP Servers**：外部 MCP 服务器。由第三方提供的可通过 MCP 协议使用的工具服务，例如一个提供天气查询的 MCP 服务器。

# 2. 核心执行序列图
<!-- 这是一个文本绘图，源码为：sequenceDiagram
    participant C as Client
    participant S as Server
    participant B as Global Bus
    participant P as SessionProcessor
    participant L as LLM Service
    participant T as ToolRegistry
    participant M as Model Provider

    C->>S: 发送用户消息
    S->>P: prompt(sessionId, input)
    P->>B: 创建 user part 事件

    loop Agent 循环 (最多 100 次)
        P->>L: streamText(system, history, tools)
        L->>M: 调用模型 API

        loop 流式响应处理
            M-->>L: text / reasoning
            L-->>B: 推送 delta 事件

            M-->>L: tool_call
            L->>T: 执行工具
            T->>B: 推送 tool call 事件

            alt 需要用户授权
                T->>B: 请求权限 (Permission)
                B-->>C: 等待用户确认
                C-->>T: 授权通过
            end

            T-->>L: 返回 tool result
            L-->>B: 推送 tool result 事件
        end

        L-->>P: finish(usage)

        alt 需要压缩或继续
            P->>P: 处理 context / continue
        else 任务完成
            P-->>S: 返回最终结果
        end
    end

    P->>DB: 持久化 session 状态
    S-->>C: 返回结果 -->
![](/images/posts/f71fba4c42a0.svg)

##### 举个例子
下面用一个具体例子跑一遍 opencode 的链路。假设用户输入：

```latex
请读取 README.md 并总结
```

并且当前 session 已存在，默认 agent 是 `build`，模型是 `openai/gpt-5`。

**1. 入口：SessionPrompt.prompt**

入口大致在 [prompt.ts](/Users/ljn/Documents/GitHub/opencode/packages/opencode/src/session/prompt.ts:1243)。

输入拼接成类似：

```typescript
{
  sessionID: "ses_001",
  messageID: "msg_user_001",
  agent: "build",
  model: {
    providerID: "openai",
    modelID: "gpt-5"
  },
  parts: [
    {
      type: "text",
      text: "请读取 README.md 并总结"
    }
  ],
  tools: undefined,
  noReply: false
}
```

输出拼接创建用户消息：

```typescript
{
  info: {
    id: "msg_user_001",
    role: "user",
    sessionID: "ses_001",
    agent: "build",
    model: {
      providerID: "openai",
      modelID: "gpt-5"
    },
    time: {
      created: 1710000000000
    }
  },
  parts: [
    {
      id: "part_user_text_001",
      messageID: "msg_user_001",
      sessionID: "ses_001",
      type: "text",
      text: "请读取 README.md 并总结"
    }
  ]
}
```

然后它会写入数据库：

```typescript
sessions.updateMessage(info)
sessions.updatePart(part)
```

对应代码在 [prompt.ts](/Users/ljn/Documents/GitHub/opencode/packages/opencode/src/session/prompt.ts:1201)：会先触发 `chat.message` plugin，再 zod 校验 message/parts，最后保存。

因为 `noReply !== true`，接着进入 loop：

```typescript
return yield* loop({ sessionID })
```

**2. 第一轮 loop：读取历史**

loop 在 [prompt.ts](/Users/ljn/Documents/GitHub/opencode/packages/opencode/src/session/prompt.ts:1272)。

输入：

```typescript
{
  sessionID: "ses_001"
}
```

第一步读历史，并过滤 compacted 历史：

```typescript
let msgs = yield* MessageV2.filterCompactedEffect(sessionID)
```

输出：

```typescript
[
  {
    info: {
      id: "msg_user_001",
      role: "user",
      sessionID: "ses_001",
      agent: "build",
      model: {
        providerID: "openai",
        modelID: "gpt-5"
      }
    },
    parts: [
      {
        id: "part_user_text_001",
        type: "text",
        text: "请读取 README.md 并总结"
      }
    ]
  }
]
```

然后 loop 找到：

```typescript
lastUser = msg_user_001
lastAssistant = undefined
lastFinished = undefined
tasks = []
```

接着解析 model、agent、tools：

```typescript
model = provider.getModel("openai", "gpt-5")
agent = agents.get("build")
tools = resolveTools(...)
```

输出工具集可能类似：

```typescript
{
  read: Tool,
  write: Tool,
  edit: Tool,
  bash: Tool,
  grep: Tool,
  glob: Tool
}
```

**3. 创建 assistant message**

在真正调用模型前，opencode 会先创建一个空 assistant message，见 [prompt.ts](/Users/ljn/Documents/GitHub/opencode/packages/opencode/src/session/prompt.ts:1372)。

输出：

```typescript
{
  id: "msg_assistant_001",
  parentID: "msg_user_001",
  role: "assistant",
  mode: "build",
  agent: "build",
  path: {
    cwd: "/repo",
    root: "/repo"
  },
  cost: 0,
  tokens: {
    input: 0,
    output: 0,
    reasoning: 0,
    cache: {
      read: 0,
      write: 0
    }
  },
  modelID: "gpt-5",
  providerID: "openai",
  sessionID: "ses_001",
  time: {
    created: 1710000001000
  }
}
```

然后：

```typescript
sessions.updateMessage(msg_assistant_001)
processor.create({ assistantMessage: msg_assistant_001, sessionID, model })
```

**4. 构造 system 和 model messages**

在 [prompt.ts](/Users/ljn/Documents/GitHub/opencode/packages/opencode/src/session/prompt.ts:1438)：

```typescript
yield* plugin.trigger("experimental.chat.messages.transform", {}, { messages: msgs })

const [skills, env, instructions, modelMsgs] = yield* Effect.all([
  sys.skills(agent),
  sys.environment(model),
  instruction.system(),
  MessageV2.toModelMessagesEffect(msgs, model),
])
```

这里有四类输入来源。

`env` 输出类似：

```typescript
[
  `You are powered by the model named gpt-5...
<env>
  Working directory: /repo
  Workspace root folder: /repo
  Is directory a git repo: yes
  Platform: darwin
  Today's date: Sat May 09 2026
</env>`
]
```

`instructions` 可能来自 `AGENTS.md` / `CLAUDE.md` / 配置里的 instruction 文件：

```typescript
[
  "Instructions from: /repo/AGENTS.md\n请使用中文回答..."
]
```

`modelMsgs` 由 [message-v2.ts](/Users/ljn/Documents/GitHub/opencode/packages/opencode/src/session/message-v2.ts:719) 生成。此时只有用户文本，所以输入：

```typescript
[
  {
    info: { role: "user", id: "msg_user_001" },
    parts: [
      { type: "text", text: "请读取 README.md 并总结" }
    ]
  }
]
```

输出：

```typescript
[
  {
    role: "user",
    content: [
      {
        type: "text",
        text: "请读取 README.md 并总结"
      }
    ]
  }
]
```

最终传给 processor 的输入类似：

```typescript
{
  user: msg_user_001,
  agent: buildAgent,
  permission: session.permission,
  sessionID: "ses_001",
  system: [
    "...provider/env prompt...",
    "...skills prompt...",
    "Instructions from: /repo/AGENTS.md\n..."
  ],
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "请读取 README.md 并总结"
        }
      ]
    }
  ],
  tools: {
    read: Tool,
    write: Tool,
    edit: Tool,
    bash: Tool
  },
  model: openaiGpt5
}
```

**5. LLM 层真正发请求**

在 [llm.ts](/Users/ljn/Documents/GitHub/opencode/packages/opencode/src/session/llm.ts:99)，LLM 层会把 system 合并进去。

输入：

```typescript
{
  system: [
    "provider prompt + env + skills + instructions"
  ],
  messages: [
    {
      role: "user",
      content: [{ type: "text", text: "请读取 README.md 并总结" }]
    }
  ],
  tools: {
    read: Tool,
    ...
  }
}
```

输出给 provider 的 messages 大致是：

```typescript
[
  {
    role: "system",
    content: "provider prompt + env + skills + instructions"
  },
  {
    role: "user",
    content: [
      {
        type: "text",
        text: "请读取 README.md 并总结"
      }
    ]
  }
]
```

同时带上 tools schema。之后模型可能不会直接回答，而是发起工具调用：

```typescript
{
  type: "tool-call",
  toolCallId: "call_read_001",
  toolName: "read",
  input: {
    filePath: "README.md"
  }
}
```

**6. Processor 处理模型流事件**

processor 的事件处理在 [processor.ts](/Users/ljn/Documents/GitHub/opencode/packages/opencode/src/session/processor.ts:216)。

模型开始工具调用时，事件可能依次是：

```typescript
{ type: "start" }

{
  type: "start-step"
}

{
  type: "tool-input-start",
  id: "call_read_001",
  toolName: "read"
}

{
  type: "tool-call",
  toolCallId: "call_read_001",
  toolName: "read",
  input: {
    filePath: "README.md"
  }
}
```

processor 写入一个 ToolPart。

中间状态输出：

```typescript
{
  id: "part_tool_001",
  messageID: "msg_assistant_001",
  sessionID: "ses_001",
  type: "tool",
  tool: "read",
  callID: "call_read_001",
  state: {
    status: "running",
    input: {
      filePath: "README.md"
    },
    time: {
      start: 1710000002000
    }
  }
}
```

工具执行完成后，LLM stream 层发：

```typescript
{
  type: "tool-result",
  toolCallId: "call_read_001",
  output: {
    title: "README.md",
    metadata: {
      loaded: ["/repo/README.md"]
    },
    output: "# Mini Agent\n\nA minimal multi-agent runtime..."
  }
}
```

processor 调 `completeToolCall`，输出更新为：

```typescript
{
  id: "part_tool_001",
  type: "tool",
  tool: "read",
  callID: "call_read_001",
  state: {
    status: "completed",
    input: {
      filePath: "README.md"
    },
    output: "# Mini Agent\n\nA minimal multi-agent runtime...",
    title: "README.md",
    metadata: {
      loaded: ["/repo/README.md"]
    },
    time: {
      start: 1710000002000,
      end: 1710000002500
    }
  }
}
```

如果这一步模型 finish reason 是 `tool-calls`，第一轮 assistant message 大致变成：

```typescript
{
  info: {
    id: "msg_assistant_001",
    role: "assistant",
    parentID: "msg_user_001",
    finish: "tool-calls",
    tokens: { input: 1200, output: 80, ... }
  },
  parts: [
    {
      type: "step-start",
      snapshot: "snap_before_001"
    },
    {
      type: "tool",
      tool: "read",
      callID: "call_read_001",
      state: {
        status: "completed",
        input: { filePath: "README.md" },
        output: "# Mini Agent\n\nA minimal multi-agent runtime..."
      }
    },
    {
      type: "step-finish",
      reason: "tool-calls",
      snapshot: "snap_after_001",
      tokens: { ... }
    }
  ]
}
```

**7. 第二轮 loop：把工具结果送回模型**

因为上一轮有 tool call，loop 不退出。判断逻辑在 [prompt.ts](/Users/ljn/Documents/GitHub/opencode/packages/opencode/src/session/prompt.ts:1302)。

第二轮 `msgs` 输入：

```typescript
[
  {
    info: { role: "user", id: "msg_user_001" },
    parts: [
      { type: "text", text: "请读取 README.md 并总结" }
    ]
  },
  {
    info: {
      role: "assistant",
      id: "msg_assistant_001",
      finish: "tool-calls"
    },
    parts: [
      { type: "step-start" },
      {
        type: "tool",
        tool: "read",
        callID: "call_read_001",
        state: {
          status: "completed",
          input: { filePath: "README.md" },
          output: "# Mini Agent\n\nA minimal multi-agent runtime..."
        }
      },
      { type: "step-finish" }
    ]
  }
]
```

再次调用 `MessageV2.toModelMessagesEffect`，它会把工具 part 转成模型能理解的 tool output。关键逻辑在 [message-v2.ts](/Users/ljn/Documents/GitHub/opencode/packages/opencode/src/session/message-v2.ts:858)。

输出类似：

```typescript
[
  {
    role: "user",
    content: [
      {
        type: "text",
        text: "请读取 README.md 并总结"
      }
    ]
  },
  {
    role: "assistant",
    content: [
      {
        type: "tool-read",
        state: "output-available",
        toolCallId: "call_read_001",
        input: {
          filePath: "README.md"
        },
        output: "# Mini Agent\n\nA minimal multi-agent runtime..."
      }
    ]
  }
]
```

然后 `convertToModelMessages(...)` 会把它转成当前 provider 真正需要的格式。

第二轮请求输入：

```typescript
{
  system: ["provider/env/skills/instructions..."],
  messages: [
    {
      role: "user",
      content: "请读取 README.md 并总结"
    },
    {
      role: "assistant",
      toolCalls: [
        {
          toolCallId: "call_read_001",
          toolName: "read",
          input: { filePath: "README.md" }
        }
      ]
    },
    {
      role: "tool",
      toolCallId: "call_read_001",
      content: "# Mini Agent\n\nA minimal multi-agent runtime..."
    }
  ],
  tools: { read, write, edit, bash, ... }
}
```

**8. 第二轮模型生成最终文本**

模型现在基于 README 内容回答，stream events 可能是：

```typescript
{ type: "start-step" }

{ type: "text-start", id: "txt_001" }

{
  type: "text-delta",
  id: "txt_001",
  text: "README 介绍了 Mini Agent，它是一个..."
}

{
  type: "text-end",
  id: "txt_001"
}

{
  type: "finish-step",
  finishReason: "stop",
  usage: {
    inputTokens: 1800,
    outputTokens: 120
  }
}

{ type: "finish" }
```

processor 写入第二条 assistant message：

```typescript
{
  info: {
    id: "msg_assistant_002",
    role: "assistant",
    parentID: "msg_user_001",
    agent: "build",
    modelID: "gpt-5",
    providerID: "openai",
    finish: "stop",
    tokens: {
      input: 1800,
      output: 120,
      reasoning: 0,
      cache: {
        read: 0,
        write: 0
      }
    },
    time: {
      created: 1710000003000,
      completed: 1710000004500
    }
  },
  parts: [
    {
      type: "step-start",
      snapshot: "snap_before_002"
    },
    {
      type: "text",
      text: "README 介绍了 Mini Agent，它是一个最小化的多 agent runtime，包含工具调用、权限、会话存储、压缩和流式处理等能力。"
    },
    {
      type: "step-finish",
      reason: "stop",
      snapshot: "snap_after_002",
      tokens: {
        input: 1800,
        output: 120
      }
    }
  ]
}
```

**9. loop 判断结束**

回到 loop，看到：

```typescript
lastAssistant.finish = "stop"
hasToolCalls = false
lastUser.id < lastAssistant.id
```

满足退出条件：

```typescript
break
```

最终返回最后的 assistant message：

```typescript
{
  info: {
    id: "msg_assistant_002",
    role: "assistant",
    finish: "stop"
  },
  parts: [
    {
      type: "text",
      text: "README 介绍了 Mini Agent，它是一个最小化的多 agent runtime..."
    }
  ]
}
```

**整体流向压缩成一张图**

```latex
用户输入
  ↓
PromptInput
  ↓
createUserMessage
  输出：user message + text part
  ↓
保存到 session
  ↓
runLoop
  输入：filterCompactedEffect(sessionID) 得到历史 msgs
  ↓
resolve agent / model / tools
  ↓
创建空 assistant message
  ↓
构造上下文
  输入：msgs + env + skills + instructions
  输出：system[] + modelMsgs[]
  ↓
LLM.stream
  输出：tool-call / text / reasoning / finish-step 等事件
  ↓
SessionProcessor
  把事件写成 assistant parts：
  reasoning part / tool part / text part / step-start / step-finish
  ↓
如果 finish 是 tool-calls：继续下一轮 loop
如果 finish 是 stop：结束
```

# 3. 关键模块调用关系
<!-- 这是一个文本绘图，源码为：flowchart LR
    subgraph Core
        Index[index.ts] --> Cmd[CLI Commands]
        Cmd --> Server[server.ts]
        Server --> Runtime[app-runtime.ts]
    end

    subgraph Runtime_Modules
        Runtime --> Project[Project Instance]
        Runtime --> Config[Config Service]
        Runtime --> Session[Session Service]
        Runtime --> Provider[Provider Service]
        Runtime --> Tool[Tool Registry]
        Runtime --> Permission[Permission Service]
        Runtime --> MCP[MCP Client]
        Runtime --> LSP[LSP Client]
    end

    subgraph Execution_Flow
        Session --> Prompt[Prompt Loop]
        Prompt --> LLM[LLM Stream]
        LLM --> Tool
        LLM --> Provider
        Tool --> MCP
        Tool --> LSP
        Tool --> FS[File System]
    end

    subgraph Persistence
        Session --> DB[(SQLite)]
        DB --> Bus[Global Bus]
        Bus --> Server
    end -->
![](/images/posts/56b5df383b27.svg)

# 4.项目文件目录
顶层目录

| 目录 | 作用 |
| --- | --- |
| packages | 主要代码都在这里。 |
| sdks | 额外 SDK，目前有 VS Code 相关 SDK/扩展代码。 |
| specs | 设计规格文档。 |
| script | 仓库级脚本：发布、生成、版本、changelog、统计等。 |
| github | GitHub Action/发布相关工具包。 |
| infra | 云端基础设施定义，包含 app、console、enterprise、secret 等。 |
| nix | Nix 环境/构建相关配置。 |
| patches | 对第三方依赖的 patch。根 package.json 里通过 patchedDependencies 使用。 |
| .opencode | 这个项目自己的 opencode 配置：agent、skills、commands、themes、tools、plugins。 |
| .github | GitHub Actions、issue 模板、自定义 actions。 |
| .husky | Git hooks。 |
| .vscode, .zed | 编辑器配置。 |


  packages 目录

| 目录 | 作用 |
| --- | --- |
| packages/opencode | 核心项目。CLI、TUI、HTTP Server、Agent Runtime、工具系统、Provider、Session 都在这里 |
| packages/app | Web/Desktop 共用的 Solid + Vite 前端应用。通过 SDK 连 opencode server。 |
| packages/ui | 共享 UI 组件和资源。 |
| packages/sdk/js | JS SDK，由 packages/opencode 生成的 OpenAPI 再生成客户端代码。 |
| packages/web | Astro 官网/文档站。 |
| packages/desktop | Tauri 桌面端。 |
| packages/desktop-electron | Electron 桌面端。 |
| packages/core | 跨包共享工具：路径、文件系统、日志、flag、hash、glob 等。 |
| packages/plugin | 插件 API 类型和公开接口，外部插件会依赖这个包。 |
| packages/console | opencode 云端控制台相关代码：app、core、function、mail、resource。 |
| packages/function | 云端 API function 入口。 |
| packages/slack | Slack 集成。 |
| packages/containers | Docker/container 构建环境，如 base、bun-node、rust、tauri-linux。 |
| packages/storybook | UI 组件 Storybook。 |
| packages/docs | 文档素材、图片、snippets、essentials 等。 |
| packages/script | 内部脚本工具包。 |
| packages/extensions | 编辑器扩展相关，目前有 Zed。 |
| packages/enterprise | 企业版相关代码。 |
| packages/identity | 身份相关占位/模块目录。 |


  核心：packages/opencode

| 目录 | 作用 |
| --- | --- |
| packages/opencode/bin | opencode 命令行可执行入口。 |
| packages/opencode/src | Agent 系统核心源码。 |
| packages/opencode/test | 核心包测试。注意测试要在 package 目录跑，不要在 repo root 跑。 |
| packages/opencode/script | 构建、修复 node-pty、升级 OpenTUI、生成等脚本。 |
| packages/opencode/migration | 数据迁移相关。 |
| packages/opencode/specs | 核心包内部规格文档。 |


  Agent 内核：packages/opencode/src

| 目录 | 作用 |
| --- | --- |
| packages/opencode/src/cli | CLI/TUI 命令实现。 |
| packages/opencode/src/server | Hono HTTP server 和 API routes。 |
| packages/opencode/src/effect | Effect runtime、依赖注入、服务组装。 |
| packages/opencode/src/session | Agent 对话核心：prompt loop、message、processor、llm、compaction、summary、todo。 |
| packages/opencode/src/agent | 内置 agent 定义，如 build、plan、general、explore。 |
| packages/opencode/src/tool | 工具系统：bash、read、edit、write、grep、glob、task、webfetch、apply_patch 等。 |
| packages/opencode/src/provider | 模型 Provider 层，统一 OpenAI、Anthropic、Google、Copilot、OpenRouter 等。 |
| packages/opencode/src/permission | 工具权限系统：allow、deny、ask、always approve。 |
| packages/opencode/src/config | 配置 schema、配置加载、项目配置、全局配置、远程配置。 |
| packages/opencode/src/project | project/worktree/instance 解析和上下文管理。 |
| packages/opencode/src/storage | SQLite/Drizzle 存储层。 |
| packages/opencode/src/sync | 事件同步和 projector，把事件写入数据库并广播。 |
| packages/opencode/src/bus | 本地事件总线，驱动 UI/SDK/SSE 更新。 |
| packages/opencode/src/mcp | MCP server/client/tool/resource 集成。 |
| packages/opencode/src/lsp | Language Server Protocol 集成，提供诊断、定义、引用、符号等。 |
| packages/opencode/src/file | 文件读取、列表、搜索、二进制/图片判断等。 |
| packages/opencode/src/snapshot | Git-backed snapshot，用于记录和恢复编辑前后状态。 |
| packages/opencode/src/plugin | 插件加载、插件 hook、内置插件。 |
| packages/opencode/src/auth | 本地 provider/auth 凭证存储。 |
| packages/opencode/src/account | opencode 云账号、device login、org 配置等。 |
| packages/opencode/src/share | session 分享和远程同步。 |
| packages/opencode/src/command | slash command / 自定义命令模板。 |
| packages/opencode/src/format | edit/write 后的格式化。 |
| packages/opencode/src/git | Git 操作封装。 |
| packages/opencode/src/worktree | Git worktree 相关逻辑。 |
| packages/opencode/src/pty | 伪终端适配，支持 shell/TUI/命令执行。 |
| packages/opencode/src/shell | shell 检测和命令相关逻辑。 |
| packages/opencode/src/patch | patch/diff 相关处理。 |
| packages/opencode/src/skill | opencode skill 发现和加载。 |
| packages/opencode/src/question | Agent 向用户提问的交互机制。 |
| packages/opencode/src/control-plane | workspace/control plane 相关 API 和状态。 |
| packages/opencode/src/acp | Agent Client Protocol 支持。 |
| packages/opencode/src/v2 | v2 session/event/entry 相关实验或新版结构。 |
| packages/opencode/src/installation | 安装/环境检测相关。 |
| packages/opencode/src/ide | IDE 集成入口。 |
| packages/opencode/src/env | 环境变量处理。 |
| packages/opencode/src/id | ID 生成/类型。 |
| packages/opencode/src/util | 通用工具函数。 |


<!-- 这是一个文本绘图，源码为：flowchart LR
    CLI[cli / server] --> Runtime[effect runtime]
    Runtime --> Project[project / instance]
    Runtime --> Session[session prompt loop]
    Session --> Agent[agent config]
    Session --> LLM[session/llm]
    LLM --> Provider[provider]
    LLM --> Tools[tool registry]
    Tools --> Permission[permission]
    Tools --> File[file/git/lsp/mcp/shell]
    Session --> Storage[storage/sync]
    Storage --> Bus[bus events] -->
![](/images/posts/d7f64091f57d.svg)
