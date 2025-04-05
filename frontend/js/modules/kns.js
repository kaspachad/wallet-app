// Function for the KNS lookup
async function checkKNS() {
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

// Initialize KNS UI elements
function initKNSUI() {
  const knsCheckBtn = document.getElementById('kns-check-btn');
  if (knsCheckBtn) {
    knsCheckBtn.addEventListener('click', checkKNS);
  }
  
  const knsInput = document.getElementById('kns-input');
  if (knsInput) {
    knsInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        checkKNS();
      }
    });
  }
}