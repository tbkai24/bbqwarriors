// BBQWarriors Multi-Media Embed Link Studio & Generator (bbqwarrior.sql concept)
// Universal embeds for Josh Cullen & creators: YouTube Live Streams + Spotify Playlists & Tracks

const BBQ_PRESETS = {
  'josh-spotify-playlist': {
    id: 'josh-spotify-playlist',
    name: 'Josh Cullen - Spotify Playlist',
    mediaType: 'spotify_playlist',
    targetId: '37i9dQZF1DXcBWIGoYBM5M', // Spotify Playlist ID for Josh Cullen
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    bio: 'This Is Josh Cullen - Complete Spotify Playlist & Hits',
    badge: 'Spotify Playlist',
    height: '352px',
    themeColor: '#1db954'
  },
  'josh-spotify-track': {
    id: 'josh-spotify-track',
    name: 'Josh Cullen - Yoko Na (Single)',
    mediaType: 'spotify_track',
    targetId: '0e88kM3uV65lRj0S94a73z', // Spotify Track ID
    avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
    bio: 'Josh Cullen Single Track - Compact Spotify Player Widget',
    badge: 'Spotify Single',
    height: '152px',
    themeColor: '#ec4899'
  },
  'josh-yt-live': {
    id: 'josh-yt-live',
    name: 'Josh Cullen - YouTube Stream',
    mediaType: 'yt_stream',
    targetId: 'jfKfPfyJRdk', // YouTube Video ID
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    bio: 'Josh Cullen Live Gaming & Music Sessions on YouTube',
    badge: 'YouTube Live',
    height: '420px',
    themeColor: '#ff0000'
  },
  'bbq-warriors-playlist': {
    id: 'bbq-warriors-playlist',
    name: 'BBQWarriors Stream Playlist',
    mediaType: 'spotify_playlist',
    targetId: '37i9dQZF1DX0XUfTFmBDM0',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80',
    bio: 'BBQWarriors Official Stream Vibe & Gaming Tracks',
    badge: 'BBQ Playlist',
    height: '352px',
    themeColor: '#f97316'
  }
};

// State
let bbqConfig = {
  presetId: 'josh-spotify-playlist',
  mediaType: 'spotify_playlist',
  targetId: '37i9dQZF1DXcBWIGoYBM5M',
  slug: 'josh-cullen-bbq-spotify',
  themeColor: '#1db954',
  autoplay: false,
  compact: false
};

// URL Builder for YouTube & Spotify embeds
function buildEmbedUrl(mediaType, targetId, options = {}) {
  const { autoplay = false } = options;

  switch(mediaType) {
    case 'spotify_playlist':
      return `https://open.spotify.com/embed/playlist/${targetId}?utm_source=generator&theme=0`;
      
    case 'spotify_track':
      return `https://open.spotify.com/embed/track/${targetId}?utm_source=generator&theme=0`;
      
    case 'spotify_album':
      return `https://open.spotify.com/embed/album/${targetId}?utm_source=generator&theme=0`;
      
    case 'yt_stream':
      const autoPlayVal = autoplay ? '1' : '0';
      return `https://www.youtube-nocookie.com/embed/${targetId}?autoplay=${autoPlayVal}&rel=0`;

    case 'twitch_stream':
      const parentHost = window.location.hostname || 'localhost';
      return `https://player.twitch.tv/?channel=${targetId}&parent=${parentHost}`;
      
    default:
      return `https://open.spotify.com/embed/playlist/${targetId}`;
  }
}

// DOM Setup
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initPresetCards();
  initFormListeners();
  renderPreview();
  renderOutputs();
});

function initTabs() {
  const tabBtns = document.querySelectorAll('.nav-tab-btn');
  const sections = document.querySelectorAll('.tab-section');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.style.display = 'none');

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetSection = document.getElementById(targetId);
      if (targetSection) targetSection.style.display = 'block';
    });
  });
}

function initPresetCards() {
  const presetContainer = document.getElementById('preset-cards-list');
  if (!presetContainer) return;

  presetContainer.innerHTML = Object.values(BBQ_PRESETS).map(preset => `
    <div class="preset-card ${preset.id === bbqConfig.presetId ? 'active' : ''}" data-preset-id="${preset.id}">
      <img src="${preset.avatar}" alt="${preset.name}" class="preset-avatar">
      <div class="preset-details">
        <div class="preset-name">${preset.name}</div>
        <div class="preset-meta">${preset.badge}</div>
      </div>
    </div>
  `).join('');

  presetContainer.querySelectorAll('.preset-card').forEach(card => {
    card.addEventListener('click', () => {
      const presetId = card.getAttribute('data-preset-id');
      const preset = BBQ_PRESETS[presetId];
      if (preset) {
        presetContainer.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        bbqConfig.presetId = preset.id;
        bbqConfig.mediaType = preset.mediaType;
        bbqConfig.targetId = preset.targetId;
        bbqConfig.themeColor = preset.themeColor;

        // Update Form Inputs
        document.getElementById('media-type-select').value = preset.mediaType;
        document.getElementById('target-id-input').value = preset.targetId;
        document.getElementById('theme-color-input').value = preset.themeColor;

        updateHeroDetails(preset);
        renderPreview();
        renderOutputs();
      }
    });
  });
}

