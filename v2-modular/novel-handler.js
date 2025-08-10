// 小说生成相关函数

// 小说解析状态
const novelParserState = {
    buffer: '',
    content: '',
    lastProcessedIndex: 0,
    tagBuffer: '',
    novelStarted: false,
    textStarted: false,
    isComplete: false
};

// 生成小说（首次）
async function generateNovel() {
    console.log('📚 开始生成小说');
    
    // 立即清空容器，防止旧内容闪现
    const container = document.getElementById('novelContainer');
    if (container) {
        container.innerHTML = '';
    }
    
    // 静默清理后续步骤的数据（因为要生成新小说）
    if (typeof clearDependentSteps === 'function') {
        clearDependentSteps(4);
        console.log('🔄 生成新小说，已清理后续步骤数据');
    }
    
    // 获取大纲内容
    const outline = outlineParserState.outline;
    if (!outline.open || !outline.build || !outline.turn || !outline.end) {
        console.error('❌ 大纲内容不完整');
        showError('请先生成完整的大纲');
        return;
    }
    
    console.log('📖 使用大纲:', outline);
    
    // 显示加载动画
    if (container) {
        showNovelLoading();
        // 重置滚动管理器
        const scrollManager = getScrollManager('novelContainer');
        if (scrollManager) {
            scrollManager.reset();
        }
    }
    
    // 禁用按钮
    const scriptBtn = document.getElementById('generateScriptBtn');
    if (scriptBtn) {
        scriptBtn.disabled = true;
        scriptBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    
    try {
        // 调用API生成小说
        const response = await generateNovelAPI(outline);
        
        // 重置解析状态
        resetNovelParserState();
        
        // 处理流式响应
        let fullContent = '';
        await processStreamResponse(response, 
            // onChunk回调
            (chunk) => {
                fullContent += chunk;
                processNovelStreamContent(fullContent);
            },
            // onComplete回调
            () => {
                console.log('✅ 小说生成完成');
                // 保存小说到localStorage
                localStorage.setItem('currentNovel', novelParserState.content);
                
                // 更新工作流状态 - 小说生成完成
                if (typeof workflowState !== 'undefined') {
                    workflowState.steps[4].completed = true;
                    workflowState.steps[4].hasData = true;
                    console.log('✅ 小说生成完成，更新状态');
                }
                
                // 清除生成标记
                window.isGeneratingNovel = false;
                
                // 启用脚本生成按钮
                if (scriptBtn) {
                    scriptBtn.disabled = false;
                    scriptBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
                
                // 显示重新生成控制区
                showNovelControls();
            }
        );
    } catch (error) {
        console.error('❌ 小说生成失败:', error);
        showError('小说生成失败，请稍后重试');
        
        // 恢复按钮状态
        if (scriptBtn) {
            scriptBtn.disabled = false;
            scriptBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

// 重新生成小说
async function regenerateNovel() {
    const optimizeInput = document.getElementById('novelOptimizeInput');
    const optimization = optimizeInput ? optimizeInput.value.trim() : null;
    
    console.log('🔄 重新生成小说');
    
    // 立即清空容器，防止旧内容闪现
    const container = document.getElementById('novelContainer');
    if (container) {
        container.innerHTML = '';
    }
    
    // 静默清理后续步骤的数据（因为要重新生成小说）
    if (typeof clearDependentSteps === 'function') {
        clearDependentSteps(4);
        console.log('🔄 重新生成小说，已清理后续步骤数据');
    }
    
    // 获取大纲内容
    const outline = outlineParserState.outline;
    if (!outline.open || !outline.build || !outline.turn || !outline.end) {
        console.error('❌ 大纲内容不完整');
        showError('大纲内容错误');
        return;
    }
    
    // 显示加载动画
    if (container) {
        showNovelLoading(true); // true表示重新生成
    }
    
    try {
        // 准备请求数据
        const requestBody = {
            action: 'regenerate',
            outline: {
                opening: outline.open,
                development: outline.build,
                climax: outline.turn,
                conclusion: outline.end
            },
            optimization: optimization,
            session_id: getSessionId()
        };
        
        // 如果有优化建议，添加之前的小说内容
        if (optimization) {
            requestBody.previous_novel = novelParserState.content;
        }
        
        console.log('🔄 发送重新生成小说请求');
        
        const response = await fetch(API_CONFIG.novel, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // 重置解析状态
        resetNovelParserState();
        
        // 处理流式响应
        let fullContent = '';
        await processStreamResponse(response, 
            // onChunk回调
            (chunk) => {
                fullContent += chunk;
                processNovelStreamContent(fullContent);
            },
            // onComplete回调
            () => {
                console.log('✅ 小说重新生成完成');
                // 保存小说到localStorage
                localStorage.setItem('currentNovel', novelParserState.content);
                
                // 清空优化输入框
                if (optimizeInput) {
                    optimizeInput.value = '';
                }
            }
        );
    } catch (error) {
        console.error('❌ 小说重新生成失败:', error);
        showError('小说重新生成失败，请稍后重试');
    }
}

// 重置小说解析状态
function resetNovelParserState() {
    novelParserState.buffer = '';
    novelParserState.content = '';
    novelParserState.lastProcessedIndex = 0;
    novelParserState.tagBuffer = '';
    novelParserState.novelStarted = false;
    novelParserState.textStarted = false;
    novelParserState.isComplete = false;
}

// 处理小说流式内容
function processNovelStreamContent(fullContent) {
    const newContent = fullContent.substring(novelParserState.lastProcessedIndex);
    if (!newContent) return;
    
    // 输出调试信息
    if (newContent.length > 0 && novelParserState.lastProcessedIndex === 0) {
        console.log('🔍 首次接收到小说内容:', newContent.substring(0, 100));
    }
    
    for (let i = 0; i < newContent.length; i++) {
        const char = newContent[i];
        novelParserState.buffer += char;
        novelParserState.tagBuffer += char;
        
        // 保持tagBuffer在合理长度
        if (novelParserState.tagBuffer.length > 30) {
            novelParserState.tagBuffer = novelParserState.tagBuffer.substring(1);
        }
        
        detectAndProcessNovelXML();
    }
    
    novelParserState.lastProcessedIndex = fullContent.length;
}

// 检测并处理小说XML格式
function detectAndProcessNovelXML() {
    const buffer = novelParserState.buffer;
    const tagBuffer = novelParserState.tagBuffer;
    
    // 检测<novel>标签开始
    if (!novelParserState.novelStarted && tagBuffer.endsWith('<novel>')) {
        console.log('📖 检测到novel标签开始');
        novelParserState.novelStarted = true;
        novelParserState.buffer = '';
        return;
    }
    
    // 检测<text>标签开始
    if (novelParserState.novelStarted && !novelParserState.textStarted && tagBuffer.endsWith('<text>')) {
        console.log('📝 检测到text标签开始');
        novelParserState.textStarted = true;
        // 清空buffer，准备接收text内容
        novelParserState.buffer = '';
        
        // 隐藏加载动画
        hideNovelLoading();
        
        // 延迟显示小说容器
        setTimeout(() => {
            const container = document.getElementById('novelContainer');
            if (container) {
                container.innerHTML = `
                    <div id="novelContent" class="prose prose-lg max-w-none">
                        <div id="novelText" class="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            <span class="content-wrapper"></span>
                            <span class="typewriter-cursor">|</span>
                        </div>
                    </div>
                `;
                
                // 使用getScrollManager获取或创建，避免重复
                const scrollManager = getScrollManager('novelContainer');
                if (scrollManager) {
                    scrollManager.reset();  // 只重置状态，不重新创建
                }
            }
        }, 300);
        return;
    }
    
    // 处理text标签内容
    if (novelParserState.textStarted && !novelParserState.isComplete) {
        if (buffer.includes('</text>')) {
            // 提取最终内容
            const content = buffer.substring(0, buffer.indexOf('</text>'));
            if (content.length > novelParserState.content.length) {
                const newChars = content.substring(novelParserState.content.length);
                appendToNovelContent(newChars);
                novelParserState.content = content;
            }
            
            // 标记text结束
            novelParserState.textStarted = false;
            novelParserState.buffer = '';
            console.log('✅ text标签结束');
            
            // 移除光标
            removeNovelCursor();
        } else {
            // 继续追加内容
            if (buffer.length > novelParserState.content.length && !buffer.includes('<')) {
                const newChars = buffer.substring(novelParserState.content.length);
                appendToNovelContent(newChars);
                novelParserState.content = buffer;
            }
        }
    }
    
    // 检测</novel>标签结束
    if (novelParserState.novelStarted && tagBuffer.endsWith('</novel>')) {
        console.log('✅ 小说解析完成');
        novelParserState.novelStarted = false;
        novelParserState.isComplete = true;
        novelParserState.buffer = '';
        finalizeNovel();
    }
}

// 追加内容到小说
function appendToNovelContent(newChars) {
    const novelText = document.getElementById('novelText');
    if (!novelText) return;
    
    const wrapper = novelText.querySelector('.content-wrapper');
    if (wrapper) {
        // 直接追加文本，不使用打字机效果
        wrapper.textContent += newChars;
        
        // 使用节流，每100ms最多触发一次滚动
        const now = Date.now();
        if (!window.lastNovelScrollTime || now - window.lastNovelScrollTime > 100) {
            const scrollManager = getScrollManager('novelContainer');
            if (scrollManager) {
                scrollManager.scrollToBottom();
            }
            window.lastNovelScrollTime = now;
        }
    }
}

// 移除小说光标
function removeNovelCursor() {
    const novelText = document.getElementById('novelText');
    if (!novelText) return;
    
    const cursor = novelText.querySelector('.typewriter-cursor');
    if (cursor) {
        cursor.remove();
    }
}

// 完成小说
function finalizeNovel() {
    // 确保光标被移除
    removeNovelCursor();
    
    // 添加编辑功能（如果需要）
    const novelText = document.getElementById('novelText');
    if (novelText) {
        novelText.classList.add('cursor-pointer', 'hover:bg-gray-50', 'transition-colors', 'p-4', 'rounded-lg');
    }
}

// 显示小说控制区域
function showNovelControls() {
    const container = document.getElementById('novelContainer');
    if (!container) return;
    
    // 检查是否已存在控制区域
    if (document.getElementById('novelControls')) return;
    
    const controlsDiv = document.createElement('div');
    controlsDiv.id = 'novelControls';
    controlsDiv.className = 'mt-6';
    controlsDiv.innerHTML = `
        <!-- 优化建议输入区 -->
        <div class="bg-gray-50 rounded-xl p-4">
            <div class="flex flex-col md:flex-row items-center gap-4">
                <div class="relative flex-1 w-full">
                    <input 
                        type="text" 
                        id="novelOptimizeInput" 
                        class="w-full p-3 pl-10 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
                        placeholder="输入优化建议，比如：增加更多细节描写...">
                    <i class="fas fa-comment-dots text-gray-400 absolute left-3 top-3.5"></i>
                </div>
                <button 
                    onclick="regenerateNovel()" 
                    class="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium transition-colors flex items-center">
                    <i class="fas fa-sync-alt mr-2"></i>重新生成
                </button>
            </div>
        </div>
    `;
    
    // 插入到内容之后
    const novelContent = document.getElementById('novelContent');
    if (novelContent && novelContent.parentNode) {
        novelContent.parentNode.insertBefore(controlsDiv, novelContent.nextSibling);
    }
}

// 显示小说加载动画（复用脑洞样式）
function showNovelLoading(isRegenerate = false) {
    const container = document.getElementById('novelContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div id="novelStreamLoading" class="stream-loading">
            <div class="stream-loading-container">
                <div class="stream-loading-animation">
                    <div class="stream-dot"></div>
                    <div class="stream-dot"></div>
                    <div class="stream-dot"></div>
                </div>
                <p class="stream-loading-text">正在连接AI服务...</p>
                <p class="text-sm text-gray-500 mt-2">请稍候，AI正在创作小说</p>
                <div class="loading-progress-bar">
                    <div class="loading-progress-fill"></div>
                </div>
            </div>
        </div>
    `;
    
    // 更新提示文字
    setTimeout(() => {
        const loadingText = container.querySelector('.stream-loading-text');
        const subText = loadingText ? loadingText.nextElementSibling : null;
        if (loadingText) {
            loadingText.textContent = 'AI正在构思情节...';
        }
        if (subText) {
            subText.textContent = '创作精彩故事中';
        }
    }, 5000);
    
    setTimeout(() => {
        const loadingText = container.querySelector('.stream-loading-text');
        const subText = loadingText ? loadingText.nextElementSibling : null;
        if (loadingText) {
            loadingText.textContent = 'AI正在雕琢文字...';
        }
        if (subText) {
            subText.textContent = '即将完成创作';
        }
    }, 15000);
}

// 隐藏小说加载动画
function hideNovelLoading() {
    const loadingDiv = document.getElementById('novelStreamLoading');
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