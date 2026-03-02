<script lang="ts">

import MarkdownIt from "markdown-it";

// Imports for syntax highlighting
// Languages that we want syntax highlighting for need to be imported here
import Prism from 'prismjs';
import 'prismjs/themes/prism.css'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-liquid'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-markup-templating'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-scss'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-http';
import 'prismjs/themes/prism-okaidia.css';

import { Warning, RefreshRight, Check } from '@element-plus/icons-vue'
import ToolCall from './ToolCall.vue';

export default {
    props: {
        message: {
            type: Object,
            required: true
        },
        loading: {
            type: Boolean,
            default: false
        },
    },
    data() {
        return {
            type: '',
            content: ''
        }
    },
    methods: {
        highlightCode(content: string, language: string) {
            if (Prism.languages[language]) {
                return Prism.highlight(content, Prism.languages[language], language);
            } else {
                console.log(`could not highlight ${language} code block, add language to dependencies`)
                // If the language is not recognized, return the content as is
                return content;
            }
        },
        renderMarkdown(content: string) {
            const markdown = new MarkdownIt({
                highlight: (str, lang): string => {
                    if (lang && Prism.languages[lang]) {
                        try {
                            return `<pre class="language-${lang}"><code>${this.highlightCode(str, lang)}</code></pre>`;
                        } catch (error) {
                            console.log(`error hilighting ${lang} code block: ${error}`)
                        }
                    } else if (!lang) {
                        console.warn('No language specified for code block')
                    } else if (!Prism.languages[lang]) {
                        console.warn(`Language ${lang} not recognized or not installed, see imports for this component`)
                    }

                    // If the language is not specified or not recognized, use a default language
                    return `<pre class="language-"><code>${markdown.utils.escapeHtml(str)}</code></pre>`;
                }
            });

            return markdown.render(content);
        },
    }
}
</script>

<template>
    <div :class="message.role">
        <!-- Render Tool call boxes if there are any -->
        <div v-if="message.toolCalls?.length !== 0" class="tool-calls-container">
            <div v-for="toolCall in message.toolCalls" class="tool-call">
                <ToolCall :name="toolCall.toolCall.name" :status="toolCall.status" :args="toolCall.toolCall.args" :result="toolCall.output" :toolCallId="toolCall.toolCall.id" />
            </div>
        </div>

        <div class="message-container">
            <div v-if="!loading" class="content" v-html="renderMarkdown(message.content)"></div>
            <div v-else class="content">
                <div class="ticontainer">
                    <div class="tiblock">
                        <div class="tidot"></div>
                        <div class="tidot"></div>
                        <div class="tidot"></div>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="message.error" class="error"><el-icon><Warning /></el-icon> {{ message.error }}</div>
    </div>

</template>

<style>
.message-container {
    background-color: antiquewhite;
    color:black;
    padding: 10px;
    margin: 10px 0 10px 0;
    display: flex;
    flex-direction: column;
    width: fit-content;
    max-width: min(600px, calc(100% - 60px));
}
.tool-calls-container {
    display: flex;
    flex-direction: column;
    max-width: min(600px, calc(100% - 60px));
}

.tool-call {
    width: auto;
    max-width: 100%;
}

.user, .assistant {
    display: flex;
    flex-direction: column;
    font-family: 'Courier New', Courier, monospace;
}

.user .error {
    color: red;
    font-weight: bold;
    align-self: flex-end;
    font-size: smaller;
}

.user .message-container {
    margin-left: auto;
    margin-right: 0px;
    border-radius: 10px 10px 0 10px;
    align-items: flex-end;
    flex-basis: content;
    justify-content: flex-end;
    color: white;
    background-color: #2b303b;
}

.assistant .message-container {
    border-radius: 10px 10px 10px 0px;
    margin-left: 0px;
    margin-right: auto;
    align-items: flex-start;
    color: white;
    background-color: #3e4e70;
}

.assistant .error {
    color: red;
    font-weight: bold;
    align-self: flex-start;
    font-size: smaller;
}

.content {
    margin-top: -10px;
    margin-bottom: -10px;
    max-width: 100%;
}

/* for the loading indicator */
.tiblock {
    align-items: center;
    display: flex;
    height: 17px;
}

.ticontainer .tidot {
    background-color: #90949c;
}

.tidot {
    animation: mercuryTypingAnimation 1.5s infinite ease-in-out;
    border-radius: 2px;
    display: inline-block;
    height: 4px;
    margin-right: 2px;
    width: 4px;
}

@keyframes mercuryTypingAnimation{
0%{
  -webkit-transform:translateY(0px)
}
28%{
  -webkit-transform:translateY(-5px)
}
44%{
  -webkit-transform:translateY(0px)
}
}

.tidot:nth-child(1) {
    animation-delay:200ms;
}
.tidot:nth-child(2){
    animation-delay:300ms;
}
.tidot:nth-child(3){
    animation-delay:400ms;
}

/* Override Prism.js styling for Scala code blocks to make them readable */
pre.language-scala {
    background-color: #f5f5f5 !important;
    color: #333 !important;
    font-family: 'Courier New', Courier, monospace !important;
    padding: 1em !important;
    overflow: auto !important;
}

pre.language-scala code {
    background-color: transparent !important;
    color: #333 !important;
    font-family: 'Courier New', Courier, monospace !important;
}

/* Reset all token colors for Scala to ensure readability */
pre.language-scala .token {
    color: #333 !important;
}
</style>
