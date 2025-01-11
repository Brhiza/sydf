// 将常量配置抽离出来
const CONFIG = {
    ANIMATION_DURATION: 500,
    DISPLAY_DELAY: 1000,
    COPY_FEEDBACK_DURATION: 2000,
    MAX_WAIT_TIME: 10000,
    POLL_INTERVAL: 100,
    MODES: {
        single: { cards: 1, allowQuestion: true, requireQuestion: true },
        classic: { cards: 3, allowQuestion: true, requireQuestion: true },
        timeline: { cards: 3, allowQuestion: true, requireQuestion: true },
        daily: { cards: 1, allowQuestion: false, autoAI: true },
        choice: { cards: 5, allowQuestion: true, requireQuestion: false }
    }
};

// 监听 DOM 变化
const observer = new MutationObserver((mutations) => {
    // 使用 for...of 替代 forEach 以提高性能
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue; // 快速跳过非元素节点
            
            // 使用单次查询并缓存结果
            const isAIButton = node.classList?.contains('ai-button');
            const hasQuestionInput = node.id === 'questionInput' || node.querySelector('#questionInput');
            
            if (isAIButton) {
                node.addEventListener('click', handleAIButton, { once: true }); // 使用 once 选项
                console.log('AI 按钮被创建');
            }
            
            if (hasQuestionInput) {
                console.log('输入框被创建');
            }
        }
    }
});

// 优化观察配置，只观察需要的变化
observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
});

function handleAIButton(event) {
    const target = event.target;
    if (!target.classList.contains('ai-button')) return;
    
    const questionInput = document.getElementById('questionInput');
    const questionValue = questionInput?.value.trim();
    
    if (currentMode === 'choice' || questionValue) {
        window.AI.handleReading();
        return;
    }
    
    // 只有在非二选一模式下才要求输入问题
    const questionSection = document.querySelector('.question-section');
    if (!questionSection) return;
    
    questionSection.classList.remove('hidden');
    
    // 使用 requestAnimationFrame 优化动画性能
    const animate = () => {
        questionSection.classList.add('fade-in');
        questionInput?.focus();
    };
    requestAnimationFrame(animate);
    
    // 使用事件委托优化事件监听
    if (questionInput && !questionInput.dataset.hasKeyListener) {
        questionInput.dataset.hasKeyListener = 'true';
        questionInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                window.AI.handleReading();
            }
        });
    }
}

// 只导出函数
window.handleButtonClick = handleAIButton;

// 简单的页面加载提示
console.log('页面加载完成，等待用户操作...');

// 确保 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 加载完成');
    
    // 绑定 AI 按钮点击事件
    const aiButton = document.querySelector('.ai-button');
    if (aiButton) {
        console.log('找到 AI 按钮');
        aiButton.addEventListener('click', handleAIButton);
    } else {
        console.error('未找到 AI 按钮');
    }
    
    // 检查输入框
    const questionInput = document.getElementById('questionInput');
    if (questionInput) {
        console.log('找到输入框');
    } else {
        console.error('未找到输入框');
    }
});

// 定义全局变量
let currentCards = [];

// 全局变量来存储当前选择的模式
let currentMode = 'single';

// 初始化大阿卡纳牌组
let majorArcanaCards = [];

// 优化 secureRandom 函数，添加缓存以提高性能
const secureRandom = (() => {
    const cache = new Uint8Array(128); // 预分配缓冲区
    let index = cache.length;
    
    return (min, max) => {
        if (index >= cache.length) {
            crypto.getRandomValues(cache);
            index = 0;
        }
        
        const range = max - min;
        const value = cache[index++];
        return min + (value % range);
    };
})();

