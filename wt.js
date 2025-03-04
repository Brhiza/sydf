const majorArcanaCardNames = [
    // 大阿卡纳牌 (0-21)
    "愚人", "魔术师", "女祭司", "皇后", "皇帝", "教皇", "恋人", "战车", "力量", "隐士", 
    "命运之轮", "正义", "倒吊人", "死神", "节制", "恶魔", "高塔", "星星", "月亮", "太阳", 
    "审判", "世界",
    
    // 权杖牌 (22-35)
    "权杖王牌", "权杖二", "权杖三", "权杖四", "权杖五", "权杖六", "权杖七", "权杖八", 
    "权杖九", "权杖十", "权杖侍从", "权杖骑士", "权杖皇后", "权杖国王",
    
    // 圣杯牌 (36-49)
    "圣杯王牌", "圣杯二", "圣杯三", "圣杯四", "圣杯五", "圣杯六", "圣杯七", "圣杯八", 
    "圣杯九", "圣杯十", "圣杯侍从", "圣杯骑士", "圣杯皇后", "圣杯国王",
    
    // 宝剑牌 (50-63)
    "宝剑王牌", "宝剑二", "宝剑三", "宝剑四", "宝剑五", "宝剑六", "宝剑七", "宝剑八", 
    "宝剑九", "宝剑十", "宝剑侍从", "宝剑骑士", "宝剑皇后", "宝剑国王",
    
    // 钱币牌 (64-77)
    "钱币王牌", "钱币二", "钱币三", "钱币四", "钱币五", "钱币六", "钱币七", "钱币八", 
    "钱币九", "钱币十", "钱币侍从", "钱币骑士", "钱币皇后", "钱币国王"
];
const cardDescriptions = [ {
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
},
{
  upright: "爱、新感觉、情感觉醒、创造力、灵性、直觉",
  reversed: "冷漠、空虚、情绪失落、创造力受阻、感觉不被爱"
},
{
  upright: "团结、伙伴关系、吸引力、联系、紧密联系、联合力量、相互尊重",
  reversed: "分离、拒绝、分裂、不平衡、紧张、沟通不良、退缩"
},
{
  upright: "友谊、社区、聚会、庆祝活动、团体活动、社交活动",
  reversed: "八卦、丑闻、过度、孤立、孤独、孤独、不平衡的社会生活"
},
{
  upright: "冷漠、沉思、感觉与世隔绝、忧郁、无聊、不满",
  reversed: "清晰、意识、接受、选择幸福、抑郁、消极"
},
{
  upright: "失落、悲伤、失望、哀悼、不满",
  reversed: "接受、继续前进、寻找平静、满足、看到积极的一面"
},
{
  upright: "怀旧、回忆、熟悉、治愈、安慰、多愁善感、愉悦",
  reversed: "被困在、前进、离家、独立"
},
{
  upright: "选择、寻找目标、幻想、白日梦、一厢情愿、优柔寡断",
  reversed: "缺乏目标、混乱、混乱、转移、分心、清晰、做出选择"
},
{
  upright: "放弃、走开、放手、寻找真相、留下",
  reversed: "停滞、单调、接受较少、回避、害怕改变、处于糟糕的境地"
},
{
  upright: "愿望成真、满足、成功、成就、认可、快乐",
  reversed: "不快乐、缺乏满足感、失望、成绩不佳、傲慢、势利"
},
{
  upright: "幸福、回家、满足、情绪稳定、安全、家庭和谐",
  reversed: "不愉快的家、分离、家庭冲突、不和谐、孤立"
},
{
  upright: "理想主义、敏感、梦想家、天真",
  reversed: "情绪脆弱、不成熟、忽视内在小孩、逃避现实、不安全感"
},
{
  upright: "理想主义者、迷人艺术的、优雅的、委婉的、外交的、调解人、谈判者",
  reversed: "失望、发脾气、喜怒无常、混乱、避免冲突、虚荣"
},
{
  upright: "同情、温暖、善良、直觉、支持",
  reversed: "不安全、给予太多、过于敏感、有需要的、脆弱、依赖"
},
{
  upright: "明智的、外交的、头脑和心灵之间的平衡、忠诚的",
  reversed: "不知所措、焦虑、冷漠、压抑、孤僻、控制欲强、自私"
},
{
  upright: "新机会、资源、丰富、繁荣、安全、稳定、表现",
  reversed: "错失机会、稀缺、不足、不稳定、吝啬、错误的投资"
},
{
  upright: "平衡资源、适应、足智多谋、灵活性、拉伸资源",
  reversed: "不平衡、无组织、不堪重负、凌乱、混乱、过度扩张"
},
{
  upright: "团队合作、共同目标、协作、学徒、努力、集中精力",
  reversed: "缺乏凝聚力、缺乏团队合作、冷漠、动力不足、冲突、自我、竞争"
},
{
  upright: "占有欲、不安全感、吝啬、稳定、安全、财富、节俭、界限",
  reversed: "慷慨、给予、消费、开放、财务不安全、鲁莽消费"
},
{
  upright: "困难、损失、孤立、感觉被遗弃、逆境、斗争、失业、疏远、耻辱",
  reversed: "积极的改变、从损失中恢复、克服逆境、宽恕、感到受欢迎"
},
{
  upright: "慷慨、慈善、社区、物质帮助、支持、分享、给予和接受、感恩",
  reversed: "权力动态、滥用慷慨、附带礼物、不平等、敲诈勒索"
},
{
  upright: "收获、奖励、结果、成长、进步、毅力、耐心、计划",
  reversed: "未完成的工作、拖延、低努力、浪费、缺乏成长、挫折、急躁"
},
{
  upright: "技能、才能、质量、高标准、专业知识、掌握、承诺、奉献、成就",
  reversed: "缺乏素质、仓促工作、名声不好、缺乏动力、平庸、懒惰、低技能"
},
{
  upright: "有回报的努力、成功、成就、独立、休闲、物质保障、自给自足",
  reversed: "被守卫、物质不稳定、不计后果"
},
{
  upright: "遗产、根源、家庭、祖先、继承、意外之财、特权、富裕、稳定、传统",
  reversed: "家庭纠纷、破产、债务、转瞬即逝的成功、金钱冲突、不稳定、打破传统"
},
{
  upright: "雄心、勤奋、目标导向、计划者、好学、脚踏实地、忠诚、忠实、可靠",
  reversed: "愚蠢的、不成熟的、懒惰的、成绩不佳、拖延、错失机会、糟糕前景"
},
{
  upright: "实用、可靠、高效、坚忍、缓慢而稳定、勤奋、忠诚、耐心、保守",
  reversed: "工作狂、懒惰、沉闷、无聊、不主动、廉价、不负责、赌徒、冒险投资"
},
{
  upright: "慷慨、关怀、培育、居家、商业意识、实用、舒适、热情、明智、豪华",
  reversed: "自私、蓬头垢面、嫉妒、缺乏安全感、贪婪、物质主义、淘金者、不宽容"
},
{
  upright: "丰富、繁荣、安全、雄心、善良、重男轻女、保护性、感性、可靠",
  reversed: "贪婪、物质、浪费、糟糕的财务决策、赌徒、占有欲"
},
{
  upright: "清晰、突破、新想法、专注、远见、力量、真理",
  reversed: "混乱、沟通不畅、敌意、争论、破坏"
},
{
  upright: "僵局、艰难抉择、左右为难、否认、隐藏信息",
  reversed: "优柔寡断、犹豫、焦虑、没有正确的选择、真相大白"
},
{
  upright: "心碎、分离、悲伤、不安、失落、创伤、眼泪",
  reversed: "治愈、宽恕、恢复、和解、压抑情绪"
},
{
  upright: "休息、放松、和平、庇护、疗养、自我保护、恢复活力",
  reversed: "恢复、觉醒、重新进入世界、摆脱孤立、烦躁、倦怠"
},
{
  upright: "争论、纠纷、侵略、欺凌、恐吓、冲突、敌意、压力",
  reversed: "和解、解决、妥协、报复、后悔、悔恨、减少损失"
},
{
  upright: "继续前进、离开、留下、距离、接受教训",
  reversed: "困在过去、重蹈覆辙、逃避问题、陷入困境"
},
{
  upright: "谎言、诡计、策略、足智多谋、偷偷摸摸、狡猾",
  reversed: "忏悔、良心、悔恨、恶意、真相"
},
{
  upright: "被困、受限、受害、瘫痪、无助、无能为力、监禁",
  reversed: "自由、释放、控制、幸存者、恐惧、投降"
},
{
  upright: "恐惧、焦虑、消极、崩溃、绝望、噩梦、孤立",
  reversed: "康复、学习面对、寻求帮助、羞耻、内疚、心理问题"
},
{
  upright: "毁灭、失败、痛苦、崩溃、疲惫、死胡同、受害、背叛",
  reversed: "生存、改善、治愈、经验教训、绝望、复发"
},
{
  upright: "好奇、诙谐、健谈、善于交际、有灵感、警惕、警觉、思维敏捷",
  reversed: "散漫、愤世嫉俗、讽刺、八卦、侮辱、粗鲁、缺乏计划"
},
{
  upright: "自信、直接、不耐烦、聪明、大胆、专注、完美主义者、雄心",
  reversed: "粗鲁、不圆滑、强硬、欺凌、好斗、恶毒、无情、傲慢"
},
{
  upright: "诚实、独立、有原则、公平、建设性批评、客观、有洞察力",
  reversed: "悲观的、恶意的、操纵性的、苛刻的、苦涩的、残忍的、欺骗的、无情的"
},
{
  upright: "理性、权威、纪律、诚信、道德、严肃、高标准",
  reversed: "非理性的、独裁者、压迫、控制性的、冷酷无情、不诚实的"
},
{
  upright: "灵感、创意火花、新建议、新激情、热情、活力",
  reversed: "延迟、阻碍、缺乏激情、缺乏活力、犹豫、创意阻碍"
},
{
  upright: "计划、第一步、做出决定、留下舒适感、承担风险",
  reversed: "糟糕的计划、过度分析、不采取行动、谨慎行事、规避风险"
},
{
  upright: "动力、信心、扩张、增长、远见、展望",
  reversed: "限制、局限、缺乏进展、障碍、延误、挫折"
},
{
  upright: "社区、家庭、庆典、聚会、稳定、归属感",
  reversed: "缺乏支持、不稳定、感觉不受欢迎、短暂、缺乏根源、家庭冲突"
},
{
  upright: "冲突、竞争、争论、侵略、紧张、对手、自我冲突",
  reversed: "冲突结束、合作、协议、休战、和谐、和平、避免冲突"
},
{
  upright: "成功、胜利、奖励、认可、赞美、赞誉、骄傲",
  reversed: "失败、缺乏认可、没有奖励、缺乏成就"
},
{
  upright: "保护自己、为自己挺身而出、保护领土",
  reversed: "放弃、认输、让步、缺乏自信、投降"
},
{
  upright: "运动、速度、进步、快速决定、突然变化、兴奋",
  reversed: "等待、缓慢、混乱、延误、失去动力、仓促、毫无准备"
},
{
  upright: "最后立场、坚持、毅力、韧性、接近成功、疲劳",
  reversed: "顽固、僵硬、防御、拒绝妥协、放弃"
},
{
  upright: "负担、责任、义务、压力、义务、精疲力竭、斗争",
  reversed: "不下放、肩负太多责任、崩溃、崩溃"
},
{
  upright: "冒险、兴奋、新鲜的想法、开朗、精力充沛、无所畏惧、外向",
  reversed: "仓促、不耐烦、缺乏想法、发脾气、懒惰、无聊、不可靠、心烦意乱"
},
{
  upright: "勇敢、精力充沛、迷人、英雄、叛逆、脾气暴躁、自由精神",
  reversed: "傲慢、鲁莽、不耐烦、缺乏自制力、被动、易变、专横"
},
{
  upright: "自信、热情、坚定、社交、有魅力、活泼、乐观",
  reversed: "苛求、报复心强、自信心不足、嫉妒、自私、喜怒无常、欺负人"
},
{
  upright: "领导力、远见、大局、掌控、大胆的决定、大胆、乐观",
  reversed: "强势、霸道、暴君、恶毒、无能为力、无效、软弱的领导者"
}
];

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
    const cardContainer = document.getElementById('cardContainer');
    cardContainer.innerHTML = `
        <button class="btn" onclick="drawOneCard()">抽牌</button>
    `;
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
    const imgPath = `${cdnBaseUrl}${parseInt(card.number) + 1}.jpg`;
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
  ['resultContainer', 'outputText'].forEach(id => {
    const element = document.getElementById(id);
    if(element) {
      element.innerHTML = '';
      element.style.display = 'block'; // 确保元素可见性被重置
    }
  });
  
  ['resetButton', 'copyButton', 'aiButton'].forEach(id => {
    const element = document.getElementById(id);
    if(element) {
      element.style.display = 'none';
      // 重置AI按钮状态
      if(id === 'aiButton') {
        element.classList.remove('loading');
        element.textContent = 'AI解读';
      }
    }
  });
  
  const inputText = document.getElementById('inputText');
  if(inputText) {
    inputText.value = '';
  }
  
  // 重新初始化卡片
  initCards();
  
  // 中止任何正在进行的AI请求
  if(window.currentAIRequest) {
    window.currentAIRequest.abort();
    window.currentAIRequest = null;
  }
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
  let inputText = document.getElementById('inputText').value;
  // 如果是默认问题，去掉（默认）后缀
  inputText = inputText.replace('（默认）', '');
  
  const cardNames = drawnCards.map(card => 
      `${card.reversed ? "逆位" : ""}${majorArcanaCardNames[card.number]}`
  ).join('、');
  const cardDescriptionsText = drawnCards.map(card => 
      `${card.reversed ? "逆位" : ""}${majorArcanaCardNames[card.number]}：${card.description}`
  ).join('\n');
  
  const prompt = `你是一个专业的塔罗师，你会根据我的问题和抽的牌给我解决问题，200 字左右。\n 问题：${inputText}\n\n抽取的卡牌：\n${cardDescriptionsText}\n`;

  const outputText = document.getElementById('outputText');
  const aiButton = document.getElementById('aiButton');
  outputText.style.display = 'none';
  aiButton.classList.add('loading');
  aiButton.textContent = '';

  try {
    // 创建 AbortController 实例
    const controller = new AbortController();
    window.currentAIRequest = controller;

    const response = await fetch('https://flow.onlyikun.com/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        model: "ep-20250228144601-xv4p8"
      }),
      signal: controller.signal // 添加 signal
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

    // 只在没有收到任何内容时抛出错误
    if (accumulatedText.trim() === '') {
      throw new Error('AI未返回有效的解读结果');
    }

  } catch (error) {
    // 如果是中止请求导致的错误，就不显示错误信息
    if(error.name === 'AbortError') {
      return;
    }
    
    console.error("AI解读失败: ", error);
    outputText.style.display = 'block';
    outputText.innerHTML = `<div style="color: #ff4081; padding: 10px; border: 1px solid #ff4081; border-radius: 5px; margin: 10px 0;">
      <p>😔 AI解读遇到了一些问题：</p>
      <p>${error.message}</p>
      <p>您可以：</p>
      <ul>
        <li>检查网络连接</li>
        <li>稍等片刻后重试</li>
        <li>如果问题持续存在，请刷新页面</li>
      </ul>
    </div>`;
  } finally {
    // 清除当前请求引用
    if(window.currentAIRequest) {
      window.currentAIRequest = null;
    }
    aiButton.classList.remove('loading');
    aiButton.textContent = 'AI解读';
  }
}

