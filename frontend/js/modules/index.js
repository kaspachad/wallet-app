// index.js - Main entry point for the Kaspa wallet dashboard
// Loads all required JavaScript modules in the correct order

// Helper function to load scripts in sequence
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      //console.log(`Loaded: ${src}`);
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// Load all scripts in dependency order
async function loadAllScripts() {
  try {
    // Base utilities first (no dependencies)
    await loadScript('js/modules/ui-utils.js');
    
    // Domain-specific modules
    await loadScript('js/modules/wallet.js');
    await loadScript('js/modules/transactions.js');
    await loadScript('js/modules/tokens.js');
    await loadScript('js/modules/settings.js');
    await loadScript('js/modules/kns.js');
    
    // Core application logic last (depends on all other modules)
    await loadScript('js/modules/core.js');
    
    console.log('All platform modules loaded successfully!');
    
    // Initialize the application once all scripts are loaded
    if (typeof initializeWalletApp === 'function') {
      initializeWalletApp();
    } else {
      console.warn('Warning: initializeWalletApp function not found. Make sure it is defined in core.js');
    }
  } catch (error) {
    console.error('Error loading wallet modules:', error);
  }
}

// Start loading scripts when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, beginning module initialization...');
  loadAllScripts();
});

