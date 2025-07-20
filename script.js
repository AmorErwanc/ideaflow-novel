// AI小说创作平台脚本文件

document.addEventListener('DOMContentLoaded', function() {
    // 全局变量存储webhook地址
    let firstWaithook = '';
    let secondWaithook = '';
    let thirdWaithook = '';
    let selectedIdeaNumber = null;
    let currentIdeas = [];
    
    // 流程状态管理
    let workflowState = {
        ideasGenerated: false,    // 脑洞是否已生成
        outlineGenerated: false,  // 大纲是否已生成
        scriptGenerated: false,   // 脚本是否已生成
        novelGenerated: false     // 小说正文是否已生成
    };

    // Tab切换逻辑
    const quickGenTab = document.getElementById('quickGenTab');
    const customTab = document.getElementById('customTab');
    const quickGenContent = document.getElementById('quickGenContent');
    const customContent = document.getElementById('customContent');
    
    function switchTab(activeTab, activeContent, inactiveTab, inactiveContent) {
        // 更新tab按钮状态
        activeTab.classList.add('active');
        activeTab.classList.remove('text-gray-500');
        activeTab.classList.add('text-blue-600', 'border-blue-500');
        
        inactiveTab.classList.remove('active');
        inactiveTab.classList.remove('text-blue-600', 'border-blue-500');
        inactiveTab.classList.add('text-gray-500');
        inactiveTab.style.borderBottomColor = 'transparent';
        
        // 切换内容区域
        inactiveContent.classList.add('hidden');
        activeContent.classList.remove('hidden');
    }
    
    quickGenTab.addEventListener('click', function() {
        switchTab(quickGenTab, quickGenContent, customTab, customContent);
    });
    
    customTab.addEventListener('click', function() {
        switchTab(customTab, customContent, quickGenTab, quickGenContent);
    });
    
    // 脑洞数量滑块
    const ideaCountSlider = document.getElementById('ideaCount');
    const ideaCountValue = document.getElementById('ideaCountValue');
    ideaCountSlider.addEventListener('input', function() {
        ideaCountValue.textContent = this.value;
    });

    // API调用函数
    async function callAPI(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.text();
            try {
                return JSON.parse(result);
            } catch {
                return result; // 返回纯文本（用于第三个API）
            }
        } catch (error) {
            console.error('API调用失败:', error);
            throw error;
        }
    }

    // 显示错误信息
    function showError(message) {
        alert('错误: ' + message);
    }

    // 工作流重置功能
    function resetWorkflow() {
        // 重置工作流状态
        workflowState = {
            ideasGenerated: false,
            outlineGenerated: false,
            novelGenerated: false,
            scriptGenerated: false
        };
        
        // 重置全局变量
        firstWaithook = '';
        secondWaithook = '';
        thirdWaithook = '';
        selectedIdeaNumber = null;
        currentIdeas = [];
        
        // 清空所有显示区域
        const ideasContainer = document.getElementById('ideasContainer');
        const outlineSection = document.getElementById('outlineSection');
        const novelSection = document.getElementById('novelSection');
        const scriptSection = document.getElementById('scriptSection');
        const outlineContent = document.getElementById('outlineContent');
        const novelContent = document.getElementById('novelContent');
        const scriptContent = document.getElementById('scriptContent');
        
        if (ideasContainer) ideasContainer.innerHTML = '';
        if (outlineContent) outlineContent.innerHTML = '';
        if (novelContent) novelContent.innerHTML = '';
        if (scriptContent) scriptContent.innerHTML = '';
        
        // 隐藏所有结果区域
        if (outlineSection) outlineSection.classList.add('hidden');
        if (novelSection) novelSection.classList.add('hidden');
        if (scriptSection) scriptSection.classList.add('hidden');
        
        // 重置输入框
        const novelPrompt = document.getElementById('novelPrompt');
        const optimizeIdeasInput = document.getElementById('optimizeIdeasInput');
        const optimizeOutlineInput = document.getElementById('optimizeOutlineInput');
        const optimizeNovelInput = document.getElementById('optimizeNovelInput');
        
        if (optimizeIdeasInput) optimizeIdeasInput.value = '';
        if (optimizeOutlineInput) optimizeOutlineInput.value = '';
        if (optimizeNovelInput) optimizeNovelInput.value = '';
        
        // 重置按钮状态
        updateButtonStates();
        
        console.log('工作流已重置');
    }

    // 检查按钮是否应该被永久禁用
    function shouldButtonBeDisabled(buttonId) {
        // 快速生成和生成脑洞按钮永远不被禁用，作为重置功能
        if (['quickGenerateBtn', 'generateIdeasBtn'].includes(buttonId)) {
            return false;
        }
        
        // Tab按钮在任何流程进行中都禁用
        if (['quickGenTab', 'customTab'].includes(buttonId)) {
            return workflowState.ideasGenerated || workflowState.outlineGenerated || workflowState.scriptGenerated || workflowState.novelGenerated;
        }
        
        if (workflowState.scriptGenerated) {
            // 脚本生成完成，除了下载按钮，其他都禁用
            return !['downloadScriptBtn', 'downloadNovelBtn'].includes(buttonId);
        }
        if (workflowState.novelGenerated) {
            // 小说正文生成完成，除了小说正文区域和生成互动脚本的按钮，其他都禁用
            return !['downloadNovelBtn', 'regenerateNovelBtn', 'regenerateNovelBtn2', 'generateScriptBtn'].includes(buttonId);
        }
        if (workflowState.outlineGenerated) {
            // 大纲生成完成，禁用脑洞相关按钮（除了快速生成和生成脑洞）
            return ['regenerateIdeasBtn', 'generateOutlineBtn'].includes(buttonId);
        }
        if (workflowState.ideasGenerated) {
            // 脑洞生成完成，不再禁用生成脑洞的按钮（已在上面处理）
            return false;
        }
        return false;
    }

    // 增强的按钮状态管理类型
    const ButtonStateType = {
        NORMAL: 'normal',
        LOADING: 'loading',
        WORKFLOW_DISABLED: 'workflow-disabled',
        PERMANENTLY_DISABLED: 'permanently-disabled'
    };

    // 按钮原始文本映射
    const buttonTextMap = {
        'quickGenerateBtn': '快速生成',
        'generateIdeasBtn': '生成脑洞',
        'regenerateIdeasBtn': '<i class="fas fa-sync-alt mr-2"></i>重新生成',
        'generateOutlineBtn': '<i class="fas fa-list-ul mr-2"></i>生成大纲',
        'regenerateOutlineBtn': '<i class="fas fa-sync-alt mr-2"></i>重新生成',
        'generateScriptBtn': '<i class="fas fa-comments mr-2"></i>生成互动脚本',
        'downloadScriptBtn': '<i class="fas fa-download mr-2"></i>下载',
        'generateNovelBtn': '<i class="fas fa-book mr-2"></i>生成小说正文',
        'regenerateNovelBtn': '<i class="fas fa-sync-alt mr-2"></i>重新生成',
        'regenerateNovelBtn2': '<i class="fas fa-sync-alt mr-2"></i>重新生成',
        'downloadNovelBtn': '<i class="fas fa-download mr-2"></i>下载'
    };

    // 统一的按钮状态管理函数
    function setButtonState(buttonId, state, options = {}) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        const btnText = button.querySelector('.btn-text');
        const spinner = button.querySelector('.loading-spinner');
        const { loadingText = '生成中...', disabledReason = '' } = options;
        
        // 清除所有状态类
        button.classList.remove('btn-loading', 'workflow-disabled');
        
        // 定义按钮组关系
        const allOperationButtons = ['quickGenerateBtn', 'generateIdeasBtn', 'regenerateIdeasBtn', 'generateOutlineBtn', 'regenerateOutlineBtn', 'generateScriptBtn', 'generateNovelBtn', 'regenerateNovelBtn', 'regenerateNovelBtn2'];
        const allTabButtons = ['quickGenTab', 'customTab'];
        
        const buttonGroups = {
            'quickGenerateBtn': allOperationButtons.filter(id => id !== 'quickGenerateBtn').concat(allTabButtons),
            'generateIdeasBtn': allOperationButtons.filter(id => id !== 'generateIdeasBtn').concat(allTabButtons),
            'regenerateIdeasBtn': allOperationButtons.filter(id => id !== 'regenerateIdeasBtn').concat(allTabButtons),
            'generateOutlineBtn': allOperationButtons.filter(id => id !== 'generateOutlineBtn').concat(allTabButtons),
            'regenerateOutlineBtn': allOperationButtons.filter(id => id !== 'regenerateOutlineBtn').concat(allTabButtons),
            'generateScriptBtn': allOperationButtons.filter(id => id !== 'generateScriptBtn').concat(allTabButtons),
            'generateNovelBtn': allOperationButtons.filter(id => id !== 'generateNovelBtn').concat(allTabButtons),
            'regenerateNovelBtn': allOperationButtons.filter(id => id !== 'regenerateNovelBtn' && id !== 'regenerateNovelBtn2' && id !== 'downloadNovelBtn').concat(allTabButtons),
            'regenerateNovelBtn2': allOperationButtons.filter(id => id !== 'regenerateNovelBtn' && id !== 'regenerateNovelBtn2' && id !== 'downloadNovelBtn').concat(allTabButtons),
            'downloadScriptBtn': [],
            'downloadNovelBtn': []
        };
        
        switch (state) {
            case ButtonStateType.LOADING:
                button.disabled = true;
                button.classList.add('btn-loading');
                if (btnText) btnText.textContent = loadingText;
                if (spinner) spinner.classList.remove('hidden');
                
                // 设置相关按钮为工作流禁用状态
                const relatedButtons = buttonGroups[buttonId] || [];
                relatedButtons.forEach(relatedButtonId => {
                    const relatedButton = document.getElementById(relatedButtonId);
                    if (relatedButton) {
                        relatedButton.disabled = true;
                        relatedButton.classList.add('workflow-disabled');
                    }
                });
                break;
                
            case ButtonStateType.WORKFLOW_DISABLED:
                button.disabled = true;
                button.classList.add('workflow-disabled');
                if (spinner) spinner.classList.add('hidden');
                if (disabledReason) {
                    button.title = disabledReason;
                }
                break;
                
            case ButtonStateType.PERMANENTLY_DISABLED:
                button.disabled = true;
                if (spinner) spinner.classList.add('hidden');
                if (disabledReason) {
                    button.title = disabledReason;
                }
                break;
                
            case ButtonStateType.NORMAL:
                if (!shouldButtonBeDisabled(buttonId)) {
                    button.disabled = false;
                    button.title = '';
                }
                if (spinner) spinner.classList.add('hidden');
                
                // 恢复原始文本
                if (btnText && buttonTextMap[buttonId]) {
                    btnText.innerHTML = buttonTextMap[buttonId];
                }
                
                // 恢复相关按钮状态
                if (buttonGroups[buttonId]) {
                    buttonGroups[buttonId].forEach(relatedButtonId => {
                        const relatedButton = document.getElementById(relatedButtonId);
                        if (relatedButton && !shouldButtonBeDisabled(relatedButtonId)) {
                            relatedButton.disabled = false;
                            relatedButton.classList.remove('workflow-disabled');
                            relatedButton.title = '';
                        }
                    });
                }
                break;
        }
    }

    // 兼容旧函数名
    function setButtonLoading(buttonId, isLoading, loadingText = '生成中...') {
        if (isLoading) {
            setButtonState(buttonId, ButtonStateType.LOADING, { loadingText });
        } else {
            setButtonState(buttonId, ButtonStateType.NORMAL);
        }
    }

    // 增强的流程状态按钮管理函数
    function updateButtonStates() {
        // 获取所有需要管理的按钮
        const allButtons = ['quickGenerateBtn', 'generateIdeasBtn', 'regenerateIdeasBtn', 'generateOutlineBtn', 'regenerateOutlineBtn', 'generateScriptBtn', 'generateNovelBtn', 'regenerateNovelBtn', 'regenerateNovelBtn2', 'quickGenTab', 'customTab'];
        
        // 根据流程状态设置按钮状态
        allButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button && !button.classList.contains('btn-loading')) {
                if (shouldButtonBeDisabled(buttonId)) {
                    // 根据工作流状态决定禁用类型
                    const reason = getDisabledReason(buttonId);
                    if (reason.isPermanent) {
                        setButtonState(buttonId, ButtonStateType.PERMANENTLY_DISABLED, { disabledReason: reason.message });
                    } else {
                        setButtonState(buttonId, ButtonStateType.WORKFLOW_DISABLED, { disabledReason: reason.message });
                    }
                } else {
                    setButtonState(buttonId, ButtonStateType.NORMAL);
                }
            }
        });
    }

    // 获取按钮禁用原因
    function getDisabledReason(buttonId) {
        // Tab按钮在任何流程进行中都禁用
        if (['quickGenTab', 'customTab'].includes(buttonId)) {
            if (workflowState.ideasGenerated || workflowState.outlineGenerated || workflowState.scriptGenerated || workflowState.novelGenerated) {
                return { isPermanent: false, message: '工作流进行中，无法切换模式' };
            }
        }
        
        if (workflowState.scriptGenerated) {
            if (!['downloadScriptBtn', 'downloadNovelBtn'].includes(buttonId)) {
                return { isPermanent: true, message: '脚本已生成，流程已完成' };
            }
        }
        
        if (workflowState.novelGenerated) {
            if (!['downloadNovelBtn', 'generateScriptBtn', 'regenerateNovelBtn', 'regenerateNovelBtn2'].includes(buttonId)) {
                return { isPermanent: true, message: '小说已生成，请继续下一步或重新生成' };
            }
        }
        
        if (workflowState.outlineGenerated) {
            if (['quickGenerateBtn', 'generateIdeasBtn', 'regenerateIdeasBtn'].includes(buttonId)) {
                return { isPermanent: true, message: '大纲已生成，无法修改脑洞' };
            }
        }
        
        if (workflowState.ideasGenerated) {
            if (buttonId === 'quickGenerateBtn' || buttonId === 'generateIdeasBtn') {
                return { isPermanent: true, message: '脑洞已生成，请选择脑洞继续或重新生成' };
            }
            if (['generateOutlineBtn', 'regenerateOutlineBtn'].includes(buttonId) && !selectedIdeaNumber) {
                return { isPermanent: false, message: '请先选择一个脑洞' };
            }
        }
        
        // 没有被禁用
        return { isPermanent: false, message: '' };
    }

    // 生成脑洞卡片
    function generateIdeaCards(ideas) {
        const container = document.getElementById('ideasContainer');
        container.innerHTML = '';
        currentIdeas = ideas;
        
        // 添加调试日志
        console.log('收到的脑洞数据:', ideas);
        
        ideas.forEach((idea, index) => {
            // 添加详细的数据结构日志
            console.log(`脑洞 ${index + 1} 数据:`, idea);
            
            // 字段映射：处理前端期望字段名与后端返回字段名的差异
            const ideaData = {
                number: idea.number,
                synopsisString: idea.synopsis || idea.synopsisString || '',
                zhihu_titleString: idea.zhihu_title || idea.zhihu_titleString || ''
            };
            
            console.log(`映射后的脑洞 ${index + 1} 数据:`, ideaData);
            
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg p-4 border border-gray-200 card cursor-pointer slide-in relative';
            card.dataset.ideaNumber = ideaData.number;
            card.innerHTML = `
                <div class="absolute top-2 right-2">
                    <div class="selection-indicator"></div>
                </div>
                <div class="flex items-center gap-2 mb-3">
                    <div class="card-number">${ideaData.number}</div>
                </div>
                <h3 class="font-semibold text-gray-800 text-lg mb-2" style="font-weight: 600;">
                    <i class="fas fa-quote-left text-gray-400 mr-1"></i>${ideaData.zhihu_titleString}
                </h3>
                <p class="text-gray-600 text-base mb-3" style="line-height: 1.6;">
                    <i class="fas fa-align-left text-gray-400 mr-1"></i>${ideaData.synopsisString}
                </p>
            `;
            
            card.addEventListener('click', function() {
                const isCurrentlySelected = this.classList.contains('selected-card');
                
                if (isCurrentlySelected) {
                    // 取消选中：移除当前卡片的选中状态
                    this.classList.remove('selected-card');
                    this.querySelector('.selection-indicator').classList.remove('selected');
                    selectedIdeaNumber = null;
                    
                    // 添加取消选中的动画效果
                    this.style.transform = 'scale(0.98)';
                    setTimeout(() => {
                        this.style.transform = 'scale(1)';
                    }, 150);
                } else {
                    // 选中：先清除所有卡片的选中状态，然后选中当前卡片
                    document.querySelectorAll('#ideasContainer .card').forEach(c => {
                        c.classList.remove('selected-card');
                        c.querySelector('.selection-indicator').classList.remove('selected');
                    });
                    this.classList.add('selected-card');
                    this.querySelector('.selection-indicator').classList.add('selected');
                    selectedIdeaNumber = this.dataset.ideaNumber;
                }
            });
            
            // 添加鼠标悬停提示
            card.addEventListener('mouseenter', function() {
                if (this.classList.contains('selected-card')) {
                    this.title = '再次点击可取消选中';
                } else {
                    this.title = '点击选择此脑洞';
                }
            });
            
            container.appendChild(card);
            
            // 触发滑动动画
            setTimeout(() => {
                card.classList.add('slide-in-active');
            }, 100 + index * 50);
        });
    }

    // 生成大纲
    function generateOutlineDisplay(outlineData) {
        const container = document.getElementById('outlineContainer');
        container.innerHTML = `
            <div class="mb-6 fade-in">
                <h4 class="font-bold text-gray-800 mb-2">
                    <i class="fas fa-play-circle text-blue-500 mr-1"></i>起
                </h4>
                <p class="text-gray-700">${outlineData.opening}</p>
            </div>
            <div class="mb-6 fade-in" style="animation-delay: 0.1s;">
                <h4 class="font-bold text-gray-800 mb-2">
                    <i class="fas fa-arrow-circle-right text-blue-500 mr-1"></i>承
                </h4>
                <p class="text-gray-700">${outlineData.development}</p>
            </div>
            <div class="mb-6 fade-in" style="animation-delay: 0.2s;">
                <h4 class="font-bold text-gray-800 mb-2">
                    <i class="fas fa-exchange-alt text-blue-500 mr-1"></i>转
                </h4>
                <p class="text-gray-700">${outlineData.climax}</p>
            </div>
            <div class="fade-in" style="animation-delay: 0.3s;">
                <h4 class="font-bold text-gray-800 mb-2">
                    <i class="fas fa-check-circle text-blue-500 mr-1"></i>合
                </h4>
                <p class="text-gray-700">${outlineData.conclusion}</p>
            </div>
        `;
        
        // 触发淡入动画
        setTimeout(() => {
            document.querySelectorAll('.fade-in').forEach(el => {
                el.classList.add('fade-in-active');
            });
        }, 100);
    }

    // 生成脚本
    function generateScriptDisplay(scriptText) {
        const container = document.getElementById('scriptContainer');
        container.innerHTML = `
            <pre class="text-gray-800 whitespace-pre-wrap font-mono text-sm fade-in">${scriptText}</pre>
        `;
        
        // 触发淡入动画
        setTimeout(() => {
            container.querySelector('.fade-in').classList.add('fade-in-active');
        }, 100);
    }

    // 生成小说正文
    function generateNovelDisplay(novelText) {
        const container = document.getElementById('novelContainer');
        container.innerHTML = `
            <div class="novel-content fade-in">
                <div class="text-gray-800 whitespace-pre-wrap leading-relaxed text-base">${novelText}</div>
            </div>
        `;
        
        // 触发淡入动画
        setTimeout(() => {
            container.querySelector('.fade-in').classList.add('fade-in-active');
        }, 100);
    }

    // 快速生成按钮
    document.getElementById('quickGenerateBtn').addEventListener('click', async function() {
        // 检查是否有现有进度，需要重置
        const hasProgress = workflowState.ideasGenerated || workflowState.outlineGenerated || 
                           workflowState.novelGenerated || workflowState.scriptGenerated;
        
        if (hasProgress) {
            const confirmReset = confirm('检测到已有进度，重新快速生成将清空所有内容，是否继续？\n\n点击"确定"重新开始，点击"取消"保持当前进度。');
            if (!confirmReset) {
                return; // 用户取消操作
            }
            // 重置工作流
            resetWorkflow();
        }
        
        setButtonLoading('quickGenerateBtn', true, '随机生成中...');
        
        try {
            const data = {
                genre: null,
                plot_holes_count: 10
            };
            
            const result = await callAPI('https://n8n.games/webhook/f6021675-4090-4734-b65d-c7ea7ba1b24a', data);
            
            // 添加详细的API返回数据日志
            console.log('快速生成脑洞API完整返回结果:', result);
            console.log('result类型:', typeof result);
            console.log('result是否为数组:', Array.isArray(result));
            
            // 处理两种可能的数据结构：数组格式或直接对象格式
            let dataObj;
            if (Array.isArray(result) && result.length > 0) {
                // 原始数组格式
                dataObj = result[0];
                console.log('使用数组格式，result[0]:', dataObj);
            } else if (result && typeof result === 'object' && result.Novel_imagination) {
                // 直接对象格式
                dataObj = result;
                console.log('使用对象格式，result:', dataObj);
            }
            
            if (dataObj && dataObj.Novel_imagination) {
                console.log('Novel_imagination数据:', dataObj.Novel_imagination);
                console.log('first_waithook:', dataObj.first_waithook);
                
                // 清理webhook地址中的反引号和空格
                firstWaithook = dataObj.first_waithook.replace(/[`\s]/g, '');
                console.log('清理后的webhook地址:', firstWaithook);
                
                generateIdeaCards(dataObj.Novel_imagination);
                document.getElementById('ideasSection').classList.remove('hidden');
                
                // 更新流程状态：脑洞已生成
                workflowState.ideasGenerated = true;
                updateButtonStates();
                
                window.scrollTo({
                    top: document.getElementById('ideasSection').offsetTop - 20,
                    behavior: 'smooth'
                });
            } else {
                console.error('API返回数据格式错误，完整数据:', result);
                throw new Error('API返回数据格式错误');
            }
        } catch (error) {
            showError('快速生成脑洞失败: ' + error.message);
        } finally {
            setButtonLoading('quickGenerateBtn', false);
        }
    });

    // 第一步：生成脑洞
    document.getElementById('generateIdeasBtn').addEventListener('click', async function() {
        const novelPrompt = document.getElementById('novelPrompt').value.trim();
        const plotHolesCount = parseInt(ideaCountSlider.value);
        
        if (!novelPrompt) {
            showError('请输入小说需求');
            return;
        }
        
        // 检查是否有现有进度，需要重置
        const hasProgress = workflowState.ideasGenerated || workflowState.outlineGenerated || 
                           workflowState.novelGenerated || workflowState.scriptGenerated;
        
        if (hasProgress) {
            const confirmReset = confirm('检测到已有进度，重新生成脑洞将清空所有内容，是否继续？\n\n点击"确定"重新开始，点击"取消"保持当前进度。');
            if (!confirmReset) {
                return; // 用户取消操作
            }
            // 重置工作流
            resetWorkflow();
        }
        
        setButtonLoading('generateIdeasBtn', true, '生成中...');
        
        try {
            const data = {
                genre: novelPrompt,
                plot_holes_count: plotHolesCount
            };
            
            const result = await callAPI('https://n8n.games/webhook/f6021675-4090-4734-b65d-c7ea7ba1b24a', data);
            
            // 添加详细的API返回数据日志
            console.log('生成脑洞API完整返回结果:', result);
            console.log('result类型:', typeof result);
            console.log('result是否为数组:', Array.isArray(result));
            
            // 处理两种可能的数据结构：数组格式或直接对象格式
            let dataObj;
            if (Array.isArray(result) && result.length > 0) {
                // 原始数组格式
                dataObj = result[0];
                console.log('使用数组格式，result[0]:', dataObj);
            } else if (result && typeof result === 'object' && result.Novel_imagination) {
                // 直接对象格式
                dataObj = result;
                console.log('使用对象格式，result:', dataObj);
            }
            
            if (dataObj && dataObj.Novel_imagination) {
                console.log('Novel_imagination数据:', dataObj.Novel_imagination);
                console.log('first_waithook:', dataObj.first_waithook);
                
                // 清理webhook地址中的反引号和空格
                firstWaithook = dataObj.first_waithook.replace(/[`\s]/g, '');
                console.log('清理后的webhook地址:', firstWaithook);
                
                generateIdeaCards(dataObj.Novel_imagination);
                document.getElementById('ideasSection').classList.remove('hidden');
                
                // 更新流程状态：脑洞已生成
                workflowState.ideasGenerated = true;
                updateButtonStates();
                
                window.scrollTo({
                    top: document.getElementById('ideasSection').offsetTop - 20,
                    behavior: 'smooth'
                });
            } else {
                console.error('API返回数据格式错误，完整数据:', result);
                throw new Error('API返回数据格式错误');
            }
        } catch (error) {
            showError('生成脑洞失败: ' + error.message);
        } finally {
            setButtonLoading('generateIdeasBtn', false);
        }
    });

    // 第二步：生成大纲
    document.getElementById('generateOutlineBtn').addEventListener('click', async function() {
        if (!selectedIdeaNumber) {
            showError('请先选择一个脑洞');
            return;
        }
        
        if (!firstWaithook) {
            showError('请先生成脑洞');
            return;
        }
        
        const userSuggestions = document.getElementById('optimizeIdeasInput').value.trim() || null;
        
        setButtonLoading('generateOutlineBtn', true, '生成中...');
        
        try {
            const data = {
                choose: selectedIdeaNumber,
                Boolean: true,
                user_suggestions: userSuggestions
            };
            
            const result = await callAPI(firstWaithook, data);
            
            // 添加大纲API返回数据日志
            console.log('生成大纲API完整返回结果:', result);
            console.log('大纲result类型:', typeof result);
            
            // 处理两种可能的数据结构：数组格式或直接对象格式
            let outlineDataObj;
            if (Array.isArray(result) && result.length > 0) {
                // 原始数组格式
                outlineDataObj = result[0];
                console.log('大纲使用数组格式，result[0]:', outlineDataObj);
            } else if (result && typeof result === 'object' && (result.novel_outline || result.Novel_imagination)) {
                // 直接对象格式
                outlineDataObj = result;
                console.log('大纲使用对象格式，result:', outlineDataObj);
            }
            
            if (outlineDataObj && (outlineDataObj.novel_outline || outlineDataObj.Novel_imagination)) {
                console.log('novel_outline数据:', outlineDataObj.novel_outline || outlineDataObj.Novel_imagination);
                console.log('second_waithook:', outlineDataObj.second_waithook || outlineDataObj.waithook);
                
                // 清理webhook地址中的反引号和空格
                secondWaithook = (outlineDataObj.second_waithook || outlineDataObj.waithook) ? (outlineDataObj.second_waithook || outlineDataObj.waithook).replace(/[`\s]/g, '') : '';
                console.log('清理后的second_waithook:', secondWaithook);
                
                // 处理大纲数据，支持直接对象格式和JSON字符串格式
                let outlineData;
                const rawOutlineData = outlineDataObj.novel_outline || outlineDataObj.Novel_imagination;
                if (typeof rawOutlineData === 'string') {
                    outlineData = JSON.parse(rawOutlineData);
                } else {
                    outlineData = rawOutlineData;
                }
                console.log('解析后的大纲数据:', outlineData);
                generateOutlineDisplay(outlineData);
                document.getElementById('outlineSection').classList.remove('hidden');
                
                // 更新流程状态：大纲已生成
                workflowState.outlineGenerated = true;
                updateButtonStates();
                
                window.scrollTo({
                    top: document.getElementById('outlineSection').offsetTop - 20,
                    behavior: 'smooth'
                });
            } else {
                console.error('大纲API返回数据格式错误，完整数据:', result);
                throw new Error('API返回数据格式错误');
            }
        } catch (error) {
            showError('生成大纲失败: ' + error.message);
        } finally {
            setButtonLoading('generateOutlineBtn', false);
        }
    });

    // 第三步：生成脚本
    document.getElementById('generateScriptBtn').addEventListener('click', async function() {
        if (!thirdWaithook) {
            showError('请先生成小说正文');
            return;
        }
        
        const userSuggestions = document.getElementById('optimizeNovelInput').value.trim() || null;
        
        setButtonLoading('generateScriptBtn', true, '生成中...');
        
        try {
            const data = {
                Boolean: true,
                user_suggestions: userSuggestions
            };
            
            const result = await callAPI(thirdWaithook, data);
            
            // 添加脚本API返回数据日志
            console.log('生成脚本API完整返回结果:', result);
            console.log('脚本result类型:', typeof result);
            
            // 处理返回的数据结构 - 第4步返回纯文本
            if (typeof result === 'string') {
                // 互动脚本返回纯文本
                generateScriptDisplay(result);
            } else {
                console.error('生成脚本API返回数据格式错误，完整数据:', result);
                throw new Error('API返回数据格式错误：期望纯文本格式');
            }
            
            document.getElementById('scriptSection').classList.remove('hidden');
            
            // 更新流程状态：脚本已生成
            workflowState.scriptGenerated = true;
            updateButtonStates();
            
            window.scrollTo({
                top: document.getElementById('scriptSection').offsetTop - 20,
                behavior: 'smooth'
            });
        } catch (error) {
            showError('生成脚本失败: ' + error.message);
        } finally {
            setButtonLoading('generateScriptBtn', false);
        }
    });

    // 重新生成按钮
    document.getElementById('regenerateIdeasBtn').addEventListener('click', async function() {
        if (!firstWaithook) {
            showError('请先生成脑洞');
            return;
        }
        
        const userSuggestions = document.getElementById('optimizeIdeasInput').value.trim() || null;
        
        setButtonLoading('regenerateIdeasBtn', true, '重新生成中...');
        
        try {
            const data = {
                choose: selectedIdeaNumber || null,
                Boolean: false,
                user_suggestions: userSuggestions
            };
            
            const result = await callAPI(firstWaithook, data);
            
            // 添加重新生成脑洞API返回数据日志
            console.log('重新生成脑洞API完整返回结果:', result);
            console.log('重新生成脑洞result类型:', typeof result);
            
            // 处理两种可能的数据结构：数组格式或直接对象格式
            let dataObj;
            if (Array.isArray(result) && result.length > 0) {
                dataObj = result[0];
                console.log('重新生成脑洞使用数组格式，result[0]:', dataObj);
            } else if (result && typeof result === 'object' && result.Novel_imagination) {
                dataObj = result;
                console.log('重新生成脑洞使用对象格式，result:', dataObj);
            }
            
            if (dataObj && dataObj.Novel_imagination) {
                generateIdeaCards(dataObj.Novel_imagination);
                
                // 清除之前的选择状态
                selectedIdeaNumber = null;
                
                // 重置后续步骤状态
                workflowState.outlineGenerated = false;
                workflowState.scriptGenerated = false;
                updateButtonStates();
                
                // 隐藏后续步骤
                document.getElementById('outlineSection').classList.add('hidden');
                document.getElementById('scriptSection').classList.add('hidden');
                
                // 重新生成后保持在当前位置
                window.scrollTo({
                    top: document.getElementById('ideasSection').offsetTop - 20,
                    behavior: 'smooth'
                });
            } else {
                console.error('重新生成脑洞API返回数据格式错误，完整数据:', result);
                throw new Error('API返回数据格式错误');
            }
        } catch (error) {
            showError('重新生成脑洞失败: ' + error.message);
        } finally {
            setButtonLoading('regenerateIdeasBtn', false);
        }
    });

    document.getElementById('regenerateOutlineBtn').addEventListener('click', async function() {
        if (!selectedIdeaNumber) {
            showError('请先选择一个脑洞');
            return;
        }
        
        if (!secondWaithook) {
            showError('请先生成大纲');
            return;
        }
        
        const userSuggestions = document.getElementById('optimizeOutlineInput').value.trim() || null;
        
        setButtonLoading('regenerateOutlineBtn', true, '重新生成中...');
        
        try {
            const data = {
                Boolean: false,
                user_suggestions: userSuggestions
            };
            
            const result = await callAPI(secondWaithook, data);
            
            // 添加重新生成大纲API返回数据日志
            console.log('重新生成大纲API完整返回结果:', result);
            console.log('重新生成大纲result类型:', typeof result);
            
            // 处理两种可能的数据结构：数组格式或直接对象格式
            let outlineDataObj;
            if (Array.isArray(result) && result.length > 0) {
                outlineDataObj = result[0];
                console.log('重新生成大纲使用数组格式，result[0]:', outlineDataObj);
            } else if (result && typeof result === 'object' && (result.novel_outline || result.Novel_imagination)) {
                outlineDataObj = result;
                console.log('重新生成大纲使用对象格式，result:', outlineDataObj);
            }
            
            if (outlineDataObj && (outlineDataObj.novel_outline || outlineDataObj.Novel_imagination)) {
                // 处理大纲数据，支持直接对象格式和JSON字符串格式
                let outlineData;
                const rawOutlineData = outlineDataObj.novel_outline || outlineDataObj.Novel_imagination;
                if (typeof rawOutlineData === 'string') {
                    outlineData = JSON.parse(rawOutlineData);
                } else {
                    outlineData = rawOutlineData;
                }
                console.log('重新生成解析后的大纲数据:', outlineData);
                generateOutlineDisplay(outlineData);
                
                // 重置脚本步骤状态
                workflowState.scriptGenerated = false;
                updateButtonStates();
                
                // 隐藏脚本区域
                document.getElementById('scriptSection').classList.add('hidden');
                
                // 重新生成后保持在当前位置
                window.scrollTo({
                    top: document.getElementById('outlineSection').offsetTop - 20,
                    behavior: 'smooth'
                });
            } else {
                console.error('重新生成大纲API返回数据格式错误，完整数据:', result);
                throw new Error('API返回数据格式错误');
            }
        } catch (error) {
            showError('重新生成大纲失败: ' + error.message);
        } finally {
            setButtonLoading('regenerateOutlineBtn', false);
        }
    });


    // 下载脚本功能
    document.getElementById('downloadScriptBtn').addEventListener('click', function() {
        const scriptContainer = document.getElementById('scriptContainer');
        const scriptContent = scriptContainer.querySelector('pre');
        
        if (!scriptContent || !scriptContent.textContent.trim()) {
            showError('没有可下载的脚本内容，请先生成脚本');
            return;
        }
        
        setButtonLoading('downloadScriptBtn', true, '准备下载...');
        
        try {
            // 获取脚本内容
            const content = scriptContent.textContent;
            
            // 生成文件名（包含时间戳）
            const now = new Date();
            const timestamp = now.getFullYear() + 
                String(now.getMonth() + 1).padStart(2, '0') + 
                String(now.getDate()).padStart(2, '0') + '_' +
                String(now.getHours()).padStart(2, '0') + 
                String(now.getMinutes()).padStart(2, '0') + 
                String(now.getSeconds()).padStart(2, '0');
            const filename = `小说脚本_${timestamp}.txt`;
            
            // 创建Blob对象
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            
            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            
            // 触发下载
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 清理URL对象
            URL.revokeObjectURL(url);
            
            // 显示成功提示
            alert('脚本下载成功！文件名：' + filename);
        } catch (error) {
            showError('下载失败: ' + error.message);
        } finally {
            setButtonLoading('downloadScriptBtn', false);
        }
    });

    // 生成小说正文按钮
    document.getElementById('generateNovelBtn').addEventListener('click', async function() {
        if (!secondWaithook) {
            showError('请先生成大纲');
            return;
        }
        
        const userSuggestions = document.getElementById('optimizeOutlineInput').value.trim() || null;
        
        setButtonLoading('generateNovelBtn', true, '生成中...');
        
        try {
            const data = {
                Boolean: true,
                user_suggestions: userSuggestions
            };
            
            const result = await callAPI(secondWaithook, data);
            
            // 添加小说正文API返回数据日志
            console.log('生成小说正文API完整返回结果:', result);
            console.log('小说正文result类型:', typeof result);
            
            // 处理返回的数据结构
            console.log('生成小说正文API返回的完整对象:', result);
            
            if (typeof result === 'object') {
                // 检查并存储third_waithook
                if (result.third_waithook) {
                    thirdWaithook = result.third_waithook.replace(/[`\s]/g, '');
                    console.log('存储的third_waithook:', thirdWaithook);
                }
                
                // 处理小说正文内容 - 根据实际返回的数据结构
                if (result.novel_text) {
                    generateNovelDisplay(result.novel_text);
                } else {
                    console.error('生成小说正文API返回数据格式错误，完整数据:', result);
                    throw new Error('API返回数据格式错误：未找到novel_text字段');
                }
            } else if (typeof result === 'string') {
                generateNovelDisplay(result);
            } else {
                console.error('生成小说正文API返回数据格式错误，完整数据:', result);
                throw new Error('API返回数据格式错误');
            }
            
            document.getElementById('novelSection').classList.remove('hidden');
            
            // 更新流程状态：小说正文已生成
            workflowState.novelGenerated = true;
            updateButtonStates();
            
            window.scrollTo({
                top: document.getElementById('novelSection').offsetTop - 20,
                behavior: 'smooth'
            });
        } catch (error) {
            showError('生成小说正文失败: ' + error.message);
        } finally {
            setButtonLoading('generateNovelBtn', false);
        }
    });

    // 重新生成小说正文按钮
    document.getElementById('regenerateNovelBtn').addEventListener('click', async function() {
        if (!thirdWaithook) {
            showError('请先生成小说正文');
            return;
        }
        
        const userSuggestions = document.getElementById('optimizeNovelInput').value.trim() || null;
        
        setButtonLoading('regenerateNovelBtn', true, '重新生成中...');
        
        try {
            const data = {
                Boolean: false,
                user_suggestions: userSuggestions
            };
            
            const result = await callAPI(thirdWaithook, data);
            
            // 添加小说正文API返回数据日志
            console.log('重新生成小说正文API完整返回结果:', result);
            console.log('重新生成小说正文result类型:', typeof result);
            
            // 处理返回的数据结构
            console.log('重新生成小说正文API返回的完整对象:', result);
            
            if (typeof result === 'object') {
                // 检查并存储third_waithook（如果有的话）
                if (result.third_waithook) {
                    thirdWaithook = result.third_waithook.replace(/[`\s]/g, '');
                    console.log('重新存储的third_waithook:', thirdWaithook);
                }
                
                // 处理小说正文内容 - 根据实际返回的数据结构
                if (result.novel_text) {
                    generateNovelDisplay(result.novel_text);
                } else {
                    console.error('重新生成小说正文API返回数据格式错误，完整数据:', result);
                    throw new Error('API返回数据格式错误：未找到novel_text字段');
                }
            } else if (typeof result === 'string') {
                generateNovelDisplay(result);
            } else {
                console.error('重新生成小说正文API返回数据格式错误，完整数据:', result);
                throw new Error('API返回数据格式错误');
            }
            
            document.getElementById('novelSection').classList.remove('hidden');
            
            // 更新流程状态：小说正文已重新生成
            workflowState.novelGenerated = true;
            updateButtonStates();
            
            window.scrollTo({
                top: document.getElementById('novelSection').offsetTop - 20,
                behavior: 'smooth'
            });
        } catch (error) {
            showError('重新生成小说正文失败: ' + error.message);
        } finally {
            setButtonLoading('regenerateNovelBtn', false);
        }
    });

    // 重新生成小说正文按钮2（底部按钮）
    document.getElementById('regenerateNovelBtn2').addEventListener('click', async function() {
        if (!thirdWaithook) {
            showError('请先生成小说正文');
            return;
        }
        
        const userSuggestions = document.getElementById('optimizeNovelInput').value.trim() || null;
        
        setButtonLoading('regenerateNovelBtn2', true, '重新生成中...');
        
        try {
            const data = {
                Boolean: false,
                user_suggestions: userSuggestions
            };
            
            const result = await callAPI(thirdWaithook, data);
            
            // 添加小说正文API返回数据日志
            console.log('重新生成小说正文API完整返回结果:', result);
            console.log('重新生成小说正文result类型:', typeof result);
            
            // 处理返回的数据结构
            console.log('重新生成小说正文API返回的完整对象:', result);
            
            if (typeof result === 'object') {
                // 检查并存储third_waithook（如果有的话）
                if (result.third_waithook) {
                    thirdWaithook = result.third_waithook.replace(/[`\s]/g, '');
                    console.log('重新存储的third_waithook:', thirdWaithook);
                }
                
                // 处理小说正文内容 - 根据实际返回的数据结构
                if (result.novel_text) {
                    generateNovelDisplay(result.novel_text);
                } else {
                    console.error('重新生成小说正文API返回数据格式错误，完整数据:', result);
                    throw new Error('API返回数据格式错误：未找到novel_text字段');
                }
            } else if (typeof result === 'string') {
                generateNovelDisplay(result);
            } else {
                console.error('重新生成小说正文API返回数据格式错误，完整数据:', result);
                throw new Error('API返回数据格式错误');
            }
            
            document.getElementById('novelSection').classList.remove('hidden');
            
            // 更新流程状态：小说正文已重新生成
            workflowState.novelGenerated = true;
            updateButtonStates();
            
            window.scrollTo({
                top: document.getElementById('novelSection').offsetTop - 20,
                behavior: 'smooth'
            });
        } catch (error) {
            showError('重新生成小说正文失败: ' + error.message);
        } finally {
            setButtonLoading('regenerateNovelBtn2', false);
        }
    });

    // 下载小说正文功能
    document.getElementById('downloadNovelBtn').addEventListener('click', function() {
        const novelContainer = document.getElementById('novelContainer');
        const novelContent = novelContainer.querySelector('.novel-content');
        
        if (!novelContent || !novelContent.textContent.trim()) {
            showError('没有可下载的小说正文内容，请先生成小说正文');
            return;
        }
        
        setButtonLoading('downloadNovelBtn', true, '准备下载...');
        
        try {
            // 获取小说正文内容
            const content = novelContent.textContent;
            
            // 生成文件名（包含时间戳）
            const now = new Date();
            const timestamp = now.getFullYear() + 
                String(now.getMonth() + 1).padStart(2, '0') + 
                String(now.getDate()).padStart(2, '0') + '_' +
                String(now.getHours()).padStart(2, '0') + 
                String(now.getMinutes()).padStart(2, '0') + 
                String(now.getSeconds()).padStart(2, '0');
            const filename = `小说正文_${timestamp}.txt`;
            
            // 创建Blob对象
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            
            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            
            // 触发下载
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 清理URL对象
            URL.revokeObjectURL(url);
            
            // 显示成功提示
            alert('小说正文下载成功！文件名：' + filename);
        } catch (error) {
            showError('下载失败: ' + error.message);
        } finally {
            setButtonLoading('downloadNovelBtn', false);
        }
    });

    // 滚动动画
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fadeIn');
            }
        });
    }, {
        threshold: 0.1
    });

    document.querySelectorAll('.animate-fadeIn').forEach(el => {
        observer.observe(el);
    });
});