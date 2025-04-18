// Global error handler to catch and log detailed information
window.addEventListener('error', function(event) {
  console.error('Detailed error information:');
  console.error('Message:', event.message);
  console.error('Source:', event.filename);
  console.error('Line:', event.lineno);
  console.error('Column:', event.colno);
  console.error('Error object:', event.error);
});


// Helper to truncate addresses for display
function truncateAddress(address) {
  if (!address) return '';
  return address.substring(0, 10) + '...' + address.substring(address.length - 10);
}

// Show QR Code for the address
function showQRCodeForAddress(address) {
  const container = document.getElementById('qrContainer');
  const canvas = document.getElementById('kaspaQR');
  const display = document.getElementById('qr-address-text');
  const kaspaURI = `kaspa:${address}`;

  container.style.display = 'block';
  display.textContent = address;

  QRCode.toCanvas(canvas, kaspaURI, { width: 220 }, function (error) {
    if (error) console.error('QR generation error:', error);
  });
}

// Helper function to create modal/popup windows with customizable content
function createModal(title, content, buttons) {
  const modal = document.createElement('div');
  modal.className = 'wallet-popup';
  
  let buttonsHtml = '';
  if (buttons && buttons.length) {
    buttonsHtml = '<div class="button-row">';
    buttons.forEach(btn => {
      buttonsHtml += `<button id="${btn.id}" class="${btn.class || ''}">${btn.text}</button>`;
    });
    buttonsHtml += '</div>';
  }
  
  modal.innerHTML = `
    <div class="popup-content">
      <h3>${title}</h3>
      <div class="modal-content">${content}</div>
      ${buttonsHtml}
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners for buttons
  if (buttons && buttons.length) {
    buttons.forEach(btn => {
      const buttonEl = document.getElementById(btn.id);
      if (buttonEl && btn.onClick) {
        buttonEl.addEventListener('click', (e) => btn.onClick(e, modal));
      }
    });
  }
  
  return modal;
}

/**
 * Toast notification system
 * Creates non-intrusive notifications that appear and fade out
 */
const ToastNotification = {
  // Container for all notifications
  container: null,
  
  // Initialize the notification container
  init: function() {
    // Create container if it doesn't exist
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
      
      // Add the required CSS
      const style = document.createElement('style');
      style.textContent = `
        .toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        
        .toast-notification {
          margin-bottom: 10px;
          padding: 12px 20px;
          border-radius: 4px;
          background-color: #f8f9fa;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          max-width: 300px;
          display: flex;
          align-items: center;
          overflow: hidden;
          animation: slide-in 0.3s ease;
        }
        
        .toast-notification.success {
          background-color: #d4edda;
          border-left: 4px solid #28a745;
          color: #155724;
        }
        
        .toast-notification.error {
          background-color: #f8d7da;
          border-left: 4px solid #dc3545;
          color: #721c24;
        }
        
        .toast-notification.info {
          background-color: #d1ecf1;
          border-left: 4px solid #17a2b8;
          color: #0c5460;
        }
        
        .toast-notification.warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          color: #856404;
        }
        
        .toast-icon {
          margin-right: 10px;
          font-size: 18px;
        }
        
        .toast-content {
          flex: 1;
        }
        
        .toast-close {
          cursor: pointer;
          margin-left: 10px;
          font-size: 16px;
          color: inherit;
          opacity: 0.7;
        }
        
        .toast-close:hover {
          opacity: 1;
        }
        
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  },
  
  // Show a notification
  show: function(message, type = 'info', duration = 3000) {
    // Initialize if not already done
    if (!this.container) {
      this.init();
    }
    
    // Create notification element
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    // Set icon based on notification type
    let icon = '';
    switch(type) {
      case 'success':
        icon = '<i class="fas fa-check-circle toast-icon"></i>';
        break;
      case 'error':
        icon = '<i class="fas fa-exclamation-circle toast-icon"></i>';
        break;
      case 'warning':
        icon = '<i class="fas fa-exclamation-triangle toast-icon"></i>';
        break;
      default:
        icon = '<i class="fas fa-info-circle toast-icon"></i>';
    }
    
    // Create content
    toast.innerHTML = `
      ${icon}
      <div class="toast-content">${message}</div>
      <div class="toast-close">×</div>
    `;
    
    // Add to container
    this.container.appendChild(toast);
    
    // Handle close button click
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      this.close(toast);
    });
    
    // Auto-close after duration
    if (duration > 0) {
      setTimeout(() => {
        this.close(toast);
      }, duration);
    }
    
    // Return the toast element in case the caller wants to manipulate it
    return toast;
  },
  
  // Close a specific notification
  close: function(toast) {
    // Add fade-out animation
    toast.style.animation = 'fade-out 0.3s ease forwards';
    
    // Remove from DOM after animation completes
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  },
  
  // Convenience methods for different notification types
  success: function(message, duration = 3000) {
    return this.show(message, 'success', duration);
  },
  
  error: function(message, duration = 4000) {
    return this.show(message, 'error', duration);
  },
  
  info: function(message, duration = 3000) {
    return this.show(message, 'info', duration);
  },
  
  warning: function(message, duration = 4000) {
    return this.show(message, 'warning', duration);
  }
};

// Backward compatibility for older toast function
function showToast(message, type = 'info', duration = 3000) {
  return ToastNotification.show(message, type, duration);
}

// Make the notification system globally available
window.ToastNotification = ToastNotification;
