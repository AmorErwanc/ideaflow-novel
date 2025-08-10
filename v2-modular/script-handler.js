// 脚本生成相关函数

// 脚本解析状态
const scriptParserState = {
    buffer: '',
    content: '',
    lastProcessedIndex: 0,
    tagBuffer: '',
    scriptStarted: false,
    contentStarted: false,
    isComplete: false
};

// 生成脚本（首次）
async function generateScript() {
    console.log('🎬 开始生成脚本');
    
    // 立即清空容器，防止旧内容闪现
    const container = document.getElementById('scriptContainer');
    if (container) {
        container.innerHTML = '';
    }
    
    // 生成脚本时不需要清理后续数据（因为脚本是最后一步）
    
    // 获取小说内容
    const novelContent = novelParserState.content || localStorage.getItem('currentNovel');
    if (!novelContent) {
        console.error('❌ 未找到小说内容');
        showError('请先生成小说内容');
        return;
    }
    
    console.log('📝 使用小说内容生成脚本');
    
    // 显示加载动画
    if (container) {
        showScriptLoading();
        // 重置滚动管理器
        const scrollManager = getScrollManager('scriptContainer');
        if (scrollManager) {
            scrollManager.reset();
        }
    }
    
    // 禁用完成按钮
    const completeBtn = document.getElementById('completeWorkflowBtn');
    if (completeBtn) {
        completeBtn.disabled = true;
        completeBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    
    try {
        // 调用API生成脚本
        const response = await generateScriptAPI(novelContent);
        
        // 重置解析状态
        resetScriptParserState();
        
        // 处理流式响应
        let fullContent = '';
        await processStreamResponse(response, 
            // onChunk回调
            (chunk) => {
                fullContent += chunk;
                processScriptStreamContent(fullContent);
            },
            // onComplete回调
            () => {
                console.log('✅ 脚本生成完成');
                // 保存脚本到localStorage
                localStorage.setItem('currentScript', scriptParserState.content);
                
                // 更新工作流状态 - 脚本生成完成
                if (typeof workflowState !== 'undefined') {
                    workflowState.steps[5].completed = true;
                    workflowState.steps[5].hasData = true;
                    console.log('✅ 脚本生成完成，更新状态');
                }
                
                // 清除生成标记
                window.isGeneratingScript = false;
                
                // 启用完成按钮
                if (completeBtn) {
                    completeBtn.disabled = false;
                    completeBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
                
                // 显示重新生成控制区
                showScriptControls();
            }
        );
    } catch (error) {
        console.error('❌ 脚本生成失败:', error);
        showError('脚本生成失败，请稍后重试');
        
        // 恢复按钮状态
        if (completeBtn) {
            completeBtn.disabled = false;
            completeBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

// 重新生成脚本
async function regenerateScript() {
    const optimizeInput = document.getElementById('scriptOptimizeInput');
    const optimization = optimizeInput ? optimizeInput.value.trim() : null;
    
    console.log('🔄 重新生成脚本');
    
    // 立即清空容器，防止旧内容闪现
    const container = document.getElementById('scriptContainer');
    if (container) {
        container.innerHTML = '';
    }
    
    // 获取小说内容
    const novelContent = novelParserState.content || localStorage.getItem('currentNovel');
    if (!novelContent) {
        console.error('❌ 未找到小说内容');
        showError('小说内容错误');
        return;
    }
    
    // 显示加载动画
    if (container) {
        showScriptLoading(true); // true表示重新生成
    }
    
    try {
        // 准备请求数据
        const requestBody = {
            action: 'regenerate',
            novel_content: novelContent,
            optimization: optimization,
            session_id: getSessionId()
        };
        
        console.log('🔄 发送重新生成脚本请求');
        
        const response = await fetch(API_CONFIG.script, {
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
        resetScriptParserState();
        
        // 处理流式响应
        let fullContent = '';
        await processStreamResponse(response, 
            // onChunk回调
            (chunk) => {
                fullContent += chunk;
                processScriptStreamContent(fullContent);
            },
            // onComplete回调
            () => {
                console.log('✅ 脚本重新生成完成');
                // 保存脚本到localStorage
                localStorage.setItem('currentScript', scriptParserState.content);
                
                // 清空优化输入框
                if (optimizeInput) {
                    optimizeInput.value = '';
                }
            }
        );
    } catch (error) {
        console.error('❌ 脚本重新生成失败:', error);
        showError('脚本重新生成失败，请稍后重试');
    }
}

// 重置脚本解析状态
function resetScriptParserState() {
    scriptParserState.buffer = '';
    scriptParserState.content = '';
    scriptParserState.lastProcessedIndex = 0;
    scriptParserState.tagBuffer = '';
    scriptParserState.scriptStarted = false;
    scriptParserState.contentStarted = false;
    scriptParserState.isComplete = false;
}

// 处理脚本流式内容
function processScriptStreamContent(fullContent) {
    const newContent = fullContent.substring(scriptParserState.lastProcessedIndex);
    if (!newContent) return;
    
    // 输出调试信息
    if (newContent.length > 0 && scriptParserState.lastProcessedIndex === 0) {
        console.log('🔍 首次接收到脚本内容:', newContent.substring(0, 100));
    }
    
    for (let i = 0; i < newContent.length; i++) {
        const char = newContent[i];
        scriptParserState.buffer += char;
        scriptParserState.tagBuffer += char;
        
        // 保持tagBuffer在合理长度
        if (scriptParserState.tagBuffer.length > 30) {
            scriptParserState.tagBuffer = scriptParserState.tagBuffer.substring(1);
        }
        
        detectAndProcessScriptXML();
    }
    
    scriptParserState.lastProcessedIndex = fullContent.length;
}

// 检测并处理脚本XML格式
function detectAndProcessScriptXML() {
    const buffer = scriptParserState.buffer;
    const tagBuffer = scriptParserState.tagBuffer;
    
    // 检测<script>标签开始
    if (!scriptParserState.scriptStarted && tagBuffer.endsWith('<script>')) {
        console.log('🎬 检测到script标签开始');
        scriptParserState.scriptStarted = true;
        scriptParserState.buffer = '';
        return;
    }
    
    // 检测<content>标签开始
    if (scriptParserState.scriptStarted && !scriptParserState.contentStarted && tagBuffer.endsWith('<content>')) {
        console.log('📝 检测到content标签开始');
        scriptParserState.contentStarted = true;
        // 只移除标签本身，保留标签后的内容
        const contentTagIndex = scriptParserState.buffer.indexOf('<content>');
        if (contentTagIndex !== -1) {
            scriptParserState.buffer = scriptParserState.buffer.substring(contentTagIndex + 9); // 跳过'<content>'
        } else {
            // 如果找不到完整标签（可能被分片），清空buffer
            scriptParserState.buffer = '';
        }
        
        // 隐藏加载动画
        hideScriptLoading();
        
        // 延迟显示脚本容器
        setTimeout(() => {
            const container = document.getElementById('scriptContainer');
            if (container) {
                container.innerHTML = `
                    <div id="scriptContent" class="prose prose-lg max-w-none">
                        <div id="scriptText" class="script-display">
                            <pre class="content-wrapper"></pre>
                            <span class="typewriter-cursor">|</span>
                        </div>
                    </div>
                `;
                
                // 使用getScrollManager获取或创建，避免重复
                const scrollManager = getScrollManager('scriptContainer');
                if (scrollManager) {
                    scrollManager.reset();  // 只重置状态，不重新创建
                }
            }
        }, 300);
        return;
    }
    
    // 处理content标签内容
    if (scriptParserState.contentStarted && !scriptParserState.isComplete) {
        if (buffer.includes('</content>')) {
            // 提取最终内容
            const content = buffer.substring(0, buffer.indexOf('</content>'));
            if (content.length > scriptParserState.content.length) {
                const newChars = content.substring(scriptParserState.content.length);
                appendToScriptContent(newChars);
                scriptParserState.content = content;
            }
            
            // 标记content结束
            scriptParserState.contentStarted = false;
            scriptParserState.buffer = '';
            console.log('✅ content标签结束');
            
            // 移除光标
            removeScriptCursor();
        } else {
            // 继续追加内容
            if (buffer.length > scriptParserState.content.length && !buffer.includes('<')) {
                const newChars = buffer.substring(scriptParserState.content.length);
                appendToScriptContent(newChars);
                scriptParserState.content = buffer;
            }
        }
    }
    
    // 检测</script>标签结束
    if (scriptParserState.scriptStarted && tagBuffer.endsWith('</script>')) {
        console.log('✅ 脚本解析完成');
        scriptParserState.scriptStarted = false;
        scriptParserState.isComplete = true;
        scriptParserState.buffer = '';
        finalizeScript();
    }
}

// 追加内容到脚本
function appendToScriptContent(newChars) {
    const scriptText = document.getElementById('scriptText');
    if (!scriptText) return;
    
    const wrapper = scriptText.querySelector('.content-wrapper');
    if (wrapper) {
        // 直接追加文本
        wrapper.textContent += newChars;
        
        // 使用节流，每100ms最多触发一次滚动
        const now = Date.now();
        if (!window.lastScriptScrollTime || now - window.lastScriptScrollTime > 100) {
            const scrollManager = getScrollManager('scriptContainer');
            if (scrollManager) {
                scrollManager.scrollToBottom();
            }
            window.lastScriptScrollTime = now;
        }
    }
}

// 移除脚本光标
function removeScriptCursor() {
    const scriptText = document.getElementById('scriptText');
    if (!scriptText) return;
    
    const cursor = scriptText.querySelector('.typewriter-cursor');
    if (cursor) {
        cursor.remove();
    }
}

// 完成脚本
function finalizeScript() {
    // 确保光标被移除
    removeScriptCursor();
    
    // 格式化脚本显示
    formatScriptDisplay();
}

// 格式化脚本显示
function formatScriptDisplay() {
    const scriptText = document.getElementById('scriptText');
    if (!scriptText) return;
    
    const wrapper = scriptText.querySelector('.content-wrapper');
    if (!wrapper) return;
    
    // 将内容按行分割并格式化
    const content = wrapper.textContent;
    const lines = content.split('\n');
    let formattedHTML = '';
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) {
            formattedHTML += '<br>';
            return;
        }
        
        // 根据内容类型添加不同的样式
        if (line.startsWith('标题：')) {
            formattedHTML += `<div class="script-title">${line}</div>`;
        } else if (line.startsWith('背景介绍')) {
            formattedHTML += `<div class="script-background">${line}</div>`;
        } else if (line.startsWith('互动选项')) {
            formattedHTML += `<div class="script-option">${line}</div>`;
        } else if (line.startsWith('旁白')) {
            formattedHTML += `<div class="script-narration">${line}</div>`;
        } else if (line.includes(',') && line.indexOf(',') < 20) {
            // 可能是角色对话
            const [character, dialogue] = line.split(',', 2);
            formattedHTML += `<div class="script-dialogue"><span class="character-name">${character}:</span> ${dialogue}</div>`;
        } else if (line.startsWith('---')) {
            formattedHTML += `<hr class="script-divider">`;
        } else {
            formattedHTML += `<div class="script-line">${line}</div>`;
        }
    });
    
    // 更新显示
    scriptText.innerHTML = `<div class="formatted-script">${formattedHTML}</div>`;
}

// 显示脚本控制区域
function showScriptControls() {
    const container = document.getElementById('scriptContainer');
    if (!container) return;
    
    // 检查是否已存在控制区域
    if (document.getElementById('scriptControls')) return;
    
    const controlsDiv = document.createElement('div');
    controlsDiv.id = 'scriptControls';
    controlsDiv.className = 'mt-6';
    controlsDiv.innerHTML = `
        <!-- 优化建议输入区 -->
        <div class="bg-gray-50 rounded-xl p-4">
            <div class="flex flex-col md:flex-row items-center gap-4">
                <div class="relative flex-1 w-full">
                    <input 
                        type="text" 
                        id="scriptOptimizeInput" 
                        class="w-full p-3 pl-10 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
                        placeholder="输入优化建议，比如：增加更多对话内容...">
                    <i class="fas fa-comment-dots text-gray-400 absolute left-3 top-3.5"></i>
                </div>
                <button 
                    onclick="regenerateScript()" 
                    class="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium transition-colors flex items-center">
                    <i class="fas fa-sync-alt mr-2"></i>重新生成
                </button>
            </div>
        </div>
    `;
    
    // 插入到内容之后
    const scriptContent = document.getElementById('scriptContent');
    if (scriptContent && scriptContent.parentNode) {
        scriptContent.parentNode.insertBefore(controlsDiv, scriptContent.nextSibling);
    }
}

// 显示脚本加载动画（复用脑洞样式）
function showScriptLoading(isRegenerate = false) {
    const container = document.getElementById('scriptContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div id="scriptStreamLoading" class="stream-loading">
            <div class="stream-loading-container">
                <div class="stream-loading-animation">
                    <div class="stream-dot"></div>
                    <div class="stream-dot"></div>
                    <div class="stream-dot"></div>
                </div>
                <p class="stream-loading-text">正在连接AI服务...</p>
                <p class="text-sm text-gray-500 mt-2">请稍候，AI正在生成脚本</p>
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
            loadingText.textContent = 'AI正在编写脚本...';
        }
        if (subText) {
            subText.textContent = '创作互动剧本中';
        }
    }, 5000);
    
    setTimeout(() => {
        const loadingText = container.querySelector('.stream-loading-text');
        const subText = loadingText ? loadingText.nextElementSibling : null;
        if (loadingText) {
            loadingText.textContent = 'AI正在优化对话...';
        }
        if (subText) {
            subText.textContent = '即将完成创作';
        }
    }, 15000);
}

// 隐藏脚本加载动画
function hideScriptLoading() {
    const loadingDiv = document.getElementById('scriptStreamLoading');
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

// 完成工作流
function completeWorkflow() {
    console.log('🎉 工作流完成！');
    
    // 显示成功消息
    const message = document.createElement('div');
    message.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-8 py-4 rounded-lg shadow-2xl z-50 text-lg font-semibold';
    message.innerHTML = '<i class="fas fa-check-circle mr-2"></i>创作完成！';
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
}