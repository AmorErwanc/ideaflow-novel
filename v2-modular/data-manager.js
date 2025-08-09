// 模拟的脑洞数据
const mockIdeas = [
    { title: "量子纠缠的爱情", content: "在量子计算机普及的未来，两个程序员发现他们的意识在量子层面产生了纠缠，每当一个人做梦时，另一个人就会进入对方的梦境..." },
    { title: "时间图书馆", content: "一个神秘的图书馆，每本书都连接着不同的时间线。图书管理员必须守护这些书籍，防止有人改写历史..." },
    { title: "AI侦探社", content: "第一家由AI运营的侦探社开业了，他们通过分析大数据来破案，但突然接到了一个连AI都无法理解的神秘案件..." },
    { title: "梦境交易所", content: "在这里，人们可以买卖彼此的梦境，直到有人发现了操控现实的方法..." },
    { title: "最后的手写信", content: "在数字化的未来，一封手写信引发了一场跨越时空的寻找..." }
];

// 模拟的大纲数据
const mockOutline = {
    title: "量子纠缠的爱情",
    genre: "科幻爱情",
    chapters: [
        {
            number: "第一章",
            title: "量子实验室的邂逅",
            summary: "两位量子物理学家在进行纠缠态实验时，意外发现他们的意识可以通过量子纠缠进行连接..."
        },
        {
            number: "第二章",
            title: "梦境的交织",
            summary: "当一个人入睡时，另一个人便会进入对方的梦境，他们开始在梦中探索彼此的内心世界..."
        },
        {
            number: "第三章",
            title: "现实的距离",
            summary: "尽管意识相连，但他们在现实中相隔千里，必须面对物理距离带来的挑战..."
        },
        {
            number: "第四章",
            title: "量子崩塌的危机",
            summary: "实验出现意外，量子纠缠开始不稳定，他们可能永远失去这种连接..."
        },
        {
            number: "第五章",
            title: "跨越时空的重逢",
            summary: "通过最后的努力，他们找到了在现实中相遇的方法，量子纠缠成为了永恒的纽带..."
        }
    ]
};

// 模拟的小说内容
const mockNovel = {
    title: "量子纠缠的爱情",
    content: `第一章　量子实验室的邂逅

深夜的量子物理实验室里，只有机器的嗡鸣声和键盘的敲击声。李墨凝视着屏幕上跳动的数据，眉头紧锁。

"又是一组异常数据。"她自言自语道，揉了揉疲惫的眼睛。

就在这时，实验室的门被推开了。"还在加班？"一个温和的声音传来。

她抬起头，看到了新来的研究员陈宇。月光透过窗户洒在他身上，让他整个人看起来有些不真实。

"量子纠缠态的实验数据出现了一些...有趣的现象。"李墨指着屏幕说道。

陈宇走近，当他的手无意中碰到李墨的手时，两人同时感到一阵奇异的眩晕。屏幕上的数据突然剧烈波动起来，仿佛两个量子系统产生了前所未有的纠缠...

第二章　梦境的交织

那天晚上，李墨做了一个奇怪的梦。

她站在一片星空下，周围是无边的宇宙。突然，她听到了熟悉的声音："你也在这里？"

转过身，她看到了陈宇，同样一脸惊讶地看着她。

"这是梦吗？"李墨问道。

"如果是梦，为什么我们会在同一个梦里？"陈宇回答。

他们很快发现，自从实验室的那次接触后，每当一个人入睡，另一个人就会进入对方的梦境。在梦中，他们可以分享记忆、情感，甚至思想...

（后续章节内容省略...）`
};

// 模拟的脚本内容
const mockScript = {
    title: "量子纠缠的爱情 - 互动脚本",
    scenes: [
        {
            scene: "场景1",
            location: "量子实验室 - 深夜",
            description: "【灯光】昏暗，只有电脑屏幕的光芒\n【音效】机器嗡鸣声，键盘敲击声",
            dialogue: [
                { character: "李墨", action: "（盯着屏幕，自言自语）", line: "又是一组异常数据..." },
                { character: "陈宇", action: "（推门而入）", line: "还在加班？" },
                { character: "互动选择", options: ["A. 继续研究数据", "B. 邀请陈宇一起查看", "C. 准备离开"] }
            ]
        },
        {
            scene: "场景2",
            location: "梦境空间 - 星空下",
            description: "【视觉效果】璀璨星空，漂浮感\n【音效】空灵的背景音乐",
            dialogue: [
                { character: "李墨", action: "（环顾四周）", line: "这是哪里？" },
                { character: "陈宇", action: "（出现）", line: "你也在这里？" },
                { character: "系统提示", text: "玩家可以选择探索梦境的不同区域" }
            ]
        }
    ]
};

// 更新mock数据
function updateMockData(type, id, content) {
    if (type === 'idea-title') {
        const index = parseInt(id) - 1;
        if (mockIdeas[index]) {
            mockIdeas[index].title = content;
        }
    } else if (type === 'idea-content') {
        const index = parseInt(id) - 1;
        if (mockIdeas[index]) {
            mockIdeas[index].content = content;
        }
    } else if (type === 'outline-title') {
        mockOutline.title = content;
    } else if (type === 'outline-genre') {
        mockOutline.genre = content;
    } else if (type.startsWith('chapter-')) {
        const parts = type.split('-');
        const chapterIndex = parseInt(id) - 1;
        if (mockOutline.chapters[chapterIndex]) {
            if (parts[1] === 'title') {
                mockOutline.chapters[chapterIndex].title = content;
            } else if (parts[1] === 'summary') {
                mockOutline.chapters[chapterIndex].summary = content;
            }
        }
    }
}

// 从 localStorage加载内容
function loadFromLocalStorage() {
    // 加载脑洞数据
    mockIdeas.forEach((idea, index) => {
        const titleKey = `novel_idea-title_${index + 1}`;
        const contentKey = `novel_idea-content_${index + 1}`;
        
        const savedTitle = localStorage.getItem(titleKey);
        const savedContent = localStorage.getItem(contentKey);
        
        if (savedTitle) idea.title = savedTitle;
        if (savedContent) idea.content = savedContent;
    });
    
    // 加载大纲数据
    const outlineTitle = localStorage.getItem('novel_outline-title_1');
    const outlineGenre = localStorage.getItem('novel_outline-genre_1');
    
    if (outlineTitle) mockOutline.title = outlineTitle;
    if (outlineGenre) mockOutline.genre = outlineGenre;
    
    // 加载章节数据
    mockOutline.chapters.forEach((chapter, index) => {
        const titleKey = `novel_chapter-title_${index + 1}`;
        const summaryKey = `novel_chapter-summary_${index + 1}`;
        
        const savedTitle = localStorage.getItem(titleKey);
        const savedSummary = localStorage.getItem(summaryKey);
        
        if (savedTitle) chapter.title = savedTitle;
        if (savedSummary) chapter.summary = savedSummary;
    });
}