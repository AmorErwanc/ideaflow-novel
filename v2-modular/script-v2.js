// 全局变量
let currentStep = 0;
let currentMode = null;
let selectedMode = null; // 添加selectedMode变量
let currentStreamController = null;
let selectedIdea = null;
let stepHistory = [0]; // 记录已访问过的步骤

// 工作流状态管理 - 记录每个步骤的完成状态和数据状态
const workflowState = {
    steps: {
        0: { completed: true, hasData: false },  // 模式选择 - 始终完成
        1: { completed: false, hasData: false }, // 创意输入
        2: { completed: false, hasData: false }, // 脑洞生成
        3: { completed: false, hasData: false }, // 大纲创作
        4: { completed: false, hasData: false }, // 小说撰写
        5: { completed: false, hasData: false }  // 脚本生成
    },
    // 数据依赖关系 - 修改某步骤时需要清理的后续步骤
    dependencies: {
        0: [1, 2, 3, 4, 5],  // 切换模式清理所有后续
        1: [2, 3, 4, 5],     // 修改创意输入清理脑洞及后续
        2: [3, 4, 5],        // 重新选择脑洞清理大纲及后续
        3: [4, 5],           // 修改大纲清理小说及后续
        4: [5]               // 修改小说清理脚本
    }
};

// 步骤信息映射 - 创意输入(step1)不在进度条显示
const stepInfo = {
    0: { name: '模式选择', icon: 'compass', color: 'indigo', displayIndex: 0 },
    1: { name: '创意输入', icon: 'magic', color: 'purple', displayIndex: null }, // 不显示在进度条
    2: { name: '脑洞生成', icon: 'brain', color: 'pink', displayIndex: 1 },
    3: { name: '大纲创作', icon: 'list-alt', color: 'blue', displayIndex: 2 },
    4: { name: '小说撰写', icon: 'book', color: 'purple', displayIndex: 3 },
    5: { name: '脚本生成', icon: 'film', color: 'orange', displayIndex: 4 }
};

// 进度条显示的步骤（不包含创意输入）
const visibleSteps = [0, 2, 3, 4, 5];

// 解析状态管理 - 针对新的XML格式
const parserState = {
    currentStoryNum: 0,  // 故事编号（自动递增）
    currentTag: null,
    buffer: '',
    stories: new Map(),
    lastProcessedIndex: 0,
    tagBuffer: '',
    inStory: false,  // 是否在story标签内
    storiesStarted: false  // 是否检测到stories标签
};

// 快速生成模式 - 直接跳到脑洞生成
function handleQuickGenerate() {
    console.log('快速生成模式 - 直接开始流式生成');
    
    currentMode = 'quick';
    selectedMode = 'quick'; // 设置选择的模式
    
    // 更新状态
    workflowState.steps[0].completed = true;
    
    // 显示模式指示器
    const indicator = document.getElementById('modeIndicator');
    indicator.classList.remove('hidden');
    indicator.innerHTML = '<i class="fas fa-bolt mr-1"></i>灵感速写模式';
    
    // 直接跳到脑洞生成步骤
    currentStep = 2;
    updateUI();
    
    // 立即开始流式生成，生成时会自动清理旧数据
    setTimeout(() => {
        // 清理所有后续数据（静默处理）
        clearAllData();
        startStreamingIdeas();
    }, 500);
}

// 定制模式 - 先到创意输入页
function handleCustomMode() {
    console.log('定制创作模式');
    
    currentMode = 'custom';
    selectedMode = 'custom'; // 设置选择的模式
    
    // 更新状态
    workflowState.steps[0].completed = true;
    
    // 显示模式指示器
    const indicator = document.getElementById('modeIndicator');
    indicator.classList.remove('hidden');
    indicator.innerHTML = '<i class="fas fa-palette mr-1"></i>定制创作模式';
    
    // 跳到创意输入步骤（不显示在进度条）
    currentStep = 1;
    updateUI();
}

