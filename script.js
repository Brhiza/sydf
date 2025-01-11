const CONFIG={ANIMATION_DURATION:500,DISPLAY_DELAY:1e3,COPY_FEEDBACK_DURATION:2e3,MAX_WAIT_TIME:1e4,POLL_INTERVAL:100,MODES:{single:{cards:1,allowQuestion:!0,requireQuestion:!0},classic:{cards:3,allowQuestion:!0,requireQuestion:!0},timeline:{cards:3,allowQuestion:!0,requireQuestion:!0},daily:{cards:1,allowQuestion:!1,autoAI:!0},choice:{cards:5,allowQuestion:!0,requireQuestion:!1}}},observer=new MutationObserver(e=>{for(let t of e)for(let r of t.addedNodes){if(1!==r.nodeType)continue;let a=r.classList?.contains("ai-button"),n="questionInput"===r.id||r.querySelector("#questionInput");a&&(r.addEventListener("click",handleAIButton,{once:!0}),console.log("AI 按钮被创建")),n&&console.log("输入框被创建")}});function handleAIButton(e){let t=e.target;if(!t.classList.contains("ai-button"))return;let r=document.getElementById("questionInput"),a=r?.value.trim();if("choice"===currentMode||a){window.AI.handleReading();return}let n=document.querySelector(".question-section");if(!n)return;n.classList.remove("hidden");let i=()=>{n.classList.add("fade-in"),r?.focus()};requestAnimationFrame(i),r&&!r.dataset.hasKeyListener&&(r.dataset.hasKeyListener="true",r.addEventListener("keyup",e=>{"Enter"!==e.key||e.shiftKey||(e.preventDefault(),window.AI.handleReading())}))}observer.observe(document.body,{childList:!0,subtree:!0,attributes:!1,characterData:!1}),window.handleButtonClick=handleAIButton,console.log("页面加载完成，等待用户操作..."),document.addEventListener("DOMContentLoaded",()=>{console.log("DOM 加载完成");let e=document.querySelector(".ai-button");e?(console.log("找到 AI 按钮"),e.addEventListener("click",handleAIButton)):console.error("未找到 AI 按钮");let t=document.getElementById("questionInput");t?console.log("找到输入框"):console.error("未找到输入框")});let currentCards=[],currentMode="single",majorArcanaCards=[];const secureRandom=(()=>{let e=new Uint8Array(128),t=e.length;return(r,a)=>{t>=e.length&&(crypto.getRandomValues(e),t=0);let n=a-r,i=e[t++];return r+i%n}})();function shuffleCards(){"timeline"===currentMode?(0===majorArcanaCards.length&&(majorArcanaCards=window.tarotCards.slice(0,22)),currentCards=majorArcanaCards):currentCards=window.tarotCards.slice(),function e(t){function r(e){let t=Math.floor(e.length/2),r=Array(e.length),a=0,n=t,i=0;for(;a<t&&n<e.length;){let o=secureRandom(1,4);if(secureRandom(0,2))for(let s=0;s<o&&a<t;s++)r[i++]=e[a++];else for(let l=0;l<o&&n<e.length;l++)r[i++]=e[n++]}for(;a<t;)r[i++]=e[a++];for(;n<e.length;)r[i++]=e[n++];for(let c=0;c<e.length;c++)e[c]=r[c]}function a(e){let t=e.length;for(let r=0;r<t;r++){secureRandom(3,8);let a=secureRandom(0,r+1),n=e[r];for(let i=r;i>a;i--)e[i]=e[i-1];e[a]=n}}for(let n=0;n<3;n++)r(t);for(let i=0;i<2;i++)a(t);!function e(t){let r=secureRandom(3,8),a=Array(r).fill().map(()=>[]),n=0;for(let i of t)a[n].push(i),n=(n+1)%r;let o=0;for(;a.some(e=>e.length);){let s=a.filter(e=>e.length),l=s[secureRandom(0,s.length)];for(;l.length;)t[o++]=l.pop()}}(t);let o=secureRandom(0,t.length),s=t.splice(0,o);t.push(...s)}(currentCards)}const TEMPLATES={cardInner:document.createElement("template"),cardInfo:document.createElement("template")};TEMPLATES.cardInner.innerHTML=`
    <div class="card-inner">
        <img alt="">
    </div>
`,TEMPLATES.cardInfo.innerHTML=`
    <div class="card-info hidden">
        <h3 class="card-title"></h3>
        <p class="meaning"></p>
    </div>
`;const createCardElement=(e,t,r)=>{let a=TEMPLATES.cardInner.content.cloneNode(!0).firstElementChild;t&&(a.style.transform="rotate(180deg)");let n=a.querySelector("img");return n.src=e.image,n.alt=e.name,a},createReadingElement=(e,t,r)=>{let a=TEMPLATES.cardInfo.content.cloneNode(!0).firstElementChild,n=a.querySelector(".card-title"),i=a.querySelector(".meaning");return n.textContent=`${e.name}${t?"（逆位）":""}`,i.textContent=t?e.meaning.reversed:e.meaning.upright,a};async function copyResult(){try{let e=document.getElementById("questionInput"),t=document.querySelector(".reading-section");if(!t)return;let r=[],a=e?.value.trim();a&&r.push(`我的问题：${a}

`),r.push("抽取的卡牌：\n");let n=t.querySelectorAll(".card-info");for(let i of n){let o=i.querySelector(".card-title")?.textContent??"",s=i.querySelector(".meaning")?.textContent??"";r.push(`${o}
${s}

`)}let l=document.querySelector(".ai-reading-text");if(l&&l.textContent.trim()){r.push("AI解读：\n");let c=l.textContent.trim().replace(/\n\s*\n/g,"\n\n").replace(/\s+/g," ").trim();r.push(`${c}
`)}let d=r.join("");await navigator.clipboard.writeText(d);let u=document.querySelector(".copy-button");u&&(u.textContent="已复制",setTimeout(()=>{u.textContent="复制结果"},CONFIG.COPY_FEEDBACK_DURATION))}catch(m){console.error("复制失败:",m)}}async function getAIReading(){try{let e=document.getElementById("questionInput"),t=document.querySelector(".reading-section");if(!t)return;let r=[],a=e?.value.trim();a&&r.push(`问题：${a}

`),r.push("抽取的卡牌：\n");let n=t.querySelectorAll(".card-info");for(let i of n){let o=i.querySelector(".card-title")?.textContent??"",s=i.querySelector(".meaning")?.textContent??"";r.push(`${o}
${s}

`)}r.push("\n请你作为一位专业的塔罗牌解读师，根据以上抽取的卡牌和问题（如果有），给出详细的解读和建议。解读时请考虑：\n"),r.push("1. 每张牌的基本含义\n"),r.push("2. 牌与牌之间的关系\n"),r.push("3. 牌阵整体传达的信息\n"),r.push("4. 结合提问者的具体问题（如果有）\n"),r.push("5. 给出实际可行的建议\n\n"),r.push("请用通俗易懂的语言进行解读，并保持积极正面的态度。");let l=r.join("");await navigator.clipboard.writeText(l);let c=document.querySelector(".ai-button");c&&(c.textContent="已复制提示词",setTimeout(()=>{c.textContent="AI解读"},CONFIG.COPY_FEEDBACK_DURATION))}catch(d){console.error("复制失败:",d)}}function waitForAIModule(){return new Promise(e=>{if(window.aiModuleLoaded)e();else{let t=setInterval(()=>{window.aiModuleLoaded&&(clearInterval(t),e())},CONFIG.POLL_INTERVAL);setTimeout(()=>{clearInterval(t),e(),console.error("AI模块加载超时")},CONFIG.MAX_WAIT_TIME)}})}function initializeTarot(){let e=document.querySelectorAll(".nav-item");e.forEach(t=>{t.addEventListener("click",()=>{e.forEach(e=>e.classList.remove("active")),t.classList.add("active"),currentMode=t.dataset.mode,resetDrawArea()})});let t=document.querySelector(".nav-item.active");t&&(currentMode=t.dataset.mode)}function resetDrawArea(){let e=document.querySelector(".controls");if(!e)return;e.innerHTML=`
        <div class="input-container">
            <div class="guidance-text">
                <p>现在静下心来</p>
                <p>选择并心中默念困扰你的问题</p>
                <p>然后点击抽取你的牌</p>
            </div>
            <button class="draw-button" id="initialDraw">抽牌</button>
        </div>
    `;let t=document.getElementById("initialDraw");t&&t.addEventListener("click",drawCards)}const Performance={marks:new Map,measures:new Map,metrics:new Map,start(e){performance.mark(`${e}_start`),this.marks.set(e,performance.now()),performance.memory&&this.metrics.set(`${e}_memory_start`,{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize})},end(e){let t=`${e}_start`,r=`${e}_end`;performance.mark(r),performance.measure(e,t,r);let a=performance.getEntriesByName(e).pop();if(this.measures.set(e,a.duration),performance.memory){let n=this.metrics.get(`${e}_memory_start`),i={usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize},o={used:i.usedJSHeapSize-n.usedJSHeapSize,total:i.totalJSHeapSize-n.totalJSHeapSize};this.metrics.set(`${e}_memory_diff`,o)}return console.debug(`${e} performance:`,{duration:`${a.duration.toFixed(2)}ms`,memoryDiff:this.metrics.get(`${e}_memory_diff`)}),a.duration},getStats(){return Object.fromEntries(this.measures)},clear(){performance.clearMarks(),performance.clearMeasures(),this.marks.clear(),this.measures.clear(),this.metrics.clear()}};function drawCards(){Performance.start("drawCards");try{window.scrollTo({top:0,behavior:"smooth"});let e=document.querySelector(".result-container");if(e){let t=e.querySelector(".redraw-container");if(t){t.removeEventListener("click",handleControlButtons);let r=e.querySelector("#questionInput");r&&r.dataset.hasKeyListener&&r.removeEventListener("keyup",handleEnterKey)}e.remove()}let a=document.getElementById("tarotContainer"),n,i,o=!0,s=!1;switch(currentMode){case"choice":n=5,i=currentCards;break;case"daily":n=1,i=currentCards,o=!1,s=!0;break;case"single":n=1,i=currentCards;break;case"classic":default:n=3,i=currentCards;break;case"timeline":n=3,0===majorArcanaCards.length&&(majorArcanaCards=window.tarotCards.slice(0,22).map(e=>({...e}))),i=majorArcanaCards}currentCards.length<n&&shuffleCards();let l=document.querySelector(".input-container");l&&(l.style.opacity="0",setTimeout(()=>{l.style.display="none"},CONFIG.ANIMATION_DURATION)),a.innerHTML=`
            <div class="cards-display"></div>
            <div class="result-container hidden">
                <div class="reading-content">
                    <p class="section-title">抽取的卡牌：</p>
                    <div class="reading-section"></div>
                    ${"daily"!==currentMode?`
                    <div class="question-section hidden">
                        <p class="question-title">记录下你的问题：</p>
                        <textarea id="questionInput" placeholder="在这里写下你的问题..." rows="3"></textarea>
                    </div>
                    `:""}
                    <div class="redraw-container hidden">
                        <button class="draw-button copy-button" onclick="copyResult()">复制结果</button>
                        <button class="draw-button redraw">重新抽牌</button>
                        ${"daily"!==currentMode?`
                        <button class="draw-button ai-button">AI解读</button>
                        `:""}
                    </div>
                </div>
            </div>
        `;let c=a.querySelector(".cards-display"),d=a.querySelector(".reading-section"),u=[],m=[],p=[];for(let h=0;h<n;h++){let g=currentCards.pop(),y=.5>Math.random();u.push({card:g,isReversed:y}),m.push(createCardElement(g,y,h)),p.push(createReadingElement(g,y,h))}for(let f=0;f<n;f++)c.appendChild(m[f]),m[f].style.opacity="0",m[f].style.transform=u[f].isReversed?"translateX(-100%) rotate(180deg)":"translateX(-100%)",setTimeout(()=>{m[f].style.transition="all 0.5s ease",m[f].style.opacity="1",m[f].style.transform=u[f].isReversed?"translateX(0) rotate(180deg)":"translateX(0)"},f*CONFIG.ANIMATION_DURATION+CONFIG.DISPLAY_DELAY);setTimeout(()=>{let e=a.querySelector(".result-container");p.forEach(e=>{e.classList.remove("hidden"),d.appendChild(e)}),requestAnimationFrame(()=>{e.classList.remove("hidden"),setTimeout(()=>{if(e.classList.add("fade-in"),o){let t=e.querySelector(".question-section");t.classList.remove("hidden"),t.classList.add("fade-in")}let r=e.querySelector(".redraw-container");r.classList.remove("hidden"),r.classList.add("fade-in"),s&&setTimeout(()=>{window.AI.handleReading()},500),r.addEventListener("click",handleControlButtons)},50)})},n*CONFIG.ANIMATION_DURATION+2*CONFIG.DISPLAY_DELAY),Performance.end("drawCards")}catch($){Performance.end("drawCards"),console.error("抽牌过程出错:",$)}}window.drawCards=drawCards,console.log("Main script loaded"),document.addEventListener("DOMContentLoaded",function(){let e=document.getElementById("initialDraw");e&&e.addEventListener("click",drawCards),console.log("页面加载完成，等待用户操作...")}),window.addEventListener("load",initializeTarot);const State={current:{mode:"single",cards:[],majorArcana:[],isDrawing:!1,isAnimating:!1},listeners:new Map,update(e){let t={...this.current};Object.assign(this.current,e),this.notify("change",{oldState:t,newState:this.current})},on(e,t){return this.listeners.has(e)||this.listeners.set(e,new Set),this.listeners.get(e).add(t),()=>this.off(e,t)},off(e,t){let r=this.listeners.get(e);r&&r.delete(t)},notify(e,t){let r=this.listeners.get(e);r&&r.forEach(e=>e(t))}};function switchMode(e){State.update({mode:e}),"timeline"===e?State.update({majorArcana:window.tarotCards.slice(0,22).map(e=>({...e})),cards:[...State.current.majorArcana]}):State.update({cards:window.tarotCards.map(e=>({...e}))}),shuffleCards()}const style=document.createElement("style");function handleControlButtons(e){let t=e.target;t.classList.contains("redraw")?location.reload():t.classList.contains("copy-button")?copyResult():t.classList.contains("ai-button")&&handleAIButton(e)}style.textContent=`
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
`,document.head.appendChild(style),document.addEventListener("DOMContentLoaded",()=>{let e=document.getElementById("questionInput");e&&e.setAttribute("tabindex","0")}),window.addEventListener("error",e=>{console.error("全局错误:",e.error)}),window.addEventListener("unhandledrejection",e=>{console.error("未处理的 Promise 错误:",e.reason)});const MemoryManager={weakRefs:new WeakMap,track(e,t){this.weakRefs.set(e,t)},release(e){let t=this.weakRefs.get(e);t&&(t(),this.weakRefs.delete(e))},clear(){console.debug("Memory cleanup performed")}};function cleanup(){AnimationManager.cancelAll(),ResourceManager.clear(),Performance.clear(),MemoryManager.clear(),State.update({mode:"single",cards:[],majorArcana:[],isDrawing:!1,isAnimating:!1}),currentCards=[],majorArcanaCards=[]}window.addEventListener("unload",cleanup);const EventHandler={debounce(e,t=250){let r;return(...a)=>{clearTimeout(r),r=setTimeout(()=>e.apply(this,a),t)}},delegate(e,t,r,a){e.addEventListener(t,t=>{let n=t.target.closest(r);n&&e.contains(n)&&a.call(n,t)})}};function initializeControls(e){EventHandler.delegate(e,"click",".redraw-container button",e=>{let t=e.target;t.classList.contains("redraw")?location.reload():t.classList.contains("copy-button")?copyResult():t.classList.contains("ai-button")&&handleAIButton(e)})}const ResourceManager={resources:new Map,loadingPromises:new Map,async preload(e,t){let r=t.map(t=>this.load(e,t));return Promise.all(r)},async load(e,t){let r=`${e}:${t}`;if(this.resources.has(r))return this.resources.get(r);if(this.loadingPromises.has(r))return this.loadingPromises.get(r);let a=new Promise((a,n)=>{if("image"===e){let i=new Image;i.onload=()=>{this.resources.set(r,i),this.loadingPromises.delete(r),a(i)},i.onerror=n,i.src=t}});return this.loadingPromises.set(r,a),a},clear(){this.resources.clear(),this.loadingPromises.clear()}};document.addEventListener("DOMContentLoaded",()=>{ResourceManager.preload("image",window.tarotCards.map(e=>e.image)).catch(e=>ErrorHandler.handle(e,"preloadImages"))});const ErrorHandler={errors:[],maxErrors:10,recoveryStrategies:new Map,addRecoveryStrategy(e,t){this.recoveryStrategies.set(e,t)},async handle(e,t=""){let r={message:e.message,stack:e.stack,context:t,timestamp:new Date().toISOString()};this.errors.push(r),this.errors.length>this.maxErrors&&this.errors.shift(),console.error(`Error in ${t}:`,e);let a=this.recoveryStrategies.get(e.name)||this.recoveryStrategies.get("default");if(a)try{await a(e,t),console.log(`Recovery successful for ${t}`)}catch(n){console.error("Recovery failed:",n),this.showErrorToUser(t)}else this.showErrorToUser(t)},showErrorToUser(e){let t=document.createElement("div");t.className="error-message fade-in",t.textContent=`操作失败，请稍后重试`,document.body.appendChild(t),setTimeout(()=>{t.classList.add("fade-out"),setTimeout(()=>t.remove(),300)},3e3)}};ErrorHandler.addRecoveryStrategy("default",async(e,t)=>{State.update({isDrawing:!1,isAnimating:!1}),AnimationManager.cancelAll(),await ResourceManager.preload("image",window.tarotCards.map(e=>e.image))});const AnimationManager={animations:new Map,async animate(e,t,r){e.style.willChange="transform, opacity",this.animations.has(e)&&this.animations.get(e).cancel();let a=e.animate(t,{...r,composite:"replace",easing:"cubic-bezier(0.4, 0, 0.2, 1)"});this.animations.set(e,a);try{await a.finished,e.style.willChange="auto",this.animations.delete(e)}catch(n){throw e.style.willChange="auto",this.animations.delete(e),n}},cancelAll(){this.animations.forEach(e=>e.cancel()),this.animations.clear()}};async function animateCard(e,t,r){let a=r*(CONFIG.ANIMATION_DURATION/2);await AnimationManager.animate(e,[{opacity:0,transform:t?"translate3d(-100%, 0, 0) rotate3d(0, 0, 1, 180deg)":"translate3d(-100%, 0, 0)"},{opacity:1,transform:t?"translate3d(0, 0, 0) rotate3d(0, 0, 1, 180deg)":"translate3d(0, 0, 0)"}],{duration:CONFIG.ANIMATION_DURATION,delay:a,fill:"forwards"})}function copyReading(){let e="",t=document.querySelector(".reading-section");if(console.log("Reading section:",t),t){let r=t.querySelectorAll(".card-info");console.log("Card infos:",r),r.forEach(t=>{let r=t.querySelector(".card-title")?.textContent||"",a=t.querySelector(".meaning")?.textContent||"";e+=`${r}
${a}

`})}let a=document.querySelector(".ai-result-container");if(console.log("AI container:",a),a){let n=a.querySelector(".ai-reading-text")?.textContent?.trim();console.log("AI text:",n),n&&(e+=`
AI解读：
${n}`)}if(console.log("Final content:",e),!e.trim()){console.error("没有找到可复制的内容");return}let i=document.createElement("textarea");i.value=e,i.style.position="fixed",i.style.opacity="0",document.body.appendChild(i);try{i.select(),document.execCommand("copy");let o=document.querySelector(".copy-button"),s=o.textContent;o.textContent="复制成功",setTimeout(()=>{o.textContent=s},2e3)}catch(l){console.error("复制失败:",l)}finally{document.body.removeChild(i)}}function addAIReading(e){let t=document.querySelector(".ai-reading-text");t?(t.textContent=e,console.log("AI reading added:",e)):console.error("AI reading container not found")}function optimizeImages(){let e=document.querySelectorAll("img"),t="https://sydf.cc/img/today/00.jpg";function r(e){e.loading="lazy",e.closest(".nav-item")&&(e.width=54,e.height=54),e.onerror=()=>{var r;return r=e,void(console.error("图片加载失败:",r.src),r.src!==t&&(r.src=t,r.style.opacity="0.6",r.style.filter="grayscale(1)"))},e.complete?e.style.opacity="1":(e.style.opacity="0",e.style.transition="opacity 0.3s ease",e.onload=()=>{e.style.opacity="1"})}e.forEach(r);let a=new MutationObserver(e=>{e.forEach(e=>{e.addedNodes.forEach(e=>{"IMG"===e.nodeName&&r(e)})})});a.observe(document.body,{childList:!0,subtree:!0})}window.AI.generatePrompt=function(e,t){let r=currentMode,a=t.map(e=>`${e.title}：${e.meaning}`).join("\n");if("choice"===r){let n=e?.trim()?`用户的问题是：${e}`:"这是一次二选一抉择占卜，用户希望在两个选择之间得到指引。";return`你是一位专业的塔罗牌解读师。${n}

抽到的塔罗牌是：
${a}

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

请直接开始解读，不要重复问题或牌面信息。`}if("daily"===r)return`你是一位专业的塔罗牌解读师。这是一次今日运势占卜，抽到的塔罗牌是：

${a}

请你以温和、积极的语气解读今天的整体运势。解读内容应该：
1. 简明扼要地说明这张牌对今日运势的指引
2. 提供具体的建议，帮助改善今日运势

请直接开始解读，不要重复牌面信息。`},document.addEventListener("DOMContentLoaded",optimizeImages);

// 添加双击抽牌功能
function addDoubleTapHandler() {
    let lastTap = 0;
    const container = document.getElementById('tarotContainer');
    
    container.addEventListener('touchend', function(e) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        // 检测是否为双击（间隔小于 300ms）
        if (tapLength < 300 && tapLength > 0) {
            // 检查是否点击在抽牌区域内
            const cardsDisplay = document.querySelector('.cards-display');
            if (cardsDisplay && cardsDisplay.contains(e.target)) {
                e.preventDefault();
                drawCards();
            }
        }
        lastTap = currentTime;
    });
}

// 在页面加载完成后初始化双击处理
document.addEventListener('DOMContentLoaded', function() {
    // 保持原有的初始化代码
    const initialDrawButton = document.getElementById('initialDraw');
    if (initialDrawButton) {
        initialDrawButton.addEventListener('click', drawCards);
    }
    
    // 添加双击处理
    addDoubleTapHandler();
    
    console.log('页面加载完成，等待用户操作...');
});