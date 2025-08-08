// 多脑洞并行生成 V2 - 更优雅的实现

const MultiBrainHoleV2 = {
    // 状态管理
    state: {
        slots: {
            1: null,
            2: null,
            3: null
        },
        currentLine: 1,
        maxSlots: 3
    },
    
    // 颜色配置
    colors: {
        1: { primary: '#8b5cf6', name: '紫色', emoji: '🟣' },
        2: { primary: '#3b82f6', name: '蓝色', emoji: '🔵' },
        3: { primary: '#10b981', name: '绿色', emoji: '🟢' }
    },
    
    // 初始化
    init() {
        this.enhanceCards();
        this.createFloatingBar();
        this.enhanceNavbar();
        this.loadState();
        this.showGuide();
    },
    
    // 增强卡片功能
    enhanceCards() {
        const cards = document.querySelectorAll('.idea-card');
        
        cards.forEach(card => {
            // 添加槽位标记
            const slotBadge = document.createElement('div');
            slotBadge.className = 'card-slot-badge';
            slotBadge.style.display = 'none';
            card.querySelector('.card-header').appendChild(slotBadge);
            
            // 替换选择按钮逻辑
            const selectBtn = card.querySelector('.btn-select');
            const newBtn = selectBtn.cloneNode(true);
            selectBtn.parentNode.replaceChild(newBtn, selectBtn);
            
            // 新的点击逻辑
            newBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleCardSelect(card);
            });
            
            // 添加长按菜单
            let pressTimer;
            newBtn.addEventListener('mousedown', (e) => {
                pressTimer = setTimeout(() => {
                    this.showSlotMenu(card, e);
                }, 500);
            });
            
            newBtn.addEventListener('mouseup', () => {
                clearTimeout(pressTimer);
            });
            
            newBtn.addEventListener('mouseleave', () => {
                clearTimeout(pressTimer);
            });
        });
    },
    
    // 处理卡片选择
    handleCardSelect(card) {
        const cardId = card.dataset.id;
        const currentSlot = this.getCardSlot(cardId);
        
        if (currentSlot) {
            // 已选中，取消选择
            this.removeFromSlot(currentSlot);
        } else {
            // 未选中，分配到下一个空槽
            const emptySlot = this.findNextEmptySlot();
            if (emptySlot) {
                this.assignToSlot(card, emptySlot);
            } else {
                this.showReplaceDialog(card);
            }
        }
    },
    
    // 显示槽位选择菜单
    showSlotMenu(card, event) {
        // 移除已存在的菜单
        document.querySelector('.slot-menu')?.remove();
        
        const menu = document.createElement('div');
        menu.className = 'slot-menu';
        menu.innerHTML = `
            <div class="slot-menu-title">选择槽位</div>
            <div class="slot-menu-options">
                ${[1, 2, 3].map(slot => {
                    const color = this.colors[slot];
                    const occupied = this.state.slots[slot];
                    return `
                        <button class="slot-menu-option" data-slot="${slot}" ${occupied && occupied.id !== card.dataset.id ? 'disabled' : ''}>
                            <span class="slot-menu-color" style="background: ${color.primary}"></span>
                            <span class="slot-menu-label">
                                槽位 ${slot}
                                ${occupied ? `<small>${occupied.id === card.dataset.id ? '(当前)' : '(已占用)'}</small>` : ''}
                            </span>
                        </button>
                    `;
                }).join('')}
                <button class="slot-menu-option" data-slot="0">
                    <span class="slot-menu-color" style="background: #94a3b8"></span>
                    <span class="slot-menu-label">取消选择</span>
                </button>
            </div>
        `;
        
        // 定位菜单
        menu.style.position = 'absolute';
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';
        
        document.body.appendChild(menu);
        
        // 添加事件
        menu.querySelectorAll('.slot-menu-option').forEach(option => {
            option.addEventListener('click', () => {
                const slot = parseInt(option.dataset.slot);
                if (slot === 0) {
                    const currentSlot = this.getCardSlot(card.dataset.id);
                    if (currentSlot) {
                        this.removeFromSlot(currentSlot);
                    }
                } else if (!option.disabled) {
                    this.assignToSlot(card, slot);
                }
                menu.remove();
            });
        });
        
        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 0);
    },
    
    // 分配到槽位
    assignToSlot(card, slot) {
        const ideaData = {
            id: card.dataset.id,
            title: card.querySelector('.card-title').textContent.trim(),
            content: card.querySelector('.card-content').textContent.trim(),
            genre: card.querySelector('.card-badge').textContent.trim()
        };
        
        // 清除该卡片的其他槽位
        [1, 2, 3].forEach(s => {
            if (this.state.slots[s]?.id === ideaData.id) {
                this.state.slots[s] = null;
            }
        });
        
        // 分配到新槽位
        this.state.slots[slot] = ideaData;
        
        // 更新UI
        this.updateCardUI(card, slot);
        this.updateFloatingBar();
        this.saveState();
        
        // 反馈
        this.showToast(`已添加到槽位 ${slot} ${this.colors[slot].emoji}`, 'success');
    },
    
    // 从槽位移除
    removeFromSlot(slot) {
        const ideaId = this.state.slots[slot]?.id;
        this.state.slots[slot] = null;
        
        // 更新卡片UI
        const card = document.querySelector(`.idea-card[data-id="${ideaId}"]`);
        if (card) {
            this.updateCardUI(card, null);
        }
        
        this.updateFloatingBar();
        this.saveState();
        
        this.showToast(`已从槽位 ${slot} 移除`, 'info');
    },
    
    // 更新卡片UI
    updateCardUI(card, slot) {
        const badge = card.querySelector('.card-slot-badge');
        const selectBtn = card.querySelector('.btn-select');
        
        // 移除所有槽位类
        card.classList.remove('slot-1', 'slot-2', 'slot-3');
        
        if (slot) {
            // 添加槽位标记
            card.classList.add(`slot-${slot}`);
            badge.innerHTML = `<span style="background: ${this.colors[slot].primary}">${slot}</span>`;
            badge.style.display = 'block';
            
            // 更新按钮
            selectBtn.innerHTML = `<i class="fas fa-check-circle"></i> 槽位 ${slot}`;
            selectBtn.style.background = `linear-gradient(135deg, ${this.colors[slot].primary}dd, ${this.colors[slot].primary}99)`;
            selectBtn.style.color = 'white';
            selectBtn.style.border = 'none';
        } else {
            // 恢复默认状态
            badge.style.display = 'none';
            selectBtn.innerHTML = '<i class="fas fa-check"></i> 选择';
            selectBtn.style.background = '';
            selectBtn.style.color = '';
            selectBtn.style.border = '';
        }
    },
    
    // 创建浮动状态栏
    createFloatingBar() {
        const bar = document.createElement('div');
        bar.className = 'multi-floating-bar';
        bar.innerHTML = `
            <div class="floating-bar-content">
                <div class="floating-slots">
                    <div class="floating-slot" data-slot="1">
                        <span class="floating-slot-number">1</span>
                        <span class="floating-slot-title">空</span>
                        <button class="floating-slot-remove" style="display: none">×</button>
                    </div>
                    <div class="floating-slot" data-slot="2">
                        <span class="floating-slot-number">2</span>
                        <span class="floating-slot-title">空</span>
                        <button class="floating-slot-remove" style="display: none">×</button>
                    </div>
                    <div class="floating-slot" data-slot="3">
                        <span class="floating-slot-number">3</span>
                        <span class="floating-slot-title">空</span>
                        <button class="floating-slot-remove" style="display: none">×</button>
                    </div>
                </div>
                <div class="floating-actions">
                    <button class="btn-floating-start" disabled>
                        <i class="fas fa-rocket"></i>
                        <span>开始创作</span>
                    </button>
                    <button class="btn-floating-help">
                        <i class="fas fa-question-circle"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(bar);
        
        // 添加事件
        bar.querySelectorAll('.floating-slot').forEach(slotEl => {
            const slot = parseInt(slotEl.dataset.slot);
            
            slotEl.addEventListener('click', () => {
                if (!this.state.slots[slot]) {
                    // 空槽位，高亮显示
                    this.highlightEmptySlot(slot);
                } else {
                    // 已占用，滚动到对应卡片
                    this.scrollToCard(this.state.slots[slot].id);
                }
            });
            
            const removeBtn = slotEl.querySelector('.floating-slot-remove');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFromSlot(slot);
            });
        });
        
        // 开始按钮
        bar.querySelector('.btn-floating-start').addEventListener('click', () => {
            this.startCreation();
        });
        
        // 帮助按钮
        bar.querySelector('.btn-floating-help').addEventListener('click', () => {
            this.showGuide();
        });
    },
    
    // 更新浮动栏
    updateFloatingBar() {
        const bar = document.querySelector('.multi-floating-bar');
        if (!bar) return;
        
        let selectedCount = 0;
        
        [1, 2, 3].forEach(slot => {
            const slotEl = bar.querySelector(`.floating-slot[data-slot="${slot}"]`);
            const data = this.state.slots[slot];
            
            if (data) {
                selectedCount++;
                slotEl.classList.add('occupied');
                slotEl.querySelector('.floating-slot-title').textContent = data.title.substring(0, 8) + '...';
                slotEl.querySelector('.floating-slot-remove').style.display = 'block';
                slotEl.style.borderColor = this.colors[slot].primary;
                slotEl.querySelector('.floating-slot-number').style.background = this.colors[slot].primary;
            } else {
                slotEl.classList.remove('occupied');
                slotEl.querySelector('.floating-slot-title').textContent = '空';
                slotEl.querySelector('.floating-slot-remove').style.display = 'none';
                slotEl.style.borderColor = '';
                slotEl.querySelector('.floating-slot-number').style.background = '';
            }
        });
        
        // 更新开始按钮
        const startBtn = bar.querySelector('.btn-floating-start');
        startBtn.disabled = selectedCount === 0;
        
        // 更新数字
        const span = startBtn.querySelector('span');
        if (selectedCount > 0) {
            span.textContent = `开始创作 (${selectedCount})`;
        } else {
            span.textContent = '开始创作';
        }
        
        // 显示/隐藏浮动栏
        if (selectedCount > 0) {
            bar.classList.add('visible');
        }
    },
    
    // 增强导航栏
    enhanceNavbar() {
        const navProgress = document.querySelector('.nav-progress');
        if (!navProgress) return;
        
        // 在进度条前添加线路指示器
        const indicator = document.createElement('div');
        indicator.className = 'line-indicator';
        indicator.innerHTML = `
            <span class="line-indicator-label">当前线路:</span>
            <div class="line-indicator-tabs">
                <button class="line-tab active" data-line="1">
                    <span class="line-dot" style="background: ${this.colors[1].primary}"></span>
                </button>
                <button class="line-tab" data-line="2">
                    <span class="line-dot" style="background: ${this.colors[2].primary}"></span>
                </button>
                <button class="line-tab" data-line="3">
                    <span class="line-dot" style="background: ${this.colors[3].primary}"></span>
                </button>
            </div>
        `;
        
        navProgress.parentNode.insertBefore(indicator, navProgress);
        
        // 默认隐藏
        indicator.style.display = 'none';
    },
    
    // 显示引导
    showGuide() {
        const guide = document.createElement('div');
        guide.className = 'multi-guide-overlay';
        guide.innerHTML = `
            <div class="multi-guide">
                <h3>🎯 多脑洞并行创作指南</h3>
                <div class="guide-steps">
                    <div class="guide-step">
                        <span class="guide-number">1</span>
                        <div class="guide-content">
                            <h4>选择创意</h4>
                            <p>点击卡片的"选择"按钮，最多可选3个</p>
                        </div>
                    </div>
                    <div class="guide-step">
                        <span class="guide-number">2</span>
                        <div class="guide-content">
                            <h4>分配槽位</h4>
                            <p>长按"选择"按钮可指定槽位</p>
                        </div>
                    </div>
                    <div class="guide-step">
                        <span class="guide-number">3</span>
                        <div class="guide-content">
                            <h4>开始创作</h4>
                            <p>点击底部"开始创作"按钮</p>
                        </div>
                    </div>
                </div>
                <div class="guide-colors">
                    <span><span class="color-dot" style="background: ${this.colors[1].primary}"></span> 槽位1</span>
                    <span><span class="color-dot" style="background: ${this.colors[2].primary}"></span> 槽位2</span>
                    <span><span class="color-dot" style="background: ${this.colors[3].primary}"></span> 槽位3</span>
                </div>
                <button class="guide-close">知道了</button>
            </div>
        `;
        
        document.body.appendChild(guide);
        
        guide.querySelector('.guide-close').addEventListener('click', () => {
            guide.classList.add('fade-out');
            setTimeout(() => guide.remove(), 300);
        });
        
        guide.addEventListener('click', (e) => {
            if (e.target === guide) {
                guide.classList.add('fade-out');
                setTimeout(() => guide.remove(), 300);
            }
        });
    },
    
    // 工具方法
    getCardSlot(cardId) {
        for (let slot = 1; slot <= 3; slot++) {
            if (this.state.slots[slot]?.id === cardId) {
                return slot;
            }
        }
        return null;
    },
    
    findNextEmptySlot() {
        for (let slot = 1; slot <= 3; slot++) {
            if (!this.state.slots[slot]) {
                return slot;
            }
        }
        return null;
    },
    
    highlightEmptySlot(slot) {
        this.showToast(`请选择一个创意添加到槽位 ${slot} ${this.colors[slot].emoji}`, 'info');
        document.querySelector('.waterfall-container').scrollIntoView({ behavior: 'smooth' });
    },
    
    scrollToCard(cardId) {
        const card = document.querySelector(`.idea-card[data-id="${cardId}"]`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('highlight');
            setTimeout(() => card.classList.remove('highlight'), 2000);
        }
    },
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `multi-toast multi-toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
    
    startCreation() {
        const selectedCount = Object.values(this.state.slots).filter(s => s).length;
        if (selectedCount === 0) return;
        
        // 显示线路指示器
        document.querySelector('.line-indicator').style.display = 'flex';
        
        // 隐藏浮动栏
        document.querySelector('.multi-floating-bar').classList.add('minimized');
        
        this.showToast(`🚀 开始${selectedCount}条线路的创作之旅！`, 'success');
        
        // 添加到聊天
        if (window.addMessageToChat) {
            window.addMessageToChat('assistant', 
                `太棒了！我已经为你准备好了${selectedCount}条创作线路：\n\n` +
                Object.entries(this.state.slots)
                    .filter(([_, data]) => data)
                    .map(([slot, data]) => `${this.colors[slot].emoji} 线路${slot}：${data.title}`)
                    .join('\n') +
                '\n\n你可以随时切换线路查看不同的创作进度。让我们开始吧！'
            );
        }
    },
    
    saveState() {
        localStorage.setItem('multiBrainHoleV2', JSON.stringify(this.state));
    },
    
    loadState() {
        const saved = localStorage.getItem('multiBrainHoleV2');
        if (saved) {
            try {
                this.state = JSON.parse(saved);
                
                // 恢复UI
                Object.entries(this.state.slots).forEach(([slot, data]) => {
                    if (data) {
                        const card = document.querySelector(`.idea-card[data-id="${data.id}"]`);
                        if (card) {
                            this.updateCardUI(card, parseInt(slot));
                        }
                    }
                });
                
                this.updateFloatingBar();
            } catch (e) {
                console.error('Failed to load state:', e);
            }
        }
    }
};

