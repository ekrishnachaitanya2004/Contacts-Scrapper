// Global state
const state = {
  extractedData: [],
  isRunning: true,
  processedEmails: new Set(),
  lastScrollPosition: 0,
  noNewDataCount: 0,
  scrollAttempts: 0,
  maxScrollAttempts: 2000,
  scrollSpeed: 5000,
  consecutiveNewContacts: 0,
  targetContactsPerScroll: 14,
  optimalSpeedFound: false,
  stats: {
    startTime: Date.now(),
    lastUpdateTime: Date.now(),
    contactsPerMinute: 0,
    totalScrolls: 0,
    successfulScrolls: 0,
    failedScrolls: 0,
    lastContactsFound: 0
  }
};

function createControlPanel() {
  // Remove existing panel if any
  const existingPanel = document.getElementById('control-panel');
  if (existingPanel) {
    existingPanel.remove();
  }

  // Create control panel
  const panel = document.createElement('div');
  panel.id = 'control-panel';
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 9999;
    font-family: Arial, sans-serif;
    min-width: 300px;
    max-height: 90vh;
    overflow-y: auto;
  `;

  // Create status display
  const statusDisplay = document.createElement('div');
  statusDisplay.id = 'status-display';
  statusDisplay.style.cssText = `
    margin-bottom: 10px;
    padding: 10px;
    background: #f5f5f5;
    border-radius: 4px;
    font-size: 14px;
  `;
  statusDisplay.textContent = 'Status: Initializing...';
  panel.appendChild(statusDisplay);

  // Create stats display
  const statsDisplay = document.createElement('div');
  statsDisplay.id = 'stats-display';
  statsDisplay.style.cssText = `
    margin-bottom: 10px;
    padding: 10px;
    background: #e8f4f8;
    border-radius: 4px;
    font-size: 13px;
    line-height: 1.4;
  `;
  statsDisplay.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px; color: #2c3e50;">📊 Live Statistics</div>
    <div>⏱️ Running Time: <span id="running-time">0:00</span></div>
    <div>📈 Contacts/Minute: <span id="contacts-per-minute">0</span></div>
    <div>📝 Total Contacts: <span id="total-contacts">0</span></div>
    <div>⚡ Current Speed: <span id="current-speed">2000</span>px</div>
    <div>🔄 Scroll Success Rate: <span id="scroll-success-rate">0</span>%</div>
    <div>🎯 Target Contacts/Scroll: <span id="target-contacts">14</span></div>
    <div>✅ Optimal Speed: <span id="optimal-speed">Not Found</span></div>
  `;
  panel.appendChild(statsDisplay);

  // Create download button
  const downloadButton = document.createElement('button');
  downloadButton.textContent = 'Download Data';
  downloadButton.style.cssText = `
    padding: 8px 16px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    width: 100%;
    font-size: 14px;
    margin-bottom: 10px;
  `;
  downloadButton.onclick = downloadData;
  panel.appendChild(downloadButton);

  // Create stop button
  const stopButton = document.createElement('button');
  stopButton.textContent = 'Stop Process';
  stopButton.style.cssText = `
    padding: 8px 16px;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    width: 100%;
    font-size: 14px;
  `;
  stopButton.onclick = () => {
    state.isRunning = false;
    stopButton.textContent = 'Stopping...';
    stopButton.disabled = true;
    updateStatus('Process stopped by user');
  };
  panel.appendChild(stopButton);

  document.body.appendChild(panel);
  return panel;
}

function updateStatus(message) {
  const statusDisplay = document.getElementById('status-display');
  if (statusDisplay) {
    statusDisplay.textContent = `Status: ${message}`;
  }
  console.log(message);
}

