// 智能滚动管理器
// 用于处理流式输出时的滚动控制，避免干扰用户阅读

class ScrollManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.isUserScrolling = false;
        this.lastScrollTop = 0;
        this.lastUserScrollTime = 0;  // 记录最后一次用户滚动时间
        this.scrollCheckTimer = null;
        this.autoScrollEnabled = true;
        this.scrollThreshold = 300; // 增加到300px，给用户更多查看空间
        
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
        
        // 记录用户滚动时间
        this.lastUserScrollTime = Date.now();
        
        // 计算是否在底部附近
        const isNearBottom = (scrollHeight - scrollTop - clientHeight) < this.scrollThreshold;
        
        // 改进的用户滚动检测逻辑
        // 检测用户是否主动离开底部区域（不管向上还是停留在中间）
        if (!isNearBottom) {
            // 如果用户不在底部附近，且有明显的滚动动作
            const scrollDiff = Math.abs(scrollTop - this.lastScrollTop);
            
            // 用户主动滚动离开底部（向上滚动或停留在非底部位置）
            if (scrollDiff > 10 || (this.lastScrollTop > 0 && !this.isUserScrolling)) {
                this.isUserScrolling = true;
                console.log('👤 用户正在查看内容，暂停自动滚动');
                
                // 显示提示
                this.showScrollHint();
            }
        } else {
            // 用户滚动到底部附近，恢复自动滚动
            if (this.isUserScrolling) {
                this.isUserScrolling = false;
                console.log('✅ 用户返回底部，恢复自动滚动');
                this.hideScrollHint();
            }
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
        // 多重检查确保不干扰用户阅读
        const now = Date.now();
        
        // 1. 基础检查
        if (!this.container || this.isUserScrolling) {
            return;
        }
        
        // 2. 时间检查：用户最近3秒内有滚动操作则不自动滚动
        if (this.lastUserScrollTime && now - this.lastUserScrollTime < 3000) {
            return;
        }
        
        // 3. 位置检查：只有当用户在底部附近时才继续自动滚动
        const scrollTop = this.container.scrollTop;
        const scrollHeight = this.container.scrollHeight;
        const clientHeight = this.container.clientHeight;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        
        // 如果用户已经远离底部，不再强制滚动
        if (distanceFromBottom > this.scrollThreshold * 2) {
            this.isUserScrolling = true; // 标记为用户正在查看
            this.showScrollHint();
            return;
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
        
        // 创建内容
        const hintContent = document.createElement('div');
        hintContent.className = 'scroll-hint-content';
        
        const icon = document.createElement('i');
        icon.className = 'fas fa-arrow-down animate-bounce';
        
        const text = document.createElement('span');
        text.textContent = '新内容正在生成中';
        
        const button = document.createElement('button');
        button.className = 'scroll-hint-btn';
        button.textContent = '跳到最新';
        
        // 直接绑定事件处理器
        button.onclick = () => {
            this.forceScrollToBottom();
        };
        
        hintContent.appendChild(icon);
        hintContent.appendChild(text);
        hintContent.appendChild(button);
        hint.appendChild(hintContent);
        
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