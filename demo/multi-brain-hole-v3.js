// 多脑洞并行生成 V3 - 极简优雅版本
// 底部栏控制 + 卡片直接选择

(function() {
    'use strict';

    // 配置
    const CONFIG = {
        MAX_SLOTS: 3,
        ANIMATION_DURATION: 300,
        COLORS: {
            slot1: { 
                primary: '#8B5CF6', 
                light: 'rgba(139, 92, 246, 0.1)', 
                lighter: 'rgba(139, 92, 246, 0.05)',
                name: '紫色' 
            },
            slot2: { 
                primary: '#3B82F6', 
                light: 'rgba(59, 130, 246, 0.1)', 
                lighter: 'rgba(59, 130, 246, 0.05)',
                name: '蓝色' 
            },
            slot3: { 
                primary: '#10B981', 
                light: 'rgba(16, 185, 129, 0.1)', 
                lighter: 'rgba(16, 185, 129, 0.05)',
                name: '绿色' 
            }
        }
    };

    // 状态管理
    const state = {
        enabled: false,
        selectedSlots: new Map(), // ideaId -> slotNumber
        targetSlot: null, // 当前要填充的槽位
        lines: {}
    };

    // 初始化
    function init() {
        console.log('[多脑洞V3] 初始化开始');
        injectStyles();
        createFloatingButton();
        createBottomBar();
        enhanceIdeaCards();
        bindEvents();
        restoreState();
        console.log('[多脑洞V3] 初始化完成');
    }

    // 注入样式
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 浮动触发按钮 */
            .multi-brain-trigger {
                position: fixed;
                bottom: 100px;  /* 进一步提高位置，完全避开输入框区域 */
                right: 32px;  /* 稍微右移 */
                width: 48px;  /* 减小尺寸 */
                height: 48px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 40;  /* 降低z-index，避免遮挡其他元素 */
                border: none;
                color: white;
                font-size: 20px;  /* 调整图标大小 */
            }

            .multi-brain-trigger:hover {
                transform: scale(1.1);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
            }

            .multi-brain-trigger.active {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                transform: rotate(45deg);
            }

            .trigger-badge {
                position: absolute;
                top: -2px;
                right: -2px;
                background: #ef4444;
                color: white;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: 700;
                border: 2px solid white;
            }

            /* 底部控制栏 */
            .multi-brain-bar {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: white;
                box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
                transform: translateY(100%);
                transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 30;  /* 大幅降低z-index，确保不会遮挡输入框(z-index:100) */
            }

            .multi-brain-bar.active {
                transform: translateY(0);
            }

            .bar-header {
                padding: 12px 24px;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .bar-title {
                font-size: 14px;
                font-weight: 600;
                color: #1e293b;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .bar-title i {
                color: #8b5cf6;
            }

            .bar-close {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: transparent;
                border: none;
                color: #94a3b8;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .bar-close:hover {
                background: #f1f5f9;
                color: #64748b;
            }

            .bar-content {
                padding: 20px 24px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 24px;
            }

            .selected-slots {
                display: flex;
                gap: 12px;
                flex: 1;
            }

            .mini-slot {
                background: #f8fafc;
                border: 2px dashed #cbd5e1;
                border-radius: 12px;
                padding: 14px 16px;
                flex: 1;
                max-width: 320px;
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                min-height: 60px;
            }

            .mini-slot:hover {
                border-color: #94a3b8;
                background: #f1f5f9;
                transform: translateY(-2px);
            }

            .mini-slot.filled {
                border-style: solid;
                background: white;
                cursor: default;
            }

            .mini-slot.slot-1.filled {
                border-color: #8B5CF6;
                background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, white 100%);
            }

            .mini-slot.slot-2.filled {
                border-color: #3B82F6;
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, white 100%);
            }

            .mini-slot.slot-3.filled {
                border-color: #10B981;
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, white 100%);
            }

            .mini-slot.selecting {
                animation: pulse-border 1.5s infinite;
                border-color: #8b5cf6;
                background: rgba(139, 92, 246, 0.05);
            }

            @keyframes pulse-border {
                0%, 100% { 
                    border-color: #8b5cf6;
                    box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4);
                }
                50% { 
                    border-color: #a78bfa;
                    box-shadow: 0 0 0 8px rgba(139, 92, 246, 0);
                }
            }

            .slot-icon {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                flex-shrink: 0;
            }

            .mini-slot.slot-1 .slot-icon {
                background: rgba(139, 92, 246, 0.1);
                color: #8B5CF6;
            }

            .mini-slot.slot-2 .slot-icon {
                background: rgba(59, 130, 246, 0.1);
                color: #3B82F6;
            }

            .mini-slot.slot-3 .slot-icon {
                background: rgba(16, 185, 129, 0.1);
                color: #10B981;
            }

            .slot-text {
                flex: 1;
                min-width: 0;
            }

            .slot-label {
                font-size: 11px;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
                font-weight: 600;
            }

            .slot-title {
                font-size: 14px;
                font-weight: 600;
                color: #1e293b;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1.3;
            }

            .slot-empty-text {
                font-size: 13px;
                color: #94a3b8;
            }

            .mini-slot-remove {
                position: absolute;
                top: -8px;
                right: -8px;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: white;
                border: 2px solid #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                opacity: 0;
                transition: all 0.2s ease;
                color: #94a3b8;
                font-size: 12px;
            }

            .mini-slot.filled:hover .mini-slot-remove {
                opacity: 1;
            }

            .mini-slot-remove:hover {
                background: #fee2e2;
                border-color: #fecaca;
                color: #ef4444;
                transform: scale(1.1);
            }

            .bar-actions {
                display: flex;
                gap: 12px;
            }

            .bar-btn {
                padding: 10px 20px;
                border-radius: 10px;
                border: none;
                font-weight: 500;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                white-space: nowrap;
            }

            .bar-btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            }

            .bar-btn-primary:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .bar-btn-primary:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                background: #cbd5e1;
            }

            .bar-btn-secondary {
                background: #f1f5f9;
                color: #64748b;
            }

            .bar-btn-secondary:hover {
                background: #e2e8f0;
                color: #475569;
            }

            /* 选择提示 */
            .selection-hint {
                position: fixed;
                top: 100px;
                left: 50%;
                transform: translateX(-50%) translateY(-20px);
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 24px;
                border-radius: 50px;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
                opacity: 0;
                visibility: hidden;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 55;  /* 降低z-index，避免遮挡输入框 */
            }

            .selection-hint.active {
                opacity: 1;
                visibility: visible;
                transform: translateX(-50%) translateY(0);
            }

            /* 卡片增强样式 */
            .idea-card {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
            }

            .idea-card.selection-mode {
                cursor: pointer;
            }

            .idea-card.selection-mode:hover {
                transform: translateY(-4px) scale(1.02);
                box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
            }

            .idea-card.selected-slot-1 {
                border: 3px solid #8B5CF6 !important;
                box-shadow: 0 0 0 6px rgba(139, 92, 246, 0.1);
            }

            .idea-card.selected-slot-2 {
                border: 3px solid #3B82F6 !important;
                box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.1);
            }

            .idea-card.selected-slot-3 {
                border: 3px solid #10B981 !important;
                box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.1);
            }

            .card-slot-indicator {
                position: absolute;
                top: -12px;
                right: -12px;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 16px;
                color: white;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                z-index: 10;
                animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            }

            @keyframes bounceIn {
                0% { transform: scale(0); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }

            .card-slot-indicator.slot-1 {
                background: linear-gradient(135deg, #8B5CF6 0%, #a78bfa 100%);
            }

            .card-slot-indicator.slot-2 {
                background: linear-gradient(135deg, #3B82F6 0%, #60a5fa 100%);
            }

            .card-slot-indicator.slot-3 {
                background: linear-gradient(135deg, #10B981 0%, #34d399 100%);
            }

            /* 按钮增强 */
            .idea-card .btn-select {
                transition: all 0.3s ease;
            }

            .idea-card.selected-slot-1 .btn-select,
            .idea-card.selected-slot-2 .btn-select,
            .idea-card.selected-slot-3 .btn-select {
                background: #f1f5f9;
                color: #64748b;
                pointer-events: none;
            }

            /* 响应式 */
            @media (max-width: 768px) {
                .multi-brain-trigger {
                    bottom: 70px;  /* 移动端位置调整 */
                    right: 16px;
                    width: 44px;
                    height: 44px;
                    font-size: 18px;
                }
                
                .selected-slots {
                    flex-direction: column;
                }
                
                .mini-slot {
                    max-width: 100%;
                }

                .bar-content {
                    flex-direction: column;
                    gap: 16px;
                }

                .bar-actions {
                    width: 100%;
                }

                .bar-btn {
                    flex: 1;
                    justify-content: center;
                }
                
                .multi-brain-bar {
                    z-index: 25;  /* 移动端更低的z-index，确保输入框优先级 */
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 创建浮动按钮
    function createFloatingButton() {
        const button = document.createElement('button');
        button.className = 'multi-brain-trigger';
        button.innerHTML = `
            <i class="fas fa-layer-group"></i>
            <span class="trigger-badge" style="display: none;">0</span>
        `;
        document.body.appendChild(button);
    }

    // 创建底部栏
    function createBottomBar() {
        const bar = document.createElement('div');
        bar.className = 'multi-brain-bar';
        bar.style.display = 'none';  // 确保初始状态隐藏
        bar.innerHTML = `
            <div class="bar-header">
                <div class="bar-title">
                    <i class="fas fa-sparkles"></i>
                    多线路创作模式
                </div>
                <button class="bar-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="bar-content">
                <div class="selected-slots">
                    <div class="mini-slot slot-1 empty" data-slot="1">
                        <div class="slot-icon">
                            <i class="fas fa-plus"></i>
                        </div>
                        <div class="slot-text">
                            <div class="slot-label">槽位 1</div>
                            <div class="slot-empty-text">点击选择创意</div>
                        </div>
                    </div>
                    <div class="mini-slot slot-2 empty" data-slot="2">
                        <div class="slot-icon">
                            <i class="fas fa-plus"></i>
                        </div>
                        <div class="slot-text">
                            <div class="slot-label">槽位 2</div>
                            <div class="slot-empty-text">点击选择创意</div>
                        </div>
                    </div>
                    <div class="mini-slot slot-3 empty" data-slot="3">
                        <div class="slot-icon">
                            <i class="fas fa-plus"></i>
                        </div>
                        <div class="slot-text">
                            <div class="slot-label">槽位 3</div>
                            <div class="slot-empty-text">点击选择创意</div>
                        </div>
                    </div>
                </div>
                <div class="bar-actions">
                    <button class="bar-btn bar-btn-secondary" id="btn-clear-all">
                        <i class="fas fa-redo"></i>
                        重置
                    </button>
                    <button class="bar-btn bar-btn-primary" id="btn-start-creation" disabled>
                        <i class="fas fa-rocket"></i>
                        开始创作
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(bar);

        // 创建选择提示
        const hint = document.createElement('div');
        hint.className = 'selection-hint';
        hint.innerHTML = `<i class="fas fa-hand-pointer"></i> 点击下方卡片选择创意`;
        document.body.appendChild(hint);
    }

    // 增强创意卡片
    function enhanceIdeaCards() {
        // 等待卡片加载
        setTimeout(() => {
            const cards = document.querySelectorAll('.idea-card');
            cards.forEach(card => {
                // 添加点击事件
                card.addEventListener('click', handleCardClick);
            });
        }, 500);
    }

    // 处理卡片点击
    function handleCardClick(e) {
        if (!state.enabled) return;
        if (e.target.closest('.btn-edit') || e.target.closest('.btn-favorite')) return;
        
        const card = e.currentTarget;
        const ideaId = card.dataset.id;
        
        if (state.targetSlot) {
            // 有指定槽位，直接分配
            assignToSlot(ideaId, state.targetSlot, card);
            state.targetSlot = null;
            updateSlotHighlight();
        } else {
            // 自动分配或移除
            const currentSlot = findIdeaSlot(ideaId);
            if (currentSlot) {
                // 已选择，移除
                removeFromSlot(currentSlot);
            } else {
                // 未选择，自动分配
                const emptySlot = findEmptySlot();
                if (emptySlot) {
                    assignToSlot(ideaId, emptySlot, card);
                } else {
                    showMessage('已选择3个创意，请先移除一个或点击槽位替换');
                }
            }
        }
    }

    // 绑定事件
    function bindEvents() {
        // 浮动按钮
        document.querySelector('.multi-brain-trigger').addEventListener('click', toggleMultiMode);
        
        // 关闭按钮
        document.querySelector('.bar-close').addEventListener('click', closeMultiMode);
        
        // 槽位点击
        document.querySelectorAll('.mini-slot').forEach(slot => {
            slot.addEventListener('click', (e) => {
                if (e.target.closest('.mini-slot-remove')) return;
                
                const slotNumber = parseInt(slot.dataset.slot);
                
                if (slot.classList.contains('filled')) {
                    // 已填充，不做任何操作
                    return;
                } else {
                    // 空槽位，进入选择模式
                    state.targetSlot = slotNumber;
                    updateSlotHighlight();
                    showSelectionHint();
                }
            });
        });
        
        // 移除按钮
        document.addEventListener('click', (e) => {
            if (e.target.closest('.mini-slot-remove')) {
                const slot = e.target.closest('.mini-slot');
                const slotNumber = parseInt(slot.dataset.slot);
                removeFromSlot(slotNumber);
            }
        });
        
        // 重置按钮
        document.getElementById('btn-clear-all').addEventListener('click', clearAll);
        
        // 开始创作按钮
        document.getElementById('btn-start-creation').addEventListener('click', startCreation);
        
        // 窗口尺寸变化监听器 - 处理页面缩放和resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            // 防抖处理，避免频繁触发
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (state.enabled) {
                    console.log('[多脑洞V3] 窗口尺寸变化，重新调整布局');
                    adjustChatAreaForBottomBar(true);
                }
            }, 150);
        });
    }

    // 动态调整聊天区域布局以避免与底部栏冲突
    function adjustChatAreaForBottomBar(isVisible) {
        const chatArea = document.querySelector('.chat-area');
        const bottomBar = document.querySelector('.multi-brain-bar');
        
        if (!chatArea) return;
        
        if (isVisible && bottomBar) {
            // 等待底部栏动画完成后获取高度，增加延迟确保准确
            setTimeout(() => {
                const barHeight = bottomBar.offsetHeight;
                const safeMargin = 20; // 增加安全边距
                
                // 使用更强健的高度计算方式
                const newHeight = `calc(100vh - 80px - ${barHeight + safeMargin}px)`;
                chatArea.style.height = newHeight;
                
                // 同时给聊天区域添加下边距作为双重保护
                chatArea.style.marginBottom = `${safeMargin}px`;
                
                console.log('[多脑洞V3] 调整聊天区域 - 高度:', newHeight, '底部栏高度:', barHeight);
                
                // 强制触发重新布局
                chatArea.offsetHeight; // 触发reflow
            }, 100); // 增加延迟时间
        } else {
            // 恢复原始样式
            chatArea.style.height = 'calc(100vh - 80px)';
            chatArea.style.marginBottom = '';
            console.log('[多脑洞V3] 恢复聊天区域原始样式');
        }
    }

    // 切换多选模式
    function toggleMultiMode() {
        state.enabled = !state.enabled;
        
        const trigger = document.querySelector('.multi-brain-trigger');
        const bar = document.querySelector('.multi-brain-bar');
        const cards = document.querySelectorAll('.idea-card');
        
        trigger.classList.toggle('active', state.enabled);
        
        if (state.enabled) {
            bar.style.display = 'block';
            // 使用setTimeout确保display改变后动画生效
            setTimeout(() => {
                bar.classList.add('active');
                // 调整聊天区域布局以避免冲突
                adjustChatAreaForBottomBar(true);
            }, 10);
        } else {
            bar.classList.remove('active');
            // 立即重置聊天区域布局
            adjustChatAreaForBottomBar(false);
            // 等待动画完成后隐藏
            setTimeout(() => {
                bar.style.display = 'none';
            }, 400);
        }
        
        cards.forEach(card => {
            card.classList.toggle('selection-mode', state.enabled);
        });
        
        if (!state.enabled) {
            state.targetSlot = null;
            updateSlotHighlight();
            hideSelectionHint();
        }
    }

    // 关闭多选模式
    function closeMultiMode() {
        if (state.enabled) {
            state.enabled = false;
            
            const trigger = document.querySelector('.multi-brain-trigger');
            const bar = document.querySelector('.multi-brain-bar');
            const cards = document.querySelectorAll('.idea-card');
            
            trigger.classList.remove('active');
            bar.classList.remove('active');
            
            // 立即重置聊天区域布局
            adjustChatAreaForBottomBar(false);
            
            // 等待动画完成后隐藏
            setTimeout(() => {
                bar.style.display = 'none';
            }, 400);
            
            cards.forEach(card => {
                card.classList.remove('selection-mode');
            });
            
            state.targetSlot = null;
            updateSlotHighlight();
            hideSelectionHint();
        }
    }

    // 分配到槽位
    function assignToSlot(ideaId, slotNumber, card) {
        const ideaData = extractIdeaData(card);
        
        // 更新状态
        state.selectedSlots.set(ideaId, slotNumber);
        state.lines[`line${slotNumber}`] = {
            idea: ideaData,
            outline: { status: 'pending', data: null },
            novel: { status: 'pending', data: null },
            script: { status: 'pending', data: null }
        };
        
        // 更新槽位UI
        updateSlotUI(slotNumber, ideaData);
        
        // 更新卡片样式
        updateCardStyle(card, slotNumber);
        
        // 更新按钮状态
        updateButtonStates();
        
        // 保存状态
        saveState();
        
        showMessage(`已将"${ideaData.title}"添加到槽位${slotNumber}`);
    }

    // 从槽位移除
    function removeFromSlot(slotNumber) {
        // 找到对应的创意
        let ideaId = null;
        for (let [id, slot] of state.selectedSlots) {
            if (slot === slotNumber) {
                ideaId = id;
                break;
            }
        }
        
        if (!ideaId) return;
        
        // 更新状态
        state.selectedSlots.delete(ideaId);
        delete state.lines[`line${slotNumber}`];
        
        // 重置槽位UI
        resetSlotUI(slotNumber);
        
        // 重置卡片样式
        const card = document.querySelector(`.idea-card[data-id="${ideaId}"]`);
        if (card) {
            resetCardStyle(card);
        }
        
        // 更新按钮状态
        updateButtonStates();
        
        // 保存状态
        saveState();
    }

    // 提取创意数据
    function extractIdeaData(card) {
        return {
            id: card.dataset.id,
            title: card.querySelector('.card-title')?.textContent || '',
            content: card.querySelector('.card-content')?.textContent || '',
            genre: card.querySelector('.card-badge')?.textContent || ''
        };
    }

    // 更新槽位UI
    function updateSlotUI(slotNumber, ideaData) {
        const slot = document.querySelector(`.mini-slot[data-slot="${slotNumber}"]`);
        if (!slot) return;
        
        slot.classList.remove('empty');
        slot.classList.add('filled');
        
        slot.innerHTML = `
            <div class="slot-icon">
                <i class="fas fa-check"></i>
            </div>
            <div class="slot-text">
                <div class="slot-label">槽位 ${slotNumber}</div>
                <div class="slot-title">${ideaData.title}</div>
            </div>
            <button class="mini-slot-remove">
                <i class="fas fa-times"></i>
            </button>
        `;
    }

    // 重置槽位UI
    function resetSlotUI(slotNumber) {
        const slot = document.querySelector(`.mini-slot[data-slot="${slotNumber}"]`);
        if (!slot) return;
        
        slot.classList.add('empty');
        slot.classList.remove('filled');
        
        slot.innerHTML = `
            <div class="slot-icon">
                <i class="fas fa-plus"></i>
            </div>
            <div class="slot-text">
                <div class="slot-label">槽位 ${slotNumber}</div>
                <div class="slot-empty-text">点击选择创意</div>
            </div>
        `;
    }

    // 更新卡片样式
    function updateCardStyle(card, slotNumber) {
        // 移除其他槽位样式
        card.classList.remove('selected-slot-1', 'selected-slot-2', 'selected-slot-3');
        // 添加当前槽位样式
        card.classList.add(`selected-slot-${slotNumber}`);
        
        // 添加角标
        const existingIndicator = card.querySelector('.card-slot-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const indicator = document.createElement('div');
        indicator.className = `card-slot-indicator slot-${slotNumber}`;
        indicator.textContent = slotNumber;
        card.appendChild(indicator);
        
        // 更新选择按钮
        const selectBtn = card.querySelector('.btn-select');
        if (selectBtn) {
            selectBtn.innerHTML = `<i class="fas fa-check-circle"></i> 已选`;
        }
    }

    // 重置卡片样式
    function resetCardStyle(card) {
        card.classList.remove('selected-slot-1', 'selected-slot-2', 'selected-slot-3');
        
        const indicator = card.querySelector('.card-slot-indicator');
        if (indicator) {
            indicator.remove();
        }
        
        const selectBtn = card.querySelector('.btn-select');
        if (selectBtn) {
            selectBtn.innerHTML = `<i class="fas fa-check"></i> 选择`;
        }
    }

    // 更新槽位高亮
    function updateSlotHighlight() {
        document.querySelectorAll('.mini-slot').forEach(slot => {
            const slotNumber = parseInt(slot.dataset.slot);
            slot.classList.toggle('selecting', slotNumber === state.targetSlot);
        });
    }

    // 显示选择提示
    function showSelectionHint() {
        const hint = document.querySelector('.selection-hint');
        hint.classList.add('active');
        
        setTimeout(() => {
            hint.classList.remove('active');
        }, 3000);
    }

    // 隐藏选择提示
    function hideSelectionHint() {
        const hint = document.querySelector('.selection-hint');
        hint.classList.remove('active');
    }

    // 更新按钮状态
    function updateButtonStates() {
        const count = state.selectedSlots.size;
        
        // 更新徽章
        const badge = document.querySelector('.trigger-badge');
        if (count > 0) {
            badge.style.display = 'flex';
            badge.textContent = count;
        } else {
            badge.style.display = 'none';
        }
        
        // 更新开始按钮
        const startBtn = document.getElementById('btn-start-creation');
        startBtn.disabled = count === 0;
    }

    // 清空所有
    function clearAll() {
        for (let i = 1; i <= CONFIG.MAX_SLOTS; i++) {
            removeFromSlot(i);
        }
        showMessage('已重置所有选择');
    }

    // 开始创作
    function startCreation() {
        const count = state.selectedSlots.size;
        if (count === 0) return;
        
        closeMultiMode();
        showMessage(`已创建${count}条创作线路，开始创作！`);
        
        // TODO: 实际的创作逻辑
    }

    // 查找创意所在槽位
    function findIdeaSlot(ideaId) {
        return state.selectedSlots.get(ideaId) || null;
    }

    // 查找空槽位
    function findEmptySlot() {
        for (let i = 1; i <= CONFIG.MAX_SLOTS; i++) {
            if (![...state.selectedSlots.values()].includes(i)) {
                return i;
            }
        }
        return null;
    }

    // 显示消息
    function showMessage(text) {
        // 使用现有的聊天消息系统
        if (typeof addMessageToChat === 'function') {
            addMessageToChat('assistant', text);
        } else {
            console.log(text);
        }
    }

    // 保存状态
    function saveState() {
        localStorage.setItem('multiBrainHoleV3State', JSON.stringify({
            selectedSlots: Array.from(state.selectedSlots.entries()),
            lines: state.lines
        }));
    }

    // 恢复状态
    function restoreState() {
        const saved = localStorage.getItem('multiBrainHoleV3State');
        if (!saved) return;
        
        try {
            const data = JSON.parse(saved);
            state.selectedSlots = new Map(data.selectedSlots || []);
            state.lines = data.lines || {};
            
            // 恢复UI
            state.selectedSlots.forEach((slotNumber, ideaId) => {
                const card = document.querySelector(`.idea-card[data-id="${ideaId}"]`);
                if (card && state.lines[`line${slotNumber}`]) {
                    updateSlotUI(slotNumber, state.lines[`line${slotNumber}`].idea);
                    updateCardStyle(card, slotNumber);
                }
            });
            
            updateButtonStates();
        } catch (e) {
            console.error('恢复状态失败:', e);
        }
    }

    // 导出API
    window.MultiBrainHoleV3 = {
        init,
        toggleMultiMode,
        clearAll,
        startCreation
    };

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();