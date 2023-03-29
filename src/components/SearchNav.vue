<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
//import { getResourceDocs } from "../obp/client"

const activeNames = ref(['2'])
const form = reactive({
  search: ''
})

//const resourceDocs = (async ()=>{
//  console.log(await getResourceDocs());
//})()
</script>

<template>
  <el-form :model="form" label-width="120px">
    <el-input v-model="form.search" class="w-50 m-1" placeholder="Search" :prefix-icon="Search" />
  </el-form>
  <el-collapse v-model="activeNames">
    <el-collapse-item title="My Collections" name="1"> </el-collapse-item>
    <el-collapse-item title="API" name="2">
      <div class="el-tabs--right">
        <div class="el-tabs__nav-wrap is-right">
          <div v-for="i in 4" :key="i">
            <RouterLink :to="{ name: 'api', params: { id: 'API Item ' + i } }">{{
              'API Item ' + i
            }}</RouterLink>
          </div>
        </div>
      </div>
    </el-collapse-item>
  </el-collapse>
</template>
