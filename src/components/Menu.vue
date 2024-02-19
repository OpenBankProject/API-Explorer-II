<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { searchLinksColor as searchLinksColorSetting } from '../obp/style-setting'
import { inject, ref } from 'vue'
import { updateServerStatus } from '@/obp/common-functions';

const version = ref(__APP_VERSION__)
const i18n = inject('i18n')
const host = inject('OBP-API-Host')
const searchLinksColor = ref(searchLinksColorSetting)
const handleLocale = (command: string) => {
  i18n.global.locale.value = command
}
const updateStatus = (event: any) => {
  updateServerStatus()
}
</script>

<template>
  <el-row>
    <el-col :span="10" class="menu-left">
      &nbsp;&nbsp;
      <span id="selected-api-version" class="host">OBPv5.1.0</span>
    </el-col>
    <el-col :span="14" class="menu-right">
      <span class="host"><v-chip>App Version: {{ version }}</v-chip></span>
      &nbsp;&nbsp;
      <v-chip>
        <span class="host"
        ><span id="backend-status" @click="updateStatus" >API Host: </span>
        <a :href="host">
          {{ host }}
        </a>
      </span>
      </v-chip>
      &nbsp;&nbsp;
      <el-dropdown class="menu-right" @command="handleLocale">
        <span class="el-dropdown-link">
          {{ $i18n.locale }}
          <el-icon class="el-icon--right">
            <arrow-down />
          </el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="locale in $i18n.availableLocales"
              :key="`locale-${locale}`"
              :command="locale"
              >{{ locale }}</el-dropdown-item
            >
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </el-col>
  </el-row>
</template>

<style scoped>
a {
  font-size: 14px;
  font-family: 'Roboto';
  color: #7787a6;
  text-decoration: none;
}
a:hover {
  color: v-bind(searchLinksColor);
}
.host {
  font-size: 14px;
  font-family: 'Roboto';
}
.menu-left,
.menu-right,
.el-dropdown-menu {
  color: #7787a6;
}
.server-is-online {
  color: v-bind(searchLinksColor);
}
.server-is-offline {
  color: red;
}
</style>
