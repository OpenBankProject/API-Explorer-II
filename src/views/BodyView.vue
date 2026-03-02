<!--
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
  -
  -->

<script setup lang="ts">
import SearchNav from '../components/SearchNav.vue'
import Menu from '../components/Menu.vue'
import AutoLogout from '../components/AutoLogout.vue'
import ChatWidget from '../components/ChatWidget.vue'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import { onMounted, ref, computed } from 'vue'
import {  getCurrentUser } from '../obp'
import { useRoute } from 'vue-router'

const route = useRoute()
const isLoggedIn = ref(false);

onMounted(async () => {
  const currentUser = await getCurrentUser()
  const currentResponseKeys = Object.keys(currentUser)
  isLoggedIn.value = currentResponseKeys.includes('username')
})

const hasOperationId = computed(() => {
  return !!route.query.operationid
})

const isChatbotEnabled = import.meta.env.VITE_CHATBOT_ENABLED === 'true'
</script>

<template>

  <AutoLogout v-if=isLoggedIn />
  <Splitpanes class="root">
    <Pane :size="20" :min-size="10" :max-size="40">
      <div class="search-nav">
        <!--Left-->
        <SearchNav />
      </div>
    </Pane>
    <Pane :size="80">
      <div class="main">
        <div class="menu">
          <Menu />
        </div>
        <Splitpanes v-if="hasOperationId" class="middle">
          <Pane :size="50">
            <div class="summary">
              <RouterView name="body" />
            </div>
          </Pane>
          <Pane :size="50">
            <div class="preview">
              <RouterView name="preview" />
            </div>
          </Pane>
        </Splitpanes>
        <div v-else class="middle">
          <div class="summary">
            <RouterView name="body" />
          </div>
        </div>
      </div>
      <ChatWidget v-if="isChatbotEnabled" />
    </Pane>
  </Splitpanes>
</template>

<style>
.root {
  height: 100%;
}
.summary {
  height: 100%;
  overflow: auto;
}
.main {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.search-nav {
  height: 100%;
  max-height: 100%;
  overflow: hidden;
}
.middle {
  flex: 1;
  overflow: hidden;
}
.preview {
  color: white;
  background-color: #151d30;
  height: 100%;
  overflow: auto;
}
.collections {
  margin-left: -20px;
  margin-right: -20px;
  padding-left: 20px;
  padding-right: 20px;
}

/* Splitpanes handle styling */
.splitpanes--vertical > .splitpanes__splitter {
  width: 5px;
  background-color: #dcdfe6;
  border: none;
  cursor: col-resize;
}
.splitpanes--vertical > .splitpanes__splitter:hover {
  background-color: #409eff;
}
</style>
