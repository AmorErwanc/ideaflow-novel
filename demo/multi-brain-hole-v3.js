// 多脑洞并行生成 V3 - 无缝整合版
// 真正融入原有界面，提供自然流畅的体验

(function() {
    'use strict';

    // 配置
    const CONFIG = {
        MAX_SLOTS: 3,
        COLORS: [
            { primary: '#8B5CF6', light: '#F3E8FF', name: '紫色线路' },
            { primary: '#3B82F6', light: '#EFF6FF', name: '蓝色线路' },
            { primary: '#10B981', light: '#F0FDF4', name: '绿色线路' }
        ]
    };

    // 状态管理
    const state = {
        mode: 'single',
        selectedCards: new Map(), // cardId -> lineNumber
        activeLines: new Set(),
        currentLine: null,
        isFirstTime: !localStorage.getItem('multiBrainHoleV3Used')
    };

    // 初始化
    function init() {
        enhanceExistingUI();
        addModeToggle();
        bindEvents();
        
        // 首次使用时显示引导
        if (state.isFirstTime) {
            setTimeout(() => showIntroduction(), 1500);
        }
    }

    // 增强现有UI
    function enhanceExistingUI() {
        // 为每个卡片添加多选功能
        const cards = document.querySelectorAll('.idea-card');
        cards.forEach(card => {
            // 添加选择指示器
            const indicator = document.createElement('div');
            indicator.className = 'multi-select-indicator';
            indicator.innerHTML = `
                <div class="line-badge" style="display: none;">
                    <span class="line-number"></span>
                </div>
            `;
            card.appendChild(indicator);

            // 修改选择按钮行为
            const selectBtn = card.querySelector('.btn-select');
            if (selectBtn) {
                // 保存原始点击处理
                const originalOnClick = selectBtn.onclick;
                selectBtn.onclick = null;
                
                selectBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (state.mode === 'single') {
                        // 单选模式：执行原有逻辑
                        if (originalOnClick) originalOnClick.call(selectBtn, e);
                    } else {
                        // 多选模式：执行多选逻辑
                        handleMultiSelect(card);
                    }
                });
            }
        });

        // 增强智能建议区域
        const suggestionsArea = document.querySelector('.smart-suggestions');
        if (suggestionsArea) {
            // 添加多线路状态显示
            const multiStatus = document.createElement('div');
            multiStatus.className = 'multi-line-status';
            multiStatus.style.display = 'none';
            multiStatus.innerHTML = `
                <div class="status-header">
                    <i class="fas fa-layer-group"></i>
                    <span>多线路创作</span>
                </div>
                <div class="selected-lines">
                    <!-- 动态生成 -->
                </div>
                <div class="status-actions">
                    <button class="btn-start-multi" disabled>
                        <i class="fas fa-rocket"></i> 开始创作
                    </button>
                    <button class="btn-clear-selection">
                        <i class="fas fa-redo"></i> 重选
                    </button>
                </div>
            `;
            suggestionsArea.appendChild(multiStatus);
        }

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            /* 模式切换按钮 */
            .mode-toggle {
                position: fixed;
                top: 50%;
                right: 20px;
                transform: translateY(-50%);
                background: white;
                border-radius: 40px;
                padding: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                display: flex;
                flex-direction: column;
                gap: 8px;
                z-index: 100;
                transition: all 0.3s ease;
            }

            .mode-toggle-btn {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                border: 2px solid transparent;
                background: white;
                color: #64748b;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                position: relative;
            }

            .mode-toggle-btn:hover {
                transform: scale(1.1);
            }

            .mode-toggle-btn.active {
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: white;
                border-color: white;
            }

            .mode-toggle-btn .tooltip {
                position: absolute;
                right: 60px;
                background: #1e293b;
                color: white;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }

            .mode-toggle-btn:hover .tooltip {
                opacity: 1;
            }

            /* 多选指示器 */
            .multi-select-indicator {
                position: absolute;
                top: -8px;
                right: -8px;
                z-index: 10;
            }

            .line-badge {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 16px;
                color: white;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                animation: bounceIn 0.3s ease;
            }

            @keyframes bounceIn {
                0% { transform: scale(0); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }

            /* 多选模式下的卡片样式 */
            .multi-select-mode .idea-card {
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .multi-select-mode .idea-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            }

            .multi-select-mode .idea-card.selected-line-1 {
                border: 2px solid #8B5CF6;
                background: linear-gradient(135deg, #F3E8FF 0%, white 100%);
            }

            .multi-select-mode .idea-card.selected-line-2 {
                border: 2px solid #3B82F6;
                background: linear-gradient(135deg, #EFF6FF 0%, white 100%);
            }

            .multi-select-mode .idea-card.selected-line-3 {
                border: 2px solid #10B981;
                background: linear-gradient(135deg, #F0FDF4 0%, white 100%);
            }

            /* 多线路状态 */
            .multi-line-status {
                background: linear-gradient(135deg, #f8fafc 0%, white 100%);
                border-radius: 12px;
                padding: 16px;
                margin-top: 16px;
                border: 1px solid #e2e8f0;
            }

            .status-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
                font-weight: 600;
                color: #1e293b;
            }

            .selected-lines {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 16px;
            }

            .line-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: white;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
            }

            .line-color-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
            }

            .line-title {
                flex: 1;
                font-size: 14px;
                color: #64748b;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .line-remove {
                background: none;
                border: none;
                color: #94a3b8;
                cursor: pointer;
                padding: 4px;
            }

            .line-remove:hover {
                color: #ef4444;
            }

            .status-actions {
                display: flex;
                gap: 8px;
            }

            .status-actions button {
                flex: 1;
                padding: 8px 16px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .btn-start-multi {
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: white;
            }

            .btn-start-multi:not(:disabled):hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }

            .btn-start-multi:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .btn-clear-selection {
                background: #f1f5f9;
                color: #64748b;
            }

            .btn-clear-selection:hover {
                background: #e2e8f0;
            }

            /* 引导提示 */
            .intro-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .intro-modal {
                background: white;
                border-radius: 16px;
                padding: 32px;
                max-width: 480px;
                text-align: center;
                animation: slideUp 0.3s ease;
            }

            @keyframes slideUp {
                from {
                    transform: translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            .intro-icon {
                width: 64px;
                height: 64px;
                margin: 0 auto 16px;
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 28px;
            }

            .intro-title {
                font-size: 24px;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 12px;
            }

            .intro-desc {
                color: #64748b;
                margin-bottom: 24px;
                line-height: 1.6;
            }

            .intro-features {
                text-align: left;
                margin: 24px 0;
                padding: 20px;
                background: #f8fafc;
                border-radius: 12px;
            }

            .intro-feature {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                margin-bottom: 12px;
            }

            .intro-feature:last-child {
                margin-bottom: 0;
            }

            .intro-feature i {
                color: #3b82f6;
                margin-top: 2px;
            }

            .intro-feature span {
                flex: 1;
                color: #475569;
                font-size: 14px;
            }

            .intro-actions {
                display: flex;
                gap: 12px;
            }

            .intro-actions button {
                flex: 1;
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .btn-try-now {
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: white;
            }

            .btn-try-now:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }

            .btn-later {
                background: #f1f5f9;
                color: #64748b;
            }

            .btn-later:hover {
                background: #e2e8f0;
            }

            /* 提示气泡 */
            .hint-bubble {
                position: absolute;
                background: #1e293b;
                color: white;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 12px;
                white-space: nowrap;
                z-index: 200;
                pointer-events: none;
                animation: pulse 2s ease infinite;
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            .hint-bubble::after {
                content: '';
                position: absolute;
                bottom: -6px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 6px solid #1e293b;
            }
        `;
        document.head.appendChild(style);
    }

    // 添加模式切换按钮
    function addModeToggle() {
        const toggle = document.createElement('div');
        toggle.className = 'mode-toggle';
        toggle.innerHTML = `
            <button class="mode-toggle-btn active" data-mode="single">
                <i class="fas fa-file-alt"></i>
                <span class="tooltip">单线模式</span>
            </button>
            <button class="mode-toggle-btn" data-mode="multi">
                <i class="fas fa-layer-group"></i>
                <span class="tooltip">多线路模式</span>
            </button>
        `;
        document.body.appendChild(toggle);
    }

    // 绑定事件
    function bindEvents() {
        // 模式切换
        document.querySelectorAll('.mode-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                switchMode(mode);
            });
        });

        // 开始创作按钮
        const startBtn = document.querySelector('.btn-start-multi');
        if (startBtn) {
            startBtn.addEventListener('click', startMultiLineCreation);
        }

        // 清除选择按钮
        const clearBtn = document.querySelector('.btn-clear-selection');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearAllSelections);
        }
    }

    // 切换模式
    function switchMode(mode) {
        state.mode = mode;
        
        // 更新按钮状态
        document.querySelectorAll('.mode-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // 更新界面状态
        const container = document.querySelector('.waterfall-container');
        const multiStatus = document.querySelector('.multi-line-status');
        
        if (mode === 'multi') {
            container?.classList.add('multi-select-mode');
            multiStatus.style.display = 'block';
            
            // 显示提示
            if (state.selectedCards.size === 0) {
                showHint();
            }
        } else {
            container?.classList.remove('multi-select-mode');
            multiStatus.style.display = 'none';
            clearAllSelections();
        }

        // 更新消息
        updateChatMessage(mode);
    }

    // 处理多选
    function handleMultiSelect(card) {
        const cardId = card.dataset.id;
        
        if (state.selectedCards.has(cardId)) {
            // 取消选择
            removeSelection(cardId);
        } else if (state.selectedCards.size < CONFIG.MAX_SLOTS) {
            // 添加选择
            addSelection(cardId);
        } else {
            // 已满提示
            showMaxSelectionMessage();
        }
    }

    // 添加选择
    function addSelection(cardId) {
        const lineNumber = state.selectedCards.size + 1;
        state.selectedCards.set(cardId, lineNumber);
        state.activeLines.add(lineNumber);

        const card = document.querySelector(`.idea-card[data-id="${cardId}"]`);
        if (card) {
            // 更新卡片样式
            card.classList.add(`selected-line-${lineNumber}`);
            
            // 显示角标
            const badge = card.querySelector('.line-badge');
            const numberSpan = card.querySelector('.line-number');
            if (badge && numberSpan) {
                badge.style.display = 'flex';
                badge.style.background = CONFIG.COLORS[lineNumber - 1].primary;
                numberSpan.textContent = lineNumber;
            }

            // 更新按钮
            const selectBtn = card.querySelector('.btn-select');
            if (selectBtn) {
                selectBtn.innerHTML = `<i class="fas fa-check-circle"></i> 线路${lineNumber}`;
                selectBtn.style.background = CONFIG.COLORS[lineNumber - 1].primary;
                selectBtn.style.color = 'white';
            }
        }

        updateSelectionStatus();
    }

    // 移除选择
    function removeSelection(cardId) {
        const lineNumber = state.selectedCards.get(cardId);
        state.selectedCards.delete(cardId);
        state.activeLines.delete(lineNumber);

        const card = document.querySelector(`.idea-card[data-id="${cardId}"]`);
        if (card) {
            // 移除样式
            card.classList.remove(`selected-line-${lineNumber}`);
            
            // 隐藏角标
            const badge = card.querySelector('.line-badge');
            if (badge) {
                badge.style.display = 'none';
            }

            // 恢复按钮
            const selectBtn = card.querySelector('.btn-select');
            if (selectBtn) {
                selectBtn.innerHTML = '<i class="fas fa-check"></i> 选择';
                selectBtn.style.background = '';
                selectBtn.style.color = '';
            }
        }

        // 重新编号
        reassignLineNumbers();
        updateSelectionStatus();
    }

    // 重新分配线路编号
    function reassignLineNumbers() {
        const newMap = new Map();
        let newLineNumber = 1;
        
        state.selectedCards.forEach((oldLine, cardId) => {
            const card = document.querySelector(`.idea-card[data-id="${cardId}"]`);
            if (card) {
                // 移除旧样式
                card.classList.remove(`selected-line-${oldLine}`);
                
                // 添加新样式
                card.classList.add(`selected-line-${newLineNumber}`);
                
                // 更新角标
                const badge = card.querySelector('.line-badge');
                const numberSpan = card.querySelector('.line-number');
                if (badge && numberSpan) {
                    badge.style.background = CONFIG.COLORS[newLineNumber - 1].primary;
                    numberSpan.textContent = newLineNumber;
                }

                // 更新按钮
                const selectBtn = card.querySelector('.btn-select');
                if (selectBtn) {
                    selectBtn.innerHTML = `<i class="fas fa-check-circle"></i> 线路${newLineNumber}`;
                    selectBtn.style.background = CONFIG.COLORS[newLineNumber - 1].primary;
                }
            }
            
            newMap.set(cardId, newLineNumber);
            newLineNumber++;
        });
        
        state.selectedCards = newMap;
    }

    // 更新选择状态
    function updateSelectionStatus() {
        const selectedLines = document.querySelector('.selected-lines');
        if (selectedLines) {
            selectedLines.innerHTML = '';
            
            state.selectedCards.forEach((lineNumber, cardId) => {
                const card = document.querySelector(`.idea-card[data-id="${cardId}"]`);
                if (card) {
                    const title = card.querySelector('.card-title')?.textContent || '';
                    const lineItem = document.createElement('div');
                    lineItem.className = 'line-item';
                    lineItem.innerHTML = `
                        <span class="line-color-dot" style="background: ${CONFIG.COLORS[lineNumber - 1].primary}"></span>
                        <span class="line-title">${title}</span>
                        <button class="line-remove" data-id="${cardId}">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    selectedLines.appendChild(lineItem);

                    // 绑定移除事件
                    lineItem.querySelector('.line-remove').addEventListener('click', () => {
                        removeSelection(cardId);
                    });
                }
            });
        }

        // 更新按钮状态
        const startBtn = document.querySelector('.btn-start-multi');
        if (startBtn) {
            startBtn.disabled = state.selectedCards.size === 0;
            startBtn.innerHTML = `<i class="fas fa-rocket"></i> 开始创作 (${state.selectedCards.size}/3)`;
        }
    }

    // 清除所有选择
    function clearAllSelections() {
        state.selectedCards.forEach((lineNumber, cardId) => {
            removeSelection(cardId);
        });
        state.selectedCards.clear();
        state.activeLines.clear();
        updateSelectionStatus();
    }

    // 开始多线路创作
    function startMultiLineCreation() {
        if (state.selectedCards.size === 0) return;

        // 切换回单线模式
        switchMode('single');

        // 显示成功消息
        const message = `太棒了！已为你创建了 ${state.selectedCards.size} 条创作线路。每条线路都会独立生成完整的故事。`;
        addMessageToChat('assistant', message);

        // TODO: 实际的创作逻辑
        console.log('开始创作，选中的卡片：', Array.from(state.selectedCards.keys()));
    }

    // 显示介绍
    function showIntroduction() {
        const overlay = document.createElement('div');
        overlay.className = 'intro-overlay';
        overlay.innerHTML = `
            <div class="intro-modal">
                <div class="intro-icon">
                    <i class="fas fa-layer-group"></i>
                </div>
                <h2 class="intro-title">全新多线路创作模式</h2>
                <p class="intro-desc">现在你可以同时选择多个创意，让AI帮你并行创作不同的故事线！</p>
                
                <div class="intro-features">
                    <div class="intro-feature">
                        <i class="fas fa-check-circle"></i>
                        <span>最多选择3个不同的创意脑洞</span>
                    </div>
                    <div class="intro-feature">
                        <i class="fas fa-check-circle"></i>
                        <span>每个创意独立生成完整故事</span>
                    </div>
                    <div class="intro-feature">
                        <i class="fas fa-check-circle"></i>
                        <span>随时切换查看不同线路进度</span>
                    </div>
                </div>

                <div class="intro-actions">
                    <button class="btn-try-now">立即体验</button>
                    <button class="btn-later">稍后再说</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // 绑定按钮事件
        overlay.querySelector('.btn-try-now').addEventListener('click', () => {
            overlay.remove();
            switchMode('multi');
            localStorage.setItem('multiBrainHoleV3Used', 'true');
        });

        overlay.querySelector('.btn-later').addEventListener('click', () => {
            overlay.remove();
            localStorage.setItem('multiBrainHoleV3Used', 'true');
        });
    }

    // 显示提示
    function showHint() {
        const firstCard = document.querySelector('.idea-card');
        if (firstCard) {
            const hint = document.createElement('div');
            hint.className = 'hint-bubble';
            hint.textContent = '点击卡片选择创意';
            hint.style.top = firstCard.offsetTop - 40 + 'px';
            hint.style.left = firstCard.offsetLeft + firstCard.offsetWidth / 2 - 60 + 'px';
            document.body.appendChild(hint);

            setTimeout(() => hint.remove(), 3000);
        }
    }

    // 显示达到上限消息
    function showMaxSelectionMessage() {
        addMessageToChat('assistant', '已选择3个创意，这是最大数量。如需更换，请先取消一个已选创意。');
    }

    // 更新聊天消息
    function updateChatMessage(mode) {
        if (mode === 'multi') {
            addMessageToChat('assistant', '已切换到多线路模式！请选择1-3个你喜欢的创意，我会为每个创意生成独立的故事线。');
        } else {
            addMessageToChat('assistant', '已切换回单线模式。');
        }
    }

    // 添加消息到聊天区
    function addMessageToChat(role, text) {
        const messages = document.querySelector('.chat-messages');
        if (!messages) return;

        // 移除正在输入提示
        const typing = messages.querySelector('.typing-indicator');
        if (typing) typing.style.display = 'none';

        const message = document.createElement('div');
        message.className = `message ${role}`;
        
        const time = new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        if (role === 'assistant') {
            message.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="message-bubble">${text}</div>
                    <span class="message-time">${time}</span>
                </div>
            `;
        } else {
            message.innerHTML = `
                <div class="message-content">
                    <div class="message-bubble">${text}</div>
                    <span class="message-time">${time}</span>
                </div>
            `;
        }

        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
    }

    // 导出API
    window.initMultiBrainHoleV3 = init;

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();