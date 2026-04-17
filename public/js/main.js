// Shared utilities

async function loadCurrentUser() {
  try {
    const r = await fetch('/api/me');
    if (!r.ok) { window.location.href = '/login'; return; }
    const d = await r.json();
    const el = document.getElementById('nav-user');
    if (el) el.textContent = `👤 ${d.fullName}`;
  } catch { window.location.href = '/login'; }
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('cs-CZ') + ' ' + d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

function avatarSrc(src) {
  return src || '/img/default-avatar.svg';
}

// Logout
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('logout-btn');
  if (btn) btn.addEventListener('click', async () => {
    await fetch('/logout', { method: 'POST' });
    window.location.href = '/login';
  });

  // Mobile nav toggle
  const toggle = document.getElementById('nav-toggle');
  const links  = document.querySelector('.nav-links');
  if (toggle && links) toggle.addEventListener('click', () => links.classList.toggle('open'));
});
