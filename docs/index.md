---
layout: home
layoutClass: 'm-home-layout'

hero:
  name: 时月东方
  text: 的网络垃圾桶
  tagline: ☀️春日载阳，福履齐长
  image:
    src: /logo.png
    alt: 时月东方
  actions:
    - text: 在线塔罗
      link: https://sydf.cc/akn.html
    - text: 在线六爻
      link: https://sydf.cc/ly.html
    - text: 时月云
      link: https://ali.sydf.cc
      theme: alt
      
features:
  - icon: 🧩
    title: 软件资源合集
    details: 网络上收集的软件游戏资源合集<br />管你谁的，下就完了
    link: /soft/
    linkText: 点击前往
  - icon: 🎬
    title: 影视综资源站合集
    details: 电影/电视剧/音乐/动漫/小说<br />或者更多
    link: /video/
    linkText: 点击前往
  - icon: 🤖
    title: AI资源合集
    details: 免费不要钱的AI工具<small>（白嫖更有性价比）</small><br />反正用就完了
    link: /ai/
    linkText: 点击前往

outline: [2, 3, 4]
    
---
<script setup>
import { NAV_DATA } from './data'
</script>
<style src="./index.scss"></style>

<MNavLinks v-for="{title, items} in NAV_DATA" :title="title" :items="items"/>

<br />

<style>
/*爱的魔力转圈圈*/
.m-home-layout .image-src:hover {
  transform: translate(-50%, -50%) rotate(666turn);
  transition: transform 59s 1s cubic-bezier(0.3, 0, 0.8, 1);
}

.m-home-layout .details small {
  opacity: 0.8;
}

.m-home-layout .bottom-small {
  display: block;
  margin-top: 2em;
  text-align: right;
}
</style>
