// 多脑洞并行生成功能 - 整合到现有界面

// 全局状态
const multiBrainHoleState = {
    // 槽位状态
    slots: {
        slot1: null,
        slot2: null,
        slot3: null
    },
    
    // 创作线路
    lines: {
        line1: null,
        line2: null,
        line3: null
    },
    
    // 当前激活线路
    activeLine: 1,
    
    // 选择模式
    selectionMode: false,
    
    // 线路颜色
    lineColors: {
        1: { primary: '#667eea', secondary: 'rgba(102, 126, 234, 0.1)', name: '紫色' },
        2: { primary: '#4F46E5', secondary: 'rgba(79, 70, 229, 0.1)', name: '蓝色' },
        3: { primary: '#10B981', secondary: 'rgba(16, 185, 129, 0.1)', name: '绿色' }
    }
};

// 初始化多脑洞功能
function initMultiBrainHole() {
    // 添加槽位管理面板到AI助手区域
    injectSlotManager();
    
    // 修改卡片选择逻辑
    enhanceCardSelection();
    
    // 更新导航栏
    updateNavbarForMultiLine();
    
    // 恢复会话
    restoreMultiLineSession();
}

// 注入槽位管理面板
function injectSlotManager() {
    // 在智能建议区上方添加槽位管理器
    const suggestionsArea = document.querySelector('.smart-suggestions');
    if (!suggestionsArea) return;
    
    const slotManager = document.createElement('div');
    slotManager.className = 'slot-manager';
    slotManager.innerHTML = `
        <div class="slot-header">
            <span class="slot-title">
                <i class="fas fa-layer-group"></i> 创作槽位
                <span class="slot-count">(0/3)</span>
            </span>
            <button class="btn-slot-toggle" title="展开/收起">
                <i class="fas fa-chevron-up"></i>
            </button>
        </div>
        <div class="slot-content">
            <div class="slots-grid">
                <div class="slot-item empty" data-slot="1">
                    <div class="slot-color-bar" style="background: #667eea"></div>
                    <div class="slot-body">
                        <i class="fas fa-plus-circle"></i>
                        <span>槽位 1</span>
                    </div>
                </div>
                <div class="slot-item empty" data-slot="2">
                    <div class="slot-color-bar" style="background: #4F46E5"></div>
                    <div class="slot-body">
                        <i class="fas fa-plus-circle"></i>
                        <span>槽位 2</span>
                    </div>
                </div>
                <div class="slot-item empty" data-slot="3">
                    <div class="slot-color-bar" style="background: #10B981"></div>
                    <div class="slot-body">
                        <i class="fas fa-plus-circle"></i>
                        <span>槽位 3</span>
                    </div>
                </div>
            </div>
            <div class="slot-actions">
                <button class="btn-start-creation" disabled>
                    <i class="fas fa-rocket"></i> 开始创作
                </button>
                <button class="btn-reset-slots">
                    <i class="fas fa-redo"></i> 重置
                </button>
            </div>
        </div>
    `;
    
    suggestionsArea.parentNode.insertBefore(slotManager, suggestionsArea);
    
    // 添加展开/收起功能
    const toggleBtn = slotManager.querySelector('.btn-slot-toggle');
    const slotContent = slotManager.querySelector('.slot-content');
    
    toggleBtn.addEventListener('click', () => {
        slotContent.classList.toggle('collapsed');
        const icon = toggleBtn.querySelector('i');
        icon.classList.toggle('fa-chevron-up');
        icon.classList.toggle('fa-chevron-down');
    });
    
    // 槽位点击事件
    slotManager.querySelectorAll('.slot-item').forEach(slot => {
        slot.addEventListener('click', () => {
            if (slot.classList.contains('empty')) {
                enableSelectionMode(parseInt(slot.dataset.slot));
            }
        });
    });
    
    // 开始创作按钮
    slotManager.querySelector('.btn-start-creation').addEventListener('click', startMultiLineCreation);
    
    // 重置按钮
    slotManager.querySelector('.btn-reset-slots').addEventListener('click', resetAllSlots);
}

