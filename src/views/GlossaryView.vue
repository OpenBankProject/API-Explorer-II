<script setup lang="ts">
import { reactive, ref, onBeforeMount, onMounted, inject } from 'vue'
import SearchNav from '../components/GlossarySearchNav.vue'

const glossary = ref(inject('OBP-Glossary')!.glossary_items)
</script>

<template>
  <el-container>
    <el-aside class="search-nav" width="20%">
      <SearchNav />
    </el-aside>
    <el-main>
      <el-container class="main">
        <el-container>
          <main>
            <el-backtop :right="100" :bottom="100" target="main" />
            <div v-for="(value, key) of glossary" :key="value">
              <span>
                <a v-bind:href="`#${value.title}`" :id="value.title">
                  {{ value.title }}
                </a>
              </span>
              <div v-html="value.description.html" class="content"></div>
            </div>
          </main>
        </el-container>
      </el-container>
    </el-main>
  </el-container>
</template>

<style scoped>
.main {
  max-height: 95vh;
}
template {
  overflow: auto;
  max-height: 900px;
}
main {
  margin: 25px;
  color: #39455f;
  font-family: 'Roboto';
}
span {
  font-size: 28px;
}
div {
  font-size: 14px;
}
.content :deep(strong) {
  font-family: 'Roboto';
}
a {
  text-decoration: none;
  color: #39455f;
}
.content :deep(a) {
  text-decoration: none;
  color: #ffffff;
  font-family: 'Roboto';
  font-size: 14px;
  border-radius: 3px;
  background-color: #52b165;
  padding: 1px;
}
.content :deep(a):hover {
  background-color: #39455f;
}
</style>
