import type { NavLink } from '../.vitepress/theme/types'

type NavData = {
  title: string
  items: NavLink[]
}

export const NAV_DATA: NavData[] = [
  {
    title: '免费AI',
    items: [
      {
        icon: 'https://ylsagi.com/favicon.png',
        title: '伊莉思AGI',
        link: 'https://ai.caifree.com',
      },
      {
        icon: 'https://s21.ax1x.com/2024/11/04/pArzzgU.png',
        title: 'RawChat',
        link: 'https://sharedchat.fun',
      },
      {
        icon: 'https://s21.ax1x.com/2024/11/04/pArzzgU.png',
        title: 'RawChat - Claude',
        link: 'https://kelaode.ai',
      },
      {
        icon: 'https://s21.ax1x.com/2024/11/04/pAsS9u4.png',
        title: '我的AI',
        link: 'https://chat-1-1.myai.asia',
      },
      {
        icon: 'https://upimage.liujiarong.top/app/thumb.php?img=/i/2023/12/31/12kpwbs.png',
        title: 'Chat nio',
        link: 'https://chatnio.liujiarong.top',
      },
            {
        icon: 'https://cc.ai55.cc/favicon.svg',
        title: 'AI List',
        link: 'https://cc.ai55.cc',
      },
            {
        icon: 'https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/doubao/web/logo-icon.png',
        title: '抖音豆包',
        link: 'https://www.doubao.com/chat',
      },
                  {
        icon: 'https://statics.moonshot.cn/kimi-chat/favicon.ico',
        title: 'kimi AI',
        link: 'https://kimi.moonshot.cn',
      },
                  {
        icon: 'https://www.gaoding.com/pwa/icon-144.png',
        title: '稿定ai',
        link: 'https://www.gaoding.com/create-design',
      },
    ],
  },
]
