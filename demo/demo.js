// Demo 交互脚本

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initCardInteractions();
    initTimelineNavigation();
    initChatInteractions();
    initProgressSteps();
    initMobileToggle();
});

// 卡片交互
function initCardInteractions() {
    const cards = document.querySelectorAll('.idea-card');
    
    cards.forEach(card => {
        // 编辑按钮
        const editBtn = card.querySelector('.btn-edit');
        const saveBtn = card.querySelector('.btn-save');
        const selectBtn = card.querySelector('.btn-select');
        const favoriteBtn = card.querySelector('.btn-favorite');
        const title = card.querySelector('.card-title');
        const content = card.querySelector('.card-content');
        
        // 编辑功能
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // 进入编辑模式
                card.classList.add('editing');
                title.contentEditable = true;
                content.contentEditable = true;
                
                // 显示保存按钮，隐藏选择按钮
                saveBtn.style.display = 'flex';
                selectBtn.style.display = 'none';
                
                // 聚焦到标题
                title.focus();
                
                // 选中全部文本
                const range = document.createRange();
                range.selectNodeContents(title);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            });
        }
        
        // 保存按钮
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // 退出编辑模式
                card.classList.remove('editing');
                title.contentEditable = false;
                content.contentEditable = false;
                
                // 显示选择按钮，隐藏保存按钮
                saveBtn.style.display = 'none';
                selectBtn.style.display = 'flex';
                
                // 发送保存成功消息
                addMessageToChat('assistant', `创意已更新！"${title.textContent}"的内容已保存。`);
            });
        }
        
        // 选择按钮 - 支持取消选择
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const isSelected = card.classList.contains('selected');
            
            if (isSelected) {
                // 取消选择
                card.classList.remove('selected');
                selectBtn.innerHTML = '<i class="fas fa-check"></i> 选择';
                selectBtn.style.minWidth = '80px';
                
                // 发送取消消息
                addMessageToChat('assistant', `已取消选择"${card.querySelector('.card-title').textContent}"，你可以重新选择其他创意。`);
            } else {
                // 移除其他卡片的选中状态
                cards.forEach(c => {
                    c.classList.remove('selected');
                    const btn = c.querySelector('.btn-select');
                    if (btn) {
                        btn.innerHTML = '<i class="fas fa-check"></i> 选择';
                        btn.style.minWidth = '80px';
                    }
                });
                
                // 选中当前卡片
                card.classList.add('selected');
                selectBtn.innerHTML = '<i class="fas fa-check-circle"></i> 已选';
                
                // 添加选中动画 - 使用transform避免重绘
                card.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    card.style.transform = '';
                }, 300);
                
                // 模拟发送消息
                addMessageToChat('assistant', `太棒了！你选择了"${card.querySelector('.card-title').textContent}"，这是一个很有潜力的创意！接下来我们可以开始构建大纲了。`);
            }
        });
        
        // 收藏按钮
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            favoriteBtn.classList.toggle('active');
            
            if (favoriteBtn.classList.contains('active')) {
                favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
            } else {
                favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
            }
        });
        
        // 卡片点击效果（仅在非编辑模式下）
        card.addEventListener('click', (e) => {
            // 阻止事件冒泡导致的布局问题
            e.stopPropagation();
            
            if (!card.classList.contains('editing') && 
                !e.target.closest('.btn-select') && 
                !e.target.closest('.btn-favorite') && 
                !e.target.closest('.btn-edit') &&
                !e.target.closest('.btn-save')) {
                // 简单的点击反馈，不添加DOM元素
                card.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    card.style.transform = '';
                }, 150);
            }
        });
        
        // ESC键退出编辑
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && card.classList.contains('editing')) {
                card.classList.remove('editing');
                title.contentEditable = false;
                content.contentEditable = false;
                saveBtn.style.display = 'none';
                selectBtn.style.display = 'flex';
            }
        });
    });
}

// 时间轴导航（已移除，使用顶部进度条）
function initTimelineNavigation() {
    // 功能已整合到顶部进度条
}

