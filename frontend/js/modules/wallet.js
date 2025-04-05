// Function to load wallet status, address and balance
async function loadWalletInfo() {
  const addressEl = document.getElementById('wallet-address');
  const balanceEl = document.getElementById('wallet-balance');
  const statusEl = document.querySelector('.status');
  const usdValueEl = document.getElementById('wallet-usd');
  
  try {
    // First check if wallet is attached
    const statusRes = await fetch('/api/wallet/status', {
      credentials: 'include' // Important for session cookies
    });
    
    const status = await statusRes.json();
    
    if (!status.attached) {
      addressEl.textContent = 'No wallet found.';
      statusEl.textContent = 'No wallet attached';
      balanceEl.textContent = '0 KAS';
      usdValueEl.textContent = '$0.00';
      showWalletAttachPopup();
      return;
    }
    
    statusEl.textContent = 'Connected';
    statusEl.classList.add('connected');
    
    // Get the wallet address
    try {
      const addressRes = await fetch('/api/wallet/address', {
        credentials: 'include'
      });
      
      const addressData = await addressRes.json();
      
      if (addressData.address) {
        addressEl.textContent = addressData.address;
      } else {
        addressEl.textContent = 'Error loading address';
      }
    } catch (err) {
      console.error('Error fetching wallet address:', err);
      addressEl.textContent = 'Error loading address';
    }
    
    // Get the wallet balance
    try {
      // Show loading state
      balanceEl.textContent = 'Loading...';
      
      const balanceRes = await fetch('/api/wallet/balance', {
        credentials: 'include'
      });
      
      const balanceData = await balanceRes.json();
      
      //console.log("Balance data received:", balanceData);
      
      if (balanceData) {
        // Use the pre-parsed balance if available
        if (balanceData.formattedBalance) {
          balanceEl.textContent = balanceData.formattedBalance;
          
          // Update the USD value if we have the price
          if (window.kaspaPrice && balanceData.parsedBalance) {
            const usdValue = balanceData.parsedBalance * window.kaspaPrice;
            usdValueEl.textContent = `$${usdValue.toFixed(2)}`;
          }
        } 
        // Fall back to parsing the raw output
        else if (balanceData.balance) {
          // Parse the balance output to extract KAS value
          const balanceOutput = balanceData.balance;
          const somatis = parseKaspaBalance(balanceOutput);
          
          if (somatis !== null) {
            const kasValue = somatis / 100000000; // Convert somatis to KAS
            balanceEl.textContent = `${kasValue.toFixed(8)} KAS`;
            
            // Update the USD value if we have the price
            if (window.kaspaPrice) {
              const usdValue = kasValue * window.kaspaPrice;
              usdValueEl.textContent = `$${usdValue.toFixed(2)}`;
            }
          } else {
            balanceEl.textContent = 'Error parsing balance';
          }
        } else {
          balanceEl.textContent = '0 KAS';
          usdValueEl.textContent = '$0.00';
        }
      } else {
        balanceEl.textContent = '0 KAS';
        usdValueEl.textContent = '$0.00';
      }
    } catch (err) {
      console.error('Error fetching wallet balance:', err);
      balanceEl.textContent = 'Error loading balance';
    }
  } catch (err) {
    console.error('Error fetching wallet info:', err);
    addressEl.textContent = 'Wallet load error';
    statusEl.textContent = 'Error';
  }
}

