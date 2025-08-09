// 智能滚动管理器
// 用于处理流式输出时的滚动控制，避免干扰用户阅读

class ScrollManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.isUserScrolling = false;
        this.lastScrollTop = 0;
        this.scrollCheckTimer = null;
        this.autoScrollEnabled = true;
        this.scrollThreshold = 100; // 距离底部100px内认为是在底部
        
        this.init();
    }
    
    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) return;
        
        // 绑定事件处理器到正确的上下文
        this.handleScrollBound = this.handleUserScroll.bind(this);
        
        // 监听滚动事件
        this.container.addEventListener('scroll', this.handleScrollBound);
        
        // 监听鼠标滚轮事件（更精确地检测用户滚动）
        this.container.addEventListener('wheel', this.handleScrollBound);
        
        // 监听触摸滚动
        this.container.addEventListener('touchmove', this.handleScrollBound);
    }
    
    handleUserScroll() {
        const container = this.container;
        if (!container) return;
        
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        
        // 计算是否在底部附近
        const isNearBottom = (scrollHeight - scrollTop - clientHeight) < this.scrollThreshold;
        
        // 如果用户向上滚动了，标记为用户正在滚动
        if (scrollTop < this.lastScrollTop && !isNearBottom) {
            this.isUserScrolling = true;
            console.log('👤 用户正在查看上方内容，暂停自动滚动');
            
            // 显示提示（可选）
            this.showScrollHint();
        }
        
        // 如果用户滚动到底部附近，恢复自动滚动
        if (isNearBottom) {
            this.isUserScrolling = false;
            console.log('✅ 用户返回底部，恢复自动滚动');
            this.hideScrollHint();
        }
        
        this.lastScrollTop = scrollTop;
        
        // 清除之前的定时器
        if (this.scrollCheckTimer) {
            clearTimeout(this.scrollCheckTimer);
        }
        
        // 设置新的定时器，3秒后如果没有新的滚动，检查位置
        this.scrollCheckTimer = setTimeout(() => {
            this.checkScrollPosition();
        }, 3000);
    }
    
    checkScrollPosition() {
        const container = this.container;
        if (!container) return;
        
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        
        // 重新检查是否在底部
        const isNearBottom = (scrollHeight - scrollTop - clientHeight) < this.scrollThreshold;
        
        if (isNearBottom) {
            this.isUserScrolling = false;
        }
    }
    
    // 自动滚动到底部（只在允许时执行）
    scrollToBottom() {
        if (!this.container || this.isUserScrolling) {
            return; // 用户正在滚动，不执行自动滚动
        }
        
        this.container.scrollTop = this.container.scrollHeight;
    }
    
    // 强制滚动到底部（用于初始化或用户主动触发）
    forceScrollToBottom() {
        if (!this.container) return;
        
        this.isUserScrolling = false;
        this.container.scrollTop = this.container.scrollHeight;
        this.hideScrollHint();
    }
    
    // 显示滚动提示
    showScrollHint() {
        // 检查是否已存在提示
        let hint = document.getElementById(`${this.containerId}-scroll-hint`);
        if (hint) return;
        
        hint = document.createElement('div');
        hint.id = `${this.containerId}-scroll-hint`;
        hint.className = 'scroll-hint';
        hint.innerHTML = `
            <div class="scroll-hint-content">
                <i class="fas fa-arrow-down animate-bounce"></i>
                <span>新内容正在生成中</span>
                <button onclick="scrollManagers['${this.containerId}'].forceScrollToBottom()" class="scroll-hint-btn">
                    跳到最新
                </button>
            </div>
        `;
        
        // 添加到容器的父元素
        if (this.container.parentElement) {
            this.container.parentElement.appendChild(hint);
        }
    }
    
    // 隐藏滚动提示
    hideScrollHint() {
        const hint = document.getElementById(`${this.containerId}-scroll-hint`);
        if (hint) {
            hint.remove();
        }
    }
    
    // 重置状态（用于新的生成开始时）
    reset() {
        this.isUserScrolling = false;
        this.lastScrollTop = 0;
        this.hideScrollHint();
        
        if (this.scrollCheckTimer) {
            clearTimeout(this.scrollCheckTimer);
            this.scrollCheckTimer = null;
        }
    }
    
    // 销毁管理器
    destroy() {
        this.reset();
        
        if (this.container && this.handleScrollBound) {
            // 移除事件监听器
            this.container.removeEventListener('scroll', this.handleScrollBound);
            this.container.removeEventListener('wheel', this.handleScrollBound);
            this.container.removeEventListener('touchmove', this.handleScrollBound);
        }
    }
}

// 全局滚动管理器实例
const scrollManagers = {};

// 创建或获取滚动管理器
function getScrollManager(containerId) {
    if (!scrollManagers[containerId]) {
        scrollManagers[containerId] = new ScrollManager(containerId);
    }
    return scrollManagers[containerId];
}

// 导出给其他模块使用
window.ScrollManager = ScrollManager;
window.getScrollManager = getScrollManager;
window.scrollManagers = scrollManagers;