function updateStats() {
  const now = Date.now();
  const runningTime = Math.floor((now - state.stats.startTime) / 1000);
  const minutes = Math.floor(runningTime / 60);
  const seconds = runningTime % 60;
  
  // Calculate contacts per minute
  const timeDiff = (now - state.stats.lastUpdateTime) / 1000 / 60; // in minutes
  if (timeDiff >= 1) {
    state.stats.contactsPerMinute = Math.round(state.extractedData.length / (runningTime / 60));
    state.stats.lastUpdateTime = now;
  }

  // Update all stats elements
  document.getElementById('running-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  document.getElementById('contacts-per-minute').textContent = state.stats.contactsPerMinute;
  document.getElementById('total-contacts').textContent = state.extractedData.length;
  document.getElementById('current-speed').textContent = state.scrollSpeed;
  document.getElementById('scroll-success-rate').textContent = 
    state.stats.totalScrolls > 0 
      ? Math.round((state.stats.successfulScrolls / state.stats.totalScrolls) * 100) 
      : 0;
  document.getElementById('target-contacts').textContent = state.targetContactsPerScroll;
  document.getElementById('optimal-speed').textContent = state.optimalSpeedFound ? 'Found' : 'Not Found';
}

function extractContactData() {
  try {
    // Find all contact containers
    const contactElements = document.querySelectorAll('.pkxbt');
    console.log(`Found ${contactElements.length} contact elements`);

    const contacts = [];
    for (const element of contactElements) {
      try {
        // Get the email from the data-email attribute
        const emailElement = element.querySelector('[data-email]');
        if (!emailElement) continue;

        const email = emailElement.getAttribute('data-email');
        if (!email || state.processedEmails.has(email)) continue;

        // Get the name from the AYDrSb div
        const nameElement = element.querySelector('.AYDrSb');
        let name = '';
        if (nameElement) {
          name = nameElement.textContent.trim();
          // Remove the ID part if present (e.g., "- - (PA2433017013001)")
          name = name.replace(/\s*-\s*-\s*\([^)]+\)/, '').trim();
        }

        if (email) {
          contacts.push({ name, email });
          state.processedEmails.add(email);
          console.log('Extracted contact:', { name, email });
        }
      } catch (error) {
        console.error('Error processing contact element:', error);
      }
    }

    return contacts;
  } catch (error) {
    console.error('Error extracting contact data:', error);
    return [];
  }
}

