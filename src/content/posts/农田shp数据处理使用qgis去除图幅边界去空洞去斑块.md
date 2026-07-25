---
title: "【农田shp数据处理】使用QGIS去除图幅边界，去空洞，去斑块"
description: "QGIS实操"
date: 2026-01-13
updated: 2026-01-17
category: "实用工具"
tags: ["论文阅读","QGIS"]
cover: "/images/covers/editorial-architecture.webp"
coverAlt: "冷色光线穿过几何建筑空间"
featured: false
draft: false
---

数据是：[2020年中国高精度耕地范围矢量数据](https://zenodo.org/records/14726428)  


## 一、目的

解决原始面要素数据中存在的 **几何无效、碎斑块、空洞以及边界锯齿严重** 等问题。

![image.png](/images/posts/25eadec4d7a4.webp)
---

## 三、实验方法与流程

### 3.1 投影转换

为保证面积和距离计算的准确性，将原始经纬度坐标系数据投影到合适的米制投影：

**EPSG: WGS 84 / UTM Zone 42–45N（根据数据所在经度选择）**
![image.png](/images/posts/5e5e4695cd0d.webp)

![image.png](/images/posts/ac10770c0aaa.webp)
---

### 3.2 修复几何（Fix geometries）

对投影后的面要素执行几何修复，解决自相交、重复节点、环方向错误等问题，确保几何有效性，为后续空间运算提供稳定输入。

![image.png](/images/posts/d5036fa53754.webp)

---

### 3.3 缓冲区处理

对修复后的面要素执行 **1 m 正缓冲**：

+ 消除极窄缝隙
+ 增强面之间的连通性
+ 为后续拆分和合并创造连续边界条件


![image.png](/images/posts/9367cbf89b6f.webp)

![image.png](/images/posts/1b50c0f4d125.webp)

![image.png](/images/posts/d7828be8ec7c.webp)
这里如果对大小很敏感，可以再-1的缓冲区缩小回去，我这个不是很敏感，就直接省去了

---

### 3.4 多部件转单部件

使用 **Multipart to Singleparts** 工具：

+ 将 MultiPolygon 拆分为多个独立 Polygon
+ 实现“一块面对应一条属性记录”
+ 为面积统计和筛选提供基础

![image.png](/images/posts/028f7b026264.webp)
---

### 3.5 面积计算与筛选

1. 利用字段计算器计算面要素面积（单位：m²）
2. 根据面积阈值：
   - 删除明显小于最小制图单元的小斑块
   - 减少噪声要素
   - 保留主体空间格局

这里我是用argis做的，qgis算面积不知道为甚算出来是null

---

### 3.6 删除空洞（Delete holes）

对筛选后的面要素执行空洞清理：

+ 删除小于阈值的内部空洞
+ 修复因删除碎斑或缓冲操作产生的孔洞
+ 提高面要素的完整性与连贯性


![image.png](/images/posts/a81dfaa2a47c.webp)

---

### 3.7 边界简化

采用几何简化方法对最终面要素进行边界优化：

+ 简化算法：Douglas–Peucker
+ 简化参数（Tolerance）：**10 m**
+ 简化目标：
  - 减少冗余节点
  - 消除栅格转面产生的锯齿边缘
  - 降低 GeoJSON 数据体量

![image.png](/images/posts/2e24703b6ebe.webp)

---

## 四、实验流程总结与对比

实验整体流程如下：

**原始 shp  
****→ 投影至 WGS 84 / UTM Zone 42–45N  
****→ 修复几何  
****→ 1 m 缓冲区  
****→ 多部件转单部件  
****→ 面积计算与小斑块删除  
****→ 删除空洞  
****→ 边界简化（10 m）**

