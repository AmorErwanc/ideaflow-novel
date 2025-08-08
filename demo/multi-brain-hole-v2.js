// 多脑洞并行生成 V2 - 优化版本
// 采用标签页模式，提供更好的用户体验

(function() {
    'use strict';

    // 配置
    const CONFIG = {
        MAX_SLOTS: 3,
        ANIMATION_DURATION: 300,
        COLORS: {
            slot1: { primary: '#8B5CF6', light: '#EDE9FE', dark: '#6D28D9', name: '紫色' },
            slot2: { primary: '#3B82F6', light: '#DBEAFE', dark: '#1E40AF', name: '蓝色' },
            slot3: { primary: '#10B981', light: '#D1FAE5', dark: '#047857', name: '绿色' }
        }
    };

    // 状态管理
    const state = {
        mode: 'single', // single | multi
        selectedSlots: new Map(), // ideaId -> slotNumber
        lines: {},
        currentLine: 1,
        isGuideShown: false
    };

    // 初始化
    function init() {
        injectStyles();
        injectModeSelector();
        enhanceInterface();
        bindEvents();
        restoreState();
        
        // 首次使用显示引导
        if (!localStorage.getItem('multiBrainHoleGuideShown')) {
            setTimeout(() => showGuide(), 1000);
        }
    }

    // 注入样式
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 模式选择器 */
            .mode-selector {
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(255, 255, 255, 0.98);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                padding: 6px;
                display: flex;
                gap: 4px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                z-index: 100;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .mode-btn {
                padding: 8px 20px;
                border: none;
                background: transparent;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                color: #64748b;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
            }

            .mode-btn:hover {
                color: #1e293b;
            }

            .mode-btn.active {
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
            }

            .mode-btn .badge {
                position: absolute;
                top: -4px;
                right: -4px;
                background: #ef4444;
                color: white;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
                font-weight: 600;
            }

            /* 多选模式覆盖层 */
            .multi-select-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(4px);
                z-index: 50;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .multi-select-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            /* 选择面板 */
            .selection-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                width: 90%;
                max-width: 1200px;
                max-height: 85vh;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                z-index: 101;
                display: flex;
                flex-direction: column;
            }

            .selection-panel.active {
                opacity: 1;
                visibility: visible;
                transform: translate(-50%, -50%) scale(1);
            }

            .panel-header {
                padding: 24px 32px;
                border-bottom: 1px solid #e2e8f0;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border-radius: 20px 20px 0 0;
            }

            .panel-title {
                font-size: 24px;
                font-weight: 700;
                color: #1e293b;
                margin: 0 0 8px 0;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .panel-subtitle {
                color: #64748b;
                font-size: 14px;
            }

            .panel-close {
                position: absolute;
                top: 24px;
                right: 24px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: white;
                border: none;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .panel-close:hover {
                transform: rotate(90deg);
                background: #f1f5f9;
            }

            .panel-body {
                display: flex;
                flex: 1;
                overflow: hidden;
            }

            /* 槽位区域 */
            .slots-section {
                width: 340px;
                padding: 24px;
                background: #f8fafc;
                border-right: 1px solid #e2e8f0;
            }

            .slots-title {
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                color: #94a3b8;
                margin-bottom: 16px;
                letter-spacing: 0.5px;
            }

            .slot-cards {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .slot-card {
                background: white;
                border-radius: 12px;
                padding: 16px;
                border: 2px dashed #cbd5e1;
                transition: all 0.3s ease;
                position: relative;
                min-height: 100px;
            }

            .slot-card.empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
            }

            .slot-card.empty:hover {
                border-color: #3b82f6;
                background: #f0f9ff;
            }

            .slot-card.filled {
                border-style: solid;
                padding-top: 24px;
            }

            .slot-card.slot-1.filled {
                border-color: #8B5CF6;
                background: linear-gradient(135deg, #EDE9FE 0%, white 100%);
            }

            .slot-card.slot-2.filled {
                border-color: #3B82F6;
                background: linear-gradient(135deg, #DBEAFE 0%, white 100%);
            }

            .slot-card.slot-3.filled {
                border-color: #10B981;
                background: linear-gradient(135deg, #D1FAE5 0%, white 100%);
            }

            .slot-number {
                position: absolute;
                top: -10px;
                left: 16px;
                background: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .slot-card.slot-1 .slot-number {
                color: #8B5CF6;
                border: 2px solid #8B5CF6;
            }

            .slot-card.slot-2 .slot-number {
                color: #3B82F6;
                border: 2px solid #3B82F6;
            }

            .slot-card.slot-3 .slot-number {
                color: #10B981;
                border: 2px solid #10B981;
            }

            .slot-empty-icon {
                font-size: 32px;
                color: #cbd5e1;
                margin-bottom: 8px;
            }

            .slot-empty-text {
                color: #94a3b8;
                font-size: 14px;
            }

            .slot-content {
                display: flex;
                justify-content: space-between;
                align-items: start;
                gap: 12px;
            }

            .slot-info {
                flex: 1;
            }

            .slot-idea-title {
                font-weight: 600;
                color: #1e293b;
                margin-bottom: 4px;
                font-size: 14px;
            }

            .slot-idea-genre {
                display: inline-block;
                padding: 2px 8px;
                background: white;
                border-radius: 12px;
                font-size: 12px;
                color: #64748b;
                margin-bottom: 8px;
            }

            .slot-idea-desc {
                font-size: 12px;
                color: #64748b;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .slot-remove {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: none;
                background: white;
                color: #94a3b8;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }

            .slot-remove:hover {
                background: #fee2e2;
                color: #ef4444;
                transform: scale(1.1);
            }

            /* 创意区域 */
            .ideas-section {
                flex: 1;
                padding: 24px;
                overflow-y: auto;
            }

            .ideas-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 16px;
            }

            .multi-idea-card {
                background: white;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                padding: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
            }

            .multi-idea-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
            }

            .multi-idea-card.selected-1 {
                border-color: #8B5CF6;
                background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, white 100%);
            }

            .multi-idea-card.selected-2 {
                border-color: #3B82F6;
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, white 100%);
            }

            .multi-idea-card.selected-3 {
                border-color: #10B981;
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, white 100%);
            }

            .idea-slot-badge {
                position: absolute;
                top: -8px;
                right: -8px;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 14px;
                color: white;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }

            .idea-slot-badge.slot-1 { background: #8B5CF6; }
            .idea-slot-badge.slot-2 { background: #3B82F6; }
            .idea-slot-badge.slot-3 { background: #10B981; }

            /* 底部操作栏 */
            .panel-footer {
                padding: 20px 32px;
                border-top: 1px solid #e2e8f0;
                background: white;
                border-radius: 0 0 20px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .selection-stats {
                display: flex;
                align-items: center;
                gap: 24px;
            }

            .stat-item {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                color: #64748b;
            }

            .stat-value {
                font-weight: 600;
                color: #1e293b;
            }

            .panel-actions {
                display: flex;
                gap: 12px;
            }

            .btn-panel {
                padding: 10px 24px;
                border-radius: 8px;
                border: none;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 14px;
            }

            .btn-secondary {
                background: #f1f5f9;
                color: #64748b;
            }

            .btn-secondary:hover {
                background: #e2e8f0;
                color: #475569;
            }

            .btn-primary {
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: white;
            }

            .btn-primary:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }

            .btn-primary:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            /* 引导提示 */
            .guide-tooltip {
                position: absolute;
                background: #1e293b;
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 1000;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                animation: bounce 1s ease infinite;
            }

            .guide-tooltip::after {
                content: '';
                position: absolute;
                bottom: -6px;
                left: 50%;
                transform: translateX(-50%);
                width: 12px;
                height: 12px;
                background: #1e293b;
                transform: rotate(45deg);
            }

            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }

            /* 动画效果 */
            @keyframes slideIn {
                from {
                    transform: translateX(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .animate-slide-in {
                animation: slideIn 0.3s ease;
            }

            .animate-fade-in {
                animation: fadeIn 0.3s ease;
            }

            /* 响应式 */
            @media (max-width: 768px) {
                .selection-panel {
                    width: 100%;
                    height: 100%;
                    max-width: none;
                    max-height: none;
                    border-radius: 0;
                }

                .panel-body {
                    flex-direction: column;
                }

                .slots-section {
                    width: 100%;
                    border-right: none;
                    border-bottom: 1px solid #e2e8f0;
                }

                .slot-cards {
                    flex-direction: row;
                    overflow-x: auto;
                    padding-bottom: 12px;
                }

                .slot-card {
                    min-width: 200px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 注入模式选择器
    function injectModeSelector() {
        const selector = document.createElement('div');
        selector.className = 'mode-selector';
        selector.innerHTML = `
            <button class="mode-btn active" data-mode="single">
                <i class="fas fa-file-alt"></i> 单线模式
            </button>
            <button class="mode-btn" data-mode="multi">
                <i class="fas fa-layer-group"></i> 多线路模式
                <span class="badge" style="display: none;">0</span>
            </button>
        `;
        document.body.appendChild(selector);

        // 创建选择面板
        const panel = createSelectionPanel();
        document.body.appendChild(panel);

        // 创建覆盖层
        const overlay = document.createElement('div');
        overlay.className = 'multi-select-overlay';
        document.body.appendChild(overlay);
    }

    // 创建选择面板
    function createSelectionPanel() {
        const panel = document.createElement('div');
        panel.className = 'selection-panel';
        panel.innerHTML = `
            <button class="panel-close">
                <i class="fas fa-times"></i>
            </button>
            <div class="panel-header">
                <h2 class="panel-title">
                    <i class="fas fa-layer-group"></i>
                    选择创意开始多线路创作
                </h2>
                <p class="panel-subtitle">选择1-3个不同的创意，每个都会独立生成完整的故事线</p>
            </div>
            <div class="panel-body">
                <div class="slots-section">
                    <h3 class="slots-title">创作槽位</h3>
                    <div class="slot-cards">
                        <div class="slot-card empty slot-1" data-slot="1">
                            <span class="slot-number">槽位 1</span>
                            <i class="fas fa-plus-circle slot-empty-icon"></i>
                            <span class="slot-empty-text">点击右侧选择创意</span>
                        </div>
                        <div class="slot-card empty slot-2" data-slot="2">
                            <span class="slot-number">槽位 2</span>
                            <i class="fas fa-plus-circle slot-empty-icon"></i>
                            <span class="slot-empty-text">点击右侧选择创意</span>
                        </div>
                        <div class="slot-card empty slot-3" data-slot="3">
                            <span class="slot-number">槽位 3</span>
                            <i class="fas fa-plus-circle slot-empty-icon"></i>
                            <span class="slot-empty-text">点击右侧选择创意</span>
                        </div>
                    </div>
                </div>
                <div class="ideas-section">
                    <div class="ideas-grid">
                        <!-- 动态填充创意卡片 -->
                    </div>
                </div>
            </div>
            <div class="panel-footer">
                <div class="selection-stats">
                    <div class="stat-item">
                        <i class="fas fa-check-circle"></i>
                        已选择 <span class="stat-value">0</span> / 3
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-rocket"></i>
                        将创建 <span class="stat-value">0</span> 条故事线
                    </div>
                </div>
                <div class="panel-actions">
                    <button class="btn-panel btn-secondary" onclick="MultiBrainHole.clearAll()">
                        <i class="fas fa-redo"></i> 重置
                    </button>
                    <button class="btn-panel btn-primary" disabled onclick="MultiBrainHole.startCreation()">
                        <i class="fas fa-play"></i> 开始创作
                    </button>
                </div>
            </div>
        `;
        return panel;
    }

    // 增强界面
    function enhanceInterface() {
        // 同步创意卡片到选择面板
        syncIdeaCards();
    }

    // 同步创意卡片
    function syncIdeaCards() {
        const originalCards = document.querySelectorAll('.idea-card');
        const ideasGrid = document.querySelector('.ideas-section .ideas-grid');
        
        if (!ideasGrid) return;
        
        ideasGrid.innerHTML = '';
        
        originalCards.forEach(card => {
            const multiCard = document.createElement('div');
            multiCard.className = 'multi-idea-card';
            multiCard.dataset.id = card.dataset.id;
            
            const title = card.querySelector('.card-title')?.textContent || '';
            const content = card.querySelector('.card-content')?.textContent || '';
            const genre = card.querySelector('.card-badge')?.textContent || '';
            
            multiCard.innerHTML = `
                <div class="card-genre" style="
                    display: inline-block;
                    padding: 4px 12px;
                    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                    color: white;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    margin-bottom: 12px;
                ">${genre}</div>
                <h3 style="
                    font-size: 16px;
                    font-weight: 600;
                    color: #1e293b;
                    margin-bottom: 8px;
                ">${title}</h3>
                <p style="
                    font-size: 14px;
                    color: #64748b;
                    line-height: 1.5;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                ">${content}</p>
            `;
            
            ideasGrid.appendChild(multiCard);
        });
    }

    // 绑定事件
    function bindEvents() {
        // 模式切换
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                switchMode(mode);
            });
        });

        // 关闭面板
        document.querySelector('.panel-close').addEventListener('click', closePanel);
        document.querySelector('.multi-select-overlay').addEventListener('click', closePanel);

        // 创意卡片点击
        document.addEventListener('click', (e) => {
            if (e.target.closest('.multi-idea-card')) {
                const card = e.target.closest('.multi-idea-card');
                toggleCardSelection(card);
            }
        });

        // 槽位移除按钮
        document.addEventListener('click', (e) => {
            if (e.target.closest('.slot-remove')) {
                const slotCard = e.target.closest('.slot-card');
                const slotNumber = parseInt(slotCard.dataset.slot);
                clearSlot(slotNumber);
            }
        });
    }

    // 切换模式
    function switchMode(mode) {
        state.mode = mode;
        
        // 更新按钮状态
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        if (mode === 'multi') {
            openPanel();
        } else {
            closePanel();
            // 切回单线模式逻辑
        }
    }

    // 打开面板
    function openPanel() {
        document.querySelector('.multi-select-overlay').classList.add('active');
        document.querySelector('.selection-panel').classList.add('active');
        
        // 刷新创意卡片
        syncIdeaCards();
        
        // 恢复选择状态
        restoreSelections();
    }

    // 关闭面板
    function closePanel() {
        document.querySelector('.multi-select-overlay').classList.remove('active');
        document.querySelector('.selection-panel').classList.remove('active');
    }

    // 切换卡片选择
    function toggleCardSelection(card) {
        const ideaId = card.dataset.id;
        
        if (state.selectedSlots.has(ideaId)) {
            // 取消选择
            const slotNumber = state.selectedSlots.get(ideaId);
            clearSlot(slotNumber);
        } else {
            // 添加选择
            const emptySlot = findEmptySlot();
            if (emptySlot) {
                selectIdea(ideaId, emptySlot);
            } else {
                showMessage('已选择3个创意，请先移除一个');
            }
        }
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

    // 选择创意
    function selectIdea(ideaId, slotNumber) {
        const card = document.querySelector(`.multi-idea-card[data-id="${ideaId}"]`);
        if (!card) return;

        // 更新状态
        state.selectedSlots.set(ideaId, slotNumber);

        // 更新卡片样式
        card.classList.add(`selected-${slotNumber}`);
        
        // 添加角标
        const badge = document.createElement('div');
        badge.className = `idea-slot-badge slot-${slotNumber}`;
        badge.textContent = slotNumber;
        card.appendChild(badge);

        // 更新槽位卡片
        updateSlotCard(slotNumber, card);

        // 更新统计
        updateStats();

        // 保存状态
        saveState();
    }

    // 更新槽位卡片
    function updateSlotCard(slotNumber, ideaCard) {
        const slotCard = document.querySelector(`.slot-card[data-slot="${slotNumber}"]`);
        if (!slotCard) return;

        const title = ideaCard.querySelector('h3')?.textContent || '';
        const genre = ideaCard.querySelector('.card-genre')?.textContent || '';
        const content = ideaCard.querySelector('p')?.textContent || '';

        slotCard.classList.remove('empty');
        slotCard.classList.add('filled', 'animate-fade-in');

        slotCard.innerHTML = `
            <span class="slot-number">槽位 ${slotNumber}</span>
            <div class="slot-content">
                <div class="slot-info">
                    <h4 class="slot-idea-title">${title}</h4>
                    <span class="slot-idea-genre">${genre}</span>
                    <p class="slot-idea-desc">${content}</p>
                </div>
                <button class="slot-remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    // 清空槽位
    function clearSlot(slotNumber) {
        // 找到对应的创意ID
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

        // 更新创意卡片
        const card = document.querySelector(`.multi-idea-card[data-id="${ideaId}"]`);
        if (card) {
            card.classList.remove(`selected-${slotNumber}`);
            const badge = card.querySelector('.idea-slot-badge');
            if (badge) badge.remove();
        }

        // 重置槽位卡片
        const slotCard = document.querySelector(`.slot-card[data-slot="${slotNumber}"]`);
        if (slotCard) {
            slotCard.classList.add('empty');
            slotCard.classList.remove('filled');
            slotCard.innerHTML = `
                <span class="slot-number">槽位 ${slotNumber}</span>
                <i class="fas fa-plus-circle slot-empty-icon"></i>
                <span class="slot-empty-text">点击右侧选择创意</span>
            `;
        }

        // 更新统计
        updateStats();

        // 保存状态
        saveState();
    }

    // 清空所有
    function clearAll() {
        for (let i = 1; i <= CONFIG.MAX_SLOTS; i++) {
            clearSlot(i);
        }
    }

    // 更新统计
    function updateStats() {
        const count = state.selectedSlots.size;
        
        // 更新面板统计
        document.querySelectorAll('.stat-value')[0].textContent = count;
        document.querySelectorAll('.stat-value')[1].textContent = count;

        // 更新按钮状态
        const startBtn = document.querySelector('.btn-primary');
        startBtn.disabled = count === 0;

        // 更新模式按钮角标
        const badge = document.querySelector('.mode-btn[data-mode="multi"] .badge');
        if (count > 0) {
            badge.style.display = 'block';
            badge.textContent = count;
        } else {
            badge.style.display = 'none';
        }
    }

    // 开始创作
    function startCreation() {
        if (state.selectedSlots.size === 0) {
            showMessage('请至少选择一个创意');
            return;
        }

        // 关闭面板
        closePanel();

        // 切换到创作界面
        showMessage(`已创建 ${state.selectedSlots.size} 条创作线路！`);

        // TODO: 实际的创作逻辑
    }

    // 显示引导
    function showGuide() {
        if (state.isGuideShown) return;
        
        const steps = [
            { element: '.mode-btn[data-mode="multi"]', text: '点击这里进入多线路模式' },
            { element: '.ideas-grid', text: '选择1-3个你喜欢的创意' },
            { element: '.slot-cards', text: '已选创意会显示在这里' },
            { element: '.btn-primary', text: '选好后点击开始创作' }
        ];

        // TODO: 实现引导逻辑
        
        state.isGuideShown = true;
        localStorage.setItem('multiBrainHoleGuideShown', 'true');
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
        localStorage.setItem('multiBrainHoleState', JSON.stringify({
            selectedSlots: Array.from(state.selectedSlots.entries()),
            lines: state.lines
        }));
    }

    // 恢复状态
    function restoreState() {
        const saved = localStorage.getItem('multiBrainHoleState');
        if (!saved) return;

        try {
            const data = JSON.parse(saved);
            state.selectedSlots = new Map(data.selectedSlots || []);
            state.lines = data.lines || {};
            
            updateStats();
        } catch (e) {
            console.error('Failed to restore state:', e);
        }
    }

    // 恢复选择状态
    function restoreSelections() {
        state.selectedSlots.forEach((slotNumber, ideaId) => {
            const card = document.querySelector(`.multi-idea-card[data-id="${ideaId}"]`);
            if (card) {
                selectIdea(ideaId, slotNumber);
            }
        });
    }

    // 导出API
    window.MultiBrainHole = {
        init,
        switchMode,
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