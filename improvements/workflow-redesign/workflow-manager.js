// 工作流管理器 - 支持模块化独立调用和状态持久化
class WorkflowManager {
    constructor() {
        // 独立的工作流端点配置
        this.endpoints = {
            ideas: '/webhook/generate-ideas',     // 需要替换为实际的webhook URL
            outline: '/webhook/generate-outline',  // 需要替换为实际的webhook URL
            novel: '/webhook/generate-novel',      // 需要替换为实际的webhook URL
            script: '/webhook/generate-script'     // 需要替换为实际的webhook URL
        };
        
        // 工作流状态
        this.state = {
            ideas: null,
            selectedIdea: null,
            outline: null,
            novel: null,
            script: null,
            metadata: {
                createdAt: null,
                lastUpdated: null,
                version: '2.0'
            }
        };
        
        // 重试配置
        this.retryConfig = {
            maxRetries: 3,
            retryDelay: 2000,
            exponentialBackoff: true
        };
        
        // 初始化时加载保存的状态
        this.loadState();
        
        // 绑定日志系统
        this.logger = window.logger || console;
    }
    
    // 保存状态到localStorage
    saveState() {
        try {
            this.state.metadata.lastUpdated = Date.now();
            const stateJson = JSON.stringify(this.state);
            localStorage.setItem('novelWorkflowState', stateJson);
            
            // 同时保存到sessionStorage作为备份
            sessionStorage.setItem('novelWorkflowStateBackup', stateJson);
            
            this.logger.info('Workflow state saved', {
                size: stateJson.length,
                timestamp: this.state.metadata.lastUpdated
            });
        } catch (error) {
            this.logger.error('Failed to save state', error);
        }
    }
    
    // 加载保存的状态
    loadState() {
        try {
            const savedState = localStorage.getItem('novelWorkflowState') || 
                             sessionStorage.getItem('novelWorkflowStateBackup');
            
            if (savedState) {
                this.state = JSON.parse(savedState);
                this.logger.info('Workflow state loaded', {
                    createdAt: this.state.metadata.createdAt,
                    hasIdeas: !!this.state.ideas,
                    hasOutline: !!this.state.outline,
                    hasNovel: !!this.state.novel,
                    hasScript: !!this.state.script
                });
                return true;
            }
        } catch (error) {
            this.logger.error('Failed to load state', error);
        }
        return false;
    }
    
    // 清除状态
    clearState() {
        this.state = {
            ideas: null,
            selectedIdea: null,
            outline: null,
            novel: null,
            script: null,
            metadata: {
                createdAt: null,
                lastUpdated: null,
                version: '2.0'
            }
        };
        
        localStorage.removeItem('novelWorkflowState');
        sessionStorage.removeItem('novelWorkflowStateBackup');
        
        this.logger.info('Workflow state cleared');
    }
    
