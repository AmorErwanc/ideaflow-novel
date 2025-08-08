// 多脑洞并行生成系统 - 核心逻辑

// 全局状态管理
const multiLineState = {
    // 槽位管理 - 最多3个
    slots: {
        slot1: null,
        slot2: null,
        slot3: null
    },
    
    // 创作线路数据
    lines: {
        line1: null,
        line2: null,
        line3: null
    },
    
    // 当前激活的线路
    activeLine: 1,
    
    // 线路颜色配置
    lineColors: {
        1: { primary: '#667eea', light: 'rgba(102, 126, 234, 0.1)', name: '紫色' },
        2: { primary: '#4F46E5', light: 'rgba(79, 70, 229, 0.1)', name: '蓝色' },
        3: { primary: '#10B981', light: 'rgba(16, 185, 129, 0.1)', name: '绿色' }
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initSlotManager();
    initLineNavigation();
    initIdeaCards();
    initProgressCards();
    initFloatingActions();
    restoreSession();
});

// 槽位管理系统
function initSlotManager() {
    const slotsContainer = document.querySelector('.slots-grid');
    const startBtn = document.querySelector('.slots-actions .btn-primary');
    const resetBtn = document.querySelector('.slots-actions .btn-ghost');
    
    // 重置选择
    resetBtn?.addEventListener('click', () => {
        if (confirm('确定要重置所有选择吗？')) {
            resetAllSlots();
        }
    });
    
    // 开始创作
    startBtn?.addEventListener('click', () => {
        const selectedCount = getSelectedSlotsCount();
        if (selectedCount === 0) {
            showToast('请至少选择一个创意开始创作', 'warning');
            return;
        }
        startCreation();
    });
}

// 初始化创意卡片交互
function initIdeaCards() {
    const ideaCards = document.querySelectorAll('.idea-card');
    
    ideaCards.forEach(card => {
        const selectBtn = card.querySelector('.btn-card-select');
        const favBtn = card.querySelector('.btn-card-fav');
        
        selectBtn?.addEventListener('click', () => {
            const ideaData = {
                id: card.dataset.id,
                title: card.querySelector('.card-title').textContent,
                content: card.querySelector('.card-description').textContent,
                genre: card.querySelector('.card-badge').textContent
            };
            
            handleIdeaSelection(ideaData, card);
        });
        
        favBtn?.addEventListener('click', () => {
            favBtn.classList.toggle('favorited');
            const icon = favBtn.querySelector('i');
            if (favBtn.classList.contains('favorited')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
            }
        });
    });
}

// 处理创意选择
function handleIdeaSelection(ideaData, cardElement) {
    const emptySlot = findEmptySlot();
    
    if (!emptySlot) {
        // 所有槽位已满，显示替换对话框
        showSlotReplaceDialog(ideaData, cardElement);
        return;
    }
    
    // 分配到空闲槽位
    assignToSlot(emptySlot, ideaData, cardElement);
}

// 查找空闲槽位
function findEmptySlot() {
    for (let slot in multiLineState.slots) {
        if (!multiLineState.slots[slot]) {
            return slot;
        }
    }
    return null;
}

// 分配到槽位
function assignToSlot(slotKey, ideaData, cardElement) {
    const slotNumber = parseInt(slotKey.replace('slot', ''));
    
    // 更新状态
    multiLineState.slots[slotKey] = ideaData;
    multiLineState.lines[`line${slotNumber}`] = {
        idea: ideaData,
        outline: { status: 'pending', progress: 0, data: null },
        novel: { status: 'pending', progress: 0, data: null },
        script: { status: 'pending', progress: 0, data: null }
    };
    
    // 更新槽位UI
    updateSlotUI(slotNumber, ideaData);
    
    // 更新卡片状态
    cardElement.classList.add('selected', `selected-line-${slotNumber}`);
    const selectBtn = cardElement.querySelector('.btn-card-select');
    selectBtn.innerHTML = '<i class="fas fa-check-circle"></i> 已选';
    selectBtn.disabled = true;
    
    // 更新顶部导航
    updateNavLineIndicator();
    
    // 更新统计
    updateSlotsStatus();
    
    // 保存状态
    saveSession();
    
    showToast(`已将"${ideaData.title}"添加到槽位${slotNumber}`, 'success');
}

