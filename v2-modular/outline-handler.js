// 大纲生成相关函数

// 大纲解析状态
const outlineParserState = {
    currentTag: null,
    buffer: '',
    outline: {
        opening: '',
        development: '',
        climax: '',
        conclusion: ''
    },
    lastProcessedIndex: 0,
    tagBuffer: '',
    outlineStarted: false,
    tagsCompleted: {
        opening: false,
        development: false,
        climax: false,
        conclusion: false
    }
};

// 生成大纲（首次）
async function generateOutline() {
    console.log('📝 开始生成大纲');
    
    // 获取选中的脑洞
    if (!selectedIdea) {
        console.error('❌ 未选择脑洞');
        showError('请先选择一个脑洞');
        return;
    }
    
    // 获取选中脑洞的完整信息
    const story = parserState.stories.get(String(selectedIdea));
    if (!story) {
        console.error('❌ 未找到选中的脑洞信息');
        showError('脑洞信息错误，请重新选择');
        return;
    }
    
    const ideaData = {
        number: parseInt(selectedIdea),
        title: story.title,
        content: story.content
    };
    
    console.log('📖 选中的脑洞:', ideaData);
    
    // 清空容器并显示加载动画
    const container = document.getElementById('outlineContainer');
    if (container) {
        container.innerHTML = `
            <div class="outline-loading">
                <div class="flex items-center justify-center py-8">
                    <div class="flex gap-2">
                        <div class="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                        <div class="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                        <div class="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                    </div>
                </div>
                <p class="text-center text-gray-600">正在生成故事大纲...</p>
            </div>
        `;
    }
    
    // 禁用按钮
    const generateBtn = document.getElementById('generateNovelBtn');
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    
    try {
        // 调用API生成大纲
        const response = await generateOutlineAPI(ideaData);
        
        // 重置解析状态
        resetOutlineParserState();
        
        // 处理流式响应
        let fullContent = '';
        await processStreamResponse(response, 
            // onChunk回调
            (chunk) => {
                fullContent += chunk;
                processOutlineStreamContent(fullContent);
            },
            // onComplete回调
            () => {
                console.log('✅ 大纲生成完成');
                // 保存大纲到localStorage
                localStorage.setItem('currentOutline', JSON.stringify(outlineParserState.outline));
                
                // 启用下一步按钮
                if (generateBtn) {
                    generateBtn.disabled = false;
                    generateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
                
                // 显示重新生成控制区
                showOutlineControls();
            }
        );
    } catch (error) {
        console.error('❌ 大纲生成失败:', error);
        showError('大纲生成失败，请稍后重试');
        
        // 恢复按钮状态
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

// 重新生成大纲
async function regenerateOutline() {
    const optimizeInput = document.getElementById('outlineOptimizeInput');
    const optimization = optimizeInput ? optimizeInput.value.trim() : null;
    
    console.log('🔄 重新生成大纲');
    
    // 获取选中的脑洞信息
    const story = parserState.stories.get(String(selectedIdea));
    if (!story) {
        console.error('❌ 未找到选中的脑洞信息');
        showError('脑洞信息错误');
        return;
    }
    
    const ideaData = {
        number: parseInt(selectedIdea),
        title: story.title,
        content: story.content
    };
    
    // 清空容器并显示加载动画
    const container = document.getElementById('outlineContainer');
    if (container) {
        container.innerHTML = `
            <div class="outline-loading">
                <div class="flex items-center justify-center py-8">
                    <div class="flex gap-2">
                        <div class="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                        <div class="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                        <div class="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                    </div>
                </div>
                <p class="text-center text-gray-600">正在重新生成大纲...</p>
            </div>
        `;
    }
    
    try {
        // 准备请求数据
        const requestBody = {
            action: 'regenerate',
            idea: ideaData,
            optimization: optimization,
            session_id: getSessionId()
        };
        
        // 如果有优化建议，添加之前的大纲
        if (optimization) {
            requestBody.previous_outline = outlineParserState.outline;
        }
        
        console.log('🔄 发送重新生成大纲请求:', requestBody);
        
        const response = await fetch(API_CONFIG.outline, {
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
        resetOutlineParserState();
        
        // 处理流式响应
        let fullContent = '';
        await processStreamResponse(response, 
            // onChunk回调
            (chunk) => {
                fullContent += chunk;
                processOutlineStreamContent(fullContent);
            },
            // onComplete回调
            () => {
                console.log('✅ 大纲重新生成完成');
                // 保存大纲到localStorage
                localStorage.setItem('currentOutline', JSON.stringify(outlineParserState.outline));
                
                // 清空优化输入框
                if (optimizeInput) {
                    optimizeInput.value = '';
                }
            }
        );
    } catch (error) {
        console.error('❌ 大纲重新生成失败:', error);
        showError('大纲重新生成失败，请稍后重试');
    }
}

// 重置大纲解析状态
function resetOutlineParserState() {
    outlineParserState.currentTag = null;
    outlineParserState.buffer = '';
    outlineParserState.outline = {
        opening: '',
        development: '',
        climax: '',
        conclusion: ''
    };
    outlineParserState.lastProcessedIndex = 0;
    outlineParserState.tagBuffer = '';
    outlineParserState.outlineStarted = false;
    outlineParserState.tagsCompleted = {
        opening: false,
        development: false,
        climax: false,
        conclusion: false
    };
}

// 处理大纲流式内容
function processOutlineStreamContent(fullContent) {
    const newContent = fullContent.substring(outlineParserState.lastProcessedIndex);
    if (!newContent) return;
    
    for (let i = 0; i < newContent.length; i++) {
        const char = newContent[i];
        outlineParserState.buffer += char;
        outlineParserState.tagBuffer += char;
        
        // 保持tagBuffer在合理长度
        if (outlineParserState.tagBuffer.length > 30) {
            outlineParserState.tagBuffer = outlineParserState.tagBuffer.substring(1);
        }
        
        detectAndProcessOutlineXML();
    }
    
    outlineParserState.lastProcessedIndex = fullContent.length;
}

// 检测并处理大纲XML格式
function detectAndProcessOutlineXML() {
    const buffer = outlineParserState.buffer;
    const tagBuffer = outlineParserState.tagBuffer;
    
    // 检测<outline>标签开始
    if (!outlineParserState.outlineStarted && tagBuffer.endsWith('<outline>')) {
        console.log('📚 检测到outline标签开始');
        outlineParserState.outlineStarted = true;
        outlineParserState.buffer = '';
        
        // 隐藏加载动画，显示大纲容器
        const container = document.getElementById('outlineContainer');
        if (container) {
            container.innerHTML = `
                <div id="outlineContent" class="space-y-4">
                    <!-- 大纲内容将在这里动态生成 -->
                </div>
            `;
        }
        createEmptyOutlineStructure();
        return;
    }
    
    // 检测各个部分的标签
    const sections = ['opening', 'development', 'climax', 'conclusion'];
    const sectionTitles = {
        opening: '起：开篇',
        development: '承：发展',
        climax: '转：高潮',
        conclusion: '合：结局'
    };
    
    for (const section of sections) {
        // 检测标签开始
        if (outlineParserState.outlineStarted && tagBuffer.endsWith(`<${section}>`)) {
            console.log(`📝 ${sectionTitles[section]}开始`);
            outlineParserState.currentTag = section;
            outlineParserState.buffer = '';
            return;
        }
        
        // 处理标签内容
        if (outlineParserState.currentTag === section && !outlineParserState.tagsCompleted[section]) {
            if (buffer.includes(`</${section}>`)) {
                const content = buffer.substring(0, buffer.indexOf(`</${section}>`));
                if (content.length > outlineParserState.outline[section].length) {
                    const newChars = content.substring(outlineParserState.outline[section].length);
                    appendToOutlineSection(section, newChars);
                    outlineParserState.outline[section] = content;
                }
                outlineParserState.tagsCompleted[section] = true;
                outlineParserState.currentTag = null;
                outlineParserState.buffer = '';
                console.log(`✅ ${sectionTitles[section]}完成`);
                
                // 移除该部分的光标
                removeSectionCursor(section);
            } else {
                if (buffer.length > outlineParserState.outline[section].length && !buffer.includes('<')) {
                    const newChars = buffer.substring(outlineParserState.outline[section].length);
                    appendToOutlineSection(section, newChars);
                    outlineParserState.outline[section] = buffer;
                }
            }
        }
    }
    
    // 检测</outline>标签结束
    if (outlineParserState.outlineStarted && tagBuffer.endsWith('</outline>')) {
        console.log('✅ 大纲解析完成');
        outlineParserState.outlineStarted = false;
        outlineParserState.buffer = '';
        finalizeOutline();
    }
}

// 创建空的大纲结构
function createEmptyOutlineStructure() {
    const container = document.getElementById('outlineContent');
    if (!container) return;
    
    const sectionInfo = [
        { id: 'opening', title: '起：开篇', icon: 'play-circle', color: 'green' },
        { id: 'development', title: '承：发展', icon: 'forward', color: 'blue' },
        { id: 'climax', title: '转：高潮', icon: 'bolt', color: 'yellow' },
        { id: 'conclusion', title: '合：结局', icon: 'flag-checkered', color: 'purple' }
    ];
    
    sectionInfo.forEach(section => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'outline-section bg-white rounded-lg p-4 shadow-sm border border-gray-200';
        sectionDiv.innerHTML = `
            <h4 class="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                <i class="fas fa-${section.icon} text-${section.color}-500 mr-2"></i>
                ${section.title}
            </h4>
            <div id="${section.id}Content" class="text-gray-600 leading-relaxed editable-section">
                <span class="content-wrapper"></span>
                <span class="typewriter-cursor">|</span>
            </div>
        `;
        container.appendChild(sectionDiv);
    });
}

// 追加内容到大纲部分
function appendToOutlineSection(section, newChars) {
    const contentElement = document.getElementById(`${section}Content`);
    if (!contentElement) return;
    
    const wrapper = contentElement.querySelector('.content-wrapper');
    if (wrapper) {
        wrapper.textContent += newChars;
    }
}

// 移除部分的光标
function removeSectionCursor(section) {
    const contentElement = document.getElementById(`${section}Content`);
    if (!contentElement) return;
    
    const cursor = contentElement.querySelector('.typewriter-cursor');
    if (cursor) {
        cursor.remove();
    }
}

// 完成大纲
function finalizeOutline() {
    // 确保所有光标都被移除
    document.querySelectorAll('.typewriter-cursor').forEach(cursor => {
        cursor.remove();
    });
    
    // 添加编辑功能
    document.querySelectorAll('.editable-section').forEach(section => {
        section.classList.add('cursor-pointer', 'hover:bg-gray-50', 'transition-colors', 'p-2', 'rounded');
        section.setAttribute('contenteditable', 'false');
        
        // 添加编辑图标
        const editIcon = document.createElement('span');
        editIcon.className = 'edit-icon ml-2';
        editIcon.innerHTML = '<i class="fas fa-edit"></i>';
        editIcon.onclick = () => enableEditMode(section);
        section.appendChild(editIcon);
    });
}

// 显示大纲控制区域
function showOutlineControls() {
    const container = document.getElementById('outlineContainer');
    if (!container) return;
    
    // 检查是否已存在控制区域
    if (document.getElementById('outlineControls')) return;
    
    const controlsDiv = document.createElement('div');
    controlsDiv.id = 'outlineControls';
    controlsDiv.className = 'mt-6 p-4 bg-gray-50 rounded-lg';
    controlsDiv.innerHTML = `
        <div class="flex items-center gap-4">
            <input 
                type="text" 
                id="outlineOptimizeInput" 
                class="flex-1 p-2 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200" 
                placeholder="输入优化建议（可选）">
            <button 
                onclick="regenerateOutline()" 
                class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors">
                <i class="fas fa-sync-alt mr-2"></i>重新生成
            </button>
        </div>
    `;
    container.appendChild(controlsDiv);
}

// 启用编辑模式
function enableEditMode(element) {
    element.setAttribute('contenteditable', 'true');
    element.focus();
    
    // 创建保存和取消按钮
    const controls = document.createElement('div');
    controls.className = 'edit-controls mt-2 flex gap-2';
    controls.innerHTML = `
        <button class="save-btn px-3 py-1 bg-green-500 text-white rounded text-sm">保存</button>
        <button class="cancel-btn px-3 py-1 bg-red-500 text-white rounded text-sm">取消</button>
    `;
    
    element.parentNode.appendChild(controls);
    
    // 保存原始内容
    const originalContent = element.querySelector('.content-wrapper').textContent;
    
    // 绑定事件
    controls.querySelector('.save-btn').onclick = () => {
        const newContent = element.querySelector('.content-wrapper').textContent;
        const sectionId = element.id.replace('Content', '');
        outlineParserState.outline[sectionId] = newContent;
        localStorage.setItem('currentOutline', JSON.stringify(outlineParserState.outline));
        element.setAttribute('contenteditable', 'false');
        controls.remove();
    };
    
    controls.querySelector('.cancel-btn').onclick = () => {
        element.querySelector('.content-wrapper').textContent = originalContent;
        element.setAttribute('contenteditable', 'false');
        controls.remove();
    };
}