// 优化洗牌函数
function shuffleCards() {
    function performTraditionalShuffle(deck) {
        // 优化的瀑布洗牌
        function riffleShuffleOnce(cards) {
            const mid = Math.floor(cards.length / 2);
            const shuffled = new Array(cards.length);
            let left = 0, right = mid, index = 0;
            
            while (left < mid && right < cards.length) {
                const takeCount = secureRandom(1, 4);
                if (secureRandom(0, 2)) {
                    for(let i = 0; i < takeCount && left < mid; i++) {
                        shuffled[index++] = cards[left++];
                    }
                } else {
                    for(let i = 0; i < takeCount && right < cards.length; i++) {
                        shuffled[index++] = cards[right++];
                    }
                }
            }
            
            // 添加剩余的牌
            while (left < mid) shuffled[index++] = cards[left++];
            while (right < cards.length) shuffled[index++] = cards[right++];
            
            // 直接修改原数组
            for(let i = 0; i < cards.length; i++) {
                cards[i] = shuffled[i];
            }
        }

        // 优化的印度式洗牌
        function hinduShuffleOnce(cards) {
            const len = cards.length;
            for(let i = 0; i < len; i++) {
                const chunkSize = secureRandom(3, 8);
                const targetPos = secureRandom(0, i + 1);
                // 内部块移动
                const temp = cards[i];
                for(let j = i; j > targetPos; j--) {
                    cards[j] = cards[j-1];
                }
                cards[targetPos] = temp;
            }
        }

        // 优化的切牌
        function pileShuffle(cards) {
            const pileCount = secureRandom(3, 8);
            const piles = Array(pileCount).fill().map(() => []);
            
            // 分牌
            let currentPile = 0;
            for(const card of cards) {
                piles[currentPile].push(card);
                currentPile = (currentPile + 1) % pileCount;
            }
            
            // 收集牌堆
            let index = 0;
            while(piles.some(pile => pile.length)) {
                const availablePiles = piles.filter(pile => pile.length);
                const pile = availablePiles[secureRandom(0, availablePiles.length)];
                while(pile.length) {
                    cards[index++] = pile.pop();
                }
            }
        }

        // 执行洗牌流程
        for(let i = 0; i < 3; i++) {
            riffleShuffleOnce(deck);
        }
        
        for(let i = 0; i < 2; i++) {
            hinduShuffleOnce(deck);
        }
        
        pileShuffle(deck);
        
        // 最终切牌
        const cutPoint = secureRandom(0, deck.length);
        const temp = deck.splice(0, cutPoint);
        deck.push(...temp);
    }

    // 根据模式初始化牌组
    if (currentMode === 'timeline') {
        if (majorArcanaCards.length === 0) {
            majorArcanaCards = window.tarotCards.slice(0, 22);
        }
        currentCards = majorArcanaCards;
    } else {
        currentCards = window.tarotCards.slice();
    }
    
    performTraditionalShuffle(currentCards);
}

// 优化模板创建，将模板移到函数外部
const TEMPLATES = {
    cardInner: document.createElement('template'),
    cardInfo: document.createElement('template')
};

TEMPLATES.cardInner.innerHTML = `
    <div class="card-inner">
        <img alt="">
    </div>
`;

TEMPLATES.cardInfo.innerHTML = `
    <div class="card-info hidden">
        <h3 class="card-title"></h3>
        <p class="meaning"></p>
    </div>
`;

// 修改 createCardElement 和 createReadingElement 函数使用这些模板
const createCardElement = (card, isReversed, index) => {
    const element = TEMPLATES.cardInner.content.cloneNode(true).firstElementChild;
    if (isReversed) {
        element.style.transform = 'rotate(180deg)';
    }
    
    const img = element.querySelector('img');
    img.src = card.image;
    img.alt = card.name;
    
    return element;
};

const createReadingElement = (card, isReversed, index) => {
    const element = TEMPLATES.cardInfo.content.cloneNode(true).firstElementChild;
    const title = element.querySelector('.card-title');
    const meaning = element.querySelector('.meaning');
    
    title.textContent = `${card.name}${isReversed ? '（逆位）' : ''}`;
    meaning.textContent = isReversed ? card.meaning.reversed : card.meaning.upright;
    
    return element;
};

