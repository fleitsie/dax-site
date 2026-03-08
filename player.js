/* ── Shared Player — player.js ── */
/* Expects window.RELEASES to be defined before this script runs */

(function() {
  'use strict';

  if (!window.RELEASES || !window.RELEASES.length) return;

  var RELEASES = window.RELEASES;
  var audio = new Audio();

  // Does this page already have its own sidebar? (releases.html)
  var pageHasSidebar = !!document.getElementById('sidebar');

  var state = {
    ri: -1,
    ti: -1,
    playing: false,
    sidebarOpen: false,
    volume: 0.8,
    muted: false
  };

  // SVG
  var PLAY_D = 'M5 2v12l9-6z';
  var PAUSE_D = 'M4 2h3v12H4zM9 2h3v12H9z';
  var VOL_ON = '<path d="M2 5h2.5L8 2v12L4.5 11H2a1 1 0 01-1-1V6a1 1 0 011-1z" fill="currentColor"/><path d="M11 5.5a4 4 0 010 5M13 3a7 7 0 010 10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>';
  var VOL_LOW = '<path d="M2 5h2.5L8 2v12L4.5 11H2a1 1 0 01-1-1V6a1 1 0 011-1z" fill="currentColor"/><path d="M11 5.5a4 4 0 010 5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>';
  var VOL_MUTE = '<path d="M2 5h2.5L8 2v12L4.5 11H2a1 1 0 01-1-1V6a1 1 0 011-1z" fill="currentColor"/><line x1="11" y1="5.5" x2="15" y2="10.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="15" y1="5.5" x2="11" y2="10.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>';

  // ── Helpers ──

  function fmtTime(s) {
    if (isNaN(s) || !isFinite(s)) return '0:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function artSrc(path) {
    if (!path) return '';
    return path.indexOf(' ') > -1 ? encodeURI(path) : path;
  }

  // ── Inject HTML ──

  function injectPlayerBar() {
    var bar = document.createElement('div');
    bar.id = 'dax-player-bar';
    bar.innerHTML =
      '<button id="dax-pb-play"><svg viewBox="0 0 16 16"><path d="' + PLAY_D + '"/></svg></button>' +
      '<div id="dax-pb-info"></div>' +
      '<div id="dax-pb-progress-wrap"><div id="dax-pb-progress"></div></div>' +
      '<div id="dax-pb-time">0:00 / 0:00</div>' +
      '<div id="dax-pb-vol">' +
        '<button id="dax-pb-mute" title="Mute"><svg id="dax-pb-vol-icon" viewBox="0 0 16 16">' + VOL_ON + '</svg></button>' +
        '<div id="dax-pb-vol-wrap"><div id="dax-pb-vol-fill"></div></div>' +
      '</div>' +
      '<button id="dax-pb-dismiss" title="Hide player">&times;</button>';
    document.body.appendChild(bar);
  }

  function injectSidebar() {
    // Hamburger tab on left edge
    var tab = document.createElement('div');
    tab.id = 'dax-sidebar-tab';
    tab.title = 'Browse releases';
    tab.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke-width="1.5" stroke-linecap="round">' +
      '<line x1="2" y1="4" x2="14" y2="4"/>' +
      '<line x1="2" y1="8" x2="14" y2="8"/>' +
      '<line x1="2" y1="12" x2="14" y2="12"/>' +
      '</svg>';
    document.body.appendChild(tab);

    // Full release browser sidebar
    var sidebar = document.createElement('div');
    sidebar.id = 'dax-sidebar';
    var html = '<div id="dax-sb-header">Releases</div>' +
      '<div id="dax-sb-search-wrap"><input id="dax-sb-search" type="text" placeholder="Search..." autocomplete="off" spellcheck="false"></div>' +
      '<div id="dax-sb-list">';
    RELEASES.forEach(function(rel, ri) {
      // Build searchable text: artist, title, catalog, all track names
      var searchParts = [rel.artist, rel.title, rel.catalog];
      rel.tracks.forEach(function(trk) {
        searchParts.push(typeof trk === 'string' ? trk : trk.title);
      });
      var searchText = searchParts.join(' ').toLowerCase();
      html += '<div class="dax-sb-release" data-search="' + searchText.replace(/"/g, '&quot;') + '">';
      html += '<div class="dax-sb-release-title" data-ri="' + ri + '">' + rel.artist + ' \u2014 ' + rel.title + '</div>';
      rel.tracks.forEach(function(trk, ti) {
        var trackTitle = typeof trk === 'string' ? trk : trk.title;
        html += '<div class="dax-sb-track" data-ri="' + ri + '" data-ti="' + ti + '">' +
          '<span class="dax-sb-play-icon">\u25B6</span>' +
          '<span>' + trackTitle + '</span>' +
          '</div>';
      });
      html += '</div>';
    });
    html += '</div>';
    sidebar.innerHTML = html;
    document.body.appendChild(sidebar);
  }

  // ── UI Updates ──

  function updatePlayBtn() {
    var path = document.querySelector('#dax-pb-play path');
    if (path) path.setAttribute('d', state.playing ? PAUSE_D : PLAY_D);
    var tab = document.getElementById('dax-sidebar-tab');
    if (tab) tab.classList.toggle('playing', state.playing);
  }

  function updateVolUI() {
    var v = audio.volume;
    var fill = document.getElementById('dax-pb-vol-fill');
    if (fill) fill.style.width = (v * 100) + '%';
    var icon = document.getElementById('dax-pb-vol-icon');
    if (!icon) return;
    if (audio.muted || v === 0) icon.innerHTML = VOL_MUTE;
    else if (v < 0.5) icon.innerHTML = VOL_LOW;
    else icon.innerHTML = VOL_ON;
  }

  function updateSidebarHighlights() {
    // Update shared sidebar track highlights
    document.querySelectorAll('.dax-sb-track').forEach(function(el) {
      var ri = parseInt(el.dataset.ri);
      var ti = parseInt(el.dataset.ti);
      var isCurrent = ri === state.ri && ti === state.ti;
      el.classList.toggle('active', isCurrent);
      var icon = el.querySelector('.dax-sb-play-icon');
      if (icon) icon.textContent = (isCurrent && state.playing) ? '\u25AE\u25AE' : '\u25B6';
    });
  }

  function showBar() {
    document.getElementById('dax-player-bar').classList.add('open');
  }

  function openSidebar() {
    state.sidebarOpen = true;
    var sb = document.getElementById('dax-sidebar');
    var tab = document.getElementById('dax-sidebar-tab');
    if (sb) sb.classList.add('open');
    if (tab) tab.classList.add('shifted');
  }

  function closeSidebar() {
    state.sidebarOpen = false;
    var sb = document.getElementById('dax-sidebar');
    var tab = document.getElementById('dax-sidebar-tab');
    if (sb) {
      sb.classList.add('closing');
      sb.classList.remove('open');
      setTimeout(function() { sb.classList.remove('closing'); }, 600);
    }
    if (tab) tab.classList.remove('shifted');
  }

  function fireChange() {
    document.dispatchEvent(new CustomEvent('dax-player-change', {
      detail: { ri: state.ri, ti: state.ti, playing: state.playing }
    }));
  }

  // ── Core Playback ──

  var DaxPlayer = {
    play: function(ri, ti) {
      var rel = RELEASES[ri];
      if (!rel) return;
      var track = rel.tracks[ti];
      if (!track) return;

      // Toggle if same track
      if (ri === state.ri && ti === state.ti) {
        DaxPlayer.toggle();
        return;
      }

      state.ri = ri;
      state.ti = ti;
      state.playing = true;

      var trackTitle = typeof track === 'string' ? track : track.title;
      var trackSrc = typeof track === 'string' ? null : track.src;

      document.getElementById('dax-pb-info').innerHTML =
        trackTitle + ' <span>' + rel.artist + ' \u2014 ' + rel.catalog + '</span>';

      if (trackSrc) {
        audio.src = trackSrc;
        audio.play();
      } else {
        audio.src = '';
        document.getElementById('dax-pb-progress').style.width = '0';
        document.getElementById('dax-pb-time').textContent = '0:00 / 0:00';
      }

      showBar();
      updatePlayBtn();
      updateSidebarHighlights();
      fireChange();
      saveState();
    },

    toggle: function() {
      if (state.ri < 0) return;
      if (state.playing) {
        audio.pause();
        state.playing = false;
      } else {
        audio.play();
        state.playing = true;
      }
      updatePlayBtn();
      updateSidebarHighlights();
      fireChange();
      saveState();
    },

    getState: function() {
      return { ri: state.ri, ti: state.ti, playing: state.playing };
    },

    isPlaying: function() { return state.playing; },
    currentRelease: function() { return state.ri; },
    currentTrack: function() { return state.ti; },
    getAudio: function() { return audio; }
  };

  // ── Event Handlers ──

  function setupEvents() {
    // Sidebar tab toggle
    var tab = document.getElementById('dax-sidebar-tab');

    if (tab) {
      // Hide tab on desktop if page has its own sidebar
      if (pageHasSidebar && window.innerWidth > 800) tab.style.display = 'none';

      tab.addEventListener('click', function(e) {
        e.stopPropagation();
        if (state.sidebarOpen) closeSidebar();
        else openSidebar();
        if (window.playPop) window.playPop();
      });
    }

    // Click outside sidebar to close
    document.addEventListener('click', function(e) {
      if (!state.sidebarOpen) return;
      var sb = document.getElementById('dax-sidebar');
      var tab2 = document.getElementById('dax-sidebar-tab');
      if (sb && !sb.contains(e.target) && tab2 && !tab2.contains(e.target)) {
        closeSidebar();
      }
    });

    // Sidebar search
    var searchInput = document.getElementById('dax-sb-search');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        var q = this.value.toLowerCase().trim();
        document.querySelectorAll('.dax-sb-release').forEach(function(el) {
          if (!q || el.dataset.search.indexOf(q) > -1) {
            el.style.display = '';
          } else {
            el.style.display = 'none';
          }
        });
      });
      // Dismiss keyboard on Enter
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') searchInput.blur();
      });
    }

    // Sidebar track clicks (only if sidebar was injected)
    var sbList = document.getElementById('dax-sb-list');
    if (sbList) {
      sbList.addEventListener('click', function(e) {
        // Track click
        var trackEl = e.target.closest('.dax-sb-track');
        if (trackEl) {
          var ri = parseInt(trackEl.dataset.ri);
          var ti = parseInt(trackEl.dataset.ti);
          DaxPlayer.play(ri, ti);
          if (window.playPop) window.playPop();
          return;
        }
        // Release title click — play first track
        var titleEl = e.target.closest('.dax-sb-release-title');
        if (titleEl) {
          var ri2 = parseInt(titleEl.dataset.ri);
          DaxPlayer.play(ri2, 0);
          if (window.playPop) window.playPop();
        }
      });
    }

    // Player bar play/pause
    document.getElementById('dax-pb-play').addEventListener('click', function() {
      DaxPlayer.toggle();
    });

    // Progress
    audio.addEventListener('timeupdate', function() {
      if (!audio.duration) return;
      var pct = (audio.currentTime / audio.duration) * 100;
      document.getElementById('dax-pb-progress').style.width = pct + '%';
      document.getElementById('dax-pb-time').textContent =
        fmtTime(audio.currentTime) + ' / ' + fmtTime(audio.duration);
    });

    document.getElementById('dax-pb-progress-wrap').addEventListener('click', function(e) {
      if (!audio.duration) return;
      var r = this.getBoundingClientRect();
      var pct = (e.clientX - r.left) / r.width;
      audio.currentTime = pct * audio.duration;
    });

    // Dismiss (mobile)
    document.getElementById('dax-pb-dismiss').addEventListener('click', function() {
      document.getElementById('dax-player-bar').classList.remove('open');
    });

    // Volume
    document.getElementById('dax-pb-mute').addEventListener('click', function() {
      if (audio.muted || audio.volume === 0) {
        audio.muted = false;
        audio.volume = state.volume || 0.5;
      } else {
        state.volume = audio.volume;
        audio.muted = true;
      }
      state.muted = audio.muted;
      updateVolUI();
    });

    var volWrap = document.getElementById('dax-pb-vol-wrap');
    volWrap.addEventListener('click', function(e) {
      var r = volWrap.getBoundingClientRect();
      var v = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      audio.volume = v;
      audio.muted = false;
      state.volume = v;
      state.muted = false;
      updateVolUI();
    });

    // Auto-advance
    audio.addEventListener('ended', function() {
      var rel = RELEASES[state.ri];
      if (!rel) return;
      if (state.ti < rel.tracks.length - 1) {
        DaxPlayer.play(state.ri, state.ti + 1);
      } else if (state.ri < RELEASES.length - 1) {
        DaxPlayer.play(state.ri + 1, 0);
      } else {
        state.playing = false;
        updatePlayBtn();
        updateSidebarHighlights();
        fireChange();
      }
    });

    // Save state on navigation — use multiple events for mobile reliability
    window.addEventListener('beforeunload', saveState);
    window.addEventListener('pagehide', saveState);
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') saveState();
    });

    // Also save periodically while playing so mobile doesn't lose position
    audio.addEventListener('timeupdate', function() {
      if (state.playing && Math.floor(audio.currentTime) % 3 === 0) saveState();
    });
  }

  // ── localStorage Persistence ──

  function saveState() {
    if (state.ri < 0) return;
    var data = {
      ri: state.ri,
      ti: state.ti,
      time: audio.currentTime || 0,
      volume: audio.volume,
      muted: audio.muted,
      playing: state.playing
    };
    localStorage.setItem('dax-player', JSON.stringify(data));
  }

  function restoreState() {
    var raw = localStorage.getItem('dax-player');
    if (!raw) return;
    try {
      var data = JSON.parse(raw);
      if (data.ri < 0 || data.ri >= RELEASES.length) return;
      var rel = RELEASES[data.ri];
      if (!rel || data.ti < 0 || data.ti >= rel.tracks.length) return;

      // Restore volume
      state.volume = typeof data.volume === 'number' ? data.volume : 0.8;
      state.muted = !!data.muted;
      audio.volume = state.volume;
      audio.muted = state.muted;

      // Set state
      state.ri = data.ri;
      state.ti = data.ti;

      // Update player bar info
      var track = rel.tracks[data.ti];
      var trackTitle = typeof track === 'string' ? track : track.title;
      document.getElementById('dax-pb-info').innerHTML =
        trackTitle + ' <span>' + rel.artist + ' \u2014 ' + rel.catalog + '</span>';

      showBar();
      updateVolUI();
      updateSidebarHighlights();

      // Resume audio
      var trackSrc = typeof track === 'string' ? null : track.src;
      if (trackSrc && data.playing) {
        audio.src = trackSrc;
        var seekTime = data.time || 0;
        audio.addEventListener('loadedmetadata', function() {
          if (seekTime > 0 && seekTime < audio.duration) {
            audio.currentTime = seekTime;
          }
        }, { once: true });
        audio.play().then(function() {
          state.playing = true;
          updatePlayBtn();
          updateSidebarHighlights();
          fireChange();
        }).catch(function() {
          // Autoplay blocked (mobile) — resume on first user interaction
          state.playing = false;
          updatePlayBtn();
          updateSidebarHighlights();
          fireChange();

          function resumeOnTouch() {
            audio.play().then(function() {
              state.playing = true;
              updatePlayBtn();
              updateSidebarHighlights();
              fireChange();
            }).catch(function() {});
            document.removeEventListener('touchstart', resumeOnTouch);
            document.removeEventListener('click', resumeOnTouch);
          }
          document.addEventListener('touchstart', resumeOnTouch, { once: false });
          document.addEventListener('click', resumeOnTouch, { once: false });
        });
      } else if (trackSrc) {
        audio.src = trackSrc;
        var seekTime2 = data.time || 0;
        audio.addEventListener('loadedmetadata', function() {
          if (seekTime2 > 0 && seekTime2 < audio.duration) {
            audio.currentTime = seekTime2;
          }
        }, { once: true });
        state.playing = false;
        updatePlayBtn();
        updateSidebarHighlights();
        fireChange();
      }
    } catch(e) {}
  }

  // ── Init ──

  injectPlayerBar();
  var isMobile = window.innerWidth <= 800;
  if (!pageHasSidebar || isMobile) {
    injectSidebar();
  }
  audio.volume = 0.8;
  setupEvents();
  updateVolUI();
  restoreState();

  // On mobile releases page, open sidebar by default
  if (isMobile && pageHasSidebar) {
    openSidebar();
  }

  window.DaxPlayer = DaxPlayer;
})();
