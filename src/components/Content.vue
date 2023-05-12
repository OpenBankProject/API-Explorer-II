<script setup lang="ts">
import { ref, inject, onActivated, onMounted } from 'vue'
import { onBeforeRouteUpdate, useRoute } from 'vue-router'
import { getOperationDetails } from '../obp/resource-docs'
import { ArrowLeftBold, ArrowRightBold } from '@element-plus/icons-vue'

const route = useRoute()
const description = ref('')
const summary = ref('')
const docs = inject('OBP-ResourceDocs')
const displayPrev = ref(true)
const displayNext = ref(true)
const prev = ref({ id: 'prev' })
const next = ref({ id: 'next' })

const setOperationDetails = (id: string): void => {
  const operation = getOperationDetails(docs, id)
  description.value = operation.description
  summary.value = operation.summary
}

const setPager = (id: string): void => {
  const target = document.getElementById(id).parentElement
  const prevElement = target.previousSibling
  const nextElement = target.nextSibling
  const active = document.querySelector('.active-api-router-tab')
  active.classList.remove('active-api-router-tab')
  target.classList.add('active-api-router-tab')
  if (prevElement.className && prevElement.className.startsWith('api-router-tab')) {
    const prevItem = prevElement.children.item(0)
    prev.value['title'] = prevItem.text
    prev.value['id'] = prevItem.id
    displayPrev.value = true
  } else {
    displayPrev.value = false
  }
  if (nextElement.className && nextElement.className.startsWith('api-router-tab')) {
    const nextItem = nextElement.children.item(0)
    next.value['title'] = nextItem.text
    next.value['id'] = nextItem.id
    displayNext.value = true
  } else {
    displayNext.value = false
  }
}

onMounted(() => {
  setOperationDetails(route.params.id)
  setPager(route.params.id)
})
onBeforeRouteUpdate((to) => {
  setOperationDetails(to.params.id)
  setPager(to.params.id)
})
</script>

<template>
  <main>
    <el-container>
      <el-main>
        <span>{{ summary }}</span>
        <div v-html="description" class="content"></div>
      </el-main>
      <el-footer class="footer">
        <el-row>
          <el-col :span="12" class="pager-left">
            <el-icon v-show="displayPrev"><ArrowLeftBold /></el-icon>
            <RouterLink
              v-show="displayPrev"
              class="pager-router-link"
              :to="{ name: 'api', params: { id: prev.id } }"
              >{{ prev.title }}</RouterLink
            >
          </el-col>
          <el-col :span="12" class="pager-right">
            <RouterLink
              v-show="displayNext"
              class="pager-router-link"
              :to="{ name: 'api', params: { id: next.id } }"
              >{{ next.title }}</RouterLink
            >
            <el-icon v-show="displayNext"><ArrowRightBold /></el-icon>
          </el-col>
        </el-row>
      </el-footer>
    </el-container>
  </main>
</template>

<style scoped>
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
.content :deep(p a) {
  line-height: 28px;
  padding: 5px;
  margin: 3px;
  color: #39455f;
  font-family: 'Roboto';
  font-size: 14px;
  text-decoration: none;
  border-radius: 5px;
  background-color: #eef0f4;
}
.pager {
  position: absolute;
  bottom: 0;
}
.pager-left {
  display: flex;
  justify-content: left;
  align-items: center;
}
.pager-right {
  display: flex;
  justify-content: right;
  align-items: center;
}
.footer {
  max-height: 20px;
}
.pager-router-link {
  font-family: 'Roboto';
  text-decoration: none;
  color: #39455f;
}
.pager-router-link:hover,
.pager-left:hover,
.pager-right:hover {
  color: #52b165;
}
</style>
