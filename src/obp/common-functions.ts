export function updateLoadingInfoMessage(logMessage: string) {
    // 1. Select the div element using the id property
    const spinner = document.getElementById("loading-api-spinner")
    // 2. Select the div element using the id property
    let p = document.getElementById("loading-api-info")
    // 3. Add the text content
    if (p !== null) {
      p.textContent = logMessage
    } else {
      p = document.createElement("p")
    }
    // 4. Append the p element to the div element
    spinner?.appendChild(p)
  }