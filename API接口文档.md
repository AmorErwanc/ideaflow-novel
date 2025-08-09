# AI小说创作平台 API接口文档

## 概述
本文档详细记录了AI小说创作平台的4步API链式调用流程，包括每个接口的入参、出参结构以及webhook链传递机制。

## API调用链关系图
```
第1步: 生成脑洞 → 返回 firstWaithook
    ↓
第2步: 生成大纲 (使用 firstWaithook) → 返回 secondWaithook  
    ↓
第3步: 生成小说正文 (使用 secondWaithook) → 返回 thirdWaithook
    ↓
第4步: 生成互动脚本 (使用 thirdWaithook) → 返回纯文本脚本
```

---

## 第1步：生成脑洞 API

### 接口地址
```
https://n8n.games/webhook/bd608722-b6fc-46b7-92b8-bf72d4c991af
```

### 请求方式
`POST`

### 请求头
```json
{
    "Content-Type": "application/json"
}
```

### 入参结构
```javascript
{
    genre: string | null,        // 小说类型/需求描述，null表示随机生成
    plot_holes_count: number     // 脑洞数量 (1-15)
}
```

#### 入参示例
- **快速生成模式**：
```json
{
    "genre": null,
    "plot_holes_count": 10
}
```

- **自定义模式**：
```json
{
    "genre": "写一个关于未来世界人工智能与人类共存的科幻小说",
    "plot_holes_count": 5
}
```

### 出参结构
```javascript
// 支持两种格式：数组格式或对象格式

// 格式1: 数组格式
[
    {
        Novel_imagination: [    // 脑洞数组
            {
                number: number,                          // 脑洞编号
                synopsis: string,                        // 脑洞简介
                synopsisString: string,                  // 脑洞简介（兼容字段）
                zhihu_title: string,                     // 知乎体标题
                zhihu_titleString: string                // 知乎体标题（兼容字段）
            }
        ],
        first_waithook: string   // 下一步webhook地址（可能包含反引号和空格，需清理）
    }
]

// 格式2: 对象格式
{
    Novel_imagination: [...],    // 同上
    first_waithook: string       // 同上
}
```

#### 出参示例
```json
{
    "Novel_imagination": [
        {
            "number": 1,
            "synopsis": "在2045年，AI获得了情感能力...",
            "zhihu_title": "如何看待AI开始写诗这件事？"
        },
        {
            "number": 2,
            "synopsis": "量子计算机意外打开了平行宇宙的通道...",
            "zhihu_title": "如果平行宇宙真的存在，你最想见到哪个版本的自己？"
        }
    ],
    "first_waithook": "https://n8n.games/webhook/xxxxx-xxxxx-xxxxx"
}
```

### 数据处理注意事项
1. **Webhook清理**：`firstWaithook.replace(/[`\s]/g, '')` 去除反引号和空格
2. **字段兼容**：同时支持 `synopsis` 和 `synopsisString`，`zhihu_title` 和 `zhihu_titleString`
3. **数据格式**：自动判断是数组格式还是对象格式

---

## 第2步A：生成大纲 API

### 接口地址
使用第1步返回的 `firstWaithook` 地址

### 请求方式
`POST`

### 入参结构
```javascript
{
    choose: string | number,      // 选中的脑洞编号
    Boolean: true,               // true表示生成，false表示重新生成
    user_suggestions: string | null  // 用户优化建议
}
```

#### 入参示例
```json
{
    "choose": "2",
    "Boolean": true,
    "user_suggestions": null
}
```

### 出参结构
```javascript
// 支持两种格式

// 格式1: 数组格式
[
    {
        novel_outline: string | object,  // 大纲内容（可能是JSON字符串或对象）
        second_waithook: string          // 下一步webhook地址
    }
]