// 进度步骤 - 更新为新的极简导航栏
function initProgressSteps() {
    const progressSteps = document.querySelectorAll('.progress-step');
    const progressBg = document.querySelector('.progress-bg');
    
    progressSteps.forEach((step, index) => {
        step.addEventListener('click', () => {
            // 更新激活状态
            progressSteps.forEach((s, i) => {
                if (i <= index) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
            
            // 更新进度条
            const progress = ((index + 1) / progressSteps.length) * 100;
            updateProgressBar(progress);
            
            // 切换内容（模拟）
            const stepNames = ['脑洞', '大纲', '小说', '剧本'];
            switchContent(stepNames[index]);
        });
    });
}

// 更新进度条
function updateProgressBar(progress) {
    const progressBg = document.querySelector('.progress-bg');
    if (progressBg) {
        progressBg.style.width = `${progress}%`;
    }
}

// 切换内容（模拟）
function switchContent(step) {
    const container = document.querySelector('.waterfall-grid');
    
    // 添加切换动画
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        // 这里可以根据不同步骤加载不同内容
        console.log('切换到步骤：', step);
        
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 300);
}

// 聊天交互
function initChatInteractions() {
    const sendBtn = document.querySelector('.btn-send');
    const inputMessage = document.querySelector('.input-message');
    const clearBtn = document.querySelector('.btn-clear-chat');
    const suggestionChips = document.querySelectorAll('.suggestion-chip');
    
    // 发送消息
    const sendMessage = () => {
        const message = inputMessage.value.trim();
        if (message) {
            addMessageToChat('user', message);
            inputMessage.value = '';
            
            // 显示输入提示
            showTypingIndicator();
            
            // 模拟AI回复
            setTimeout(() => {
                hideTypingIndicator();
                const responses = [
                    '这是一个很有创意的想法！让我为你生成一些相关的内容...',
                    '收到！正在为你构思更多精彩的创意...',
                    '太棒了！这个方向很有潜力，让我们继续深入探索...',
                    '有趣的想法！我会基于这个概念为你创作更多内容...'
                ];
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                addMessageToChat('assistant', randomResponse);
            }, 1500);
        }
    };
    
    sendBtn.addEventListener('click', sendMessage);
    
    inputMessage.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // 清空对话
    clearBtn.addEventListener('click', () => {
        const messages = document.querySelector('.chat-messages');
        messages.innerHTML = `
            <div class="message assistant">
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="message-bubble">
                        对话已清空，让我们开始新的创作吧！
                    </div>
                    <span class="message-time">${getCurrentTime()}</span>
                </div>
            </div>
        `;
    });
    
    // 快速建议
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const text = chip.textContent.trim();
            addMessageToChat('user', text);
            
            showTypingIndicator();
            setTimeout(() => {
                hideTypingIndicator();
                addMessageToChat('assistant', `收到！正在为你生成${text}相关的创意...`);
            }, 1500);
        });
    });
}

// 添加消息到聊天
function addMessageToChat(sender, text) {
    const messagesContainer = document.querySelector('.chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    if (sender === 'assistant') {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble">${text}</div>
                <span class="message-time">${getCurrentTime()}</span>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-bubble">${text}</div>
                <span class="message-time">${getCurrentTime()}</span>
            </div>
        `;
    }
    
    // 移除输入提示
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 显示输入提示
function showTypingIndicator() {
    const messagesContainer = document.querySelector('.chat-messages');
    if (!document.querySelector('.typing-indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        messagesContainer.appendChild(indicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// 隐藏输入提示
function hideTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// 获取当前时间
function getCurrentTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

// 移动端聊天切换
function initMobileToggle() {
    const toggleBtn = document.querySelector('.mobile-chat-toggle');
    const chatArea = document.querySelector('.chat-area');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            chatArea.classList.toggle('active');
            
            if (chatArea.classList.contains('active')) {
                toggleBtn.innerHTML = '<i class="fas fa-times"></i>';
            } else {
                toggleBtn.innerHTML = '<i class="fas fa-comments"></i>';
            }
        });
    }
}

// 加载更多功能
document.querySelector('.btn-load-more-chat')?.addEventListener('click', function() {
    const grid = document.querySelector('.waterfall-grid');
    const newCards = [
        {
            badge: 'badge-scifi',
            type: '科幻',
            title: '量子意识',
            content: '当人类意识可以上传到量子计算机时，死亡还有意义吗？',
            rating: 3
        },
        {
            badge: 'badge-mystery',
            type: '悬疑',
            title: '记忆拼图',
            content: '一个失忆的侦探，发现自己可能就是要追捕的连环杀手...',
            rating: 4
        },
        {
            badge: 'badge-romance',
            type: '爱情',
            title: '平行时空的恋人',
            content: '每天醒来，她都在不同的平行世界，唯一不变的是他的爱...',
            rating: 5
        }
    ];
    
    newCards.forEach((cardData, index) => {
        const card = document.createElement('div');
        card.className = 'idea-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        card.innerHTML = `
            <div class="card-header">
                <span class="card-badge ${cardData.badge}">${cardData.type}</span>
                <div class="card-actions">
                    <button class="btn-edit" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
            <h3 class="card-title" contenteditable="false">${cardData.title}</h3>
            <p class="card-content" contenteditable="false">${cardData.content}</p>
            <div class="card-footer">
                <button class="btn-select">
                    <i class="fas fa-check"></i> 选择
                </button>
                <button class="btn-favorite">
                    <i class="far fa-heart"></i>
                </button>
                <button class="btn-save" style="display: none;">
                    <i class="fas fa-save"></i> 保存
                </button>
            </div>
        `;
        
        grid.appendChild(card);
    });
    
    // 重新初始化新卡片的交互
    initCardInteractions();
    
    // 滚动到新内容
    setTimeout(() => {
        grid.scrollTop = grid.scrollHeight;
    }, 100);
});

// 添加自定义样式（已移除可能导致问题的ripple效果）