// 返回模式选择
function goBackToModeSelection() {
    // 直接返回，不清理数据
    currentStep = 0;
    currentMode = null;
    document.getElementById('modeIndicator').classList.add('hidden');
    updateUI();
}

// 检查是否有任何数据
function hasAnyData() {
    return Object.keys(workflowState.steps).some(step => 
        step !== '0' && workflowState.steps[step].hasData
    );
}

// 清除所有数据
function clearAllData() {
    // 清除所有步骤状态
    Object.keys(workflowState.steps).forEach(step => {
        if (step !== '0') {
            workflowState.steps[step].completed = false;
            workflowState.steps[step].hasData = false;
        }
    });
    
    // 清除全局变量
    selectedIdea = null;
    
    // 清除localStorage
    localStorage.removeItem('userCreativeInput');
    localStorage.removeItem('userIdeaCount');
    localStorage.removeItem('currentOutline');
    localStorage.removeItem('currentNovel');
    localStorage.removeItem('currentScript');
    
    console.log('已清除所有创作数据');
}

// 更新脑洞数量显示
function updateIdeaCount(value) {
    const display = document.getElementById('ideaCountDisplay');
    if (display) {
        display.textContent = value;
        // 添加弹性动画
        display.parentElement.style.transform = 'scale(1.1)';
        setTimeout(() => {
            display.parentElement.style.transform = 'scale(1)';
        }, 200);
    }
    
    // 更新快速选择按钮的样式
    document.querySelectorAll('.quick-select-btn').forEach(btn => {
        btn.classList.remove('bg-gradient-to-r', 'from-blue-500', 'to-purple-500', 'text-white');
        btn.classList.add('bg-white', 'border', 'border-gray-300');
    });
    
    // 高亮对应的快速选择按钮
    const quickBtns = {
        '6': 0,
        '9': 1,
        '12': 2,
        '15': 3
    };
    
    if (quickBtns[value] !== undefined) {
        const btns = document.querySelectorAll('.quick-select-btn');
        if (btns[quickBtns[value]]) {
            btns[quickBtns[value]].classList.remove('bg-white', 'border', 'border-gray-300');
            btns[quickBtns[value]].classList.add('bg-gradient-to-r', 'from-blue-500', 'to-purple-500', 'text-white');
        }
    }
}

// 设置脑洞数量（快速选择）
function setIdeaCount(count) {
    const slider = document.getElementById('ideaCountSlider');
    if (slider) {
        slider.value = count;
        updateIdeaCount(count);
    }
}

// 处理定制输入
function processCustomInput() {
    const input = document.getElementById('userCreativeInput').value.trim();
    if (!input) {
        alert('请输入你的创意想法');
        return;
    }
    
    // 获取选择的数量
    const countSlider = document.getElementById('ideaCountSlider');
    const ideaCount = countSlider ? parseInt(countSlider.value) : 5;
    
    // 保存用户输入和数量到localStorage
    localStorage.setItem('userCreativeInput', input);
    localStorage.setItem('userIdeaCount', ideaCount);
    
    // 保存到全局变量供API使用
    window.customIdeaCount = ideaCount;
    
    // 更新工作流状态 - 创意输入完成
    workflowState.steps[1].completed = true;
    workflowState.steps[1].hasData = true;
    
    // 跳到脑洞生成步骤
    currentStep = 2;
    updateUI();
    
    // 开始流式生成（传入用户输入）
    setTimeout(() => {
        startStreamingIdeas(input);
    }, 500);
}

// 清理依赖步骤的数据
function clearDependentSteps(fromStep) {
    const dependentSteps = workflowState.dependencies[fromStep] || [];
    
    dependentSteps.forEach(step => {
        // 清理步骤状态
        workflowState.steps[step].completed = false;
        workflowState.steps[step].hasData = false;
        
        // 清理localStorage中的数据
        switch(step) {
            case 2:
                // 清理脑洞数据
                selectedIdea = null;
                break;
            case 3:
                // 清理大纲数据
                localStorage.removeItem('currentOutline');
                break;
            case 4:
                // 清理小说数据
                localStorage.removeItem('currentNovel');
                break;
            case 5:
                // 清理脚本数据
                localStorage.removeItem('currentScript');
                break;
        }
    });
    
    console.log(`已清理步骤 ${fromStep} 的后续依赖数据:`, dependentSteps);
}

