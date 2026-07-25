---
title: "使用UI.Virsion RPA完成网页的重复性工作"
description: "可能是爬虫的下位替代？"
date: 2025-12-09
updated: 2025-12-14
category: "实用工具"
tags: ["UI.Virsion RPA","自动化工具"]
cover: "/images/covers/shader-light.webp"
coverAlt: "黑暗空间中的体积光与粒子表面"
featured: false
draft: false
---

# 告别重复劳动：使用UI.Vision RPA实现自动化操作

实习的时候遇到个很操蛋dirtywork，把十几个ai生成的项目每个界面截图，上传到公司的系统上，恶心的是系统没有做批量上传，上传还特别卡，人手动操作到后面都要睡着了。如是乎向ai求救。ai告诉我，我这种技术菜鸡很适合用RPA工具，连插件都是现成的。
一般操作网页的事，都会想到爬虫。爬虫和RPA在功能上还是有区别的。

| 特性 | 网络爬虫 | RPA工具 |
|------|---------|--------|
| **主要用途** | 从网站提取数据 | 模拟人类操作任何软件/网站 |
| **技术门槛** | 需要编程知识 | 低代码/无代码，可视化操作 |
| **操作范围** | 主要针对网页内容 | 桌面应用、网页、API、数据库等 |
| **稳定性** | 受网站结构变化影响大 | 相对稳定，可处理异常情况 |
| **开发速度** | 中等至慢 | 快速，可即时录制 |
| **典型工具** | Scrapy, BeautifulSoup | UI.Vision, UiPath, Automation Anywhere |

**关键区别**：爬虫像是“专业的数据采集专家”，而RPA更像是“全能的工作助理”，能够处理更广泛的工作流程。

## 最好用的插件：UI.Vision RPA？

UI.Vision为什么是神

1. **完全免费开源** - 无需支付高昂的许可费用
2. **轻量级** - 作为浏览器扩展，不占用大量系统资源
3. **跨平台** - 基于浏览器，可在不同操作系统上运行
4. **支持多种自动化** - Web自动化、桌面自动化、图像识别等
5. **易学易用** - 录制功能，你做一遍然后改点参数就能用了

## 实战案例：自动化文件上传系统

让我们通过一个实际场景来展示UI.Vision的强大功能：每天需要将50个产品图片上传到电商平台后台。

### 使用UI.Vision自动化方案：

#### 第一步：安装和设置
1. 在Chrome或Firefox商店搜索“UI.Vision”
2. 添加扩展程序到浏览器
3. 点击浏览器工具栏中的UI.Vision图标启动

#### 第二步：录制自动化脚本
```plaintext
// UI.Vision支持类似自然语言的命令
URL GOTO=https://example.com/admin/login
WAIT SECONDS=2
TEXT INPUT id=username CONTENT=myusername
TEXT INPUT id=password CONTENT=mypassword
CLICK id=login-btn
WAIT SECONDS=3

// 导航到产品管理页面
CLICK xpath=//a[contains(text(),"产品管理")]
WAIT SECONDS=2

// 循环处理每个产品
SET !LOOP 1
SET !DATASOURCE products.csv
SET !DATASOURCE_COLUMNS 3
SET !DATASOURCE_LINE {{!LOOP}}

// 读取CSV中的数据
SET productId EVAL("{{!COL1}}")
SET imagePath EVAL("C:/product_images/{{!COL2}}")
SET description EVAL("{{!COL3}}")

// 搜索产品
TEXT INPUT id=search-box CONTENT={{productId}}
CLICK id=search-btn
WAIT SECONDS=1

// 点击编辑按钮
CLICK xpath=//tr[contains(.,"{{productId}}")]//button[text()="编辑"]

// 上传图片
FILE UPLOAD id=image-upload CONTENT={{imagePath}}
WAIT SECONDS=2

// 填写描述
TEXT INPUT id=image-description CONTENT={{description}}

// 保存并返回
CLICK id=save-btn
WAIT SECONDS=2
CLICK id=back-btn
```

#### 第三步：创建数据文件（products.csv）
```csv
P001,product1.jpg,2023夏季新款红色连衣裙主图
P002,product2.jpg,男士休闲鞋侧面展示图
P003,product3.jpg,电子产品包装盒正面
```

#### 第四步：运行和调试
1. 在UI.Vision编辑器中打开脚本
2. 点击“运行”按钮开始执行
3. 观察自动化过程，必要时进行调整
4. 使用“慢速运行”模式调试问题点

## UI.Vision的核心功能总结

1. **Web自动化**：表单填写、点击、导航等
2. **图像识别**：基于视觉元素操作
3. **数据处理**：CSV/Excel读写、变量操作
4. **流程控制**：循环、条件判断、错误处理
5. **集成能力**：通过XHR命令调用API接口
6. **定时任务**：设置脚本定时自动执行

## 适用场景推荐

UI.Vision特别适合以下场景：
- 跨系统的数据搬运和同步
- 定期报告生成和邮件发送
- 网站监控和内容抓取
- 社交媒体自动发布
- 数据录入和迁移工作
- 软件测试自动化

