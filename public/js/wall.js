document.addEventListener('DOMContentLoaded', async () => {
  loadCurrentUser();

  // Load feed
  async function loadFeed() {
    const feed = document.getElementById('feed');
    try {
      const r = await fetch('/api/posts');
      if (r.status === 401) { window.location.href = '/login'; return; }
      const posts = await r.json();
      feed.innerHTML = '';
      if (!posts.length) {
        feed.innerHTML = '<p class="text-muted text-center">Zatím žádné příspěvky. Buďte první!</p>';
        return;
      }
      posts.forEach(p => feed.appendChild(buildPost(p)));
      bindPostEvents();
    } catch (e) {
      feed.innerHTML = '<p class="text-error">Chyba načítání příspěvků.</p>';
    }
  }

  // Image pick button
  document.getElementById('image-pick-btn').addEventListener('click', () => imgInput.click());

  // Image preview for new post
  const imgInput = document.getElementById('post-image');
  const imgPreview = document.getElementById('post-image-preview');
  const imgName = document.getElementById('post-image-name');
  imgInput.addEventListener('change', () => {
    const file = imgInput.files[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      alert('Povolené jsou pouze soubory .jpg a .png');
      imgInput.value = '';
      imgName.textContent = '';
      imgPreview.classList.add('hidden');
      return;
    }
    imgName.textContent = file.name;
    const reader = new FileReader();
    reader.onload = e => { imgPreview.src = e.target.result; imgPreview.classList.remove('hidden'); };
    reader.readAsDataURL(file);
  });

  // Submit new post
  document.getElementById('post-btn').addEventListener('click', async () => {
    const err   = document.getElementById('post-error');
    const title = document.getElementById('post-title').value.trim();
    const text  = document.getElementById('post-text').value.trim();
    err.classList.add('hidden');

    if (!title || !text) { err.textContent = 'Vyplňte nadpis a text příspěvku'; err.classList.remove('hidden'); return; }

    const fd = new FormData();
    fd.append('title', title);
    fd.append('text',  text);
    if (imgInput.files[0]) fd.append('image', imgInput.files[0]);

    const btn = document.getElementById('post-btn');
    btn.disabled = true; btn.textContent = 'Publikuji...';
    try {
      const r = await fetch('/api/posts', { method: 'POST', body: fd });
      const d = await r.json();
      if (d.error) { err.textContent = d.error; err.classList.remove('hidden'); return; }
      // Prepend new post
      document.getElementById('post-title').value = '';
      document.getElementById('post-text').value  = '';
      imgInput.value = ''; imgName.textContent = '';
      imgPreview.src = ''; imgPreview.classList.add('hidden');

      const feed   = document.getElementById('feed');
      const newArt = buildPost(d);
      feed.insertBefore(newArt, feed.firstChild);
      bindPostEvents();
    } catch { err.textContent = 'Chyba sítě'; err.classList.remove('hidden'); }
    finally { btn.disabled = false; btn.textContent = 'Publikovat'; }
  });

  await loadFeed();
});
