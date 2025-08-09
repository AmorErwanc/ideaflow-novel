// 流式处理相关函数

// 开始流式生成脑洞（真实API版）
async function startStreamingIdeas(userInput = null) {
    console.log('🚀 开始流式生成脑洞');
    
    // 如果有用户输入的优化建议，显示在控制台
    if (userInput) {
        console.log('📝 用户创意输入:', userInput);
    }
    
    // 清空容器
    const container = document.getElementById('ideasContainer');
    container.innerHTML = '';
    
    // 显示流式加载动画
    showStreamLoading();
    
    try {
        // 确定生成模式
        const mode = userInput ? 'custom' : 'quick';
        const count = selectedMode === 'quick' ? 10 : 5;
        
        // 调用API
        const response = await generateIdeasAPI(mode, userInput, count);
        
        // 重置解析状态（加载动画将在检测到第一个<s1>时隐藏）
        resetParserState();
        
        // 处理流式响应
        let fullContent = '';
        await processStreamResponse(response, 
            // onChunk回调
            (chunk) => {
                fullContent += chunk;
                processStreamContent(fullContent);
            },
            // onComplete回调
            () => {
                console.log('✅ 脑洞生成完成');
                // 显示底部控制区域
                setTimeout(() => {
                    showBottomControls();
                }, 500);
            }
        );
    } catch (error) {
        console.error('❌ 脑洞生成失败:', error);
        hideStreamLoading();
        // 显示错误消息
        showError('脑洞生成失败，请稍后重试');
    }
}

