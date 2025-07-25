// 恢复系统 - 不改变n8n工作流的情况下提供更好的用户体验
class RecoverySystem {
    constructor() {
        this.checkpoints = {
            ideas: null,
            outline: null,
            novel: null,
            script: null,
            webhooks: {
                first: null,
                second: null,
                third: null
            }
        };
        
        // 自动保存配置
        this.autoSaveEnabled = true;
        this.autoSaveInterval = 5000; // 5秒
        
        // 初始化
        this.loadCheckpoints();
        this.startAutoSave();
    }
    
    // 创建检查点
    createCheckpoint(type, data, webhookData = null) {
        const checkpoint = {
            type,
            data,
            timestamp: Date.now(),
            webhookData
        };
        
        this.checkpoints[type] = checkpoint;
        
        // 保存webhook信息
        if (webhookData) {
            Object.assign(this.checkpoints.webhooks, webhookData);
        }
        
        this.saveCheckpoints();
        
        logger.info('Checkpoint created', { 
            type, 
            hasData: !!data,
            hasWebhook: !!webhookData 
        });
        
        // 显示保存成功提示
        this.showSaveNotification(type);
    }
    
    // 保存检查点到本地存储
    saveCheckpoints() {
        try {
            // 主存储
            localStorage.setItem('novelCheckpoints', JSON.stringify(this.checkpoints));
            
            // 备份到IndexedDB（更大容量）
            if ('indexedDB' in window) {
                this.saveToIndexedDB();
            }
            
        } catch (error) {
            logger.error('Failed to save checkpoints', error);
            
            // 如果localStorage满了，尝试清理旧数据
            if (error.name === 'QuotaExceededError') {
                this.cleanupOldData();
            }
        }
    }
    
    // 加载检查点
    loadCheckpoints() {
        try {
            const saved = localStorage.getItem('novelCheckpoints');
            if (saved) {
                this.checkpoints = JSON.parse(saved);
                logger.info('Checkpoints loaded', {
                    hasIdeas: !!this.checkpoints.ideas,
                    hasOutline: !!this.checkpoints.outline,
                    hasNovel: !!this.checkpoints.novel,
                    hasScript: !!this.checkpoints.script
                });
                return true;
            }
        } catch (error) {
            logger.error('Failed to load checkpoints', error);
        }
        return false;
    }
    
    // 恢复到某个检查点
    async restoreFromCheckpoint(type) {
        const checkpoint = this.checkpoints[type];
        if (!checkpoint) {
            logger.warn('No checkpoint found for type', { type });
            return false;
        }
        
        logger.info('Restoring from checkpoint', { 
            type, 
            age: Date.now() - checkpoint.timestamp 
        });
        
        // 恢复数据和状态
        switch (type) {
            case 'ideas':
                if (checkpoint.data && checkpoint.webhookData?.first) {
                    window.firstWaithook = checkpoint.webhookData.first;
                    displayIdeas(checkpoint.data);
                    workflowState.ideasGenerated = true;
                    updateButtonStates();
                    return true;
                }
                break;
                
            case 'outline':
                // 先恢复ideas
                if (this.checkpoints.ideas) {
                    await this.restoreFromCheckpoint('ideas');
                }
                
                if (checkpoint.data && checkpoint.webhookData?.second) {
                    window.secondWaithook = checkpoint.webhookData.second;
                    displayOutline(checkpoint.data);
                    workflowState.outlineGenerated = true;
                    updateButtonStates();
                    return true;
                }
                break;
                
            case 'novel':
                // 先恢复前面的状态
                if (this.checkpoints.outline) {
                    await this.restoreFromCheckpoint('outline');
                }
                
                if (checkpoint.data && checkpoint.webhookData?.third) {
                    window.thirdWaithook = checkpoint.webhookData.third;
                    displayNovel(checkpoint.data);
                    workflowState.novelGenerated = true;
                    updateButtonStates();
                    return true;
                }
                break;
                
            case 'script':
                // 恢复所有前面的状态
                if (this.checkpoints.novel) {
                    await this.restoreFromCheckpoint('novel');
                }
                
                if (checkpoint.data) {
                    displayScript(checkpoint.data);
                    workflowState.scriptGenerated = true;
                    updateButtonStates();
                    return true;
                }
                break;
        }
        
        return false;
    }
    
