// 大纲生成相关函数

// 大纲解析状态
const outlineParserState = {
    currentTag: null,
    buffer: '',
    outline: {
        open: '',
        build: '',
        turn: '',
        end: ''
    },
    lastProcessedIndex: 0,
    tagBuffer: '',
    plotStarted: false,
    tagsCompleted: {
        open: false,
        build: false,
        turn: false,
        end: false
    }
};

// 生成大纲（首次）
async function generateOutline() {
    console.log('📝 开始生成大纲');
    
    // 清除生成标记
    window.isGeneratingOutline = false;
    
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
    
    // 清空容器并显示加载动画（与脑洞一致的样式）
    const container = document.getElementById('outlineContainer');
    if (container) {
        showOutlineLoading();
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
        showOutlineLoading(true); // true表示重新生成
    }
    
    try {
        // 准备请求数据
        const requestBody = {
            action: 'regenerate',
            idea: ideaData,
            optimization: optimization,
            session_id: getSessionId()
        };
        
        // 如果有优化建议，添加之前的大纲（映射字段名称）
        if (optimization) {
            requestBody.previous_outline = {
                opening: outlineParserState.outline.open,
                development: outlineParserState.outline.build,
                climax: outlineParserState.outline.turn,
                conclusion: outlineParserState.outline.end
            };
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
        open: '',
        build: '',
        turn: '',
        end: ''
    };
    outlineParserState.lastProcessedIndex = 0;
    outlineParserState.tagBuffer = '';
    outlineParserState.plotStarted = false;
    outlineParserState.tagsCompleted = {
        open: false,
        build: false,
        turn: false,
        end: false
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
    
    // 检测<plot>标签开始
    if (!outlineParserState.plotStarted && tagBuffer.endsWith('<plot>')) {
        console.log('📚 检测到plot标签开始');
        outlineParserState.plotStarted = true;
        outlineParserState.buffer = '';
        
        // 隐藏加载动画（带渐隐效果）
        hideOutlineLoading();
        
        // 延迟显示大纲容器，等待渐隐完成
        setTimeout(() => {
            const container = document.getElementById('outlineContainer');
            if (container) {
                container.innerHTML = `
                    <div id="outlineContent" class="space-y-4 fade-in">
                        <!-- 大纲内容将在这里动态生成 -->
                    </div>
                `;
                createEmptyOutlineStructure();
            }
        }, 300);
        return;
    }
    
    // 检测各个部分的标签
    const sections = ['open', 'build', 'turn', 'end'];
    const sectionTitles = {
        open: '起：开篇',
        build: '承：发展',
        turn: '转：高潮',
        end: '合：结局'
    };
    
    for (const section of sections) {
        // 检测标签开始
        if (outlineParserState.plotStarted && tagBuffer.endsWith(`<${section}>`)) {
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
    
    // 检测</plot>标签结束
    if (outlineParserState.plotStarted && tagBuffer.endsWith('</plot>')) {
        console.log('✅ 大纲解析完成');
        outlineParserState.plotStarted = false;
        outlineParserState.buffer = '';
        finalizeOutline();
    }
}

// 创建空的大纲结构
function createEmptyOutlineStructure() {
    const container = document.getElementById('outlineContent');
    if (!container) return;
    
    const sectionInfo = [
        { id: 'open', title: '起：开篇', icon: 'play-circle', color: 'green' },
        { id: 'build', title: '承：发展', icon: 'forward', color: 'blue' },
        { id: 'turn', title: '转：高潮', icon: 'bolt', color: 'yellow' },
        { id: 'end', title: '合：结局', icon: 'flag-checkered', color: 'purple' }
    ];
    
    sectionInfo.forEach(section => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'outline-section bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow';
        sectionDiv.innerHTML = `
            <h4 class="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                <i class="fas fa-${section.icon} text-${section.color}-500 mr-2"></i>
                <span class="title-text">${section.title}</span>
            </h4>
            <div id="${section.id}Content" class="text-gray-600 leading-relaxed relative editable" data-section="${section.id}-content">
                <span class="content-wrapper"></span>
                <span class="typewriter-cursor">|</span>
                <i class="fas fa-edit edit-icon text-blue-500 opacity-0 hover:opacity-100 transition-opacity cursor-pointer absolute top-0 right-0" onclick="enableOutlineEdit('${section.id}', 'content')"></i>
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
    
    // 启用悬停显示编辑图标
    document.querySelectorAll('.outline-section').forEach(section => {
        section.addEventListener('mouseenter', function() {
            this.querySelectorAll('.edit-icon').forEach(icon => {
                icon.style.opacity = '0.6';
            });
        });
        
        section.addEventListener('mouseleave', function() {
            this.querySelectorAll('.edit-icon').forEach(icon => {
                if (!icon.classList.contains('editing')) {
                    icon.style.opacity = '0';
                }
            });
        });
    });
    
    // 保存完整大纲到localStorage
    saveOutlineToStorage();
}

// 显示大纲控制区域
function showOutlineControls() {
    const container = document.getElementById('outlineContainer');
    if (!container) return;
    
    // 检查是否已存在控制区域
    if (document.getElementById('outlineControls')) return;
    
    const controlsDiv = document.createElement('div');
    controlsDiv.id = 'outlineControls';
    controlsDiv.className = 'mt-6';
    controlsDiv.innerHTML = `
        <!-- 优化建议输入区（与脑洞样式完全一致） -->
        <div class="bg-gray-50 rounded-xl p-4">
            <div class="flex flex-col md:flex-row items-center gap-4">
                <div class="relative flex-1 w-full">
                    <input 
                        type="text" 
                        id="outlineOptimizeInput" 
                        class="w-full p-3 pl-10 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
                        placeholder="输入优化建议，比如：需要更多情感冲突...">
                    <i class="fas fa-comment-dots text-gray-400 absolute left-3 top-3.5"></i>
                </div>
                <button 
                    onclick="regenerateOutline()" 
                    class="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium transition-colors flex items-center">
                    <i class="fas fa-sync-alt mr-2"></i>重新生成
                </button>
            </div>
        </div>
    `;
    container.appendChild(controlsDiv);
}

// 启用大纲编辑模式（仅内容编辑）
function enableOutlineEdit(sectionId, type) {
    // 只处理内容编辑，忽略标题编辑请求
    if (type === 'content') {
        // 编辑内容
        const element = document.getElementById(`${sectionId}Content`);
        const wrapper = element.querySelector('.content-wrapper');
        const originalContent = wrapper.textContent;
        
        // 创建文本域
        const textarea = document.createElement('textarea');
        textarea.value = originalContent;
        // 保持与原容器相同的样式：白色背景、圆角、边框、内边距
        textarea.className = 'w-full p-4 bg-white rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none text-gray-600 leading-relaxed';
        // 动态计算行数以适应内容
        const lineCount = originalContent.split('\n').length;
        textarea.rows = Math.max(4, Math.min(lineCount + 1, 10));
        
        wrapper.style.display = 'none';
        element.insertBefore(textarea, wrapper);
        textarea.focus();
        
        // 隐藏编辑图标
        const editIcon = element.querySelector('.edit-icon');
        editIcon.style.display = 'none';
        
        // 创建控制按钮
        const controls = createEditControls();
        element.appendChild(controls);
        
        // 保存功能
        controls.querySelector('.save-btn').onclick = () => {
            const newContent = textarea.value.trim();
            if (newContent) {
                wrapper.textContent = newContent;
                // 更新状态
                outlineParserState.outline[sectionId] = newContent;
                saveOutlineToStorage();
                showSaveHint();
            }
            wrapper.style.display = '';
            textarea.remove();
            editIcon.style.display = '';
            controls.remove();
        };
        
        // 取消功能
        controls.querySelector('.cancel-btn').onclick = () => {
            wrapper.textContent = originalContent;
            wrapper.style.display = '';
            textarea.remove();
            editIcon.style.display = '';
            controls.remove();
        };
        
        // 按键事件
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                controls.querySelector('.cancel-btn').click();
            }
        });
    }
}

// 创建编辑控制按钮
function createEditControls() {
    const controls = document.createElement('div');
    controls.className = 'edit-controls inline-flex gap-2 ml-2';
    controls.innerHTML = `
        <button class="save-btn px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors">
            <i class="fas fa-check"></i>
        </button>
        <button class="cancel-btn px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors">
            <i class="fas fa-times"></i>
        </button>
    `;
    return controls;
}

// 保存大纲到localStorage
function saveOutlineToStorage() {
    if (outlineParserState.outline) {
        localStorage.setItem('currentOutline', JSON.stringify(outlineParserState.outline));
    }
}

// 显示大纲加载动画（完全复用脑洞的样式）
function showOutlineLoading(isRegenerate = false) {
    const container = document.getElementById('outlineContainer');
    if (!container) return;
    
    // 完全使用和脑洞一样的HTML结构和class
    container.innerHTML = `
        <div id="outlineStreamLoading" class="stream-loading">
            <div class="stream-loading-container">
                <div class="stream-loading-animation">
                    <div class="stream-dot"></div>
                    <div class="stream-dot"></div>
                    <div class="stream-dot"></div>
                </div>
                <p class="stream-loading-text">正在连接AI服务...</p>
                <p class="text-sm text-gray-500 mt-2">请稍候，生成大纲中</p>
                <div class="loading-progress-bar">
                    <div class="loading-progress-fill"></div>
                </div>
            </div>
        </div>
    `;
    
    // 10秒后更新提示文字
    setTimeout(() => {
        const loadingText = container.querySelector('.stream-loading-text');
        const subText = loadingText ? loadingText.nextElementSibling : null;
        if (loadingText) {
            loadingText.textContent = 'AI正在深度思考...';
        }
        if (subText) {
            subText.textContent = '生成起承转合中';
        }
    }, 10000);
}

// 隐藏大纲加载动画
function hideOutlineLoading() {
    const loadingDiv = document.getElementById('outlineStreamLoading');
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

// 恢复缓存的大纲内容
function restoreCachedOutline() {
    const cachedOutline = localStorage.getItem('currentOutline');
    if (!cachedOutline) return;
    
    try {
        const outline = JSON.parse(cachedOutline);
        const container = document.getElementById('outlineContainer');
        
        if (container) {
            // 先创建容器结构
            container.innerHTML = `
                <div id="outlineContent" class="space-y-4">
                    <!-- 大纲内容将在这里动态生成 -->
                </div>
            `;
            
            // 创建大纲结构
            createEmptyOutlineStructure();
            
            // 填充缓存的内容
            const sections = ['open', 'build', 'turn', 'end'];
            sections.forEach(section => {
                if (outline[section]) {
                    const contentElement = document.getElementById(`${section}Content`);
                    if (contentElement) {
                        const wrapper = contentElement.querySelector('.content-wrapper');
                        if (wrapper) {
                            wrapper.textContent = outline[section];
                        }
                        // 移除光标
                        const cursor = contentElement.querySelector('.typewriter-cursor');
                        if (cursor) {
                            cursor.remove();
                        }
                    }
                }
            });
            
            // 添加编辑功能
            finalizeOutline();
            
            // 显示控制区域
            showOutlineControls();
            
            // 恢复解析状态
            outlineParserState.outline = outline;
            
            console.log('✅ 大纲内容已从缓存恢复');
        }
    } catch (error) {
        console.error('恢复大纲缓存失败:', error);
    }
}