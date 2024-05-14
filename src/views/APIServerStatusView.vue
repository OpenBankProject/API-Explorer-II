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
import { ref, onBeforeMount } from 'vue'
import { SuccessFilled, RemoveFilled } from '@element-plus/icons-vue'
import { serverStatus } from './../obp'
const version = ref(__APP_VERSION__)
const status = ref({})
onBeforeMount(async () => {
  status.value = await serverStatus()
})
</script>

<template>
  <main>
    <div class="content">
      <div v-for="(value, name, index) in status">
        <div v-if="name === 'status'" class="status">
          <el-icon v-if="value === true" style="vertical-align: middle; color: green; width: auto"
            ><SuccessFilled
          /></el-icon>
          <el-icon v-else style="vertical-align: middle; color: red"><RemoveFilled /></el-icon>
          <span class="main-status-label">{{ name }}</span>
        </div>
        <div v-else class="sub-status">
          <span class="status-label">{{ name }}</span>
          &nbsp;&nbsp;&nbsp;<el-divider />&nbsp;&nbsp;&nbsp;
          <el-icon
            v-if="value === true"
            style="vertical-align: middle; color: green; font-size: 16px"
            ><SuccessFilled
          /></el-icon>
          <el-icon v-else style="vertical-align: middle; color: red"><RemoveFilled /></el-icon>
        </div>
      </div>
    </div>
  </main>
  <span>Version: {{ version }}</span>
</template>

<style scoped>
main {
  margin-top: -60px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #39455f;
  font-family: 'roboto';
  font-size: 30px;
}
span {
  font-size: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.content {
  width: 30%;
}
.main-status-label {
  display: block;
  font-size: 28px;
  padding: 15px;
}
.main-status-label:first-letter {
  text-transform: uppercase;
}
.status-label {
  font-size: 16px;
}
.status {
  display: inline-grid;
  justify-content: center;
  align-items: center;
  width: 100%;
}
.sub-status {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}
</style>