// 增强卡片选择功能
function enhanceCardSelection() {
    const cards = document.querySelectorAll('.idea-card');
    
    cards.forEach(card => {
        const selectBtn = card.querySelector('.btn-select');
        if (!selectBtn) return;
        
        // 移除原有事件监听器
        const newSelectBtn = selectBtn.cloneNode(true);
        selectBtn.parentNode.replaceChild(newSelectBtn, selectBtn);
        
        // 添加新的多选逻辑
        newSelectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (multiBrainHoleState.selectionMode) {
                // 选择模式下，分配到指定槽位
                assignToSlot(card);
            } else {
                // 普通模式下，尝试自动分配
                autoAssignToSlot(card);
            }
        });
    });
}

// 启用选择模式
function enableSelectionMode(slotNumber) {
    multiBrainHoleState.selectionMode = true;
    multiBrainHoleState.targetSlot = slotNumber;
    
    // 高亮目标槽位
    document.querySelectorAll('.slot-item').forEach(slot => {
        slot.classList.remove('selecting');
    });
    document.querySelector(`.slot-item[data-slot="${slotNumber}"]`).classList.add('selecting');
    
    // 添加提示
    addMessageToChat('assistant', `请选择一个创意添加到槽位 ${slotNumber}（${multiBrainHoleState.lineColors[slotNumber].name}线路）`);
    
    // 滚动到卡片区域
    document.querySelector('.waterfall-container').scrollIntoView({ behavior: 'smooth' });
}

// 自动分配到槽位
function autoAssignToSlot(card) {
    const emptySlot = findEmptySlot();
    
    if (!emptySlot) {
        // 显示替换对话框
        showReplaceDialog(card);
        return;
    }
    
    assignToSpecificSlot(card, emptySlot);
}

// 分配到指定槽位
function assignToSlot(card) {
    const slotNumber = multiBrainHoleState.targetSlot;
    
    // 如果槽位已占用，先清空
    if (multiBrainHoleState.slots[`slot${slotNumber}`]) {
        clearSlot(slotNumber);
    }
    
    assignToSpecificSlot(card, slotNumber);
    
    // 退出选择模式
    multiBrainHoleState.selectionMode = false;
    multiBrainHoleState.targetSlot = null;
    document.querySelector(`.slot-item[data-slot="${slotNumber}"]`).classList.remove('selecting');
}

// 分配到特定槽位
function assignToSpecificSlot(card, slotNumber) {
    const ideaData = {
        id: card.dataset.id,
        title: card.querySelector('.card-title').textContent,
        content: card.querySelector('.card-content').textContent,
        genre: card.querySelector('.card-badge').textContent
    };
    
    // 更新状态
    multiBrainHoleState.slots[`slot${slotNumber}`] = ideaData;
    multiBrainHoleState.lines[`line${slotNumber}`] = {
        idea: ideaData,
        outline: { status: 'pending', data: null },
        novel: { status: 'pending', data: null },
        script: { status: 'pending', data: null }
    };
    
    // 更新槽位UI
    updateSlotUI(slotNumber, ideaData);
    
    // 更新卡片状态
    updateCardState(card, slotNumber, true);
    
    // 更新计数和按钮状态
    updateSlotCount();
    
    // 保存状态
    saveMultiLineSession();
    
    // 添加消息
    addMessageToChat('assistant', `已将"${ideaData.title}"添加到槽位 ${slotNumber}（${multiBrainHoleState.lineColors[slotNumber].name}线路）`);
}