function updateHeroDetails(preset) {
  const nameEl = document.getElementById('hero-josh-name');
  const bioEl = document.getElementById('hero-josh-bio');
  if (nameEl) nameEl.textContent = preset.name;
  if (bioEl) bioEl.textContent = preset.bio;
}

function initFormListeners() {
  const mediaSelect = document.getElementById('media-type-select');
  const targetInput = document.getElementById('target-id-input');
  const slugInput = document.getElementById('slug-input');
  const autoplayToggle = document.getElementById('autoplay-toggle');
  const themeColorInput = document.getElementById('theme-color-input');

  if (mediaSelect) {
    mediaSelect.addEventListener('change', (e) => {
      bbqConfig.mediaType = e.target.value;
      renderPreview();
      renderOutputs();
    });
  }

  if (targetInput) {
    targetInput.addEventListener('input', (e) => {
      bbqConfig.targetId = e.target.value.trim();
      renderPreview();
      renderOutputs();
    });
  }

  if (slugInput) {
    slugInput.addEventListener('input', (e) => {
      bbqConfig.slug = e.target.value.trim();
      renderOutputs();
    });
  }

  if (autoplayToggle) {
    autoplayToggle.addEventListener('change', (e) => {
      bbqConfig.autoplay = e.target.checked;
      renderPreview();
      renderOutputs();
    });
  }

  if (themeColorInput) {
    themeColorInput.addEventListener('input', (e) => {
      bbqConfig.themeColor = e.target.value;
      renderOutputs();
    });
  }
}

function renderPreview() {
  const iframeEl = document.getElementById('embed-iframe');
  const previewBadge = document.getElementById('preview-platform-badge');
  if (!iframeEl) return;

  const embedUrl = buildEmbedUrl(bbqConfig.mediaType, bbqConfig.targetId, { autoplay: bbqConfig.autoplay });
  iframeEl.src = embedUrl;

  // Height adjustments based on Spotify vs YouTube
  if (bbqConfig.mediaType === 'spotify_track') {
    iframeEl.style.height = '152px';
  } else if (bbqConfig.mediaType === 'spotify_playlist' || bbqConfig.mediaType === 'spotify_album') {
    iframeEl.style.height = '352px';
  } else {
    iframeEl.style.height = '420px';
  }

  if (previewBadge) {
    previewBadge.textContent = bbqConfig.mediaType.toUpperCase().replace('_', ' ');
  }
}

function renderOutputs() {
  const iframeCodeEl = document.getElementById('iframe-code-output');
  const apiPayloadEl = document.getElementById('api-payload-output');

  const embedUrl = buildEmbedUrl(bbqConfig.mediaType, bbqConfig.targetId, { autoplay: bbqConfig.autoplay });
  const height = (bbqConfig.mediaType === 'spotify_track') ? '152' : (bbqConfig.mediaType === 'yt_stream' ? '450' : '352');

  const htmlSnippet = `<!-- BBQWarriors Embed Widget (bbqwarrior.sql isolated schema) -->
<div class="bbq-embed-widget" style="width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
  <iframe 
    src="${embedUrl}" 
    title="BBQWarriors Embed - ${bbqConfig.slug}" 
    width="100%" 
    height="${height}" 
    frameborder="0" 
    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
    loading="lazy">
  </iframe>
</div>`;

  if (iframeCodeEl) iframeCodeEl.textContent = htmlSnippet;

  // bbqwarrior.sql JSON Schema Record Format
  const dbPayload = {
    schema: "bbqwarrior.sql",
    table: "bbq_embed_links",
    record: {
      creator_id: "josh-cullen",
      media_type: bbqConfig.mediaType,
      target_resource_id: bbqConfig.targetId,
      embed_slug: bbqConfig.slug || "josh-cullen-bbq-embed",
      theme_color: bbqConfig.themeColor,
      autoplay: bbqConfig.autoplay,
      generated_embed_url: embedUrl
    }
  };

  if (apiPayloadEl) apiPayloadEl.textContent = JSON.stringify(dbPayload, null, 2);
}

function copyToClipboard(elementId, label = 'Code') {
  const codeEl = document.getElementById(elementId);
  if (!codeEl) return;

  navigator.clipboard.writeText(codeEl.textContent).then(() => {
    showToast(`✓ ${label} copied to clipboard!`);
  });
}

function showToast(message) {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}
