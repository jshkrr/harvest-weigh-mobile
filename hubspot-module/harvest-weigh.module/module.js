/* ============================================================================
   Harvest Weigh — front-end app. Single source of truth, reused by the HubSpot
   module wrapper (module.html) and the local preview (preview/index.html).

   Config comes from the root element's data attributes:
     data-brand    CT | SA | JT | AV
     data-backend  base URL of the external backend (no trailing slash)
     data-api-key  optional shared secret (matches backend API_KEY)
     data-logo     optional logo image URL (falls back to a brand wordmark)
   ============================================================================ */
(function () {
  'use strict';

  var BRANDS = {
    CT: { name: 'Coolabah Turf',  color: '#1a4d2e', dark: '#123a22' },
    SA: { name: 'StrathAyr',      color: '#003366', dark: '#00264d' },
    JT: { name: 'Jimboomba Turf', color: '#2d5a1b', dark: '#224515' },
    AV: { name: 'Allenview Turf', color: '#4a7c2f', dark: '#3a6125' },
  };
  var HARVESTERS = ['HV1', 'HV2', 'HV3'];
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function boot(root) {
    if (!root || root.__hwBooted) return;
    root.__hwBooted = true;

    var cfg = {
      brand: (root.getAttribute('data-brand') || 'CT').toUpperCase(),
      backend: (root.getAttribute('data-backend') || '').replace(/\/+$/, ''),
      apiKey: root.getAttribute('data-api-key') || '',
      logo: root.getAttribute('data-logo') || '',
    };
    var brand = BRANDS[cfg.brand] || BRANDS.CT;

    root.classList.add('hw');
    root.style.setProperty('--brand', brand.color);
    root.style.setProperty('--brand-dark', brand.dark);

    var state = { view: 'picker', harvester: null, pallets: [], idx: 0, busy: false, msg: null };

    // ── helpers ──────────────────────────────────────────────────────────
    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
      });
    }
    function todayLabel() {
      var d = new Date();
      return DAYS[d.getDay()] + ' ' + String(d.getDate()).padStart(2,'0') + ' ' +
             MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    }
    function api(path, opts) {
      opts = opts || {};
      var url = cfg.backend + path + (path.indexOf('?') >= 0 ? '&' : '?') +
                'key=' + encodeURIComponent(cfg.apiKey);
      return fetch(url, {
        method: opts.method || 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) throw new Error(j.error || ('Request failed (' + r.status + ')'));
          return j;
        });
      });
    }
    function statusClass(s) {
      if (s === 'Complete') return 'complete';
      if (s === 'Harvest started') return 'started';
      return 'idle';
    }

    // ── header (always rendered) ─────────────────────────────────────────
    function headerHTML() {
      var logo = cfg.logo
        ? '<img class="hw-logo" src="' + esc(cfg.logo) + '" alt="' + esc(brand.name) + '">'
        : '<div class="hw-logo-fallback">' + esc(brand.name) + '</div>';
      return '<header class="hw-header">' + logo +
        '<div class="hw-header-meta">' +
          '<div class="hw-brandname">Harvest Weigh</div>' +
          '<div class="hw-date">' + esc(todayLabel()) + '</div>' +
        '</div></header>';
    }

    // ── views ────────────────────────────────────────────────────────────
    function renderPicker() {
      var btns = HARVESTERS.map(function (h) {
        return '<button class="hw-harv-btn" data-h="' + h + '">' + h + '</button>';
      }).join('');
      return '<main class="hw-main"><div class="hw-card hw-picker">' +
        '<h2>Which harvester today?</h2>' +
        '<p>' + esc(brand.name) + ' &middot; tap your machine</p>' +
        '<div class="hw-harvesters">' + btns + '</div>' +
      '</div></main>';
    }

    function renderState(icon, title, sub, showChange) {
      return '<main class="hw-main"><div class="hw-card"><div class="hw-state">' +
        (icon === 'spin' ? '<div class="hw-spinner"></div>' : '<div class="big">' + icon + '</div>') +
        '<h3>' + esc(title) + '</h3>' +
        (sub ? '<p>' + esc(sub) + '</p>' : '') +
      '</div>' +
      (showChange ? '<button class="hw-change" data-act="change">Change harvester</button>' : '') +
      '</div></main>';
    }

    function field(lbl, val, opts) {
      opts = opts || {};
      var cls = 'hw-field' + (opts.wide ? ' wide' : '') + (opts.metric ? ' hw-metric' : '');
      return '<div class="' + cls + '"><div class="lbl">' + esc(lbl) + '</div>' +
             '<div class="val">' + (opts.html || esc(val || '—')) + '</div></div>';
    }

    function renderQueue() {
      var p = state.pallets[state.idx];
      if (!p) return renderState('🌱', 'No pallets', 'Nothing here for this harvester today.', true);

      var done = p.status === 'Complete';
      var started = p.status === 'Harvest started';
      var teamVal = p.teamMember ? esc(p.teamMember) +
        (p.teamPhone ? ' <small style="color:var(--muted);font-weight:600">· ' + esc(p.teamPhone) + '</small>' : '')
        : '—';

      var card =
        '<div class="hw-card">' +
          '<div class="hw-palletno">' +
            '<span class="no">' + esc(p.palletNo || 'Pallet') + '</span>' +
            '<span class="hw-position">Pallet ' + (state.idx + 1) + ' of ' + state.pallets.length + '</span>' +
          '</div>' +
          '<span class="hw-badge ' + statusClass(p.status) + '">' + esc(p.status) + '</span>' +

          '<div class="hw-grid">' +
            field('Harvester', p.harvester) +
            field('Team member', null, { html: teamVal }) +
            field('Location', p.location, { wide: true }) +
            field('Variety', p.variety, { wide: true }) +
            field('Pallet type', p.palletType) +
            field('Area', null, { metric: true, html: esc(round1(p.areaM2)) + ' <small>m²</small>' }) +
            field('Slabs', null, { metric: true, html: esc(p.slabs) + ' <small>@ ' + esc(p.slabSize) + 'm²</small>' }) +
          '</div>' +

          '<div class="hw-divider"></div>' +

          '<button class="hw-btn hw-btn-ghost" data-act="commence"' +
            (done || started ? ' disabled' : '') + '>' +
            (started ? 'Harvesting started' : done ? 'Harvested' : 'Commence Harvesting') +
          '</button>' +

          '<div class="hw-weight-now" style="margin-top:18px">Current weight: <b>' +
            esc(p.weight ? round1(p.weight) : 0) + ' kg</b></div>' +
          '<label class="hw-label" for="hw-w">Enter Weight (kg)</label>' +
          '<input id="hw-w" class="hw-input" type="text" inputmode="decimal" ' +
            'placeholder="e.g. 700" value="">' +
          '<button class="hw-btn hw-btn-primary" data-act="submit"' + (state.busy ? ' disabled' : '') + '>' +
            (state.busy ? 'Saving…' : (done ? 'Update Weight' : 'Submit & Next')) +
          '</button>' +
          (state.msg ? '<div class="hw-msg ' + state.msg.kind + '">' + esc(state.msg.text) + '</div>' : '') +
        '</div>';

      var nav =
        '<nav class="hw-nav">' +
          '<button class="hw-arrow" data-act="prev"' + (state.idx === 0 ? ' disabled' : '') + ' aria-label="Previous">‹</button>' +
          '<div class="hw-nav-mid"><span class="pos">' + (state.idx + 1) + ' / ' + state.pallets.length + '</span>' +
            '<span class="lbl">' + esc(p.harvester || state.harvester) + ' · ' + esc(brand.name) + '</span></div>' +
          '<button class="hw-arrow" data-act="next"' +
            (state.idx >= state.pallets.length - 1 ? ' disabled' : '') + ' aria-label="Next">›</button>' +
        '</nav>';

      return '<main class="hw-main">' + card +
        '<button class="hw-change" data-act="change">Change harvester</button></main>' + nav;
    }

    function round1(n) {
      var x = Number(n) || 0;
      return Math.round(x * 10) / 10;
    }

    function render() {
      var body;
      if (state.view === 'loading') body = renderState('spin', 'Loading…', '');
      else if (state.view === 'error') body = renderState('⚠️', 'Something went wrong', state.errMsg, true);
      else if (state.view === 'empty') body = renderState('✅', 'All clear', 'No pallets to harvest for ' + state.harvester + ' today.', true);
      else if (state.view === 'queue') body = renderQueue();
      else body = renderPicker();

      root.innerHTML = headerHTML() + body +
        '<div class="hw-footer">Powered by Harvest Weigh</div>';
      bind();
      var input = root.querySelector('#hw-w');
      if (input) input.focus({ preventScroll: true });
    }

    // ── actions ──────────────────────────────────────────────────────────
    function loadQueue(h) {
      state.harvester = h;
      state.view = 'loading';
      state.idx = 0;
      state.msg = null;
      render();
      api('/api/pallets?brand=' + encodeURIComponent(cfg.brand) + '&harvester=' + encodeURIComponent(h))
        .then(function (data) {
          state.pallets = data.pallets || [];
          state.view = state.pallets.length ? 'queue' : 'empty';
          // start on first not-yet-complete pallet
          var firstOpen = state.pallets.findIndex(function (p) { return p.status !== 'Complete'; });
          state.idx = firstOpen >= 0 ? firstOpen : 0;
          render();
        })
        .catch(function (e) { state.view = 'error'; state.errMsg = e.message; render(); });
    }

    function go(delta) {
      var n = state.idx + delta;
      if (n < 0 || n >= state.pallets.length) return;
      state.idx = n; state.msg = null; render();
    }

    function advanceAfterSubmit() {
      // jump to next not-complete pallet; else next index; else stay
      for (var i = state.idx + 1; i < state.pallets.length; i++) {
        if (state.pallets[i].status !== 'Complete') { state.idx = i; return; }
      }
      if (state.idx < state.pallets.length - 1) state.idx += 1;
    }

    function submitWeight() {
      var p = state.pallets[state.idx];
      var input = root.querySelector('#hw-w');
      var val = input ? input.value.trim() : '';
      if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
        state.msg = { kind: 'err', text: 'Please enter a valid weight.' }; render(); return;
      }
      state.busy = true; state.msg = null; render();
      api('/api/pallets/' + encodeURIComponent(p.id) + '/weight?brand=' + encodeURIComponent(cfg.brand),
          { method: 'POST', body: { weight: val } })
        .then(function (res) {
          if (res.pallet) state.pallets[state.idx] = res.pallet;
          state.busy = false;
          state.msg = { kind: 'ok', text: 'Saved ' + round1(val) + ' kg ✓' };
          advanceAfterSubmit();
          render();
        })
        .catch(function (e) {
          state.busy = false; state.msg = { kind: 'err', text: e.message }; render();
        });
    }

    function commence() {
      var p = state.pallets[state.idx];
      api('/api/pallets/' + encodeURIComponent(p.id) + '/commence?brand=' + encodeURIComponent(cfg.brand),
          { method: 'POST' })
        .then(function (res) {
          if (res.pallet) state.pallets[state.idx] = res.pallet;
          state.msg = { kind: 'ok', text: 'Harvesting commenced.' };
          render();
        })
        .catch(function (e) { state.msg = { kind: 'err', text: e.message }; render(); });
    }

    // ── event binding ────────────────────────────────────────────────────
    function bind() {
      root.querySelectorAll('[data-h]').forEach(function (b) {
        b.addEventListener('click', function () { loadQueue(b.getAttribute('data-h')); });
      });
      root.querySelectorAll('[data-act]').forEach(function (b) {
        b.addEventListener('click', function () {
          var act = b.getAttribute('data-act');
          if (act === 'prev') go(-1);
          else if (act === 'next') go(1);
          else if (act === 'submit') submitWeight();
          else if (act === 'commence') commence();
          else if (act === 'change') { state.view = 'picker'; state.pallets = []; render(); }
        });
      });
      var input = root.querySelector('#hw-w');
      if (input) input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submitWeight(); }
      });
    }

    if (!cfg.backend) {
      root.classList.add('hw');
      root.innerHTML = headerHTML() +
        renderState('⚙️', 'Not configured', 'Set the backend URL on this module.', false);
      return;
    }
    render();
  }

  function init() {
    document.querySelectorAll('.harvest-weigh-root').forEach(boot);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
