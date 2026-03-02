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

<script lang="ts">
  interface Props {
    label?: string
    items?: string[]
    hoverColor?: string
    backgroundColor?: string
  }

  let {
    label = 'Dropdown',
    items = [],
    hoverColor = '#32b9ce',
    backgroundColor = '#e8f4f8'
  }: Props = $props()

  let isOpen = $state(false)
  let dropdownRef = $state<HTMLDivElement>()
  let timeoutId: number | null = null

  function handleMouseEnter() {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    isOpen = true
  }

  function handleMouseLeave() {
    timeoutId = window.setTimeout(() => {
      isOpen = false
    }, 1000)
  }

  function handleSelect(item: string) {
    const event = new CustomEvent('select', {
      detail: item,
      bubbles: true,
      composed: true
    })
    dropdownRef?.dispatchEvent(event)
    isOpen = false
  }

  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      isOpen = false
    }
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      isOpen = false
    }
  }

  $effect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('click', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
      }
    }
  })
</script>

<div
  bind:this={dropdownRef}
  class="dropdown-container"
  style:--hover-bg={backgroundColor}
  style:--hover-color={hoverColor}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  role="navigation"
>
  <button
    class="dropdown-trigger"
    onclick={() => isOpen = !isOpen}
    aria-expanded={isOpen}
    aria-haspopup="true"
  >
    {label}
    <svg
      class="arrow-icon"
      class:rotated={isOpen}
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill="currentColor" d="M831.872 340.864 512 652.672 192.128 340.864a30.592 30.592 0 0 0-42.752 0 29.12 29.12 0 0 0 0 41.6L489.664 714.24a32 32 0 0 0 44.672 0l340.288-331.712a29.12 29.12 0 0 0 0-41.728 30.592 30.592 0 0 0-42.752 0z"></path>
    </svg>
  </button>

  {#if isOpen}
    <div class="dropdown-menu">
      <div class="dropdown-content">
        {#each items as item}
          {#if item === '---'}
            <div class="dropdown-divider"></div>
          {:else}
            <button
              class="dropdown-item"
              onclick={() => handleSelect(item)}
            >
              {item}
            </button>
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .dropdown-container {
    position: relative;
    display: inline-block;
  }

  .dropdown-trigger {
    padding: 9px;
    margin: 3px;
    color: #39455f;
    font-family: 'Roboto', sans-serif;
    font-size: 14px;
    text-decoration: none;
    border-radius: 8px;
    background: transparent;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s ease;
  }

  .dropdown-trigger:hover {
    background-color: var(--hover-bg) !important;
    color: var(--hover-color) !important;
  }

  .arrow-icon {
    width: 14px;
    height: 14px;
    transition: transform 0.3s ease;
  }

  .arrow-icon.rotated {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: white;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    z-index: 2000;
    min-width: 180px;
    max-width: 280px;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dropdown-content {
    max-height: 400px;
    overflow-y: auto;
    padding: 6px 0;
  }

  .dropdown-item {
    width: 100%;
    padding: 10px 20px;
    margin: 0;
    color: #606266;
    font-family: 'Roboto', sans-serif;
    font-size: 14px;
    text-align: left;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dropdown-item:hover {
    background-color: var(--hover-bg);
    color: var(--hover-color);
  }

  .dropdown-item:active {
    background-color: var(--hover-bg);
    opacity: 0.8;
  }

  .dropdown-divider {
    height: 1px;
    margin: 6px 0;
    background-color: #e4e7ed;
  }

  /* Custom scrollbar styling */
  .dropdown-content::-webkit-scrollbar {
    width: 6px;
  }

  .dropdown-content::-webkit-scrollbar-track {
    background: #f5f5f5;
    border-radius: 3px;
  }

  .dropdown-content::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }

  .dropdown-content::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }

  /* Firefox scrollbar */
  .dropdown-content {
    scrollbar-width: thin;
    scrollbar-color: #c1c1c1 #f5f5f5;
  }
</style>
