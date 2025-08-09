// 卡片相关函数

// 创建空的故事卡片
function createEmptyStoryCard(storyNum) {
    const container = document.getElementById('ideasContainer');
    if (!container) return;
    
    const card = document.createElement('div');
    card.id = `idea-card-${storyNum}`;
    card.className = 'idea-card stream-card-enter skeleton-card';
    card.innerHTML = `
        <div class="idea-number">${storyNum}</div>
        <h3 class="idea-title skeleton-text">
            <span class="title-wrapper">
                <span class="title-content editable" data-type="idea-title" data-id="${storyNum}"></span><span class="typewriter-cursor">|</span>
            </span>
            <i class="fas fa-edit edit-icon"></i>
            <span class="edit-controls">
                <button class="save-btn" onclick="saveEditBtn(this, event); return false;"><i class="fas fa-check"></i> 保存</button>
                <button class="cancel-btn" onclick="cancelEditBtn(this, event); return false;"><i class="fas fa-times"></i> 取消</button>
            </span>
        </h3>
        <p class="idea-content skeleton-text">
            <span class="content-wrapper">
                <span class="content-text editable" data-type="idea-content" data-id="${storyNum}"></span><span class="typewriter-cursor">|</span>
            </span>
            <i class="fas fa-edit edit-icon"></i>
            <span class="edit-controls">
                <button class="save-btn" onclick="saveEditBtn(this, event); return false;"><i class="fas fa-check"></i> 保存</button>
                <button class="cancel-btn" onclick="cancelEditBtn(this, event); return false;"><i class="fas fa-times"></i> 取消</button>
            </span>
        </p>
        <button class="select-idea-btn" disabled>
            <i class="fas fa-spinner fa-spin mr-2"></i>加载中...
        </button>
    `;
    
    container.appendChild(card);
    
    setTimeout(() => {
        card.classList.add('stream-card-visible');
    }, 50);
}

// 向标题添加内容
function appendToTitle(storyNum, newChars) {
    const card = document.getElementById(`idea-card-${storyNum}`);
    if (!card) return;
    
    const titleEl = card.querySelector('.idea-title');
    if (!titleEl) return;
    
    titleEl.classList.remove('skeleton-text');
    
    const titleContent = titleEl.querySelector('.title-content');
    if (!titleContent) return;
    
    for (let i = 0; i < newChars.length; i++) {
        ((index, char) => {
            setTimeout(() => {
                titleContent.textContent += char;
            }, index * 15);
        })(i, newChars[i]);
    }
}

// 移除标题光标
function removeTitleCursor(storyNum) {
    const card = document.getElementById(`idea-card-${storyNum}`);
    if (!card) return;
    
    const titleWrapper = card.querySelector('.title-wrapper');
    if (!titleWrapper) return;
    
    const titleCursor = titleWrapper.querySelector('.typewriter-cursor');
    if (titleCursor) {
        titleCursor.remove();
        console.log(`🔤 移除Story ${storyNum}标题光标`);
    }
}

// 向内容添加文字
function appendToContent(storyNum, newChars) {
    const card = document.getElementById(`idea-card-${storyNum}`);
    if (!card) return;
    
    const contentEl = card.querySelector('.idea-content');
    if (!contentEl) return;
    
    contentEl.classList.remove('skeleton-text');
    
    const contentText = contentEl.querySelector('.content-text');
    if (!contentText) return;
    
    for (let i = 0; i < newChars.length; i++) {
        ((index, char) => {
            setTimeout(() => {
                contentText.textContent += char;
            }, index * 15);
        })(i, newChars[i]);
    }
}

// 完成故事卡片
function finalizeStoryCard(storyNum) {
    const card = document.getElementById(`idea-card-${storyNum}`);
    if (!card) return;
    
    card.classList.remove('skeleton-card');
    
    setTimeout(() => {
        const cursors = card.querySelectorAll('.typewriter-cursor');
        cursors.forEach(cursor => cursor.remove());
    }, 500);
    
    const btn = card.querySelector('.select-idea-btn');
    if (btn) {
        btn.disabled = false;
        btn.removeAttribute('style'); // 移除内联样式
        btn.textContent = '选择这个脑洞';
        // 避免重复添加事件监听器
        btn.onclick = (e) => {
            e.stopPropagation();
            selectIdea(storyNum);
        };
    }
    
    card.classList.add('card-complete');
    
    // 初始化编辑功能
    initEditableContent();
    
    card.addEventListener('click', function(e) {
        // 如果点击的不是可编辑元素，则选择脑洞
        if (!e.target.classList.contains('editable')) {
            selectIdea(storyNum);
        }
    });
}

// 选择脑洞
function selectIdea(storyNum) {
    console.log(`选择脑洞: ${storyNum}`);
    
    // 如果已经选中相同的卡片，直接返回
    if (selectedIdea === storyNum) return;
    
    // 只移除其他卡片的选中状态
    document.querySelectorAll('.idea-card.selected').forEach(card => {
        card.classList.remove('selected');
    });
    
    const selectedCard = document.getElementById(`idea-card-${storyNum}`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        selectedIdea = storyNum;
        
        const nextBtn = document.getElementById('nextToOutlineBtn');
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            nextBtn.classList.add('bg-gradient-to-r', 'from-green-500', 'to-emerald-500', 'text-white', 'hover:shadow-lg');
        }
        
        // 只更新进度条相关的UI，不触发内容面板切换
        updateProgressOnly();
    }
}