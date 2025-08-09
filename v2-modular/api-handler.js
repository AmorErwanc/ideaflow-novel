// API处理相关函数

// API配置
const API_CONFIG = {
    ideas: 'https://n8n.games/webhook/c78e428c-bc35-4d74-a52a-65328e76f6bd',
    outline: 'https://n8n.games/webhook-test/fdd124d6-8faa-433f-8c03-ca38f91245ec',
    novel: 'https://n8n.games/webhook-test/3d68b832-8645-4013-b210-64f9ce510875',
    script: 'https://n8n.games/webhook-test/42c7a477-b620-44ed-894a-59099d267d49'
};

// 生成会话ID
function generateSessionId() {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// 获取或创建会话ID
function getSessionId() {
    if (!window.currentSessionId) {
        window.currentSessionId = generateSessionId();
    }
    return window.currentSessionId;
}

// 发送脑洞生成请求（流式）
async function generateIdeasAPI(mode, prompt = null, count = 5) {
    const sessionId = getSessionId();
    const requestBody = {
        action: 'generate',
        mode: mode,
        prompt: prompt,
        count: count,
        session_id: sessionId
    };

    console.log('🚀 发送脑洞生成请求:', requestBody);

    try {
        const response = await fetch(API_CONFIG.ideas, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 返回response以便流式处理
        return response;
    } catch (error) {
        console.error('❌ 脑洞生成请求失败:', error);
        throw error;
    }
}

// 重新生成脑洞（流式）
async function regenerateIdeasAPI(mode, prompt, optimization = null, selectedIdea = null, previousIdeas = [], count = 5) {
    const sessionId = getSessionId();
    const requestBody = {
        action: 'regenerate',
        mode: mode,
        prompt: prompt,
        count: count,
        regenerate_context: {
            selected_idea: selectedIdea,
            optimization: optimization,
            previous_ideas: previousIdeas
        },
        session_id: sessionId
    };

    console.log('🔄 发送重新生成请求:', requestBody);

    try {
        const response = await fetch(API_CONFIG.ideas, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
    } catch (error) {
        console.error('❌ 重新生成请求失败:', error);
        throw error;
    }
}

// 处理流式响应
async function processStreamResponse(response, onChunk, onComplete) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                // 处理剩余的buffer
                if (buffer.trim()) {
                    processBufferLine(buffer, onChunk);
                }
                if (onComplete) onComplete();
                break;
            }

            // 解码并添加到buffer
            buffer += decoder.decode(value, { stream: true });
            
            // 按行处理
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留最后一个不完整的行
            
            for (const line of lines) {
                if (line.trim()) {
                    processBufferLine(line, onChunk);
                }
            }
        }
    } catch (error) {
        console.error('❌ 流式处理错误:', error);
        throw error;
    }
}

// 处理单行数据
function processBufferLine(line, onChunk) {
    try {
        const data = JSON.parse(line);
        
        if (data.type === 'item' && data.content) {
            // 调用回调处理内容
            if (onChunk) {
                onChunk(data.content);
            }
        } else if (data.type === 'begin') {
            console.log('📝 流式输出开始:', data.metadata);
        } else if (data.type === 'end') {
            console.log('✅ 流式输出结束');
        }
    } catch (error) {
        // 不是JSON格式，可能是普通文本
        console.warn('解析行数据失败:', line);
    }
}

// 生成大纲API
async function generateOutlineAPI(selectedIdea) {
    const sessionId = getSessionId();
    const requestBody = {
        action: 'generate',
        idea: selectedIdea,
        session_id: sessionId
    };

    console.log('📝 发送大纲生成请求:', requestBody);

    try {
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

        return response;
    } catch (error) {
        console.error('❌ 大纲生成请求失败:', error);
        throw error;
    }
}

// 生成小说API
async function generateNovelAPI(outline) {
    const sessionId = getSessionId();
    const requestBody = {
        action: 'generate',
        outline: outline,
        session_id: sessionId
    };

    console.log('📚 发送小说生成请求:', requestBody);

    try {
        const response = await fetch(API_CONFIG.novel, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
    } catch (error) {
        console.error('❌ 小说生成请求失败:', error);
        throw error;
    }
}

// 生成脚本API
async function generateScriptAPI(novelContent) {
    const sessionId = getSessionId();
    const requestBody = {
        action: 'generate',
        novel_content: novelContent,
        session_id: sessionId
    };

    console.log('🎬 发送脚本生成请求:', requestBody);

    try {
        const response = await fetch(API_CONFIG.script, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
    } catch (error) {
        console.error('❌ 脚本生成请求失败:', error);
        throw error;
    }
}