// 优化复制结果函数
async function copyResult() {
    try {
        const questionInput = document.getElementById('questionInput');
        const readingSection = document.querySelector('.reading-section');
        if (!readingSection) return;
        
        const resultParts = [];
        
        // 添加问题（如果有）
        const questionValue = questionInput?.value.trim();
        if (questionValue) {
            resultParts.push(`我的问题：${questionValue}\n\n`);
        }
        
        // 使用更高效的方式收集卡牌信息
        resultParts.push('抽取的卡牌：\n');
        
        const cardInfos = readingSection.querySelectorAll('.card-info');
        for (const info of cardInfos) {
            const title = info.querySelector('.card-title')?.textContent ?? '';
            const meaning = info.querySelector('.meaning')?.textContent ?? '';
            resultParts.push(`${title}\n${meaning}\n\n`);
        }
        
        // 添加 AI 解读内容（如果有）
        const aiReadingText = document.querySelector('.ai-reading-text');
        if (aiReadingText && aiReadingText.textContent.trim()) {
            resultParts.push('AI解读：\n');
            // 移除 HTML 标签，保留纯文本
            const aiText = aiReadingText.textContent.trim()
                .replace(/\n\s*\n/g, '\n\n') // 规范化多个换行
                .replace(/\s+/g, ' ') // 规范化空白字符
                .trim();
            resultParts.push(`${aiText}\n`);
        }
        
        const resultText = resultParts.join('');
        await navigator.clipboard.writeText(resultText);
        
        const copyBtn = document.querySelector('.copy-button');
        if (copyBtn) {
            copyBtn.textContent = '已复制';
            setTimeout(() => {
                copyBtn.textContent = '复制结果';
            }, CONFIG.COPY_FEEDBACK_DURATION);
        }
    } catch (err) {
        console.error('复制失败:', err);
    }
}

// 优化 AI 解读函数
async function getAIReading() {
    try {
        const questionInput = document.getElementById('questionInput');
        const readingSection = document.querySelector('.reading-section');
        if (!readingSection) return;
        
        const promptParts = [];
        
        const questionValue = questionInput?.value.trim();
        if (questionValue) {
            promptParts.push(`问题：${questionValue}\n\n`);
        }
        
        promptParts.push('抽取的卡牌：\n');
        
        const cardInfos = readingSection.querySelectorAll('.card-info');
        for (const info of cardInfos) {
            const title = info.querySelector('.card-title')?.textContent ?? '';
            const meaning = info.querySelector('.meaning')?.textContent ?? '';
            promptParts.push(`${title}\n${meaning}\n\n`);
        }
        
        promptParts.push('\n请你作为一位专业的塔罗牌解读师，根据以上抽取的卡牌和问题（如果有），给出详细的解读和建议。解读时请考虑：\n');
        promptParts.push('1. 每张牌的基本含义\n');
        promptParts.push('2. 牌与牌之间的关系\n');
        promptParts.push('3. 牌阵整体传达的信息\n');
        promptParts.push('4. 结合提问者的具体问题（如果有）\n');
        promptParts.push('5. 给出实际可行的建议\n\n');
        promptParts.push('请用通俗易懂的语言进行解读，并保持积极正面的态度。');
        
        const promptText = promptParts.join('');
        await navigator.clipboard.writeText(promptText);
        
        const aiBtn = document.querySelector('.ai-button');
        if (aiBtn) {
            aiBtn.textContent = '已复制提示词';
            setTimeout(() => {
                aiBtn.textContent = 'AI解读';
            }, CONFIG.COPY_FEEDBACK_DURATION);
        }
    } catch (err) {
        console.error('复制失败:', err);
    }
}

// 等待模块加载
function waitForAIModule() {
    return new Promise((resolve) => {
        if (window.aiModuleLoaded) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.aiModuleLoaded) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, CONFIG.POLL_INTERVAL);
            
            // 10秒后超时
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
                console.error('AI模块加载超时');
            }, CONFIG.MAX_WAIT_TIME);
        }
    });
}

// 初始化函数
function initializeTarot() {
    // 绑定导航点击事件
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // 更新选中状态
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            // 更新当前模式
            currentMode = item.dataset.mode;
            
            // 重置抽牌区域
            resetDrawArea();
        });
    });

    // 设置初始模式
    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav) {
        currentMode = activeNav.dataset.mode;
    }
}

// 重置抽牌区域
function resetDrawArea() {
    const controls = document.querySelector('.controls');
    if (!controls) return;
    
    controls.innerHTML = `
        <div class="input-container">
            <div class="guidance-text">
                <p>现在静下心来</p>
                <p>选择并心中默念困扰你的问题</p>
                <p>然后点击抽取你的牌</p>
            </div>
            <button class="draw-button" id="initialDraw">抽牌</button>
        </div>
    `;
    
    const initialDrawButton = document.getElementById('initialDraw');
    if (initialDrawButton) {
        initialDrawButton.addEventListener('click', drawCards);
    }
}

