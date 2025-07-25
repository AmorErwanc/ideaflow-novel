# 工作流迁移指南

## 背景
当前的链式工作流存在以下问题：
1. 任何环节失败，用户必须从头开始
2. 无法独立重试单个模块
3. 用户体验差，容易丢失进度

## 解决方案：模块化独立工作流

### 1. n8n工作流改造

将原有的单一链式工作流拆分为4个独立的工作流：

#### 原架构问题
```
[脑洞] → firstWaithook → [大纲] → secondWaithook → [小说] → thirdWaithook → [脚本]
         ↑                        ↑                         ↑
         如果这里失败             如果这里失败              如果这里失败
         整个链条断裂             用户必须重新开始          所有进度丢失
```

#### 新架构优势
```
[脑洞生成工作流] ←→ 独立调用
     ↓ (保存结果)
[大纲生成工作流] ←→ 独立调用（可重试）
     ↓ (保存结果)
[小说生成工作流] ←→ 独立调用（可重试）
     ↓ (保存结果)
[脚本生成工作流] ←→ 独立调用（可重试）
```

### 2. 前端代码迁移步骤

#### 第一步：引入新的工作流管理器
```html
<!-- 在index.html中添加 -->
<script src="workflow-manager.js"></script>
```

#### 第二步：更新API调用
```javascript
// 旧代码
const result = await callAPI(firstWaithook, data);

// 新代码
const result = await workflowManager.generateIdeas({
    genre: novelPrompt,
    count: plotHolesCount,
    suggestions: userSuggestions
});
```

#### 第三步：添加进度恢复功能
```javascript
// 在页面加载时检查是否有保存的进度
window.addEventListener('DOMContentLoaded', function() {
    const state = workflowManager.getState();
    
    if (state.hasIdeas) {
        // 恢复显示脑洞
        displayIdeas(state.data.ideas);
        
        if (state.hasOutline) {
            // 恢复显示大纲
            displayOutline(state.data.outline);
            
            if (state.hasNovel) {
                // 恢复显示小说
                displayNovel(state.data.novel);
                
                if (state.hasScript) {
                    // 恢复显示脚本
                    displayScript(state.data.script);
                }
            }
        }
    }
});
```

### 3. n8n工作流配置示例

#### 脑洞生成工作流
1. 创建新工作流
2. 添加Webhook节点：
   - Path: `generate-ideas`
   - Method: POST
   - Response Mode: On Received

3. 添加Code节点处理输入：
```javascript
const { genre, plot_holes_count, user_suggestions } = $input.all()[0].json;

return {
  genre: genre || '随机',
  count: plot_holes_count || 5,
  suggestions: user_suggestions || null
};
```

4. 添加AI节点生成脑洞
5. 添加Respond to Webhook节点返回结果

#### 大纲生成工作流
1. 创建新工作流
2. 添加Webhook节点：
   - Path: `generate-outline`
   - Method: POST

3. 添加Code节点：
```javascript
const { selected_idea, idea_number, user_suggestions } = $input.all()[0].json;

// 直接使用传入的完整脑洞数据
return {
  idea: selected_idea,
  number: idea_number,
  suggestions: user_suggestions
};
```

4. 添加AI节点生成大纲
5. 返回结果

### 4. 优势总结

1. **独立重试**：每个模块失败可以单独重试
2. **进度保存**：自动保存每步结果，刷新不丢失
3. **更好的错误处理**：精确定位失败点
4. **灵活扩展**：可以轻松添加新的生成步骤
5. **用户体验提升**：减少重复等待，提高成功率

### 5. 部署建议

1. 先部署新的n8n工作流
2. 更新前端配置中的webhook URLs
3. 测试每个独立工作流
4. 逐步迁移用户到新架构
5. 保留旧版本作为备份

### 6. 监控要点

- 每个工作流的成功率
- 重试次数统计
- 用户进度恢复使用率
- 各步骤的平均耗时