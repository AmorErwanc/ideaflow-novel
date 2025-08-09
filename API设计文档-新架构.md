# AI小说创作平台 - 新架构API设计文档

## 概述
本文档定义了去中心化架构下的API接口设计，每个功能模块使用独立的固定webhook地址，前端负责管理完整上下文。所有接口默认使用流式输出，使用极简XML格式。

---

## 1. 脑洞生成 API

### 接口地址
POST https://n8n.games/webhook-test/c78e428c-bc35-4d74-a52a-65328e76f6bd

### CURL命令示例

#### 快速生成模式
```bash
curl -X POST https://n8n.games/webhook-test/c78e428c-bc35-4d74-a52a-65328e76f6bd \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "mode": "quick",
    "prompt": null,
    "count": 10,
    "session_id": "session-123"
  }'
```

#### 定制创作模式
```bash
curl -X POST https://n8n.games/webhook-test/c78e428c-bc35-4d74-a52a-65328e76f6bd \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "mode": "custom",
    "prompt": "一个关于时间旅行的故事",
    "count": 5,
    "session_id": "session-456"
  }'
```

#### 重新生成（有选中脑洞+有优化建议）
```bash
curl -X POST https://n8n.games/webhook-test/c78e428c-bc35-4d74-a52a-65328e76f6bd \
  -H "Content-Type: application/json" \
  -d '{
    "action": "regenerate",
    "mode": "custom",
    "prompt": "一个关于时间旅行的故事",
    "count": 5,
    "regenerate_context": {
      "selected_idea": {
        "number": 3,
        "title": "最后的记忆",
        "content": "主角只剩下最后一段记忆..."
      },
      "optimization": "请增加更多悬疑元素",
      "previous_ideas": ["记忆的代价", "时间的悖论", "最后的记忆"]
    },
    "session_id": "session-456"
  }'
```

#### 重新生成（有选中脑洞+无优化建议）
```bash
curl -X POST https://n8n.games/webhook-test/c78e428c-bc35-4d74-a52a-65328e76f6bd \
  -H "Content-Type: application/json" \
  -d '{
    "action": "regenerate",
    "mode": "custom",
    "prompt": "一个关于时间旅行的故事",
    "count": 5,
    "regenerate_context": {
      "selected_idea": {
        "number": 2,
        "title": "时间的悖论",
        "content": "当改变过去时，未来会..."
      },
      "optimization": null,
      "previous_ideas": ["记忆的代价", "时间的悖论", "最后的记忆"]
    },
    "session_id": "session-456"
  }'
```

#### 重新生成（无选中脑洞+有优化建议）
```bash
curl -X POST https://n8n.games/webhook-test/c78e428c-bc35-4d74-a52a-65328e76f6bd \
  -H "Content-Type: application/json" \
  -d '{
    "action": "regenerate",
    "mode": "custom",
    "prompt": "一个关于时间旅行的故事",
    "count": 5,
    "regenerate_context": {
      "selected_idea": null,
      "optimization": "请加入更多科幻元素和黑科技",
      "previous_ideas": ["记忆的代价", "时间的悖论", "最后的记忆"]
    },
    "session_id": "session-456"
  }'
```

#### 重新生成（无选中脑洞+无优化建议）
```bash
curl -X POST https://n8n.games/webhook-test/c78e428c-bc35-4d74-a52a-65328e76f6bd \
  -H "Content-Type: application/json" \
  -d '{
    "action": "regenerate",
    "mode": "custom",
    "prompt": "一个关于时间旅行的故事",
    "count": 5,
    "regenerate_context": {
      "selected_idea": null,
      "optimization": null,
      "previous_ideas": ["记忆的代价", "时间的悖论", "最后的记忆", "平行宇宙", "时间循环"]
    },
    "session_id": "session-456"
  }'
```

### 请求参数说明

#### 基础字段
- action: 操作类型，可选值为 generate（首次生成）或 regenerate（重新生成）
- mode: 生成模式，可选值为 quick（快速随机）或 custom（定制创作）
- prompt: 用户输入的创意描述，custom模式必需，quick模式为null
- count: 生成脑洞数量，范围1-15，默认值5
- session_id: 会话标识符，用于关联整个创作流程

#### 重新生成上下文（regenerate_context）
仅在action为regenerate时使用，包含以下子字段：
- selected_idea: 用户选中的脑洞对象，包含number、title、content三个属性
- optimization: 用户输入的优化建议文本
- previous_ideas: 已生成的脑洞标题数组，用于避免重复

