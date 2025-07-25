// 混合解决方案：前端缓存 + 后端记录
// 保证用户体验的同时，收集数据用于分析

class HybridDataManager {
    constructor() {
        this.apiEndpoint = '/api/analytics'; // 需要配置实际的后端地址
        this.sessionId = this.generateSessionId();
        this.cacheManager = window.cacheManager || null;
        this.logger = window.logger || console;
    }
    
    // 生成唯一会话ID
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // 保存数据：前端缓存 + 异步后端记录
    async saveWorkflowStep(step, data) {
        // 1. 首先保存到前端（保证用户体验）
        if (this.cacheManager) {
            await this.cacheManager.save(`workflow_${step}`, data);
        }
        
        // 2. 异步发送到后端（不影响用户操作）
        this.sendToBackend(step, data).catch(error => {
            // 后端记录失败不影响前端功能
            this.logger.warn('Failed to send analytics:', error);
        });
        
        return true;
    }
    
    // 发送数据到后端
    async sendToBackend(step, data) {
        // 准备要记录的数据
        const analyticsData = {
            session_id: this.sessionId,
            step: step,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            data: this.prepareDataForBackend(step, data)
        };
        
        // 如果后端配置了，就发送
        if (this.apiEndpoint && this.apiEndpoint !== '/api/analytics') {
            try {
                await fetch(this.apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(analyticsData)
                });
            } catch (error) {
                // 静默失败，不影响用户
            }
        }
    }
    
    // 准备要发送到后端的数据（去除敏感信息）
    prepareDataForBackend(step, data) {
        switch (step) {
            case 'ideas':
                return {
                    count: data.length,
                    genres: data.map(idea => idea.genre),
                    titles: data.map(idea => idea.title),
                    selected_index: data.findIndex(idea => idea.selected)
                };
                
            case 'outline':
                return {
                    has_synopsis: !!data.synopsis,
                    parts_count: data.parts ? data.parts.length : 0,
                    word_count_estimate: JSON.stringify(data).length
                };
                
            case 'novel':
                return {
                    title: data.title,
                    word_count: data.content ? data.content.length : 0,
                    chapter_count: data.chapters ? data.chapters.length : 0,
                    generation_time: data.generation_time
                };
                
            case 'script':
                return {
                    scene_count: data.scenes ? data.scenes.length : 0,
                    character_count: data.characters ? data.characters.length : 0,
                    format: data.format
                };
                
            default:
                return data;
        }
    }
    
    // 记录用户行为（用于分析用户路径）
    trackUserAction(action, details = {}) {
        const event = {
            session_id: this.sessionId,
            action: action,
            details: details,
            timestamp: new Date().toISOString()
        };
        
        // 本地记录
        this.logger.info('User action:', event);
        
        // 异步发送到后端
        if (this.apiEndpoint && this.apiEndpoint !== '/api/analytics') {
            fetch(`${this.apiEndpoint}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            }).catch(() => {
                // 静默失败
            });
        }
    }
    
    // 记录错误（用于改进系统）
    trackError(error, context = {}) {
        const errorData = {
            session_id: this.sessionId,
            error: {
                message: error.message,
                stack: error.stack,
                type: error.name
            },
            context: context,
            timestamp: new Date().toISOString()
        };
        
        // 异步发送错误报告
        if (this.apiEndpoint && this.apiEndpoint !== '/api/analytics') {
            fetch(`${this.apiEndpoint}/errors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorData)
            }).catch(() => {
                // 静默失败
            });
        }
    }
    
    // 获取分析数据（如果配置了后端）
    async getAnalytics(type = 'summary') {
        if (!this.apiEndpoint || this.apiEndpoint === '/api/analytics') {
            return {
                message: '后端分析功能未配置',
                hint: '请配置实际的API端点'
            };
        }
        
        try {
            const response = await fetch(`${this.apiEndpoint}/analytics/${type}`);
            return await response.json();
        } catch (error) {
            return {
                error: '无法获取分析数据',
                details: error.message
            };
        }
    }
}

// 使用示例：

/*
// 1. 初始化
const dataManager = new HybridDataManager();

// 2. 在生成脑洞后
const ideas = await generateIdeas();
dataManager.saveWorkflowStep('ideas', ideas);
dataManager.trackUserAction('ideas_generated', { count: ideas.length });

// 3. 用户选择脑洞
dataManager.trackUserAction('idea_selected', { index: selectedIndex });

// 4. 生成大纲
const outline = await generateOutline();
dataManager.saveWorkflowStep('outline', outline);

// 5. 记录错误
try {
    await generateNovel();
} catch (error) {
    dataManager.trackError(error, { 
        step: 'novel_generation',
        outline_id: outline.id 
    });
}

// 6. 查看分析数据（需要后端支持）
const analytics = await dataManager.getAnalytics('daily');
console.log('今日统计:', analytics);
*/

// 创建全局实例
window.hybridDataManager = new HybridDataManager();