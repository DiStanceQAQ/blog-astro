---
title: "OpenCode 源码解析：一些概念"
description: "梳理理解 OpenCode 源码所需的运行时、LSP、ACP 与 Effect 等概念。"
date: 2026-07-27
category: "源码解析"
tags: ["OpenCode","Effect","LSP","ACP"]
cover: "/images/covers/default.webp"
coverAlt: "默认技术封面"
featured: false
draft: false
---
## 运行时
**运行时 = 支撑它运行的“底层执行环境”**

**它负责：**

+ **管理内存、对象、线程/任务**
+ **调度代码执行顺序（同步/异步）**
+ **提供基础功能（例如 `console.log`、`setTimeout`、文件读写等）**
+ **处理错误，清理资源**

**不同语言/平台有不同运行时：**

+ **Node.js 运行时：让 JavaScript 能够操作文件、网络、进程。**
+ **浏览器运行时：提供 DOM、Web API。**
+ **Java 运行时（JVM）：管理类加载、垃圾回收、线程。**

**OpenCode 项目中的 Effect 运行时**

OpenCode 使用了 Effect（一个 TypeScript 的效应系统，类似 Rust 的 `async` + 依赖注入 + 错误管理）。它的运行时是这个项目的“神经中枢”。

**a. 依赖注入 & 服务组装**

+ 你需要 `Session` 服务吗？运行时自动创建并注入。
+ `ToolRegistry` 需要依赖 `Permission` 和 `FileSystem`？运行时保证它们按正确顺序创建。
+ 不同的环境（生产 / 测试）可以替换不同的实现（比如用内存数据库代替 SQLite）。

**b. 异步任务调度**

+ 当 LLM 流式返回文本时，运行时负责调度“把文本块写入会话存储”和“通过 SSE 推送给客户端”等并发任务。
+ 执行多个工具（比如同时读三个文件）时，运行时决定哪些可以并行、哪些必须串行。

**c. 资源生命周期管理**

+ 每个会话需要占用 MCP 子进程、LSP 服务器、文件监视器等。运行时确保当会话结束时，自动关闭这些资源（避免遗留进程）。
+ 类似 `try/finally` 但更自动，避免忘记清理。

**d. 错误传播与恢复**

+ 调用模型 API 可能失败（网络超时、限流）– 运行时可以自动重试或回退到另一个模型。
+ 工具执行抛出异常（比如文件不存在）– 运行时捕获后会把错误转为结构化的 `ToolResult` 返回给 LLM，而不是让整个会话崩溃。

**e. 作用域与 Fiber**

+ Effect 运行时有一个核心概念 Fiber（轻量级线程/协程）。每个并发任务是一个 Fiber，运行时调度它们。
+ 例如：用户按 Ctrl+C 中断会话，运行时可以立即取消所有相关的 Fiber（正在执行的 LLM 请求、工具调用等），并清理资源。

可以把 Effect 运行时 想象成 Node.js 之上的“高级引擎”。Node.js 提供了最基础的 `fs.readFile`，Effect 运行时则提供了如何安全地组合、重试、超时、清理这些操作。

## LSP
[深入理解LSP Understanding Language Server Protocol](https://zhuanlan.zhihu.com/p/1890892177544021181)

## **ACP**
[初识 ACP （Agent Client Protocol）](https://zhuanlan.zhihu.com/p/1975252550799335647)

## Host  Client  Server
+ **Host（主机）**：泛指任何连接到网络的设备（如电脑、手机、服务器等），拥有自己的 IP 地址。它既可以充当客户端，也可以充当服务器，或者同时承担两种角色。
+ **Client（客户端）**：主动发起请求的一方。它向服务器请求服务或资源，例如浏览器请求网页、手机 App 获取数据。客户端通常运行在用户设备上。
+ **Server（服务器）**：被动提供服务的一方。它持续运行并监听网络，等待客户端的请求，然后返回响应（如网页内容、文件、计算结果）。服务器通常具有更强的性能和稳定性。


## Effect
`effect`是一个TypeScript 函数式运行时库。它把一次计算表示成一个值：

```typescript
Effect<A, E, R>
```

含义大致是：成功返回 `A`，可能以类型化错误 `E` 失败，运行时需要环境/服务 `R`。

在 opencode 里，它主要是为这些问题设计的：

1. **复杂副作用太多**
opencode 要处理文件系统、Git、LLM HTTP/WebSocket、LSP、PTY、插件、事件总线、项目实例等。普通 `async/await` 很容易把依赖、错误、资源释放散落在各处。Effect 把这些副作用显式建模，从而实现可追溯。
2. **依赖注入和运行时组合**
各模块通过 `Context.Service` 声明服务，通过 `Layer` 提供实现。例如 `AppLayer` 把文件系统、Bus、Config、Session、LLM、MCP 等服务组合成一个应用运行时。
3. **资源生命周期**
订阅、进程、实例、文件锁这类资源需要可靠清理。Effect 的 `Scope`、`finalizer`、`Effect.scoped` 能保证成功、失败、取消时都能释放。CLI 命令包装器里也显式保证 instance dispose。
4. **类型化错误**
例如 CLI 错误、文件系统错误用 `Schema.TaggedErrorClass` 建模，而不是到处抛普通 `Error`。这样调用方可以区分“用户可见失败”和“程序缺陷”。
5. **并发与流**
Bus 用 `PubSub`、`Stream`、`Deferred` 实现事件订阅和测试同步。

它的优势是：依赖更清楚，错误更可控，资源释放更可靠，测试更容易替换环境，并且可以把日志、追踪、重试等横切能力统一挂到运行时上。例如 opencode 的 `AppRuntime` 会自动合入 observability layer。

一句话概括：opencode 用 Effect 把“会失败、要依赖服务、要清理资源的异步程序”从散落的 Promise 代码，提升成可组合、可测试、可观测的应用运行模型。