// 添加样式
const styleV2 = document.createElement('style');
styleV2.textContent = `
/* 卡片槽位标记 */
.card-slot-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    z-index: 10;
}

.card-slot-badge span {
    display: block;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    color: white;
    font-size: 12px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

/* 卡片选中状态 */
.idea-card.slot-1 {
    border: 2px solid #8b5cf6 !important;
    background: linear-gradient(to bottom, rgba(139, 92, 246, 0.03), transparent) !important;
}

.idea-card.slot-2 {
    border: 2px solid #3b82f6 !important;
    background: linear-gradient(to bottom, rgba(59, 130, 246, 0.03), transparent) !important;
}

.idea-card.slot-3 {
    border: 2px solid #10b981 !important;
    background: linear-gradient(to bottom, rgba(16, 185, 129, 0.03), transparent) !important;
}

.idea-card.highlight {
    animation: highlight 2s ease;
}

@keyframes highlight {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
}

/* 槽位选择菜单 */
.slot-menu {
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    padding: 0.5rem;
    z-index: 10000;
    min-width: 180px;
    animation: slideUp 0.2s ease;
}

.slot-menu-title {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 0.5rem;
}

.slot-menu-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.625rem 0.75rem;
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
}

.slot-menu-option:hover:not(:disabled) {
    background: #f1f5f9;
}

.slot-menu-option:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.slot-menu-color {
    width: 16px;
    height: 16px;
    border-radius: 50%;
}

.slot-menu-label {
    flex: 1;
    font-size: 0.875rem;
    color: #1e293b;
}

.slot-menu-label small {
    display: block;
    font-size: 0.75rem;
    color: #94a3b8;
}

/* 浮动状态栏 */
.multi-floating-bar {
    position: fixed;
    bottom: -100px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border-radius: 24px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    padding: 1rem 1.5rem;
    z-index: 1000;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.multi-floating-bar.visible {
    bottom: 24px;
}

.multi-floating-bar.minimized {
    bottom: 24px;
    transform: translateX(calc(-50% + 200px)) scale(0.8);
    opacity: 0.8;
}

.floating-bar-content {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.floating-slots {
    display: flex;
    gap: 0.75rem;
}

.floating-slot {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
}

.floating-slot:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.floating-slot.occupied {
    background: linear-gradient(to right, rgba(139, 92, 246, 0.05), transparent);
}

.floating-slot-number {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #e2e8f0;
    color: white;
    font-size: 11px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
}

.floating-slot-title {
    font-size: 0.875rem;
    color: #64748b;
    min-width: 60px;
}

.floating-slot.occupied .floating-slot-title {
    color: #1e293b;
    font-weight: 500;
}

.floating-slot-remove {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #ef4444;
    color: white;
    border: 2px solid white;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.floating-actions {
    display: flex;
    gap: 0.5rem;
}

.btn-floating-start {
    padding: 0.625rem 1.25rem;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.btn-floating-start:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-floating-start:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-floating-help {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #f1f5f9;
    border: none;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-floating-help:hover {
    background: #e2e8f0;
    color: #1e293b;
}

/* 线路指示器 */
.line-indicator {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.375rem 0.75rem;
    background: rgba(255,255,255,0.1);
    border-radius: 8px;
    margin-bottom: 0.5rem;
}

.line-indicator-label {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.7);
}

.line-indicator-tabs {
    display: flex;
    gap: 0.375rem;
}

.line-tab {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.line-tab:hover {
    background: rgba(255,255,255,0.2);
}

.line-tab.active {
    background: rgba(255,255,255,0.2);
    border-color: rgba(255,255,255,0.5);
}

.line-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
}

/* 引导界面 */
.multi-guide-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s;
}

.multi-guide {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    animation: slideUp 0.3s;
}

.multi-guide h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.25rem;
    text-align: center;
}

.guide-steps {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.guide-step {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
}

.guide-number {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 0.875rem;
    flex-shrink: 0;
}

.guide-content h4 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
}

.guide-content p {
    margin: 0;
    color: #64748b;
    font-size: 0.875rem;
}

.guide-colors {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 8px;
}

.guide-colors span {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #64748b;
}

.color-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
}

.guide-close {
    width: 100%;
    padding: 0.75rem;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.guide-close:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* Toast提示 */
.multi-toast {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: white;
    padding: 0.75rem 1.25rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10001;
    transition: transform 0.3s;
    font-size: 0.875rem;
}

.multi-toast.show {
    transform: translateX(-50%) translateY(0);
}

.multi-toast-success {
    border-left: 3px solid #10b981;
}

.multi-toast-info {
    border-left: 3px solid #3b82f6;
}

/* 动画 */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

.fade-out {
    animation: fadeOut 0.3s forwards;
}

@keyframes fadeOut {
    to { opacity: 0; }
}
`;

document.head.appendChild(styleV2);

// 初始化
window.initMultiBrainHoleV2 = () => MultiBrainHoleV2.init();