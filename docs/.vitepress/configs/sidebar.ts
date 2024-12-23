import type { DefaultTheme } from 'vitepress'

export const sidebar: DefaultTheme.Config['sidebar'] = {
	
  '/gd/': [
    {
      text: '功德箱',
      // collapsed: false,
      items: [
        { text: '希望工程', link: '/gd/xwgc' },
        { text: '腾讯公益', link: '/gd/txgy' }
      ]	
	}
]
}