
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-mining');
  const stopBtn = document.getElementById('stop-mining');
  const addressInput = document.getElementById('miner-address');
  const connectionStatus = document.getElementById('miner-status');
  const hashValue = document.getElementById('miner-hashrate');
  const blockFoundNotice = document.getElementById('blockFoundNotice');

  // use labels
  const clockDisplay = document.getElementById('mining-clock');
  const blockCountDisplay = document.getElementById('mining-blocks');

  let minerInterval = null;
  let miningStartTime = null;
  let blockCount = 0;

  const updateClock = () => {
    if (!miningStartTime) return;
    const now = new Date();
    const diff = Math.floor((now - miningStartTime) / 1000);
    const hours = String(Math.floor(diff / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
    const seconds = String(diff % 60).padStart(2, '0');
    clockDisplay.textContent = `Mining Time: ${hours}:${minutes}:${seconds}`;
  };

  const updateBlockCount = () => {
    blockCountDisplay.textContent = `Blocks Found: ${blockCount}`;
  };

  startBtn.addEventListener('click', async () => {
    const address = addressInput.value.trim();
    if (!address.startsWith('kaspa:')) {
      alert('Please enter a valid Kaspa address.');
      return;
    }

    startBtn.disabled = true;
    stopBtn.disabled = false;

    const res = await fetch('/api/miner/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    });

    if (!res.ok) {
      alert('Failed to start miner');
      startBtn.disabled = false;
      stopBtn.disabled = true;
      return;
    }

    connectionStatus.textContent = 'Waiting...';

    minerInterval = setInterval(async () => {
      const res = await fetch(`/api/miner/log?_=${Date.now()}`);
      const logText = await res.text();

      if (logText.includes('Connected to localhost:16110')) {
        if (connectionStatus.textContent !== 'Connected') {
          connectionStatus.textContent = 'Connected';
          connectionStatus.classList.remove('disconnected');
          connectionStatus.classList.add('connected');

          miningStartTime = new Date();
          blockCount = 0;
        }
      }

      const hashMatches = [...logText.matchAll(/Current hash rate is ([\d.]+) Khash\/s/g)];
      if (hashMatches.length > 0) {
        const lastMatch = hashMatches[hashMatches.length - 1];
        hashValue.textContent = lastMatch[1];
      }

      if (logText.includes('Found a block') || logText.includes('Block found')) {
        if (!blockFoundNotice.textContent) {
          blockFoundNotice.textContent = '🎉 Block found!';
        }
        blockCount++;
        updateBlockCount();
        setTimeout(() => {
          blockFoundNotice.textContent = '';
        }, 10000);
      }

      updateClock();
    }, 1000);
  });

  stopBtn.addEventListener('click', async () => {
    await fetch('/api/miner/stop', { method: 'POST' });
    stopBtn.disabled = true;
    startBtn.disabled = false;
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.classList.remove('connected');
    connectionStatus.classList.add('disconnected');

    hashValue.textContent = '0';
    blockCount = 0;
    miningStartTime = null;
    clockDisplay.textContent = '';
    updateBlockCount();
    if (minerInterval) clearInterval(minerInterval);
  });

  // Initial state
  stopBtn.disabled = true;
  updateBlockCount();
});

