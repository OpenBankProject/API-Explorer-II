<!--
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
  -
  -->

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { mount, unmount } from 'svelte'
import Dropdown from '../../src-svelte/Dropdown.svelte'

interface Props {
  label?: string
  items?: string[]
  hoverColor?: string
  backgroundColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Dropdown',
  items: () => [],
  hoverColor: '#32b9ce',
  backgroundColor: '#e8f4f8'
})

const emit = defineEmits<{
  select: [value: string]
}>()

const containerRef = ref<HTMLDivElement>()
let svelteComponent: any = null

onMounted(() => {
  if (containerRef.value) {
    try {
      svelteComponent = mount(Dropdown, {
        target: containerRef.value,
        props: {
          label: props.label,
          items: props.items,
          hoverColor: props.hoverColor,
          backgroundColor: props.backgroundColor
        }
      })

      // Listen for the custom 'select' event from Svelte component
      containerRef.value.addEventListener('select', (event: Event) => {
        const customEvent = event as CustomEvent
        emit('select', customEvent.detail)
      })
    } catch (error) {
      console.error('Failed to mount Svelte Dropdown:', error)
    }
  }
})

onBeforeUnmount(() => {
  if (svelteComponent) {
    try {
      unmount(svelteComponent)
    } catch (error) {
      console.error('Failed to unmount Svelte Dropdown:', error)
    }
  }
})

// Watch for prop changes and update Svelte component
watch(
  () => [props.items, props.label],
  ([newItems, newLabel]) => {
    if (svelteComponent && containerRef.value) {
      // Remount with new props
      unmount(svelteComponent)
      svelteComponent = mount(Dropdown, {
        target: containerRef.value,
        props: {
          label: newLabel as string,
          items: newItems as string[],
          hoverColor: props.hoverColor,
          backgroundColor: props.backgroundColor
        }
      })

      // Re-add event listener
      containerRef.value.addEventListener('select', (event: Event) => {
        const customEvent = event as CustomEvent
        emit('select', customEvent.detail)
      })
    }
  }
)
</script>

<template>
  <div ref="containerRef" class="svelte-dropdown-wrapper"></div>
</template>

<style scoped>
.svelte-dropdown-wrapper {
  display: inline-block;
}
</style>
