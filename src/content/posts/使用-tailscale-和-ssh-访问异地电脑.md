---
title: "使用 Tailscale 和 SSH 访问异地电脑"
description: "目标是让 Codex 能直接读取台式机上的文件。台式机系统是 Windows 10，当前 Codex 运行在另一台MAC机器上，两台电脑不在同一个局域网内。 一开始尝试直接通过 Win10 的本地 IP 连接："
date: 2026-07-27
category: "工具实践"
tags: ["工具实践","网络","远程访问"]
cover: "/images/covers/performance-lines.webp"
coverAlt: "使用 Tailscale 和 SSH 访问异地电脑封面"
featured: false
draft: false
---
## 背景

目标是让 Codex 能直接读取台式机上的文件。台式机系统是 Windows 10，当前 Codex 运行在另一台MAC机器上，两台电脑不在同一个局域网内。

最终方案是：

- Win10 台式机开启 OpenSSH Server
    
- 两台设备加入同一个 Tailscale 网络
    
- Codex 通过台式机的 Tailscale IP 使用 SSH 访问

## 遇到的问题

一开始尝试直接通过 Win10 的本地 IP 连接：

ssh amin@【目标机器ip】

端口测试结果：

nc: connectx to 【目标机器ip】 port 22 (tcp) failed: Operation timed out

原因是两台电脑不在同一个局域网内。

## 为什么需要 Tailscale

因为两台电脑不在同一个局域网，直接访问台式机内网 IP 不可行。Tailscale 会给每台设备分配一个 `100.x.x.x` 的虚拟专网 IP，让不同网络下的设备也能像在同一个私有网络里一样互相访问。

台式机的 Tailscale IP 是：

100.113.150.90

Codex 侧测试 SSH 端口：

nc -vz -w 5 100.113.150.90 22

成功结果：

Connection to 100.113.150.90 port 22 [tcp/ssh] succeeded!

说明网络已经打通，SSH 服务也能被访问。

## 最终连接命令

从 Codex 所在机器连接 Win10 台式机：

ssh amin@【目标机器ip】

如果是第一次连接，会提示确认 fingerprint，输入：

yes

然后输入 Windows 用户 `amin` 的登录密码。

## 让 Codex 读取远程文件

可以让 Codex 先用只读命令列目录，例如：

ssh amin@100.113.150.90 "dir 本地路径

或者读取某个文件：

ssh amin@100.113.150.90 "type 本地路径

如果路径里有空格，需要注意引号，例如：

ssh amin@100.113.150.90 "dir \"本地路径 Documents\""
