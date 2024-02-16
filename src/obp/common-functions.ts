import { isServerUp, serverStatus } from '.'

export function updateLoadingInfoMessage(logMessage: string) {
  // 1. Select the div element using the id property
  const spinner = document.getElementById('loading-api-spinner')
  // 2. Select the div element using the id property
  let p = document.getElementById('loading-api-info')
  // 3. Add the text content
  if (p !== null) {
    p.textContent = logMessage
  } else {
    p = document.createElement('p')
  }
  // 4. Append the p element to the div element
  spinner?.appendChild(p)
}

export function updateServerStatus() {
  const oElem = document.getElementById('backend-status')
  serverStatus()
    .then((body) => {
      if (oElem) {
        Object.values(body).every(i => i === true) ? (oElem.className = 'server-is-online') : (oElem.className = 'server-is-offline')
      }
    })
    .catch((error) => {
      console.log(error)
      if (oElem) {
        oElem.className = 'server-is-offline'
      }
    })
}