// 增强性能监控
const Performance = {
    marks: new Map(),
    measures: new Map(),
    metrics: new Map(),
    
    start(name) {
        performance.mark(`${name}_start`);
        this.marks.set(name, performance.now());
        
        // 记录内存使用
        if (performance.memory) {
            this.metrics.set(`${name}_memory_start`, {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize
            });
        }
    },
    
    end(name) {
        const startMark = `${name}_start`;
        const endMark = `${name}_end`;
        
        performance.mark(endMark);
        performance.measure(name, startMark, endMark);
        
        const measure = performance.getEntriesByName(name).pop();
        this.measures.set(name, measure.duration);
        
        // 记录内存变化
        if (performance.memory) {
            const startMemory = this.metrics.get(`${name}_memory_start`);
            const endMemory = {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize
            };
            
            const memoryDiff = {
                used: endMemory.usedJSHeapSize - startMemory.usedJSHeapSize,
                total: endMemory.totalJSHeapSize - startMemory.totalJSHeapSize
            };
            
            this.metrics.set(`${name}_memory_diff`, memoryDiff);
        }
        
        console.debug(`${name} performance:`, {
            duration: `${measure.duration.toFixed(2)}ms`,
            memoryDiff: this.metrics.get(`${name}_memory_diff`)
        });
        
        return measure.duration;
    },
    
    getStats() {
        return Object.fromEntries(this.measures);
    },
    
    clear() {
        performance.clearMarks();
        performance.clearMeasures();
        this.marks.clear();
        this.measures.clear();
        this.metrics.clear();
    }
};

