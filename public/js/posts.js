// Shared post building & interaction logic

function buildPost(post) {
  const tpl  = document.getElementById('post-tpl');
  const node = tpl.content.cloneNode(true);
  const art  = node.querySelector('article');
  art.dataset.id = post.id;

  const link = art.querySelector('.post-author-link');
  link.href  = `/users/${post.author.id}`;

  const img = art.querySelector('.post-avatar');
  img.src   = avatarSrc(post.author.avatar);
  img.alt   = post.author.firstName;

  art.querySelector('.post-author-name').textContent = `${post.author.firstName} ${post.author.lastName}`;
  art.querySelector('.post-date').textContent        = formatDate(post.createdAt);
  art.querySelector('.post-title').textContent       = post.title;
  art.querySelector('.post-text').textContent        = post.text;

  if (post.isOwner) {
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete-post';
    delBtn.title = 'Smazat příspěvek';
    delBtn.textContent = '🗑';
    art.querySelector('.post-header').appendChild(delBtn);
  }

  if (post.image) {
    const pi = art.querySelector('.post-image');
    pi.src = post.image; pi.classList.remove('hidden');
  }

  updateLikeButton(art, post);
  art.querySelector('.comments-count').textContent = post.comments.length;
  renderComments(art, post.comments);

  return art;
}

function updateLikeButton(art, post) {
  const btn  = art.querySelector('.btn-like');
  const icon = btn.querySelector('.like-icon');
  const cnt  = btn.querySelector('.like-count');
  icon.textContent = post.liked ? '❤️' : '🤍';
  cnt.textContent  = post.likesCount;

  const likesList = art.querySelector('.likes-list');
  if (post.likes && post.likes.length) {
    likesList.innerHTML = post.likes.map(l =>
      `<span class="like-badge"><a href="/users/${l.user.id}">${l.user.firstName} ${l.user.lastName}</a> <small>${formatDate(l.date)}</small></span>`
    ).join('');
  } else {
    likesList.innerHTML = '<span class="text-muted">Zatím žádné lajky</span>';
  }
}

function renderComments(art, comments) {
  const list = art.querySelector('.comments-list');
  list.innerHTML = '';
  comments.forEach(c => {
    const div = document.createElement('div');
    div.className = 'comment';
    div.dataset.commentId = c.id;
    div.innerHTML = `
      <img class="avatar avatar-sm" src="${avatarSrc(c.author.avatar)}" alt="">
      <div class="comment-body">
        <a href="/users/${c.author.id}" class="comment-author">${c.author.firstName} ${c.author.lastName}</a>
        <span class="comment-date">${formatDate(c.createdAt)}</span>
        ${c.isOwner ? `<button class="btn-delete-comment" title="Smazat komentář">🗑</button>` : ''}
        <p>${escapeHtml(c.text)}</p>
      </div>`;
    list.appendChild(div);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function bindPostEvents() {
  document.querySelectorAll('.post-card').forEach(art => {
    const postId = art.dataset.id;

    // Delete post
    const delPostBtn = art.querySelector('.btn-delete-post');
    if (delPostBtn) {
      delPostBtn.addEventListener('click', async () => {
        if (!confirm('Opravdu smazat příspěvek?')) return;
        try {
          const r = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
          const d = await r.json();
          if (d.ok) art.remove();
          else alert(d.error || 'Chyba při mazání');
        } catch (e) { console.error(e); }
      });
    }

    // Delete comments (delegated)
    art.querySelector('.comments-list').addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-delete-comment');
      if (!btn) return;
      if (!confirm('Opravdu smazat komentář?')) return;
      const commentDiv = btn.closest('.comment');
      const commentId = commentDiv.dataset.commentId;
      try {
        const r = await fetch(`/api/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
        const d = await r.json();
        if (d.ok) {
          commentDiv.remove();
          const cnt = art.querySelector('.comments-count');
          cnt.textContent = Math.max(0, parseInt(cnt.textContent) - 1);
        } else alert(d.error || 'Chyba při mazání');
      } catch (e) { console.error(e); }
    });


    const likeBtn = art.querySelector('.btn-like');
    likeBtn.addEventListener('click', async () => {
      const likesList = art.querySelector('.likes-list');
      // Toggle likes list if count clicked again — actually toggle like
      try {
        const r = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
        const d = await r.json();
        // Refresh post data
        const pr = await fetch(`/api/posts`);
        const posts = await pr.json();
        const updated = posts.find(p => p.id == postId);
        if (updated) updateLikeButton(art, updated);
      } catch (e) { console.error(e); }
    });

    // Show/hide likes list on count click
    const likeCount = art.querySelector('.like-count');
    likeCount.style.cursor = 'pointer';
    likeCount.addEventListener('click', (e) => {
      e.stopPropagation();
      const ll = art.querySelector('.likes-list');
      ll.classList.toggle('hidden');
    });

    // Comments toggle
    art.querySelector('.btn-comments-toggle').addEventListener('click', () => {
      art.querySelector('.comments-section').classList.toggle('hidden');
    });

    // Submit comment
    const input  = art.querySelector('.comment-input');
    const submit = art.querySelector('.comment-submit');
    submit.addEventListener('click', () => submitComment(art, postId, input));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submitComment(art, postId, input); });
  });
}

async function submitComment(art, postId, input) {
  const text = input.value.trim();
  if (!text) return;
  try {
    const r = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const c = await r.json();
    if (c.error) return;
    input.value = '';
    const list = art.querySelector('.comments-list');
    const div  = document.createElement('div');
    div.className = 'comment';
    div.innerHTML = `
      <img class="avatar avatar-sm" src="${avatarSrc(c.author.avatar)}" alt="">
      <div class="comment-body">
        <a href="/users/${c.author.id}" class="comment-author">${c.author.firstName} ${c.author.lastName}</a>
        <span class="comment-date">${formatDate(c.createdAt)}</span>
        <p>${escapeHtml(c.text)}</p>
      </div>`;
    list.insertBefore(div, list.firstChild);
    const cnt = art.querySelector('.comments-count');
    cnt.textContent = parseInt(cnt.textContent) + 1;
  } catch (e) { console.error(e); }
}
