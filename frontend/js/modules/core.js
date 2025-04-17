// Initialize the entire wallet application
function initializeWalletApp() {
  // Initialize and show the loader first
  KaspaLoader.init();
  KaspaLoader.config({
    backgroundOpacity: 0.7,
    containerSize: '300px'
  });
  KaspaLoader.show();
  
  // Initialize all module UI elements
  initWalletButtons();
  initSettingsUI();
  initKNSUI();
  setupHistoryFilterHandler();
  setupTabNavigation();
  
  // Initial data loading - use Promise.all for parallel loading
  Promise.all([
    loadWalletInfo(),
    updateKaspaPrice(),
    loadUserSettings()
  ])
  .then(() => {
    // Hide loader when all initial data is loaded
    KaspaLoader.hide();
    
    // Set up automatic refresh if needed
    setInterval(updateKaspaPrice, 60000); // Update price every minute
    
    console.log('Wallet application initialized successfully!');
  })
  .catch(error => {
    console.error('Error initializing wallet:', error);
    // Hide loader even if there's an error
    KaspaLoader.hide();
  });
}

// Tab navigation functionality
function setupTabNavigation() {
  const tabLinks = document.querySelectorAll('.wallet-nav a');
  const walletPanel = document.getElementById('wallet-panel');
  const historyPanel = document.getElementById('history-panel');
  const settingsPanel = document.getElementById('settings-panel');
  const knsPanel = document.getElementById('kns');
  const minerPanel = document.getElementById('miner-panel');

  // Function to switch tabs
  function switchTab(tabId) {
    // Hide all panels
    walletPanel.style.display = 'none';
    historyPanel.style.display = 'none';
    settingsPanel.style.display = 'none';
    knsPanel.style.display = 'none';
    minerPanel.style.display = 'none';
    
    // Remove active class from all tabs
    tabLinks.forEach(link => {
      link.parentElement.classList.remove('active');
    });
    
    // Show the selected panel and activate tab
    if (tabId === 'wallet') {
      walletPanel.style.display = 'block';
      document.querySelector('a[href="#wallet"]').parentElement.classList.add('active');
      // Load tokens when wallet tab is displayed
      loadTokens();
    } else if (tabId === 'history') {
      historyPanel.style.display = 'block';
      document.querySelector('a[href="#history"]').parentElement.classList.add('active');
      // Load transaction history when tab is selected
      loadTransactionHistory();
    } else if (tabId === 'settings') {
      settingsPanel.style.display = 'block';
      document.querySelector('a[href="#settings"]').parentElement.classList.add('active');
    } else if (tabId === 'kns') {
       knsPanel.style.display = 'block';
       document.querySelector('a[href="#kns"]').parentElement.classList.add('active');
    } else if (tabId === 'miner') {
       minerPanel.style.display = 'block';
       document.querySelector('a[href="#miner"]').parentElement.classList.add('active');
    }
  }
  
  // Add click event listeners to tabs
  tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const tabId = this.getAttribute('href').substring(1);
      switchTab(tabId);
    });
  });
  
  // Initialize with wallet tab active
  if (walletPanel && historyPanel && settingsPanel) {
    switchTab('wallet');
  }
  
  const historyTab = document.querySelector('a[href="#history"]');
  const historyFilterEl = document.getElementById('history-filter');

  if (historyTab) {
    historyTab.addEventListener('click', () => loadTransactionHistory(0));
  }

  if (historyFilterEl) {
    historyFilterEl.addEventListener('change', () => loadTransactionHistory(0));
  }
}

// Initialize wallet-specific buttons and event handlers
function initWalletButtons() {
  const copyBtn = document.getElementById('copy-wallet');
  const refreshBtn = document.getElementById('refresh-wallet');
  const addressEl = document.getElementById('wallet-address');
  
  // Copy wallet address to clipboard
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const address = addressEl?.textContent.trim();
      if (address && address.startsWith('kaspa:')) {
        // Check if the clipboard API is available
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(address)
            .then(() => {
              copyBtn.title = 'Copied!';
              // Visual feedback
              const originalIcon = copyBtn.innerHTML;
              copyBtn.innerHTML = '<i class="fas fa-check"></i>';
              setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
                copyBtn.title = 'Copy address';
              }, 1500);
            })
            .catch(err => {
              console.error('Could not copy text: ', err);
              // Fallback for clipboard failure
              fallbackCopyTextToClipboard(address);
            });
        } else {
          // Fallback for browsers without clipboard support
          fallbackCopyTextToClipboard(address);
        }
      }
    });
  }

  // Refresh wallet info
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.classList.add('spin'); // Add animation class
      await loadWalletInfo();
      await updateKaspaPrice();
      await loadTokens();
      refreshBtn.classList.remove('spin');
    });
  }
  
  // Set up send and receive buttons
  setupSendKasButton();
  setupReceiveKasButton();
  
  // Initialize node status display
  const nodeStatus = document.getElementById('node-status');
  if (nodeStatus) {
    nodeStatus.innerHTML = '<span class="status-indicator connected"></span> Connected';
  }
}

// Set up history filter change handler
function setupHistoryFilterHandler() {
  const historyFilter = document.getElementById('history-filter');
  if (historyFilter) {
    historyFilter.addEventListener('change', () => {
      loadTransactionHistory(0); // Reset to first page on filter change
    });
  }
  
  // Set up filter buttons if they exist
  const filterAllBtn = document.getElementById('filter-all');
  const filterSentBtn = document.getElementById('filter-sent');
  const filterReceivedBtn = document.getElementById('filter-received');
  
  if (filterAllBtn) {
    filterAllBtn.addEventListener('click', () => filterTransactions('all'));
  }
  
  if (filterSentBtn) {
    filterSentBtn.addEventListener('click', () => filterTransactions('sent'));
  }
  
  if (filterReceivedBtn) {
    filterReceivedBtn.addEventListener('click', () => filterTransactions('received'));
  }
}

// Fallback function for clipboard copy when the Clipboard API is not available
function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Make the textarea out of viewport
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    const msg = successful ? 'successful' : 'unsuccessful';
    console.log('Fallback: Copying text command was ' + msg);
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }

  document.body.removeChild(textArea);
}

// If the document is already loaded, initialize right away
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('Document already loaded, initializing directly');
  // This will run if core.js is loaded after the DOM is ready
  // The main initialization will be called from index.js
} else {
  // This ensures the script works even if directly included
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded (core.js direct initialize)');
    // Initialization will be handled by index.js
  });
}
