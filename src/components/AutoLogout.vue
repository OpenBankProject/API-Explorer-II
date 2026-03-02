<script setup lang="ts">
import { ElNotification, NotificationHandle } from 'element-plus';
import { ref, computed, h, onMounted, onBeforeUnmount } from 'vue';
import { DEFAULT_OBP_API_VERSION } from '../shared-constants';

// Props can be defined with defineProps
const props = defineProps({
    // Define your props here
});

// Types of events that will reset the timeout
const events = ['click', 'mousemove', 'keydown', 'keypress', 'mousedown', 'scroll', 'load'];

// Set timers
let warningTimeout: NodeJS.Timeout;
let logoutTimeout: NodeJS.Timeout;

let logoutTime: number;
let countdownInterval: NodeJS.Timeout;

// Add these variables at the top of your script
let defaultWarningDelay = 1000 * 270; // 4.5 minutes by default
let defaultLogoutDelay = 1000 * 300; // 5 minutes by default


// Methods
function setTimers(warningDelay = defaultWarningDelay, logoutDelay = defaultLogoutDelay) {
    logoutTime = Date.now() + logoutDelay;

    warningTimeout = setTimeout(warningMessage, warningDelay); // 4 seconds for development, change later
    logoutTimeout = setTimeout(logout, logoutDelay); // 15 seconds for development, change later
}

let warningNotification: NotificationHandle;

async function getOBPSuggestedTimeout() {
    const obpApiHost = import.meta.env.VITE_OBP_API_HOST;
    let timeoutInSeconds: number;
    // Fetch the suggested timeout from the OBP API

    // Always use v5.1.0 for application infrastructure - stable and debuggable
    const response = await fetch(`${obpApiHost}/obp/${DEFAULT_OBP_API_VERSION}/ui/suggested-session-timeout`);
    const json = await response.json();
    if(json.timeout_in_seconds) {
      timeoutInSeconds = json.timeout_in_seconds;
      console.log(`Suggested value ${timeoutInSeconds} is used`);
    } else {
      timeoutInSeconds = 5 * 60 + 1; // Set default value to 301 seconds
      console.log(`Default value ${timeoutInSeconds} is used`);
    }

    return timeoutInSeconds;
}

function resetTimeout() {
    // Logic to reset the timeout
    clearTimeout(warningTimeout);
    clearTimeout(logoutTimeout);
    clearInterval(countdownInterval);


    if (warningNotification) {
        warningNotification.close();
    }

    setTimers();
}

function warningMessage() {
    // Logic to show warning message
    console.log('Warning: You will be logged out soon');

    let secondsLeft = ref(Math.ceil((logoutTime - Date.now()) / 1000));
    // Update the countdown every second
    countdownInterval = setInterval(() => {
        secondsLeft.value = Math.ceil((logoutTime - Date.now()) / 1000);

        // If time's up or almost up, clear the interval
        if (secondsLeft.value <= 0) {
            clearInterval(countdownInterval);
            return;
        }


    }, 1000);

    warningNotification = ElNotification({
        title: 'Inactivity Warning',
        message: () => h('p', null, [
            h('span', null, 'You will be logged out in'),
            h('strong', { style: 'color: red' }, ` ${secondsLeft.value} `),
            h('span', null, 'seconds.'),
        ])
        ,
        type: 'warning',
        duration: 0,
        position: 'top-left',
        showClose: false,
    })
}

function logout() {
    // Logic to log out the user
    console.log('Logging out...');
    document.getElementById("logoff")?.click(); // If the ID of the logout button changes, this will not work
}

// Lifecycle hooks
onMounted(() => {
    events.forEach(event => {
        window.addEventListener(event, resetTimeout);
    })

    setTimers();

    // Update with API suggested values when available
    getOBPSuggestedTimeout().then(timeoutInSeconds => {
        // Convert to milliseconds
        const logoutDelay = timeoutInSeconds * 1000;
        // Set warning to appear 30 seconds before logout
        const warningDelay = Math.max(logoutDelay - 30000, 0);

        // Update the defaults
        defaultWarningDelay = warningDelay;
        defaultLogoutDelay = logoutDelay;

        // Reset timers with new values
        resetTimeout();
    }).catch(error => {
        console.error("Failed to get suggested timeout:", error);
        // Continue with defaults
    });
});

onBeforeUnmount(() => {
    // Cleanup code before component is unmounted
    clearTimeout(warningTimeout);
    clearTimeout(logoutTimeout);
    clearInterval(countdownInterval);
    events.forEach(event => {
        window.removeEventListener(event, resetTimeout);
    });
});




</script>

<style scoped>
/* Your component styles here */
</style>


<template>
    <div>
        <!-- Your component content here -->
    </div>
</template>
