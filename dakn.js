const majorArcanaCardNames = ["愚人", "魔术师", "女祭司", "皇后", "皇帝", "教皇", "恋人", "战车", "力量", "隐士", "命运之轮", "正义", "倒吊人", "死亡", "节制", "恶魔", "高塔", "星星", "月亮", "太阳", "审判", "世界"];
const cardDescriptions = [{
    upright: "开端、自由、纯真、独创性、冒险、理想主义、自发性",
    reversed: "鲁莽、粗心、分心、幼稚、愚蠢、容易上当、陈旧、迟钝"
  },
  {
    upright: "意志力、欲望、足智多谋、技能、能力、专注、表现",
    reversed: "操纵、狡猾、诡计、浪费天赋、错觉、欺骗"
  },
  {
    upright: "无意识、直觉、神秘、灵性、更高的力量、内在的声音",
    reversed: "被压抑的直觉、隐藏的动机、肤浅、困惑、认知失调"
  },
  {
    upright: "神圣的女性、性感、生育力、培育、创造力、美丽、丰富、自然",
    reversed: "不安全、专横、疏忽、窒息、缺乏成长、缺乏进步"
  },
  {
    upright: "稳定性、结构、保护、权威、控制、实用性、重点、纪律",
    reversed: "暴君、霸道、死板、固执、缺乏纪律、鲁莽"
  },
  {
    upright: "传统、社会群体、约定俗成、从众、教育、知识、信仰",
    reversed: "叛逆、非常规、不循规蹈矩、新方法、无知"
  },
  {
    upright: "爱、工会、伙伴关系、关系、选择、浪漫、平衡、团结",
    reversed: "不和谐、不平衡、冲突、超脱、错误的选择、优柔寡断"
  },
  {
    upright: "成功、雄心、决心、意志力、控制力、自律、专注",
    reversed: "有力、没有方向、没有控制、无力、侵略、障碍"
  },
  {
    upright: "勇气、勇敢、自信、同情、自信、内在力量",
    reversed: "自我怀疑、软弱、低信心、不足、怯懦、强硬"
  },
  {
    upright: "自我反省、内省、沉思、退缩、孤独、寻找自我",
    reversed: "孤独、孤立、隐居、反社会、拒绝、回归社会"
  },
  {
    upright: "变化、周期、命运、决定性时刻、运气、财富、突发事件",
    reversed: "运气不好、缺乏控制、执着于控制、不受欢迎的变化、延误"
  },
  {
    upright: "正义、业力、后果、责任、法律、真相、诚实、正直、因果",
    reversed: "不公正、报复、不诚实、腐败、不诚实、不公平、逃避责任"
  },
  {
    upright: "牺牲、等待、不确定、缺乏方向、视角、沉思",
    reversed: "拖延、漠不关心、停滞不前、避免牺牲、冷漠"
  },
  {
    upright: "转变、结局、改变、过渡、放手、释放",
    reversed: "害怕改变、重复消极的模式、抵制改变、停滞不前、腐朽"
  },
  {
    upright: "平衡、和平、耐心、适度、平静、安宁、和谐、宁静",
    reversed: "不平衡、过度、极端、不和谐、鲁莽、仓促"
  },
  {
    upright: "压迫、成瘾、痴迷、依赖、过度、无力、局限",
    reversed: "独立、自由、启示、释放、收回权力、收回控制"
  },
  {
    upright: "灾难、破坏、剧变、创伤、突变、混乱",
    reversed: "避免灾难、延迟不可避免的、抵制变化"
  },
  {
    upright: "希望、灵感、积极性、信念、更新、治愈、复兴",
    reversed: "绝望、绝望、消极、缺乏信心、沮丧"
  },
  {
    upright: "错觉、直觉、不确定性、困惑、复杂性、秘密、无意识",
    reversed: "恐惧、欺骗、焦虑、误解、曲解、清晰、理解"
  },
  {
    upright: "幸福、成功、乐观、活力、喜悦、自信、真理",
    reversed: "幸福受阻、过度热情、悲观、不切实际的期望、自负"
  },
  {
    upright: "自我评价、觉醒、更新、目的、反思、清算",
    reversed: "自我怀疑、缺乏自我意识、未能吸取教训、自我厌恶"
  },
  {
    upright: "完成、成就、成就感、归属感、整体性、和谐",
    reversed: "缺乏封闭感、缺乏成就感、感觉不完整、空虚"
  }
];

const cdnBaseUrl = "https://sydf.cc/img/images/";
const defaultCardImage = `${cdnBaseUrl}00.jpg`;
let cards = [];
let drawnCards = [];
let drawCount = 0;
let isCardClickable = true;

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function initCards() {
    cards = shuffleArray(Array.from({ length: 22 }, (_, i) => i));
    displayCards();
}

function createCardElement(cardNumber) {
    const cardElement = document.createElement('div');
    cardElement.classList.add('card');
    cardElement.dataset.number = cardNumber;
    cardElement.style.backgroundImage = `url(${defaultCardImage})`;
    cardElement.addEventListener('click', drawCard);
    return cardElement;
}

