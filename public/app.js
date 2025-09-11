async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (res.ok) {
    window.location = 'dashboard.html';
  } else {
    alert('Login failed');
  }
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location = 'login.html';
}

async function setLight(on) {
  const colorPicker = document.getElementById('colorPicker');
  const color = hexToRgb(colorPicker.value);
  await fetch('/api/lights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: on, color })
  });
}

function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

async function refreshTemp() {
  const res = await fetch('/api/temperature');
  if (res.ok) {
    const data = await res.json();
    document.getElementById('temp').textContent = data.temperature ?? data.value ?? JSON.stringify(data);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', e => { e.preventDefault(); login(); });
    return;
  }
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
    const toggle = document.getElementById('lightToggle');
    toggle.addEventListener('change', () => setLight(toggle.checked));
    document.getElementById('setColorBtn').addEventListener('click', () => setLight(toggle.checked));
    document.getElementById('refreshTemp').addEventListener('click', refreshTemp);
    refreshTemp();
  }
});
