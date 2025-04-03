document.addEventListener('DOMContentLoaded', async () => {
  const addressEl = document.getElementById('wallet-address');
  const balanceEl = document.getElementById('wallet-balance');
  const statusEl = document.querySelector('.status');
  const usdValueEl = document.getElementById('wallet-usd');
  const copyBtn = document.getElementById('copy-wallet');
  const refreshBtn = document.getElementById('refresh-wallet');
  const tokenTableBody = document.getElementById('token-table-body');
  
  // Function to load wallet status, address and balance
  async function loadWalletInfo() {
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
        
        console.log("Balance data received:", balanceData);
        
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

  //Function for the KNS lookup
  window.checkKNS = async function() {
  //const domain = document.getElementById('kns-input').value.trim();
  const domain = document.getElementById('kns-input').value.trim() + '.kas';

  const resultDiv = document.getElementById('kns-result');
  resultDiv.innerHTML = 'Checking...';

  try {
    const res = await fetch(`/api/kns/check?domain=${domain}`);
    const data = await res.json();

    if (data.available) {
      resultDiv.innerHTML = `
        <strong>Domain Name:</strong> ${data.domain}<br>
        <strong>Status:</strong> <span style="color: green;">Available</span>
      `;
    } else {
      resultDiv.innerHTML = `
        <strong>Domain Name:</strong> ${data.domain}<br>
        <strong>Status:</strong> <span style="color: red;">Taken</span><br>
        <strong>Owner:</strong> ${data.owner}
      `;
    }
  } catch (err) {
    resultDiv.innerHTML = 'Error fetching domain info.';
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

  // ==================== KRC-20 Token Functions ====================

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
  
  // Function to load KRC20 tokens
  async function loadTokens() {
    try {
      if (!tokenTableBody) return; // Skip if element doesn't exist
      
      tokenTableBody.innerHTML = '<tr><td colspan="4" class="loading-state">Loading tokens...</td></tr>';
      
      const res = await fetch('/api/tokens', {
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (data && data.tokens) {
        renderTokenTable(data.tokens);
      }
    } catch (err) {
      console.error('Error fetching tokens:', err);
      if (tokenTableBody) {
        tokenTableBody.innerHTML = '<tr><td colspan="4" class="loading-state">Error loading tokens</td></tr>';
      }
    }
  }
  
  function renderTokenTable(tokens) {
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
        console.log("Using direct URL for token icon:", token.icon_url);
        tokenIconHtml = `<div class="token-icon-wrapper"><div class="token-icon-img" style="background-image: url('${token.icon_url}');"></div></div>`;
      } else {
        // Use colored circle with initial as fallback
        console.log("Using fallback icon for token:", token.token_symbol);
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

  // Add this helper function to generate colors from symbols
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

  // Helper to truncate addresses
  function truncateAddress(address) {
    if (!address) return '';
    return address.substring(0, 10) + '...' + address.substring(address.length - 10);
  }
  
  // Function to show send token modal
  function showSendTokenModal(tokenId, tokenSymbol) {
    const modal = document.createElement('div');
    modal.className = 'wallet-popup';
    modal.innerHTML = `
      <div class="popup-content">
        <h3>Send ${tokenSymbol} Tokens</h3>
        <form id="send-token-form">
          <div class="form-group">
            <label for="recipient">Recipient Username:</label>
            <input type="text" id="recipient" required placeholder="Enter username">
          </div>
          <div class="form-group">
            <label for="amount">Amount:</label>
            <input type="number" id="amount" required min="0.00000001" step="0.00000001" placeholder="0.0">
          </div>
          <div class="button-row">
            <button type="submit" id="confirm-send">Send Tokens</button>
            <button type="button" id="cancel-send">Cancel</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('cancel-send').addEventListener('click', () => {
      modal.remove();
    });
    
    document.getElementById('send-token-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const recipient = document.getElementById('recipient').value.trim();
      const amount = parseFloat(document.getElementById('amount').value);
      
      if (!recipient || isNaN(amount) || amount <= 0) {
        alert('Please enter a valid recipient and amount');
        return;
      }
      
      try {
        const confirmBtn = document.getElementById('confirm-send');
        confirmBtn.textContent = 'Sending...';
        confirmBtn.disabled = true;
        
        const res = await fetch('/api/tokens/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            tokenId,
            recipient,
            amount
          })
        });
        
        const data = await res.json();
        
        if (res.ok) {
          alert('Tokens sent successfully!');
          modal.remove();
          loadTokens(); // Refresh token list
        } else {
          alert(`Error: ${data.message || 'Failed to send tokens'}`);
          confirmBtn.textContent = 'Send Tokens';
          confirmBtn.disabled = false;
        }
      } catch (err) {
        console.error('Error sending tokens:', err);
        alert('Error sending tokens. Please try again.');
        
        const confirmBtn = document.getElementById('confirm-send');
        confirmBtn.textContent = 'Send Tokens';
        confirmBtn.disabled = false;
      }
    });
  }

  // ==================== Wallet Creation Functions ====================

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

  // ==================== Transaction History Functions ====================

// Function to load transaction history
async function loadTransactionHistory(page = 0) {
  const address = document.getElementById('wallet-address')?.textContent.trim();
  const transactionList = document.getElementById('transaction-list');
  const historyFilter = document.getElementById('history-filter');

  if (!address || !transactionList || !historyFilter) return;

  const limit = 10;
  const offset = page * limit;
  const filter = historyFilter.value;

  transactionList.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-spinner fa-spin"></i>
      <div>Loading transactions...</div>
    </div>`;

  try {
    const encodedAddress = encodeURIComponent(address);
    const res = await fetch(`https://api.kaspa.org/addresses/${encodedAddress}/full-transactions?limit=${limit}&offset=${offset}&resolve_previous_outpoints=no`);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      transactionList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-history"></i>
          <div>No transaction history found.</div>
        </div>`;
      return;
    }

    // Filter
    const filtered = data.filter(tx => {
      const isSent = tx.inputs.some(i => i.previous_outpoint_address === address);
      if (filter === 'sent') return isSent;
      if (filter === 'received') return !isSent;
      return true;
    });

    transactionList.innerHTML = '';
    filtered.forEach(tx => {
      const isSent = tx.inputs.some(i => i.previous_outpoint_address === address);
      const receivedAmount = tx.outputs
        .filter(o => o.script_public_key_address === address)
        .reduce((sum, o) => sum + o.amount, 0);
      const sentAmount = tx.inputs
        .filter(i => i.previous_outpoint_address === address)
        .reduce((sum, i) => sum + i.previous_outpoint_amount, 0);
      const amount = isSent ? sentAmount : receivedAmount;

      const direction = isSent ? 'Sent' : 'Received';
      const shortTxid = tx.transaction_id.slice(0, 8) + '...';
      const date = new Date(tx.accepting_block_time).toLocaleString();

      const item = document.createElement('div');
      item.className = 'transaction-item';
      item.innerHTML = `
        <div class="transaction-icon">
          <i class="fas ${isSent ? 'fa-arrow-up sent' : 'fa-arrow-down received'}"></i>
        </div>
        <div class="transaction-details">
          <div class="tx-direction">${direction}</div>
          <div class="tx-id">TXID: <span title="${tx.transaction_id}">${shortTxid}</span></div>
          <div class="tx-date">${date}</div>
        </div>
        <div class="transaction-amount ${isSent ? 'sent' : 'received'}">
          ${(amount / 1e8).toFixed(8)} KAS
        </div>`;
      transactionList.appendChild(item);
    });

   // update page numbers
   updatePagination({
    current: page + 1,
    total: Math.ceil(filtered.length / limit)
   });



  } catch (err) {
    console.error('Error loading transaction history:', err);
    transactionList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <div>Error loading history</div>
      </div>`;
  }
}

// Function to render transactions - for future use when you have real data
function renderTransactions(transactions) {
  const transactionList = document.getElementById('transaction-list');
  
  if (!transactionList) return;
  
  transactionList.innerHTML = '';
  
  if (!transactions || transactions.length === 0) {
    transactionList.innerHTML = '<div class="empty-state">No transaction history available</div>';
    return;
  }
  
  transactions.forEach(tx => {
    const txElement = document.createElement('div');
    txElement.className = 'transaction-item';
    
    // Determine transaction type and icon
    let iconClass = '';
    let amountClass = '';
    let iconHtml = '';
    
    if (tx.type === 'receive') {
      iconClass = 'received';
      iconHtml = '<i class="fas fa-arrow-down"></i>';
      amountClass = 'positive';
    } else if (tx.type === 'send') {
      iconClass = 'sent';
      iconHtml = '<i class="fas fa-arrow-up"></i>';
      amountClass = 'negative';
    } else if (tx.type === 'token') {
      iconClass = 'token';
      iconHtml = '<i class="fas fa-coins"></i>';
      amountClass = tx.amount > 0 ? 'positive' : 'negative';
    }
    
    // Format the amount
    const formattedAmount = formatTransactionAmount(tx.amount, tx.currency);
    
    // Format the address (truncate it)
    const addressLabel = tx.type === 'send' ? 'To: ' : 'From: ';
    const truncatedAddress = truncateAddress(tx.address);
    
    // Format the date
    const formattedDate = formatTransactionDate(tx.timestamp);
    
    txElement.innerHTML = `
      <div class="transaction-icon ${iconClass}">
        ${iconHtml}
      </div>
      <div class="transaction-details">
        <div class="transaction-title">${tx.title}</div>
        <div class="transaction-address">${addressLabel}${truncatedAddress}</div>
        <div class="transaction-time">${formattedDate}</div>
      </div>
      <div class="transaction-amount ${amountClass}">
        ${formattedAmount}
      </div>
    `;
    
    transactionList.appendChild(txElement);
  });
}

// Function to update pagination controls - for future use
function updatePagination(pagination) {
  const prevButton = document.getElementById('history-prev');
  const nextButton = document.getElementById('history-next');
  const pageIndicator = document.getElementById('history-page-num');

  if (!prevButton || !nextButton || !pageIndicator) return;

  if (!pagination || !pagination.total) {
    pageIndicator.textContent = 'Page 0 of 0';
    prevButton.disabled = true;
    nextButton.disabled = true;
    return;
  }

  pageIndicator.textContent = `Page ${pagination.current} of ${pagination.total}`;
  prevButton.disabled = pagination.current <= 1;
  nextButton.disabled = pagination.current >= pagination.total;

  prevButton.onclick = () => {
    if (pagination.current > 1) {
      loadTransactionHistory(pagination.current - 1);
    }
  };

  nextButton.onclick = () => {
    if (pagination.current < pagination.total) {
      loadTransactionHistory(pagination.current + 1);
    }
  };
}

// Function to fetch a specific page of transactions - for future use
async function fetchPagedTransactions(page) {
  // Show loading state
  const transactionList = document.getElementById('transaction-list');
  if (transactionList) {
    transactionList.innerHTML = '<div class="loading-state">Loading transactions...</div>';
  }
  
  try {
    // Placeholder for API call - replace with real endpoint
    // const response = await fetch(`/api/transactions?page=${page}`, {
    //   credentials: 'include'
    // });
    // 
    // if (response.ok) {
    //   const data = await response.json();
    //   
    //   if (data && data.transactions) {
    //     renderTransactions(data.transactions);
    //     updatePagination(data.pagination);
    //   }
    // } else {
    //   throw new Error('Failed to fetch transactions');
    // }
    
    // For now, just show empty state
    if (transactionList) {
      transactionList.innerHTML = '<div class="empty-state">No transaction history available</div>';
    }
  } catch (error) {
    console.error('Error fetching transactions:', error);
    if (transactionList) {
      transactionList.innerHTML = '<div class="empty-state">Error loading transactions</div>';
    }
  }
}

// Helper functions for future use
function formatTransactionAmount(amount, currency) {
  if (currency === 'KAS') {
    return `${amount > 0 ? '+' : ''}${amount.toFixed(8)} KAS`;
  } else {
    return `${amount > 0 ? '+' : ''}${amount.toFixed(8)} ${currency}`;
  }
}

function formatTransactionDate(timestamp) {
  const date = new Date(timestamp);
  
  // Get current user preferred date format
  const dateFormat = document.getElementById('date-format')?.value || 'mdy';
  
  // Format based on preference
  let formattedDate = '';
  
  if (dateFormat === 'mdy') {
    formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  } else if (dateFormat === 'dmy') {
    formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  } else if (dateFormat === 'ymd') {
    formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  
  // Add time
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  
  return `${formattedDate} - ${time}`;
}

  // Function to render transactions
  function renderTransactions(transactions) {
    const transactionList = document.getElementById('transaction-list');
    
    if (!transactionList) return;
    
    transactionList.innerHTML = '';
    
    if (transactions.length === 0) {
      transactionList.innerHTML = '<div class="empty-state">No transactions found</div>';
      return;
    }
    
    transactions.forEach(tx => {
      const txElement = document.createElement('div');
      txElement.className = 'transaction-item';
      
      // Determine transaction type and icon
      let iconClass = '';
      let amountClass = '';
      let iconHtml = '';
      
      if (tx.type === 'receive') {
        iconClass = 'received';
        iconHtml = '<i class="fas fa-arrow-down"></i>';
        amountClass = 'positive';
      } else if (tx.type === 'send') {
        iconClass = 'sent';
        iconHtml = '<i class="fas fa-arrow-up"></i>';
        amountClass = 'negative';
      } else if (tx.type === 'token') {
        iconClass = 'token';
        iconHtml = '<i class="fas fa-coins"></i>';
        amountClass = tx.amount > 0 ? 'positive' : 'negative';
      }
      
      // Format the amount
      const formattedAmount = formatTransactionAmount(tx.amount, tx.currency);
      
      // Format the address (truncate it)
      const addressLabel = tx.type === 'send' ? 'To: ' : 'From: ';
      const truncatedAddress = truncateAddress(tx.address);
      
      // Format the date
      const formattedDate = formatTransactionDate(tx.timestamp);
      
      txElement.innerHTML = `
        <div class="transaction-icon ${iconClass}">
          ${iconHtml}
        </div>
        <div class="transaction-details">
          <div class="transaction-title">${tx.title}</div>
          <div class="transaction-address">${addressLabel}${truncatedAddress}</div>
          <div class="transaction-time">${formattedDate}</div>
        </div>
        <div class="transaction-amount ${amountClass}">
          ${formattedAmount}
        </div>
      `;
      
      transactionList.appendChild(txElement);
    });
  }

  // Function to update pagination controls
  function updatePagination(pagination) {
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const pageIndicator = document.getElementById('page-indicator');
    
    if (!prevButton || !nextButton || !pageIndicator) return;
    
    // Update page indicator
    pageIndicator.textContent = `Page ${pagination.current} of ${pagination.total}`;
    
    // Update button states
    prevButton.disabled = pagination.current <= 1;
    nextButton.disabled = pagination.current >= pagination.total;
    
    // Add click handlers
    prevButton.onclick = () => {
      if (pagination.current > 1) {
        fetchPagedTransactions(pagination.current - 1);
      }
    };
    
    nextButton.onclick = () => {
      if (pagination.current < pagination.total) {
        fetchPagedTransactions(pagination.current + 1);
      }
    };
  }

  // Function to fetch a specific page of transactions (placeholder)
  async function fetchPagedTransactions(page) {
    // Show loading state
    const transactionList = document.getElementById('transaction-list');
    if (transactionList) {
      transactionList.innerHTML = '<div class="loading-state">Loading transactions...</div>';
    }
    
    // In a real app, you would fetch data for the specific page
    // For now, we'll just reload the same data with a delay
    setTimeout(() => {
      loadTransactionHistory();
    }, 500);
  }

  // Helper function to format transaction amount
  function formatTransactionAmount(amount, currency) {
    if (currency === 'KAS') {
      return `${amount > 0 ? '+' : ''}${amount.toFixed(8)} KAS`;
    } else {
      return `${amount > 0 ? '+' : ''}${amount.toFixed(8)} ${currency}`;
    }
  }

  // Helper function to format transaction date
  function formatTransactionDate(timestamp) {
    const date = new Date(timestamp);
    
    // Get current user preferred date format
    const dateFormat = document.getElementById('date-format')?.value || 'mdy';
    
    // Format based on preference
    let formattedDate = '';
    
    if (dateFormat === 'mdy') {
      formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    } else if (dateFormat === 'dmy') {
      formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    } else if (dateFormat === 'ymd') {
      formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    // Add time
    const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    
    return `${formattedDate} - ${time}`;
  }

  // ==================== Settings Functions ====================

  // Handle backup wallet button
const backupWalletBtn = document.getElementById('backup-wallet');
if (backupWalletBtn) {
  backupWalletBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/wallet/export');
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'kaspa-seed.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      alert('Failed to export wallet seed.');
      console.error(err);
    }
  });
}


  // Handle view seed phrase button
  const viewSeedBtn = document.getElementById('view-seed');
  if (viewSeedBtn) {
    viewSeedBtn.addEventListener('click', function() {
fetch('/api/wallet/view-seed')
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      alert('Error: ' + data.error);
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'wallet-popup';
    modal.innerHTML = `
      <div class="popup-content">
        <h3>Your Seed Phrase</h3>
        <p style="font-family: monospace; padding: 10px; background: #eee; border-radius: 5px;">
          ${data.seed}
        </p>
        <div style="margin-top: 15px;">
          <button id="close-seed-modal">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('close-seed-modal').addEventListener('click', () => {
      modal.remove();
    });
  })
  .catch(err => {
    console.error('Failed to fetch seed:', err);
    alert('Failed to retrieve seed phrase.');
  });
    });
  }

  // Handle change password button
  const changePasswordBtn = document.getElementById('change-password');
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', function() {
      alert('This would open a form to change your wallet password.');
      // In a real implementation, this would show a password change form
    });
  }

  // Handle currency selection
  const currencySelect = document.getElementById('currency-select');
  if (currencySelect) {
    currencySelect.addEventListener('change', function() {
      // In a real implementation, this would update user preferences and refresh price display
      console.log(`Currency changed to: ${this.value}`);
    });
  }

  // Handle date format selection
  const dateFormatSelect = document.getElementById('date-format');
  if (dateFormatSelect) {
    dateFormatSelect.addEventListener('change', function() {
      // In a real implementation, this would update user preferences and refresh date formats
      console.log(`Date format changed to: ${this.value}`);
    });
  }

  // Handle theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('change', function() {
      if (this.checked) {
        document.body.classList.remove('dark-theme');
        document.querySelector('label[for="theme-toggle"] + span').textContent = 'Light';
      } else {
        document.body.classList.add('dark-theme');
        document.querySelector('label[for="theme-toggle"] + span').textContent = 'Dark';
      }
    });
  }

  // Handle auto-refresh toggle
  const refreshToggle = document.getElementById('refresh-toggle');
  if (refreshToggle) {
    refreshToggle.addEventListener('change', function() {
      // In a real implementation, this would enable/disable auto-refresh
      console.log(`Auto-refresh is now: ${this.checked ? 'enabled' : 'disabled'}`);
    });
  }

  // Handle advanced settings button
  const advancedSettingsBtn = document.getElementById('advanced-settings');
  if (advancedSettingsBtn) {
    advancedSettingsBtn.addEventListener('click', function() {
      alert('This would open advanced wallet configuration options.');
      // In a real implementation, this would show advanced settings
    });
  }

  // ==================== Tab Navigation ====================
// Tab navigation functionality
  const tabLinks = document.querySelectorAll('.wallet-nav a');
  const walletPanel = document.getElementById('wallet-panel');
  const historyPanel = document.getElementById('history-panel');
  const settingsPanel = document.getElementById('settings-panel');
  const knsPanel = document.getElementById('kns');

  // Function to switch tabs
  function switchTab(tabId) {
    // Hide all panels
    walletPanel.style.display = 'none';
    historyPanel.style.display = 'none';
    settingsPanel.style.display = 'none';
    knsPanel.style.display = 'none';
    
    // Remove active class from all tabs
    tabLinks.forEach(link => {
      link.parentElement.classList.remove('active');
    });
    
    // Show the selected panel and activate tab
    if (tabId === 'wallet') {
      walletPanel.style.display = 'block';
      document.querySelector('a[href="#wallet"]').parentElement.classList.add('active');
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

  
  
  // ==================== Handle Send and Receive buttons ====================
  
  // Handle the Send KAS button

// Handle the Send KAS button
// Handle the Send KAS button
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
    
    // Update the updateSummary function in your Send KAS button handler

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
 
  // Handle the Receive button
  const receiveBtn = document.getElementById('receive-coins');
  if (receiveBtn) {
    receiveBtn.addEventListener('click', function() {
      // Show a modal with the receiving address and QR code
      const modal = document.createElement('div');
      modal.className = 'wallet-popup';
      
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
      
	  const canvas = modal.querySelector('#kaspaQR');
if (address && canvas) {
  QRCode.toCanvas(canvas, `kaspa:${address}`, { width: 200 }, function (error) {
    if (error) console.error('QR Code generation error:', error);
  });
}
	  
      document.body.appendChild(modal);
      
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
  
  // ==================== Initial Load Functions ====================
  
  // Initialize node status display
  const nodeStatus = document.getElementById('node-status');
  if (nodeStatus) {
    nodeStatus.innerHTML = '<span class="status-indicator connected"></span> Connected';
  }
  
  // Initial load
  await loadWalletInfo();
  await updateKaspaPrice();
  await loadTokens();
  
  // Set up refresh interval for price
  setInterval(updateKaspaPrice, 60000); // Update price every minute
});