// 检查是否需要确认（返回到已完成的步骤时）
function needsConfirmation(targetStep) {
    // 如果目标步骤已完成，且有后续步骤有数据，需要确认
    if (workflowState.steps[targetStep].completed) {
        const dependentSteps = workflowState.dependencies[targetStep] || [];
        return dependentSteps.some(step => workflowState.steps[step].hasData);
    }
    return false;
}

// 获取将被清除的步骤名称列表
function getAffectedStepsNames(fromStep) {
    const dependentSteps = workflowState.dependencies[fromStep] || [];
    return dependentSteps
        .filter(step => workflowState.steps[step].hasData)
        .map(step => stepInfo[step].name);
}

// 跳转到指定步骤
function goToStep(step) {
    // 检查步骤是否可访问
    if (!canAccessStep(step)) {
        console.log(`⚠️ 步骤 ${step} 还不能访问`);
        return;
    }
    
    // 直接跳转，不清理任何数据，只是查看
    currentStep = step;
    
    // 添加到历史记录
    if (!stepHistory.includes(step)) {
        stepHistory.push(step);
    }
    
    updateUI();
    
    // 如果跳转到大纲步骤
    if (step === 3) {
        // 如果正在生成大纲，不恢复缓存
        if (window.isGeneratingOutline) {
            // 生成函数会自己处理
            return;
        }
        
        // 检查是否有缓存的大纲内容
        const cachedOutline = localStorage.getItem('currentOutline');
        const outlineContainer = document.getElementById('outlineContainer');
        const outlineContent = document.getElementById('outlineContent');
        const hasStreamLoading = outlineContainer?.querySelector('#outlineStreamLoading');
        
        // 判断是否需要生成新的大纲（没有缓存或容器为空）
        const needsGeneration = !cachedOutline || (!outlineContent && !hasStreamLoading);
        
        if (needsGeneration) {
            // 需要生成新大纲
            window.isGeneratingOutline = true;
            setTimeout(() => {
                generateOutline();
            }, 500);
        } else if (cachedOutline && !hasStreamLoading && !outlineContent?.children.length) {
            // 有缓存且不在生成中，恢复缓存内容（tab切换场景）
            restoreCachedOutline();
        }
    }
    // 如果跳转到小说步骤
    if (step === 4) {
        // 如果正在生成小说，不恢复缓存
        if (window.isGeneratingNovel) {
            // 生成函数会自己处理
            return;
        }
        
        // 检查是否有缓存的小说内容
        const cachedNovel = localStorage.getItem('currentNovel');
        const novelText = document.getElementById('novelText');
        
        // 如果没有内容也没有缓存，自动生成
        if (!cachedNovel && !novelText?.textContent) {
            window.isGeneratingNovel = true;
            setTimeout(() => {
                generateNovel();
            }, 500);
        } else if (cachedNovel && !novelText?.textContent) {
            // 如果有缓存，恢复缓存内容
            // TODO: 实现restoreCachedNovel函数
        }
    }
    // 如果跳转到脚本步骤
    if (step === 5) {
        // 如果正在生成脚本，不恢复缓存
        if (window.isGeneratingScript) {
            // 生成函数会自己处理
            return;
        }
        
        // 检查是否有缓存的脚本内容
        const cachedScript = localStorage.getItem('currentScript');
        const scriptText = document.getElementById('scriptText');
        
        // 如果没有内容也没有缓存，自动生成
        if (!cachedScript && !scriptText?.textContent) {
            window.isGeneratingScript = true;
            setTimeout(() => {
                generateScript();
            }, 500);
        } else if (cachedScript && !scriptText?.textContent) {
            // 如果有缓存，恢复缓存内容
            // TODO: 实现restoreCachedScript函数
        }
    }
}

