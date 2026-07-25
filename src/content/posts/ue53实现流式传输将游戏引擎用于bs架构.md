---
title: "UE5.3实现流式传输，将游戏引擎用于B/S架构"
description: "UE5.3实现流式传输，将游戏引擎用于B/S架构"
date: 2026-01-17
updated: 2026-01-17
category: "三维可视化"
tags: ["UE","Cesium for UE"]
cover: "/images/covers/spatial-web.webp"
coverAlt: "黑暗空间中的粒子与空间网格"
featured: true
draft: false
---

虚幻引擎打包后创建的是exe程序，无法用在B/S架构。想要在web中显示UE创建的场景，目前有两种方案。

## WebAssembly方案

WebAssembly（简称 WASM）是一种底层的二进制格式，旨在让代码像 C++ 一样在浏览器中高速运行，从而突破 JavaScript 的性能瓶颈。它允许开发者使用 C、C++、Rust 等高性能编程语言编写代码，并将其编译为浏览器可执行的机器码。

目前官方已经停止了对这种方案的支持[UE5 Export to HTML5](https://forums.unrealengine.com/t/ue5-export-to-html5/1625616)，能够实现的版本停留在4.24。目前仍有一些第三方公司提供了解决方案，但其可靠性不能保证，且这种方案只适合小型demo，不建议选择。

## Pixel Streaming流式传输方案

**Pixel Streaming** 是一种**远程渲染流媒体技术**，将Unreal Engine应用渲染的视频流实时传输到浏览器。它本质上是一个**交互式视频流系统**。

### 架构组成

![image.png](/images/posts/331230ac2177.webp)

![image.png](/images/posts/43dbe24298b9.webp)

### 数据流向：


![image.png](/images/posts/085280c227fd.webp)



### 参考实现方式

[虚幻引擎中的像素流送入门 | 虚幻引擎 5.3 文档 | Epic Developer Community](https://dev.epicgames.com/documentation/zh-cn/unreal-engine/getting-started-with-pixel-streaming-in-unreal-engine?application_version=5.3#5-%E8%87%AA%E8%A1%8C%E5%B0%9D%E8%AF%95)

[虚幻UE 插件-像素流送实现和优化_ue5.3像素流-CSDN博客](https://blog.csdn.net/weixin_45865901/article/details/135858031)

