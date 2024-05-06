<script setup lang="ts">
import { SEARCH_LINKS_COLOR as searchLinksColorSetting } from '../obp/style-setting'
import { inject, ref } from 'vue'

const searchLinksColor = ref(searchLinksColorSetting);

const collectionData = [
    {
        "url": "/?api-collection-id=341bf039-97e4-4803-aaae-2d1dc6a5b162",
        "text": "Risk mgmt. & mitigation"
    },
    {
        "url": "/?api-collection-id=fc3220e5-c891-4943-bbdb-6579ef3889c0",
        "text": "Process mgmt. & enh."
    },
    {
        "url": "/?api-collection-id=18fa516e-8e52-473c-98c4-430b1043ef4f",
        "text": "Credit data & scoring"
    },
    {
        "url": "/?api-collection-id=7d4b5f73-9bde-4556-a0ee-ce0f746f833f",
        "text": "Innovative prods & svcs"
    },
    {
        "url": "/?api-collection-id=cbd97e62-fb8a-42a4-ad5a-139729d11312",
        "text": "Women-led/owned MSMEs prods & svcs"
    }
]

</script>

<template>
  <el-menu 
    class="collections-menu"
    mode="horizontal"
    background-color="#151d30"
    text-color="#fff"
    active-text-color="#52b165">
        <el-menu-item v-for="(item, index) in collectionData" :index="index">
            <RouterLink :to="item.url">{{ item.text }}</RouterLink>
        </el-menu-item>
    </el-menu>
</template>

<style scoped>
a {
  font-size: 14px;
  font-family: 'Roboto';
  color: #7787a6;
  text-decoration: none;
}

/* This is not working at the moment, but ideally we would like the color of the menu item to change when hovering.
a:hover {
    color: v-bind(searchLinksColor);
}
*/

</style>
