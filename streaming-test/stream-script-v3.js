// 流式输出版本V3 - 修复多卡片逐字显示问题
console.log('🚀 流式脚本V3加载完成 - 支持所有卡片逐字显示');

document.addEventListener('DOMContentLoaded', function() {
    console.log('📝 DOM加载完成，初始化流式处理V3');
    
    // 全局变量
    let currentStreamController = null;
    
    // 解析状态管理 - 使用更精确的状态机
    const parserState = {
        currentStory: null,        // 当前正在解析的story编号
        currentTag: null,          // 当前正在解析的标签
        buffer: '',                // 缓冲区
        stories: new Map(),        // 存储每个story的状态
        lastProcessedIndex: 0      // 上次处理到的位置
    };

    // 流式API调用函数（V3改进版）
    async function callStreamAPI(url, data) {
        console.log(`🌊 开始流式请求: ${url}`, data);
        const startTime = Date.now();
        
        // 重置解析状态
        resetParserState();
        
        currentStreamController = new AbortController();
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                signal: currentStreamController.signal
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            console.log('✅ 连接成功，开始接收流式数据');
            showStreamLoading();
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    console.log(`✅ 流式传输完成，总耗时: ${Date.now() - startTime}ms`);
                    break;
                }
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // 保留不完整的行
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const json = JSON.parse(line);
                            
                            if (json.type === 'begin') {
                                console.log('🎬 流开始');
                            } else if (json.type === 'item') {
                                fullContent += json.content;
                                // 使用新的解析策略
                                processStreamContent(fullContent);
                            } else if (json.type === 'end') {
                                console.log('🏁 流结束');
                            }
                        } catch (e) {
                            console.error('❌ JSON解析错误:', e);
                        }
                    }
                }
            }
            
            return fullContent;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('⏹️ 请求被用户取消');
            } else {
                console.error('❌ 流式API调用失败:', error);
            }
            throw error;
        } finally {
            currentStreamController = null;
            hideStreamLoading();
        }
    }

    // 重置解析状态
    function resetParserState() {
        parserState.currentStory = null;
        parserState.currentTag = null;
        parserState.buffer = '';
        parserState.stories.clear();
        parserState.lastProcessedIndex = 0;
    }

    // 处理流式内容（核心改进）
    function processStreamContent(fullContent) {
        // 从上次处理的位置开始
        const newContent = fullContent.substring(parserState.lastProcessedIndex);
        if (!newContent) return;
        
        // 逐字符处理新内容
        for (let i = 0; i < newContent.length; i++) {
            const char = newContent[i];
            parserState.buffer += char;
            
            // 检测各种XML模式
            detectAndProcessXMLPatterns();
        }
        
        parserState.lastProcessedIndex = fullContent.length;
    }

    // 检测并处理XML模式
    function detectAndProcessXMLPatterns() {
        const buffer = parserState.buffer;
        
        // 1. 检测<story>开始
        if (buffer.endsWith('<story>')) {
            console.log('📖 检测到新story开始');
            parserState.currentTag = 'story';
            // 创建新的story状态
            const tempId = `temp-${Date.now()}`;
            parserState.currentStory = tempId;
            parserState.stories.set(tempId, {
                tempId: tempId,
                number: null,
                synopsis: '',
                title: '',
                cardCreated: false,
                synopsisStarted: false,
                titleStarted: false
            });
            createEmptyStoryCard(tempId);
            return;
        }
        
        // 2. 检测<number>标签
        if (parserState.currentStory && buffer.includes('<number>')) {
            const match = buffer.match(/<number>(\d+)/);
            if (match) {
                const number = match[1];
                const story = parserState.stories.get(parserState.currentStory);
                if (story && !story.number) {
                    story.number = number;
                    console.log(`🔢 Story编号: ${number}`);
                    updateStoryNumber(parserState.currentStory, number);
                    parserState.currentTag = 'number';
                }
            }
        }
        
        // 3. 检测</number>结束
        if (parserState.currentTag === 'number' && buffer.endsWith('</number>')) {
            parserState.currentTag = 'story'; // 回到story级别
        }
        
        // 4. 检测<synopsis>开始
        if (parserState.currentStory && buffer.endsWith('<synopsis>')) {
            console.log('📝 开始接收synopsis');
            const story = parserState.stories.get(parserState.currentStory);
            if (story) {
                story.synopsisStarted = true;
                parserState.currentTag = 'synopsis';
                // 清空buffer中的标签部分，只保留内容
                parserState.buffer = '';
            }
        }
        
        // 5. 处理synopsis内容（逐字显示）
        if (parserState.currentTag === 'synopsis' && parserState.currentStory) {
            const story = parserState.stories.get(parserState.currentStory);
            if (story && story.synopsisStarted) {
                // 检查是否到达结束标签
                if (buffer.includes('</synopsis>')) {
                    const content = buffer.substring(0, buffer.indexOf('</synopsis>'));
                    if (content.length > story.synopsis.length) {
                        const newChars = content.substring(story.synopsis.length);
                        appendToSynopsis(story.number || parserState.currentStory, newChars);
                        story.synopsis = content;
                    }
                    parserState.currentTag = 'story';
                    story.synopsisStarted = false;
                } else {
                    // 还在接收内容，逐字添加
                    if (buffer.length > story.synopsis.length && !buffer.includes('<')) {
                        const newChars = buffer.substring(story.synopsis.length);
                        appendToSynopsis(story.number || parserState.currentStory, newChars);
                        story.synopsis = buffer;
                    }
                }
            }
        }
        
        // 6. 检测<zhihu_title>开始
        if (parserState.currentStory && buffer.endsWith('<zhihu_title>')) {
            console.log('📌 开始接收title');
            const story = parserState.stories.get(parserState.currentStory);
            if (story) {
                story.titleStarted = true;
                parserState.currentTag = 'zhihu_title';
                parserState.buffer = '';
            }
        }
        
        // 7. 处理title内容（逐字显示）
        if (parserState.currentTag === 'zhihu_title' && parserState.currentStory) {
            const story = parserState.stories.get(parserState.currentStory);
            if (story && story.titleStarted) {
                if (buffer.includes('</zhihu_title>')) {
                    const content = buffer.substring(0, buffer.indexOf('</zhihu_title>'));
                    if (content.length > story.title.length) {
                        const newChars = content.substring(story.title.length);
                        appendToTitle(story.number || parserState.currentStory, newChars);
                        story.title = content;
                    }
                    parserState.currentTag = 'story';
                    story.titleStarted = false;
                } else {
                    // 还在接收内容
                    if (buffer.length > story.title.length && !buffer.includes('<')) {
                        const newChars = buffer.substring(story.title.length);
                        appendToTitle(story.number || parserState.currentStory, newChars);
                        story.title = buffer;
                    }
                }
            }
        }
        
        // 8. 检测</story>结束
        if (buffer.endsWith('</story>')) {
            if (parserState.currentStory) {
                const story = parserState.stories.get(parserState.currentStory);
                console.log(`✅ Story ${story?.number} 完成`);
                finalizeStoryCard(story?.number || parserState.currentStory);
                parserState.currentStory = null;
                parserState.currentTag = null;
                parserState.buffer = ''; // 清空buffer准备下一个story
            }
        }
    }

    // 创建空白story卡片
    function createEmptyStoryCard(tempId) {
        const container = document.getElementById('ideasContainer');
        if (!container) return;
        
        // 第一个卡片时移除加载动画
        if (container.children.length === 0 || container.querySelector('#streamLoading')) {
            hideStreamLoading();
        }
        
        const card = document.createElement('div');
        card.id = `idea-card-${tempId}`;
        card.className = 'idea-card stream-card-enter skeleton-card';
        card.innerHTML = `
            <div class="idea-number skeleton-loading">...</div>
            <h3 class="idea-title skeleton-text">
                <span class="typewriter-cursor">|</span>
            </h3>
            <p class="idea-content skeleton-text">
                <span class="typewriter-cursor">|</span>
            </p>
            <button class="select-idea-btn" disabled style="opacity: 0.3">
                加载中...
            </button>
        `;
        
        container.appendChild(card);
        
        setTimeout(() => {
            card.classList.add('stream-card-visible');
        }, 50);
    }

    // 更新story编号
    function updateStoryNumber(tempId, number) {
        const card = document.getElementById(`idea-card-${tempId}`);
        if (!card) return;
        
        // 更新卡片ID
        card.id = `idea-card-${number}`;
        
        // 更新编号显示
        const numberDiv = card.querySelector('.idea-number');
        if (numberDiv) {
            numberDiv.textContent = number;
            numberDiv.classList.remove('skeleton-loading');
        }
    }

    // 逐字添加到synopsis
    function appendToSynopsis(id, newChars) {
        const card = document.getElementById(`idea-card-${id}`);
        if (!card) return;
        
        const contentEl = card.querySelector('.idea-content');
        if (!contentEl) return;
        
        // 移除骨架样式
        contentEl.classList.remove('skeleton-text');
        
        // 获取当前显示的文本（不包括HTML）
        const currentSpan = contentEl.querySelector('span:not(.typewriter-cursor)');
        let currentText = currentSpan ? currentSpan.textContent : '';
        
        // 如果没有文本span，创建一个
        if (!currentSpan) {
            contentEl.innerHTML = '<span></span><span class="typewriter-cursor">|</span>';
        }
        
        // 逐字添加
        for (let i = 0; i < newChars.length; i++) {
            ((index, char) => {
                setTimeout(() => {
                    const textSpan = contentEl.querySelector('span:not(.typewriter-cursor)');
                    if (textSpan) {
                        textSpan.textContent += char;
                    }
                }, index * 15); // 15ms延迟，更流畅
            })(i, newChars[i]);
        }
    }

    // 逐字添加到title
    function appendToTitle(id, newChars) {
        const card = document.getElementById(`idea-card-${id}`);
        if (!card) return;
        
        const titleEl = card.querySelector('.idea-title');
        if (!titleEl) return;
        
        // 移除骨架样式
        titleEl.classList.remove('skeleton-text');
        
        // 获取当前显示的文本
        const currentSpan = titleEl.querySelector('span:not(.typewriter-cursor)');
        let currentText = currentSpan ? currentSpan.textContent : '';
        
        // 如果没有文本span，创建一个
        if (!currentSpan) {
            titleEl.innerHTML = '<span></span><span class="typewriter-cursor">|</span>';
        }
        
        // 逐字添加
        for (let i = 0; i < newChars.length; i++) {
            ((index, char) => {
                setTimeout(() => {
                    const textSpan = titleEl.querySelector('span:not(.typewriter-cursor)');
                    if (textSpan) {
                        textSpan.textContent += char;
                    }
                }, index * 15);
            })(i, newChars[i]);
        }
    }

    // 完成story卡片
    function finalizeStoryCard(id) {
        const card = document.getElementById(`idea-card-${id}`);
        if (!card) return;
        
        // 移除骨架样式
        card.classList.remove('skeleton-card');
        
        // 移除光标
        setTimeout(() => {
            const cursors = card.querySelectorAll('.typewriter-cursor');
            cursors.forEach(cursor => cursor.remove());
        }, 500);
        
        // 启用选择按钮
        const btn = card.querySelector('.select-idea-btn');
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.textContent = '选择这个脑洞';
            btn.addEventListener('click', () => {
                console.log(`选择脑洞: ${id}`);
                alert(`已选择脑洞 ${id}`);
            });
        }
        
        // 添加完成动画
        card.classList.add('card-complete');
    }

    // 显示流式加载动画
    function showStreamLoading() {
        const container = document.getElementById('ideasContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'streamLoading';
        loadingDiv.className = 'stream-loading';
        loadingDiv.innerHTML = `
            <div class="stream-loading-animation">
                <div class="stream-dot"></div>
                <div class="stream-dot"></div>
                <div class="stream-dot"></div>
            </div>
            <p class="stream-loading-text">AI正在生成创意脑洞...</p>
        `;
        container.appendChild(loadingDiv);
        
        const ideasSection = document.getElementById('ideasSection');
        if (ideasSection) {
            ideasSection.classList.remove('hidden');
        }
    }

    // 隐藏流式加载动画
    function hideStreamLoading() {
        const loadingDiv = document.getElementById('streamLoading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    // 快速生成按钮事件
    const quickGenerateBtn = document.getElementById('quickGenerateBtn');
    if (quickGenerateBtn) {
        quickGenerateBtn.addEventListener('click', async function() {
            console.log('🎯 点击快速生成按钮');
            
            try {
                this.disabled = true;
                
                const data = {
                    genre: null,
                    plot_holes_count: 10
                };
                
                await callStreamAPI(
                    'https://n8n.games/webhook-test/c78e428c-bc35-4d74-a52a-65328e76f6bd',
                    data
                );
                
                console.log('✅ 生成完成');
                
            } catch (error) {
                console.error('❌ 生成失败:', error);
                alert('生成失败，请重试');
            } finally {
                this.disabled = false;
            }
        });
    }

    // 停止生成功能
    window.currentStreamController = currentStreamController;

    console.log('✅ 流式脚本V3初始化完成');
});