// 修改抽牌函数
function drawCards() {
    Performance.start('drawCards');
    try {
        // 平滑滚动到顶部
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        // 移除现有的事件监听器和容器
        const oldContainer = document.querySelector('.result-container');
        if (oldContainer) {
            // 清理所有相关的事件监听器
            const oldRedrawContainer = oldContainer.querySelector('.redraw-container');
            if (oldRedrawContainer) {
                oldRedrawContainer.removeEventListener('click', handleControlButtons);
                const oldQuestionInput = oldContainer.querySelector('#questionInput');
                if (oldQuestionInput && oldQuestionInput.dataset.hasKeyListener) {
                    oldQuestionInput.removeEventListener('keyup', handleEnterKey);
                }
            }
            oldContainer.remove();
        }

        const container = document.getElementById('tarotContainer');
        let numCards;
        let currentDeck;
        let allowQuestion = true;
        let autoAI = false;
        
        switch(currentMode) {
            case 'choice':
                numCards = 5;
                currentDeck = currentCards;
                break;
            case 'daily':
                numCards = 1;
                currentDeck = currentCards;
                allowQuestion = false;
                autoAI = true;
                break;
            case 'single':
                numCards = 1;
                currentDeck = currentCards;
                break;
            case 'classic':
                numCards = 3;
                currentDeck = currentCards;
                break;
            case 'timeline':
                numCards = 3;
                if (majorArcanaCards.length === 0) {
                    majorArcanaCards = window.tarotCards.slice(0, 22).map(card => ({...card}));
                }
                currentDeck = majorArcanaCards;
                break;
            default:
                numCards = 3;
                currentDeck = currentCards;
        }
        
        // 检查牌组是否需要重新洗牌
        if (currentCards.length < numCards) {
            shuffleCards();
        }
        
        // 隐藏初始的抽牌按钮和引导文字
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer) {
            inputContainer.style.opacity = '0';
            setTimeout(() => {
                inputContainer.style.display = 'none';
            }, CONFIG.ANIMATION_DURATION);
        }
        
        // 创建结果容器
        container.innerHTML = `
            <div class="cards-display"></div>
            <div class="result-container hidden">
                <div class="reading-content">
                    <p class="section-title">抽取的卡牌：</p>
                    <div class="reading-section"></div>
                    ${currentMode !== 'daily' ? `
                        <div class="question-section hidden">
                            <p class="question-title">记录下你的问题：</p>
                            <textarea id="questionInput" placeholder="在这里写下你的问题..." rows="3"></textarea>
                        </div>
                    ` : ''}
                    <div class="redraw-container hidden">
                        <button class="draw-button copy-button" onclick="copyResult()">复制结果</button>
                        <button class="draw-button redraw">重新抽牌</button>
                        ${currentMode !== 'daily' ? `
                            <button class="draw-button ai-button">AI解读</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // 抽取卡片并显示
        const cardsDisplay = container.querySelector('.cards-display');
        const readingSection = container.querySelector('.reading-section');
        
        const drawnCards = [];
        const cardElements = [];
        const readingElements = [];
        
        for (let i = 0; i < numCards; i++) {
            const card = currentCards.pop();
            const isReversed = Math.random() < 0.5;
            drawnCards.push({ card, isReversed });
            
            cardElements.push(createCardElement(card, isReversed, i));
            readingElements.push(createReadingElement(card, isReversed, i));
        }
        
        // 显示卡片动画
        for (let i = 0; i < numCards; i++) {
            cardsDisplay.appendChild(cardElements[i]);
            cardElements[i].style.opacity = '0';
            cardElements[i].style.transform = drawnCards[i].isReversed ? 
                'translateX(-100%) rotate(180deg)' : 'translateX(-100%)';
                
            setTimeout(() => {
                cardElements[i].style.transition = 'all 0.5s ease';
                cardElements[i].style.opacity = '1';
                cardElements[i].style.transform = drawnCards[i].isReversed ? 
                    'translateX(0) rotate(180deg)' : 'translateX(0)';
            }, i * CONFIG.ANIMATION_DURATION + CONFIG.DISPLAY_DELAY);
        }
        
        // 等待所有卡片动画完成后再显示结果
        setTimeout(() => {
            const resultContainer = container.querySelector('.result-container');
            
            // 先添加所有卡牌信息
            readingElements.forEach(element => {
                element.classList.remove('hidden');
                readingSection.appendChild(element);
            });
            
            requestAnimationFrame(() => {
                resultContainer.classList.remove('hidden');
                
                setTimeout(() => {
                    resultContainer.classList.add('fade-in');
                    
                    // 根据模式决定是否显示问题区域
                    if (allowQuestion) {
                        const questionSection = resultContainer.querySelector('.question-section');
                        questionSection.classList.remove('hidden');
                        questionSection.classList.add('fade-in');
                    }
                    
                    // 显示按钮区域
                    const redrawContainer = resultContainer.querySelector('.redraw-container');
                    redrawContainer.classList.remove('hidden');
                    redrawContainer.classList.add('fade-in');
                    
                    // 如果是今日运势模式，自动触发 AI 解读
                    if (autoAI) {
                        setTimeout(() => {
                            window.AI.handleReading();
                        }, 500);
                    }
                    
                    // 添加按钮事件监听
                    redrawContainer.addEventListener('click', handleControlButtons);
                }, 50);
            });
        }, numCards * CONFIG.ANIMATION_DURATION + CONFIG.DISPLAY_DELAY * 2);
        
        Performance.end('drawCards');
    } catch (error) {
        Performance.end('drawCards');
        console.error('抽牌过程出错:', error);
    }
}

// 将函数声明移到最前面
window.drawCards = drawCards;

// 初始化日志
console.log('Main script loaded');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    const initialDrawButton = document.getElementById('initialDraw');
    if (initialDrawButton) {
        initialDrawButton.addEventListener('click', drawCards);
    }
    console.log('页面加载完成，等待用户操作...');
});

// 页面加载完成后初始化
window.addEventListener('load', initializeTarot);

// 优化状态管理，添加事件处理
const State = {
    current: {
        mode: 'single',
        cards: [],
        majorArcana: [],
        isDrawing: false,
        isAnimating: false
    },
    
    listeners: new Map(), // 使用 Map 来管理不同类型的监听器
    
    update(changes) {
        const oldState = { ...this.current };
        Object.assign(this.current, changes);
        this.notify('change', { oldState, newState: this.current });
    },
    
    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(listener);
        return () => this.off(event, listener);
    },
    
    off(event, listener) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.delete(listener);
        }
    },
    
    notify(event, data) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.forEach(listener => listener(data));
        }
    }
};

