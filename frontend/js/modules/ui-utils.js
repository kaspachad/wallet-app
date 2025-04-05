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

// Show toast notification
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<div class="toast-content">${message}</div>`;
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Automatically remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300); // Wait for fade-out animation
  }, duration);
  
  return toast;
}