// 重新生成脑洞
async function regenerateIdeas() {
    const optimizeInput = document.getElementById('optimizeIdeasInput');
    const userSuggestion = optimizeInput ? optimizeInput.value.trim() : '';
    
    console.log('🔄 重新生成脑洞');
    
    // 收集已有的脑洞标题
    const previousIdeas = [];
    parserState.stories.forEach(story => {
        if (story.title) {
            previousIdeas.push(story.title);
        }
    });
    
    // 获取选中的脑洞信息
    let selectedIdeaData = null;
    if (selectedIdea) {
        const story = parserState.stories.get(String(selectedIdea));
        if (story) {
            selectedIdeaData = {
                number: selectedIdea,
                title: story.title,
                content: story.content
            };
        }
    }
    
    // 清空已选择的脑洞
    selectedIdea = null;
    
    // 隐藏底部控制区域
    hideBottomControls();
    
    // 禁用下一步按钮
    const nextBtn = document.getElementById('nextToOutlineBtn');
    if (nextBtn) {
        nextBtn.disabled = true;
        nextBtn.classList.add('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
        nextBtn.classList.remove('bg-gradient-to-r', 'from-green-500', 'to-emerald-500', 'text-white', 'hover:shadow-lg');
    }
    
    // 清空容器
    const container = document.getElementById('ideasContainer');
    container.innerHTML = '';
    
    // 显示流式加载动画
    showStreamLoading();
    
    try {
        // 获取原始prompt（从localStorage或用户当前输入）
        const originalPrompt = localStorage.getItem('userCreativeInput') || null;
        const mode = originalPrompt ? 'custom' : 'quick';
        
        // 调用重新生成API
        const response = await regenerateIdeasAPI(
            mode,
            originalPrompt,
            userSuggestion || null,
            selectedIdeaData,
            previousIdeas
        );
        
        // 重置解析状态（加载动画将在检测到第一个<s1>时隐藏）
        resetParserState();
        
        // 处理流式响应
        let fullContent = '';
        await processStreamResponse(response, 
            // onChunk回调
            (chunk) => {
                fullContent += chunk;
                processStreamContent(fullContent);
            },
            // onComplete回调
            () => {
                console.log('✅ 重新生成完成');
                // 显示底部控制区域
                setTimeout(() => {
                    showBottomControls();
                }, 500);
            }
        );
    } catch (error) {
        console.error('❌ 重新生成失败:', error);
        hideStreamLoading();
        showError('重新生成失败，请稍后重试');
    }
}

// 模拟流式输出
function simulateStreamingOutput() {
    // 重置解析状态
    resetParserState();
    
    // 构建模拟的XML内容
    let xmlContent = '';
    mockIdeas.forEach((idea, index) => {
        xmlContent += `<s${index + 1}><t>${idea.title}</t><c>${idea.content}</c></s${index + 1}>`;
    });
    
    // 逐字符流式输出
    let currentIndex = 0;
    const outputInterval = setInterval(() => {
        if (currentIndex < xmlContent.length) {
            // 每次输出1-3个字符，模拟不均匀的流速
            const chunkSize = Math.floor(Math.random() * 3) + 1;
            const chunk = xmlContent.substring(currentIndex, currentIndex + chunkSize);
            
            // 更新解析状态的lastProcessedIndex
            const fullContent = xmlContent.substring(0, currentIndex + chunkSize);
            processStreamContent(fullContent);
            
            currentIndex += chunkSize;
        } else {
            clearInterval(outputInterval);
            console.log('✅ 模拟流式生成完成');
            
            // 显示底部控制区域
            setTimeout(() => {
                showBottomControls();
            }, 500);
        }
    }, 20); // 每20ms输出一次
}

// 重置解析状态
function resetParserState() {
    parserState.currentStoryNum = null;
    parserState.currentTag = null;
    parserState.buffer = '';
    parserState.stories.clear();
    parserState.lastProcessedIndex = 0;
    parserState.tagBuffer = '';
    parserState.firstStoryDetected = false; // 添加标志位
}

// 处理流式内容
function processStreamContent(fullContent) {
    const newContent = fullContent.substring(parserState.lastProcessedIndex);
    if (!newContent) return;
    
    for (let i = 0; i < newContent.length; i++) {
        const char = newContent[i];
        parserState.buffer += char;
        parserState.tagBuffer += char;
        
        if (parserState.tagBuffer.length > 20) {
            parserState.tagBuffer = parserState.tagBuffer.substring(1);
        }
        
        detectAndProcessSimplifiedXML();
    }
    
    parserState.lastProcessedIndex = fullContent.length;
}

// 检测并处理简化的XML格式
function detectAndProcessSimplifiedXML() {
    const buffer = parserState.buffer;
    const tagBuffer = parserState.tagBuffer;
    
    const storyStartMatch = tagBuffer.match(/<s(\d+)>$/);
    if (storyStartMatch) {
        const storyNum = storyStartMatch[1];
        console.log(`📖 检测到story ${storyNum} 开始`);
        
        // 第一个故事开始时，隐藏加载动画
        if (!parserState.firstStoryDetected) {
            parserState.firstStoryDetected = true;
            hideStreamLoading();
            console.log('🎬 第一个故事开始，隐藏加载动画');
        }
        
        parserState.currentStoryNum = storyNum;
        parserState.currentTag = null;
        
        parserState.stories.set(storyNum, {
            number: storyNum,
            title: '',
            content: '',
            cardCreated: false,
            titleStarted: false,
            contentStarted: false,
            titleComplete: false,
            contentComplete: false
        });
        
        createEmptyStoryCard(storyNum);
        parserState.buffer = '';
        return;
    }
    
    if (parserState.currentStoryNum && tagBuffer.endsWith('<t>')) {
        console.log(`📝 Story ${parserState.currentStoryNum} 标题开始`);
        const story = parserState.stories.get(parserState.currentStoryNum);
        if (story) {
            story.titleStarted = true;
            parserState.currentTag = 't';
            parserState.buffer = '';
        }
        return;
    }
    
    if (parserState.currentTag === 't' && parserState.currentStoryNum) {
        const story = parserState.stories.get(parserState.currentStoryNum);
        if (story && story.titleStarted && !story.titleComplete) {
            if (buffer.includes('</t>')) {
                const titleContent = buffer.substring(0, buffer.indexOf('</t>'));
                if (titleContent.length > story.title.length) {
                    const newChars = titleContent.substring(story.title.length);
                    appendToTitle(story.number, newChars);
                    story.title = titleContent;
                }
                story.titleComplete = true;
                parserState.currentTag = null;
                parserState.buffer = '';
                console.log(`✅ Story ${story.number} 标题完成: ${story.title}`);
            } else {
                if (buffer.length > story.title.length && !buffer.includes('<')) {
                    const newChars = buffer.substring(story.title.length);
                    appendToTitle(story.number, newChars);
                    story.title = buffer;
                }
            }
        }
    }
    
    if (parserState.currentStoryNum && tagBuffer.endsWith('<c>')) {
        console.log(`📄 Story ${parserState.currentStoryNum} 内容开始`);
        const story = parserState.stories.get(parserState.currentStoryNum);
        if (story) {
            story.contentStarted = true;
            parserState.currentTag = 'c';
            parserState.buffer = '';
            removeTitleCursor(story.number);
        }
        return;
    }
    
    if (parserState.currentTag === 'c' && parserState.currentStoryNum) {
        const story = parserState.stories.get(parserState.currentStoryNum);
        if (story && story.contentStarted && !story.contentComplete) {
            if (buffer.includes('</c>')) {
                const content = buffer.substring(0, buffer.indexOf('</c>'));
                if (content.length > story.content.length) {
                    const newChars = content.substring(story.content.length);
                    appendToContent(story.number, newChars);
                    story.content = content;
                }
                story.contentComplete = true;
                parserState.currentTag = null;
                parserState.buffer = '';
                console.log(`✅ Story ${story.number} 内容完成`);
            } else {
                if (buffer.length > story.content.length && !buffer.includes('<')) {
                    const newChars = buffer.substring(story.content.length);
                    appendToContent(story.number, newChars);
                    story.content = buffer;
                }
            }
        }
    }
    
    const storyEndMatch = tagBuffer.match(/<\/s(\d+)>$/);
    if (storyEndMatch) {
        const storyNum = storyEndMatch[1];
        if (storyNum === parserState.currentStoryNum) {
            const story = parserState.stories.get(storyNum);
            console.log(`✅ Story ${storyNum} 完全结束`);
            finalizeStoryCard(storyNum);
            parserState.currentStoryNum = null;
            parserState.currentTag = null;
            parserState.buffer = '';
        }
    }
}

// 显示流式加载动画
function showStreamLoading() {
    const container = document.getElementById('ideasContainer');
    if (!container) return;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'streamLoading';
    loadingDiv.className = 'col-span-full stream-loading';
    loadingDiv.innerHTML = `
        <div class="stream-loading-container">
            <div class="stream-loading-animation">
                <div class="stream-dot"></div>
                <div class="stream-dot"></div>
                <div class="stream-dot"></div>
            </div>
            <p class="stream-loading-text">正在连接AI服务...</p>
            <p class="text-sm text-gray-500 mt-2">请稍候，创意生成中</p>
            <div class="loading-progress-bar">
                <div class="loading-progress-fill"></div>
            </div>
        </div>
    `;
    container.appendChild(loadingDiv);
    
    // 3秒后更新提示文字（如果还在加载）
    setTimeout(() => {
        const loadingText = document.querySelector('.stream-loading-text');
        if (loadingText) {
            loadingText.textContent = 'AI正在深度思考，生成独特创意...';
        }
    }, 3000);
}

// 隐藏流式加载动画（带渐隐效果）
function hideStreamLoading() {
    const loadingDiv = document.getElementById('streamLoading');
    if (loadingDiv) {
        // 添加渐隐效果
        loadingDiv.style.transition = 'opacity 0.3s ease-out';
        loadingDiv.style.opacity = '0';
        
        // 300ms后移除元素
        setTimeout(() => {
            loadingDiv.remove();
        }, 300);
    }
}

// 显示底部控制区域
function showBottomControls() {
    const controls = document.getElementById('ideasBottomControls');
    if (controls) {
        // 显示元素
        controls.style.display = 'block';
        
        // 触发动画
        setTimeout(() => {
            controls.classList.remove('opacity-0', 'translate-y-4');
            controls.classList.add('opacity-100', 'translate-y-0');
        }, 50);
        
        // 启用下一步按钮（如果有选中的脑洞）
        if (selectedIdea) {
            const nextBtn = document.getElementById('nextToOutlineBtn');
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
                nextBtn.classList.add('bg-gradient-to-r', 'from-green-500', 'to-emerald-500', 'text-white', 'hover:shadow-lg');
            }
        }
    }
}

// 隐藏底部控制区域
function hideBottomControls() {
    const controls = document.getElementById('ideasBottomControls');
    if (controls) {
        controls.classList.add('opacity-0', 'translate-y-4');
        controls.classList.remove('opacity-100', 'translate-y-0');
        
        setTimeout(() => {
            controls.style.display = 'none';
        }, 500);
    }
}

// 通用打字机效果函数
function typewriterEffect(elementId, text, speed = 20, callback) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let charIndex = 0;
    const typeInterval = setInterval(() => {
        if (charIndex < text.length) {
            element.textContent += text[charIndex];
            charIndex++;
        } else {
            clearInterval(typeInterval);
            if (callback) callback();
        }
    }, speed);
}