function downloadData() {
  try {
    if (state.extractedData.length === 0) {
      updateStatus('No data to download');
      return;
    }

    // Convert data to CSV
    const headers = ['Name', 'Email'];
    const csvContent = [
      headers.join(','),
      ...state.extractedData.map(contact => 
        [
          `"${contact.name}"`,
          `"${contact.email}"`
        ].join(',')
      )
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `contacts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    updateStatus(`Downloaded ${state.extractedData.length} contacts`);
  } catch (error) {
    console.error('Error downloading data:', error);
    updateStatus('Error downloading data');
  }
}

// Function to intercept network requests
function interceptNetworkRequests() {
  // Store the original fetch function
  const originalFetch = window.fetch;
  
  // Override fetch
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    // Clone the response so we can read it multiple times
    const clone = response.clone();
    
    try {
      const url = args[0];
      console.log('Intercepted request:', url);
      
      // Check if this might be a contact data request
      if (typeof url === 'string' && (
        url.includes('contacts') || 
        url.includes('directory') || 
        url.includes('search') ||
        url.includes('users') ||
        url.includes('members')
      )) {
        const data = await clone.json();
        console.log('Found potential contact data:', data);
        
        // Try to extract contacts from the response
        if (data && typeof data === 'object') {
          const contacts = extractContactsFromResponse(data);
          if (contacts.length > 0) {
            state.extractedData.push(...contacts);
            updateStatus(`Found ${contacts.length} contacts in API response. Total: ${state.extractedData.length}`);
          }
        }
      }
    } catch (error) {
      console.log('Error processing response:', error);
    }
    
    return response;
  };
}

// Function to extract contacts from API response
function extractContactsFromResponse(data) {
  const contacts = [];
  
  // Helper function to recursively search for email and name
  function searchObject(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    
    // Check if this object has email and name properties
    if (obj.email && typeof obj.email === 'string') {
      const name = obj.name || obj.displayName || obj.fullName || '';
      contacts.push({
        name: name.toString().trim(),
        email: obj.email.trim()
      });
    }
    
    // Recursively search all properties
    Object.entries(obj).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        searchObject(value, `${path}.${key}`);
      }
    });
  }
  
  searchObject(data);
  return contacts;
}

async function forceScroll() {
  try {
    // Find the main contacts container
    const container = document.querySelector('.ZvpjBb.C8Dkz');
    if (!container) {
      console.error('Could not find contacts container');
      return false;
    }

    // Get the current scroll position
    const currentScroll = container.scrollTop;
    state.stats.totalScrolls++;
    
    // Try multiple scrolling methods
    const scrollMethods = [
      // Method 1: Direct scroll with dynamic speed
      () => {
        container.scrollTop += state.scrollSpeed;
        return new Promise(resolve => setTimeout(resolve, 100));
      },
      
      // Method 2: Smooth scroll with dynamic speed
      () => {
        container.scrollTo({
          top: currentScroll + state.scrollSpeed,
          behavior: 'smooth'
        });
        return new Promise(resolve => setTimeout(resolve, 100));
      },
      
      // Method 3: Using scrollBy with dynamic speed
      () => {
        container.scrollBy(0, state.scrollSpeed);
        return new Promise(resolve => setTimeout(resolve, 100));
      },
      
      // Method 4: Using transform
      () => {
        const contacts = document.querySelectorAll('.XXcuqd');
        if (contacts.length > 0) {
          const lastContact = contacts[contacts.length - 1];
          lastContact.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
        return new Promise(resolve => setTimeout(resolve, 100));
      }
    ];

    // Try each scrolling method
    for (const scrollMethod of scrollMethods) {
      try {
        await scrollMethod();
        
        // Check if we actually scrolled
        if (container.scrollTop > currentScroll) {
          state.stats.successfulScrolls++;
          console.log('Successfully scrolled using method:', scrollMethod.name);
          return true;
        }
      } catch (error) {
        console.error('Error with scroll method:', error);
      }
    }

    // If we get here, none of the methods worked
    console.log('No scrolling method was successful');
    return false;
  } catch (error) {
    console.error('Error in forceScroll:', error);
    return false;
  }
}

async function scrollAndExtract() {
  if (!state.isRunning) {
    updateStatus('Process stopped');
    return;
  }

  try {
    // Extract current visible contacts
    const newContacts = extractContactData();
    if (newContacts.length > 0) {
      state.extractedData.push(...newContacts);
      state.consecutiveNewContacts++;
      state.stats.lastContactsFound = newContacts.length;
      
      // Increase scroll speed if we haven't found the optimal speed yet
      if (!state.optimalSpeedFound) {
        if (newContacts.length >= state.targetContactsPerScroll) {
          state.optimalSpeedFound = true;
          updateStatus(`✅ Optimal speed found! Found ${newContacts.length} contacts at once. Maintaining speed: ${state.scrollSpeed}`);
        } else {
          // More aggressive speed increase
          const speedIncrease = Math.max(2000, Math.floor(state.scrollSpeed * 0.5));
          state.scrollSpeed = Math.min(state.scrollSpeed + speedIncrease, 20000);
          
          // If we're at max speed but not finding enough contacts, try a different approach
          if (state.scrollSpeed >= 20000 && newContacts.length < state.targetContactsPerScroll) {
            // Try a different scroll strategy
            state.scrollSpeed = 10000; // Reset to a more moderate speed
            updateStatus(`Resetting speed to ${state.scrollSpeed} to improve contact detection`);
          } else {
            updateStatus(`Found ${newContacts.length} new contacts. Increasing speed to ${state.scrollSpeed} (Target: ${state.targetContactsPerScroll})`);
          }
        }
      } else {
        updateStatus(`Found ${newContacts.length} new contacts. Total: ${state.extractedData.length} (Speed: ${state.scrollSpeed})`);
      }
      state.noNewDataCount = 0;
    } else {
      state.noNewDataCount++;
      state.consecutiveNewContacts = 0;
      if (!state.optimalSpeedFound) {
        // More aggressive speed decrease when no contacts found
        state.scrollSpeed = Math.max(state.scrollSpeed - 2000, 2000);
      }
      updateStatus(`No new contacts found. Attempt ${state.noNewDataCount} (Speed: ${state.scrollSpeed})`);
    }

    // Try to scroll
    const scrolled = await forceScroll();
    if (!scrolled) {
      state.scrollAttempts++;
      if (state.noNewDataCount > 2) {
        updateStatus(`Failed to scroll. Attempt ${state.scrollAttempts} (Speed: ${state.scrollSpeed})`);
        // If we're failing to scroll, try reducing speed
        state.scrollSpeed = Math.max(state.scrollSpeed - 5000, 2000);
      }
    } else {
      state.scrollAttempts = 0;
    }

    // Update stats
    updateStats();

    // Reduced wait time for faster scrolling
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Continue scrolling
    requestAnimationFrame(scrollAndExtract);
  } catch (error) {
    console.error('Error in scrollAndExtract:', error);
    updateStatus('Error occurred. Retrying...');
    setTimeout(scrollAndExtract, 500);
  }
}

async function processPage() {
  try {
    if (!state.isRunning) return;

    updateStatus("Starting contact extraction...");
    
    // Start scrolling and extracting
    await scrollAndExtract();

  } catch (error) {
    console.error('Error processing page:', error);
    updateStatus(`Error: ${error.message}`);
  }
}

async function selectAllContacts() {
  try {
    state.isRunning = true;
    state.extractedData = [];
    state.processedEmails.clear();
    state.lastScrollPosition = 0;
    state.noNewDataCount = 0;
    state.scrollAttempts = 0;
    
    createControlPanel();
    updateStatus("Starting contact extraction...");
    
    // Wait for the page to be fully loaded
    console.log('Waiting for initial page load...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Scroll to top first
    console.log('Scrolling to top...');
    window.scrollTo(0, 0);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start processing
    console.log('Starting scroll and extract process...');
    await processPage();
    
  } catch (error) {
    console.error('Error in select process:', error);
    updateStatus(`❌ Error: ${error.message}`);
  }
}

// Start the selection process
selectAllContacts(); 