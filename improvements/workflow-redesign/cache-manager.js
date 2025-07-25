// 缓存管理器 - 为模块化工作流提供数据持久化
class CacheManager {
    constructor() {
        this.CACHE_KEY = 'novel_workflow_cache';
        this.CACHE_VERSION = '1.0';
        this.MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7天
        
        // 初始化IndexedDB
        this.dbName = 'NovelCreatorDB';
        this.dbVersion = 1;
        this.db = null;
        
        this.initDB();
    }
    
    // 初始化IndexedDB
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('IndexedDB初始化失败');
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB初始化成功');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建存储对象
                if (!db.objectStoreNames.contains('workflows')) {
                    const store = db.createObjectStore('workflows', { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('cache')) {
                    const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
                    cacheStore.createIndex('expires', 'expires', { unique: false });
                }
            };
        });
    }
    
    // 保存数据（智能选择存储方式）
    async save(key, data, options = {}) {
        const cacheData = {
            key,
            data,
            timestamp: Date.now(),
            expires: options.expires || Date.now() + this.MAX_CACHE_AGE,
            version: this.CACHE_VERSION,
            metadata: options.metadata || {}
        };
        
        try {
            // 优先使用IndexedDB（大数据）
            if (this.db && JSON.stringify(data).length > 1024 * 100) { // 大于100KB
                await this.saveToIndexedDB(cacheData);
            } else {
                // 小数据使用localStorage
                this.saveToLocalStorage(key, cacheData);
            }
            
            // 同时保存到sessionStorage作为快速缓存
            this.saveToSessionStorage(key, cacheData);
            
            console.log(`数据已缓存: ${key}`);
            return true;
            
        } catch (error) {
            console.error('缓存保存失败:', error);
            return false;
        }
    }
    
    // 读取数据（智能查找）
    async get(key) {
        try {
            // 1. 先从sessionStorage读取（最快）
            const sessionData = this.getFromSessionStorage(key);
            if (sessionData && !this.isExpired(sessionData)) {
                return sessionData.data;
            }
            
            // 2. 再从localStorage读取
            const localData = this.getFromLocalStorage(key);
            if (localData && !this.isExpired(localData)) {
                // 更新sessionStorage
                this.saveToSessionStorage(key, localData);
                return localData.data;
            }
            
            // 3. 最后从IndexedDB读取
            if (this.db) {
                const dbData = await this.getFromIndexedDB(key);
                if (dbData && !this.isExpired(dbData)) {
                    // 更新更快的存储
                    this.saveToSessionStorage(key, dbData);
                    this.saveToLocalStorage(key, dbData);
                    return dbData.data;
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('缓存读取失败:', error);
            return null;
        }
    }
    
    // 保存工作流状态（专门为小说工作流设计）
    async saveWorkflowState(state) {
        const workflowData = {
            id: 'current_workflow',
            type: 'workflow_state',
            timestamp: Date.now(),
            ...state
        };
        
        // 分别保存各个部分，避免数据过大
        const saves = [];
        
        if (state.ideas) {
            saves.push(this.save('workflow_ideas', state.ideas, {
                metadata: { step: 'ideas', count: state.ideas.length }
            }));
        }
        
        if (state.outline) {
            saves.push(this.save('workflow_outline', state.outline, {
                metadata: { step: 'outline', selectedIdea: state.selectedIdea }
            }));
        }
        
        if (state.novel) {
            saves.push(this.save('workflow_novel', state.novel, {
                metadata: { step: 'novel' }
            }));
        }
        
        if (state.script) {
            saves.push(this.save('workflow_script', state.script, {
                metadata: { step: 'script' }
            }));
        }
        
        // 保存元数据
        saves.push(this.save('workflow_metadata', {
            lastStep: state.lastStep,
            selectedIdea: state.selectedIdea,
            timestamp: Date.now()
        }));
        
        await Promise.all(saves);
        return true;
    }
    
    // 读取完整工作流状态
    async getWorkflowState() {
        const [ideas, outline, novel, script, metadata] = await Promise.all([
            this.get('workflow_ideas'),
            this.get('workflow_outline'),
            this.get('workflow_novel'),
            this.get('workflow_script'),
            this.get('workflow_metadata')
        ]);
        
        return {
            ideas,
            outline,
            novel,
            script,
            selectedIdea: metadata?.selectedIdea,
            lastStep: metadata?.lastStep,
            hasData: !!(ideas || outline || novel || script)
        };
    }
    
    // localStorage操作
    saveToLocalStorage(key, data) {
        try {
            const storageKey = `${this.CACHE_KEY}_${key}`;
            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                this.clearOldCache('localStorage');
                // 重试一次
                localStorage.setItem(storageKey, JSON.stringify(data));
            }
        }
    }
    
    getFromLocalStorage(key) {
        try {
            const storageKey = `${this.CACHE_KEY}_${key}`;
            const data = localStorage.getItem(storageKey);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    }
    
    // sessionStorage操作（页面关闭就清除）
    saveToSessionStorage(key, data) {
        try {
            const storageKey = `${this.CACHE_KEY}_${key}`;
            sessionStorage.setItem(storageKey, JSON.stringify(data));
        } catch {
            // sessionStorage满了就清空
            sessionStorage.clear();
        }
    }
    
    getFromSessionStorage(key) {
        try {
            const storageKey = `${this.CACHE_KEY}_${key}`;
            const data = sessionStorage.getItem(storageKey);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    }
    
    // IndexedDB操作
    async saveToIndexedDB(data) {
        if (!this.db) return;
        
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    async getFromIndexedDB(key) {
        if (!this.db) return null;
        
        const transaction = this.db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // 检查是否过期
    isExpired(cacheData) {
        return cacheData.expires && cacheData.expires < Date.now();
    }
    
    // 清理过期缓存
    async clearOldCache(storageType = 'all') {
        if (storageType === 'all' || storageType === 'localStorage') {
            // 清理localStorage
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.CACHE_KEY)) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        if (this.isExpired(data)) {
                            localStorage.removeItem(key);
                        }
                    } catch {
                        localStorage.removeItem(key);
                    }
                }
            });
        }
        
        if ((storageType === 'all' || storageType === 'indexedDB') && this.db) {
            // 清理IndexedDB
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const index = store.index('expires');
            const range = IDBKeyRange.upperBound(Date.now());
            
            const request = index.openCursor(range);
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                }
            };
        }
    }
    
    // 清除所有缓存
    async clearAll() {
        // 清除localStorage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.CACHE_KEY)) {
                localStorage.removeItem(key);
            }
        });
        
        // 清除sessionStorage
        sessionStorage.clear();
        
        // 清除IndexedDB
        if (this.db) {
            const transaction = this.db.transaction(['cache', 'workflows'], 'readwrite');
            transaction.objectStore('cache').clear();
            transaction.objectStore('workflows').clear();
        }
        
        console.log('所有缓存已清除');
    }
    
    // 获取缓存统计信息
    async getCacheStats() {
        let localStorageSize = 0;
        let sessionStorageSize = 0;
        let indexedDBCount = 0;
        
        // 计算localStorage大小
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.CACHE_KEY)) {
                localStorageSize += localStorage.getItem(key).length;
            }
        });
        
        // 计算sessionStorage大小
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith(this.CACHE_KEY)) {
                sessionStorageSize += sessionStorage.getItem(key).length;
            }
        });
        
        // 计算IndexedDB记录数
        if (this.db) {
            const transaction = this.db.transaction(['cache'], 'readonly');
            const store = transaction.objectStore('cache');
            const countRequest = store.count();
            
            indexedDBCount = await new Promise((resolve) => {
                countRequest.onsuccess = () => resolve(countRequest.result);
            });
        }
        
        return {
            localStorage: `${(localStorageSize / 1024).toFixed(2)} KB`,
            sessionStorage: `${(sessionStorageSize / 1024).toFixed(2)} KB`,
            indexedDB: `${indexedDBCount} 条记录`,
            totalSize: `${((localStorageSize + sessionStorageSize) / 1024).toFixed(2)} KB`
        };
    }
}

// 创建全局实例
window.cacheManager = new CacheManager();