    // 显示保存通知
    showSaveNotification(type) {
        const messages = {
            ideas: '脑洞已自动保存',
            outline: '大纲已自动保存',
            novel: '小说已自动保存',
            script: '脚本已自动保存'
        };
        
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50 animate-slideInRight';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${messages[type] || '进度已保存'}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('animate-fadeOut');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    // 显示恢复提示
    showRecoveryPrompt() {
        const hasCheckpoints = this.checkpoints.ideas || this.checkpoints.outline || 
                              this.checkpoints.novel || this.checkpoints.script;
        
        if (!hasCheckpoints) return;
        
        const lastCheckpoint = this.getLastCheckpoint();
        const age = Date.now() - lastCheckpoint.timestamp;
        const ageMinutes = Math.floor(age / 60000);
        
        const prompt = document.createElement('div');
        prompt.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-xl z-50 animate-slideInDown';
        prompt.innerHTML = `
            <div class="flex items-center space-x-4">
                <i class="fas fa-history text-2xl"></i>
                <div>
                    <p class="font-semibold">发现未完成的创作</p>
                    <p class="text-sm opacity-90">${ageMinutes}分钟前的进度</p>
                </div>
                <button onclick="recoverySystem.recoverAll()" class="bg-white text-blue-600 px-4 py-2 rounded hover:bg-blue-50 transition-colors">
                    恢复进度
                </button>
                <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(prompt);
    }
    
    // 获取最后的检查点
    getLastCheckpoint() {
        let lastCheckpoint = null;
        let lastTimestamp = 0;
        
        for (const [type, checkpoint] of Object.entries(this.checkpoints)) {
            if (checkpoint && checkpoint.timestamp > lastTimestamp) {
                lastCheckpoint = checkpoint;
                lastTimestamp = checkpoint.timestamp;
            }
        }
        
        return lastCheckpoint;
    }
    
    // 恢复所有进度
    async recoverAll() {
        logger.info('Recovering all checkpoints');
        
        // 按顺序恢复
        const types = ['ideas', 'outline', 'novel', 'script'];
        
        for (const type of types) {
            if (this.checkpoints[type]) {
                await this.restoreFromCheckpoint(type);
                
                // 添加短暂延迟，让UI有时间更新
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        // 滚动到最后生成的内容
        const lastType = types.filter(t => this.checkpoints[t]).pop();
        if (lastType) {
            const sectionMap = {
                ideas: 'ideasSection',
                outline: 'outlineSection',
                novel: 'novelSection',
                script: 'scriptSection'
            };
            
            const section = document.getElementById(sectionMap[lastType]);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        // 显示恢复成功提示
        this.showRecoverySuccess();
    }
    
    // 显示恢复成功提示
    showRecoverySuccess() {
        const notification = document.createElement('div');
        notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce';
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-check-circle text-xl"></i>
                <span class="font-semibold">进度已成功恢复！</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('animate-fadeOut');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    // 自动保存
    startAutoSave() {
        if (!this.autoSaveEnabled) return;
        
        setInterval(() => {
            this.saveCheckpoints();
        }, this.autoSaveInterval);
    }
    
    // 清理旧数据
    cleanupOldData() {
        try {
            // 清理超过7天的检查点
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            
            for (const [type, checkpoint] of Object.entries(this.checkpoints)) {
                if (checkpoint && checkpoint.timestamp < sevenDaysAgo) {
                    this.checkpoints[type] = null;
                }
            }
            
            this.saveCheckpoints();
            logger.info('Old checkpoints cleaned up');
            
        } catch (error) {
            logger.error('Failed to cleanup old data', error);
        }
    }
    
    // 导出检查点
    exportCheckpoints() {
        const data = {
            checkpoints: this.checkpoints,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `novel-checkpoints-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        logger.info('Checkpoints exported');
    }
    
    // 保存到IndexedDB（支持更大的数据）
    async saveToIndexedDB() {
        if (!('indexedDB' in window)) return;
        
        try {
            const db = await this.openDB();
            const transaction = db.transaction(['checkpoints'], 'readwrite');
            const store = transaction.objectStore('checkpoints');
            
            await store.put({
                id: 'main',
                data: this.checkpoints,
                timestamp: Date.now()
            });
            
        } catch (error) {
            logger.error('Failed to save to IndexedDB', error);
        }
    }
    
    // 打开IndexedDB
    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('NovelCreatorDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('checkpoints')) {
                    db.createObjectStore('checkpoints', { keyPath: 'id' });
                }
            };
        });
    }
}

// 创建全局实例
window.recoverySystem = new RecoverySystem();

// 页面加载时检查是否需要恢复
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        recoverySystem.showRecoveryPrompt();
    }, 1000);
});