// 更新槽位UI
function updateSlotUI(slotNumber, ideaData) {
    const slotElement = document.querySelector(`.slot-item[data-slot="${slotNumber}"]`);
    if (!slotElement) return;
    
    const color = multiLineState.lineColors[slotNumber];
    
    slotElement.classList.remove('empty');
    slotElement.classList.add('filled');
    
    slotElement.innerHTML = `
        <div class="slot-color" style="background: ${color.primary}"></div>
        <div class="slot-body">
            <div class="slot-header">
                <h4 class="slot-title">${ideaData.title}</h4>
                <button class="slot-remove" title="移除">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <span class="slot-genre">${ideaData.genre}</span>
            <p class="slot-content">${ideaData.content.substring(0, 50)}...</p>
        </div>
    `;
    
    // 添加移除按钮事件
    const removeBtn = slotElement.querySelector('.slot-remove');
    removeBtn.addEventListener('click', () => {
        removeFromSlot(slotNumber);
    });
}

// 从槽位移除
function removeFromSlot(slotNumber) {
    const slotKey = `slot${slotNumber}`;
    const ideaId = multiLineState.slots[slotKey]?.id;
    
    // 清空状态
    multiLineState.slots[slotKey] = null;
    multiLineState.lines[`line${slotNumber}`] = null;
    
    // 恢复槽位UI
    const slotElement = document.querySelector(`.slot-item[data-slot="${slotNumber}"]`);
    const color = multiLineState.lineColors[slotNumber];
    
    slotElement.classList.add('empty');
    slotElement.classList.remove('filled');
    
    slotElement.innerHTML = `
        <div class="slot-color" style="background: ${color.primary}"></div>
        <div class="slot-body">
            <div class="slot-icon">
                <i class="fas fa-plus"></i>
            </div>
            <span class="slot-label">选择创意 ${slotNumber}</span>
        </div>
    `;
    
    // 恢复卡片状态
    const card = document.querySelector(`.idea-card[data-id="${ideaId}"]`);
    if (card) {
        card.classList.remove('selected', `selected-line-${slotNumber}`);
        const selectBtn = card.querySelector('.btn-card-select');
        selectBtn.innerHTML = '<i class="fas fa-plus"></i> 选择';
        selectBtn.disabled = false;
    }
    
    // 更新UI
    updateNavLineIndicator();
    updateSlotsStatus();
    saveSession();
}

