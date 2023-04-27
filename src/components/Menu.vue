<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { inject } from 'vue'

const i18n = inject('i18n')
const host = inject('OBP-API-Host')
const handleLocale = (command: string) => {
  i18n.global.locale.value = command
}
</script>

<template>
  <el-row>
    <el-col :span="12" class="menu-left"></el-col>
    <el-col :span="12" class="menu-right">
      <span class="host">{{ host }}</span> &nbsp;&nbsp;&nbsp;&nbsp;
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
.host {
  font-size: 14px;
  font-family: 'Roboto';
}
.menu-right,
.el-dropdown-menu {
  color: #7787a6;
}
</style>
