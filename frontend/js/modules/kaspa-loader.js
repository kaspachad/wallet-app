// kaspa-loader.js - Only create the loader if it doesn't already exist
(function() {
  // Skip if KaspaLoader already exists
  if (window.KaspaLoader) {
    console.log('KaspaLoader already initialized, skipping...');
    return;
  }
  
  // Default configuration
  let config = {
    zIndex: 9999,
    containerSize: '300px',
    backgroundOpacity: 1, //0.95,
    showBackground: true
  };
  
  // Track initialization state
  let initialized = false;
  
  // Create the loader element
  function createLoader() {
    // Check if loader already exists
    if (document.getElementById('kaspa-loader-container')) {
      return document.getElementById('kaspa-loader-container');
    }
    
    // Create container
    const container = document.createElement('div');
    container.id = 'kaspa-loader-container';
    
    // Set styles for the container
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.display = 'flex';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.backgroundColor = config.showBackground ? 
      `rgba(255, 255, 255, ${config.backgroundOpacity})` : 'transparent';
    container.style.zIndex = config.zIndex;
    container.style.opacity = '0';
    container.style.transition = 'opacity 0.3s ease';
    
    // Create the SVG loader content
    container.innerHTML = getSvgContent();
    
    return container;
  }
  
  // Get SVG content as a separate function to keep code clean
  function getSvgContent() {
    return `
      <div class="loader-container" style="width: ${config.containerSize}; height: ${config.containerSize}; position: relative; z-index: ${config.zIndex + 1};">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
          <!-- Define Kaspa color palette and animations -->
          <defs>
            <style>
              @keyframes pulse {
                0% { opacity: 0.7; }
                50% { opacity: 1; }
                100% { opacity: 0.7; }
              }
              
              /* Animation for signals traveling between nodes */
              @keyframes signal {
                0% { stroke-dashoffset: 30; }
                100% { stroke-dashoffset: 0; }
              }
              
              .kaspa-teal { fill: #00A4A6; }
              .kaspa-light-grey { fill: #E6E6E6; }
              .pulse { animation: pulse 3s infinite ease-in-out; }
              .text { font-family: Arial, sans-serif; font-weight: bold; }
              .node { fill: #00A4A6; }
              .connection { 
                stroke: #E6E6E6; 
                stroke-width: 1; 
                opacity: 0.3; 
              }
              .signal-path {
                stroke: #00A4A6;
                stroke-width: 2;
                stroke-linecap: round;
                stroke-dasharray: 4, 4;
                opacity: 0;
                fill: none;
              }
              
              /* Signal animations with delays for sequential flow */
              .signal-1 { 
                animation: signal 1.5s infinite linear; 
                animation-delay: 0s;
                opacity: 1;
              }
              .signal-2 { 
                animation: signal 1.5s infinite linear; 
                animation-delay: 0.5s;
                opacity: 1;
              }
              .signal-3 { 
                animation: signal 1.5s infinite linear; 
                animation-delay: 1s;
                opacity: 1;
              }
              .signal-4 { 
                animation: signal 1.5s infinite linear; 
                animation-delay: 1.5s;
                opacity: 1;
              }
              .signal-5 { 
                animation: signal 1.5s infinite linear; 
                animation-delay: 2s;
                opacity: 1;
              }
              .signal-6 { 
                animation: signal 1.5s infinite linear; 
                animation-delay: 2.5s;
                opacity: 1;
              }
              .signal-7 { 
                animation: signal 1.5s infinite linear; 
                animation-delay: 3s;
                opacity: 1;
              }
              .signal-8 { 
                animation: signal 1.5s infinite linear; 
                animation-delay: 3.5s;
                opacity: 1;
              }
            </style>
            
            <!-- Gradient for signal paths -->
            <linearGradient id="signalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#00A4A6; stop-opacity:0.2" />
              <stop offset="50%" style="stop-color:#00A4A6; stop-opacity:1" />
              <stop offset="100%" style="stop-color:#00A4A6; stop-opacity:0.2" />
            </linearGradient>
          </defs>
          
          <!-- Background - transparent -->
          <rect width="400" height="400" fill="none" />
          
          <!-- Globe Structure with Nodes -->
          <g transform="translate(200, 170)">
            <!-- Base circles for the globe -->
            <circle cx="0" cy="0" r="60" fill="none" stroke="#E6E6E6" stroke-width="1" />
            <circle cx="0" cy="0" r="45" fill="none" stroke="#E6E6E6" stroke-width="1" />
            
            <!-- 3D structure (fixed, non-rotating) -->
            <!-- Horizontal ellipse (represents 3D perspective) -->
            <ellipse cx="0" cy="0" rx="60" ry="20" fill="none" stroke="#E6E6E6" stroke-width="1" />
            
            <!-- Vertical ellipse (represents 3D perspective) -->
            <ellipse cx="0" cy="0" rx="20" ry="60" fill="none" stroke="#E6E6E6" stroke-width="1" />
            
            <!-- Diagonal ellipses (represents 3D perspective) -->
            <ellipse cx="0" cy="0" rx="55" ry="25" fill="none" stroke="#E6E6E6" stroke-width="1" transform="rotate(45)" />
            <ellipse cx="0" cy="0" rx="55" ry="25" fill="none" stroke="#E6E6E6" stroke-width="1" transform="rotate(-45)" />
            
            <!-- Node Structure -->
            <circle cx="-50" cy="-10" r="4" class="node" />
            <circle cx="-30" cy="35" r="4" class="node" />
            <circle cx="25" cy="45" r="4" class="node" />
            <circle cx="45" cy="10" r="4" class="node" />
            <circle cx="40" cy="-30" r="4" class="node" />
            <circle cx="0" cy="-50" r="4" class="node" />
            <circle cx="-40" cy="-40" r="4" class="node" />
            <circle cx="-25" cy="0" r="4" class="node" />
            
            <!-- Background connections -->
            <line x1="-50" y1="-10" x2="-30" y2="35" class="connection" />
            <line x1="-30" y1="35" x2="25" y2="45" class="connection" />
            <line x1="25" y1="45" x2="45" y2="10" class="connection" />
            <line x1="45" y1="10" x2="40" y2="-30" class="connection" />
            <line x1="40" y1="-30" x2="0" y2="-50" class="connection" />
            <line x1="0" y1="-50" x2="-40" y2="-40" class="connection" />
            <line x1="-40" y1="-40" x2="-25" y2="0" class="connection" />
            <line x1="-25" y1="0" x2="-50" y2="-10" class="connection" />
            
            <!-- Signal paths with animations -->
            <path d="M-50,-10 L-30,35" class="signal-path signal-1" stroke="url(#signalGradient)" />
            <path d="M-30,35 L25,45" class="signal-path signal-2" stroke="url(#signalGradient)" />
            <path d="M25,45 L45,10" class="signal-path signal-3" stroke="url(#signalGradient)" />
            <path d="M45,10 L40,-30" class="signal-path signal-4" stroke="url(#signalGradient)" />
            <path d="M40,-30 L0,-50" class="signal-path signal-5" stroke="url(#signalGradient)" />
            <path d="M0,-50 L-40,-40" class="signal-path signal-6" stroke="url(#signalGradient)" />
            <path d="M-40,-40 L-25,0" class="signal-path signal-7" stroke="url(#signalGradient)" />
            <path d="M-25,0 L-50,-10" class="signal-path signal-8" stroke="url(#signalGradient)" />
            
            <!-- Central node with Kaspa "K" -->
            <circle cx="0" cy="0" r="12" fill="#E6E6E6" />
            <text x="0" y="5" text-anchor="middle" class="text" fill="#00A4A6" font-size="14" font-weight="bold">K</text>
          </g>
          
          <!-- Kaspa Text -->
          <text x="200" y="280" text-anchor="middle" class="text" fill="#00A4A6" font-size="32">KASPA</text>
          <text x="200" y="310" text-anchor="middle" class="text kaspa-light-grey" font-size="16">LOADING</text>
        </svg>
      </div>
    `;
  }
  
  // Define loader functionality
  window.KaspaLoader = {
    // Initialize the loader (create elements but don't display yet)
    init: function() {
      if (!initialized) {
        const loader = createLoader();
        document.body.appendChild(loader);
        loader.style.display = 'none';
        initialized = true;
      }
      return initialized;
    },
    
    // Configure the loader
    config: function(options) {
      // Merge provided options with defaults
      for (const key in options) {
        if (Object.prototype.hasOwnProperty.call(options, key)) {
          config[key] = options[key];
        }
      }
      
      // Update existing loader if it exists
      const existingLoader = document.getElementById('kaspa-loader-container');
      if (existingLoader) {
        const loaderContainer = existingLoader.querySelector('.loader-container');
        if (loaderContainer) {
          loaderContainer.style.width = config.containerSize;
          loaderContainer.style.height = config.containerSize;
        }
        existingLoader.style.zIndex = config.zIndex;
        existingLoader.style.backgroundColor = config.showBackground ? 
          `rgba(255, 255, 255, ${config.backgroundOpacity})` : 
          'transparent';
      }
    },
    
    // Show the loader
    show: function() {
      if (!initialized) {
        this.init();
      }
      
      const loader = document.getElementById('kaspa-loader-container');
      
      if (loader) {
        loader.style.display = 'flex';
        
        // Force reflow before setting opacity for transition to work
        loader.offsetHeight;
        
        loader.style.opacity = '1';
      }
    },
    
    // Hide the loader
    hide: function() {
      const loader = document.getElementById('kaspa-loader-container');
      if (loader) {
        loader.style.opacity = '0';
        
        // Remove the loader after animation completes
        setTimeout(function() {
          loader.style.display = 'none';
        }, 300);
      }
    }
  };
})();