// 显示槽位替换对话框
function showSlotReplaceDialog(ideaData, cardElement) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-header">
                <h3>槽位已满</h3>
                <button class="modal-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <p>已选择3个创意，请选择要替换的槽位：</p>
                <div class="replace-slots">
                    ${Object.keys(multiLineState.slots).map((slot, index) => {
                        const slotData = multiLineState.slots[slot];
                        const slotNumber = index + 1;
                        const color = multiLineState.lineColors[slotNumber];
                        return `
                            <button class="replace-slot-btn" data-slot="${slot}">
                                <span class="slot-indicator" style="background: ${color.primary}"></span>
                                <span class="slot-info">
                                    <strong>槽位${slotNumber}</strong>
                                    <small>${slotData.title}</small>
                                </span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost modal-cancel">取消</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 事件处理
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
    
    modal.querySelectorAll('.replace-slot-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const slotKey = btn.dataset.slot;
            const slotNumber = parseInt(slotKey.replace('slot', ''));
            
            // 先移除旧的
            removeFromSlot(slotNumber);
            
            // 再添加新的
            assignToSlot(slotKey, ideaData, cardElement);
            
            modal.remove();
        });
    });
}

// 更新槽位状态显示
function updateSlotsStatus() {
    const count = getSelectedSlotsCount();
    const statusElement = document.querySelector('.slots-status strong');
    if (statusElement) {
        statusElement.textContent = count;
    }
    
    // 更新开始按钮状态
    const startBtn = document.querySelector('.slots-actions .btn-primary');
    if (startBtn) {
        startBtn.disabled = count === 0;
    }
}

// 获取已选择的槽位数量
function getSelectedSlotsCount() {
    return Object.values(multiLineState.slots).filter(slot => slot !== null).length;
}

// 重置所有槽位
function resetAllSlots() {
    for (let i = 1; i <= 3; i++) {
        removeFromSlot(i);
    }
    showToast('已重置所有选择', 'info');
}

// 初始化线路导航
function initLineNavigation() {
    const lineTabs = document.querySelectorAll('.line-tab');
    
    lineTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const lineNumber = parseInt(tab.dataset.line);
            if (multiLineState.lines[`line${lineNumber}`]) {
                switchToLine(lineNumber);
            }
        });
    });
}

// 切换线路
function switchToLine(lineNumber) {
    multiLineState.activeLine = lineNumber;
    
    // 更新标签状态
    document.querySelectorAll('.line-tab').forEach((tab, index) => {
        const tabLine = parseInt(tab.dataset.line);
        tab.classList.toggle('active', tabLine === lineNumber);
    });
    
    // 更新进度卡片显示
    updateProgressCardsDisplay();
    
    // 保存状态
    saveSession();
}

// 更新导航栏线路指示器
function updateNavLineIndicator() {
    const lineTabs = document.querySelectorAll('.line-tab');
    
    lineTabs.forEach((tab, index) => {
        const lineNumber = index + 1;
        const lineData = multiLineState.lines[`line${lineNumber}`];
        
        if (lineData) {
            tab.classList.remove('disabled');
            tab.querySelector('.line-name').textContent = `线路${lineNumber}`;
            
            // 计算进度
            const progress = calculateLineProgress(lineData);
            tab.querySelector('.line-progress').textContent = `${progress}%`;
        } else {
            tab.classList.add('disabled');
            tab.querySelector('.line-name').textContent = '未使用';
            tab.querySelector('.line-progress').textContent = '';
        }
    });
}

// 计算线路进度
function calculateLineProgress(lineData) {
    let totalProgress = 0;
    let steps = 0;
    
    if (lineData.idea) {
        totalProgress += 25;
        steps++;
    }
    if (lineData.outline?.status === 'completed') {
        totalProgress += 25;
        steps++;
    }
    if (lineData.novel?.status === 'completed') {
        totalProgress += 25;
        steps++;
    }
    if (lineData.script?.status === 'completed') {
        totalProgress += 25;
        steps++;
    }
    
    return Math.round((totalProgress / 4) * (steps / 4) * 100);
}

// 初始化进度卡片
function initProgressCards() {
    updateProgressCardsDisplay();
    
    // 添加新线路按钮
    document.querySelector('.progress-card.add-new')?.addEventListener('click', () => {
        const emptySlot = findEmptySlot();
        if (emptySlot) {
            scrollToSection('section-ideas');
            showToast('请选择一个创意开始新的创作线路', 'info');
        } else {
            showToast('已达到最大线路数量(3条)', 'warning');
        }
    });
}

// 更新进度卡片显示
function updateProgressCardsDisplay() {
    const container = document.querySelector('.progress-cards');
    if (!container) return;
    
    // 清空现有卡片（保留添加按钮）
    const addNewCard = container.querySelector('.add-new');
    container.innerHTML = '';
    
    // 添加活跃线路的卡片
    for (let i = 1; i <= 3; i++) {
        const lineData = multiLineState.lines[`line${i}`];
        if (lineData) {
            container.appendChild(createProgressCard(i, lineData));
        }
    }
    
    // 重新添加"添加新线路"卡片
    if (addNewCard && getSelectedSlotsCount() < 3) {
        container.appendChild(addNewCard);
    }
}

// 创建进度卡片
function createProgressCard(lineNumber, lineData) {
    const color = multiLineState.lineColors[lineNumber];
    const card = document.createElement('div');
    card.className = 'progress-card';
    card.dataset.line = lineNumber;
    
    card.innerHTML = `
        <div class="progress-header">
            <div class="progress-indicator" style="background: ${color.primary}"></div>
            <h3>线路 ${lineNumber}：${lineData.idea.title}</h3>
            <button class="btn-expand">
                <i class="fas fa-chevron-down"></i>
            </button>
        </div>
        <div class="progress-body">
            <div class="progress-timeline">
                <div class="timeline-item ${lineData.idea ? 'completed' : ''}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <h4>脑洞构思</h4>
                        <p>${lineData.idea ? '已完成' : '待开始'}</p>
                    </div>
                </div>
                <div class="timeline-item ${lineData.outline?.status === 'completed' ? 'completed' : lineData.outline?.status === 'generating' ? 'active' : ''}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <h4>大纲创建</h4>
                        <p>${getStatusText(lineData.outline?.status)}</p>
                        ${lineData.outline?.status === 'generating' ? `
                            <div class="mini-progress">
                                <div class="mini-progress-bar" style="width: ${lineData.outline.progress}%"></div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="timeline-item ${lineData.novel?.status === 'completed' ? 'completed' : lineData.novel?.status === 'generating' ? 'active' : ''}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <h4>小说撰写</h4>
                        <p>${getStatusText(lineData.novel?.status)}</p>
                    </div>
                </div>
                <div class="timeline-item ${lineData.script?.status === 'completed' ? 'completed' : lineData.script?.status === 'generating' ? 'active' : ''}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <h4>剧本改编</h4>
                        <p>${getStatusText(lineData.script?.status)}</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="progress-actions">
            <button class="btn btn-sm btn-primary" onclick="continueCreation(${lineNumber})">继续创作</button>
            <button class="btn btn-sm btn-ghost" onclick="viewLineDetails(${lineNumber})">查看详情</button>
        </div>
    `;
    
    return card;
}

// 获取状态文本
function getStatusText(status) {
    const statusMap = {
        'pending': '待开始',
        'generating': '生成中...',
        'completed': '已完成',
        'error': '生成失败'
    };
    return statusMap[status] || '待开始';
}

// 开始创作
function startCreation() {
    const selectedCount = getSelectedSlotsCount();
    
    if (selectedCount === 0) {
        showToast('请至少选择一个创意', 'warning');
        return;
    }
    
    // 切换到进度管理区
    scrollToSection('section-progress');
    
    // 更新进度卡片
    updateProgressCardsDisplay();
    
    showToast(`已开始${selectedCount}条创作线路`, 'success');
}

// 继续创作
function continueCreation(lineNumber) {
    const lineData = multiLineState.lines[`line${lineNumber}`];
    if (!lineData) return;
    
    // 根据当前进度决定下一步
    if (!lineData.outline || lineData.outline.status === 'pending') {
        generateOutline(lineNumber);
    } else if (lineData.outline.status === 'completed' && (!lineData.novel || lineData.novel.status === 'pending')) {
        generateNovel(lineNumber);
    } else if (lineData.novel?.status === 'completed' && (!lineData.script || lineData.script.status === 'pending')) {
        generateScript(lineNumber);
    } else {
        showToast('该线路已完成所有创作步骤', 'info');
    }
}

// 生成大纲（模拟）
function generateOutline(lineNumber) {
    const lineData = multiLineState.lines[`line${lineNumber}`];
    
    lineData.outline.status = 'generating';
    lineData.outline.progress = 0;
    
    updateProgressCardsDisplay();
    
    // 模拟生成过程
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        lineData.outline.progress = progress;
        
        if (progress >= 100) {
            clearInterval(interval);
            lineData.outline.status = 'completed';
            lineData.outline.data = '生成的大纲内容...';
            updateProgressCardsDisplay();
            updateNavLineIndicator();
            saveSession();
            showToast(`线路${lineNumber}大纲生成完成`, 'success');
        }
    }, 500);
}

// 查看线路详情
function viewLineDetails(lineNumber) {
    switchToLine(lineNumber);
    showToast(`已切换到线路${lineNumber}`, 'info');
}

// 初始化浮动操作按钮
function initFloatingActions() {
    const fabMain = document.querySelector('.fab-main');
    const fabMenu = document.querySelector('.fab-menu');
    
    fabMain?.addEventListener('click', () => {
        fabMenu?.classList.toggle('active');
    });
}

// 滚动到指定区域
function scrollToSection(sectionClass) {
    const section = document.querySelector(`.${sectionClass}`);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// 显示提示消息
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 保存会话
function saveSession() {
    const sessionData = {
        slots: multiLineState.slots,
        lines: multiLineState.lines,
        activeLine: multiLineState.activeLine,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('multiLineSession', JSON.stringify(sessionData));
}

// 恢复会话
function restoreSession() {
    const saved = localStorage.getItem('multiLineSession');
    if (!saved) return;
    
    try {
        const data = JSON.parse(saved);
        
        // 恢复状态
        multiLineState.slots = data.slots || {};
        multiLineState.lines = data.lines || {};
        multiLineState.activeLine = data.activeLine || 1;
        
        // 恢复UI
        for (let i = 1; i <= 3; i++) {
            const slotData = multiLineState.slots[`slot${i}`];
            if (slotData) {
                updateSlotUI(i, slotData);
                
                // 恢复卡片选中状态
                const card = document.querySelector(`.idea-card[data-id="${slotData.id}"]`);
                if (card) {
                    card.classList.add('selected', `selected-line-${i}`);
                    const selectBtn = card.querySelector('.btn-card-select');
                    selectBtn.innerHTML = '<i class="fas fa-check-circle"></i> 已选';
                    selectBtn.disabled = true;
                }
            }
        }
        
        updateNavLineIndicator();
        updateSlotsStatus();
        updateProgressCardsDisplay();
        
        showToast('已恢复上次的创作进度', 'success');
    } catch (error) {
        console.error('恢复会话失败:', error);
    }
}

// 添加必要的样式
const style = document.createElement('style');
style.textContent = `
/* Toast提示样式 */
.toast {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    z-index: 2000;
    transition: transform 0.3s ease;
}

.toast.show {
    transform: translateX(-50%) translateY(0);
}

.toast-success { border-left: 4px solid #10B981; }
.toast-success i { color: #10B981; }

.toast-warning { border-left: 4px solid #F59E0B; }
.toast-warning i { color: #F59E0B; }

.toast-info { border-left: 4px solid #3B82F6; }
.toast-info i { color: #3B82F6; }

.toast-error { border-left: 4px solid #EF4444; }
.toast-error i { color: #EF4444; }

/* 模态框样式 */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1500;
    animation: fadeIn 0.3s ease;
}

.modal-dialog {
    background: white;
    border-radius: 12px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow: hidden;
    animation: slideUp 0.3s ease;
}

.modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
}

.modal-close {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 1.25rem;
}

.modal-body {
    padding: 1.5rem;
}

.modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
}

.replace-slots {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
}

.replace-slot-btn {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: left;
}

.replace-slot-btn:hover {
    border-color: #3b82f6;
    background: #f0f9ff;
}

.slot-indicator {
    width: 8px;
    height: 40px;
    border-radius: 4px;
}

.slot-info {
    display: flex;
    flex-direction: column;
}

.slot-info strong {
    font-size: 0.875rem;
    color: #1e293b;
}

.slot-info small {
    font-size: 0.75rem;
    color: #64748b;
}

/* 卡片选中状态 */
.idea-card.selected {
    transform: scale(1.02);
}

.idea-card.selected-line-1 {
    border: 2px solid #667eea;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.idea-card.selected-line-2 {
    border: 2px solid #4F46E5;
    box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}

.idea-card.selected-line-3 {
    border: 2px solid #10B981;
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
}

/* 槽位卡片增强样式 */
.slot-item.filled .slot-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.slot-item.filled .slot-title {
    font-weight: 600;
    font-size: 0.875rem;
    margin: 0;
}

.slot-item.filled .slot-remove {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 0.25rem;
}

.slot-item.filled .slot-remove:hover {
    color: #ef4444;
}

.slot-item.filled .slot-content {
    font-size: 0.75rem;
    color: #64748b;
    margin-top: 0.5rem;
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
`;
document.head.appendChild(style);