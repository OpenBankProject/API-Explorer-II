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
import ChatWidget from '../components/ChatWidget.vue'
import Collections from '../components/Collections.vue'
import { inject } from 'vue'

const isChatbotEnabled = import.meta.env.VITE_CHATBOT_ENABLED === 'true'
</script>

<template>
  <el-container class="root">
    <el-aside class="search-nav" width="20%">
      <!--Left-->
      <SearchNav />
    </el-aside>
    <el-main>
      <el-container class="main">
        <!--<el-header class="collections">
          <Collections />
        </el-header>-->
        <el-header class="menu">
          <Menu />
        </el-header>
        <el-container class="middle">
          <el-aside class="summary" width="50%">
            <!--Middle -->
            <RouterView name="body" />
          </el-aside>
          <el-aside class="preview" width="50%">
            <!--right -->
            <RouterView class="preview" name="preview" />
          </el-aside>
        </el-container>
        <!--<el-footer> -->
        <!--Bottom -->
        <!--Footer
        </el-footer>-->
      </el-container>
      <ChatWidget v-if="isChatbotEnabled" />
    </el-main>
  </el-container>
</template>

<style>
.root {
  min-height: 100vh;
  overflow: unset;
}
.middle {
  max-height: 95vh;
}
.summary {
  max-height: 95vh;
}
.preview {
  color: white;
  background-color: #151d30;
  max-height: 100vh;
}
.collections {
  margin-left: -20px;
  margin-right: -20px;
  padding-left: 20px;
  padding-right: 20px;
}
</style>