// 检查步骤是否可访问
function canAccessStep(step) {
    // 模式选择始终可访问
    if (step === 0) return true;
    
    // 创意输入需要选择了定制模式，且已完成或正在进行
    if (step === 1) {
        return currentMode === 'custom' || workflowState.steps[1].completed;
    }
    
    // 脑洞生成需要选择了模式，或已经完成过
    if (step === 2) {
        return currentMode !== null || workflowState.steps[2].completed;
    }
    
    // 其他步骤：如果已完成则可以访问（允许返回修改）
    // 如果未完成，则需要满足前置条件
    if (step === 3) {
        // 大纲：已完成可返回，未完成需要选择了脑洞
        return workflowState.steps[3].completed || selectedIdea !== null;
    }
    
    if (step === 4) {
        // 小说：已完成可返回，未完成需要生成了大纲
        return workflowState.steps[4].completed || workflowState.steps[3].hasData;
    }
    
    if (step === 5) {
        // 脚本：已完成可返回，未完成需要生成了小说
        return workflowState.steps[5].completed || workflowState.steps[4].hasData;
    }
    
    return false;
}

// 跳转到小说步骤并生成
function goToNovelStep() {
    // 设置生成标记，防止缓存恢复
    window.isGeneratingNovel = true;
    
    // 跳转到小说页面
    goToStep(4);
    
    // 自动生成小说
    setTimeout(() => {
        generateNovel();
    }, 100);
}

// 跳转到脚本步骤并生成
function goToScriptStep() {
    // 设置生成标记，防止缓存恢复
    window.isGeneratingScript = true;
    
    // 跳转到脚本页面
    goToStep(5);
    
    // 自动生成脚本
    setTimeout(() => {
        generateScript();
    }, 100);
}

// 切换到下一步
function nextStep() {
    // 找到下一个有效步骤
    if (currentStep === 0) {
        currentStep = 2; // 从模式选择跳到脑洞生成
    } else if (currentStep === 2) {
        // 从脑洞生成到大纲创作
        currentStep = 3;
        // 设置生成标记，防止缓存恢复
        window.isGeneratingOutline = true;
    } else if (currentStep < 5) {
        currentStep++;
    }
    
    // 添加到历史记录
    if (!stepHistory.includes(currentStep)) {
        stepHistory.push(currentStep);
    }
    
    updateUI();
    
    // 在UI更新后处理自动生成
    if (currentStep === 3 && window.isGeneratingOutline) {
        // 自动生成大纲
        setTimeout(() => {
            generateOutline();
        }, 100);
    }
}

// 返回上一步
function prevStep() {
    if (currentStep === 2) {
        // 从脑洞生成返回
        if (currentMode === 'quick') {
            // 快速模式返回到模式选择
            currentStep = 0;
            currentMode = null;
            document.getElementById('modeIndicator').classList.add('hidden');
        } else if (currentMode === 'custom') {
            // 定制模式返回到创意输入
            currentStep = 1;
        }
    } else if (currentStep > 2) {
        currentStep--;
    }
    updateUI();
}

// 只更新进度条相关UI（不切换内容面板）
function updateProgressOnly() {
    // 更新步骤节点状态
    document.querySelectorAll('.step-node').forEach((node) => {
        const nodeStep = parseInt(node.dataset.step);
        
        // 检查是否可访问
        const accessible = canAccessStep(nodeStep);
        
        node.classList.remove('cursor-pointer', 'cursor-not-allowed', 'opacity-50');
        
        if (accessible) {
            node.classList.add('cursor-pointer');
            node.classList.remove('opacity-50');
            node.onclick = () => goToStep(nodeStep);
        } else {
            node.classList.add('cursor-not-allowed', 'opacity-50');
            node.onclick = null;
        }
    });
}

