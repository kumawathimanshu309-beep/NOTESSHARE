/* ============================================================
   StudyShare — Client-Side Interactions
   Premium AJAX + Navbar + Modal + Toast system
============================================================ */
'use strict';

/* ── CSRF Token helper ──────────────────────────────────── */
function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) return meta.content;
  // Fallback: read from hidden input on page
  const inp = document.querySelector('input[name="_csrf"]');
  return inp ? inp.value : '';
}

/* ── Toast notification ─────────────────────────────────── */
let _toastTimer = null;
function showToast(msg, isError = false) {
  let toast = document.getElementById('ajaxToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ajaxToast';
    toast.className = 'ajax-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ── Generic AJAX POST (form-body, returns JSON) ─────────── */
async function ajaxPost(url, data = {}) {
  const body = new URLSearchParams(data);
  body.set('_csrf', getCsrfToken());
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'same-origin',
    body,
  });
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  // If server returns redirect/HTML (older endpoint), simulate success
  return { ok: res.ok, status: res.status };
}

/* ── Like Button AJAX ────────────────────────────────────── */
function initLikeButtons() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="like"]');
    if (!btn) return;
    e.preventDefault();
    if (btn.dataset.loading) return;
    const noteId = btn.dataset.noteId;
    if (!noteId) return;

    btn.dataset.loading = 'true';
    const wasLiked = btn.classList.contains('liked') || btn.dataset.liked === 'true';
    const url = `/notes/${noteId}/like`;

    try {
      const data = await ajaxPost(url);
      if (data && (data.ok !== false)) {
        const nowLiked = !wasLiked;
        btn.dataset.liked = nowLiked;
        btn.classList.toggle('liked', nowLiked);
        btn.classList.toggle('active-like', nowLiked);

        // Update count display
        const countEl = btn.querySelector('[data-count]');
        if (countEl) {
          const currentCount = parseInt(countEl.textContent || '0', 10) || 0;
          countEl.textContent = nowLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
        }
        // Update icon
        const iconEl = btn.querySelector('.like-icon');
        if (iconEl) iconEl.textContent = nowLiked ? '❤️' : '🤍';
      }
    } catch (_err) {
      showToast('Could not update like. Please try again.', true);
    } finally {
      delete btn.dataset.loading;
    }
  });
}

/* ── Bookmark Button AJAX ────────────────────────────────── */
function initBookmarkButtons() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="bookmark"]');
    if (!btn) return;
    e.preventDefault();
    if (btn.dataset.loading) return;
    const noteId = btn.dataset.noteId;
    if (!noteId) return;

    btn.dataset.loading = 'true';
    const wasBookmarked = btn.classList.contains('bookmarked') || btn.dataset.bookmarked === 'true';
    const url = `/notes/${noteId}/bookmark`;

    try {
      const data = await ajaxPost(url);
      if (data && (data.ok !== false)) {
        const nowBookmarked = !wasBookmarked;
        btn.dataset.bookmarked = nowBookmarked;
        btn.classList.toggle('bookmarked', nowBookmarked);
        btn.classList.toggle('active-bookmark', nowBookmarked);

        const countEl = btn.querySelector('[data-count]');
        if (countEl) {
          const c = parseInt(countEl.textContent || '0', 10) || 0;
          countEl.textContent = nowBookmarked ? c + 1 : Math.max(0, c - 1);
        }
        const iconEl = btn.querySelector('.bookmark-icon');
        if (iconEl) iconEl.textContent = nowBookmarked ? '🔖' : '📑';
      }
    } catch (_err) {
      showToast('Could not update bookmark. Please try again.', true);
    } finally {
      delete btn.dataset.loading;
    }
  });
}

