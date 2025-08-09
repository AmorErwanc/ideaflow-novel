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
    
    // 查找对应的可编辑元素
    // 编辑图标可能是wrapper的下一个兄弟元素
    let wrapper = e.target.previousElementSibling;
    if (wrapper && (wrapper.classList.contains('title-wrapper') || wrapper.classList.contains('content-wrapper'))) {
        const editable = wrapper.querySelector('.editable');
        if (editable) {
            startEdit(editable);
            return;
        }
    }
    
    // 兼容旧结构
    let editable = e.target.previousElementSibling;
    while (editable && !editable.classList.contains('editable')) {
        editable = editable.previousElementSibling;
    }
    
    if (editable && editable.classList.contains('editable')) {
        startEdit(editable);
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
    
    // 显示保存/取消按钮
    const parent = elem.parentElement;
    const controls = parent.querySelector('.edit-controls');
    if (controls) {
        controls.classList.add('show');
    }
    
    // 隐藏编辑图标
    const editIcon = parent.querySelector('.edit-icon');
    if (editIcon) {
        editIcon.style.display = 'none';
    }
    
    // 添加键盘事件
    elem.addEventListener('keydown', handleKeyDown);
}

// 处理键盘事件
function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const parent = e.target.parentElement;
        const saveBtn = parent.querySelector('.save-btn');
        if (saveBtn) {
            saveBtn.click();
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        const parent = e.target.parentElement;
        const cancelBtn = parent.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.click();
        }
    }
}

// 保存按钮点击
function saveEditBtn(btn, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const parent = btn.parentElement.parentElement;
    const editable = parent.querySelector('.editable');
    if (editable) {
        saveEdit(editable);
    }
    return false;
}

// 取消按钮点击
function cancelEditBtn(btn, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const parent = btn.parentElement.parentElement;
    const editable = parent.querySelector('.editable');
    if (editable) {
        cancelEdit(editable);
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
    
    // 使用setTimeout确保DOM更新完成
    setTimeout(() => {
        // 隐藏控制按钮
        const parent = elem.parentElement;
        const controls = parent.querySelector('.edit-controls');
        if (controls) {
            controls.classList.remove('show');
        }
        
        // 显示编辑图标
        const editIcon = parent.querySelector('.edit-icon');
        if (editIcon) {
            editIcon.style.display = '';
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
    
    // 使用setTimeout确保DOM更新完成
    setTimeout(() => {
        // 隐藏控制按钮
        const parent = elem.parentElement;
        const controls = parent.querySelector('.edit-controls');
        if (controls) {
            controls.classList.remove('show');
        }
        
        // 显示编辑图标
        const editIcon = parent.querySelector('.edit-icon');
        if (editIcon) {
            editIcon.style.display = '';
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