function displayCards() {
    console.log("displayCards called");
    const cardContainer = document.getElementById('cardContainer');
    cardContainer.innerHTML = '';
    
    // 创建两行
    const row1 = document.createElement('div');
    row1.classList.add('row');
    const row2 = document.createElement('div');
    row2.classList.add('row');

    // 分配卡片到两行，每行11张
    cards.forEach((cardNumber, index) => {
        const cardElement = createCardElement(cardNumber);
        if (index < 11) {
            row1.appendChild(cardElement);
        } else {
            row2.appendChild(cardElement);
        }
    });

    cardContainer.appendChild(row1);
    cardContainer.appendChild(row2);
}

function generateResultContent(card) {
  const imgPath = `${cdnBaseUrl}${card.number}.jpg`;
  const transformStyle = card.reversed ? "rotate(180deg)" : "none";
  const cardWidth = window.innerWidth <= 768 ? '5rem' : '11rem';
  const cardHeight = window.innerWidth <= 768 ? '7.5rem' : '16.5rem';
  const cardName = `${card.reversed ? "逆位" : ""}${majorArcanaCardNames[card.number]}`;
  return `<div style="display: flex; flex-direction: column; align-items: center;"><img src='${imgPath}' style='width: ${cardWidth}; height: ${cardHeight}; transform:${transformStyle}' alt='${cardName}'><p>${cardName}</p></div>`;
}

function drawCard() {
  if (!isCardClickable) return;
  isCardClickable = false;
  const inputText = document.getElementById('inputText').value;
  if (!inputText.trim()) {
    alert("你还没有写下问题呢");
    isCardClickable = true;
    return;
  }
  const cardNumber = this.dataset.number;
  const isReversed = Math.random() < 0.5;
  
  drawnCards.push({
    number: cardNumber,
    reversed: isReversed,
    description: isReversed ? cardDescriptions[cardNumber].reversed : cardDescriptions[cardNumber].upright
  });
  
  drawCount++;
  
  // 更新结果区域
  const resultContainer = document.getElementById('resultContainer');
  resultContainer.innerHTML += generateResultContent({
    number: cardNumber,
    reversed: isReversed
  });

  // 移除当前卡片
  this.classList.add('hide');
  setTimeout(() => {
    this.remove();
  }, 300);

  if (drawCount === 3) {
    // 立即禁用所有卡片的点击事件
    const cardElements = document.querySelectorAll('.card');
    cardElements.forEach(card => {
      card.removeEventListener('click', drawCard);
      card.style.pointerEvents = 'none';
    });

    // 显示按钮
    const resetButton = document.getElementById('resetButton');
    resetButton.style.display = 'block';
    const copyButton = document.getElementById('copyButton');
    copyButton.style.display = 'block';
    const aiButton = document.getElementById('aiButton');
    aiButton.style.display = 'block';

    // 更新输出文本
    const outputText = document.getElementById('outputText');
    const cardNames = drawnCards.map(card => `<strong>${card.reversed ? "逆位" : ""}${majorArcanaCardNames[card.number]}</strong>`).join('、');
    const cardDescriptionsText = drawnCards.map(card => `<em>${card.reversed ? "逆位" : ""}${majorArcanaCardNames[card.number]}，代表${card.description}</em>`).join('<br>');
    const resultText = `${cardNames}<br>${inputText}<br><br><strong>牌意简介</strong><br>${cardDescriptionsText}`;
    outputText.innerHTML = resultText;

    // 滚动到底部
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  }

  setTimeout(() => {
    isCardClickable = true;
  }, 500);
}

function resetCards() {
  drawnCards = [];
  drawCount = 0;
  isCardClickable = true;
  
  // 重置UI元素
  ['resultContainer', 'outputText'].forEach(id => 
      document.getElementById(id).innerHTML = '');
  
  ['resetButton', 'copyButton', 'aiButton'].forEach(id => 
      document.getElementById(id).style.display = 'none');
  
  document.getElementById('inputText').value = '';
  
  // 重新初始化卡片
  initCards();
}

function copyResult() {
  const outputText = document.getElementById('outputText').innerText;
  navigator.clipboard.writeText(outputText).then(() => {
    alert("结果已复制到剪贴板");
  }).catch(err => {
    alert("复制失败: " + err);
  });
}