/* ── AJAX Comment Submission ─────────────────────────────── */
function initCommentForms() {
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-ajax-comment]');
    if (!form) return;
    e.preventDefault();

    const textarea = form.querySelector('textarea[name="content"]');
    const content = textarea ? textarea.value.trim() : '';
    if (!content) return;

    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    const noteId = form.dataset.noteId;
    const url = `/notes/${noteId}/comments`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
        body: new URLSearchParams({ content, _csrf: getCsrfToken() }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        // Clear input
        if (textarea) textarea.value = '';

        // Append comment to list or reload section
        const list = document.getElementById('commentList');
        const emptyMsg = document.getElementById('commentEmpty');

        if (list && data && data.comment) {
          const c = data.comment;
          const html = buildCommentHtml(c);
          if (emptyMsg) emptyMsg.remove();
          list.insertAdjacentHTML('afterbegin', html);
        } else {
          // Fallback: reload to show new comment
          window.location.reload();
          return;
        }

        // Update count
        const countEl = document.getElementById('commentCount');
        if (countEl) {
          const n = parseInt(countEl.textContent || '0', 10) + 1;
          countEl.textContent = n;
        }
        showToast('Comment posted!');
      } else {
        const errData = await res.json().catch(() => null);
        showToast((errData && errData.message) || 'Failed to post comment. Please try again.', true);
      }
    } catch (_err) {
      showToast('Network error. Please try again.', true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

function buildCommentHtml(c) {
  const name = c.user ? c.user.name : 'Anonymous';
  const username = c.user ? c.user.username : 'user';
  const initial = name.charAt(0).toUpperCase();
  const avatar = c.user && c.user.avatar && (c.user.avatar.startsWith('/') || c.user.avatar.startsWith('http'))
    ? `<img src="${escHtml(c.user.avatar)}" alt="${escHtml(name)}" class="comment-avatar-img">`
    : `<span class="comment-avatar-initial">${escHtml(initial)}</span>`;
  const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Just now';
  return `
    <div class="comment-item" id="comment-${c._id}">
      <div class="comment-header">
        <div class="comment-author-row">
          <div class="comment-avatar">${avatar}</div>
          <div class="comment-author-meta">
            <a href="/profile/${escHtml(username)}" class="comment-user-name">${escHtml(name)}</a>
            <span class="comment-user-handle">@${escHtml(username)}</span>
          </div>
        </div>
        <span class="comment-timestamp">${dateStr}</span>
      </div>
      <p class="comment-text">${escHtml(c.content)}</p>
      <div class="comment-footer-actions">
        <button type="button"
                class="comment-delete-btn"
                data-action="delete-comment"
                data-comment-id="${c._id}"
                aria-label="Delete comment">
          🗑️ Delete
        </button>
      </div>
    </div>`;
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── AJAX Comment Delete ─────────────────────────────────── */
function initCommentDelete() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="delete-comment"]');
    if (!btn) return;
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this comment?')) return;

    const commentId = btn.dataset.commentId;
    if (!commentId) return;

    try {
      const res = await fetch(`/comments/${commentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
        body: new URLSearchParams({ _method: 'DELETE', _csrf: getCsrfToken() }),
      });

      if (res.ok) {
        const item = document.getElementById(`comment-${commentId}`);
        if (item) item.remove();
        const countEl = document.getElementById('commentCount');
        let remaining = 0;
        if (countEl) {
          remaining = Math.max(0, parseInt(countEl.textContent || '0', 10) - 1);
          countEl.textContent = remaining;
        }
        const list = document.getElementById('commentList');
        if (list && remaining === 0 && !document.getElementById('commentEmpty')) {
          list.innerHTML = '<p id="commentEmpty" class="comment-empty-msg">No comments yet. Be the first to start the discussion!</p>';
        }
        showToast('Comment deleted.');
      } else {
        showToast('Failed to delete comment.', true);
      }
    } catch {
      showToast('Network error.', true);
    }
  });
}

/* ── Document Full-Screen Modal ──────────────────────────── */
function initDocModal() {
  const overlay = document.getElementById('docModalOverlay');
  if (!overlay) return;

  const frame = document.getElementById('docModalFrame');
  const closeBtn = document.getElementById('docModalClose');

  // Open modal on View Full Document click
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="view-full-doc"]');
    if (!btn) return;
    e.preventDefault();
    const src = btn.dataset.src;
    if (frame && src) frame.src = src;
    overlay.classList.add('open');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (closeBtn) closeBtn.focus();
  });

  // Close
  function closeModal() {
    overlay.classList.remove('open');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    if (frame) frame.src = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closeModal();
    }
  });
}

/* ── Rating AJAX & Interactive Stars ─────────────────────── */
function initRatingForms() {
  // Interactive star hover & click behaviors
  const ratingForms = document.querySelectorAll('[data-ajax-rating]');
  ratingForms.forEach((form) => {
    const glyphs = form.querySelectorAll('.star-glyph');
    const radios = form.querySelectorAll('input[name="rating"]');

    function updateGlyphStates(activeValue) {
      glyphs.forEach((g) => {
        const val = parseInt(g.dataset.starVal, 10);
        if (val <= activeValue) {
          g.classList.add('selected');
        } else {
          g.classList.remove('selected');
        }
      });
    }

    radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        const val = parseInt(radio.value, 10);
        updateGlyphStates(val);
      });
    });

    glyphs.forEach((glyph) => {
      const parentLabel = glyph.closest('.star-rating-item');
      if (!parentLabel) return;

      parentLabel.addEventListener('mouseenter', () => {
        const val = parseInt(glyph.dataset.starVal, 10);
        glyphs.forEach((g) => {
          const gVal = parseInt(g.dataset.starVal, 10);
          g.classList.toggle('active', gVal <= val);
        });
      });

      parentLabel.addEventListener('mouseleave', () => {
        glyphs.forEach((g) => g.classList.remove('active'));
        const checked = form.querySelector('input[name="rating"]:checked');
        const checkedVal = checked ? parseInt(checked.value, 10) : 0;
        updateGlyphStates(checkedVal);
      });
    });
  });

  // Submission handler
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-ajax-rating]');
    if (!form) return;
    e.preventDefault();

    const ratingInput = form.querySelector('input[name="rating"]:checked');
    const review = form.querySelector('input[name="review"]');
    if (!ratingInput) {
      showToast('Please select a star rating first.', true);
      return;
    }

    const noteId = form.dataset.noteId;
    const url = `/notes/${noteId}/rate`;
    const btn = form.querySelector('[type="submit"]');
    if (btn) btn.disabled = true;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
        body: new URLSearchParams({
          rating: ratingInput.value,
          review: review ? review.value : '',
          _csrf: getCsrfToken(),
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.avgRating) {
          // Update rating score in rating card
          const ratingAvgEl = document.getElementById('ratingSummaryAvg');
          if (ratingAvgEl) ratingAvgEl.textContent = `★ ${data.avgRating}`;

          const ratingCountEl = document.getElementById('ratingSummaryCount');
          if (ratingCountEl) {
            ratingCountEl.textContent = `Based on ${data.totalRatings} rating${data.totalRatings !== 1 ? 's' : ''}`;
          }

          // Update header badge
          const headerBadge = document.getElementById('headerRatingBadge');
          if (headerBadge) {
            headerBadge.textContent = `★ ${data.avgRating} (${data.totalRatings})`;
          } else {
            const badgesList = document.querySelector('.header-badges-list');
            if (badgesList) {
              const chip = document.createElement('span');
              chip.className = 'badge-chip gold';
              chip.id = 'headerRatingBadge';
              chip.textContent = `★ ${data.avgRating} (${data.totalRatings})`;
              badgesList.appendChild(chip);
            }
          }
        }
        showToast('✓ Rating submitted! Thank you.');
      } else {
        const errData = await res.json().catch(() => null);
        showToast((errData && errData.message) || 'Failed to submit rating. Please try again.', true);
      }
    } catch {
      showToast('Network error.', true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

/* ── Notification Mark-Read AJAX ─────────────────────────── */
function initNotificationActions() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="mark-read"]');
    if (!btn) return;
    e.preventDefault();
    const notifId = btn.dataset.notifId;
    if (!notifId) return;
    try {
      await ajaxPost(`/notifications/${notifId}/read`);
      const item = btn.closest('.notif-item');
      if (item) item.classList.remove('unread');
      // Update badge
      const badge = document.querySelector('.nav-badge');
      if (badge) {
        const n = Math.max(0, parseInt(badge.textContent || '0', 10) - 1);
        if (n === 0) badge.remove();
        else badge.textContent = n;
      }
    } catch { /* silent */ }
  });
}

/* ── Flash Message Dismissal ─────────────────────────────── */
function initFlashDismiss() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.flash-dismiss');
    if (!btn) return;
    const alert = btn.closest('.flash-alert');
    if (alert) {
      alert.style.transition = 'opacity 0.2s ease';
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 220);
    }
  });
}

/* ── Mobile Navbar Toggle ────────────────────────────────── */
function initMobileNav() {
  const mobileMenuBtn = document.querySelector('.mobile-menu');
  const navMenuWrapper = document.querySelector('.nav-menu-wrapper');
  if (!mobileMenuBtn || !navMenuWrapper) return;

  mobileMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isActive = navMenuWrapper.classList.toggle('active');
    mobileMenuBtn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    mobileMenuBtn.textContent = isActive ? '✕' : '☰';
  });

  // Close when clicking any nav link
  navMenuWrapper.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navMenuWrapper.classList.remove('active');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
      mobileMenuBtn.textContent = '☰';
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!navMenuWrapper.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
      navMenuWrapper.classList.remove('active');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
      mobileMenuBtn.textContent = '☰';
    }
  });
}

/* ── Management Dropdown (note actions ⋮) ────────────────── */
function initManagementDropdown() {
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('.menu-dropdown-toggle');
    if (toggle) {
      e.stopPropagation();
      const content = toggle.nextElementSibling;
      if (content) {
        const isOpen = content.style.display === 'block';
        // Close all
        document.querySelectorAll('.menu-dropdown-content').forEach(d => d.style.display = 'none');
        if (!isOpen) content.style.display = 'block';
      }
      return;
    }
    // Close all on outside click
    document.querySelectorAll('.menu-dropdown-content').forEach(d => d.style.display = 'none');
  });
}

/* ── Share Note Modal ─────────────────────────────────────── */
function initShareModal() {
  const shareBtn = document.getElementById('shareBtn');
  const shareOverlay = document.getElementById('shareModalOverlay');
  const closeBtn = document.getElementById('shareModalClose');
  const copyBtn = document.getElementById('copyShareUrlBtn');
  const urlField = document.getElementById('shareUrlField');
  const nativeWrap = document.getElementById('nativeShareWrap');
  const nativeBtn = document.getElementById('nativeShareBtn');

  if (!shareBtn || !shareOverlay) return;

  function openShare() {
    shareOverlay.classList.add('open');
    shareOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (closeBtn) closeBtn.focus();
  }

  function closeShare() {
    shareOverlay.classList.remove('open');
    shareOverlay.style.display = 'none';
    document.body.style.overflow = '';
    shareBtn.focus();
  }

  shareBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openShare();
  });

  if (closeBtn) closeBtn.addEventListener('click', closeShare);
  shareOverlay.addEventListener('click', (e) => {
    if (e.target === shareOverlay) closeShare();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && shareOverlay.classList.contains('open')) {
      closeShare();
    }
  });

  // Web Share API detection
  if (navigator.share && nativeWrap && nativeBtn) {
    nativeWrap.style.display = 'block';
    nativeBtn.addEventListener('click', async () => {
      const shareUrl = urlField ? urlField.value : window.location.href;
      try {
        await navigator.share({
          title: document.title,
          url: shareUrl,
        });
        closeShare();
      } catch {
        /* User cancelled or not supported */
      }
    });
  }

  // Copy URL action
  if (copyBtn && urlField) {
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const url = urlField.value || window.location.href;
      let ok = false;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(url);
          ok = true;
        } catch {}
      }
      if (!ok) {
        try {
          urlField.select();
          ok = document.execCommand('copy');
        } catch {}
      }

      if (ok) {
        const textSpan = document.getElementById('copyBtnText');
        const origText = textSpan ? textSpan.textContent : 'Copy Link';
        if (textSpan) textSpan.textContent = '✓ Copied!';
        showToast('✓ Link copied to clipboard!');
        setTimeout(() => {
          if (textSpan) textSpan.textContent = origText;
        }, 2000);
      } else {
        showToast('Unable to copy automatically. Please select URL manually.', true);
      }
    });
  }
}

/* ── Avatar Upload Preview ─────────────────────────────── */
function initAvatarUpload() {
  const fileInput = document.getElementById('avatarFileInput');
  const preview = document.getElementById('avatarPreviewImg');
  if (!fileInput) return;

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      showToast('Only JPG, PNG, and WEBP images are allowed.', true);
      fileInput.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Avatar must be smaller than 5 MB.', true);
      fileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (preview) {
        preview.src = e.target.result;
        preview.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  });
}

/* ── Animated Stats Counter ──────────────────────────────── */
function initStatsCounter() {
  const statElements = document.querySelectorAll('.stat-number[data-target]');
  if (!statElements.length) return;

  function formatCompact(n) {
    if (n == null || isNaN(n)) return '0';
    const num = Number(n);
    if (num < 1000) return `${num}`;
    if (num < 1000000) {
      const thousands = num / 1000;
      const formatted = thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1).replace(/\.0$/, '');
      return `${formatted}K+`;
    }
    const millions = num / 1000000;
    const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1).replace(/\.0$/, '');
    return `${formatted}M+`;
  }

  // Respect prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    statElements.forEach((el) => {
      const target = parseInt(el.getAttribute('data-target'), 10) || 0;
      el.textContent = formatCompact(target);
    });
    return;
  }

  function animateCount(el) {
    const target = parseInt(el.getAttribute('data-target'), 10) || 0;
    if (target === 0) {
      el.textContent = '0';
      return;
    }

    const duration = Math.min(1400, Math.max(600, Math.min(target * 10, 1200)));
    let startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * ease);

      if (progress < 1) {
        el.textContent = `${current}`;
        requestAnimationFrame(step);
      } else {
        el.textContent = formatCompact(target);
      }
    }

    requestAnimationFrame(step);
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            statElements.forEach((el) => animateCount(el));
            obs.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    const statsContainer = document.querySelector('.stats-container') || statElements[0];
    observer.observe(statsContainer);
  } else {
    // Fallback if IntersectionObserver not supported
    statElements.forEach((el) => animateCount(el));
  }
}

/* ── Navbar Profile Dropdown ─────────────────────────────── */
function initNavProfileDropdown() {
  const container = document.getElementById('navUserAccount');
  const trigger = document.getElementById('navProfileChipBtn');
  if (!container || !trigger) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = container.classList.toggle('open');
    trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      container.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && container.classList.contains('open')) {
      container.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    }
  });
}

/* ── DOMContentLoaded bootstrap ──────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initNavProfileDropdown();
  initFlashDismiss();
  initLikeButtons();
  initBookmarkButtons();
  initCommentForms();
  initCommentDelete();
  initDocModal();
  initRatingForms();
  initNotificationActions();
  initManagementDropdown();
  initShareModal();
  initAvatarUpload();
  initStatsCounter();
});
