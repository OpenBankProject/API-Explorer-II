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
import { obpGlossaryKey } from '@/obp/keys';
import { Search } from '@element-plus/icons-vue';
import { inject, onBeforeMount, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { SEARCH_LINKS_COLOR as searchLinksColorSetting } from '../obp/style-setting';

const route = useRoute()
const activeKeys = ref([])
const glossaryKeys = ref([])
const alphabet = ref([])
const searchLinksColor = ref(searchLinksColorSetting)
const form = reactive({
  search: ''
})

const alphabetCharCodes = Array.from(Array(26)).map((e, i) => i + 65)
alphabet.value = alphabetCharCodes.map((x) => String.fromCharCode(x))

onBeforeMount(() => {
  const glossary = inject(obpGlossaryKey)!
  for (const item of glossary.glossary_items) {
    if (!activeKeys.value.includes(item.title)) {
      activeKeys.value.push(item.title)
    }
  }
  glossaryKeys.value = activeKeys.value
})



onMounted(() => {
  let hash = route.hash;
  let elements = document.querySelectorAll(`a[href="${hash}"][class="glossary-router-link"]`)
  if (elements.length == 1) {
    elements[0].click()
  }
})

const filterKeys = (keys, key) => {
  return keys.filter((title) => {
    return title.toLowerCase().includes(key.toLowerCase())
  })
}

const searchEvent = (event) => {
  if (event) {
    glossaryKeys.value = filterKeys(activeKeys.value, event).sort()
  } else {
    glossaryKeys.value = activeKeys.value
  }
}
</script>

<template>
  <el-input v-model="form.search" class="w-50 m-1" placeholder="Search" :prefix-icon="Search" @input="searchEvent" />
  <div class="tabs">
    <div class="alphabet">
      <div v-for="value of alphabet" :key="value">
        <a :id="value" class="alphabet-router-link" v-bind:href="`#${value.toLowerCase()}-quick-nav`">
          <div class="alphabet-link">
            {{ value }}
          </div>
        </a>
      </div>
    </div>
    <div class="tab-items">
      <div class="el-tabs--right">
        <div v-for="value of glossaryKeys" :key="value" class="glossary-router-tab">
          <a class="glossary-router-link" :id="`${value.charAt(0).toLowerCase()}-quick-nav`" v-bind:href="`#${value}`">
            {{ value }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  max-height: 90vh;
}

.alphabet {
  padding: 10px 5px 5px 5px;
  min-width: 25px;
}

.alphabet-link {
  padding: 5px 0px 5px 0px;
  width: 100%;
  text-align: center;
  cursor: pointer;
}

.alphabet-router-link {
  font-size: 13px;
  font-family: 'Roboto';
  color: #39455f;
  text-decoration: none;
}

.glossary-router-link {
  margin-left: 15px;
  font-size: 13px;
  font-family: 'Roboto';
  text-decoration: none;
  color: #39455f;
  display: inline-block;
}

.glossary-router-tab {
  border-left: 2px solid var(--el-menu-border-color);
  line-height: 30px;
}

.glossary-router-tab:hover,
.active-glossary-router-tab {
  border-left: 2px solid v-bind(searchLinksColor);
}

.glossary-router-tab:hover .glossary-router-link,
.active-glossary-router-link,
.alphabet-router-link:hover,
.alphabet-link:hover .alphabet-router-link {
  color: v-bind(searchLinksColor);
}

.tab-items {
  overflow: auto;
  max-height: 100vh;
  margin-top: 10px;
  margin-right: -8px;
}
</style>