async function aiInterpretation() {
  const inputText = document.getElementById('inputText').value;
  const cardNames = drawnCards.map(card => `${card.reversed ? "逆位" : ""}${majorArcanaCardNames[card.number]}`).join('、');
  const cardDescriptionsText = drawnCards.map(card => `${card.reversed ? "逆位" : ""}${majorArcanaCardNames[card.number]}：${card.description}`).join('\n');
  
  const prompt = `你是一个专业的塔罗师，你会根据我的问题和抽的牌给我解决问题。\n 问题：${inputText}\n\n抽取的卡牌：\n${cardDescriptionsText}\n`;

  const outputText = document.getElementById('outputText');
  const aiButton = document.getElementById('aiButton');
  outputText.style.display = 'none';
  aiButton.classList.add('loading');
  aiButton.textContent = '';

  try {
    const response = await fetch('https://flow.ikun.jp/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        model: "deepseek-ai/DeepSeek-V2.5"
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonData = JSON.parse(line.slice(6));
            if (jsonData.choices && jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
              const content = jsonData.choices[0].delta.content;
              accumulatedText += content;
              outputText.style.display = 'block';
              outputText.innerHTML = marked.parse(accumulatedText);
              
              const scrollTarget = document.documentElement.scrollHeight;
              window.scrollTo({
                top: scrollTarget,
                behavior: 'smooth'
              });
            }
          } catch (e) {
            console.debug('跳过非 JSON 数据:', line);
          }
        }
      }
    }

  } catch (error) {
    console.error("AI解读失败: ", error);
    alert("AI解读失败: " + error.message);
  } finally {
    aiButton.classList.remove('loading');
    aiButton.textContent = 'AI解读';
    outputText.style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', initCards);

particlesJS('particles-js', {
    particles: {
        number: {
            value: 0,
            density: {
                enable: true,
                value_area: 800
            }
        },
        color: {
            value: "#ffffff"
        },
        shape: {
            type: "circle"
        },
        opacity: {
            value: 0.7,
            random: false,
            anim: {
                enable: false
            }
        },
        size: {
            value: 1,
            random: true,
            anim: {
                enable: false
            }
        },
        line_linked: {
            enable: true,
            distance: 15,
            color: "#ffffff",
            opacity: 0.3,
            width: 1
        },
        move: {
            enable: true,
            speed: 1,
            direction: "none",
            random: false,
            straight: false,
            out_mode: "bounce",
            bounce: true,
            attract: {
                enable: true,
                rotateX: 600,
                rotateY: 1200
            }
        }
    },
    interactivity: {
        detect_on: "canvas",
        events: {
            onhover: {
                enable: false,
                mode: "grab"
            },
            onclick: {
                enable: false,
                mode: "push"
            },
            resize: true
        }
    },
    retina_detect: true
});

// 启动动画
let canvas = document.querySelector('#particles-js canvas');
let ctx = canvas.getContext('2d');
let centerX = 0;
let centerY = window.innerHeight;
let particles = [];

// 初始化粒子
for(let i = 0; i < 1500; i++) {
    let minRadius = Math.min(window.innerWidth, window.innerHeight) * 0.15;
    let maxRadius = Math.max(window.innerWidth, window.innerHeight) * 1.3;
    
    let baseTrackCount = 18;
    let randomOffset = (Math.random() - 0.5) * 0.6;
    let trackIndex = Math.floor(Math.random() * baseTrackCount) + randomOffset;
    trackIndex = Math.max(0, Math.min(trackIndex, baseTrackCount - 1));
    
    let normalizedTrack = Math.pow(trackIndex / (baseTrackCount - 1), 0.9);
    normalizedTrack = normalizedTrack * (0.85 + Math.sqrt(normalizedTrack) * 0.15);
    let radius = minRadius + (maxRadius - minRadius) * normalizedTrack;
    
    radius += (Math.random() - 0.5) * (maxRadius - minRadius) * 0.015;
    
    if (normalizedTrack < 0.15 && Math.random() > normalizedTrack * 4) {
        continue;
    }

    let angle = Math.random() * Math.PI * 2;
    let speed = (0.025 + Math.random() * 0.05) / 100;
    let size = 0.4 + Math.random() * 1.2;
    particles.push({
        radius,
        angle,
        speed,
        size,
        sizeOffset: Math.random() * Math.PI * 2,
        sizeSpeed: 0.015 + Math.random() * 0.015
    });
}

// 更新和绘制粒子
function updateParticles() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.025)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ffffff';
    particles.forEach(particle => {
        particle.angle += particle.speed;
        if (particle.angle >= Math.PI * 2) {
            particle.angle = 0;
        }
        
        particle.sizeOffset += particle.sizeSpeed;
        if (particle.sizeOffset >= Math.PI * 2) {
            particle.sizeOffset = 0;
        }
        let currentSize = particle.size * (0.8 + Math.sin(particle.sizeOffset) * 0.2);
        
        let x = centerX + particle.radius * Math.cos(particle.angle);
        let y = centerY + particle.radius * Math.sin(particle.angle);
        
        let margin = 80;
        if (x >= -margin && x <= canvas.width + margin && 
            y >= -margin && y <= canvas.height + margin) {
            ctx.beginPath();
            ctx.arc(x, y, currentSize, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    requestAnimationFrame(updateParticles);
}

// 处理窗口大小变化
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    centerX = 0;
    centerY = window.innerHeight;
    
    let minRadius = Math.min(window.innerWidth, window.innerHeight) * 0.3;
    let maxRadius = Math.max(window.innerWidth, window.innerHeight) * 2;
    
    particles.forEach(particle => {
        let normalizedRadius = (particle.radius - particle.radius * 0.3) / (particle.radius * 1.7);
        particle.radius = minRadius + (maxRadius - minRadius) * normalizedRadius;
        particle.radius += (Math.random() - 0.5) * (maxRadius - minRadius) * 0.03;
    });
});

// 启动动画
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
updateParticles(); 