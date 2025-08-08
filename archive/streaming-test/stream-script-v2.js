// 流式输出版本V2 - 真正的逐字显示效果
console.log('🚀 流式脚本V2加载完成 - 支持逐字显示');

document.addEventListener('DOMContentLoaded', function() {
    console.log('📝 DOM加载完成，初始化流式处理V2');
    
    // 全局变量
    let firstWaithook = '';
    let secondWaithook = '';
    let thirdWaithook = '';
    let selectedIdeaNumber = null;
    let currentIdeas = [];
    let currentStreamController = null;
    
    // Story解析状态管理
    const storyStates = new Map();
    
    // 流程状态管理
    let workflowState = {
        ideasGenerated: false,
        outlineGenerated: false,
        scriptGenerated: false,
        novelGenerated: false
    };

    // 流式API调用函数（改进版）
    async function callStreamAPI(url, data, onChunk, onComplete) {
        console.log(`🌊 开始流式请求: ${url}`, data);
        const startTime = Date.now();
        
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
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';
            
            // XML解析状态
            let currentStoryNumber = null;
            let currentTag = null;
            let tagContent = '';
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    console.log(`✅ 流式传输完成，总耗时: ${Date.now() - startTime}ms`);
                    break;
                }
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const json = JSON.parse(line);
                            
                            if (json.type === 'begin') {
                                console.log('🎬 流开始:', json.metadata);
                                showStreamLoading();
                            } else if (json.type === 'item') {
                                const content = json.content;
                                fullContent += content;
                                
                                // 逐字符处理XML内容
                                for (let i = 0; i < content.length; i++) {
                                    const char = content[i];
                                    tagContent += char;
                                    
                                    // 检测XML标签
                                    processXMLCharacter(char, tagContent, fullContent);
                                }
                                
                                if (onChunk) {
                                    onChunk(content, fullContent);
                                }
                            } else if (json.type === 'end') {
                                console.log('🏁 流结束');
                            }
                        } catch (e) {
                            console.error('❌ JSON解析错误:', e);
                        }
                    }
                }
            }
            
            if (onComplete) {
                onComplete(fullContent);
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

    // 处理XML字符（核心逻辑）
    function processXMLCharacter(char, tagContent, fullContent) {
        // 使用正则表达式检测当前的XML状态
        
        // 检测<story>标签开始
        if (tagContent.endsWith('<story>')) {
            console.log('📖 检测到story标签开始');
            // 立即创建一个空白卡片占位
            const storyNumber = getNextStoryNumber();
            createEmptyStoryCard(storyNumber);
            return;
        }
        
        // 检测<number>标签和内容
        const numberMatch = fullContent.match(/<story>[\s\S]*?<number>(\d+)/);
        if (numberMatch) {
            const number = numberMatch[1];
            const state = getOrCreateStoryState(number);
            if (!state.numberDisplayed) {
                updateStoryNumber(number);
                state.numberDisplayed = true;
            }
        }
        
        // 检测<synopsis>标签和逐字显示内容
        const synopsisMatch = fullContent.match(/<number>(\d+)<\/number>[\s\S]*?<synopsis>([^<]*)/);
        if (synopsisMatch) {
            const number = synopsisMatch[1];
            const synopsis = synopsisMatch[2];
            const state = getOrCreateStoryState(number);
            
            if (synopsis.length > state.synopsisLength) {
                const newChars = synopsis.substring(state.synopsisLength);
                appendToSynopsis(number, newChars);
                state.synopsisLength = synopsis.length;
            }
        }
        
        // 检测<zhihu_title>标签和逐字显示内容
        const titleMatch = fullContent.match(/<number>(\d+)<\/number>[\s\S]*?<zhihu_title>([^<]*)/);
        if (titleMatch) {
            const number = titleMatch[1];
            const title = titleMatch[2];
            const state = getOrCreateStoryState(number);
            
            if (title.length > state.titleLength) {
                const newChars = title.substring(state.titleLength);
                appendToTitle(number, newChars);
                state.titleLength = title.length;
            }
        }
        
        // 检测</story>标签结束
        if (tagContent.endsWith('</story>')) {
            const numberMatch = tagContent.match(/<number>(\d+)<\/number>/);
            if (numberMatch) {
                const number = numberMatch[1];
                console.log(`✅ Story ${number} 完成`);
                finalizeStoryCard(number);
            }
        }
    }

    // 获取或创建story状态
    function getOrCreateStoryState(number) {
        if (!storyStates.has(number)) {
            storyStates.set(number, {
                cardCreated: false,
                numberDisplayed: false,
                synopsisLength: 0,
                titleLength: 0,
                synopsis: '',
                title: '',
                complete: false
            });
        }
        return storyStates.get(number);
    }

    // 获取下一个story编号
    let nextStoryNumber = 1;
    function getNextStoryNumber() {
        return nextStoryNumber++;
    }

    // 创建空白story卡片占位
    function createEmptyStoryCard(estimatedNumber) {
        console.log(`🎨 创建空白卡片占位 #${estimatedNumber}`);
        
        const container = document.getElementById('ideasContainer');
        if (!container) return;
        
        // 第一个卡片时移除加载动画
        if (estimatedNumber === 1) {
            hideStreamLoading();
        }
        
        // 如果卡片已存在，跳过
        const tempId = `idea-card-temp-${estimatedNumber}`;
        if (document.getElementById(tempId)) {
            return;
        }
        
        const card = document.createElement('div');
        card.id = tempId;
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
    function updateStoryNumber(number) {
        console.log(`🔢 更新编号: ${number}`);
        
        // 查找临时卡片并更新ID
        const tempCards = document.querySelectorAll('[id^="idea-card-temp-"]');
        for (const card of tempCards) {
            const numberDiv = card.querySelector('.idea-number');
            if (numberDiv && numberDiv.textContent === '...') {
                card.id = `idea-card-${number}`;
                numberDiv.textContent = number;
                numberDiv.classList.remove('skeleton-loading');
                break;
            }
        }
    }

    // 逐字添加到synopsis
    function appendToSynopsis(number, newChars) {
        const card = document.getElementById(`idea-card-${number}`);
        if (!card) return;
        
        const contentEl = card.querySelector('.idea-content');
        if (!contentEl) return;
        
        // 移除骨架样式
        contentEl.classList.remove('skeleton-text');
        
        // 获取当前文本（去掉光标）
        let currentText = contentEl.textContent.replace('|', '');
        
        // 逐字添加新字符
        for (let i = 0; i < newChars.length; i++) {
            setTimeout(() => {
                currentText += newChars[i];
                contentEl.innerHTML = currentText + '<span class="typewriter-cursor">|</span>';
            }, i * 20); // 每个字符20ms延迟
        }
    }

    // 逐字添加到title
    function appendToTitle(number, newChars) {
        const card = document.getElementById(`idea-card-${number}`);
        if (!card) return;
        
        const titleEl = card.querySelector('.idea-title');
        if (!titleEl) return;
        
        // 移除骨架样式
        titleEl.classList.remove('skeleton-text');
        
        // 获取当前文本（去掉光标）
        let currentText = titleEl.textContent.replace('|', '');
        
        // 逐字添加新字符
        for (let i = 0; i < newChars.length; i++) {
            setTimeout(() => {
                currentText += newChars[i];
                titleEl.innerHTML = currentText + '<span class="typewriter-cursor">|</span>';
            }, i * 20);
        }
    }

    // 完成story卡片
    function finalizeStoryCard(number) {
        const card = document.getElementById(`idea-card-${number}`);
        if (!card) return;
        
        // 移除骨架样式
        card.classList.remove('skeleton-card');
        
        // 移除光标
        const cursors = card.querySelectorAll('.typewriter-cursor');
        cursors.forEach(cursor => cursor.remove());
        
        // 启用选择按钮
        const btn = card.querySelector('.select-idea-btn');
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.textContent = '选择这个脑洞';
            btn.addEventListener('click', () => selectIdea(number));
        }
        
        // 添加完成动画
        card.classList.add('card-complete');
    }

    // 显示流式加载动画
    function showStreamLoading() {
        const container = document.getElementById('ideasContainer');
        if (!container) return;
        
        container.innerHTML = '';
        nextStoryNumber = 1; // 重置计数器
        storyStates.clear(); // 清空状态
        
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

    // 选择脑洞
    function selectIdea(ideaNumber) {
        console.log(`👆 选择脑洞: ${ideaNumber}`);
        selectedIdeaNumber = ideaNumber;
        
        document.querySelectorAll('.idea-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.getElementById(`idea-card-${ideaNumber}`).classList.add('selected');
        
        alert(`已选择脑洞 ${ideaNumber}，大纲生成功能待实现`);
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
                
                const result = await callStreamAPI(
                    'https://n8n.games/webhook-test/c78e428c-bc35-4d74-a52a-65328e76f6bd',
                    data,
                    (chunk, fullContent) => {
                        console.log('📝 收到片段');
                    },
                    (fullContent) => {
                        console.log('✅ 生成完成');
                        workflowState.ideasGenerated = true;
                    }
                );
                
            } catch (error) {
                console.error('❌ 生成失败:', error);
                alert('生成失败，请重试');
            } finally {
                this.disabled = false;
            }
        });
    }

    console.log('✅ 流式脚本V2初始化完成');
});