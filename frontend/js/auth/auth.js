document.getElementById('login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = {
    username: formData.get('username'),
    password: formData.get('password') // plain, will be sent to backend to hash/verify
  };

  try {

const response = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  credentials: 'include' // <- REQUIRED!
});

    const result = await response.json();
    if (response.ok) {
      window.location.href = '/dashboard.html';
    } else {
      alert(result.message || 'Login failed');
    }
  } catch (err) {
    console.error('Login error:', err);
    alert('Login error');
  }
});

