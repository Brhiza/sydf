import type { DefaultTheme } from 'vitepress'

export const nav: DefaultTheme.Config['nav'] = [
    {
    text: '功德箱',
        items: [
    { text: '希望工程', link: '/gd/xwgc' },
    { text: '腾讯公益', link: '/gd/txgy' },
    ],
        activeMatch: '^/gd'
  },
  {
    text: 'My Tool',
    items: [
  { text: 'Wofew', link: 'https://w1hu1pdlrn.feishu.cn/base/Z3ZZbqAVIaJZ1LsSUn7cRIEkncb?from=from_copylink' },
  { text: 'Nas', link: 'https://nas.sydf.cc' },
  {
    text: 'Alist',
    link: 'https://ali.sydf.cc',
  },
    {
    text: 'Wol',
    link: 'http://154.12.62.50:18090/login/'
  }
    ],
  },
  {
    text: '关于我',
    link: '/about'
  }
]