// Helper function to parse Kaspa balance output
function parseKaspaBalance(balanceOutput) {
  try {
    console.log("Raw balance output to parse:", balanceOutput);
    
    // First try to match the "Total balance, KAS" format
    const totalMatch = balanceOutput.match(/Total balance, KAS\s+(\d+\.\d+)/);
    if (totalMatch && totalMatch[1]) {
      console.log("Matched total balance format:", totalMatch[1]);
      return parseFloat(totalMatch[1]) * 100000000; // Convert KAS to somatis
    }
    
    // Try to match address with balance format
    const addressMatch = balanceOutput.match(/kaspa:.+?\s+(\d+\.\d+)\s/);
    if (addressMatch && addressMatch[1]) {
      console.log("Matched address balance format:", addressMatch[1]);
      return parseFloat(addressMatch[1]) * 100000000; // Convert KAS to somatis
    }
    
    // Try to find a pattern like "Balance: 123456789 somatis"
    const balanceMatch = balanceOutput.match(/Balance:\s*(\d+)\s*somatis/);
    if (balanceMatch && balanceMatch[1]) {
      console.log("Matched somatis format:", balanceMatch[1]);
      return parseInt(balanceMatch[1], 10);
    }
    
    // Try to find any decimal number in the output as last resort
    const numberMatch = balanceOutput.match(/(\d+\.\d+)/);
    if (numberMatch && numberMatch[1]) {
      console.log("Matched any decimal:", numberMatch[1]);
      return parseFloat(numberMatch[1]) * 100000000; // Convert KAS to somatis
    }
    
    console.log("No balance pattern matched, defaulting to 0");
    return 0; // Default to 0 if no match
  } catch (e) {
    console.error('Error parsing balance:', e);
    return 0;
  }
}

// Wallet creation popup
function showWalletCreatePopup() {
  const popup = document.createElement('div');
  popup.className = 'wallet-popup';
  popup.innerHTML = `
    <div class="popup-content">
      <h3>Create Wallet</h3>
      <p>Choose a strong password to encrypt your wallet.</p>
      <input type="password" id="wallet-password" placeholder="Enter password" />
      <div class="button-row">
        <button id="submit-create-wallet">Create</button>
        <button onclick="this.closest('.wallet-popup').remove()">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  document.getElementById('submit-create-wallet').onclick = async () => {
    const password = document.getElementById('wallet-password').value.trim();
    if (!password) return alert('Please enter a password.');
    
    try {
      const createBtn = document.getElementById('submit-create-wallet');
      createBtn.textContent = 'Creating...';
      createBtn.disabled = true;
      
      const res = await fetch('/api/wallet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Wallet creation failed');

      popup.remove();
      if (data.seedPhrase) {
        showSeedPhrasePopup(data.seedPhrase);
      } else {
        alert('Wallet created successfully! Refreshing wallet information...');
        loadWalletInfo();
      }
    } catch (err) {
      console.error('Wallet creation error:', err);
      alert('Wallet creation failed: ' + err.message);
    }
  };
}

// Show wallet attachment options
function showWalletAttachPopup() {
  const popup = document.createElement('div');
  popup.className = 'wallet-popup';
  popup.innerHTML = `
    <div class="popup-content">
      <h3>🔐 Wallet Not Found</h3>
      <p>This account has no wallet. Would you like to create a new one or enter a seed phrase?</p>
      <div class="button-row">
        <button id="create-wallet-btn">Create Wallet</button>
        <button id="import-seed-btn">Enter Seed</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  document.getElementById('create-wallet-btn').onclick = () => {
    popup.remove();
    showWalletCreatePopup();
  };

  document.getElementById('import-seed-btn').onclick = () => {
    popup.remove();
    // Placeholder for future implementation
    alert('Seed phrase import will be available soon!');
  };
}