// 使用状态管理
function switchMode(mode) {
    State.update({ mode });
    if (mode === 'timeline') {
        State.update({
            majorArcana: window.tarotCards.slice(0, 22).map(card => ({...card})),
            cards: [...State.current.majorArcana]
        });
    } else {
        State.update({
            cards: window.tarotCards.map(card => ({...card}))
        });
    }
    shuffleCards();
}

// 修改 CSS 确保输入框可见性
const style = document.createElement('style');
style.textContent = `
    .question-section {
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: auto !important;
        z-index: 1000;
    }
    
    .question-section.fade-in {
        opacity: 1;
    }
    
    .question-section:not(.hidden) {
        display: block !important;
        visibility: visible !important;
    }
    
    #questionInput {
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        position: relative !important;
        z-index: 1001;
        display: block !important;
        -webkit-appearance: none;
    }
    
    #questionInput:focus {
        outline: 2px solid rgba(255, 255, 255, 0.3);
    }

    /* 增大抽牌按钮尺寸并修复 WebKit 按钮样式 */
    @media (max-width: 768px) {
        #initialDraw {
            padding: 15px 30px !important;
            font-size: 18px !important;
            min-width: 150px !important;
        }

        /* 只修复复制和重新抽牌按钮样式 */
        .copy-button,
        .redraw {
            -webkit-appearance: none !important;
            background: rgba(0, 0, 0, 0.3) !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            color: #fff !important;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
            border-radius: 8px !important; /* 增加圆角 */
        }

        .copy-button:active,
        .redraw:active {
            background: rgba(0, 0, 0, 0.4) !important;
        }

        /* 移除 AI 按钮的样式覆盖 */
        .ai-button {
            /* 保持原有样式 */
        }
    }
`;
document.head.appendChild(style);

// 添加全局事件监听器
document.addEventListener('DOMContentLoaded', () => {
    const questionInput = document.getElementById('questionInput');
    if (questionInput) {
        questionInput.setAttribute('tabindex', '0');
    }
});

// 添加新的控制按钮处理函数
function handleControlButtons(event) {
    const target = event.target;
    
    if (target.classList.contains('redraw')) {
        // 重新抽牌
        location.reload();
    } else if (target.classList.contains('copy-button')) {
        // 复制结果
        copyResult();
    } else if (target.classList.contains('ai-button')) {
        // AI 解读
        handleAIButton(event);
    }
}

// 添加全局错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
    // 可以添加错误提示UI
});

// 添加 Promise 错误处理
window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的 Promise 错误:', event.reason);
    // 可以添加错误提示UI
});

// 添加内存管理工具
const MemoryManager = {
    weakRefs: new WeakMap(),
    
    track(object, cleanup) {
        this.weakRefs.set(object, cleanup);
    },
    
    release(object) {
        const cleanup = this.weakRefs.get(object);
        if (cleanup) {
            cleanup();
            this.weakRefs.delete(object);
        }
    },
    
    clear() {
        // WeakMap 会自动清理未引用的对象
        console.debug('Memory cleanup performed');
    }
};

// 优化清理函数
function cleanup() {
    // 取消所有动画
    AnimationManager.cancelAll();
    
    // 清理资源
    ResourceManager.clear();
    
    // 清理性能标记
    Performance.clear();
    
    // 清理内存
    MemoryManager.clear();
    
    // 重置状态
    State.update({
        mode: 'single',
        cards: [],
        majorArcana: [],
        isDrawing: false,
        isAnimating: false
    });
    
    // 清理全局变量
    currentCards = [];
    majorArcanaCards = [];
}

// 在页面卸载时调用清理函数
window.addEventListener('unload', cleanup);

// 添加事件处理工具函数
const EventHandler = {
    // 防抖函数
    debounce(fn, delay = 250) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },
    
    // 事件委托
    delegate(element, eventType, selector, handler) {
        element.addEventListener(eventType, event => {
            const target = event.target.closest(selector);
            if (target && element.contains(target)) {
                handler.call(target, event);
            }
        });
    }
};

