// Set up message listener immediately when popup opens
chrome.runtime.onMessage.addListener((message) => {
  const status = document.getElementById("status");
  const button = document.getElementById("run");
  
  if (message.action === "updateStatus") {
    status.textContent = message.status;
    
    // If the process is complete or failed, re-enable the button
    if (message.status.includes("✅") || message.status.includes("❌")) {
      button.disabled = false;
      button.textContent = "Start Import";
    }
  }
});

document.getElementById("run").addEventListener("click", async () => {
  const button = document.getElementById("run");
  const status = document.getElementById("status");
  
  button.disabled = true;
  button.textContent = "Importing...";
  status.textContent = "Starting import process...";
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes("contacts.google.com/directory")) {
      status.textContent = "Please navigate to contacts.google.com/directory first!";
      button.disabled = false;
      button.textContent = "Start Import";
      return;
    }
    
    chrome.runtime.sendMessage({ action: "runImporter" });
  } catch (error) {
    status.textContent = "Error: " + error.message;
    button.disabled = false;
    button.textContent = "Start Import";
  }
}); 