// 格式2: 对象格式
{
    novel_outline: string | object,      // 大纲内容
    // 或
    Novel_imagination: string | object,  // 大纲内容（兼容字段）
    second_waithook: string,             // 下一步webhook地址
    // 或
    waithook: string                     // 下一步webhook地址（兼容字段）
}
```

#### 大纲数据结构
```javascript
{
    opening: string,      // 起：开篇内容
    development: string,  // 承：发展内容
    climax: string,      // 转：高潮内容
    conclusion: string   // 合：结尾内容
}
```

#### 出参示例
```json
{
    "novel_outline": {
        "opening": "故事开始于2045年的东京...",
        "development": "主角发现了AI的秘密...",
        "climax": "当真相揭露的那一刻...",
        "conclusion": "最终，人类与AI达成了新的共识..."
    },
    "second_waithook": "https://n8n.games/webhook/yyyyy-yyyyy-yyyyy"
}
```

---

## 第2步B：重新生成脑洞 API

### 接口地址
使用第1步返回的 `firstWaithook` 地址

### 入参结构
```javascript
{
    choose: string | number | null,  // 当前选中的脑洞编号（可选）
    Boolean: false,                  // false表示重新生成
    user_suggestions: string | null  // 用户优化建议
}
```

#### 入参示例
```json
{
    "choose": null,
    "Boolean": false,
    "user_suggestions": "请生成更多科幻题材的脑洞"
}
```

### 出参结构
与第1步相同，返回新的脑洞列表

---

## 第3步A：生成小说正文 API

### 接口地址
使用第2步返回的 `secondWaithook` 地址

### 入参结构
```javascript
{
    Boolean: true,                   // true表示生成正文
    user_suggestions: string | null  // 用户优化建议
}
```

#### 入参示例
```json
{
    "Boolean": true,
    "user_suggestions": null
}
```

### 出参结构
```javascript
{
    novel_text: string,      // 小说正文内容
    third_waithook: string   // 下一步webhook地址
}
```

#### 出参示例
```json
{
    "novel_text": "第一章 觉醒\n\n清晨的阳光透过...",
    "third_waithook": "https://n8n.games/webhook/zzzzz-zzzzz-zzzzz"
}
```

---

## 第3步B：重新生成大纲 API

### 接口地址
使用第2步返回的 `secondWaithook` 地址

### 入参结构
```javascript
{
    Boolean: false,                  // false表示重新生成
    user_suggestions: string | null  // 用户优化建议
}
```

#### 入参示例
```json
{
    "Boolean": false,
    "user_suggestions": "请加强冲突部分的描写"
}
```

### 出参结构
与第2步A相同，返回新的大纲内容

---

## 第4步A：生成互动脚本 API

### 接口地址
使用第3步返回的 `thirdWaithook` 地址

### 入参结构
```javascript
{
    Boolean: true,                   // true表示生成脚本
    user_suggestions: string | null  // 用户优化建议
}
```

#### 入参示例
```json
{
    "Boolean": true,
    "user_suggestions": null
}
```

### 出参结构
```
纯文本格式的互动脚本内容（string类型）
```

#### 出参示例
```
场景一：东京街头
[背景音乐：城市噪音]

旁白：2045年的东京，霓虹灯下隐藏着不为人知的秘密...

角色A：你听说了吗？最近AI开始写诗了。
角色B：（惊讶）什么？这怎么可能？
...
```

---

## 第4步B：重新生成小说正文 API

### 接口地址
使用第3步返回的 `thirdWaithook` 地址

### 入参结构
```javascript
{
    Boolean: false,                  // false表示重新生成
    user_suggestions: string | null  // 用户优化建议
}
```

#### 入参示例
```json
{
    "Boolean": false,
    "user_suggestions": "请增加更多细节描写"
}
```

### 出参结构
```
纯文本格式的小说正文内容（string类型）
或
{
    novel_text: string  // 小说正文内容
}
```

---

## 通用规则与注意事项

### 1. Webhook URL处理
- 所有webhook URL需要清理：`url.replace(/[`\s]/g, '')`
- 每个步骤的webhook只能用于该步骤的后续操作

### 2. Boolean参数规则
- `true`：执行生成操作（前进到下一步）
- `false`：重新生成当前步骤内容

### 3. user_suggestions参数
- 可选参数，为null或空字符串时表示无优化建议
- 用于引导AI按特定方向生成或优化内容

### 4. 错误处理
- 所有API调用都需要try-catch包装
- HTTP状态码非200时抛出错误
- 返回数据格式不正确时抛出错误

### 5. 数据格式兼容性
- API可能返回数组格式或对象格式，需要兼容处理
- 某些字段有多个名称版本（如synopsis/synopsisString），需要兼容
- JSON字符串和对象都需要支持

### 6. 工作流状态管理
```javascript
workflowState = {
    ideasGenerated: false,    // 脑洞已生成
    outlineGenerated: false,  // 大纲已生成  
    novelGenerated: false,    // 小说已生成
    scriptGenerated: false    // 脚本已生成
}
```

### 7. 链式依赖限制
- 必须按顺序完成：脑洞 → 大纲 → 小说 → 脚本
- 任何步骤失败都需要从该步骤重新开始
- 不能跳过中间步骤

---

## 更新日志
- 2024-01-XX：初始版本，记录完整API调用链
- 文档基于 script.js 实际代码分析生成