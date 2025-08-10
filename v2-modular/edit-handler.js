// 编辑功能相关函数
let editingElements = new Map(); // 存储正在编辑的元素和原始内容

// 初始化可编辑内容
function initEditableContent() {
    // 只为尚未绑定事件的编辑图标添加点击事件
    const editIcons = document.querySelectorAll('.edit-icon:not([data-initialized])');
    console.log('🔧 初始化编辑功能，找到图标数量:', editIcons.length);
    editIcons.forEach(icon => {
        icon.addEventListener('click', handleEditIconClick);
        icon.setAttribute('data-initialized', 'true');
    });
}

// 处理编辑图标点击
function handleEditIconClick(e) {
    e.stopPropagation();
    e.preventDefault();
    
    // 使用closest向上查找到包含编辑内容的容器
    const container = e.target.closest('.idea-title, .idea-content');
    if (container) {
        const editable = container.querySelector('.editable');
        if (editable) {
            console.log('✏️ 开始编辑:', editable.dataset.type, editable.dataset.id);
            startEdit(editable);
        } else {
            console.warn('⚠️ 无法找到可编辑元素');
        }
    } else {
        console.warn('⚠️ 无法找到容器元素');
    }
}

// 开始编辑
function startEdit(elem) {
    // 如果已经在编辑中，不重复操作
    if (elem.contentEditable === 'true') return;
    
    // 保存原始内容
    editingElements.set(elem, elem.textContent);
    
    // 设置可编辑
    elem.contentEditable = true;
    elem.classList.add('editing');
    elem.focus();
    
    // 选中所有文本
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(elem);
    sel.removeAllRanges();
    sel.addRange(range);
    
    // 使用closest查找容器
    const container = elem.closest('.idea-title, .idea-content');
    if (container) {
        // 显示保存/取消按钮
        const controls = container.querySelector('.edit-controls');
        if (controls) {
            controls.classList.add('show');
        }
        
        // 隐藏编辑图标
        const editIcon = container.querySelector('.edit-icon');
        if (editIcon) {
            editIcon.style.display = 'none';
        }
    }
    
    // 添加键盘事件
    elem.addEventListener('keydown', handleKeyDown);
}

// 处理键盘事件
function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const container = e.target.closest('.idea-title, .idea-content');
        if (container) {
            const saveBtn = container.querySelector('.save-btn');
            if (saveBtn) {
                saveBtn.click();
            }
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        const container = e.target.closest('.idea-title, .idea-content');
        if (container) {
            const cancelBtn = container.querySelector('.cancel-btn');
            if (cancelBtn) {
                cancelBtn.click();
            }
        }
    }
}

// 保存按钮点击
function saveEditBtn(btn, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    // 使用closest向上查找到包含编辑内容的容器
    const container = btn.closest('.idea-title, .idea-content');
    if (container) {
        const editable = container.querySelector('.editable');
        if (editable) {
            saveEdit(editable);
        } else {
            console.warn('⚠️ 无法找到可编辑元素');
        }
    }
    return false;
}

// 取消按钮点击
function cancelEditBtn(btn, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    // 使用closest向上查找到包含编辑内容的容器
    const container = btn.closest('.idea-title, .idea-content');
    if (container) {
        const editable = container.querySelector('.editable');
        if (editable) {
            cancelEdit(editable);
        } else {
            console.warn('⚠️ 无法找到可编辑元素');
        }
    }
    return false;
}

// 保存编辑
function saveEdit(elem) {
    // 避免重复调用
    if (!elem || elem.contentEditable !== 'true') return;
    
    const newContent = elem.textContent.trim();
    const type = elem.dataset.type;
    const id = elem.dataset.id;
    const originalContent = editingElements.get(elem);
    
    // 先退出编辑状态
    elem.contentEditable = false;
    elem.classList.remove('editing');
    
    // 使用closest查找容器
    const container = elem.closest('.idea-title, .idea-content');
    
    // 使用setTimeout确保DOM更新完成
    setTimeout(() => {
        if (container) {
            // 隐藏控制按钮
            const controls = container.querySelector('.edit-controls');
            if (controls) {
                controls.classList.remove('show');
            }
            
            // 显示编辑图标
            const editIcon = container.querySelector('.edit-icon');
            if (editIcon) {
                editIcon.style.display = '';
            }
        }
    }, 10);
    
    // 移除事件监听器
    elem.removeEventListener('keydown', handleKeyDown);
    
    // 如果内容有变化，保存到localStorage
    if (newContent !== originalContent) {
        saveToLocalStorage(type, id, newContent);
        showSaveHint();
        
        // 更新对应的mock数据
        updateMockData(type, id, newContent);
        
        // 根据编辑的类型，静默清理后续数据
        if (typeof clearDependentSteps === 'function') {
            if (type === 'idea-title' || type === 'idea-content') {
                // 编辑脑洞内容，清理大纲及后续
                clearDependentSteps(2);
                console.log('💾 保存脑洞编辑，已清理后续步骤数据');
            } else if (type.includes('outline')) {
                // 编辑大纲内容，清理小说及后续
                clearDependentSteps(3);
                console.log('💾 保存大纲编辑，已清理后续步骤数据');
            } else if (type.includes('novel')) {
                // 编辑小说内容，清理脚本
                clearDependentSteps(4);
                console.log('💾 保存小说编辑，已清理后续步骤数据');
            }
        }
    }
    
    // 清除编辑记录
    editingElements.delete(elem);
}

// 取消编辑
function cancelEdit(elem) {
    // 避免重复调用
    if (!elem || elem.contentEditable !== 'true') return;
    
    const originalContent = editingElements.get(elem);
    if (originalContent !== undefined) {
        elem.textContent = originalContent;
    }
    
    // 先退出编辑状态
    elem.contentEditable = false;
    elem.classList.remove('editing');
    
    // 使用closest查找容器
    const container = elem.closest('.idea-title, .idea-content');
    
    // 使用setTimeout确保DOM更新完成
    setTimeout(() => {
        if (container) {
            // 隐藏控制按钮
            const controls = container.querySelector('.edit-controls');
            if (controls) {
                controls.classList.remove('show');
            }
            
            // 显示编辑图标
            const editIcon = container.querySelector('.edit-icon');
            if (editIcon) {
                editIcon.style.display = '';
            }
        }
    }, 10);
    
    // 移除事件监听器
    elem.removeEventListener('keydown', handleKeyDown);
    
    // 清除编辑记录
    editingElements.delete(elem);
}

// 保存到localStorage
function saveToLocalStorage(type, id, content) {
    const key = `novel_${type}_${id}`;
    localStorage.setItem(key, content);
    console.log(`✅ 已保存: ${type}_${id}`, content);
}

// 显示保存提示
function showSaveHint() {
    const hint = document.getElementById('saveHint');
    hint.classList.add('show');
    
    setTimeout(() => {
        hint.classList.remove('show');
    }, 2000);
}

// 将函数暴露到全局作用域，以便HTML中的onclick可以调用
window.saveEditBtn = saveEditBtn;
window.cancelEditBtn = cancelEditBtn;
window.initEditableContent = initEditableContent;