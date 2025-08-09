// 页面内容模板
const pageTemplates = {
    // 步骤1: 创意输入模板
    step1: `
        <div class="mb-6">
            <h3 class="text-2xl font-bold text-gray-800 mb-2">
                <i class="fas fa-magic text-purple-500 mr-2"></i>定制创作输入
            </h3>
            <p class="text-gray-600">输入你的创意想法，AI将基于此生成脑洞</p>
        </div>
        
        <div class="bg-gray-50 rounded-xl p-6">
            <div class="mb-4">
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                    <i class="fas fa-pen-fancy mr-1"></i>你的创意想法
                </label>
                <textarea 
                    id="userCreativeInput"
                    class="w-full p-4 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none" 
                    rows="4" 
                    placeholder="描述你想要的故事类型、主题、角色设定等...&#10;例如：一个关于时间旅行者的故事，主角每次回到过去都会失去一段记忆..."></textarea>
            </div>
            
            <!-- 数量选择器 -->
            <div class="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <label class="block text-sm font-semibold text-gray-700 mb-3">
                    <i class="fas fa-layer-group mr-1 text-purple-600"></i>生成脑洞数量
                </label>
                
                <!-- 滑块和数字显示 -->
                <div class="flex items-center gap-4 mb-3">
                    <div class="flex-1 relative">
                        <input 
                            type="range" 
                            id="ideaCountSlider" 
                            min="1" 
                            max="15" 
                            value="6" 
                            class="w-full h-2 bg-gradient-to-r from-blue-200 to-purple-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                            oninput="updateIdeaCount(this.value)">
                        
                        <!-- 刻度标记 -->
                        <div class="flex justify-between mt-1 px-1">
                            <span class="text-xs text-gray-500">1</span>
                            <span class="text-xs text-gray-500">5</span>
                            <span class="text-xs text-gray-500">10</span>
                            <span class="text-xs text-gray-500">15</span>
                        </div>
                    </div>
                    
                    <!-- 数字显示器 -->
                    <div class="flex items-center">
                        <div class="relative">
                            <div class="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg">
                                <span id="ideaCountDisplay" class="text-2xl font-bold text-white">6</span>
                            </div>
                            <div class="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                                <i class="fas fa-lightbulb text-yellow-500 text-xs"></i>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 快速选择按钮 -->
                <div class="flex gap-2">
                    <button onclick="setIdeaCount(6)" class="quick-select-btn px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-medium transition-all">
                        标准数量 (6)
                    </button>
                    <button onclick="setIdeaCount(9)" class="quick-select-btn px-3 py-1.5 bg-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white border border-gray-300 rounded-lg text-sm font-medium transition-all">
                        丰富选择 (9)
                    </button>
                    <button onclick="setIdeaCount(12)" class="quick-select-btn px-3 py-1.5 bg-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white border border-gray-300 rounded-lg text-sm font-medium transition-all">
                        更多选择 (12)
                    </button>
                    <button onclick="setIdeaCount(15)" class="quick-select-btn px-3 py-1.5 bg-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white border border-gray-300 rounded-lg text-sm font-medium transition-all">
                        最大数量 (15)
                    </button>
                </div>
                
                <div class="mt-2 text-xs text-gray-600 flex items-center">
                    <i class="fas fa-info-circle mr-1 text-blue-500"></i>
                    <span>数量越多，生成时间越长，但选择更丰富</span>
                </div>
            </div>
            
            <div class="flex items-center justify-between">
                <div class="text-sm text-gray-500">
                    <i class="fas fa-keyboard mr-1"></i>已输入 <span id="inputCharCount">0</span> 字
                </div>
                <button onclick="processCustomInput()" class="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all">
                    <i class="fas fa-sparkles mr-2"></i>生成脑洞
                </button>
            </div>
        </div>
        
        <div class="flex justify-between mt-6">
            <button onclick="goBackToModeSelection()" class="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all">
                <i class="fas fa-arrow-left mr-2"></i>返回选择
            </button>
        </div>
    `,

    // 步骤2: 脑洞生成模板
    step2: `
        <div class="mb-6">
            <h3 class="text-2xl font-bold text-gray-800 mb-2">
                <i class="fas fa-brain text-pink-500 mr-2"></i>AI创意脑洞
            </h3>
            <p class="text-gray-600">实时流式生成创意脑洞，点击选择你喜欢的创意</p>
        </div>
        
        <!-- 脑洞容器 -->
        <div id="ideasContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- 动态生成的脑洞卡片 -->
        </div>
        
        <!-- 底部控制区域（初始隐藏） -->
        <div id="ideasBottomControls" style="display: none;" class="opacity-0 transform translate-y-4 transition-all duration-500">
            <!-- 优化建议输入区 -->
            <div class="bg-gray-50 rounded-xl p-4 mb-4">
                <div class="flex flex-col md:flex-row items-center gap-4">
                    <div class="relative flex-1 w-full">
                        <input 
                            type="text" 
                            id="optimizeIdeasInput" 
                            class="w-full p-3 pl-10 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
                            placeholder="输入优化建议，比如：需要更多科幻元素...">
                        <i class="fas fa-comment-dots text-gray-400 absolute left-3 top-3.5"></i>
                    </div>
                    <button onclick="regenerateIdeas()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium transition-colors flex items-center">
                        <i class="fas fa-sync-alt mr-2"></i>重新生成
                    </button>
                </div>
            </div>
            
            <div class="flex justify-between mt-6">
                <button onclick="prevStep()" class="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all">
                    <i class="fas fa-arrow-left mr-2"></i>返回
                </button>
                <button onclick="nextStep()" id="nextToOutlineBtn" class="bg-gray-300 text-gray-500 px-8 py-3 rounded-lg font-medium cursor-not-allowed" disabled>
                    下一步: 生成大纲 <i class="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        </div>
    `,

    // 步骤3: 大纲创作模板
    step3: `
        <div class="mb-6">
            <h3 class="text-2xl font-bold text-gray-800 mb-2">
                <i class="fas fa-list-alt text-blue-500 mr-2"></i>故事大纲
            </h3>
            <p class="text-gray-600">基于选择的脑洞生成详细大纲</p>
        </div>
        
        <!-- 大纲展示容器 -->
        <div id="outlineContainer" class="bg-gray-50 rounded-xl p-6">
            <!-- 动态生成的大纲内容 -->
        </div>
        
        <div class="flex justify-between mt-6">
            <button onclick="prevStep()" class="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all">
                <i class="fas fa-arrow-left mr-2"></i>返回
            </button>
            <button onclick="generateNovel()" id="generateNovelBtn" class="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
                下一步: 撰写小说 <i class="fas fa-arrow-right ml-2"></i>
            </button>
        </div>
    `,

    // 步骤4: 小说撰写模板
    step4: `
        <div class="mb-6">
            <h3 class="text-2xl font-bold text-gray-800 mb-2">
                <i class="fas fa-book text-purple-500 mr-2"></i>小说内容
            </h3>
            <p class="text-gray-600">AI创作完整的小说内容</p>
        </div>
        
        <!-- 小说内容容器 -->
        <div id="novelContainer" class="bg-gray-50 rounded-xl p-6" style="max-height: 600px; overflow-y: auto;">
            <!-- 动态生成的小说内容 -->
        </div>
        
        <div class="flex justify-between mt-6">
            <button onclick="prevStep()" class="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all">
                <i class="fas fa-arrow-left mr-2"></i>返回
            </button>
            <button onclick="generateScript()" id="generateScriptBtn" class="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
                下一步: 生成脚本 <i class="fas fa-arrow-right ml-2"></i>
            </button>
        </div>
    `,

    // 步骤5: 脚本生成模板
    step5: `
        <div class="mb-6">
            <h3 class="text-2xl font-bold text-gray-800 mb-2">
                <i class="fas fa-film text-orange-500 mr-2"></i>互动脚本
            </h3>
            <p class="text-gray-600">将小说转换为互动脚本</p>
        </div>
        
        <!-- 脚本内容容器 -->
        <div id="scriptContainer" class="bg-gray-50 rounded-xl p-6" style="max-height: 600px; overflow-y: auto;">
            <!-- 动态生成的脚本内容 -->
        </div>
        
        <div class="flex justify-between mt-6">
            <button onclick="prevStep()" class="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all">
                <i class="fas fa-arrow-left mr-2"></i>返回
            </button>
            <button onclick="completeWorkflow()" class="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
                <i class="fas fa-check-circle mr-2"></i>完成创作
            </button>
        </div>
    `
};

// 加载步骤内容
function loadStepContent(step) {
    const contentPanel = document.getElementById(`step${step}Content`);
    if (contentPanel && pageTemplates[`step${step}`]) {
        // 如果内容为空才加载模板
        if (!contentPanel.innerHTML.trim()) {
            contentPanel.innerHTML = pageTemplates[`step${step}`];
            
            // 初始化特定步骤的功能
            if (step === 1) {
                // 初始化字数统计
                const userInput = document.getElementById('userCreativeInput');
                if (userInput) {
                    userInput.addEventListener('input', function() {
                        document.getElementById('inputCharCount').textContent = this.value.length;
                    });
                }
            }
        }
    }
}