// Load and display transaction history with proper pagination
async function loadTransactionHistory(page = 0) {
  const address = document.getElementById('wallet-address')?.textContent.trim();
  const transactionList = document.getElementById('transaction-list');
  const historyFilter = document.getElementById('history-filter');

  if (!address || !transactionList || !historyFilter) return;

  // Set pagination parameters - make sure limit is reasonably sized
  const limit = 10; // Number of transactions per page
  const offset = page * limit;
  const filter = historyFilter.value;

  // Display loading state
  transactionList.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-spinner fa-spin"></i>
      <div>Loading transactions...</div>
    </div>`;

  try {
    // Make API request with proper pagination parameters
    const encodedAddress = encodeURIComponent(address);
    
    // Ensure offset is correctly calculated from page number
    const calculatedOffset = page * limit;
    console.log(`Fetching transactions: page ${page}, offset ${calculatedOffset}, limit ${limit}`);
    
    const apiUrl = `https://api.kaspa.org/addresses/${encodedAddress}/full-transactions`;
    const queryParams = `?limit=${limit}&offset=${calculatedOffset}&resolve_previous_outpoints=no`;
    
    // Force no caching to ensure fresh results
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    };
    
    const res = await fetch(apiUrl + queryParams, fetchOptions);
    
    if (!res.ok) {
      throw new Error(`API returned status ${res.status}`);
    }
    
    // Log response headers to debug pagination
    console.log('Response headers:', 
      Object.fromEntries([...res.headers.entries()].map(([k, v]) => [k, v]))
    );
    
    const data = await res.json();
    console.log(`Fetched ${data.length} transactions`);

    if (!Array.isArray(data) || data.length === 0) {
      if (page > 0) {
        // If no data on page > 0, go back to page 0
        console.log('No data found on this page, going back to first page');
        loadTransactionHistory(0);
        return;
      }
      
      transactionList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-history"></i>
          <div>No transaction history found.</div>
        </div>`;
      return;
    }

    // Filter transactions based on selected filter
    const filtered = data.filter(tx => {
      const isSent = tx.inputs.some(i => i.previous_outpoint_address === address);
      if (filter === 'sent') return isSent;
      if (filter === 'received') return !isSent;
      return true;
    });

    if (filtered.length === 0) {
      transactionList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-filter"></i>
          <div>No ${filter} transactions found.</div>
        </div>`;
      return;
    }

    // Clear the transaction list before adding new transactions
    transactionList.innerHTML = '';

    // Process and render each transaction
    filtered.forEach(tx => {
      const isSent = tx.inputs.some(i => i.previous_outpoint_address === address);
      
      // Calculate amounts
      const receivedAmount = tx.outputs
        .filter(o => o.script_public_key_address === address)
        .reduce((sum, o) => sum + o.amount, 0);
      
      const sentAmount = tx.inputs
        .filter(i => i.previous_outpoint_address === address)
        .reduce((sum, i) => sum + i.previous_outpoint_amount, 0);
      
      const amount = isSent ? sentAmount : receivedAmount;
      const directionIcon = isSent ? '↑' : '↓';
      const label = isSent ? 'Sent' : 'Received';
      const amountClass = isSent ? 'kas-red' : 'kas-green';

      const txid = tx.txid || tx.transaction_id;
      const explorerUrl = `https://explorer.kaspa.org/txs/${txid}`;
      
      // Fix timestamp multiplication by 1000 if needed
      const timestamp = typeof tx.accepting_block_time === 'number' && tx.accepting_block_time < 10000000000
        ? tx.accepting_block_time * 1000  // Convert seconds to milliseconds if needed
        : tx.accepting_block_time;
		
	  const date = new Date(timestamp).toLocaleString();

      // Create transaction element with 3-part vertical layout
      const item = document.createElement('div');
      item.className = 'transaction-item';
      
      // Structure each transaction into 3 distinct parts
      item.innerHTML = `
        <div class="tx-row">
          <!-- Part 1: Top (direction and amount) -->
          <div class="tx-top">
            <span class="tx-direction-label">${directionIcon} ${label}</span>
            <span class="tx-amount ${amountClass}">${(amount / 1e8).toFixed(8)} KAS</span>
          </div>
          
          <!-- Part 2: Middle (transaction ID as link) -->
          <div class="tx-id">
            <a href="${explorerUrl}" target="_blank">${txid}</a>
          </div>
          
          <!-- Part 3: Bottom (date and time) -->
          <div class="tx-timestamp">
            <small>${date}</small>
          </div>
        </div>
      `;

      transactionList.appendChild(item);
    });

    // Calculate pagination information
    // First try to get total from X-Total-Count header
    let totalCount = parseInt(res.headers.get('X-Total-Count') || '0', 10);
    
    // If header is not available, estimate based on current data
    if (!totalCount || totalCount === 0) {
      // If we got a full page of results, assume there are more
      const hasMore = data.length >= limit;
      totalCount = hasMore ? (page + 2) * limit : (page + 1) * limit;
    }
    
    const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
    const currentPage = page + 1; // Convert to 1-based for display
    
    console.log(`Pagination: page ${currentPage}/${totalPages}, total items: ${totalCount}`);
    
    // Update pagination controls
    updatePagination({
      current: currentPage,
      total: totalPages,
      hasMore: data.length === limit,
      page: page // Keep track of the zero-based page
    });

  } catch (err) {
    console.error('Error loading transaction history:', err);
    transactionList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <div>Error loading history: ${err.message}</div>
      </div>`;
  }
}

// Updates pagination controls with correct event handlers
function updatePagination(pagination) {
  const prevButton = document.getElementById('prev-page');
  const nextButton = document.getElementById('next-page');
  const pageIndicator = document.getElementById('page-indicator');

  if (!prevButton || !nextButton || !pageIndicator) return;

  if (!pagination || !pagination.total) {
    pageIndicator.textContent = 'Page 0 of 0';
    prevButton.disabled = true;
    nextButton.disabled = true;
    return;
  }

  pageIndicator.textContent = `Page ${pagination.current} of ${pagination.total}`;
  prevButton.disabled = pagination.current <= 1;
  nextButton.disabled = pagination.current >= pagination.total && !pagination.hasMore;

  // Remove all existing click event listeners
  const newPrevButton = prevButton.cloneNode(true);
  const newNextButton = nextButton.cloneNode(true);
  
  prevButton.parentNode.replaceChild(newPrevButton, prevButton);
  nextButton.parentNode.replaceChild(newNextButton, nextButton);
  
  // Add new event listeners with clear console logging
  newPrevButton.addEventListener('click', function() {
    const prevPage = pagination.page - 1;
    if (prevPage >= 0) {
      console.log(`Navigating to previous page: ${prevPage} (will show as page ${prevPage + 1})`);
      console.log(`This will set offset=${prevPage * 10} in the API request`);
      loadTransactionHistory(prevPage);
    }
  });

  newNextButton.addEventListener('click', function() {
    const nextPage = pagination.page + 1;
    console.log(`Navigating to next page: ${nextPage} (will show as page ${nextPage + 1})`);
    console.log(`This will set offset=${nextPage * 10} in the API request`);
    loadTransactionHistory(nextPage);
  });
}

// Helper to filter transactions by type
function filterTransactions(type) {
  const filter = document.getElementById('history-filter');
  if (filter) {
    filter.value = type;
    loadTransactionHistory(0); // Reset to first page
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
}

// Fetch transactions from Kas.fyi API - for token transactions
async function loadKasFyiTransactions(address, page = 0, limit = 20) {
  const nonce = '1743694255605:1f88063bf6e2037f887a6cad10baac027207d8fcecdc0693b5a7b0fa5b964593';
  const offset = page * limit;

  const encodedAddress = encodeURIComponent(address);
  const url = `https://api-v2-do.kas.fyi/addresses/${encodedAddress}/transactions?nonce=${nonce}&offset=${offset}&limit=${limit}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!Array.isArray(data.transactions)) {
      console.warn('Unexpected format:', data);
      return;
    }

    data.transactions.forEach(tx => {
      const isTokenTransfer = tx.token_transfers && tx.token_transfers.length > 0;
      const direction = tx.inputs.some(i => i.address === address) ? 'Sent' : 'Received';
      const timestamp = new Date(tx.timestamp * 1000).toLocaleString();
      const shortTxid = tx.txid?.slice(0, 8) + '...';

      if (isTokenTransfer) {
        tx.token_transfers.forEach(t => {
          console.log(`[TOKEN] ${direction} ${t.amount / 1e8} ${t.token_symbol} (${t.token_name}) at ${timestamp}, TXID: ${shortTxid}`);
        });
      } else {
        const totalKas = tx.outputs
          .filter(o => o.address === address)
          .reduce((sum, o) => sum + o.value, 0);

        console.log(`[KASPA] ${direction} ${(totalKas / 1e8).toFixed(8)} KAS at ${timestamp}, TXID: ${shortTxid}`);
      }
    });
  } catch (err) {
    console.error('Error loading transactions:', err);
  }
}

// Helper functions for formatting transaction data
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