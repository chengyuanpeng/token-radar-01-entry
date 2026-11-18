(() => {
  'use strict';
  const radar = window.RADAR || {meta:{},rows:[]};
  const meta = radar.meta || {};
  const rows = Array.isArray(radar.rows) ? radar.rows : [];
  const $ = (id) => document.getElementById(id);
  const els = {
    scanned:$('stat-scanned'), candidates:$('stat-candidates'), watchlist:$('stat-watchlist'), live:$('stat-live'), date:$('snapshot-date'), boardAsOf:$('board-asof'),
    multiples:$('multiples-body'), categoryCount:$('category-count'), search:$('search'), category:$('category-filter'), chain:$('chain-filter'), tvl:$('tvl-filter'), watchOnly:$('watchlist-filter'),
    count:$('result-count'), tbody:$('board-body'), empty:$('empty-state'), board:$('board-view'), detail:$('detail-view'), detailContent:$('detail-content')
  };
  let sortKey = 'rank';
  let sortDirection = 1;
  let selectedSlug = null;
  const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');
  const fmtUsd = (n) => {
    const v = Number(n || 0);
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(v >= 1e10 ? 1 : 2).replace(/\.0+$|(?<=\.[0-9])0$/,'') + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(v >= 1e8 ? 0 : 1).replace(/\.0$/,'') + 'M';
    if (v >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
    return '$' + fmtNum(v);
  };
  const fmtPct = (n) => n === null || n === undefined || !Number.isFinite(Number(n)) ? '—' : `${Number(n) > 0 ? '+' : ''}${Number(n).toFixed(1)}%`;
  const fmtAge = (days) => {
    if (days === null || days === undefined || !Number.isFinite(Number(days))) return 'Unknown';
    const n = Number(days);
    if (n >= 365) return `${(n / 365).toFixed(1)} y`;
    return `${Math.max(0, Math.round(n))} d`;
  };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const categoryName = (r) => r.category || 'Uncategorized';
  const normalizedCategory = (r) => r.category || '';
  const setHash = (hash) => history.replaceState(null, '', hash || location.pathname + location.search);
  const categories = [...new Set(rows.map(normalizedCategory).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const chains = [...new Set(rows.flatMap(r => Array.isArray(r.chains) ? r.chains : []))].sort((a,b)=>a.localeCompare(b));

  function initHeader() {
    els.date.textContent = meta.as_of || '—';
    els.boardAsOf.textContent = meta.as_of || '—';
    els.scanned.textContent = fmtNum(meta.protocol_count);
    els.candidates.textContent = fmtNum(meta.candidate_count ?? rows.length);
    els.watchlist.textContent = `${fmtNum(meta.watchlist_count)}/40`;
    els.live.textContent = fmtNum(meta.live_count);
    $('shrinkage-note').textContent = `(k = ${meta.model?.shrinkage_k ?? 6})`;
    els.category.innerHTML = '<option value="">All categories</option>' + categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    els.chain.innerHTML = '<option value="">All chains</option>' + chains.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    const categoryRows = Array.isArray(meta.categories) ? meta.categories : [];
    els.categoryCount.textContent = `${categoryRows.length} CATEGORIES`;
    els.multiples.innerHTML = categoryRows.length ? categoryRows.map(c=>`<tr><td>${esc(c.category)}</td><td class="num">${fmtNum(c.live_peers)}</td><td>${Number(c.used_multiple || 0).toFixed(3)}×</td></tr>`).join('') : '<tr><td colspan="3">No live category peers in this snapshot.</td></tr>';
  }

  function filteredRows() {
    const query = els.search.value.trim().toLocaleLowerCase();
    const category = els.category.value;
    const chain = els.chain.value;
    const minTvl = Number(els.tvl.value || 0);
    return rows.filter(r => {
      if (query && !(`${r.name} ${r.slug}`).toLocaleLowerCase().includes(query)) return false;
      if (category && normalizedCategory(r) !== category) return false;
      if (chain && !(r.chains || []).includes(chain)) return false;
      if (els.watchOnly.checked && !r.watchlist) return false;
      return Number(r.tvl_usd) >= minTvl;
    }).sort((a,b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av === null || av === undefined) return bv === null || bv === undefined ? a.rank-b.rank : 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'string') return av.localeCompare(bv) * sortDirection;
      return (Number(av)-Number(bv))*sortDirection || a.rank-b.rank;
    });
  }

  function renderBoard() {
    const visible = filteredRows();
    els.count.textContent = fmtNum(visible.length);
    els.tbody.innerHTML = visible.map(r => {
      const chainNames = (r.chains || []).slice(0,2).join(', ');
      const changeClass = r.change_7d === null ? 'change-neutral' : Number(r.change_7d) > 0 ? 'change-pos' : Number(r.change_7d) < 0 ? 'change-neg' : 'change-neutral';
      const cat = r.category ? `<span class="category-pill">${esc(r.category)}</span>` : '<span class="change-neutral">—</span>';
      return `<tr tabindex="0" role="link" data-slug="${esc(r.slug)}" aria-label="Open ${esc(r.name)} details">
        <td class="rank-cell">${String(r.rank).padStart(3,'0')}</td>
        <td class="protocol-cell"><span class="protocol-name">${esc(r.name)}</span>${r.watchlist?'<span class="wl-tag">WL</span>':''}<span class="protocol-slug">${esc(r.slug)}</span></td>
        <td>${cat}</td><td class="chain-cell"><span class="chain-count">${fmtNum((r.chains||[]).length)}</span><span class="chain-names">${esc(chainNames || '—')}</span></td>
        <td class="num tvl-value">${fmtUsd(r.tvl_usd)}</td><td class="num ${changeClass}">${fmtPct(r.change_7d)}</td><td class="num age-value">${fmtAge(r.age_days)}</td><td class="value-col implied-value">${fmtUsd(r.implied_value_usd)}</td>
      </tr>`;
    }).join('');
    els.empty.hidden = visible.length > 0;
    els.tbody.hidden = visible.length === 0;
    document.querySelectorAll('.sort-button').forEach(btn => {
      const active = btn.dataset.sort === sortKey;
      btn.classList.toggle('active', active);
      btn.querySelector('span').textContent = active ? (sortDirection > 0 ? '↑' : '↓') : '↕';
    });
  }

  function getCategoryCalibration(row) {
    const item = (meta.categories || []).find(c=>c.category === row.category);
    return { peers:item ? item.live_peers : 0, overall:meta.categories?.length ? null : null };
  }
  function reasonGrowth(row) {
    if (row.change_7d === null || row.change_7d === undefined) return 'No 7-day change reported; neutral factor applied.';
    return `${fmtPct(row.change_7d)} TVL in 7 days, damped.`;
  }
  function renderDetail(row) {
    if (!row) return closeDetail(false);
    selectedSlug = row.slug;
    els.board.hidden = true;
    els.detail.hidden = false;
    const calibration = getCategoryCalibration(row);
    const peerSuffix = row.category ? `${calibration.peers} live peer${calibration.peers === 1 ? '' : 's'} in ${esc(row.category)}` : 'Overall snapshot median; no category assigned';
    const ageReason = row.age_days == null ? 'Age unavailable; snapshot median used.' : `Live for ${fmtAge(row.age_days)}; longer token-free history raises maturity.`;
    const chainText = row.chains?.length ? row.chains.map(esc).join(', ') : 'No chain data';
    const listed = row.listed_at || 'Unknown';
    const factor = (n) => Number(n ?? 1).toFixed(3);
    const steps = (row.farm_steps || []).map(s=>`<li>${esc(s)}</li>`).join('');
    els.detailContent.innerHTML = `
      <div class="detail-hero panel"><div><div class="detail-rank">BOARD RANK / ${String(row.rank).padStart(3,'0')}</div><h2 class="detail-title">${esc(row.name)}</h2><p class="detail-slug">${esc(row.slug)}</p><div class="detail-tags">${row.category?`<span class="category-pill">${esc(row.category)}</span>`:'<span class="category-pill">Uncategorized</span>'}${row.watchlist?'<span class="wl-tag">WATCHLIST</span>':''}</div></div><div class="detail-value"><span>IMPLIED LAUNCH VALUE</span><strong>${fmtUsd(row.implied_value_usd)}</strong></div></div>
      <div class="detail-grid panel"><div class="detail-metric"><span>TVL</span><strong>${fmtUsd(row.tvl_usd)}</strong></div><div class="detail-metric"><span>7D TVL CHANGE</span><strong class="${row.change_7d > 0?'change-pos':row.change_7d < 0?'change-neg':'change-neutral'}">${fmtPct(row.change_7d)}</strong></div><div class="detail-metric"><span>CHAINS</span><strong>${chainText}</strong></div><div class="detail-metric"><span>LISTED DATE</span><strong>${esc(listed)}</strong></div><div class="detail-metric"><span>AGE</span><strong>${fmtAge(row.age_days)}</strong></div></div>
      <section class="detail-section panel"><div class="detail-section-head"><h3>Valuation breakdown</h3><span>USD · MODEL FACTORS</span></div><table class="breakdown"><tbody>
      <tr><td>Base value</td><td>${fmtUsd(row.base_usd)}</td><td>TVL × ${Number(row.multiple || 0).toFixed(3)}× multiple · ${peerSuffix}.</td></tr>
      <tr><td>× Growth factor</td><td>${factor(row.growth_factor)}</td><td>7-day growth: ${reasonGrowth(row)}</td></tr>
      <tr><td>× Maturity factor</td><td>${factor(row.maturity_factor)}</td><td>${ageReason}</td></tr>
      <tr><td>× Breadth factor</td><td>${factor(row.breadth_factor)}</td><td>${fmtNum((row.chains||[]).length)} chain${(row.chains||[]).length===1?'':'s'}; multi-chain reach adds a modest lift.</td></tr>
      <tr class="total-row"><td>= Implied value</td><td>${fmtUsd(row.implied_value_usd)}</td><td>Rounded to the nearest dollar.</td></tr></tbody></table></section>
      <section class="detail-section panel"><div class="detail-section-head"><h3>Farm plan</h3><span>${String((row.farm_steps||[]).length).padStart(2,'0')} STEPS</span></div><ol class="farm-list">${steps}</ol><p class="rank-note">This protocol ranks <strong>#${row.rank}</strong> of ${fmtNum(rows.length)} pre-token candidates on the board.</p></section>`;
    setHash(`#p=${encodeURIComponent(row.slug)}`);
    window.scrollTo(0,0);
  }

  function closeDetail(updateHash = true) {
    selectedSlug = null;
    els.detail.hidden = true;
    els.board.hidden = false;
    if (updateHash) setHash(els.category.value ? `#cat=${encodeURIComponent(els.category.value)}` : '');
  }

  function syncHash() {
    const hash = location.hash.slice(1);
    if (hash.startsWith('p=')) {
      let slug = '';
      try { slug = decodeURIComponent(hash.slice(2)); } catch (_) { slug = hash.slice(2); }
      const row = rows.find(r=>r.slug === slug);
      if (row) { renderDetail(row); return; }
    }
    if (hash.startsWith('cat=')) {
      try { els.category.value = decodeURIComponent(hash.slice(4)); } catch (_) { els.category.value = ''; }
    }
    closeDetail(false);
    renderBoard();
  }

  initHeader();
  renderBoard();
  els.search.addEventListener('input', renderBoard);
  els.category.addEventListener('change', () => { if (selectedSlug) closeDetail(false); setHash(els.category.value ? `#cat=${encodeURIComponent(els.category.value)}` : ''); renderBoard(); });
  els.chain.addEventListener('change', renderBoard);
  els.tvl.addEventListener('change', renderBoard);
  els.watchOnly.addEventListener('change', renderBoard);
  document.querySelectorAll('.sort-button').forEach(btn => btn.addEventListener('click', () => {
    const next = btn.dataset.sort;
    if (sortKey === next) sortDirection *= -1;
    else { sortKey = next; sortDirection = next === 'rank' ? 1 : -1; }
    renderBoard();
  }));
  els.tbody.addEventListener('click', event => {
    const tr = event.target.closest('tr[data-slug]');
    if (tr) renderDetail(rows.find(r=>r.slug === tr.dataset.slug));
  });
  els.tbody.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      const tr = event.target.closest('tr[data-slug]');
      if (tr) { event.preventDefault(); renderDetail(rows.find(r=>r.slug === tr.dataset.slug)); }
    }
  });
  $('back-button').addEventListener('click', () => closeDetail());
  $('clear-filters').addEventListener('click', () => { els.search.value=''; els.category.value=''; els.chain.value=''; els.tvl.value='0'; els.watchOnly.checked=false; setHash(''); renderBoard(); });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { event.preventDefault(); els.search.focus(); }
    if (event.key === 'Escape' && selectedSlug) closeDetail();
  });
  window.addEventListener('hashchange', syncHash);
  syncHash();
})();
