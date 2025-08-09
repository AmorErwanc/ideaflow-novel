// 全局变量
let currentStep = 0;
let currentMode = null;
let selectedMode = null; // 添加selectedMode变量
let currentStreamController = null;
let selectedIdea = null;
let stepHistory = [0]; // 记录已访问过的步骤

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

// 解析状态管理 - 针对极简格式优化
const parserState = {
    currentStoryNum: null,
    currentTag: null,
    buffer: '',
    stories: new Map(),
    lastProcessedIndex: 0,
    tagBuffer: ''
};

// 快速生成模式 - 直接跳到脑洞生成
function handleQuickGenerate() {
    console.log('快速生成模式 - 直接开始流式生成');
    currentMode = 'quick';
    selectedMode = 'quick'; // 设置选择的模式
    
    // 显示模式指示器
    const indicator = document.getElementById('modeIndicator');
    indicator.classList.remove('hidden');
    indicator.innerHTML = '<i class="fas fa-bolt mr-1"></i>灵感速写模式';
    
    // 直接跳到脑洞生成步骤
    currentStep = 2;
    updateUI();
    
    // 立即开始流式生成
    setTimeout(() => {
        startStreamingIdeas();
    }, 500);
}

// 定制模式 - 先到创意输入页
function handleCustomMode() {
    console.log('定制创作模式');
    currentMode = 'custom';
    selectedMode = 'custom'; // 设置选择的模式
    
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
    currentStep = 0;
    currentMode = null;
    document.getElementById('modeIndicator').classList.add('hidden');
    updateUI();
}

// 处理定制输入
function processCustomInput() {
    const input = document.getElementById('userCreativeInput').value.trim();
    if (!input) {
        alert('请输入你的创意想法');
        return;
    }
    
    // 保存用户输入到localStorage
    localStorage.setItem('userCreativeInput', input);
    
    // 跳到脑洞生成步骤
    currentStep = 2;
    updateUI();
    
    // 开始流式生成（传入用户输入）
    setTimeout(() => {
        startStreamingIdeas(input);
    }, 500);
}

// 跳转到指定步骤
function goToStep(step) {
    // 检查步骤是否可访问
    if (!canAccessStep(step)) {
        console.log(`⚠️ 步骤 ${step} 还不能访问`);
        return;
    }
    
    currentStep = step;
    
    // 添加到历史记录
    if (!stepHistory.includes(step)) {
        stepHistory.push(step);
    }
    
    updateUI();
    
    // 如果跳转到大纲步骤且还没有生成大纲，自动生成
    if (step === 3 && !document.getElementById('chaptersContainer')?.children.length) {
        setTimeout(() => {
            generateOutline();
        }, 500);
    }
    // 如果跳转到小说步骤且还没有生成小说，自动生成
    if (step === 4 && !document.getElementById('novelText')?.textContent) {
        setTimeout(() => {
            generateNovel();
        }, 500);
    }
    // 如果跳转到脚本步骤且还没有生成脚本，自动生成
    if (step === 5 && !document.getElementById('scenesContainer')?.children.length) {
        setTimeout(() => {
            generateScript();
        }, 500);
    }
}

// 检查步骤是否可访问
function canAccessStep(step) {
    // 模式选择始终可访问
    if (step === 0) return true;
    
    // 创意输入需要选择了定制模式
    if (step === 1) return currentMode === 'custom';
    
    // 脑洞生成需要选择了模式
    if (step === 2) return currentMode !== null;
    
    // 大纲创作需要选择了脑洞
    if (step === 3) return selectedIdea !== null;
    
    // 小说撰写需要生成了大纲
    if (step === 4) return stepHistory.includes(3);
    
    // 脚本生成需要生成了小说
    if (step === 5) return stepHistory.includes(4);
    
    return false;
}

// 切换到下一步
function nextStep() {
    // 找到下一个有效步骤
    if (currentStep === 0) {
        currentStep = 2; // 从模式选择跳到脑洞生成
    } else if (currentStep === 2) {
        // 从脑洞生成到大纲创作
        currentStep = 3;
        // 自动生成大纲
        setTimeout(() => {
            generateOutline();
        }, 500);
    } else if (currentStep < 5) {
        currentStep++;
    }
    
    // 添加到历史记录
    if (!stepHistory.includes(currentStep)) {
        stepHistory.push(currentStep);
    }
    
    updateUI();
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
    
    // 更新连接线状态
    document.querySelectorAll('.progress-line').forEach((line, index) => {
        line.classList.remove('active', 'completed');
        if (index < progressIndex) {
            line.classList.add('completed');
        } else if (index === progressIndex) {
            line.classList.add('active');
        }
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