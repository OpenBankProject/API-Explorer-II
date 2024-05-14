<!--
  - /**
  - Open Bank Project -  API Explorer II
  - Copyright (C) 2023-2024, TESOBE GmbH
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as published by
  - the Free Software Foundation, either version 3 of the License, or
  - (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with this program.  If not, see <http://www.gnu.org/licenses/>.
  -
  - Email: contact@tesobe.com
  - TESOBE GmbH
  - Osloerstrasse 16/17
  - Berlin 13359, Germany
  -
  -   This product includes software developed at
  -   TESOBE (http://www.tesobe.com/)
  -  */
  -->

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
