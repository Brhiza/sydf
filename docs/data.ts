import type { NavLink } from '../.vitepress/theme/types'

type NavData = {
  title: string
  items: NavLink[]
}

export const NAV_DATA: NavData[] = [
  {
    title: '创作者',
    items: [
      {
        icon: 'https://p3-pc-weboff.byteimg.com/tos-cn-i-9r5gewecjs/pwa_v3/192_192.png',
        title: '抖音',
        desc: '抖音创作者中心',
        link: 'https://creator.douyin.com',
      },
            {
        icon: 'https://lf3-star.xingtu.cn/obj/star-fe/favicon.png',
        title: '巨量星图',
        desc: '抖音智能营销与经营平台',
        link: 'https://www.xingtu.cn/',
      },
      {
        icon: 'https://s1-11674.kwimgs.com/udata/pkg/fe/kwai_logo.fc61f660.png',
        title: '快手',
        desc: '快手创作者服务平台',
        link: 'https://cp.kuaishou.com',
      },
      {
        icon: 'https://favicon.im/www.xiaohongshu.com',
        title: '小红书',
        desc: '小红书创作服务平台',
        link: 'https://creator.xiaohongshu.com',
      },
      {
        icon: 'https://res.wx.qq.com/t/wx_fed/finder/helper/finder-helper-web/res/favicon-v2.ico',
        title: '视频号',
        desc: '视频号助手',
        link: 'https://channels.weixin.qq.com',
      },
      {
        icon: 'https://static.hdslb.com/images/favicon.ico',
        title: '哔哩哔哩',
        desc: '哔哩哔哩创作中心',
        link: 'https://member.bilibili.com',
      },
            {
        icon: '/logo.png',
        title: '链接提取器',
        desc: '提取网页链接',
        link: '/dou',
      },
    ],
  },
  {
    title: '在线小工具',
    items: [
      {
        icon: 'https://simg.doyo.cn/imgfile/bgame/202312/12153710pzpf.png',
        title: '易搜',
        desc: '努力做最好用的云盘资源搜索引擎！',
        link: 'https://yiso.fun',
      },
      {
        icon: 'https://unpkg.com/@liumingye/cdn2@1.5.65/favicon.ico',
        title: 'MyFreeMP3',
        desc: '在线音乐下载',
        link: 'https://tools.liumingye.cn/music/#/',
      },
      {
        icon: 'https://snapany.com/favicon.ico',
        title: '万能视频图片解析下载',
        desc: '快速、免费、简单. 从1000+平台保存视频和图片',
        link: 'https://snapany.com/zh',
      },
            {
        icon: 'https://www.iloveimg.com/img/favicons-img/favicon-16x16.png',
        title: '在线图片编辑',
        desc: '免费在线',
        link: 'https://www.iloveimg.com/zh-cn',
      },
            {
        icon: 'https://www.remove.bg/favicon-16x16.png',
        title: '抠图',
        desc: '反正抠就完了',
        link: 'https://www.remove.bg/zh',
      },
            {
        icon: 'https://bigjpg.com/static/css/touch-icon-iphone.png',
        title: '图片放大',
        desc: '反正放就完了',
        link: 'https://bigjpg.com/',
      },
            {
        icon: 'https://p3-scmimg.bytescm.com/tos-cn-i-rn3s1tazwm/lab/mt-portal/mt-portal-fe/static/image/favicon.8a2e2043.ico~tplv-rn3s1tazwm-resize:0:0:q80.image',
        title: '火山翻译',
        desc: '字节跳动旗下的机器翻译品牌，支持超过100种语种的免费在线翻译',
        link: 'https://translate.volcengine.com/',
      },
            {
        icon: 'https://ol.woobx.cn/favicon.ico',
        title: '一个木函',
        desc: '快速、免费、简单. 从1000+平台保存视频和图片',
        link: 'https://ol.woobx.cn/',
      },
                  {
        icon: 'https://wannianli.tianqi.com/favicon.ico',
        title: '万年历',
        desc: '万年历查询',
        link: 'https://wannianli.tianqi.com/',
      },
    ],
  },
]