// 更新界面
function updateUI() {
    // 计算进度（基于可见步骤）
    let progressIndex = 0;
    if (currentStep === 0) {
        progressIndex = 0;
    } else if (currentStep === 1) {
        // 创意输入时，保持模式选择高亮
        progressIndex = 0;
    } else {
        progressIndex = visibleSteps.indexOf(currentStep);
    }
    
    // 计算进度（已删除进度条，此计算可保留用于其他逻辑）
    const progress = (progressIndex / (visibleSteps.length - 1)) * 100;
    
    // 更新步骤节点状态（只更新进度条上显示的节点）
    document.querySelectorAll('.step-node').forEach((node) => {
        const nodeStep = parseInt(node.dataset.step);
        const nodeDisplayIndex = parseInt(node.dataset.displayIndex);
        
        node.classList.remove('active', 'completed', 'cursor-pointer', 'cursor-not-allowed', 'opacity-50');
        
        // 检查是否可访问
        const accessible = canAccessStep(nodeStep);
        
        if (accessible) {
            node.classList.add('cursor-pointer');
            node.classList.remove('opacity-50');
            node.onclick = () => goToStep(nodeStep);
        } else {
            node.classList.add('cursor-not-allowed', 'opacity-50');
            node.onclick = null;
        }
        
        if (nodeDisplayIndex < progressIndex) {
            node.classList.add('completed');
            node.querySelector('.step-icon').classList.remove('text-gray-400');
        } else if (nodeDisplayIndex === progressIndex) {
            // 当前步骤始终显示active（包括创意输入时显示模式选择为active）
            node.classList.add('active');
            node.querySelector('.step-icon').classList.remove('text-gray-400');
        } else {
            node.querySelector('.step-icon').classList.add('text-gray-400');
        }
    });
    
    // 更新连接线状态（添加动画效果）- 优化：只有完成的步骤之间才显示连接线
    document.querySelectorAll('.progress-line').forEach((line, index) => {
        const wasActive = line.classList.contains('active');
        const wasCompleted = line.classList.contains('completed');
        
        line.classList.remove('active', 'completed', 'animating');
        
        // 只有当前步骤之前的连接线才显示为完成状态
        // 当前步骤不显示向后的连接线
        if (index < progressIndex - 1) {
            // 已完成的连接线
            line.classList.add('completed');
        } else if (index === progressIndex - 1 && progressIndex > 0) {
            // 正在进行的连接线（从上一个完成的步骤到当前步骤）
            // 添加填充动画
            if (!wasActive) {
                line.classList.add('animating');
                setTimeout(() => {
                    line.classList.remove('animating');
                    line.classList.add('active');
                }, 50);
            } else {
                line.classList.add('active');
            }
        }
        // 其他所有连接线保持默认状态（灰色）
    });
    
    // 更新步骤标签颜色和可访问性
    const stepLabels = document.querySelectorAll('.step-label');
    stepLabels.forEach((label) => {
        const labelStep = parseInt(label.dataset.step);
        const labelIndex = visibleSteps.indexOf(labelStep);
        
        label.classList.remove('text-green-600', 'text-gray-400', 'cursor-pointer', 'cursor-not-allowed');
        
        // 检查是否可访问
        const accessible = canAccessStep(labelStep);
        
        if (accessible) {
            label.disabled = false;
            label.classList.add('cursor-pointer');
            if (labelIndex <= progressIndex) {
                label.classList.add('text-green-600');
                label.classList.remove('text-gray-400');
            } else {
                label.classList.add('text-gray-400');
            }
        } else {
            label.disabled = true;
            label.classList.add('cursor-not-allowed', 'text-gray-400');
        }
    });
    
    // 切换内容面板 - 只在步骤改变时切换
    const currentPanel = document.getElementById(`step${currentStep}Content`);
    const isAlreadyActive = currentPanel && currentPanel.classList.contains('active');
    
    if (!isAlreadyActive) {
        document.querySelectorAll('.content-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        setTimeout(() => {
            if (currentPanel) {
                currentPanel.classList.add('active');
                // 加载对应步骤的内容
                loadStepContent(currentStep);
            }
        }, 100);
    }
}

// 初始化时加载localStorage数据
loadFromLocalStorage();

// 初始化
updateUI();