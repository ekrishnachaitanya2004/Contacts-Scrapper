// Global state
const state = {
  extractedData: [],
  isRunning: true,
  processedEmails: new Set(),
  lastScrollPosition: 0,
  noNewDataCount: 0,
  scrollAttempts: 0,
  maxScrollAttempts: 2000
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
    min-width: 200px;
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
    
    // Try multiple scrolling methods
    const scrollMethods = [
      // Method 1: Direct scroll
      () => container.scrollTop += 1000,
      
      // Method 2: Smooth scroll
      () => container.scrollTo({
        top: currentScroll + 1000,
        behavior: 'smooth'
      }),
      
      // Method 3: Using scrollBy
      () => container.scrollBy(0, 1000),
      
      // Method 4: Using transform
      () => {
        const contacts = document.querySelectorAll('.XXcuqd');
        if (contacts.length > 0) {
          const lastContact = contacts[contacts.length - 1];
          lastContact.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }
    ];

    // Try each scrolling method
    for (const scrollMethod of scrollMethods) {
      try {
        scrollMethod();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if we actually scrolled
        if (container.scrollTop > currentScroll) {
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
      updateStatus(`Found ${newContacts.length} new contacts. Total: ${state.extractedData.length}`);
      state.noNewDataCount = 0;
    } else {
      state.noNewDataCount++;
      updateStatus(`No new contacts found. Attempt ${state.noNewDataCount}/5`);
    }

    // Check if we should stop
    if (state.noNewDataCount >= 5) {
      updateStatus('No new contacts found after 5 attempts. Stopping...');
      state.isRunning = false;
      return;
    }

    // Try to scroll
    const scrolled = await forceScroll();
    if (!scrolled) {
      state.scrollAttempts++;
      updateStatus(`Failed to scroll. Attempt ${state.scrollAttempts}/${state.maxScrollAttempts}`);
      
      if (state.scrollAttempts >= state.maxScrollAttempts) {
        updateStatus('Max scroll attempts reached. Stopping...');
        state.isRunning = false;
        return;
      }
    } else {
      state.scrollAttempts = 0;
    }

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Continue scrolling
    requestAnimationFrame(scrollAndExtract);
  } catch (error) {
    console.error('Error in scrollAndExtract:', error);
    updateStatus('Error occurred. Retrying...');
    setTimeout(scrollAndExtract, 2000);
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