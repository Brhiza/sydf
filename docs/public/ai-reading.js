!function(){let e={API_URL:"https://flow.ikun.jp/ai",MODEL:"deepseek-ai/DeepSeek-V2.5",TIMEOUT:3e4,MAX_RETRIES:3,HEADERS:{"Content-Type":"application/json"}};function t(e,t){let n="";return e&&e.trim()&&(n+=`问题：${e.trim()}

`),n+="抽取的卡牌：\n",t.forEach(e=>{n+=`${e.title}
${e.meaning}

`}),n+="\n请你作为一位专业的塔罗牌解读师，根据以上抽取的卡牌和问题（如果有），给出详细的解读和建议。解读时请考虑：\n",n+="1. 每张牌的基本含义\n",n+="2. 牌与牌之间的关系\n",n+="3. 牌阵整体传达的信息\n",n+="4. 结合提问者的具体问题（如果有）\n",n+="5. 给出实际可行的建议\n\n",n+="请用通俗易懂的语言进行解读，并保持积极正面的态度。"}window.AI={getReading:async function(t,n){let i=this.generatePrompt(t,n),r=0,a=new AbortController,o=setTimeout(()=>a.abort(),e.TIMEOUT);for(;r<e.MAX_RETRIES;)try{console.log("Sending request to:",e.API_URL);let l=await fetch(e.API_URL,{method:"POST",headers:e.HEADERS,body:JSON.stringify({prompt:i}),signal:a.signal,mode:"cors"});if(!l.ok){let d=await l.text();throw console.error("API Error:",l.status,d),Error(`API request failed: ${d}`)}if(!l.body)throw Error("Response body is null");return clearTimeout(o),l.body}catch(s){if(console.error(`尝试 ${r+1}/${e.MAX_RETRIES} 失败:`,s),"AbortError"===s.name)throw Error("请求超时，请检查网络连接后重试");if(++r===e.MAX_RETRIES)throw Error(`AI解读服务暂时不可用: ${s.message}`);let c=Math.min(1e3*Math.pow(2,r)+1e3*Math.random(),5e3);await new Promise(e=>setTimeout(e,c))}},generatePrompt:function(e,t){let n=currentMode,i=t.map(e=>`${e.title}：${e.meaning}`).join("\n");if("choice"===n){let r=e?.trim()?`用户的问题是：${e}`:"这是一次二选一抉择占卜，用户希望在两个选择之间得到指引。";return`你是一位专业的塔罗牌解读师。${r}

抽到的塔罗牌是：
${i}

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

请直接开始解读，不要重复问题或牌面信息。`}return"daily"===n?`你是一位专业的塔罗牌解读师。请根据以下抽到的塔罗牌为用户做解读：

${i}

${e?`用户的问题是：${e}`:"这是一次日常运势的占卜。"}

请你以温和、积极的语气进行解读。解读内容应该：
1. 简明扼要地说明这张牌的核心含义
请直接开始解读，不要重复问题或牌面信息。`:1===t.length?`你是一位专业的塔罗牌解读师。请根据以下抽到的塔罗牌为用户做解读：

${i}

${e?`用户的问题是：${e}`:"这是一次日常运势的占卜。"}

请你以温和、积极的语气进行解读。解读内容应该：
1. 简明扼要地说明这张牌的核心含义
请直接开始解读，不要重复问题或牌面信息。`:`你是一位专业的塔罗牌解读师。请根据以下抽到的塔罗牌阵为用户做解读：

${i}

${e?`用户的问题是：${e}`:"这是一次综合运势的占卜。"}

请你以温和、积极的语气进行解读。解读内容应该：
1. 分析每张牌之间的关联和整体含义
2. 结合用户的问题（如果有）进行针对性解读
3. 说明这个牌阵揭示的过去、现在、未来走向
4. 给出积极的建议或指导
5. 避免过于消极或绝对的表述

请直接开始解读，不要重复问题或牌面信息。`},parseMd:function(e){return e.replace(/^### (.*$)/gm,"<h3>$1</h3>").replace(/^## (.*$)/gm,"<h2>$1</h2>").replace(/^# (.*$)/gm,"<h1>$1</h1>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>").replace(/\n/g,"<br>").replace(/^\d\. (.*$)/gm,'<div class="list-item">$1</div>').replace(/^- (.*$)/gm,'<div class="list-item">• $1</div>')},createStreamingContainer:function(){let e=document.createElement("div");e.className="ai-reading-container",e.innerHTML=`
                <div class="ai-reading-text"></div>
            `;let t=document.createElement("style");return t.textContent=`
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
            `,document.head.appendChild(t),e},scrollToBottom:function(e){if(!e)return;let t={top:e.offsetTop+e.offsetHeight,behavior:"smooth"},{scrollTop:n,scrollHeight:i,clientHeight:r}=document.documentElement;i-n-r>0&&window.scrollTo(t)},handleReading:async function(){let e=document.querySelector(".ai-button"),t=document.getElementById("questionInput"),n=document.querySelector(".reading-section"),i=document.querySelector(".copy-button");try{"daily"===currentMode&&i?(i.textContent="AI解读中...",i.disabled=!0):e&&(e.textContent="解读中...",e.disabled=!0);let r=document.querySelector(".ai-reading-container");r&&r.remove();let a=this.createStreamingContainer();document.querySelector(".result-container").appendChild(a);let o=a.querySelector(".ai-reading-text"),l=!1,d=()=>{let{scrollTop:e,scrollHeight:t,clientHeight:n}=document.documentElement;l=!(t-e-n<100)};window.addEventListener("scroll",d,{passive:!0});try{let s=Array.from(n.querySelectorAll(".card-info")).map(e=>({title:e.querySelector(".card-title").textContent,meaning:e.querySelector(".meaning").textContent})),c=t?.value||"";if(!c&&!["daily","choice"].includes(currentMode))throw Error("请先输入你的问题");let g=await this.getReading(c,s),m=g.getReader(),f=new TextDecoder,h="";for(;;){let{done:u,value:p}=await m.read();if(u)break;let $=f.decode(p),y=$.split("\n").filter(e=>""!==e.trim());for(let _ of y)if("data: [DONE]"!==_.trim()&&_.startsWith("data: "))try{let x=_.slice(6),E=JSON.parse(x);if(E.choices&&E.choices[0].delta&&E.choices[0].delta.content){let A=E.choices[0].delta.content;h+=A,o.innerHTML=this.parseMd(h),l||this.scrollToBottom(a)}}catch(I){console.debug("跳过非 JSON 数据:",_);continue}}}finally{window.removeEventListener("scroll",d)}}catch(b){console.error("AI解读出错:",b);let S=document.createElement("div");S.className="error-message",S.textContent=b.message,document.querySelector(".result-container").appendChild(S)}finally{"daily"===currentMode&&i?(i.textContent="复制结果",i.disabled=!1):e&&(e.textContent="AI解读",e.disabled=!1)}}},Object.keys(window.AI).forEach(e=>{"function"==typeof window.AI[e]&&(window.AI[e]=window.AI[e].bind(window.AI))}),console.log("AI module loaded successfully")}();