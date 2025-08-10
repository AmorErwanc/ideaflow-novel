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
    if (!novelParserState.novelStarted && tagBuffer.includes('<novel>')) {
        console.log('📖 检测到novel标签开始');
        novelParserState.novelStarted = true;
        // 保持buffer完整，让后续的text标签处理来管理内容
        console.log('📊 保持buffer完整，等待text标签处理');
        return;
    }
    
    // 检测<text>标签开始 - 等待完整标签再开始渲染
    if (novelParserState.novelStarted && !novelParserState.textStarted && buffer.includes('<text>')) {
        const textTagIndex = buffer.indexOf('<text>');
        console.log('📝 检测到完整的text开始标签');
        
        // 设置当前正在处理text标签
        novelParserState.textStarted = true;
        
        // 隐藏加载动画并创建容器
        hideNovelLoading();
        
        // 创建小说容器 - 检查是否已存在，避免重复创建
        const container = document.getElementById('novelContainer');
        if (container && !document.getElementById('novelContent')) {
            container.innerHTML = `
                <div id="novelContent" class="prose prose-lg max-w-none">
                    <div id="novelText" class="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        <span class="content-wrapper"></span>
                        <span class="typewriter-cursor">|</span>
                    </div>
                </div>
            `;
            
            // 使用getScrollManager获取或创建
            const scrollManager = getScrollManager('novelContainer');
            if (scrollManager) {
                scrollManager.reset();
                scrollManager.init(); // 重新初始化以绑定新容器
            }
        }
        
        // 获取标签后的内容
        const afterTextTag = buffer.substring(textTagIndex + 6); // '<text>'.length = 6
        
        // 检查是否已有结束标签
        const endTextIndex = afterTextTag.indexOf('</text>');
        
        if (endTextIndex !== -1) {
            // 找到完整内容
            const content = afterTextTag.substring(0, endTextIndex);
            console.log('✅ text标签包含完整内容:', content.substring(0, 50) + '...');
            novelParserState.content = content;
            appendToNovelContent(content);
            
            // 标记完成并更新buffer
            novelParserState.textStarted = false;
            novelParserState.buffer = afterTextTag.substring(endTextIndex + 7); // '</text>'.length = 7
        } else {
            // 没有结束标签，先显示已有内容
            const availableContent = afterTextTag.split('<')[0]; // 获取到下一个标签前的内容
            
            if (availableContent) {
                appendToNovelContent(availableContent);
                novelParserState.content = availableContent;
            }
            
            // 更新buffer，移除开始标签但保留内容
            novelParserState.buffer = afterTextTag;
        }
        return;
    }
    
    // 处理text标签内容 - 流式追加
    if (novelParserState.textStarted && !novelParserState.isComplete) {
        const closeTagIndex = buffer.indexOf('</text>');
        
        if (closeTagIndex !== -1) {
            // 找到结束标签，提取完整内容
            const content = buffer.substring(0, closeTagIndex);
            
            // 追加剩余内容
            if (content.length > novelParserState.content.length) {
                const newChars = content.substring(novelParserState.content.length);
                appendToNovelContent(newChars);
                novelParserState.content = content;
            }
            
            // 标记完成
            novelParserState.textStarted = false;
            novelParserState.buffer = buffer.substring(closeTagIndex + 7); // '</text>'.length = 7
            console.log('✅ text标签结束');
            
            // 移除光标
            removeNovelCursor();
        } else {
            // 继续追加内容（流式显示）
            const availableContent = buffer.split('<')[0];
            
            if (availableContent.length > novelParserState.content.length) {
                const newContent = availableContent.substring(novelParserState.content.length);
                if (newContent) {
                    appendToNovelContent(newContent);
                    novelParserState.content = availableContent;
                }
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
    
    // 先给容器添加最大高度和滚动
    container.style.maxHeight = '600px';
    container.style.overflowY = 'auto';
    container.classList.add('relative');
    
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
                <div class="flex gap-2">
                    <button 
                        onclick="downloadNovel()" 
                        class="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center">
                        <i class="fas fa-download mr-2"></i>下载
                    </button>
                    <button 
                        onclick="regenerateNovel()" 
                        class="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium transition-colors flex items-center">
                        <i class="fas fa-sync-alt mr-2"></i>重新生成
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 插入到容器的父元素中，在容器后面
    if (container.parentNode) {
        container.parentNode.insertBefore(controlsDiv, container.nextSibling);
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