    // 通用的API调用方法（带重试机制）
    async callAPI(endpoint, data, retryCount = 0) {
        const timerId = this.logger.startTimer(`API_${endpoint}`);
        
        try {
            this.logger.info(`API call started: ${endpoint}`, { 
                data, 
                retry: retryCount 
            });
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.text();
            let parsedResult;
            
            try {
                parsedResult = JSON.parse(result);
            } catch {
                parsedResult = result;
            }
            
            this.logger.endTimer(timerId);
            this.logger.info(`API call succeeded: ${endpoint}`, { 
                status: response.status 
            });
            
            return parsedResult;
            
        } catch (error) {
            this.logger.error(`API call failed: ${endpoint}`, { 
                error: error.message,
                retry: retryCount 
            });
            
            // 重试逻辑
            if (retryCount < this.retryConfig.maxRetries) {
                const delay = this.retryConfig.exponentialBackoff 
                    ? this.retryConfig.retryDelay * Math.pow(2, retryCount)
                    : this.retryConfig.retryDelay;
                    
                this.logger.info(`Retrying API call in ${delay}ms...`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.callAPI(endpoint, data, retryCount + 1);
            }
            
            throw error;
        }
    }
    
    // 生成脑洞（可独立调用）
    async generateIdeas(params) {
        this.logger.trackWorkflowStart();
        
        const data = {
            genre: params.genre || '随机',
            plot_holes_count: params.count || 5,
            user_suggestions: params.suggestions || null
        };
        
        try {
            const result = await this.callAPI(this.endpoints.ideas, data);
            
            // 保存结果
            this.state.ideas = result;
            if (!this.state.metadata.createdAt) {
                this.state.metadata.createdAt = Date.now();
            }
            this.saveState();
            
            this.logger.trackWorkflowProgress('ideas');
            return result;
            
        } catch (error) {
            this.logger.trackWorkflowAbandonment('ideas');
            throw error;
        }
    }
    
    // 生成大纲（可独立调用）
    async generateOutline(ideaNumber, suggestions = null) {
        if (!this.state.ideas) {
            throw new Error('请先生成脑洞');
        }
        
        const data = {
            selected_idea: this.state.ideas[ideaNumber - 1],
            idea_number: ideaNumber,
            user_suggestions: suggestions
        };
        
        try {
            const result = await this.callAPI(this.endpoints.outline, data);
            
            // 保存结果
            this.state.selectedIdea = ideaNumber;
            this.state.outline = result;
            this.saveState();
            
            this.logger.trackWorkflowProgress('outline');
            return result;
            
        } catch (error) {
            this.logger.trackWorkflowAbandonment('outline');
            throw error;
        }
    }
    
    // 生成小说（可独立调用）
    async generateNovel(suggestions = null) {
        if (!this.state.outline) {
            throw new Error('请先生成大纲');
        }
        
        const data = {
            outline: this.state.outline,
            user_suggestions: suggestions
        };
        
        try {
            const result = await this.callAPI(this.endpoints.novel, data);
            
            // 保存结果
            this.state.novel = result;
            this.saveState();
            
            this.logger.trackWorkflowProgress('novel');
            return result;
            
        } catch (error) {
            this.logger.trackWorkflowAbandonment('novel');
            throw error;
        }
    }
    
    // 生成脚本（可独立调用）
    async generateScript(suggestions = null) {
        if (!this.state.novel) {
            throw new Error('请先生成小说');
        }
        
        const data = {
            novel: this.state.novel,
            user_suggestions: suggestions
        };
        
        try {
            const result = await this.callAPI(this.endpoints.script, data);
            
            // 保存结果
            this.state.script = result;
            this.saveState();
            
            this.logger.trackWorkflowProgress('script');
            this.logger.trackWorkflowComplete();
            return result;
            
        } catch (error) {
            this.logger.trackWorkflowAbandonment('script');
            throw error;
        }
    }
    
    // 获取当前状态
    getState() {
        return {
            hasIdeas: !!this.state.ideas,
            hasOutline: !!this.state.outline,
            hasNovel: !!this.state.novel,
            hasScript: !!this.state.script,
            selectedIdea: this.state.selectedIdea,
            canGenerateOutline: !!this.state.ideas && !this.state.outline,
            canGenerateNovel: !!this.state.outline && !this.state.novel,
            canGenerateScript: !!this.state.novel && !this.state.script,
            data: this.state
        };
    }
    
    // 导出当前进度
    exportProgress() {
        const data = {
            state: this.state,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `novel-progress-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.logger.info('Progress exported');
    }
    
    // 导入进度
    async importProgress(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.state && data.state.metadata.version === '2.0') {
                this.state = data.state;
                this.saveState();
                this.logger.info('Progress imported successfully');
                return true;
            } else {
                throw new Error('Invalid progress file format');
            }
        } catch (error) {
            this.logger.error('Failed to import progress', error);
            throw error;
        }
    }
}

// 创建全局实例
window.workflowManager = new WorkflowManager();