---
title: "React Native 开发环境搭建"
description: "总的来说，React Native 的开发流程步骤分为大4步： 1、安装依赖——Node 和 JDK。"
date: 2026-07-27
category: "移动开发"
tags: ["React Native","Android","Node.js","JDK"]
cover: "/images/posts/0d4bbdd6bfcc.webp"
coverAlt: "Node.js 安装页面"
featured: false
draft: false
---
前言：  
总的来说，React Native 的开发流程步骤分为大4步：  
1、安装依赖——Node 和 JDK。  
2、Android 开发环境——安装 Android Studio 、安装 Android SDK及配置环境变量、把一些工具目录添加到环境变量 Path 中。  
3、准备一台 Android 设备——使用 Android 真机 或者 Android 模拟器。  
4、创建一个项目

# **安装依赖**

配置环境时，所有路径都不要有中文和中文字符，包括开发项目的路径也不要出现中文

需要安装的依赖有：Node、JDK。

## Node安装

[Node.js下载](https://nodejs.org/zh-cn/download)

注意 Node 的版本应大于等于 20.19.4

![](/images/posts/0d4bbdd6bfcc.webp)

### 安装步骤

1、双击下载后的安装包，如下所示：

![](/images/posts/d9e05cfa6070.webp)

2、点击以上的 Next 按钮，将出现如下界面：

![](/images/posts/7bf3e295b768.webp)

3、勾选接受协议选项，点击 Next 按钮 :

![](/images/posts/4a399313ec6c.webp)

4、Node.js默认安装目录为 "本地路径 Files\nodejs\" , 你可以修改目录，并点击 Next 按钮：

![](/images/posts/0636a3e2d42e.webp)

5、点击 Install（安装） 开始安装 Node.js，你也可以点击 Back（返回）来修改先前的配置：

![](/images/posts/2c6ff6197ae4.webp)

点击 Finish（完成）按钮退出安装向导。

![](/images/posts/0be8bbcf7eb3.webp)

安装完成后，我们可以在命令行或 Windows Powershell 中执行以下命令来测试：

```
node -v
```

![](/images/posts/ca5c7cdd4c91.webp)

如果你获得以上输出结果，说明你已经成功安装了Node.js。

## JDK安装

React Native 需要 Java Development Kit [JDK] 17。

[JDK17下载](https://download.oracle.com/java/17/archive/jdk-17_windows-x64_bin.exe)

### 安装步骤

![](/images/posts/fdc1cfc1e528.webp)![](/images/posts/88204e9146fd.webp)  
![](/images/posts/777c9641fe1d.webp)

安装完成后，我们可以在命令行或 Windows Powershell 中执行以下命令来测试：

```
javac -version
```

![](/images/posts/9ec3240a71a7.webp)

如果你获得以上输出结果，说明你已经成功安装了JDK17。

如果没有输出，可能是环境变量没有配置

以Windows11为例配置环境变量，Windows10有路径有些许不同，请自行百度

此电脑—>查找设置—>环境变量

![](/images/posts/b75475b3d186.webp)

![](/images/posts/51646b52247f.webp)

![](/images/posts/ab6a200c3bfc.webp)

![](/images/posts/ec9f8106df2e.webp)

# 配置Android 开发环境

请注意！！！国内用户必须必须必须有稳定的**代理软件**，否则在下载、安装、配置过程中会不断遭遇链接超时或断开，无法进行开发工作。某些代理软件可能只提供浏览器的代理功能，或只针对特定网站代理等等，请自行研究配置或更换其他软件。如果报错中出现有网址，是因为链接源仓库的网络链接被阻断了，这一阻断现象可能因时间、地区、运营商而不同。

如果没有，使用以下替代方案（未实践，不保证成功）

**hosts 文件配置（加速 Google/Gradle 依赖下载）**

**文件位置：**

`本地路径`

**添加内容：**

# Google 下载服务加速  
180.163.151.161 dl.google.com  
180.163.151.161 dl.l.google.com  
180.163.151.161 dl-ssl.google.com  
# Gradle 服务加速  
104.16.73.101 services.gradle.org

如安装超时，请用 [chinaz测速](https://ping.chinaz.com/services.gradle.org) 检查 IP 可用性，并替换为可访问的 IP。

## 安装 Android Studio

[Android Studio下载地址](https://developer.android.google.cn/studio?hl=zh-cn)  
![](/images/posts/92d8cc57d5bb.webp)

一路Next，最后Install。如果C盘位置不够，放在D盘也可以的。这个东西几十个G，注意留好空间。

![](/images/posts/765a4f67f324.webp)

![](/images/posts/76b94c9c3b5d.webp)

![](/images/posts/5839fca206ae.webp)

![](/images/posts/daa0a4e9e21d.webp)

![](/images/posts/c5bfd18de51e.webp)

## 安装SDK

![](/images/posts/6376fd657ca1.webp)

![](/images/posts/a7fc540b8c6c.webp)

在 SDK Manager 中选择"SDK Platforms"选项卡，然后在右下角勾选"Show Package Details"。展开`Android 15 (VanillaIceCream)`选项，确保勾选了下面这些组件（如果你看不到这个界面，则需要使用稳定的代理软件）：

- `Android SDK Platform 35`
- `Intel x86 Atom_64 System Image`

然后点击"SDK Tools"选项卡，同样勾中右下角的"Show Package Details"。展开"Android SDK Build-Tools"选项，确保选中了 React Native 所必须的`35.0.0`版本。你可以同时安装多个其他版本。

（以上版本可能会随React Native版本变动，请根据项目所用版本进行调整）

![](/images/posts/7064d5ff96c9.webp)

![](/images/posts/0a564a0d1c1b.webp)

## 环境配置

React Native 需要通过环境变量来了解你的 Android SDK 装在什么路径，从而正常进行编译。

此电脑—>查找设置—>环境变量，打开环境变量

- 新增 `ANDROID_HOME`，指向 SDK 安装目录（如 `本地路径`）
- 新增 `ANDROID_SDK_ROOT`，指向 SDK 安装目录（如 `本地路径`）

![](/images/posts/ba901cf509ae.webp)

- 将 `%ANDROID_HOME%\platform-tools`、`%ANDROID_HOME%\emulator`、`%ANDROID_HOME%\tools`、`%ANDROID_HOME%\tools\bin` 添加到 `Path`

![](/images/posts/5411547e513d.webp)

配置完成后，打开cmd输入

```
adb --version
```

检验是否完成配置

![](/images/posts/c587ed714a2b.webp)

# **Android 设备准备（使用MuMu模拟器）**

[MuMu模拟器下载](https://mumu.163.com/)  
下载完成后打开，新建一个设备，在启动项目时打开该设备

![](/images/posts/0cad8b9c3f30.webp)

# 创建并启动一个项目

如果你之前全局安装过旧的`react-native-cli`命令行工具，请使用`npm uninstall -g react-native-cli`卸载掉它以避免一些冲突：

```
npm uninstall -g react-native-cli @react-native-community/cli
```

**注意事项一**：请`不要`在目录、文件名中使用`中文、空格`等特殊符号。请`不要`单独使用常见的关键字作为项目名（如 class, native, new, package 等等）。请`不要`使用与核心模块同名的项目名（如 react, react-native 等）。

**注意事项二**：请`不要`在某些权限敏感的目录例如 System32 目录中 init 项目！会有各种权限限制导致不能运行！

**注意事项三**：请`不要`使用一些移植的终端环境，例如`git bash`或`mingw`等等，这些在 windows 下可能导致找不到环境变量。请使用系统自带的命令行（CMD 或 powershell）运行。

使用 React Native 内建的命令行工具来创建一个名为"demo"的新项目。这个命令行工具不需要安装，可以直接用 node 自带的`npx`命令来使用：

可以使用`--version`参数创建指定版本的项目。注意版本号必须精确到两个小数点。

```
npx react-native init demo
# 进入项目目录
cd demo
npm install
# 连接安卓模拟器（确保已打开一个MuMu设备）
adb connect 127.0.0.1:7555
# 运行 Android 应用
npm run android
```