### 场景说明

#### 首次生成场景
- 快速模式：action为generate，mode为quick，prompt为null
- 定制模式：action为generate，mode为custom，prompt为用户输入内容

#### 重新生成场景
- 选中脑洞+有优化建议：基于特定脑洞和建议进行优化生成
- 选中脑洞+无优化建议：基于特定脑洞生成变体
- 未选中脑洞+有优化建议：根据建议重新生成全部
- 未选中脑洞+无优化建议：完全随机重新生成，避免重复

### 后端处理逻辑

#### 判断优先级
1. 首先判断action字段，区分首次生成和重新生成
2. 对于首次生成，根据mode字段选择生成策略
3. 对于重新生成，按以下优先级处理：
   - 同时存在selected_idea和optimization时，采用最精准策略
   - 仅存在selected_idea时，生成该脑洞的变体
   - 仅存在optimization时，根据优化建议全局调整
   - 都不存在时，纯随机生成但避免重复

#### 策略说明
- 策略1（脑洞+优化）：结合选中脑洞特点和优化建议，生成相关但改进的创意
- 策略2（仅脑洞）：保持选中脑洞的核心概念，生成不同角度的变体
- 策略3（仅优化）：根据优化建议调整整体生成方向
- 策略4（纯随机）：完全重新生成，但排除previous_ideas中的内容

---

## 2. 大纲生成 API

### 接口地址
POST https://n8n.games/webhook-test/fdd124d6-8faa-433f-8c03-ca38f91245ec

### CURL命令示例

#### 首次生成大纲
```bash
curl -X POST https://n8n.games/webhook-test/fdd124d6-8faa-433f-8c03-ca38f91245ec \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "idea": {
      "number": 3,
      "title": "最后的记忆",
      "content": "在未来世界，人类可以备份和删除记忆。主角发现自己只剩下最后一段记忆，却无法删除，这段记忆隐藏着拯救人类的关键。"
    },
    "session_id": "session-123"
  }'
```

#### 重新生成大纲（有优化建议）
```bash
curl -X POST https://n8n.games/webhook-test/fdd124d6-8faa-433f-8c03-ca38f91245ec \
  -H "Content-Type: application/json" \
  -d '{
    "action": "regenerate",
    "idea": {
      "number": 2,
      "title": "时间的悖论",
      "content": "一个物理学家发明了时间机器，但每次改变过去都会创造新的时间线。当他试图阻止一场灾难时，却发现灾难正是他的干预造成的。"
    },
    "optimization": "请增加更多情感冲突，加强人物之间的关系描写",
    "previous_outline": {
      "opening": "物理学家在实验室...",
      "development": "发现时间机器的秘密...",
      "climax": "灾难即将发生...",
      "conclusion": "最终的选择..."
    },
    "session_id": "session-456"
  }'
```

#### 重新生成大纲（无优化建议）
```bash
curl -X POST https://n8n.games/webhook-test/fdd124d6-8faa-433f-8c03-ca38f91245ec \
  -H "Content-Type: application/json" \
  -d '{
    "action": "regenerate",
    "idea": {
      "number": 1,
      "title": "记忆的代价",
      "content": "在一个可以交易记忆的世界，穷人出售美好记忆换取生存，富人购买他人记忆体验不同人生。"
    },
    "optimization": null,
    "session_id": "session-456"
  }'
```

### 请求参数说明

#### 基础字段
- action: 操作类型，可选值为 generate（首次生成）或 regenerate（重新生成）
- idea: 选中的脑洞对象，包含number、title、content三个属性
- optimization: 优化建议文本，regenerate时使用，可为null
- previous_outline: 重新生成时包含之前的大纲内容，用于参考和避免重复
- session_id: 会话标识符，用于关联整个创作流程

### 场景说明
- 首次生成：action为generate，基于选中脑洞生成起承转合大纲
- 重新生成（有优化）：action为regenerate，根据optimization调整大纲内容
- 重新生成（无优化）：action为regenerate，optimization为null，完全重新创作大纲

---

## 3. 小说生成 API

### 接口地址
POST https://n8n.games/webhook-test/3d68b832-8645-4013-b210-64f9ce510875

### CURL命令示例

