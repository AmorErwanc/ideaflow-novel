// 流式输出版本 - AI小说创作平台脚本文件
console.log('🚀 流式脚本加载完成');

document.addEventListener('DOMContentLoaded', function() {
    console.log('📝 DOM加载完成，初始化流式处理');
    
    // 全局变量
    let firstWaithook = '';
    let secondWaithook = '';
    let thirdWaithook = '';
    let selectedIdeaNumber = null;
    let currentIdeas = [];
    let currentStreamController = null; // 用于取消流式请求
    
    // 流程状态管理
    let workflowState = {
        ideasGenerated: false,
        outlineGenerated: false,
        scriptGenerated: false,
        novelGenerated: false
    };

    // 流式API调用函数
    async function callStreamAPI(url, data, onChunk, onComplete) {
        console.log(`🌊 开始流式请求: ${url}`, data);
        const startTime = Date.now();
        
        // 创建AbortController用于取消请求
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
            let parsedStories = new Set(); // 记录已解析的story，避免重复
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    console.log(`✅ 流式传输完成，总耗时: ${Date.now() - startTime}ms`);
                    break;
                }
                
                // 解码数据
                buffer += decoder.decode(value, { stream: true });
                
                // 按行处理JSON流
                const lines = buffer.split('\n');
                buffer = lines.pop(); // 保留不完整的行
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const json = JSON.parse(line);
                            console.log('📦 收到数据片段:', json.type, json.content?.substring(0, 20));
                            
                            if (json.type === 'begin') {
                                console.log('🎬 流开始:', json.metadata);
                                // 显示加载动画
                                showStreamLoading();
                            } else if (json.type === 'item') {
                                fullContent += json.content;
                                
                                // 回调处理片段
                                if (onChunk) {
                                    onChunk(json.content, fullContent);
                                }
                                
                                // 尝试解析完整的story标签
                                parseAndDisplayStories(fullContent, parsedStories);
                            } else if (json.type === 'end') {
                                console.log('🏁 流结束:', json.metadata);
                            }
                        } catch (e) {
                            console.error('❌ JSON解析错误:', e, 'Line:', line);
                        }
                    }
                }
            }
            
            // 处理剩余的buffer
            if (buffer.trim()) {
                try {
                    const json = JSON.parse(buffer);
                    if (json.type === 'item') {
                        fullContent += json.content;
                    }
                } catch (e) {
                    console.error('❌ 处理剩余buffer错误:', e);
                }
            }
            
            // 完成回调
            if (onComplete) {
                console.log('📄 完整内容长度:', fullContent.length);
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

    // 解析并显示故事卡片
    function parseAndDisplayStories(xmlContent, parsedStories) {
        console.log('🔍 尝试解析XML内容，当前长度:', xmlContent.length);
        
        // 查找完整的story标签
        const storyRegex = /<story>[\s\S]*?<\/story>/g;
        const matches = xmlContent.match(storyRegex);
        
        if (matches) {
            console.log(`📚 找到 ${matches.length} 个story标签`);
            
            matches.forEach((storyXml, index) => {
                // 使用story内容的hash作为唯一标识
                const storyHash = simpleHash(storyXml);
                
                if (!parsedStories.has(storyHash)) {
                    parsedStories.add(storyHash);
                    
                    try {
                        // 解析单个story
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(storyXml, 'text/xml');
                        
                        const number = doc.querySelector('number')?.textContent;
                        const synopsis = doc.querySelector('synopsis')?.textContent;
                        const title = doc.querySelector('zhihu_title')?.textContent;
                        
                        console.log(`✨ 解析story ${number}: ${title}`);
                        
                        // 动态显示story卡片
                        displayStreamStoryCard(number, synopsis, title);
                    } catch (e) {
                        console.error('❌ 解析story XML错误:', e);
                    }
                }
            });
        }
    }

    // 简单的hash函数
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    // 显示流式加载动画
    function showStreamLoading() {
        const container = document.getElementById('ideasContainer');
        if (!container) return;
        
        // 清空容器
        container.innerHTML = '';
        
        // 添加流式加载提示
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
            <div class="stream-progress">
                <div class="stream-progress-bar"></div>
            </div>
        `;
        container.appendChild(loadingDiv);
        
        // 显示容器
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

    // 显示流式故事卡片
    function displayStreamStoryCard(number, synopsis, title) {
        console.log(`🎨 显示卡片 ${number}: ${title}`);
        
        const container = document.getElementById('ideasContainer');
        if (!container) return;
        
        // 移除加载动画（如果是第一个卡片）
        if (number === '1') {
            hideStreamLoading();
        }
        
        // 检查是否已存在该卡片
        if (document.getElementById(`idea-card-${number}`)) {
            console.log(`⚠️ 卡片 ${number} 已存在，跳过`);
            return;
        }
        
        // 创建卡片元素
        const card = document.createElement('div');
        card.id = `idea-card-${number}`;
        card.className = 'idea-card stream-card-enter';
        card.innerHTML = `
            <div class="idea-number">${number}</div>
            <h3 class="idea-title">${title || '创意标题'}</h3>
            <p class="idea-content">${synopsis || '加载中...'}</p>
            <button class="select-idea-btn" data-idea="${number}">
                选择这个脑洞
            </button>
        `;
        
        container.appendChild(card);
        
        // 添加动画效果
        setTimeout(() => {
            card.classList.add('stream-card-visible');
        }, 50);
        
        // 添加点击事件
        const selectBtn = card.querySelector('.select-idea-btn');
        selectBtn.addEventListener('click', function() {
            selectIdea(number);
        });
        
        // 存储到currentIdeas
        if (!currentIdeas[number - 1]) {
            currentIdeas[number - 1] = {
                number: number,
                title: title,
                synopsis: synopsis
            };
        }
    }

    // 选择脑洞
    function selectIdea(ideaNumber) {
        console.log(`👆 选择脑洞: ${ideaNumber}`);
        selectedIdeaNumber = ideaNumber;
        
        // 高亮选中的卡片
        document.querySelectorAll('.idea-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.getElementById(`idea-card-${ideaNumber}`).classList.add('selected');
        
        // 这里可以触发生成大纲的流程
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
                
                // 使用流式API
                const result = await callStreamAPI(
                    'https://n8n.games/webhook-test/c78e428c-bc35-4d74-a52a-65328e76f6bd',
                    data,
                    (chunk, fullContent) => {
                        // 处理每个数据片段
                        console.log('📝 收到片段，当前总长度:', fullContent.length);
                    },
                    (fullContent) => {
                        // 处理完整内容
                        console.log('✅ 生成完成，总内容:', fullContent);
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

    // 自定义生成按钮事件
    const generateIdeasBtn = document.getElementById('generateIdeasBtn');
    if (generateIdeasBtn) {
        generateIdeasBtn.addEventListener('click', async function() {
            console.log('🎯 点击自定义生成按钮');
            
            const novelPrompt = document.getElementById('novelPrompt');
            const ideaCount = document.getElementById('ideaCount');
            
            if (!novelPrompt || !novelPrompt.value.trim()) {
                alert('请输入你的小说创意需求');
                return;
            }
            
            try {
                this.disabled = true;
                
                const data = {
                    idea: novelPrompt.value,
                    count: ideaCount ? ideaCount.value : 5
                };
                
                console.log('📤 发送自定义请求:', data);
                
                // 使用流式API
                const result = await callStreamAPI(
                    'https://n8n.games/webhook-test/c78e428c-bc35-4d74-a52a-65328e76f6bd',
                    data,
                    (chunk, fullContent) => {
                        console.log('📝 收到片段，当前总长度:', fullContent.length);
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

    // 取消生成按钮（可选）
    function addCancelButton() {
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancelStreamBtn';
        cancelBtn.className = 'cancel-stream-btn';
        cancelBtn.textContent = '停止生成';
        cancelBtn.style.display = 'none';
        
        cancelBtn.addEventListener('click', () => {
            if (currentStreamController) {
                currentStreamController.abort();
                console.log('⏹️ 用户取消了生成');
            }
        });
        
        document.body.appendChild(cancelBtn);
    }
    
    // 初始化
    addCancelButton();
    console.log('✅ 流式脚本初始化完成');
});