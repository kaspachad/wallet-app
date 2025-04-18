// Function to load KRC20 tokens
async function loadTokens() {
  const tokenTableBody = document.getElementById('token-table-body');
  
  try {
    if (!tokenTableBody) {
      console.warn("Token table body element not found");
      return;
    }
    
    tokenTableBody.innerHTML = '<tr><td colspan="4" class="loading-state">Loading tokens...</td></tr>';
    
    const res = await fetch('/api/tokens', {
      credentials: 'include'
    }).catch(error => {
      console.error("Network error fetching tokens:", error);
      throw new Error("Network error");
    });
    
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    
    if (data && data.tokens) {
      renderTokenTable(data.tokens);
    } else {
      console.warn("No token data received from API");
      tokenTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">No token data available</td></tr>';
    }
  } catch (err) {
    console.error('Error fetching tokens:', err);
    if (tokenTableBody) {
      tokenTableBody.innerHTML = `<tr><td colspan="4" class="loading-state">Error loading tokens: ${err.message}</td></tr>`;
    }
  }
}

// Render token table with the fetched token data
function renderTokenTable(tokens) {
  const tokenTableBody = document.getElementById('token-table-body');
  if (!tokenTableBody) return;
  
  tokenTableBody.innerHTML = '';
  
  if (tokens.length === 0) {
    tokenTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">No KRC20 tokens found</td>
      </tr>
    `;
    return;
  }
  
  tokens.forEach(token => {
    const row = document.createElement('tr');
    
    // Format balance with correct number of decimal places
    const formattedBalance = parseFloat(token.balance).toFixed(token.decimals);
    
    // Create a colored circle with the first letter as a fallback icon
    const tokenInitial = token.token_symbol.charAt(0).toUpperCase();
    const tokenColor = getColorFromSymbol(token.token_symbol);
    
    // Determine whether to use a logo or fallback
    let tokenIconHtml = '';
    
    // Check if icon_url is a valid absolute URL
    if (token.icon_url && (token.icon_url.startsWith('http://') || token.icon_url.startsWith('https://'))) {
      // Use the actual logo directly from the URL
      tokenIconHtml = `<div class="token-icon-wrapper"><div class="token-icon-img" style="background-image: url('${token.icon_url}');"></div></div>`;
    } else {
      // Use colored circle with initial as fallback
      tokenIconHtml = `<div class="token-icon" style="background-color: ${tokenColor};">${tokenInitial}</div>`;
    }
    
    row.innerHTML = `
      <td>
        <div class="token-info">
          ${tokenIconHtml}
          <div>
            <div class="token-name">${token.token_name}</div>
            <div class="token-address">${truncateAddress(token.token_address)}</div>
          </div>
        </div>
      </td>
      <td>${token.token_symbol}</td>
      <td>${formattedBalance}</td>
      <td>
        <button class="send-btn" data-token-id="${token.token_id}" data-token-symbol="${token.token_symbol}">Send</button>
      </td>
    `;
    
    tokenTableBody.appendChild(row);
  });
  
  // Add event listeners to send buttons
  document.querySelectorAll('.send-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tokenId = btn.getAttribute('data-token-id');
      const tokenSymbol = btn.getAttribute('data-token-symbol');
      showSendTokenModal(tokenId, tokenSymbol);
    });
  });
}

// Function to show send token modal - updated to match send KAS experience
function showSendTokenModal(tokenId, tokenSymbol) {
  const modal = document.createElement('div');
  modal.className = 'wallet-popup';
  modal.innerHTML = `
    <div class="popup-content">
      <h3>Send ${tokenSymbol} Tokens</h3>
      
      <form id="send-token-form" autocomplete="off">
        <div class="form-group">
          <label for="token-recipient">Recipient Address:</label>
          <input type="text" id="token-recipient" name="token_recipient" required placeholder="kaspa:..." autocomplete="off">
        </div>
        <div class="form-group">
          <label for="token-amount">Amount:</label>
          <input type="number" id="token-amount" name="token_amount" required min="0.2" step="0.1" placeholder="0.0" autocomplete="off">
        </div>
        <div class="form-group">
          <label for="token-password">Wallet Password:</label>
          <input type="password" id="token-password" name="wallet_send_password" required placeholder="Enter your wallet password" autocomplete="new-password">
        </div>

        <div class="send-summary" style="display: none;">
          <div class="summary-item">
            <span class="summary-label">Amount:</span>
            <span class="summary-value" id="summary-token-amount">0 ${tokenSymbol}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Recipient:</span>
            <span class="summary-value" id="summary-token-recipient">kaspa:...</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Network Fee:</span>
            <span class="summary-value" id="summary-token-fee">~0.00001 KAS</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total:</span>
            <span class="summary-value" id="summary-token-total">0 ${tokenSymbol} + fee</span>
          </div>
        </div>
        <div class="button-row">
          <button type="submit" id="confirm-send-token">Send ${tokenSymbol}</button>
          <button type="button" id="cancel-send-token">Cancel</button>
        </div>
      </form>
      <div id="send-token-status" style="margin-top: 15px; display: none;"></div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Get form elements
  const sendForm = document.getElementById('send-token-form');
  const recipientInput = document.getElementById('token-recipient');
  const amountInput = document.getElementById('token-amount');
  const passwordInput = document.getElementById('token-password');
  const confirmBtn = document.getElementById('confirm-send-token');
  const cancelBtn = document.getElementById('cancel-send-token');
  const statusDiv = document.getElementById('send-token-status');
  
  // Update summary when inputs change
  const summaryAmount = document.getElementById('summary-token-amount');
  const summaryRecipient = document.getElementById('summary-token-recipient');
  const summaryTotal = document.getElementById('summary-token-total');
  const sendSummary = document.querySelector('.send-summary');
  
  // Function to update summary information
  function updateSummary() {
    const amount = parseFloat(amountInput.value) || 0;
    const recipient = recipientInput.value || 'kaspa:...';
    
    if (amount > 0) {
      sendSummary.style.display = 'block';
      summaryAmount.textContent = `${amount.toFixed(8)} ${tokenSymbol}`;
      
      // Truncate recipient address for display
      if (recipient.startsWith('kaspa:') && recipient.length > 15) {
        const startPart = recipient.substring(0, 12); // "kaspa:" plus a few chars
        const endPart = recipient.substring(recipient.length - 4); // Last 4 chars
        summaryRecipient.textContent = `${startPart}...${endPart}`;
        
        // Set the full address as a title/tooltip for hover
        summaryRecipient.title = recipient;
      } else {
        summaryRecipient.textContent = recipient;
        summaryRecipient.title = '';
      }
      
      summaryTotal.textContent = `${amount.toFixed(8)} ${tokenSymbol} + fee`;
    } else {
      sendSummary.style.display = 'none';
    }
  }
  
  // Add input event listeners
  amountInput.addEventListener('input', updateSummary);
  recipientInput.addEventListener('input', updateSummary);
  
  // Handle cancel button
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  // Handle form submission
  sendForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const recipient = recipientInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const password = passwordInput.value;
    
    if (!recipient || !recipient.startsWith('kaspa:')) {
      alert('Please enter a valid Kaspa address');
      return;
    }
    
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    if (!password) {
      alert('Please enter your wallet password');
      return;
    }
    
    // Disable form and show loading
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Sending...';
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = '<div class="loading-state">Processing transaction...</div>';
    
    try {
      // Call the send token API
      const response = await fetch('/api/tokens/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          tokenId,
          recipient,
          amount,
          password
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Hide the form
        sendForm.style.display = 'none';
        
        // Show success message
        statusDiv.innerHTML = `
          <div class="success-container">
            <div class="success-icon">
              <i class="fas fa-check-circle"></i>
            </div>
            <div class="success-message">${tokenSymbol} tokens sent successfully!</div>
            ${data.txId ? `<p class="tx-id">Transaction ID: ${data.txId}</p>` : ''}
            <button id="close-success" class="primary-button" style="margin-top: 15px;">Close</button>
          </div>
        `;
        
        // Add event listener to close button
        document.getElementById('close-success').addEventListener('click', () => {
          modal.remove();
        });
        
        // Refresh token list after a short delay
        setTimeout(() => {
          loadTokens();
        }, 3000);
      } else {
        // Show error message
        statusDiv.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>${data.message || 'Failed to send tokens'}</p>
          </div>
        `;
        
        // Re-enable send button
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Try Again';
      }
    } catch (err) {
      console.error('Error sending tokens:', err);
      
      // Show error message
      statusDiv.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          <p>Network error. Please try again.</p>
        </div>
      `;
      
      // Re-enable send button
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Try Again';
    }
  });
}

// Helper function to generate colors from token symbols
function getColorFromSymbol(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  
  return color;
}