// 更新槽位UI
function updateSlotUI(slotNumber, ideaData) {
    const slot = document.querySelector(`.slot-item[data-slot="${slotNumber}"]`);
    if (!slot) return;
    
    const color = multiBrainHoleState.lineColors[slotNumber];
    
    slot.classList.remove('empty');
    slot.classList.add('filled');
    
    slot.innerHTML = `
        <div class="slot-color-bar" style="background: ${color.primary}"></div>
        <div class="slot-body">
            <div class="slot-info">
                <span class="slot-label">槽位 ${slotNumber}</span>
                <span class="slot-title">${ideaData.title}</span>
            </div>
            <button class="btn-remove-slot" data-slot="${slotNumber}">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // 添加移除事件
    slot.querySelector('.btn-remove-slot').addEventListener('click', (e) => {
        e.stopPropagation();
        clearSlot(slotNumber);
    });
}

// 更新卡片状态
function updateCardState(card, slotNumber, selected) {
    if (selected) {
        // 移除其他槽位的选中状态
        card.classList.remove('selected-slot-1', 'selected-slot-2', 'selected-slot-3');
        // 添加当前槽位的选中状态
        card.classList.add('selected', `selected-slot-${slotNumber}`);
        
        const selectBtn = card.querySelector('.btn-select');
        selectBtn.innerHTML = `<i class="fas fa-check-circle"></i> 槽位${slotNumber}`;
        selectBtn.style.background = multiBrainHoleState.lineColors[slotNumber].primary;
        selectBtn.style.color = 'white';
    } else {
        card.classList.remove('selected', 'selected-slot-1', 'selected-slot-2', 'selected-slot-3');
        
        const selectBtn = card.querySelector('.btn-select');
        selectBtn.innerHTML = '<i class="fas fa-check"></i> 选择';
        selectBtn.style.background = '';
        selectBtn.style.color = '';
    }
}

// 清空槽位
function clearSlot(slotNumber) {
    const ideaId = multiBrainHoleState.slots[`slot${slotNumber}`]?.id;
    
    // 清空状态
    multiBrainHoleState.slots[`slot${slotNumber}`] = null;
    multiBrainHoleState.lines[`line${slotNumber}`] = null;
    
    // 恢复槽位UI
    const slot = document.querySelector(`.slot-item[data-slot="${slotNumber}"]`);
    slot.classList.remove('filled');
    slot.classList.add('empty');
    
    slot.innerHTML = `
        <div class="slot-color-bar" style="background: ${multiBrainHoleState.lineColors[slotNumber].primary}"></div>
        <div class="slot-body">
            <i class="fas fa-plus-circle"></i>
            <span>槽位 ${slotNumber}</span>
        </div>
    `;
    
    // 恢复卡片状态
    if (ideaId) {
        const card = document.querySelector(`.idea-card[data-id="${ideaId}"]`);
        if (card) {
            updateCardState(card, slotNumber, false);
        }
    }
    
    // 更新计数
    updateSlotCount();
    saveMultiLineSession();
}

// 查找空槽位
function findEmptySlot() {
    for (let i = 1; i <= 3; i++) {
        if (!multiBrainHoleState.slots[`slot${i}`]) {
            return i;
        }
    }
    return null;
}

// 更新槽位计数
function updateSlotCount() {
    const count = Object.values(multiBrainHoleState.slots).filter(s => s !== null).length;
    
    // 更新显示
    document.querySelector('.slot-count').textContent = `(${count}/3)`;
    
    // 更新按钮状态
    const startBtn = document.querySelector('.btn-start-creation');
    startBtn.disabled = count === 0;
    
    // 更新导航栏
    updateNavProgress();
}

// 重置所有槽位
function resetAllSlots() {
    if (!confirm('确定要重置所有选择吗？')) return;
    
    for (let i = 1; i <= 3; i++) {
        clearSlot(i);
    }
    
    addMessageToChat('assistant', '已重置所有槽位，请重新选择创意。');
}

// 显示替换对话框
function showReplaceDialog(card) {
    const modal = document.createElement('div');
    modal.className = 'multi-modal';
    modal.innerHTML = `
        <div class="multi-modal-content">
            <div class="multi-modal-header">
                <h3>槽位已满</h3>
                <button class="multi-modal-close">&times;</button>
            </div>
            <div class="multi-modal-body">
                <p>所有槽位都已占用，请选择要替换的槽位：</p>
                <div class="replace-options">
                    ${[1, 2, 3].map(i => {
                        const slot = multiBrainHoleState.slots[`slot${i}`];
                        const color = multiBrainHoleState.lineColors[i];
                        return `
                            <button class="replace-option" data-slot="${i}">
                                <span class="replace-color" style="background: ${color.primary}"></span>
                                <span class="replace-info">
                                    <strong>槽位 ${i}</strong>
                                    <small>${slot.title}</small>
                                </span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
            <div class="multi-modal-footer">
                <button class="btn-cancel">取消</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 事件处理
    modal.querySelector('.multi-modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-cancel').addEventListener('click', () => modal.remove());
    
    modal.querySelectorAll('.replace-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const slotNumber = parseInt(opt.dataset.slot);
            clearSlot(slotNumber);
            assignToSpecificSlot(card, slotNumber);
            modal.remove();
        });
    });
}

// 更新导航栏为多线路
function updateNavbarForMultiLine() {
    const navProgress = document.querySelector('.nav-progress');
    if (!navProgress) return;
    
    // 添加线路切换器
    const lineSwitcher = document.createElement('div');
    lineSwitcher.className = 'line-switcher';
    lineSwitcher.innerHTML = `
        <button class="line-tab active" data-line="1">
            <span class="line-dot" style="background: #667eea"></span>
            <span>线路1</span>
        </button>
        <button class="line-tab" data-line="2">
            <span class="line-dot" style="background: #4F46E5"></span>
            <span>线路2</span>
        </button>
        <button class="line-tab" data-line="3">
            <span class="line-dot" style="background: #10B981"></span>
            <span>线路3</span>
        </button>
    `;
    
    navProgress.parentNode.insertBefore(lineSwitcher, navProgress);
    
    // 添加切换事件
    lineSwitcher.querySelectorAll('.line-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const lineNumber = parseInt(tab.dataset.line);
            switchToLine(lineNumber);
        });
    });
}

// 切换线路
function switchToLine(lineNumber) {
    if (!multiBrainHoleState.lines[`line${lineNumber}`]) {
        addMessageToChat('assistant', `线路 ${lineNumber} 还未开始，请先选择创意。`);
        return;
    }
    
    multiBrainHoleState.activeLine = lineNumber;
    
    // 更新标签状态
    document.querySelectorAll('.line-tab').forEach(tab => {
        tab.classList.toggle('active', parseInt(tab.dataset.line) === lineNumber);
    });
    
    // 更新进度条颜色
    updateNavProgress();
    
    addMessageToChat('assistant', `已切换到线路 ${lineNumber}（${multiBrainHoleState.lineColors[lineNumber].name}）`);
}

// 更新导航进度
function updateNavProgress() {
    const progressBg = document.querySelector('.progress-bg');
    if (!progressBg && multiBrainHoleState.activeLine) {
        const color = multiBrainHoleState.lineColors[multiBrainHoleState.activeLine];
        progressBg.style.background = color.primary;
    }
}

// 开始多线路创作
function startMultiLineCreation() {
    const selectedCount = Object.values(multiBrainHoleState.slots).filter(s => s !== null).length;
    
    if (selectedCount === 0) {
        addMessageToChat('assistant', '请至少选择一个创意开始创作。');
        return;
    }
    
    // 隐藏槽位管理器
    document.querySelector('.slot-content').classList.add('collapsed');
    
    // 切换到第一个有内容的线路
    for (let i = 1; i <= 3; i++) {
        if (multiBrainHoleState.lines[`line${i}`]) {
            switchToLine(i);
            break;
        }
    }
    
    addMessageToChat('assistant', `太棒了！已为你创建了 ${selectedCount} 条创作线路。你可以通过顶部的线路标签切换不同的创作线路。`);
}

// 保存会话
function saveMultiLineSession() {
    localStorage.setItem('multiBrainHoleState', JSON.stringify(multiBrainHoleState));
}

// 恢复会话
function restoreMultiLineSession() {
    const saved = localStorage.getItem('multiBrainHoleState');
    if (!saved) return;
    
    try {
        const state = JSON.parse(saved);
        Object.assign(multiBrainHoleState, state);
        
        // 恢复UI状态
        Object.keys(state.slots).forEach(slotKey => {
            const slotNumber = parseInt(slotKey.replace('slot', ''));
            const ideaData = state.slots[slotKey];
            
            if (ideaData) {
                updateSlotUI(slotNumber, ideaData);
                
                // 恢复卡片状态
                const card = document.querySelector(`.idea-card[data-id="${ideaData.id}"]`);
                if (card) {
                    updateCardState(card, slotNumber, true);
                }
            }
        });
        
        updateSlotCount();
        
        if (state.activeLine) {
            switchToLine(state.activeLine);
        }
    } catch (error) {
        console.error('恢复会话失败:', error);
    }
}

// 添加样式
const multiStyle = document.createElement('style');
multiStyle.textContent = `
/* 槽位管理器样式 */
.slot-manager {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    margin-bottom: 1rem;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.slot-header {
    padding: 0.75rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    color: white;
}

.slot-title {
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.slot-count {
    opacity: 0.9;
    font-size: 0.875rem;
}

.btn-slot-toggle {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0.25rem;
}

.slot-content {
    padding: 1rem;
    background: rgba(248, 250, 252, 0.95);
    max-height: 300px;
    transition: all 0.3s ease;
}

.slot-content.collapsed {
    max-height: 0;
    padding: 0;
    overflow: hidden;
}

.slots-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.slot-item {
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.75rem;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.slot-item.empty:hover {
    border-color: #3b82f6;
    transform: translateY(-2px);
}

.slot-item.selecting {
    animation: pulse 1.5s infinite;
    border-color: #3b82f6;
}

@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

.slot-color-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
}

.slot-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.slot-item.empty .slot-body {
    flex-direction: column;
    justify-content: center;
    text-align: center;
    padding: 0.5rem 0;
}

.slot-item.empty i {
    font-size: 1.5rem;
    color: #94a3b8;
    margin-bottom: 0.25rem;
}

.slot-item.empty span {
    font-size: 0.75rem;
    color: #64748b;
}

.slot-item.filled .slot-info {
    flex: 1;
    min-width: 0;
}

.slot-label {
    display: block;
    font-size: 0.625rem;
    color: #94a3b8;
    text-transform: uppercase;
}

.slot-title {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: #1e293b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.btn-remove-slot {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 0.25rem;
    transition: color 0.3s ease;
}

.btn-remove-slot:hover {
    color: #ef4444;
}

.slot-actions {
    display: flex;
    gap: 0.5rem;
}

.slot-actions button {
    flex: 1;
    padding: 0.5rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.btn-start-creation {
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    color: white;
}

.btn-start-creation:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-start-creation:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-reset-slots {
    background: white;
    color: #64748b;
    border: 1px solid #e2e8f0;
}

.btn-reset-slots:hover {
    background: #f8fafc;
    color: #1e293b;
}

/* 线路切换器 */
.line-switcher {
    display: flex;
    gap: 0.5rem;
    padding: 0.25rem;
    background: rgba(30, 41, 59, 0.5);
    border-radius: 8px;
    margin-bottom: 0.75rem;
}

.line-tab {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
}

.line-tab:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
}

.line-tab.active {
    background: rgba(255, 255, 255, 0.2);
    color: white;
}

.line-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
}

/* 卡片选中状态 */
.idea-card.selected-slot-1 {
    border: 2px solid #667eea !important;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
}

.idea-card.selected-slot-2 {
    border: 2px solid #4F46E5 !important;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1) !important;
}

.idea-card.selected-slot-3 {
    border: 2px solid #10B981 !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
}

/* 模态框 */
.multi-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
}

.multi-modal-content {
    background: white;
    border-radius: 12px;
    max-width: 450px;
    width: 90%;
    max-height: 80vh;
    overflow: hidden;
}

.multi-modal-header {
    padding: 1.25rem;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.multi-modal-header h3 {
    margin: 0;
    font-size: 1.125rem;
    color: #1e293b;
}

.multi-modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #64748b;
    cursor: pointer;
}

.multi-modal-body {
    padding: 1.25rem;
}

.multi-modal-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
}

.replace-options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
}

.replace-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: left;
}

.replace-option:hover {
    background: #f1f5f9;
    border-color: #3b82f6;
}

.replace-color {
    width: 4px;
    height: 32px;
    border-radius: 2px;
}

.replace-info strong {
    display: block;
    font-size: 0.875rem;
    color: #1e293b;
    margin-bottom: 0.125rem;
}

.replace-info small {
    display: block;
    font-size: 0.75rem;
    color: #64748b;
}

.btn-cancel {
    padding: 0.5rem 1rem;
    background: #f1f5f9;
    border: none;
    border-radius: 6px;
    color: #64748b;
    cursor: pointer;
}

.btn-cancel:hover {
    background: #e2e8f0;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
`;

document.head.appendChild(multiStyle);

// 导出初始化函数
window.initMultiBrainHole = initMultiBrainHole;