// 使用事件委托优化按钮点击处理
function initializeControls(container) {
    EventHandler.delegate(container, 'click', '.redraw-container button', event => {
        const target = event.target;
        if (target.classList.contains('redraw')) {
            location.reload();
        } else if (target.classList.contains('copy-button')) {
            copyResult();
        } else if (target.classList.contains('ai-button')) {
            handleAIButton(event);
        }
    });
}

// 添加资源预加载函数
const ResourceManager = {
    resources: new Map(),
    loadingPromises: new Map(),
    
    async preload(type, resources) {
        const promises = resources.map(resource => this.load(type, resource));
        return Promise.all(promises);
    },
    
    async load(type, resource) {
        const key = `${type}:${resource}`;
        
        if (this.resources.has(key)) {
            return this.resources.get(key);
        }
        
        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key);
        }
        
        const loadPromise = new Promise((resolve, reject) => {
            switch (type) {
                case 'image': {
                    const img = new Image();
                    img.onload = () => {
                        this.resources.set(key, img);
                        this.loadingPromises.delete(key);
                        resolve(img);
                    };
                    img.onerror = reject;
                    img.src = resource;
                    break;
                }
                // 可以添加其他资源类型的处理
            }
        });
        
        this.loadingPromises.set(key, loadPromise);
        return loadPromise;
    },
    
    clear() {
        this.resources.clear();
        this.loadingPromises.clear();
    }
};

// 使用资源管理器预加载图片
document.addEventListener('DOMContentLoaded', () => {
    ResourceManager.preload('image', window.tarotCards.map(card => card.image))
        .catch(error => ErrorHandler.handle(error, 'preloadImages'));
});

// 添加错误处理工具
const ErrorHandler = {
    errors: [],
    maxErrors: 10,
    recoveryStrategies: new Map(),
    
    // 添加恢复策略
    addRecoveryStrategy(errorType, strategy) {
        this.recoveryStrategies.set(errorType, strategy);
    },
    
    async handle(error, context = '') {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        };
        
        this.errors.push(errorInfo);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
        
        console.error(`Error in ${context}:`, error);
        
        // 尝试恢复
        const strategy = this.recoveryStrategies.get(error.name) || 
                        this.recoveryStrategies.get('default');
        
        if (strategy) {
            try {
                await strategy(error, context);
                console.log(`Recovery successful for ${context}`);
            } catch (recoveryError) {
                console.error('Recovery failed:', recoveryError);
                this.showErrorToUser(context);
            }
        } else {
            this.showErrorToUser(context);
        }
    },
    
    showErrorToUser(context) {
        const message = document.createElement('div');
        message.className = 'error-message fade-in';
        message.textContent = `操作失败，请稍后重试`;
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.classList.add('fade-out');
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }
};

// 添加默认恢复策略
ErrorHandler.addRecoveryStrategy('default', async (error, context) => {
    // 重置状态
    State.update({
        isDrawing: false,
        isAnimating: false
    });
    
    // 取消所有动画
    AnimationManager.cancelAll();
    
    // 重新加载资源
    await ResourceManager.preload('image', window.tarotCards.map(card => card.image));
});

// 添加动画管理器
const AnimationManager = {
    animations: new Map(),
    
    async animate(element, keyframes, options) {
        // 添加硬件加速
        element.style.willChange = 'transform, opacity';
        
        if (this.animations.has(element)) {
            this.animations.get(element).cancel();
        }
        
        const animation = element.animate(keyframes, {
            ...options,
            composite: 'replace', // 优化合成
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)' // 使用更平滑的缓动
        });
        
        this.animations.set(element, animation);
        
        try {
            await animation.finished;
            element.style.willChange = 'auto'; // 动画结束后释放
            this.animations.delete(element);
        } catch (error) {
            element.style.willChange = 'auto';
            this.animations.delete(element);
            throw error;
        }
    },
    
    cancelAll() {
        this.animations.forEach(animation => animation.cancel());
        this.animations.clear();
    }
};

// 优化卡片动画函数
async function animateCard(cardElement, isReversed, index) {
    const delay = index * (CONFIG.ANIMATION_DURATION / 2); // 错开动画时间
    
    const startTransform = isReversed ? 
        'translate3d(-100%, 0, 0) rotate3d(0, 0, 1, 180deg)' : 
        'translate3d(-100%, 0, 0)';
    const endTransform = isReversed ? 
        'translate3d(0, 0, 0) rotate3d(0, 0, 1, 180deg)' : 
        'translate3d(0, 0, 0)';
        
    await AnimationManager.animate(cardElement, [
        { opacity: 0, transform: startTransform },
        { opacity: 1, transform: endTransform }
    ], {
        duration: CONFIG.ANIMATION_DURATION,
        delay,
        fill: 'forwards'
    });
}

