// 下载处理相关函数

// 通用下载文本文件函数
function downloadTextFile(content, filename) {
    // 创建Blob对象
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    
    // 创建下载链接
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    // 显示成功提示
    showDownloadSuccess(filename);
}

// 下载小说内容
function downloadNovel() {
    const content = novelParserState.content || localStorage.getItem('currentNovel');
    
    if (!content) {
        showError('没有可下载的小说内容');
        return;
    }
    
    // 获取小说标题作为文件名
    const selectedStory = parserState.stories.get(String(selectedIdea));
    const title = selectedStory ? selectedStory.title : '小说';
    
    // 生成文件名（添加时间戳避免重复）
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${title}_小说_${timestamp}.txt`;
    
    // 格式化内容（添加标题和创建信息）
    const formattedContent = `【小说标题】${title}
【创建时间】${new Date().toLocaleString('zh-CN')}
【创作平台】AI小说创作平台

========================================

${content}

========================================
【本作品由AI小说创作平台生成】`;
    
    downloadTextFile(formattedContent, filename);
}

// 下载脚本内容
function downloadScript() {
    const content = scriptParserState.content || localStorage.getItem('currentScript');
    
    if (!content) {
        showError('没有可下载的脚本内容');
        return;
    }
    
    // 获取标题作为文件名
    const selectedStory = parserState.stories.get(String(selectedIdea));
    const title = selectedStory ? selectedStory.title : '脚本';
    
    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${title}_互动脚本_${timestamp}.txt`;
    
    // 格式化内容
    const formattedContent = `【脚本标题】${title}
【创建时间】${new Date().toLocaleString('zh-CN')}
【创作平台】AI小说创作平台
【脚本类型】互动剧本

========================================

${content}

========================================
【本脚本由AI小说创作平台生成】`;
    
    downloadTextFile(formattedContent, filename);
}

// 下载大纲内容
function downloadOutline() {
    const outline = outlineParserState.outline;
    
    if (!outline.open && !outline.build && !outline.turn && !outline.end) {
        showError('没有可下载的大纲内容');
        return;
    }
    
    // 获取标题
    const selectedStory = parserState.stories.get(String(selectedIdea));
    const title = selectedStory ? selectedStory.title : '大纲';
    
    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${title}_大纲_${timestamp}.txt`;
    
    // 格式化大纲内容
    const formattedContent = `【大纲标题】${title}
【创建时间】${new Date().toLocaleString('zh-CN')}
【创作平台】AI小说创作平台

========================================

【起：开篇】
${outline.open}

【承：发展】
${outline.build}

【转：高潮】
${outline.turn}

【合：结局】
${outline.end}

========================================
【本大纲由AI小说创作平台生成】`;
    
    downloadTextFile(formattedContent, filename);
}

// 显示下载成功提示
function showDownloadSuccess(filename) {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2 download-toast';
    toast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>已下载: ${filename}</span>
    `;
    
    // 添加淡入动画
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease-out';
    
    document.body.appendChild(toast);
    
    // 触发动画
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    // 3秒后自动消失
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// 导出函数供其他模块使用
window.downloadNovel = downloadNovel;
window.downloadScript = downloadScript;
window.downloadOutline = downloadOutline;
window.downloadTextFile = downloadTextFile;