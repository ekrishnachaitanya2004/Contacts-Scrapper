// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "runImporter") {
    // Get the active tab first
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        chrome.runtime.sendMessage({ 
          action: "updateStatus", 
          status: "Error: No active tab found" 
        });
        return;
      }

      const activeTab = tabs[0];
      
    chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
      files: ["injector.js"]
      }).then(() => {
        // Send initial status update
        chrome.runtime.sendMessage({ 
          action: "updateStatus", 
          status: "Script injected successfully..." 
        });
      }).catch((error) => {
        chrome.runtime.sendMessage({ 
          action: "updateStatus", 
          status: `Error injecting script: ${error.message}` 
        });
      });
    });
  }
}); 