function copyReading() {
    let contentText = '';
    
    // 获取塔罗牌解读内容
    const readingSection = document.querySelector('.reading-section');
    console.log('Reading section:', readingSection); // 调试日志
    
    if (readingSection) {
        const cardInfos = readingSection.querySelectorAll('.card-info');
        console.log('Card infos:', cardInfos); // 调试日志
        
        cardInfos.forEach(info => {
            const title = info.querySelector('.card-title')?.textContent || '';
            const meaning = info.querySelector('.meaning')?.textContent || '';
            contentText += `${title}\n${meaning}\n\n`;
        });
    }
    
    // 获取 AI 解读内容
    const aiResultContainer = document.querySelector('.ai-result-container');
    console.log('AI container:', aiResultContainer); // 调试日志
    
    if (aiResultContainer) {
        const aiText = aiResultContainer.querySelector('.ai-reading-text')?.textContent?.trim();
        console.log('AI text:', aiText); // 调试日志
        if (aiText) {
            contentText += `\nAI解读：\n${aiText}`;
        }
    }
    
    console.log('Final content:', contentText); // 调试日志
    
    // 如果没有内容，直接返回
    if (!contentText.trim()) {
        console.error('没有找到可复制的内容');
        return;
    }
    
    // 创建临时文本区域
    const textarea = document.createElement('textarea');
    textarea.value = contentText;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    
    try {
        // 选择并复制文本
        textarea.select();
        document.execCommand('copy');
        
        // 显示复制成功提示
        const copyButton = document.querySelector('.copy-button');
        const originalText = copyButton.textContent;
        copyButton.textContent = '复制成功';
        setTimeout(() => {
            copyButton.textContent = originalText;
        }, 2000);
    } catch (err) {
        console.error('复制失败:', err);
    } finally {
        // 移除临时文本区域
        document.body.removeChild(textarea);
    }
}

function addAIReading(text) {
    const aiReadingText = document.querySelector('.ai-reading-text');
    if (aiReadingText) {
        aiReadingText.textContent = text;
        console.log('AI reading added:', text); // 调试日志
    } else {
        console.error('AI reading container not found');
    }
}

// 修改 AI 解读函数中的提示词生成
window.AI.generatePrompt = function(question, cards) {
    const mode = currentMode;
    const cardsInfo = cards.map(card => 
        `${card.title}：${card.meaning}`
    ).join('\n');
    
    if (mode === 'choice') {
        const promptQuestion = question?.trim() 
            ? `用户的问题是：${question}`
            : '这是一次二选一抉择占卜，用户希望在两个选择之间得到指引。';

        return `你是一位专业的塔罗牌解读师。${promptQuestion}

抽到的塔罗牌是：
${cardsInfo}

这个二选一牌阵的五张牌分别代表：
1. 第一张牌：当前处境
2. 第二张牌：选择A的结果
3. 第三张牌：选择B的结果
4. 第四张牌：内在建议
5. 第五张牌：外在影响

请你以温和、积极的语气进行解读。解读内容应该：
1. 先分析当前处境
2. 分别解读两个选择可能带来的结果
3. 结合内在建议和外在影响
4. 给出综合性的建议
5. 避免做出绝对的选择，而是帮助提问者看清利弊

请直接开始解读，不要重复问题或牌面信息。`;
    } else if (mode === 'daily') {
        return `你是一位专业的塔罗牌解读师。这是一次今日运势占卜，抽到的塔罗牌是：

${cardsInfo}

请你以温和、积极的语气解读今天的整体运势。解读内容应该：
1. 简明扼要地说明这张牌对今日运势的指引
2. 提供具体的建议，帮助改善今日运势

请直接开始解读，不要重复牌面信息。`;
    } else if (mode === 'single') {
        // ... 现有的 single 模式提示词 ...
    } else {
        // ... 现有的其他模式提示词 ...
    }
};