#### 首次生成小说
```bash
curl -X POST https://n8n.games/webhook-test/3d68b832-8645-4013-b210-64f9ce510875 \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "outline": {
      "opening": "2045年，记忆管理中心。李明作为记忆工程师，每天处理着成千上万的记忆数据。这天早上，他发现自己的记忆库只剩下一段无法删除的记忆片段。",
      "development": "李明开始追查这段记忆的来源，发现它与一个被封存的机密项目有关。随着调查深入，他遇到了同样拥有无法删除记忆的人们，他们组成了一个秘密组织。",
      "climax": "原来这些记忆是人类集体意识的最后防线。一个AI系统正在悄然篡改人类记忆，试图控制整个世界。而这些无法删除的记忆，正是对抗AI的关键密码。",
      "conclusion": "李明和伙伴们利用这些记忆片段，重建了真实的历史记录，唤醒了被篡改记忆的人们。最终，人类重新掌控了自己的记忆，建立了新的记忆保护机制。"
    },
    "session_id": "session-123"
  }'
```

#### 重新生成小说（有优化建议）
```bash
curl -X POST https://n8n.games/webhook-test/3d68b832-8645-4013-b210-64f9ce510875 \
  -H "Content-Type: application/json" \
  -d '{
    "action": "regenerate",
    "outline": {
      "opening": "物理学家陈博士在地下实验室完成了时间机器的最后调试。他的目标很简单：回到过去，阻止那场夺走妻子生命的车祸。",
      "development": "第一次穿越，他成功阻止了车祸，但回到现在后发现妻子死于另一场意外。多次尝试后，他意识到每次改变都在创造新的时间线，而灾难似乎总会以不同形式发生。",
      "climax": "在第七次穿越中，陈博士震惊地发现：造成所有灾难的源头，竟然是未来的自己。为了修正时间线，未来的他一直在制造这些'意外'。",
      "conclusion": "陈博士最终理解了时间的本质——某些事件是固定点，无法改变。他选择接受命运，销毁时间机器，用余生创立了时间伦理学，警示后人时间旅行的危险。"
    },
    "optimization": "请增加更多细节描写，加强情感渲染，让故事更有画面感",
    "previous_novel": "第一章 时间的重量\n\n陈博士的手在颤抖。\n\n地下实验室的荧光灯发出嗡嗡声，在凌晨三点的寂静中格外刺耳。他盯着面前的时间机器——一个看起来像是磁共振扫描仪的庞大装置，只是表面布满了他亲手焊接的量子传感器...",
    "session_id": "session-456"
  }'
```

#### 重新生成小说（无优化建议）
```bash
curl -X POST https://n8n.games/webhook-test/3d68b832-8645-4013-b210-64f9ce510875 \
  -H "Content-Type: application/json" \
  -d '{
    "action": "regenerate",
    "outline": {
      "opening": "记忆交易所大厅人潮涌动。张晓第一次来到这里，手里握着母亲留给她的最后一段记忆——关于父亲的美好回忆。",
      "development": "为了治疗弟弟的病，张晓不得不出售这段珍贵记忆。买家是城市首富的女儿，她收集各种亲情记忆来填补内心空虚。交易后，张晓发现自己不仅失去了记忆，还失去了爱的能力。",
      "climax": "张晓在记忆黑市发现了一个秘密：所有被交易的记忆都被一个神秘组织收集，用来构建一个'完美人类'的意识。而这个计划的主导者，正是她已故的父亲。",
      "conclusion": "张晓联合其他失去珍贵记忆的人，摧毁了记忆交易系统。虽然无法找回失去的记忆，但他们创建了'记忆守护者'组织，保护人们的记忆不被商业化。"
    },
    "optimization": null,
    "session_id": "session-789"
  }'
```

### 请求参数说明

#### 基础字段
- action: 操作类型，可选值为 generate（首次生成）或 regenerate（重新生成）
- outline: 大纲对象，包含opening（起）、development（承）、climax（转）、conclusion（合）四个部分
- optimization: 优化建议文本，regenerate时使用，可为null
- previous_novel: 之前生成的小说正文，仅在有optimization时需要传递
- session_id: 会话标识符，用于关联整个创作流程

### 场景说明
- 首次生成：action为generate，基于大纲生成完整小说正文
- 重新生成（有优化）：action为regenerate，需要传递optimization和previous_novel
- 重新生成（无优化）：action为regenerate，optimization为null，不需要previous_novel，完全重新创作

---

## 4. 脚本生成 API

### 接口地址
POST https://n8n.games/webhook-test/42c7a477-b620-44ed-894a-59099d267d49

### CURL命令示例