// 从78张牌中随机抽取一张
function drawOneCard() {
    if (!isCardClickable) return;
    isCardClickable = false;
    
    const inputText = document.getElementById('inputText').value;
    if (!inputText.trim()) {
        alert("你还没有写下问题呢");
        isCardClickable = true;
        return;
    }

    // 获取 URL 参数中的抽牌数量
    const urlParams = new URLSearchParams(window.location.search);
    const cardCount = parseInt(urlParams.get('count')) || 1;
    
    drawnCards = [];
    
    // 根据指定数量抽取卡牌
    for(let i = 0; i < cardCount; i++) {
        const cardNumber = Math.floor(Math.random() * 78); // 只从大阿卡纳牌中选择
        const isReversed = Math.random() < 0.5;
        
        drawnCards.push({
            number: cardNumber,
            reversed: isReversed,
            description: isReversed ? cardDescriptions[cardNumber].reversed : cardDescriptions[cardNumber].upright
        });
    }
    
    drawCount = cardCount;

    // 更新结果区域
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = drawnCards.map(card => 
        generateResultContent({
            number: card.number,
            reversed: card.reversed
        })
    ).join('');

    // 显示按钮
    ['resetButton', 'copyButton', 'aiButton'].forEach(id => 
        document.getElementById(id).style.display = 'block');

    // 更新输出文本
    const outputText = document.getElementById('outputText');
    const cardNames = drawnCards.map(card => 
        `<strong>${card.reversed ? "逆位" : ""}${majorArcanaCardNames[card.number]}</strong>`
    ).join('、');
    
    const cardDescriptionsText = drawnCards.map(card => 
        `<em>${card.reversed ? "逆位" : ""}${majorArcanaCardNames[card.number]}，代表${card.description}</em>`
    ).join('<br>');
    
    const resultText = `${cardNames}<br>${inputText}<br><br><strong>牌意简介</strong><br>${cardDescriptionsText}`;
    outputText.innerHTML = resultText;

    // 滚动到底部
    setTimeout(() => {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);

    setTimeout(() => {
        isCardClickable = true;
    }, 500);
}

document.addEventListener('DOMContentLoaded', function() {
    initCards();  // 保持原有的 initCards 调用

    // particles.js 初始化
    particlesJS('particles-js', {
        particles: {
            number: { value: 0 },
            color: { value: "#ffffff" },
            shape: { type: "circle" },
            opacity: {
                value: 0.7,
                random: false,
                anim: { enable: false }
            },
            size: {
                value: 1,
                random: true,
                anim: { enable: false }
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
                onhover: { enable: false },
                onclick: { enable: false },
                resize: true
            }
        },
        retina_detect: true
    });

    // 其他粒子动画相关代码...
}); 