// Load user settings from server
async function loadUserSettings() {
  try {
    const response = await fetch('/settings', {
      method: 'GET',
      credentials: 'include'
    });

    const settings = await response.json();

    // Theme
    const themeToggle = document.getElementById('theme-toggle');
    if (settings.theme === 'dark') {
      document.body.classList.add('dark-theme');
      if (themeToggle) themeToggle.checked = false;
      document.querySelector('label[for="theme-toggle"] + span').textContent = 'Dark';
    } else {
      document.body.classList.remove('dark-theme');
      if (themeToggle) themeToggle.checked = true;
      document.querySelector('label[for="theme-toggle"] + span').textContent = 'Light';
    }

    // Currency
    const currencySelect = document.getElementById('currency-select');
    if (currencySelect && settings.currency) {
      currencySelect.value = settings.currency;
      localStorage.setItem('walletCurrency', settings.currency.toLowerCase());
    }

    // Date format
    const dateFormatSelect = document.getElementById('date-format');
    if (dateFormatSelect && settings.date_format) {
      dateFormatSelect.value = settings.date_format;
    }

    // Auto-refresh
    const autoRefreshToggle = document.getElementById('refresh-toggle');
    if (autoRefreshToggle) {
      autoRefreshToggle.checked = settings.auto_refresh;
      const label = document.querySelector('label[for="refresh-toggle"] + span');
      if (label) label.textContent = settings.auto_refresh ? 'On' : 'Off';
    }

  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

// Initialize settings UI elements and event handlers
function initSettingsUI() {
  // Handle Save Settings button
  const saveSettingsBtn = document.getElementById('save-settings');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveUserSettings);
  }

  // Handle backup wallet button
  const backupWalletBtn = document.getElementById('backup-wallet');
  if (backupWalletBtn) {
    backupWalletBtn.addEventListener('click', backupWallet);
  }

  // Handle view seed phrase button
  const viewSeedBtn = document.getElementById('view-seed');
  if (viewSeedBtn) {
    viewSeedBtn.addEventListener('click', viewSeedPhrase);
  }

  // Handle change password button
  const changePasswordBtn = document.getElementById('change-password');
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', showChangePasswordModal);
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
      ToastNotification.error("This would open advanced wallet configuration options.");
      // In a real implementation, this would show advanced settings
    });
  }
}

// Save user settings to server
async function saveUserSettings() {
  const themeToggle = document.getElementById('theme-toggle');
  const currencySelect = document.getElementById('currency-select');
  const dateFormatSelect = document.getElementById('date-format');
  const autoRefreshToggle = document.getElementById('refresh-toggle');

  const payload = {
    theme: themeToggle && themeToggle.checked ? 'light' : 'dark',
    currency: currencySelect ? currencySelect.value : 'USD',
    date_format: dateFormatSelect ? dateFormatSelect.value : 'MM/DD/YYYY',
    auto_refresh: autoRefreshToggle ? autoRefreshToggle.checked : true
  };

  try {
    const response = await fetch('/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.success) {
      ToastNotification.success("Settings saved successfully!");
      triggerBalanceRefresh();           // refresh Kaspa balance & value
    } else {
      ToastNotification.error('Failed to save settings: ' + result.message);
    }
  } catch (err) {
    console.error('Error saving settings:', err);
    ToastNotification.error("An error occurred while saving settings.");
  }
}

// -------------------- Wallet‑backup -----------------------------
async function backupWallet() {
  try {
    const res = await fetch('/api/wallet/export');
    if (!res.ok) throw new Error('export failed');

    const blob = await res.blob();
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href      = url;
    a.download  = 'kaspa-seed.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    ToastNotification.error("Failed to export wallet seed.");
    console.error(err);
  }
}

// -------------------- View seed phrase --------------------------
function viewSeedPhrase() {
  fetch('/api/wallet/view-seed')
    .then(r => r.json())
    .then(d => {
      if (!d.success) return alert('Error: ' + d.error);

      const modal = document.createElement('div');
      modal.className = 'wallet-popup';
      modal.innerHTML = `
        <div class="popup-content">
          <h3>Your Seed Phrase</h3>
          <p style="font-family: monospace; padding: 10px; background:#eee;border-radius:5px;">
            ${d.seed}
          </p>
          <button id="close-seed-modal">Close</button>
        </div>`;
      document.body.appendChild(modal);
      document.getElementById('close-seed-modal').onclick = () => modal.remove();
    })
    .catch(err => {
      console.error('Failed to fetch seed:', err);
      ToastNotification.error("Failed to retrieve seed phrase.");
    });
}

// -------------------- Change‑password modal ---------------------
function showChangePasswordModal() {
  const html = `
    <div class="wallet-popup">
      <div class="popup-content">
        <h3>Change Wallet Password</h3>
        <div class="form-group">
          <label for="old-password">Current Password</label>
          <input type="password" id="old-password" placeholder="Current password">
        </div>
        <div class="form-group">
          <label for="new-password">New Password</label>
          <input type="password" id="new-password" placeholder="New password">
        </div>
        <button id="submit-change-pass">Update</button>
        <button id="cancel-change-pass">Cancel</button>
      </div>
    </div>`;
  const modal = document.createElement('div');
  modal.innerHTML = html;
  document.body.appendChild(modal);

  document.getElementById('cancel-change-pass').onclick = () => modal.remove();
  document.getElementById('submit-change-pass').onclick = async () => {
    const oldPass = document.getElementById('old-password').value.trim();
    const newPass = document.getElementById('new-password').value.trim();
    if (!oldPass || !newPass) return ToastNotification.error("Please fill both fields");

    try {
      const r = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ oldPass, newPass })
      });
      const j = await r.json();
      if (j.success) {
        ToastNotification.error("Password updated successfully.");
        modal.remove();
      } else {
        alert(j.error || 'Failed to change password.');
      }
    } catch (err) {
      console.error('[ChangePassword]', err);
      ToastNotification.error("Network or server error.");
    }
  };
}

/* --------------------------------------------------------------
   Refresh wallet after saving settings
----------------------------------------------------------------*/
function triggerBalanceRefresh() {
  if (typeof loadWalletInfo === 'function' && typeof updateKaspaPrice === 'function') {
    loadWalletInfo().then(updateKaspaPrice).catch(console.error);
  } else {
    const btn = document.getElementById('refresh-wallet');
    if (btn) btn.click();
  }
}

/* --------------------------------------------------------------
   Comment: The duplicate saveUserSettings function was removed.
   The functionality is already included in the main function above.
----------------------------------------------------------------*/

/* --------------------------------------------------------------
   EXPORT the initializer for core.js
----------------------------------------------------------------*/
window.initSettingsUI = initSettingsUI;