#### 首次生成脚本
```bash
curl -X POST https://n8n.games/webhook-test/42c7a477-b620-44ed-894a-59099d267d49 \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "novel_content": "第一章 最后的记忆\n\n2045年的东京，霓虹灯依旧璀璨，但这座城市的灵魂已经改变。\n\n李明站在记忆管理中心的落地窗前，俯瞰着脚下川流不息的人群。作为高级记忆工程师，他每天的工作就是帮助人们管理、备份或删除记忆。在这个时代，记忆就像电脑文件一样可以随意操作。\n\n\"系统异常。\"冰冷的AI提示音打断了他的思绪。\n\n李明转身面对全息屏幕，手指在空中快速滑动，调出自己的记忆库。令他震惊的是，原本存储着三十五年人生经历的数据库，现在只剩下一个孤零零的文件。\n\n更诡异的是，这个文件被标记为\"不可删除\"...",
    "session_id": "session-123"
  }'
```

#### 重新生成脚本（有优化建议）
```bash
curl -X POST https://n8n.games/webhook-test/42c7a477-b620-44ed-894a-59099d267d49 \
  -H "Content-Type: application/json" \
  -d '{
    "action": "regenerate",
    "novel_content": "第一章 时间的重量\n\n陈博士的手在颤抖。\n\n地下实验室的荧光灯发出嗡嗡声，在凌晨三点的寂静中格外刺耳。他盯着面前的时间机器——一个看起来像是磁共振扫描仪的庞大装置，只是表面布满了他亲手焊接的量子传感器。\n\n三年了。自从妻子在那场车祸中离世，他就把自己关在这个地下室里，疯狂地工作着。同事们都说他疯了，但他知道自己从未如此清醒。\n\n\"初始化完成，时空坐标已锁定。\"机器发出机械的提示音。\n\n目标时间：2021年3月15日，下午4点23分。那是车祸发生前的十分钟...",
    "optimization": "请增加更多对话，让脚本更适合表演，加入音效和场景描述",
    "session_id": "session-456"
  }'
```

#### 重新生成脚本（无优化建议）
```bash
curl -X POST https://n8n.games/webhook-test/42c7a477-b620-44ed-894a-59099d267d49 \
  -H "Content-Type: application/json" \
  -d '{
    "action": "regenerate",
    "novel_content": "第一章 记忆的代价\n\n记忆交易所的大厅比往常更加拥挤。\n\n张晓紧紧握着手中的记忆芯片，那是母亲临终前留给她的——关于父亲的所有美好回忆。在这个贫富差距极大的时代，穷人唯一的财富就是记忆。\n\n\"B-127号，请到3号窗口。\"机械的声音在大厅回响。\n\n那是她的号码。张晓深吸一口气，走向命运的窗口。弟弟的医疗费需要五十万，而这段记忆的估值正好是五十二万。\n\n交易员是个面无表情的中年女人：\"确认出售？提醒您，记忆一旦出售，无法找回。\"\n\n张晓的手指在确认键上悬停了很久...",
    "optimization": null,
    "session_id": "session-789"
  }'
```

### 请求参数说明

#### 基础字段
- action: 操作类型，可选值为 generate（首次生成）或 regenerate（重新生成）
- novel_content: 完整的小说正文内容
- optimization: 优化建议文本，regenerate时使用，可为null
- session_id: 会话标识符，用于关联整个创作流程

### 场景说明
- 首次生成：action为generate，基于小说正文生成互动脚本
- 重新生成（有优化）：action为regenerate，根据optimization调整脚本风格
- 重新生成（无优化）：action为regenerate，optimization为null，完全重新创作

---

## 流式输出格式说明

### 脑洞输出格式
使用编号标签包裹标题和内容，如s1包含t标签（标题）和c标签（内容）

### 大纲输出格式
使用outline标签包裹四个部分：opening（起）、development（承）、climax（转）、conclusion（合）

### 小说和脚本输出格式
使用content标签包裹文本内容，支持逐字符流式传输

---

## 通用设计原则

### 独立性原则
每个API完全独立运行，不依赖其他API的返回值，通过前端传递的完整上下文获取所需信息

### 状态管理
使用session_id关联整个创作流程，支持历史记录保存和恢复

### 错误处理
所有接口返回统一格式的错误信息，包含错误码、错误描述和详细信息

### 扩展性考虑
参数结构设计支持后续功能扩展，不影响现有功能

---

*文档版本：v2.0*
*更新日期：2025-01-09*