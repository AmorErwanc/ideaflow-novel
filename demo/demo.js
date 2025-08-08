// AI小说创作平台 - Demo交互逻辑
(function() {
    'use strict';

    // 状态管理
    const state = {
        currentStep: 'ideas',  // ideas, outline, novel, script
        selectedIdea: null,
        workflowState: {
            ideasGenerated: true,   // 默认已经有脑洞
            outlineGenerated: false,
            novelGenerated: false,
            scriptGenerated: false
        }
    };

    // 初始化
    function init() {
        console.log('Demo初始化开始');
        bindIdeaCardEvents();
        bindWorkflowButtons();
        bindChatInput();
        updateProgressBar();
        initMobileToggle();
        console.log('Demo初始化完成');
    }

    // 绑定创意卡片事件
    function bindIdeaCardEvents() {
        document.querySelectorAll('.idea-card').forEach(card => {
            // 选择按钮
            const selectBtn = card.querySelector('.btn-select');
            if (selectBtn) {
                selectBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectIdea(card);
                });
            }

            // 编辑按钮
            const editBtn = card.querySelector('.btn-edit');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleEditMode(card);
                });
            }

            // 收藏按钮
            const favBtn = card.querySelector('.btn-favorite');
            if (favBtn) {
                favBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleFavorite(favBtn);
                });
            }

            // 保存按钮
            const saveBtn = card.querySelector('.btn-save');
            if (saveBtn) {
                saveBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    saveEdit(card);
                });
            }
        });
    }

    // 选择创意
    function selectIdea(card) {
        // 移除其他卡片的选中状态
        document.querySelectorAll('.idea-card').forEach(c => {
            c.classList.remove('selected');
            const btn = c.querySelector('.btn-select');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-check"></i> 选择';
            }
        });

        // 设置当前卡片为选中
        card.classList.add('selected');
        const btn = card.querySelector('.btn-select');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check-circle"></i> 已选';
        }

        // 保存选中的创意
        state.selectedIdea = {
            id: card.dataset.id,
            title: card.querySelector('.card-title').textContent,
            content: card.querySelector('.card-content').textContent
        };

        // 启用大纲生成按钮
        const outlineBtn = document.getElementById('btn-generate-outline');
        if (outlineBtn) {
            outlineBtn.disabled = false;
            document.getElementById('step-outline').classList.add('active');
        }

        // 添加消息到聊天区
        addMessage('assistant', `太棒了！你选择了"${state.selectedIdea.title}"，这是个很有潜力的创意！点击"创建故事大纲"按钮，我将为你生成详细的故事结构。`);
    }

    // 绑定工作流按钮
    function bindWorkflowButtons() {
        // 生成大纲
        const outlineBtn = document.getElementById('btn-generate-outline');
        if (outlineBtn) {
            outlineBtn.addEventListener('click', generateOutline);
        }

        // 生成小说
        const novelBtn = document.getElementById('btn-generate-novel');
        if (novelBtn) {
            novelBtn.addEventListener('click', generateNovel);
        }

        // 生成剧本
        const scriptBtn = document.getElementById('btn-generate-script');
        if (scriptBtn) {
            scriptBtn.addEventListener('click', generateScript);
        }
    }

    // 生成大纲
    async function generateOutline() {
        if (!state.selectedIdea) {
            addMessage('assistant', '请先选择一个创意！');
            return;
        }

        const btn = document.getElementById('btn-generate-outline');
        setButtonLoading(btn, true, '生成中...');

        // 切换到大纲视图
        switchToView('outline');
        
        // 模拟生成延迟
        await sleep(2000);

        // 更新状态
        state.workflowState.outlineGenerated = true;
        state.currentStep = 'outline';
        
        // 更新按钮状态
        setButtonLoading(btn, false, '创建故事大纲');
        btn.innerHTML = '<i class="fas fa-check-circle"></i> 已生成';
        document.getElementById('step-outline').classList.add('completed');
        
        // 启用小说生成按钮
        const novelBtn = document.getElementById('btn-generate-novel');
        if (novelBtn) {
            novelBtn.disabled = false;
            document.getElementById('step-novel').classList.add('active');
        }

        // 更新进度条
        updateProgressBar();

        // 添加消息
        addMessage('assistant', '故事大纲已生成！采用经典的"起承转合"四幕结构，为你的小说搭建了完整的框架。接下来可以生成小说正文了！');
    }

    // 生成小说
    async function generateNovel() {
        if (!state.workflowState.outlineGenerated) {
            addMessage('assistant', '请先生成故事大纲！');
            return;
        }

        const btn = document.getElementById('btn-generate-novel');
        setButtonLoading(btn, true, '创作中...');

        // 切换到小说视图
        switchToView('novel');
        
        // 模拟生成延迟
        await sleep(3000);

        // 更新状态
        state.workflowState.novelGenerated = true;
        state.currentStep = 'novel';
        
        // 更新按钮状态
        setButtonLoading(btn, false, '创作小说正文');
        btn.innerHTML = '<i class="fas fa-check-circle"></i> 已生成';
        document.getElementById('step-novel').classList.add('completed');
        
        // 启用剧本生成按钮
        const scriptBtn = document.getElementById('btn-generate-script');
        if (scriptBtn) {
            scriptBtn.disabled = false;
            document.getElementById('step-script').classList.add('active');
        }

        // 更新进度条
        updateProgressBar();

        // 添加消息
        addMessage('assistant', '小说正文已生成！我为你创作了前两章的内容，充满悬念和趣味。现在可以转换为互动剧本了！');
    }

    // 生成剧本
    async function generateScript() {
        if (!state.workflowState.novelGenerated) {
            addMessage('assistant', '请先生成小说正文！');
            return;
        }

        const btn = document.getElementById('btn-generate-script');
        setButtonLoading(btn, true, '转换中...');

        // 切换到剧本视图
        switchToView('script');
        
        // 模拟生成延迟
        await sleep(2000);

        // 更新状态
        state.workflowState.scriptGenerated = true;
        state.currentStep = 'script';
        
        // 更新按钮状态
        setButtonLoading(btn, false, '转换为互动剧本');
        btn.innerHTML = '<i class="fas fa-check-circle"></i> 已生成';
        document.getElementById('step-script').classList.add('completed');

        // 更新进度条
        updateProgressBar();

        // 添加消息
        addMessage('assistant', '互动剧本已生成！包含了多个选择分支，让读者能够影响故事走向。你的创作已经完成，可以下载或预览效果了！🎉');
    }

    // 切换视图
    function switchToView(view) {
        // 隐藏所有内容容器
        document.querySelectorAll('.content-container').forEach(container => {
            container.classList.remove('active');
        });

        // 显示目标容器
        const targetContainer = document.getElementById(`${view}-container`);
        if (targetContainer) {
            targetContainer.classList.add('active');
        }

        // 更新当前步骤
        state.currentStep = view;
    }

    // 设置按钮加载状态
    function setButtonLoading(btn, loading, text) {
        if (loading) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        } else {
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-${btn.id.includes('outline') ? 'list-alt' : btn.id.includes('novel') ? 'book-open' : 'film'}"></i> ${text}`;
        }
    }

    // 更新进度条
    function updateProgressBar() {
        const steps = ['ideas', 'outline', 'novel', 'script'];
        const currentIndex = steps.indexOf(state.currentStep);
        const progress = ((currentIndex + 1) / steps.length) * 100;
        
        // 更新进度条宽度
        const progressBar = document.querySelector('.progress-bg');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        // 更新步骤状态
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            if (index <= currentIndex) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    // 切换编辑模式
    function toggleEditMode(card) {
        const isEditing = card.classList.contains('editing');
        
        if (isEditing) {
            // 退出编辑模式
            card.classList.remove('editing');
            card.querySelector('.card-title').contentEditable = false;
            card.querySelector('.card-content').contentEditable = false;
            card.querySelector('.btn-save').style.display = 'none';
            card.querySelector('.btn-select').style.display = 'flex';
        } else {
            // 进入编辑模式
            card.classList.add('editing');
            card.querySelector('.card-title').contentEditable = true;
            card.querySelector('.card-content').contentEditable = true;
            card.querySelector('.btn-save').style.display = 'flex';
            card.querySelector('.btn-select').style.display = 'none';
        }
    }

    // 保存编辑
    function saveEdit(card) {
        card.classList.remove('editing');
        card.querySelector('.card-title').contentEditable = false;
        card.querySelector('.card-content').contentEditable = false;
        card.querySelector('.btn-save').style.display = 'none';
        card.querySelector('.btn-select').style.display = 'flex';
        
        addMessage('assistant', '创意已保存！你的修改让这个故事更加精彩了。');
    }

    // 切换收藏
    function toggleFavorite(btn) {
        const icon = btn.querySelector('i');
        if (icon.classList.contains('far')) {
            icon.classList.remove('far');
            icon.classList.add('fas');
            btn.style.color = '#ef4444';
        } else {
            icon.classList.remove('fas');
            icon.classList.add('far');
            btn.style.color = '';
        }
    }

    // 绑定聊天输入
    function bindChatInput() {
        const input = document.querySelector('.input-message');
        const sendBtn = document.querySelector('.btn-send');
        
        if (input && sendBtn) {
            sendBtn.addEventListener('click', sendMessage);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }

        // 智能建议按钮
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const action = chip.dataset.action;
                handleSuggestion(action);
            });
        });
    }

    // 发送消息
    function sendMessage() {
        const input = document.querySelector('.input-message');
        const message = input.value.trim();
        
        if (!message) return;
        
        // 添加用户消息
        addMessage('user', message);
        
        // 清空输入
        input.value = '';
        
        // 模拟AI回复
        showTyping();
        setTimeout(() => {
            hideTyping();
            addMessage('assistant', getAIResponse(message));
        }, 1500);
    }

    // 处理智能建议
    function handleSuggestion(action) {
        switch(action) {
            case 'more-ideas':
                addMessage('user', '换一批创意');
                showTyping();
                setTimeout(() => {
                    hideTyping();
                    addMessage('assistant', '好的，我可以为你生成更多创意！不过在这个演示版本中，创意是预设的。在正式版本中，每次都会生成全新的独特创意。');
                }, 1000);
                break;
            case 'hot-genre':
                addMessage('user', '探索更多灵感');
                showTyping();
                setTimeout(() => {
                    hideTyping();
                    addMessage('assistant', '当前热门题材包括：穿越重生、系统流、无限流、灵异悬疑等。你可以尝试将不同元素混搭，创造独特的故事！');
                }, 1000);
                break;
            case 'random':
                addMessage('user', '给我随机推荐');
                showTyping();
                setTimeout(() => {
                    hideTyping();
                    const randomCard = document.querySelectorAll('.idea-card')[Math.floor(Math.random() * 9)];
                    const title = randomCard.querySelector('.card-title').textContent;
                    addMessage('assistant', `我推荐你试试"${title}"，这个创意有独特的反转设计，很适合发挥想象力！`);
                }, 1000);
                break;
        }
    }

    // 获取AI响应
    function getAIResponse(message) {
        const responses = [
            '这是个很棒的想法！让我帮你完善一下...',
            '有意思！你想在这个基础上加入什么元素呢？',
            '我理解你的需求，让我们一起让这个故事更精彩！',
            '很好的问题！在创作中，这个方面确实需要仔细考虑...'
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // 添加消息到聊天区
    function addMessage(type, text) {
        const messagesContainer = document.querySelector('.chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        
        if (type === 'assistant') {
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="message-bubble">${text}</div>
                    <span class="message-time">${time}</span>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="message-bubble">${text}</div>
                    <span class="message-time">${time}</span>
                </div>
            `;
        }
        
        // 插入到typing indicator之前
        const typingIndicator = document.querySelector('.typing-indicator');
        messagesContainer.insertBefore(messageDiv, typingIndicator);
        
        // 滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // 显示输入中提示
    function showTyping() {
        const typing = document.querySelector('.typing-indicator');
        if (typing) {
            typing.style.display = 'flex';
        }
    }

    // 隐藏输入中提示
    function hideTyping() {
        const typing = document.querySelector('.typing-indicator');
        if (typing) {
            typing.style.display = 'none';
        }
    }

    // 移动端聊天切换
    function initMobileToggle() {
        const toggle = document.querySelector('.mobile-chat-toggle');
        const chatArea = document.querySelector('.chat-area');
        
        if (toggle && chatArea) {
            toggle.addEventListener('click', () => {
                chatArea.classList.toggle('mobile-active');
                toggle.classList.toggle('active');
            });
        }
    }

    // 辅助函数：延迟
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 导出给全局使用
    window.DemoApp = {
        init,
        selectIdea,
        generateOutline,
        generateNovel,
        generateScript
    };

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();