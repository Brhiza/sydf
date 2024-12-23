---
layoutClass: m-nav-layout
outline: [2, 3, 4]
comment: false
---

<script setup>
import { NAV_DATA } from './data'
</script>
<style src="./index.scss"></style>

# 软件资源合集

<MNavLinks v-for="{title, items} in NAV_DATA" :title="title" :items="items"/>

<br />
