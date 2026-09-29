<script lang="ts">
import { ArrowDown, ArrowUp, RefreshRight, Check, DocumentCopy, User } from '@element-plus/icons-vue'
import VueJsonPretty from 'vue-json-pretty';
import { ElMessage } from 'element-plus';
import 'vue-json-pretty/lib/styles.css';

export default {
    props: {
        name: {
            type: String,
            required: true
        },
        status: {
            type: String,
            required: true
        },
        args: {
            type: Object,
            required: false
        },
        result: {
            type: Object,
            required: false
        },
        toolCallId: {
            type: String,
            required: true
        },
    },
    data() {
        return {
            expanded: false,
        }
    },
    mounted() {
        if (this.status === 'awaiting_approval') {
            this.expanded = true;
        }
    },
    methods: {
        toggleExpanded() {
            this.expanded = !this.expanded;
        },
        copyToClipboard(text: string) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    ElMessage({
                        message: 'Copied to clipboard!',
                        type: 'success',
                        duration: 2000
                    });
                })
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    ElMessage({
                        message: 'Failed to copy to clipboard',
                        type: 'error',
                        duration: 2000
                    });
                });
        }
    },
    components: {
        VueJsonPretty,
    },
}

</script>


<template>
    <div class="tool-message-container" v-bind:class="(expanded || status === 'awaiting_approval' )? 'expanded':''">
        
        <div class="tool-message-header">
            <div class="tool-name">Tool Call: {{ name }}</div>
            <div class="right-aligned">
                <div v-if="status === 'awaiting_approval'" style="margin-right: 10px;">
                    <p style="color: #ffb400; font-size: small;">Awaiting Approval</p>
                </div>
                <div class="status" v-bind:class="status">
                    <div v-if="status === 'pending'">
                        <el-icon class="is-loading" color="#20cbeb"><RefreshRight /></el-icon>
                    </div>
                    <div v-else-if="status === 'awaiting_approval'">
                        <el-icon color="#ffb400"><User /></el-icon>
                    </div>
                    <div v-else-if="status === 'success'">
                        <el-icon color="#00ff18"><Check /></el-icon>
                    </div>
                </div>
                <div class="expand-icon" @click="toggleExpanded">
                    <el-icon><ArrowDown v-if="!expanded" /><ArrowUp v-else /></el-icon>
                </div>
            </div>
            
        </div>
        
        
        <div v-if="expanded" class="tool-detail">
            <div class="tool-id"><h4>ID:</h4>    {{ toolCallId }}</div>
            <h4>Arguments:</h4>
            <div class="tool-args-container">
                <div class="copy-to-clipboard">
                    <el-button size="small" circle @click="copyToClipboard(JSON.stringify(args, null, 2))" :dark="true"><el-icon><DocumentCopy /></el-icon></el-button>
                </div>
                <el-scrollbar wrap-class="tool-args">
                    <vue-json-pretty :data="args" :expand-depth="2" />
                </el-scrollbar>
            </div>
            <div v-if="status === 'awaiting_approval'" class="tool-approval-container">
                <h4>Approve this tool call?</h4>
                <el-button type="primary">Approve</el-button>
                <el-button type="danger">Deny</el-button>
            </div>
            <div v-else>
                <h4>Result:</h4>
            </div>
            <div v-if="result" class="tool-result-container">
                <div class="copy-to-clipboard">
                    <el-button size="small" circle @click="copyToClipboard(JSON.stringify(result, null, 2))" :dark="true"><el-icon><DocumentCopy /></el-icon></el-button>
                </div>
                <el-scrollbar wrap-class="tool-result">
                    <vue-json-pretty :data="result" :expand-depth="2" />
                </el-scrollbar>
                <!-- <div>{{ JSON.stringify(result, null, 2) }}</div> -->
            </div>
        </div>  
    </div>
    <!-- <el-card v-if="expanded" class="tool-details">
        <template #header>
            <div class="tool-id">ID: {{ toolCallId }}</div>
        </template>
        <div v-if="result" class="tool-result">
            <h4>Result:</h4>
            <pre>{{ JSON.stringify(result, null, 2) }}</pre>
        </div>
        <template #body>
            
        </template>
        
    </el-card> -->
</template>

<style scoped>

.tool-message-container {
    background-color: var(--obp-panel-dark-raised);
    color:#fff;
    font-size: small;
    padding: 10px;
    border-radius: 10px;
    margin: 10px 0 0 0;
    display: flex;
    flex-direction: column;
    width: 100%;
}

.copy-to-clipboard {
    display: inline-block;
    position: absolute;
    top: 10px;
    right: 20px;
    z-index: 10;;
}

.tool-id {
    display: flex;
    flex-direction: row;
    align-items: center;
}

.tool-args-container {
    background-color: #324863;
    padding: 10px;
    border-radius: 10px;
    margin-top: 10px;
    width: 90%;
    position: relative;
    height: auto;
    max-height: 200px;
    box-shadow: inset 0px 0px 17px -6px rgba(0,0,0,0.75);
    overflow: auto;
}

.tool-result {
    position: absolute;
    top: 10px;
    left: 10px;
}

.tool-result-container {
    background-color: #1e2a3a;
    padding: 10px;
    border-radius: 10px;
    margin-top: 10px;
    width: 90%;
    position: relative;
    height: 400px;
    box-shadow: inset 0px 0px 17px -6px rgba(0,0,0,0.75);
    overflow: auto;
}

.status {
    margin-left: auto;
    margin-right: 20px;
}

.expand-icon {
    margin-left: auto;
    cursor: pointer;
}

.right-aligned {
    display: flex;
    flex-direction: row;
    align-items: center;
}

.tool-message-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.tool-detail {
    margin-top: 10px;
}


</style>