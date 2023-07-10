<script setup lang="ts">
import { reactive, ref, onBeforeMount, onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import SearchNav from '../components/MessageDocsSearchNav.vue'
import { getOBPMessageDocs, getGroupedMessageDocs } from '../obp/message-docs'

const route = useRoute()
const messageDocs = ref({})

//Refactor
const messageDocItems = [
  'kafka_vSept2018',
  'akka_vDec2018',
  'rest_vMar2019',
  'stored_procedure_vDec2019'
]

onBeforeMount(async () => {
  let connector = messageDocItems[0]
  if (route.query && Object.keys(route.query).includes('connector')) {
    const queryParamConnector = route.query.connector
    if (messageDocItems.includes(queryParamConnector)) {
      connector = queryParamConnector
    }
  }
  messageDocs.value = await getGroupedMessageDocs(await getOBPMessageDocs(connector))
})
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
                <a v-bind:href="`#${value.process}`" :id="value.process">
                  <b>{{ value.description }}</b>
                </a>
                <el-descriptions :title="value.description" direction="vertical" :column="3" border>
                  <el-descriptions-item label="Kafka/Akka">
                    <b>Topic</b>
                  </el-descriptions-item>
                  <el-descriptions-item label="Outbound">
                    {{ value.outbound_topic }}
                  </el-descriptions-item>
                  <el-descriptions-item label="Inbound">
                    {{ value.inbound_topic }}
                  </el-descriptions-item>
                  <el-descriptions-item>
                    <b>Message</b>
                  </el-descriptions-item>
                  <el-descriptions-item>
                    <pre>{{ JSON.stringify(value.example_outbound_message, null, 4) }}</pre>
                  </el-descriptions-item>
                  <el-descriptions-item>
                    <pre>{{ JSON.stringify(value.example_inbound_message, null, 4) }}</pre>
                  </el-descriptions-item>
                  <el-descriptions-item>
                    <b>Required Fields</b>
                  </el-descriptions-item>
                  <el-descriptions-item>
                    <pre>{{ JSON.stringify(value.requredFieldInfo, null, 4) }}</pre>
                  </el-descriptions-item>
                  <el-descriptions-item>
                    <pre>{{ JSON.stringify(value.requredFieldInfo, null, 4) }}</pre>
                  </el-descriptions-item>
                  <el-descriptions-item>
                    <b>Dependent Endpoints</b>
                  </el-descriptions-item>
                  {{ value.requredFieldInfo }}
                  <el-descriptions-item>
                    <ul>
                      <li v-for="(endpoint, key) of value.dependent_endpoints">
                        {{ endpoint.version }}: {{ endpoint.name }}
                      </li>
                    </ul>
                  </el-descriptions-item>
                  <el-descriptions-item> </el-descriptions-item>
                </el-descriptions>
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
