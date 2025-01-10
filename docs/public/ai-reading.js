// 将所有 AI 相关功能放在全局 AI 对象中
(function() {
    // AI解读配置
    const AI_CONFIG = {
        API_URL: 'https://flow.ikun.jp/ai', // 添加 /ai 路径
        MODEL: 'deepseek-ai/DeepSeek-V2.5',
        TIMEOUT: 30000,
        MAX_RETRIES: 3,
        HEADERS: {
            'Content-Type': 'application/json',
        }
    };

    // 构建提示词函数
    function buildPrompt(question, cards) {
        let prompt = '';
        
        // 添加问题（如果有）
        if (question && question.trim()) {
            prompt += `问题：${question.trim()}\n\n`;
        }
        
        // 添加抽取的卡牌
        prompt += '抽取的卡牌：\n';
        cards.forEach(card => {
            prompt += `${card.title}\n${card.meaning}\n\n`;
        });
        
        // 添加解读指导
        prompt += '\n请你作为一位专业的塔罗牌解读师，根据以上抽取的卡牌和问题（如果有），给出详细的解读和建议。解读时请考虑：\n';
        prompt += '1. 每张牌的基本含义\n';
        prompt += '2. 牌与牌之间的关系\n';
        prompt += '3. 牌阵整体传达的信息\n';
        prompt += '4. 结合提问者的具体问题（如果有）\n';
        prompt += '5. 给出实际可行的建议\n\n';
        prompt += '请用通俗易懂的语言进行解读，并保持积极正面的态度。';
        
        return prompt;
    }

    // 将所有函数添加到全局 AI 对象
    window.AI = {
        async getReading(question, cards) {
            const prompt = this.generatePrompt(question, cards);
            let retryCount = 0;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.TIMEOUT);
            
            while (retryCount < AI_CONFIG.MAX_RETRIES) {
                try {
                    console.log('Sending request to:', AI_CONFIG.API_URL);
                    const response = await fetch(AI_CONFIG.API_URL, {
                        method: 'POST',
                        headers: AI_CONFIG.HEADERS,
                        body: JSON.stringify({ prompt }),
                        signal: controller.signal,
                        mode: 'cors',
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('API Error:', response.status, errorText);
                        throw new Error(`API request failed: ${errorText}`);
                    }
                    
                    if (!response.body) {
                        throw new Error('Response body is null');
                    }

                    clearTimeout(timeoutId);
                    return response.body;
                    
                } catch (error) {
                    console.error(`尝试 ${retryCount + 1}/${AI_CONFIG.MAX_RETRIES} 失败:`, error);
                    
                    if (error.name === 'AbortError') {
                        throw new Error('请求超时，请检查网络连接后重试');
                    }
                    
                    retryCount++;
                    
                    if (retryCount === AI_CONFIG.MAX_RETRIES) {
                        throw new Error(`AI解读服务暂时不可用: ${error.message}`);
                    }
                    
                    const delay = Math.min(1000 * Math.pow(2, retryCount) + Math.random() * 1000, 5000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        },
        
        generatePrompt(question, cards) {
            // 根据卡牌数量判断模式
            const mode = cards.length === 1 ? 'single' : 'spread';
            
            // 构建卡牌信息
            const cardsInfo = cards.map(card => 
                `${card.title}：${card.meaning}`
            ).join('\n');
            
            // 根据不同模式设置不同的提示词
            if (mode === 'single') {
                return `你是一位专业的塔罗牌解读师。请根据以下抽到的塔罗牌为用户做解读：

${cardsInfo}

${question ? `用户的问题是：${question}` : '这是一次日常运势的占卜。'}

请你以温和、积极的语气进行解读。解读内容应该：
1. 简明扼要地说明这张牌的核心含义
2. 结合用户的问题（如果有）或日常运势进行针对性解读
3. 给出积极的建议或指导
4. 避免过于消极或绝对的表述

请直接开始解读，不要重复问题或牌面信息。`;
            } else {
                return `你是一位专业的塔罗牌解读师。请根据以下抽到的塔罗牌阵为用户做解读：

${cardsInfo}

${question ? `用户的问题是：${question}` : '这是一次综合运势的占卜。'}

请你以温和、积极的语气进行解读。解读内容应该：
1. 分析每张牌之间的关联和整体含义
2. 结合用户的问题（如果有）进行针对性解读
3. 说明这个牌阵揭示的过去、现在、未来走向
4. 给出积极的建议或指导
5. 避免过于消极或绝对的表述

请直接开始解读，不要重复问题或牌面信息。`;
            }
        },
        
        // 解析 Markdown 文本
        parseMd(md) {
            return md
                // 处理标题
                .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                // 处理加粗
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                // 处理斜体
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                // 处理换行
                .replace(/\n/g, '<br>')
                // 处理列表
                .replace(/^\d\. (.*$)/gm, '<div class="list-item">$1</div>')
                .replace(/^- (.*$)/gm, '<div class="list-item">• $1</div>');
        },
        
        createStreamingContainer() {
            const container = document.createElement('div');
            container.className = 'ai-reading-container';
            container.innerHTML = `
                <div class="ai-reading-text"></div>
            `;
            
            // 添加样式
            const style = document.createElement('style');
            style.textContent = `
                .ai-reading-text {
                    text-align: left;
                    line-height: 1.6;
                    padding: 15px 0;
                }
                .ai-reading-text p {
                    margin: 0.5em 0;
                }
                .ai-reading-text h1, .ai-reading-text h2, .ai-reading-text h3 {
                    margin: 0.8em 0 0.4em;
                    color: #fff;
                }
                .ai-reading-text h1 { font-size: 1.4em; }
                .ai-reading-text h2 { font-size: 1.3em; }
                .ai-reading-text h3 { font-size: 1.2em; }
                .ai-reading-text strong { font-weight: 600; }
                .ai-reading-text em { font-style: italic; }
                .ai-reading-text blockquote {
                    border-left: 3px solid rgba(255,255,255,0.3);
                    margin: 0.6em 0;
                    padding-left: 10px;
                }
                .ai-reading-text li {
                    margin: 0.3em 0;
                    list-style: none;
                    padding-left: 15px;
                    position: relative;
                }
                .ai-reading-text li:before {
                    content: "•";
                    position: absolute;
                    left: 0;
                }
            `;
            document.head.appendChild(style);
            
            return container;
        },
        
        scrollToBottom(container) {
            if (!container) return;
            
            const scrollOptions = {
                top: container.offsetTop + container.offsetHeight,
                behavior: 'smooth'
            };

            // 检查是否需要滚动
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            const bottomOffset = scrollHeight - scrollTop - clientHeight;
            
            if (bottomOffset > 0) {
                window.scrollTo(scrollOptions);
            }
        },

        async handleReading() {
            const self = this;
            const aiBtn = document.querySelector('.ai-button');
            const questionInput = document.getElementById('questionInput');
            const readingSection = document.querySelector('.reading-section');
            
            try {
                aiBtn.textContent = '解读中...';
                aiBtn.disabled = true;

                // 移除之前的解读结果
                const oldContainer = document.querySelector('.ai-reading-container');
                if (oldContainer) {
                    oldContainer.remove();
                }

                const streamingContainer = self.createStreamingContainer();
                document.querySelector('.result-container').appendChild(streamingContainer);
                const textContainer = streamingContainer.querySelector('.ai-reading-text');
                
                let userInterrupted = false;
                const handleUserScroll = () => {
                    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
                    const scrolledToBottom = scrollHeight - scrollTop - clientHeight < 100;
                    userInterrupted = !scrolledToBottom;
                };
                
                window.addEventListener('scroll', handleUserScroll, { passive: true });
                
                try {
                    const cards = Array.from(readingSection.querySelectorAll('.card-info')).map(info => ({
                        title: info.querySelector('.card-title').textContent,
                        meaning: info.querySelector('.meaning').textContent
                    }));

                    const stream = await self.getReading(questionInput?.value || '', cards);
                    const reader = stream.getReader();
                    const decoder = new TextDecoder();
                    let fullText = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const text = decoder.decode(value);
                        const lines = text.split('\n').filter(line => line.trim() !== '');
                        
                        for (const line of lines) {
                            if (line.trim() === 'data: [DONE]') continue;
                            
                            if (line.startsWith('data: ')) {
                                try {
                                    const jsonStr = line.slice(6);
                                    const jsonData = JSON.parse(jsonStr);
                                    
                                    if (jsonData.choices && jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
                                        const content = jsonData.choices[0].delta.content;
                                        fullText += content;
                                        textContainer.innerHTML = this.parseMd(fullText);
                                        
                                        // 如果用户没有手动滚动，则自动滚动
                                        if (!userInterrupted) {
                                            this.scrollToBottom(streamingContainer);
                                        }
                                    }
                                } catch (e) {
                                    console.debug('跳过非 JSON 数据:', line);
                                    continue;
                                }
                            }
                        }
                    }
                    
                } finally {
                    window.removeEventListener('scroll', handleUserScroll);
                }
                
            } catch (error) {
                console.error('AI解读出错:', error);
            } finally {
                aiBtn.textContent = 'AI解读';
                aiBtn.disabled = false;
            }
        }
    };

    // 绑定方法到实例
    Object.keys(window.AI).forEach(key => {
        if (typeof window.AI[key] === 'function') {
            window.AI[key] = window.AI[key].bind(window.AI);
        }
    });

    console.log('AI module loaded successfully');
})(); 