// Show seed phrase popup
function showSeedPhrasePopup(seedPhrase) {
  const words = seedPhrase.split(' ');
  let wordsHtml = '<div class="seed-grid">';
  
  words.forEach((word, index) => {
    wordsHtml += `<span>${index + 1}. ${word}</span>`;
  });
  
  wordsHtml += '</div>';
  
  const popup = document.createElement('div');
  popup.className = 'wallet-popup';
  popup.innerHTML = `
    <div class="popup-content">
      <h3>🔑 Recovery Seed Phrase</h3>
      <p><strong>Important:</strong> Write down these words in order and keep them safe. This is the ONLY way to recover your wallet.</p>
      ${wordsHtml}
      <p class="warning">Anyone with these words can access your funds. Never share them with anyone!</p>
      <div class="button-row">
        <button id="copy-seed-btn">Copy Seed</button>
        <button id="done-seed-btn">I've Saved It</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  document.getElementById('copy-seed-btn').onclick = () => {
    navigator.clipboard.writeText(seedPhrase);
    document.getElementById('copy-seed-btn').textContent = 'Copied!';
  };

  document.getElementById('done-seed-btn').onclick = () => {
    popup.remove();
    loadWalletInfo(); // Refresh wallet info after creation
  };
}

// Handle the Send KAS button
function setupSendKasButton() {
  const sendKasBtn = document.getElementById('send-coins');
  if (sendKasBtn) {
    sendKasBtn.addEventListener('click', function() {
      // Show a modal for sending KAS
      const modal = document.createElement('div');
      modal.className = 'wallet-popup';
      modal.innerHTML = `
        <div class="popup-content">
          <h3>Send KAS</h3>
          
          <form id="send-kas-form" autocomplete="off">
            <div class="form-group">
              <label for="kas-recipient">Recipient Address:</label>
              <input type="text" id="kas-recipient" name="kas_recipient" required placeholder="kaspa:..." autocomplete="off">
            </div>
            <div class="form-group">
              <label for="kas-amount">Amount:</label>
              <input type="number" id="kas-amount" name="kas_amount" required min="0.00000001" step="0.00000001" placeholder="0.0" autocomplete="off">
            </div>
            <div class="form-group">
              <label for="kas-password">Wallet Password:</label>
              <input type="password" id="kas-password" name="wallet_send_password" required placeholder="Enter your wallet password" autocomplete="new-password">
            </div>

            <div class="send-summary" style="display: none;">
              <div class="summary-item">
                <span class="summary-label">Amount:</span>
                <span class="summary-value" id="summary-amount">0 KAS</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Recipient:</span>
                <span class="summary-value" id="summary-recipient">kaspa:...</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Fee (estimate):</span>
                <span class="summary-value" id="summary-fee">~0.00001 KAS</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Total:</span>
                <span class="summary-value" id="summary-total">0 KAS</span>
              </div>
            </div>
            <div class="button-row">
              <button type="submit" id="confirm-send-kas">Send KAS</button>
              <button type="button" id="cancel-send-kas">Cancel</button>
            </div>
          </form>
          <div id="send-kas-status" style="margin-top: 15px; display: none;"></div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Get form elements
      const sendForm = document.getElementById('send-kas-form');
      const recipientInput = document.getElementById('kas-recipient');
      const amountInput = document.getElementById('kas-amount');
      const passwordInput = document.getElementById('kas-password');
      const confirmBtn = document.getElementById('confirm-send-kas');
      const cancelBtn = document.getElementById('cancel-send-kas');
      const statusDiv = document.getElementById('send-kas-status');
      
      // Update summary when inputs change
      const summaryAmount = document.getElementById('summary-amount');
      const summaryRecipient = document.getElementById('summary-recipient');
      const summaryTotal = document.getElementById('summary-total');
      const sendSummary = document.querySelector('.send-summary');
      
      function updateSummary() {
        const amount = parseFloat(amountInput.value) || 0;
        const recipient = recipientInput.value || 'kaspa:...';
        
        if (amount > 0) {
          sendSummary.style.display = 'block';
          summaryAmount.textContent = `${amount.toFixed(8)} KAS`;
          
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
          
          summaryTotal.textContent = `${amount.toFixed(8)} KAS`;
        } else {
          sendSummary.style.display = 'none';
        }
      }
      
      amountInput.addEventListener('input', updateSummary);
      recipientInput.addEventListener('input', updateSummary);
      
      // Handle cancel
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
          // Call the send API
          const response = await fetch('/api/wallet/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              toAddress: recipient,
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
                <div class="success-message">Transaction sent successfully!</div>
                ${data.txId ? `<p class="tx-id">Transaction ID: ${data.txId}</p>` : ''}
                <button id="close-success" class="primary-button" style="margin-top: 15px;">Close</button>
              </div>
            `;
            
            // Add event listener to close button
            document.getElementById('close-success').addEventListener('click', () => {
              modal.remove();
            });
            
            // Refresh wallet data after a short delay
            setTimeout(() => {
              loadWalletInfo();
            }, 3000);
          } else {
            // Show error message
            statusDiv.innerHTML = `
              <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${data.message || 'Failed to send transaction'}</p>
              </div>
            `;
            
            // Re-enable send button
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Try Again';
          }
        } catch (error) {
          console.error('Error sending transaction:', error);
          
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
    });
  }
}

// Handle the Receive button
function setupReceiveKasButton() {
  const receiveBtn = document.getElementById('receive-coins');
  if (receiveBtn) {
    receiveBtn.addEventListener('click', function() {
      // Show a modal with the receiving address and QR code
      const modal = document.createElement('div');
      modal.className = 'wallet-popup';
      
      const addressEl = document.getElementById('wallet-address');
      const address = addressEl?.textContent.trim() || 'No address available';
      
      modal.innerHTML = `
        <div class="popup-content">
          <h3>Receive KAS</h3>
          <p>Share your address to receive KAS:</p>
          <div class="address-box" style="margin-bottom: 15px;">
            <span>${address}</span>
            <button id="popup-copy-address" class="copy-button" title="Copy address">
              <i class="far fa-copy"></i>
            </button>
          </div>
          <canvas id="kaspaQR" width="200" height="200" style="margin: 0 auto;"></canvas>
          <div style="margin-top: 15px;">
            <button id="close-receive-modal">Close</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      const canvas = modal.querySelector('#kaspaQR');
      if (address && canvas) {
        QRCode.toCanvas(canvas, `kaspa:${address}`, { width: 200 }, function (error) {
          if (error) console.error('QR Code generation error:', error);
        });
      }
      
      document.getElementById('close-receive-modal').addEventListener('click', () => {
        modal.remove();
      });
      
      document.getElementById('popup-copy-address').addEventListener('click', () => {
        navigator.clipboard.writeText(address);
        document.getElementById('popup-copy-address').innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
          document.getElementById('popup-copy-address').innerHTML = '<i class="far fa-copy"></i>';
        }, 1500);
      });
    });
  }
}

