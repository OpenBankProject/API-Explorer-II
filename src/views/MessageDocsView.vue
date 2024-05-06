<script setup lang="ts">
import { reactive, ref, onBeforeMount, onMounted, inject, watch } from 'vue'
import { useRoute } from 'vue-router'
import SearchNav from '../components/MessageDocsSearchNav.vue'
import { connectors } from '../obp/message-docs'
import { obpGroupedMessageDocsKey } from '@/obp/keys';

let connector = connectors[0]
const route = useRoute()
const groupedMessageDocs = ref(inject(obpGroupedMessageDocsKey)!)
const messageDocs = ref({})

onBeforeMount(() => {
  setDoc()
})

watch(
  () => route.params.id,
  async (id) => {
    setDoc()
  }
)

const setDoc = () => {
  const paramConnector = route.params.id
  if (connectors.includes(paramConnector)) {
    connector = paramConnector
  }
  messageDocs.value = groupedMessageDocs.value[connector]
}
function showRequiredFieldInfo(value: any) {
  return (JSON.stringify(value, null) === '{}' || JSON.stringify(value, null) === '')
}
function showDependentEndpoints(value: any) {
  return value.lengtt > 0
}
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
            <div v-for="(group, key) of messageDocs" :key="key">
              <div v-for="(value, key) of group" :key="value">
                <el-divider content-position="left">{{ value.process }}</el-divider>
                <a v-bind:href="`#${value.process}`" :id="value.process">
                  <h2>{{ value.description }}</h2>
                </a>
                <el-descriptions direction="vertical" :column="1" border>
                  <el-descriptions-item label="Outbound Topic">
                    {{ value.outbound_topic }}
                  </el-descriptions-item>
                  <el-descriptions-item label="Inbound Topic">
                    {{ value.inbound_topic }}
                  </el-descriptions-item>
                  <el-descriptions-item label="Outbound Message">
                    <pre>{{ JSON.stringify(value.example_outbound_message, null, 4) }}</pre>
                  </el-descriptions-item>
                  <el-descriptions-item label="Inbound Message">
                    <pre>{{ JSON.stringify(value.example_inbound_message, null, 4) }}</pre>
                  </el-descriptions-item>
                  <el-descriptions-item v-if="showRequiredFieldInfo(value.requiredFieldInfo)" label="Required Fields">
                    <pre>{{ JSON.stringify(value.requiredFieldInfo, null, 4) }}</pre>
                  </el-descriptions-item>
                  <el-descriptions-item v-if="showDependentEndpoints(value.dependent_endpoints)"
                    label="Dependent Endpoints">
                    <ul>
                      <li v-for="(endpoint, key) of value.dependent_endpoints">
                        {{ endpoint.version }}: {{ endpoint.name }}
                      </li>
                    </ul>
                  </el-descriptions-item>
                </el-descriptions>
                <el-divider content-position="right">{{ value.process }}</el-divider>
                <br />
                <br />
                <br />
                <br />
              </div>
            </div>
          </main>
        </el-container>
      </el-container>
    </el-main>
  </el-container>
</template>

<style scoped>
.main {
  max-height: 90vh;
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
pre {
  font-family: 'Roboto';
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
