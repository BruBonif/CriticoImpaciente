/* ============================================================
   CRITICO IMPACIENTE — script.js
   ============================================================ */

const GAMES_URL = 'data/games.json';
const RING_CIRC = 339.292; // 2π × r=54

/* ============================================================
   UTILIDADES
   ============================================================ */

function scoreClass(score) {
  if (score >= 75) return 'score-green';
  if (score >= 50) return 'score-yellow';
  return 'score-red';
}

function scoreVerdict(score) {
  if (score >= 93) return 'Obra Maestra';
  if (score >= 85) return 'Excelente';
  if (score >= 75) return 'Recomendado';
  if (score >= 65) return 'Decente';
  if (score >= 50) return 'Irregular';
  return 'Evitar';
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function loadGames() {
  try {
    const res = await fetch(GAMES_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error al cargar games.json:', err);
    return null;
  }
}

/* ============================================================
   ORDENACIÓN — función reutilizable
   ============================================================ */

function sortComparator(a, b, sort) {
  switch (sort) {
    case 'score-asc':  return a.score - b.score;
    case 'year-desc':  return b.release_year - a.release_year;
    case 'year-asc':   return a.release_year - b.release_year;
    default:           return b.score - a.score; // score-desc
  }
}

/* ============================================================
   PÁGINA DE ÍNDICE
   ============================================================ */

function buildIndexPage(games) {
  const grid      = document.getElementById('games-grid');
  const noResults = document.getElementById('no-results');
  const countEl   = document.getElementById('results-count');
  const searchEl  = document.getElementById('search-input');
  const genreEl   = document.getElementById('genre-filter');
  const sortEl    = document.getElementById('sort-select');

  if (!grid) return;

  // Poblar selector de géneros
  const genres = [...new Set(games.map(g => g.genre))].sort();
  genres.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    genreEl.appendChild(opt);
  });

  // ── Filtrado + ordenación ──────────────────────────────────
  function filteredGames() {
    const q     = searchEl.value.trim().toLowerCase();
    const genre = genreEl.value;
    const sort  = sortEl.value;

    // 1. Filtrar por título y género
    let list = games.filter(game => {
      const matchTitle = !q || game.title.toLowerCase().includes(q);
      const matchGenre = !genre || game.genre === genre;
      return matchTitle && matchGenre;
    });

    // 2. Ordenar — si hay búsqueda, los que empiezan por el término van primero
    if (q) {
      list.sort((a, b) => {
        const aTitle    = a.title.toLowerCase();
        const bTitle    = b.title.toLowerCase();
        const aPrefix   = aTitle.startsWith(q) ? 0 : 1;
        const bPrefix   = bTitle.startsWith(q) ? 0 : 1;

        // Prefijo exacto → primero
        if (aPrefix !== bPrefix) return aPrefix - bPrefix;

        // Dentro del mismo grupo, aplicar ordenación seleccionada
        return sortComparator(a, b, sort);
      });
    } else {
      list.sort((a, b) => sortComparator(a, b, sort));
    }

    return list;
  }

  // ── Renderizado de tarjetas ───────────────────────────────
  function renderCards(list) {
    grid.innerHTML = '';

    if (list.length === 0) {
      noResults.hidden = false;
      countEl.textContent = '';
      return;
    }

    noResults.hidden = true;
    countEl.textContent =
      `${list.length} juego${list.length !== 1 ? 's' : ''}`;

    list.forEach((game, i) => {
      const cls  = scoreClass(game.score);
      const card = document.createElement('a');
      card.href  = `game.html?id=${game.id}`;
      card.className = `game-card ${cls}`;
      card.style.animationDelay = `${i * 0.045}s`;
      card.setAttribute('role', 'listitem');
      card.setAttribute('aria-label', `${game.title}, puntuación ${game.score}`);

      card.innerHTML = `
        <div class="card-cover-wrap">
          <img
            class="card-cover"
            src="${escapeAttr(game.cover_url)}"
            alt="Portada de ${escapeAttr(game.title)}"
            loading="lazy"
            onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22400%22%3E%3Crect width=%22300%22 height=%22400%22 fill=%22%23edeae4%22/%3E%3C/svg%3E';"
          >
          <div class="card-score-badge ${cls}" aria-hidden="true">${game.score}</div>
        </div>
        <div class="card-body">
          <h2 class="card-title">${escapeHTML(game.title)}</h2>
          <div class="card-meta">
            <span class="card-genre">${escapeHTML(game.genre)}</span>
            <span class="card-year">${game.release_year}</span>
          </div>
          <p class="card-description">${escapeHTML(game.description_short)}</p>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  // ── Actualización animada ─────────────────────────────────
  // Los filtros/búsqueda disparan una transición fluida:
  // el grid se desvanece, se actualiza el contenido y vuelve.
  let renderTimer  = null;
  let searchTimer  = null;

  function update() {
    clearTimeout(renderTimer);

    grid.style.opacity   = '0';
    grid.style.transform = 'translateY(8px)';

    renderTimer = setTimeout(() => {
      renderCards(filteredGames());
      // Doble rAF para que el navegador pinte el DOM antes de la transición
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          grid.style.opacity   = '1';
          grid.style.transform = 'translateY(0)';
        });
      });
    }, 160);
  }

  // Búsqueda: pequeño debounce para no disparar en cada tecla
  searchEl.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(update, 100);
  });

  genreEl.addEventListener('change', update);
  sortEl.addEventListener('change', update);

  // Render inicial sin animación de salida
  renderCards(filteredGames());
  countEl.textContent = `${games.length} juegos`;
}

/* ============================================================
   PÁGINA DE DETALLE
   ============================================================ */

function buildDetailPage(games) {
  const main = document.getElementById('game-detail');
  if (!main) return;

  const params = new URLSearchParams(window.location.search);
  const id     = parseInt(params.get('id'), 10);
  const game   = games.find(g => g.id === id);

  if (!game) {
    main.innerHTML = `
      <div class="error-state">
        <h2>404</h2>
        <p>Esta reseña no existe.</p>
        <a class="error-back-link" href="index.html">← Volver a todas las reseñas</a>
      </div>
    `;
    return;
  }

  document.title = `${game.title} — CriticoImpaciente`;

  const cls     = scoreClass(game.score);
  const verdict = scoreVerdict(game.score);
  const offset  = RING_CIRC * (1 - game.score / 100);

  // description_full es ahora un array de párrafos
  const paragraphs = Array.isArray(game.description_full)
    ? game.description_full.map(p => `<p>${escapeHTML(p)}</p>`).join('')
    : game.description_full.split(/\n\n+/).map(p => `<p>${escapeHTML(p.trim())}</p>`).join('');

  const platformTags = game.platforms
    .map(p => `<span class="platform-tag">${escapeHTML(p)}</span>`)
    .join('');

  // Extraer el ID de YouTube del trailer_url
  function getYouTubeId(url) {
    if (!url) return null;
    const m = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
    return m ? m[1] : null;
  }

  const trailerId = getYouTubeId(game.trailer_url);

  const coverOrVideo = trailerId
    ? `<div class="detail-cover detail-cover--video">
        <iframe
          src="https://www.youtube.com/embed/${trailerId}?autoplay=1&mute=1&rel=0&modestbranding=1"
          title="Tráiler de ${escapeAttr(game.title)}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
       </div>`
    : `<img
        class="detail-cover"
        src="${escapeAttr(game.cover_url)}"
        alt="Portada de ${escapeAttr(game.title)}"
        onerror="this.onerror=null;this.style.background='var(--surface-2)';this.removeAttribute('src');"
      >`;

  main.innerHTML = `
    ${trailerId ? `
    <div class="detail-cinema-band">
      ${coverOrVideo}
    </div>
    ` : ''}

    <div class="detail-hero ${trailerId ? 'detail-hero--has-video' : ''}">
      <div
        class="detail-hero-bg"
        style="background-image: url('${escapeAttr(game.cover_url)}')"
        aria-hidden="true"
      ></div>
      <div class="container">
        <div class="detail-hero-inner">

          ${!trailerId ? coverOrVideo : ''}

          <div class="detail-info">
            <h1 class="detail-title">${escapeHTML(game.title)}</h1>

            <div class="detail-score-row">
              <div class="score-ring-wrap" aria-label="Puntuación: ${game.score} de 100">
                <svg class="score-ring-svg" viewBox="0 0 130 130" aria-hidden="true">
                  <circle cx="65" cy="65" r="54" class="ring-track"/>
                  <circle cx="65" cy="65" r="54" class="ring-fill ${cls}" id="score-ring-fill"/>
                </svg>
                <div class="score-ring-center" aria-hidden="true">
                  <span class="score-ring-number ${cls}">${game.score}</span>
                  <span class="score-ring-label">Punt.</span>
                </div>
              </div>
              <span class="score-verdict">${escapeHTML(verdict)}</span>
            </div>

            <div class="detail-meta-grid">
              <div class="meta-item">
                <span class="meta-label">Género</span>
                <span class="meta-value">${escapeHTML(game.genre)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Desarrollador</span>
                <span class="meta-value">${escapeHTML(game.developer)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Lanzamiento</span>
                <span class="meta-value">${game.release_year}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Plataformas</span>
                <div class="meta-platforms">${platformTags}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <div class="review-section">
      <div class="container">
        <div class="review-inner">
          <div class="review-header">
            <span class="review-heading">Reseña</span>
            ${game.video_url ? `
            <a
              class="video-link"
              href="${escapeAttr(game.video_url)}"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ver análisis completo de ${escapeAttr(game.title)} en YouTube"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              Ver análisis en YouTube
            </a>` : ''}
          </div>

          <div class="review-preview" id="review-preview">
            <div class="review-text-body">
              <p>${escapeHTML(game.description_short)}</p>
            </div>
          </div>

          <div class="review-full" id="review-full">
            <div class="review-text-body">${paragraphs}</div>
          </div>

          <button
            class="read-more-btn"
            id="read-more-btn"
            aria-expanded="false"
            aria-controls="review-full"
          >
            <span id="read-more-label">Leer reseña completa</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  // Animar el anillo de puntuación al cargar
  requestAnimationFrame(() => {
    setTimeout(() => {
      const ring = document.getElementById('score-ring-fill');
      if (ring) ring.style.strokeDashoffset = offset;
    }, 80);
  });

  // Toggle "Leer más / Ver menos"
  const btn     = document.getElementById('read-more-btn');
  const preview = document.getElementById('review-preview');
  const full    = document.getElementById('review-full');
  const label   = document.getElementById('read-more-label');

  let expanded = false;

  btn.addEventListener('click', () => {
    expanded = !expanded;
    if (expanded) {
      preview.style.display = 'none';
      full.style.display    = 'block';
      label.textContent     = 'Ver menos';
      btn.setAttribute('aria-expanded', 'true');
      btn.classList.add('is-expanded');
    } else {
      full.style.display    = 'none';
      preview.style.display = 'block';
      label.textContent     = 'Leer reseña completa';
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('is-expanded');
      document.querySelector('.review-heading')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

/* ============================================================
   ARRANQUE
   ============================================================ */

async function main() {
  const games = await loadGames();

  const isDetail = !!document.getElementById('game-detail');

  if (!games) {
    const target = isDetail
      ? document.getElementById('game-detail')
      : document.getElementById('games-grid');

    if (target) {
      target.innerHTML = `
        <p style="
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--text-muted);
          text-align: center;
          padding: 60px 0;
          letter-spacing: .06em;
        ">
          Error al cargar los datos. Abre el sitio a través de un servidor local o GitHub Pages.
        </p>
      `;
    }
    return;
  }

  if (isDetail) {
    buildDetailPage(games);
  } else {
    buildIndexPage(games);
  }
}

main();