// Function to update Kaspa USD value
async function updateKaspaPrice() {
  try {
    const res = await fetch('/api/price/kaspa', {
      credentials: 'include'
    });
    
    const data = await res.json();
    
    if (data && data.price) {
      // Store price for later use
      window.kaspaPrice = data.price;
      
      // If we have a balance, update the USD value
      const balanceEl = document.getElementById('wallet-balance');
      const usdValueEl = document.getElementById('wallet-usd');
      
      const balanceText = balanceEl.textContent;
      const balanceMatch = balanceText.match(/([\d.]+)\s*KAS/);
      
      if (balanceMatch && balanceMatch[1]) {
        const kasBalance = parseFloat(balanceMatch[1]);
        const usdValue = kasBalance * data.price;
        usdValueEl.textContent = `$${usdValue.toFixed(2)}`;
      }
    }
  } catch (err) {
    console.error('Error fetching Kaspa price:', err);
  }
}

// Initialize wallet-related buttons
function initWalletButtons() {
  const copyBtn = document.getElementById('copy-wallet');
  const refreshBtn = document.getElementById('refresh-wallet');
  const addressEl = document.getElementById('wallet-address');
  
  // Copy wallet address to clipboard
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const address = addressEl?.textContent.trim();
      if (address && address.startsWith('kaspa:')) {
        navigator.clipboard.writeText(address);
        copyBtn.title = 'Copied!';
        
        // Visual feedback
        const originalIcon = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
          copyBtn.innerHTML = originalIcon;
          copyBtn.title = 'Copy address';
        }, 1500);
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
}
