// ==UserScript==
// @name        Chesshook
// @include    	https://www.chess.com/*
// @grant       none
// @require     https://raw.githubusercontent.com/0mlml/chesshook/master/betafish.js
// @require     https://raw.githubusercontent.com/0mlml/vasara/main/vasara.js
// @version     2.3
// @author      0mlml
// @description Chess.com Cheat Userscript
// @updateURL   https://raw.githubusercontent.com/0mlml/chesshook/master/chesshook.user.js
// @downloadURL https://raw.githubusercontent.com/0mlml/chesshook/master/chesshook.user.js
// @run-at      document-start
// ==/UserScript==

(() => {
  const uiPrefsKey = 'ui-prefs';
  const defaultUiPrefs = {
    appearance: { theme: 'dark', scale: 100, glass: true },
    board: { arrowOpacity: false, coordinates: false, lastMoveHighlight: false, lastMoveColor: '#58a6ff' },
    hotkeys: {}
  };
  let uiPrefs = defaultUiPrefs;
  try {
    const savedPrefs = JSON.parse(localStorage.getItem(uiPrefsKey) || '{}');
    uiPrefs = {
      appearance: { ...defaultUiPrefs.appearance, ...savedPrefs.appearance },
      board: { ...defaultUiPrefs.board, ...savedPrefs.board },
      hotkeys: { ...defaultUiPrefs.hotkeys, ...savedPrefs.hotkeys }
    };
  } catch (error) {
    console.warn('Could not restore Chesshook UI preferences:', error);
  }

  const saveUiPrefs = () => {
    try {
      localStorage.setItem(uiPrefsKey, JSON.stringify(uiPrefs));
    } catch (error) {
      console.error('Could not save Chesshook UI preferences:', error);
    }
  };

  const UI = {
    injectStyles() {
      if (document.getElementById('chesshook-ui-styles')) return;

      if (!document.getElementById('chesshook-fontawesome')) {
        const iconStyles = document.createElement('link');
        iconStyles.id = 'chesshook-fontawesome';
        iconStyles.rel = 'stylesheet';
        iconStyles.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css';
        (document.head || document.documentElement).appendChild(iconStyles);
      }

      const style = document.createElement('style');
      style.id = 'chesshook-ui-styles';
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .chesshook-ui-overlay {
          position: fixed; inset: 0; z-index: 2147483646; display: flex;
          align-items: center; justify-content: center; padding: 24px;
          background: rgba(1, 4, 9, .68); backdrop-filter: blur(4px);
          animation: chesshook-fade-in 180ms ease-out;
          transition: opacity 180ms ease;
        }
        .chesshook-ui-window {
          display: flex; flex-direction: column; width: min(var(--chesshook-width), calc(100vw - 32px));
          max-height: calc(100vh - 48px); overflow: hidden; color: var(--chesshook-text, #e6edf3);
          background: var(--chesshook-panel, #0d1117); border: 1px solid var(--chesshook-border, #30363d); border-radius: 12px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, .55);
          font: 400 13px/1.5 Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          animation: chesshook-window-in 200ms ease-out;
          zoom: var(--chesshook-ui-scale, 1);
          transition: opacity 180ms ease, transform 180ms ease, background 180ms ease;
        }
        .chesshook-ui-window.chesshook-glass { background: rgba(13, 17, 23, .78); backdrop-filter: blur(18px) saturate(135%); }
        .chesshook-ui-overlay.chesshook-closing { opacity: 0; pointer-events: none; }
        .chesshook-ui-window.chesshook-closing { opacity: 0; transform: scale(.96); }
        .chesshook-ui-window[data-theme="darker"] { --chesshook-panel: #090c10; --chesshook-panel-raised: #11151b; --chesshook-border: #252a32; --chesshook-text: #e6edf3; --chesshook-muted: #858d98; }
        .chesshook-ui-window[data-theme="midnight"] { --chesshook-panel: #101426; --chesshook-panel-raised: #191f35; --chesshook-border: #303857; --chesshook-text: #e3e8ff; --chesshook-muted: #a0a9c7; }
        .chesshook-ui-window[data-theme="light"] { --chesshook-panel: #f6f8fa; --chesshook-panel-raised: #ffffff; --chesshook-border: #d0d7de; --chesshook-text: #1f2328; --chesshook-muted: #59636e; }
        .chesshook-ui-titlebar {
          position: relative;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          min-height: 52px; padding: 0 18px; background: var(--chesshook-panel-raised, #161b22);
          border-bottom: 1px solid var(--chesshook-border, #30363d); cursor: grab; user-select: none;
        }
        .chesshook-ui-titlebar:active { cursor: grabbing; }
        .chesshook-ui-title { margin: 7px 0 0; color: var(--chesshook-text, #e6edf3); font-size: 15px; font-weight: 600; letter-spacing: .01em; }
        .chesshook-ui-drag-handle {
          position: absolute; top: 4px; left: 50%; transform: translateX(-50%);
          color: var(--chesshook-muted, #8b949e); font-size: 10px; line-height: 1; cursor: grab;
        }
        .chesshook-ui-body { overflow: auto; padding: 18px; }
        .chesshook-ui-section { margin: 0 0 20px; padding: 0 0 4px; }
        .chesshook-ui-section:last-child { margin-bottom: 0; }
        .chesshook-ui-section-title {
          margin: 0 0 10px; padding-bottom: 8px; color: #58a6ff;
          border-bottom: 1px solid var(--chesshook-border, #30363d); font-size: 12px; font-weight: 700;
          letter-spacing: .08em; text-transform: uppercase;
        }
        .chesshook-ui-section-title i { width: 18px; margin-right: 6px; text-align: center; }
        .chesshook-ui-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; min-height: 48px; padding: 8px 10px; border-radius: 8px;
          transition: background 180ms, box-shadow 180ms;
        }
        .chesshook-ui-row:hover { background: var(--chesshook-panel-raised, #161b22); box-shadow: inset 2px 0 0 rgba(88, 166, 255, .38); }
        .chesshook-ui-label { min-width: 0; flex: 1; }
        .chesshook-ui-label-title { display: block; color: var(--chesshook-text, #e6edf3); font-weight: 500; }
        .chesshook-ui-label-desc { display: block; margin-top: 2px; color: var(--chesshook-muted, #8b949e); font-size: 11px; }
        .chesshook-ui-control { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex: 0 0 auto; }
        .chesshook-ui-window input:not([type="checkbox"]):not([type="range"]):not([type="color"]),
        .chesshook-ui-window select, .chesshook-ui-number {
          box-sizing: border-box; min-width: 0; width: 190px; height: 34px;
          padding: 0 10px; color: var(--chesshook-text, #e6edf3); background: var(--chesshook-panel, #0d1117);
          border: 1px solid var(--chesshook-border, #30363d); border-radius: 7px; outline: none;
          font: inherit; transition: border-color 160ms, box-shadow 160ms;
        }
        .chesshook-ui-window input:focus-visible, .chesshook-ui-window select:focus-visible,
        .chesshook-ui-button:focus-visible {
          outline: 2px solid #58a6ff; outline-offset: 2px; border-color: #58a6ff;
        }
        .chesshook-ui-window select { cursor: pointer; }
        .chesshook-ui-window input[type="range"] { width: 150px; accent-color: #58a6ff; cursor: pointer; }
        .chesshook-ui-number { width: 82px; }
        .chesshook-ui-window input[type="color"] {
          width: 40px; height: 34px; padding: 3px; border: 1px solid var(--chesshook-border, #30363d);
          border-radius: 7px; background: var(--chesshook-panel, #0d1117); cursor: pointer;
        }
        .chesshook-ui-toggle { position: relative; display: inline-flex; width: 42px; height: 24px; flex: 0 0 auto; }
        .chesshook-ui-toggle input { position: absolute; width: 1px; height: 1px; opacity: 0; }
        .chesshook-ui-toggle-track {
          position: absolute; inset: 0; border: 1px solid #484f58; border-radius: 99px;
          background: #30363d; cursor: pointer; transition: background 180ms, border-color 180ms;
        }
        .chesshook-ui-toggle-track::after {
          content: ""; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px;
          border-radius: 50%; background: #e6edf3; transition: transform 180ms;
        }
        .chesshook-ui-toggle input:checked + .chesshook-ui-toggle-track { border-color: #58a6ff; background: #1f6feb; }
        .chesshook-ui-toggle input:checked + .chesshook-ui-toggle-track::after { transform: translateX(18px); }
        .chesshook-ui-toggle input:focus-visible + .chesshook-ui-toggle-track { outline: 2px solid #58a6ff; outline-offset: 2px; }
        .chesshook-ui-button {
          min-height: 34px; padding: 0 13px; color: #c9d1d9; background: #21262d;
          border: 1px solid #30363d; border-radius: 7px; font: inherit; font-weight: 600;
          cursor: pointer; transition: background 160ms, border-color 160ms, transform 160ms;
        }
        .chesshook-ui-button:hover { background: #30363d; border-color: #484f58; }
        .chesshook-ui-button:active { transform: translateY(1px); }
        .chesshook-ui-button-primary { color: #fff; background: #1f6feb; border-color: #388bfd; }
        .chesshook-ui-button-primary { box-shadow: 0 0 16px rgba(31, 111, 235, .2); }
        .chesshook-ui-button-primary:hover { background: #388bfd; border-color: #58a6ff; box-shadow: 0 0 20px rgba(88, 166, 255, .36); }
        .chesshook-ui-tabs { display: flex; gap: 8px; border-bottom: 1px solid var(--chesshook-border, #30363d); }
        .chesshook-ui-tab { position: relative; padding: 8px 12px; color: var(--chesshook-muted, #8b949e); }
        .chesshook-ui-tab[aria-selected="true"] { color: #58a6ff; }
        .chesshook-ui-tab[aria-selected="true"]::after {
          content: ""; position: absolute; right: 0; bottom: -1px; left: 0; height: 2px;
          background: #58a6ff; animation: chesshook-tab-underline 180ms ease-out;
        }
        .chesshook-ui-exploit-row { margin-bottom: 8px; }
        .chesshook-console-body { min-height: 180px; background: #0d1117; padding: 10px; }
        .chesshook-console-line {
          margin: 0 0 6px; padding: 7px 10px; color: #c9d1d9; background: #161b22;
          border-left: 2px solid #58a6ff; border-radius: 0 6px 6px 0;
          font: 12px/1.5 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
          white-space: pre-wrap; overflow-wrap: anywhere;
        }
        .chesshook-ui-empty { padding: 20px 12px; color: #8b949e; text-align: center; }
        .chesshook-ui-diagnostics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .chesshook-ui-diagnostic {
          padding: 10px; color: var(--chesshook-muted, #8b949e); background: var(--chesshook-panel-raised, #161b22);
          border: 1px solid var(--chesshook-border, #30363d); border-radius: 8px;
        }
        .chesshook-ui-diagnostic strong { display: block; margin-top: 3px; color: var(--chesshook-text, #e6edf3); font-size: 15px; }
        .chesshook-ui-about { padding-top: 8px; color: var(--chesshook-muted, #8b949e); text-align: right; font-size: 11px; }
        .chesshook-ui-window[data-theme="light"] .chesshook-ui-button { color: #24292f; background: #f6f8fa; border-color: #d0d7de; }
        .chesshook-ui-window[data-theme="light"] .chesshook-ui-button-primary { color: #fff; background: #0969da; border-color: #0969da; }
        .chesshook-ui-window[data-theme="light"] .chesshook-console-body { background: #f6f8fa; }
        .chesshook-ui-window[data-theme="light"] .chesshook-console-line { color: #24292f; background: #fff; }
        @keyframes chesshook-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes chesshook-window-in { from { opacity: 0; transform: translateY(6px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes chesshook-tab-underline { from { transform: scaleX(.2); } to { transform: scaleX(1); } }
        @media (max-width: 620px) {
          .chesshook-ui-overlay { padding: 12px; }
          .chesshook-ui-body { padding: 12px; }
          .chesshook-ui-row { align-items: flex-start; flex-direction: column; gap: 8px; }
          .chesshook-ui-control { width: 100%; justify-content: flex-start; }
          .chesshook-ui-window input:not([type="checkbox"]):not([type="range"]):not([type="color"]),
          .chesshook-ui-window select { width: 100%; }
          .chesshook-ui-window input[type="range"] { flex: 1; }
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    },

    createWindow(title, width) {
      this.injectStyles();
      const overlay = document.createElement('div');
      overlay.className = 'chesshook-ui-overlay';
      overlay.dataset.windowTitle = title;
      const win = document.createElement('div');
      win.className = 'chesshook-ui-window';
      win.style.setProperty('--chesshook-width', `${width}px`);
      win.setAttribute('role', 'dialog');
      win.setAttribute('aria-modal', 'true');
      win.dataset.theme = uiPrefs.appearance.theme;
      win.style.setProperty('--chesshook-ui-scale', String(uiPrefs.appearance.scale / 100));
      if (uiPrefs.appearance.glass) win.classList.add('chesshook-glass');
      const titlebar = document.createElement('div');
      titlebar.className = 'chesshook-ui-titlebar';
      const heading = document.createElement('h2');
      heading.className = 'chesshook-ui-title';
      heading.textContent = title;
      const dragHandle = document.createElement('span');
      dragHandle.className = 'chesshook-ui-drag-handle';
      dragHandle.setAttribute('aria-hidden', 'true');
      dragHandle.innerHTML = '<i class="fa-solid fa-grip"></i>';
      const body = document.createElement('div');
      body.className = 'chesshook-ui-body';
      titlebar.append(heading, dragHandle);
      win.append(titlebar, body);
      overlay.appendChild(win);
      (document.body || document.documentElement).appendChild(overlay);

      const onKeyDown = event => {
        if (event.key === 'Escape' && overlay.isConnected) this.closeWindow(overlay);
      };
      overlay.addEventListener('chesshook:close', () => document.removeEventListener('keydown', onKeyDown), { once: true });
      document.addEventListener('keydown', onKeyDown);

      let drag = null;
      titlebar.addEventListener('pointerdown', event => {
        const rect = win.getBoundingClientRect();
        win.style.position = 'fixed';
        win.style.left = `${rect.left}px`;
        win.style.top = `${rect.top}px`;
        win.style.margin = '0';
        win.style.transform = 'none';
        drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        titlebar.setPointerCapture(event.pointerId);
      });
      titlebar.addEventListener('pointermove', event => {
        if (!drag) return;
        win.style.left = `${Math.max(0, Math.min(window.innerWidth - win.offsetWidth, event.clientX - drag.x))}px`;
        win.style.top = `${Math.max(0, Math.min(window.innerHeight - win.offsetHeight, event.clientY - drag.y))}px`;
      });
      titlebar.addEventListener('pointerup', () => { drag = null; });
      titlebar.addEventListener('pointercancel', () => { drag = null; });

      return { overlay, win, body };
    },

    closeWindow(overlay) {
      if (!overlay.isConnected || overlay.classList.contains('chesshook-closing')) return;
      overlay.classList.add('chesshook-closing');
      overlay.firstElementChild.classList.add('chesshook-closing');
      overlay.dispatchEvent(new Event('chesshook:close'));
      overlay._chesshookCloseTimer = window.setTimeout(() => overlay.remove(), 180);
    },

    toggleWindow(title, width, render) {
      const existing = Array.from(document.querySelectorAll('.chesshook-ui-overlay'))
        .find(overlay => overlay.dataset.windowTitle === title);
      if (existing) {
        if (existing.classList.contains('chesshook-closing')) {
          window.clearTimeout(existing._chesshookCloseTimer);
          delete existing._chesshookCloseTimer;
          existing.classList.remove('chesshook-closing');
          existing.firstElementChild.classList.remove('chesshook-closing');
        } else {
          this.closeWindow(existing);
        }
        return null;
      }
      const windowParts = this.createWindow(title, width);
      render(windowParts.body, windowParts);
      return windowParts;
    },

    applyPreferences() {
      document.querySelectorAll('.chesshook-ui-window').forEach(win => {
        win.dataset.theme = uiPrefs.appearance.theme;
        win.style.setProperty('--chesshook-ui-scale', String(uiPrefs.appearance.scale / 100));
        win.classList.toggle('chesshook-glass', Boolean(uiPrefs.appearance.glass));
      });
    },

    section(parent, title) {
      const section = document.createElement('section');
      section.className = 'chesshook-ui-section';
      const heading = document.createElement('h3');
      heading.className = 'chesshook-ui-section-title';
      const icons = {
        Engine: 'fa-microchip',
        'Auto Move': 'fa-bolt',
        'Auto Queue': 'fa-layer-group',
        Puzzles: 'fa-puzzle-piece',
        Visuals: 'fa-eye',
        'Legit Mode': 'fa-shield-halved',
        Appearance: 'fa-palette',
        Hotkeys: 'fa-keyboard',
        'Board Overlays': 'fa-chess-board',
        Diagnostics: 'fa-chart-line',
        About: 'fa-circle-info'
      };
      const icon = document.createElement('i');
      icon.className = `fa-solid ${icons[title] || 'fa-circle'}`;
      icon.setAttribute('aria-hidden', 'true');
      heading.append(icon, document.createTextNode(title));
      section.appendChild(heading);
      parent.appendChild(section);
      return section;
    },

    row(parent, labelText, labelDesc) {
      const row = document.createElement('div');
      row.className = 'chesshook-ui-row';
      const label = document.createElement('div');
      label.className = 'chesshook-ui-label';
      const title = document.createElement('span');
      title.className = 'chesshook-ui-label-title';
      title.textContent = labelText;
      label.appendChild(title);
      if (labelDesc) {
        const description = document.createElement('span');
        description.className = 'chesshook-ui-label-desc';
        description.textContent = labelDesc;
        label.appendChild(description);
      }
      row.appendChild(label);
      parent.appendChild(row);
      return row;
    },

    toggle(parent, checked, onChange) {
      const label = document.createElement('label');
      label.className = 'chesshook-ui-toggle';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(checked);
      const track = document.createElement('span');
      track.className = 'chesshook-ui-toggle-track';
      checkbox.addEventListener('change', () => onChange(checkbox.checked));
      label.append(checkbox, track);
      parent.appendChild(label);
      return checkbox;
    },

    input(parent, value, onChange, type, placeholder) {
      const element = document.createElement('input');
      element.type = type || 'text';
      element.value = value == null ? '' : value;
      element.placeholder = placeholder || '';
      element.addEventListener('change', () => onChange(element.value));
      parent.appendChild(element);
      return element;
    },

    number(parent, value, onChange, min, max, step) {
      const element = document.createElement('input');
      element.type = 'number';
      element.className = 'chesshook-ui-number';
      element.value = value;
      if (min != null) element.min = min;
      if (max != null) element.max = max;
      if (step != null) element.step = step;
      element.addEventListener('change', () => onChange(Number(element.value)));
      parent.appendChild(element);
      return element;
    },

    slider(parent, label, value, onChange, min, max, step) {
      const row = this.row(parent, label);
      const control = document.createElement('div');
      control.className = 'chesshook-ui-control';
      const range = document.createElement('input');
      range.type = 'range';
      range.min = min;
      range.max = max;
      range.step = step;
      range.value = value;
      const numeric = this.number(control, value, next => {
        range.value = next;
        onChange(next);
      }, min, max, step);
      range.addEventListener('input', () => {
        numeric.value = range.value;
        onChange(Number(range.value));
      });
      control.insertBefore(range, numeric);
      row.appendChild(control);
      return { range, number: numeric };
    },

    color(parent, value, onChange) {
      const element = document.createElement('input');
      element.type = 'color';
      element.value = value;
      element.addEventListener('input', () => onChange(element.value));
      parent.appendChild(element);
      return element;
    },

    button(parent, text, onClick, primary) {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = `chesshook-ui-button${primary ? ' chesshook-ui-button-primary' : ''}`;
      element.textContent = text;
      element.addEventListener('click', onClick);
      parent.appendChild(element);
      return element;
    }
  };

  const vs = vasara();

  const createExploitWindow = () => {
    UI.toggleWindow('Exploits', 520, body => {
      const scholarsRow = UI.row(body, 'Force Scholars Mate', 'Only works against bots on the computer play page.');
      scholarsRow.classList.add('chesshook-ui-exploit-row');
      UI.button(scholarsRow, 'Execute', () => {
        if (!window.confirm('Force Scholars Mate against the bot?')) return;
        if (!document.location.pathname.startsWith('/play/computer')) return alert('You must be on the computer play page to use this feature.');
        const board = document.querySelector('wc-chess-board');
        if (!board?.game?.move || !board?.game?.getFEN) return alert('You must be in a game to use this feature.');
        if (parseInt(board.game.getFEN().split(' ')[5]) > 1 || board.game.getFEN().split(' ')[1] !== 'w') return alert('It must be turn 1 and white to move to use this feature.');

        board.game.move('e4');
        board.game.move('e5');
        board.game.move('Qf3');
        board.game.move('Nc6');
        board.game.move('Bc4');
        board.game.move('Nb8');
        board.game.move('Qxf7#');
      }, true);

      const drawRow = UI.row(body, 'Force Draw', 'Only works against bots on the computer play page.');
      drawRow.classList.add('chesshook-ui-exploit-row');
      UI.button(drawRow, 'Execute', () => {
        if (!window.confirm('Force a draw against the bot?')) return;
        if (document.location.hostname !== 'www.chess.com') return alert('You must be on chess.com to use this feature.');
        if (!document.location.pathname.startsWith('/play/computer')) return alert('You must be on the computer play page to use this feature.');
        const board = document.querySelector('wc-chess-board');
        if (!board?.game?.move) return alert('You must be in a game to use this feature.');

        board.game.agreeDraw();
      }, true);
    });
  }

  const createConfigWindow = () => {
    UI.toggleWindow('Configuration', 720, body => {
      const configValue = key => vs.queryConfigKey(namespace + '_' + key);
      const setConfig = (key, value) => vs.setConfigValue(namespace + '_' + key, value);
      const setPreference = (group, key, value) => {
        uiPrefs[group][key] = value;
        saveUiPrefs();
        UI.applyPreferences();
      };
      const addToggle = (parent, title, description, key, onChange) => {
        const row = UI.row(parent, title, description);
        UI.toggle(row, configValue(key), value => {
          setConfig(key, value);
          if (onChange) onChange(value);
        });
      };
      const addHotkey = (parent, label, configKey, preferenceKey) => {
        const row = UI.row(parent, label, 'Click the field, then press a key combination.');
        const hotkeyInput = UI.input(row, configValue(configKey), () => {}, 'text', 'Press a hotkey');
        hotkeyInput.readOnly = true;
        hotkeyInput.setAttribute('aria-label', `${label} hotkey`);
        hotkeyInput.addEventListener('keydown', event => {
          if (event.key === 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) return;
          const parts = [];
          if (event.ctrlKey) parts.push('Ctrl');
          if (event.altKey) parts.push('Alt');
          if (event.shiftKey) parts.push('Shift');
          if (event.metaKey) parts.push('Meta');
          const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
          const binding = [...parts, key].join('+');
          hotkeyInput.value = binding;
          setConfig(configKey, binding);
          uiPrefs.hotkeys[preferenceKey] = binding;
          saveUiPrefs();
        });
      };

      const engine = UI.section(body, 'Engine');
      const engineRow = UI.row(engine, 'Engine', 'Choose which engine to use.');
      const engineSelect = document.createElement('select');
      for (const [value, label] of [['none', 'None'], ['betafish', 'Betafish'], ['random', 'Random'], ['cccp', 'CCCP'], ['external', 'External']]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        engineSelect.appendChild(option);
      }
      engineSelect.value = configValue('whichengine');
      engineSelect.addEventListener('change', () => setConfig('whichengine', engineSelect.value));
      engineRow.appendChild(engineSelect);
      UI.slider(engine, 'Betafish thinking time (ms)', configValue('betafishthinkingtime'), value => setConfig('betafishthinkingtime', value), 0, 20000, 100);
      UI.input(UI.row(engine, 'External engine URL', 'WebSocket URL for the external engine.'),
        configValue('externalengineurl'), value => setConfig('externalengineurl', value), 'text', 'ws://localhost:8080/ws');
      UI.input(UI.row(engine, 'External engine passkey', 'Passkey used to authenticate with the engine.'),
        configValue('externalenginepasskey'), value => setConfig('externalenginepasskey', value), 'password', 'Passkey');

      const autoMove = UI.section(body, 'Auto Move');
      addToggle(autoMove, 'Auto Move', 'Automatically play the selected engine move.', 'automove');
      UI.slider(autoMove, 'Minimum delay (ms)', configValue('automoveminrandomdelay'), value => setConfig('automoveminrandomdelay', value), 0, 20000, 100);
      UI.slider(autoMove, 'Maximum delay (ms)', configValue('automovemaxrandomdelay'), value => setConfig('automovemaxrandomdelay', value), 0, 20000, 100);
      addToggle(autoMove, 'Speed up game start', 'Instantly play the first five moves.', 'automoveinstamovestart');

      const autoQueue = UI.section(body, 'Auto Queue');
      addToggle(autoQueue, 'Auto Queue', 'Automatically queue for the next game.', 'autoqueue');

      const puzzles = UI.section(body, 'Puzzles');
      addToggle(puzzles, 'Puzzle solver', 'Automatically solve puzzles.', 'puzzlemode');
      addToggle(puzzles, 'API mode', 'Use the API to solve puzzles.', 'apipuzzlemode');

      const visuals = UI.section(body, 'Visuals');
      addToggle(visuals, 'Render threats', 'Show mates, pins, and undefended or underdefended pieces.', 'renderthreats');
      for (const [key, label] of [
        ['renderthreatspincolor', 'Pin color'],
        ['renderthreatsundefendedcolor', 'Undefended color'],
        ['renderthreatsunderdefendedcolor', 'Underdefended color'],
        ['renderthreatsmatecolor', 'Mate color'],
        ['enginemovecolor', 'Engine move color']
      ]) {
        const row = UI.row(visuals, label);
        UI.color(row, configValue(key), value => setConfig(key, value));
      }

      const legitMode = UI.section(body, 'Legit Mode');
      addToggle(legitMode, 'Legit Mode', 'Disable engine, auto move, puzzle solving, and auto queue.', 'legitmode', enabled => {
        if (!enabled) return;
        setConfig('whichengine', 'none');
        setConfig('automove', false);
        setConfig('automoveinstamovestart', false);
        setConfig('puzzlemode', false);
        setConfig('apipuzzlemode', false);
        setConfig('autoqueue', false);
      });

      const appearance = UI.section(body, 'Appearance');
      const themeRow = UI.row(appearance, 'Theme');
      const themeSelect = document.createElement('select');
      for (const theme of ['dark', 'darker', 'midnight', 'light']) {
        const option = document.createElement('option');
        option.value = theme;
        option.textContent = theme[0].toUpperCase() + theme.slice(1);
        themeSelect.appendChild(option);
      }
      themeSelect.value = uiPrefs.appearance.theme;
      themeSelect.addEventListener('change', () => setPreference('appearance', 'theme', themeSelect.value));
      themeRow.appendChild(themeSelect);
      UI.slider(appearance, 'UI scale (%)', uiPrefs.appearance.scale,
        value => setPreference('appearance', 'scale', value), 80, 120, 5);
      const glassRow = UI.row(appearance, 'Glassmorphism', 'Use a soft translucent panel background.');
      UI.toggle(glassRow, uiPrefs.appearance.glass, value => setPreference('appearance', 'glass', value));

      const hotkeys = UI.section(body, 'Hotkeys');
      addHotkey(hotkeys, 'Configuration window', 'configwindowhotkey', 'config');
      addHotkey(hotkeys, 'Exploit window', 'exploitwindowhotkey', 'exploit');
      addHotkey(hotkeys, 'Console window', 'consolewindowhotkey', 'console');

      const boardOverlays = UI.section(body, 'Board Overlays');
      for (const [key, label] of [
        ['arrowOpacity', 'Arrow opacity'],
        ['coordinates', 'Coordinate labels'],
        ['lastMoveHighlight', 'Last-move highlight']
      ]) {
        const row = UI.row(boardOverlays, label);
        UI.toggle(row, uiPrefs.board[key], value => setPreference('board', key, value));
      }
      const lastMoveColorRow = UI.row(boardOverlays, 'Last-move highlight color');
      UI.color(lastMoveColorRow, uiPrefs.board.lastMoveColor,
        value => setPreference('board', 'lastMoveColor', value));

      const diagnostics = UI.section(body, 'Diagnostics');
      const diagnosticGrid = document.createElement('div');
      diagnosticGrid.className = 'chesshook-ui-diagnostics';
      diagnostics.appendChild(diagnosticGrid);
      const makeDiagnostic = label => {
        const cell = document.createElement('div');
        cell.className = 'chesshook-ui-diagnostic';
        cell.appendChild(document.createTextNode(label));
        const value = document.createElement('strong');
        value.textContent = '—';
        cell.appendChild(value);
        diagnosticGrid.appendChild(cell);
        return value;
      };
      const fpsValue = makeDiagnostic('FPS');
      const engineValue = makeDiagnostic('Current engine');
      const fenValue = makeDiagnostic('FEN hash');
      let frameCount = 0;
      let lastSample = performance.now();
      const updateDiagnostics = timestamp => {
        if (!body.isConnected || body.closest('.chesshook-closing')) return;
        frameCount++;
        if (timestamp - lastSample >= 1000) {
          fpsValue.textContent = String(Math.round(frameCount * 1000 / (timestamp - lastSample)));
          frameCount = 0;
          lastSample = timestamp;
          engineValue.textContent = String(configValue('whichengine') || 'none');
          const board = document.querySelector('wc-chess-board');
          const fen = board?.game?.getFEN ? board.game.getFEN() : '';
          let hash = 5381;
          for (let index = 0; index < fen.length; index++) hash = ((hash << 5) + hash) ^ fen.charCodeAt(index);
          fenValue.textContent = fen ? (hash >>> 0).toString(16).padStart(8, '0') : 'Unavailable';
        }
        requestAnimationFrame(updateDiagnostics);
      };
      requestAnimationFrame(updateDiagnostics);
      UI.button(diagnostics, 'Copy diagnostics', () => {
        const report = `FPS: ${fpsValue.textContent}\nEngine: ${engineValue.textContent}\nFEN hash: ${fenValue.textContent}`;
        if (!navigator.clipboard?.writeText) {
          alert('Clipboard access is unavailable in this browser.');
          return;
        }
        navigator.clipboard.writeText(report).then(() => {
          addToConsole('Diagnostics copied to clipboard.');
        }).catch(error => {
          console.error('Could not copy diagnostics:', error);
          alert('Could not copy diagnostics. Check clipboard permissions.');
        });
      }, true);

      const about = UI.section(body, 'About');
      const version = typeof GM_info !== 'undefined' && GM_info.script ? GM_info.script.version : '2.3';
      const versionRow = document.createElement('div');
      versionRow.className = 'chesshook-ui-about';
      versionRow.textContent = version;
      about.appendChild(versionRow);
    });
  }

  const consoleQueue = [];
  const createConsoleWindow = () => {
    UI.toggleWindow('Console', 720, (body, { win }) => {
      win.setAttribute('tag', namespace + '_consolewindowtag');
      body.setAttribute('tag', namespace + '_consolewindowcontent');
      body.classList.add('chesshook-console-body');
      if (consoleQueue.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'chesshook-ui-empty chesshook-console-empty';
        empty.textContent = 'No console messages yet.';
        body.appendChild(empty);
      }
      while (consoleQueue.length > 0) addConsoleLineElement(consoleQueue.shift());
    });
  }

  const addConsoleLineElement = (text) => {
    const consoleWindow = document.querySelector(`[tag=${namespace}_consolewindowtag]`);
    const consoleContent = consoleWindow?.querySelector(`[tag=${namespace}_consolewindowcontent]`);

    if (!consoleWindow || !consoleContent) {
      return console.warn('Cannot add console line');
    }

    const line = document.createElement('div');
    line.className = 'chesshook-console-line';
    line.textContent = text;
    consoleContent.querySelector('.chesshook-console-empty')?.remove();
    consoleContent.appendChild(line);
  }

  const addToConsole = (text) => {
    const consoleWindow = document.querySelector(`[tag=${namespace}_consolewindowtag]`);
    const consoleContent = consoleWindow?.querySelector(`[tag=${namespace}_consolewindowcontent]`);

    if (!consoleWindow || !consoleContent) {
      consoleQueue.push(text);
      return;
    }

    addConsoleLineElement(text);
  }

  const namespace = 'chesshook';

  window[namespace] = {};

  const externalEngineWorkerFunc = () => {
    const minIntermediaryVersion = 1;

    self.uciQueue = [];
    self.hasLock = false;
    self.wsPath = null;
    self.whatEngine = null;
    self.intermediaryVersionString = null;
    self.ws = null;
    self.enginePassKey = null;
    self.closeWs = () => {
      if (self.ws !== null) {
        self.ws.close();
        self.ws = null;
      }
    };
    self.openWs = (url) => {
      self.closeWs();
      self.ws = new WebSocket(url);
      self.ws.onopen = () => {
        self.postMessage({ type: 'DEBUG', payload: 'Connected to engine intermediary' });
        self.send('whoareyou');
      };
      self.ws.onclose = () => {
        self.postMessage({ type: 'DEBUG', payload: 'Disconnected from engine' });
        self.postMessage({ type: 'WSCLOSE' });
        self.intermediaryVersionString = null;
      };
      self.ws.onerror = (e) => {
        self.postMessage({ type: 'ERROR', payload: 'Error with engine: ', err: e });
      };
      self.ws.onmessage = (e) => {
        const data = e.data;
        if (data.startsWith('iam ')) {
          response = data.substring(4);
          self.intermediaryVersionString = response;
          self.postMessage({ type: 'MESSAGE', payload: 'Connected to engine intermediary version ' + response });
          let parts = response.split('v');
          if (!parts[1] || parseInt(parts[1]) < minIntermediaryVersion) {
            self.postMessage({ type: 'ERROR', payload: 'Engine intermediary version is too old or did not provide a valid version string. Please update it.' });
            self.closeWs();
          }
          self.send('whatengine');
        } else if (data.startsWith('auth')) {
          if (data === 'authok') {
            self.postMessage({ type: 'MESSAGE', payload: 'Engine authentication successful' });
          } else {
            if (!self.enginePassKey) {
              self.postMessage({ type: 'NEEDAUTH' });
            } else {
              self.postMessage({ type: 'ERROR', payload: 'Engine authentication failed' });
            }
          }
        } else if (data.startsWith('sub')) {
          if (data === 'subok') {
          } else {
            self.postMessage({ type: 'ERROR', payload: 'Engine subscription failed' });
          }
        } else if (data.startsWith('unsub')) {
          if (data === 'unsubok') {
          } else {
            self.postMessage({ type: 'ERROR', payload: 'Engine unsubscription failed' });
          }
        } else if (data.startsWith('lock')) {
          if (data === 'lockok') {
            self.hasLock = true;
            while (self.uciQueue.length > 0) {
              self.send(self.uciQueue.shift());
            }
          } else {
            self.postMessage({ type: 'ERROR', payload: 'Engine lock failed' });
          }
        } else if (data.startsWith('unlock')) {
          if (data === 'unlockok') {
            self.hasLock = false;
          } else {
            self.postMessage({ type: 'ERROR', payload: 'Engine unlock failed' });
          }
        } else if (data.startsWith('engine')) {
          self.whichEngine = data.split(' ')[1];
          self.postMessage({ type: 'ENGINE', payload: self.whichEngine });
        } else if (data.startsWith('bestmove')) {
          const bestMove = data.split(' ')[1];
          self.postMessage({ type: 'BESTMOVE', payload: bestMove });
          self.send('unsub');
          self.send('unlock');
        } else {
          self.postMessage({ type: 'UCI', payload: data });
        }
      };
    };
    self.send = (data) => {
      if (self.ws === null) return self.postMessage({ type: 'ERROR', payload: 'No connection to engine', err: null });
      self.ws.send(data);
    };
    self.addEventListener('message', e => {
      if (e.data.type === 'UCI') {
        if (!e.data.payload) return self.postMessage({ type: 'ERROR', payload: 'No UCI command provided' });
        if (!self.ws) return self.postMessage({ type: 'ERROR', payload: 'No connection to engine' });
        if (self.hasLock) {
          self.send(e.data.payload);
        } else {
          self.uciQueue.push(e.data.payload);
        }
      } else if (e.data.type === 'INIT') {
        if (!e.data.payload) return self.postMessage({ type: 'ERROR', payload: 'No URL provided' });
        if (!e.data.payload.startsWith('ws://')) return self.postMessage({ type: 'ERROR', payload: 'URL must start with ws://' });
        self.openWs(e.data.payload);
        self.wsPath = e.data.payload;
      } else if (e.data.type === 'AUTH') {
        if (!e.data.payload) return self.postMessage({ type: 'ERROR', payload: 'No auth provided' });
        self.enginePassKey = e.data.payload;
        self.send('auth ' + e.data.payload);
      } else if (e.data.type === 'SUB') {
        self.send('sub');
      } else if (e.data.type === 'UNSUB') {
        self.send('unsub');
      } else if (e.data.type === 'LOCK') {
        if (self.hasLock) return self.postMessage({ type: 'ERROR', payload: 'Already have lock' });
        self.send('lock');
      } else if (e.data.type === 'UNLOCK') {
        self.send('unlock');
      } else if (e.data.type === 'WHATENGINE') {
        self.send('whatengine');
      } else if (e.data.type === 'GETMOVE') {
        if (!e.data.payload?.fen) return self.postMessage({ type: 'ERROR', payload: 'No FEN provided' });
        if (!e.data.payload?.go) return self.postMessage({ type: 'ERROR', payload: 'No go command provided' });
        self.send('lock');
        self.send('sub');
        self.send('position fen ' + e.data.payload.fen);
        self.send(e.data.payload.go);
      } else if (e.data.type === 'STOP') {
        if (self.hasLock) {
          self.send('stop');
          self.send('unsub');
          self.send('unlock');
        }
      }
    });
  }

  const externalEngineWorkerBlob = new Blob([`(${externalEngineWorkerFunc.toString()})();`], { type: 'application/javascript' });
  const externalEngineWorkerURL = URL.createObjectURL(externalEngineWorkerBlob);
  const externalEngineWorker = new Worker(externalEngineWorkerURL);

  let externalEngineName = null;

  externalEngineWorker.onmessage = (e) => {
    const maxlines = 50;
    const websocketOutputTextArea = document.getElementById(namespace + '_websocketoutput');
    const engineOutputTextArea = document.getElementById(namespace + '_engineoutput');

    const addToWebSocketOutput = (line) => {
      if (websocketOutputTextArea) {
        const lines = websocketOutputTextArea.value.split('\n');
        lines.push(line);
        if (lines.length > maxlines) {
          lines.shift();
        }
        websocketOutputTextArea.value = lines.join('\n');
      }
    }

    const updateEngineTextarea = (infoLine) => {
      if (engineOutputTextArea) {
        const lines = engineOutputTextArea.value.split('\n');
        const infoParts = infoLine.split(' ');
        const depth = infoParts[infoParts.indexOf('depth') + 1];
        const score = infoParts[infoParts.indexOf('score') + 1] + ' ' + infoParts[infoParts.indexOf('score') + 2];
        const time = infoParts[infoParts.indexOf('time') + 1];
        const bestLine = infoParts.slice(infoParts.indexOf('pv') + 1).join(' ');
        if (depth !== 'info') {
          lines[0] = 'depth ' + depth;
        }
        if (!score.startsWith('info')) {
          lines[1] = 'score ' + score;
        }
        if (time !== 'info') {
          lines[2] = 'time ' + time;
        }
        if (!bestLine.startsWith('info')) {
          lines[3] = 'best line ' + bestLine;
        }

        engineOutputTextArea.value = lines.join('\n');
      }
    }

    if (e.data.type === 'DEBUG') {
      console.debug(e.data.payload);
      addToWebSocketOutput(e.data.payload);
    } else if (e.data.type === 'ERROR') {
      console.error(e.data.payload, e.data.err);
      addToWebSocketOutput(e.data.payload);
    } else if (e.data.type === 'MESSAGE') {
      addToConsole(e.data.payload);
      addToWebSocketOutput(e.data.payload);
    } else if (e.data.type === 'UCI') {
      updateEngineTextarea(e.data.payload);
    } else if (e.data.type === 'ENGINE') {
      externalEngineName = e.data.payload;
      addToWebSocketOutput('Connected to ' + externalEngineName);
    } else if (e.data.type === 'NEEDAUTH') {
      externalEngineWorker.postMessage({ type: 'AUTH', payload: vs.queryConfigKey(namespace + '_externalenginepasskey') });
      addToWebSocketOutput('Attempting to authenticate with passkey ' + vs.queryConfigKey(namespace + '_externalenginepasskey'));
    } else if (e.data.type === 'BESTMOVE') {
      addToConsole(`${externalEngineName} engine computed best move: ${e.data.payload}`);
      handleEngineMove(e.data.payload);
    }
  }

  const betafishWebWorkerFunc = () => {
    self.instance = betafishEngine();
    self.thinking = false;

    const postError = (message) => self.postMessage({ type: 'ERROR', payload: message });
    const isInstanceInitialized = () => self.instance || postError('Betafish not initialized.');

    self.addEventListener('message', e => {
      if (!isInstanceInitialized()) return;

      switch (e.data.type) {
        case 'FEN':
          if (!e.data.payload) return postError('No FEN provided.');
          self.instance.setFEN(e.data.payload);
          break;
        case 'GETMOVE':
          if (self.thinking) return postError('Betafish is already calculating.');
          self.postMessage({ type: 'MESSAGE', payload: 'Betafish received request for best move. Calculating...' });
          self.thinking = true;
          const move = self.instance.getBestMove();
          self.thinking = false;
          self.postMessage({ type: 'MOVE', payload: { move, toMove: self.instance.getFEN().split(' ')[1] } });
          break;
        case 'THINKINGTIME':
          if (isNaN(e.data.payload)) return postError('Invalid thinking time provided.');
          self.instance.setThinkingTime(e.data.payload / 1000);
          self.postMessage({ type: 'DEBUG', payload: `Betafish thinking time set to ${e.data.payload}ms.` });
          break;
        default:
          postError('Invalid message type.');
      }
    });
  };

  const betafishWorkerBlob = new Blob([`const betafishEngine=${betafishEngine.toString()};(${betafishWebWorkerFunc.toString()})();`], { type: 'application/javascript' });
  const betafishWorkerURL = URL.createObjectURL(betafishWorkerBlob);
  const betafishWorker = new Worker(betafishWorkerURL);

  const betafishPieces = { EMPTY: 0, wP: 1, wN: 2, wB: 3, wR: 4, wQ: 5, wK: 6, bP: 7, bN: 8, bB: 9, bR: 10, bQ: 11, bK: 12 };

  betafishWorker.onmessage = e => {
    switch (e.data.type) {
      case 'DEBUG':
      case 'MESSAGE':
        console.info(e.data.payload);
        break;
      case 'ERROR':
        console.error(e.data.payload);
        break;
      case 'MOVE':
        const { move, toMove } = e.data.payload;
        const squareToRankFile = sq => [Math.floor((sq - 21) / 10), sq - 21 - Math.floor((sq - 21) / 10) * 10];
        const from = squareToRankFile(move & 0x7f);
        const to = squareToRankFile((move >> 7) & 0x7f);
        const promoted = (move >> 20) & 0xf;
        const promotedString = promoted !== 0 ? Object.entries(betafishPieces).find(([key, value]) => value === promoted)?.[0].toLowerCase()[1] || '' : '';
        const uciMove = coordsToUCIMoveString(from, to, promotedString);
        addToConsole(`Betafish computed best for ${toMove === 'w' ? 'white' : 'black'}: ${uciMove}`);
        handleEngineMove(uciMove);
        break;
    }
  };

  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const clonedResponse = response.clone();
    clonedResponse.json().then(body => {
      try {
        handleInterception({ url: args[0].url || args[0] }, body);
      } catch (ignored) {
      }
    }).catch(error => console.error('Fetch response clone error:', error));
    return response;
  };

  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._url = new URL(url, window.location.origin).href;
    originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    this.addEventListener('load', () => {
      if (this.readyState === 4 && this.status >= 200 && this.status < 300) {
        try {
          const responseJson = JSON.parse(this.responseText);
          handleInterception({ url: this._url }, responseJson);
        } catch (ignored) {
        }
      }
    });
    originalXHRSend.apply(this, arguments);
  };

  const handleInterception = (req, res) => {
    const urlPath = new URL(req.url).pathname;

    switch (urlPath) {
      case '/rpc/chesscom.puzzles.v1.PuzzleService/GetNextRated':
        if (vs.queryConfigKey(namespace + '_puzzlemode')) {
          if (res.userPuzzle && res.userPuzzle.puzzle) {
            const puzzle = res.userPuzzle.puzzle;

            const fenMatch = puzzle.pgn.match(/\[FEN "(.+?)"\]/);
            const fen = fenMatch ? fenMatch[1] : null;

            const moves = [];
            const rawMoves = [];
            if (puzzle.moves && Array.isArray(puzzle.moves)) {
              for (const moveObj of puzzle.moves) {
                if (moveObj.move) {
                  rawMoves.push(moveObj.move);
                  const from = squareToAlgebraic(moveObj.move.from);
                  const to = squareToAlgebraic(moveObj.move.to);

                  const move = {
                    from: from,
                    to: to,
                    promotion: null,
                    drop: null,
                  };

                  if (moveObj.move.promotionPieceType) {
                    const promotionMap = {
                      'PROMOTION_PIECE_TYPE_QUEEN': 'q',
                      'PROMOTION_PIECE_TYPE_ROOK': 'r',
                      'PROMOTION_PIECE_TYPE_BISHOP': 'b',
                      'PROMOTION_PIECE_TYPE_KNIGHT': 'n'
                    };

                    move.promotion = promotionMap[moveObj.move.promotionPieceType] || null;
                  }

                  moves.push(move);
                }
              }
            }

            if (vs.queryConfigKey(namespace + '_apipuzzlemode')) {
              submitPuzzleSolution(puzzle.legacyPuzzleId, rawMoves);
            } else {
              puzzleQueue.push({
                fen: fen,
                moves: moves,
                tagged: false,
              });
            }
          }
        }
        break;
      case /\/service\/battle\/games\/.*\/puzzles/.test(urlPath) ? urlPath : '':
        if (vs.queryConfigKey(namespace + '_puzzlemode') && res.puzzles && Array.isArray(res.puzzles)) {
          for (const puzzle of res.puzzles) {
            if (puzzle.initialFen) {
              const moves = [];

              if (puzzle.firstMove) {
                const decodedMoves = decodeTCN(puzzle.firstMove);
                if (decodedMoves.length > 0) {
                  moves.push(...decodedMoves);
                }
              }

              if (puzzle.secureMoves && Array.isArray(puzzle.secureMoves)) {
                for (const secureMove of puzzle.secureMoves) {
                  if (secureMove.move) {
                    const decodedMoves = decodeTCN(secureMove.move);
                    if (decodedMoves.length > 0) {
                      moves.push(...decodedMoves);
                    }
                  }

                  if (secureMove.counter) {
                    const decodedCounters = decodeTCN(secureMove.counter);
                    if (decodedCounters.length > 0) {
                      moves.push(...decodedCounters);
                    }
                  }
                }
              }

              puzzleQueue.push({
                fen: puzzle.initialFen,
                moves: moves,
                tagged: false,
              });
            }
          }
        }
        break;
      case '/callback/tactics/rated/next':
        if (vs.queryConfigKey(namespace + '_puzzlemode')) {
          puzzleQueue.push({
            fen: res.initialFen,
            moves: decodeTCN(res.tcnMoveList),
            tagged: false,
          });
        }
        break;
      case '/callback/tactics/challenge/puzzles':
        if (vs.queryConfigKey(namespace + '_puzzlemode')) {
          for (const puzzle of res.puzzles) {
            puzzleQueue.push({
              fen: puzzle.initialFen,
              moves: decodeTCN(puzzle.tcnMoveList),
              tagged: false,
            });
          }
        }
        break;
    }
  }

  const init = () => {
    vs.registerConfigValue({
      key: namespace + '_configwindowhotkey',
      type: 'hotkey',
      display: 'Config Window Hotkey: ',
      description: 'The hotkey to show the conifg window',
      value: 'Alt+K',
      action: createConfigWindow
    });

    vs.registerConfigValue({
      key: namespace + '_consolewindowhotkey',
      type: 'hotkey',
      display: 'Console Window Hotkey: ',
      description: 'The hotkey to show the console window',
      value: 'Alt+C',
      action: createConsoleWindow
    });

    vs.registerConfigValue({
      key: namespace + '_exploitwindowhotkey',
      type: 'hotkey',
      display: 'Exploit Window Hotkey: ',
      description: 'The hotkey to show the exploit window',
      value: 'Alt+L',
      action: createExploitWindow
    });

    for (const [preferenceKey, configKey] of [
      ['config', 'configwindowhotkey'],
      ['exploit', 'exploitwindowhotkey'],
      ['console', 'consolewindowhotkey']
    ]) {
      if (uiPrefs.hotkeys[preferenceKey]) {
        vs.setConfigValue(namespace + '_' + configKey, uiPrefs.hotkeys[preferenceKey]);
      }
    }

    vs.registerConfigValue({
      key: namespace + '_renderthreats',
      type: 'checkbox',
      display: 'Render Threats: ',
      description: 'Render mates, undefended pieces, underdefended pieces, and pins.',
      value: true
    });

    vs.registerConfigValue({
      key: namespace + '_renderthreatspincolor',
      type: 'color',
      display: 'Pin Color: ',
      description: 'The color to render pins in',
      value: '#3333ff',
      showOnlyIf: () => vs.queryConfigKey(namespace + '_renderthreats')
    });

    vs.registerConfigValue({
      key: namespace + '_renderthreatsundefendedcolor',
      type: 'color',
      display: 'Undefended Color: ',
      description: 'The color to render undefended pieces in',
      value: '#ffff00',
      showOnlyIf: () => vs.queryConfigKey(namespace + '_renderthreats')
    });

    vs.registerConfigValue({
      key: namespace + '_renderthreatsunderdefendedcolor',
      type: 'color',
      display: 'Underdefended Color: ',
      description: 'The color to render underdefended pieces in',
      value: '#ff6666',
      showOnlyIf: () => vs.queryConfigKey(namespace + '_renderthreats')
    });

    vs.registerConfigValue({
      key: namespace + '_renderthreatsmatecolor',
      type: 'color',
      display: 'Mate Color: ',
      description: 'The color to render mates in',
      value: '#ff0000',
      showOnlyIf: () => vs.queryConfigKey(namespace + '_renderthreats')
    });

    vs.registerConfigValue({
      key: namespace + '_cleararrowskey',
      type: 'hotkey',
      display: 'Clear Arrows Hotkey: ',
      description: 'The hotkey to clear arrows',
      value: 'Alt+L',
      action: () => {
        const board = document.querySelector('wc-chess-board');
        if (!board) return;
        board.game.markings.removeAll();
      }
    });

    vs.registerConfigValue({
      key: namespace + '_autoqueue',
      type: 'checkbox',
      display: 'Auto Queue: ',
      description: 'Attempts to automatically queue for games.',
      value: false
    });

    vs.registerConfigValue({
      key: namespace + '_legitmode',
      type: 'checkbox',
      display: 'Legit Mode: ',
      description: 'Prevents the script from doing anything that could be considered cheating.',
      value: false,
      callback: () => {
        vs.setConfigValue('whichEngine', 'none');
        vs.setConfigValue('autoMove', false);
        vs.setConfigValue('puzzleMode', false);
      }
    });

    vs.registerConfigValue({
      key: namespace + '_playingas',
      type: 'dropdown',
      display: 'Playing As: ',
      description: 'What color to calculate moves for',
      value: 'both',
      options: ['white', 'black', 'auto'],
      showOnlyIf: () => !vs.queryConfigKey(namespace + '_legitmode') && !vs.queryConfigKey(namespace + '_puzzlemode')
    });

    vs.registerConfigValue({
      key: namespace + '_enginemovecolor',
      type: 'color',
      display: 'Engine Move Color: ',
      description: 'The color to render the engine\'s move in',
      value: '#77ff77',
      showOnlyIf: () => !vs.queryConfigKey(namespace + '_legitmode') && !vs.queryConfigKey(namespace + '_puzzlemode')
    });

    vs.registerConfigValue({
      key: namespace + '_whichengine',
      type: 'dropdown',
      display: 'Which Engine: ',
      description: 'Which engine to use',
      value: 'none',
      options: ['betafish', 'random', 'cccp', 'external'],
      showOnlyIf: () => !vs.queryConfigKey(namespace + '_legitmode') && !vs.queryConfigKey(namespace + '_puzzlemode'),
      callback: () => {
        if (vs.queryConfigKey(namespace + '_whichengine') !== 'external') {
          return;
        }
        if (!vs.queryConfigKey(namespace + '_externalengineurl')) {
          addToConsole('Please set the path to the external engine in the config.');
          return;
        }
        externalEngineWorker.postMessage({ type: 'INIT', payload: vs.queryConfigKey(namespace + '_externalengineurl') });

        if (!vs.queryConfigKey(namespace + '_haswarnedaboutexternalengine') || vs.queryConfigKey(namespace + '_haswarnedaboutexternalengine') === 'false') {
          addToConsole('Please note that the external engine is not for the faint of heart. It requires tinkering and the user to host the chesshook intermediary server.');
          alert('Please note that the external engine is not for the faint of heart. It requires tinkering and the user to host the chesshook intermediary server.')
          vs.setConfigValue(namespace + '_haswarnedaboutexternalengine', true);
        }
      }
    });

    vs.registerConfigValue({
      key: namespace + '_betafishthinkingtime',
      type: 'number',
      display: 'Betafish Thinking Time: ',
      description: 'The amount of time in ms to think for each move',
      value: 1000,
      min: 0,
      max: 20000,
      step: 100,
      showOnlyIf: () => !vs.queryConfigKey(namespace + '_legitmode') && vs.queryConfigKey(namespace + '_whichengine') === 'betafish',
      callback: () => {
        betafishWorker.postMessage({ type: 'THINKINGTIME', payload: parseFloat(vs.queryConfigKey(namespace + '_betafishthinkingtime')) });
      }
    });

    vs.registerConfigValue({
      key: namespace + '_externalengineurl',
      type: 'text',
      display: 'External Engine URL: ',
      description: 'The URL of the external engine',
      value: 'ws://localhost:8080/ws',
      showOnlyIf: () => !vs.queryConfigKey(namespace + '_legitmode') && vs.queryConfigKey(namespace + '_whichengine') === 'external',
      callback: v => externalEngineWorker.postMessage({ type: 'INIT', payload: v })
    });

    vs.registerConfigValue({
      key: namespace + '_externalengineautogocommand',
      type: 'checkbox',
      display: 'External Engine Auto Go Command: ',
      description: 'Automatically determine the go command based on the time left in the game',
      value: true,
      showOnlyIf: () => !vs.queryConfigKey(namespace + '_legitmode') && vs.queryConfigKey(namespace + '_whichengine') === 'external'
    });

    vs.registerConfigValue({
      key: namespace + '_externalenginegocommand',
      type: 'text',
      display: 'External Engine Go Command: ',
      description: 'The command to send to the external engine to start thinking',
      value: 'go movetime 1000',
      showOnlyIf: () => !vs.queryConfigKey(namespace + '_legitmode') && vs.queryConfigKey(namespace + '_whichengine') === 'external' && !vs.queryConfigKey(namespace + '_externalengineautogocommand')
    });

    vs.registerConfigValue({
      key: namespace + '_externalenginepasskey',
      type: 'text',
      display: 'External Engine Passkey: ',
      description: 'The passkey to send to the external engine to authenticate',
      value: 'passkey',
      showOnlyIf: () => !vs.queryConfigKey(namespace + '_legitmode') && vs.queryConfigKey(namespace + '_whichengine') === 'external',
      callback: v => externalEngineWorker.postMessage({ type: 'AUTH', payload: v })
    });

    vs.registerConfigValue({
      key: namespace + '_automove',
      type: 'checkbox',
      display: 'Auto Move: ',
      description: 'Potentially bannable. Tries to randomize move times to avoid detection.',
      value: false,
      showOnlyIf: () => !vs.queryConfigKey(namespace + '_legitmode') && !vs.queryConfigKey(namespace + '_puzzlemode')
    });

    vs.registerConfigValue({
      key: namespace + '_automovemaxrandomdelay',
      type: 'number',
      display: 'Move time target range max: ',
      description: 'The maximum delay in ms for automove to target',
      value: 1000,
      min: 0,
      max: 20000,
      step: 100,
      showOnlyIf: () => !vs.queryConfigKey(namespace + '_legitmode') && vs.queryConfigKey(namespace + '_automove')
    });

    vs.registerConfigValue({
      key: namespace + '_automoveminrandomdelay',
      type: 'number',
      display: 'Move time target range min: ',
      description: 'The minimum delay in ms for automove to target',
      value: 500,
      min: 0,
      max: 20000,
      step: 100,
      showOnlyIf: () => !vs.queryConfigKey(namespace + '_legitmode') && vs.queryConfigKey(namespace + '_automove')
    });

    vs.registerConfigValue({
      key: namespace + '_automoveinstamovestart',
      type: 'checkbox',
      display: 'Speed up game start: ',
      description: 'Instantly move first 5',
      value: true,
      showOnlyIf: () => !vs.queryConfigKey(namespace + '_legitmode') && vs.queryConfigKey(namespace + '_automove')
    });

    vs.registerConfigValue({
      key: namespace + '_puzzlemode',
      type: 'checkbox',
      display: 'Solves puzzles: ',
      description: 'Solves puzzles automatically',
      value: false,
      callback: () => {
        vs.setConfigValue('whichEngine', 'none');
        vs.setConfigValue('autoMove', false);
      }
    });

    vs.registerConfigValue({
      key: namespace + '_apipuzzlemode',
      type: 'checkbox',
      display: 'Use the API for puzzles: ',
      description: 'Uses the API to solve puzzles',
      value: false,
      showOnlyIf: () => vs.queryConfigKey(namespace + '_puzzlemode')
    });

    vs.registerConfigValue({
      key: namespace + '_apipuzzletimemode',
      type: 'dropdown',
      display: 'Puzzle Time Mode: ',
      description: 'The time mode to use for the API puzzles',
      value: 'zero',
      options: ['hour', 'legit'],
      showOnlyIf: () => vs.queryConfigKey(namespace + '_puzzlemode') && vs.queryConfigKey(namespace + '_apipuzzlemode')
    })

    vs.registerConfigValue({
      key: namespace + '_refreshhotkey',
      type: 'hotkey',
      display: 'Refresh Hotkey: ',
      description: 'Force some values to reload in order to try to "unstuck" some features',
      value: 'Alt+R',
      action: () => {
        if (window.location.pathname.startsWith('/puzzles')) {
          window.location.reload();
        } else {
          engineLastKnownFEN = null;
        }
      }
    });

    vs.registerConfigValue({
      key: namespace + '_renderwindow',
      type: 'hidden',
      value: true
    });

    vs.registerConfigValue({
      key: namespace + '_haswarnedaboutexternalengine',
      type: 'hidden',
      value: false
    });

    vs.loadPersistentState();

    addToConsole(`Loaded! This is version ${GM_info.script.version}`);
    addToConsole(`Github: https://github.com/0mlml/chesshook`);
    if (vs.queryConfigKey(namespace + '_externalengineurl') && vs.queryConfigKey(namespace + '_whichengine') === 'external') {
      externalEngineWorker.postMessage({ type: 'INIT', payload: vs.queryConfigKey(namespace + '_externalengineurl') });
    }
  }

  function squareToAlgebraic(squareEnum) {
    if (typeof squareEnum === 'string' && squareEnum.startsWith('SQUARE_')) {
      const file = squareEnum.charAt(7).toLowerCase();
      const rank = squareEnum.charAt(8);
      return file + rank;
    }
    return null;
  }


  const decodeTCN = (n) => {
    const tcnChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?{~}(^)[_]@#$,./&-*++=";
    const pieceChars = "qnrbkp";
    let moves = [];

    for (let i = 0; i < n.length; i += 2) {
      let move = {
        from: null,
        to: null,
        drop: null,
        promotion: null,
      };

      let o = tcnChars.indexOf(n[i]);
      let s = tcnChars.indexOf(n[i + 1]);

      if (s > 63) {
        move.promotion = pieceChars[Math.floor((s - 64) / 3)];
        s = o + (o < 16 ? -8 : 8) + ((s - 1) % 3) - 1;
      }

      if (o > 75) {
        move.drop = pieceChars[o - 79];
      } else {
        move.from = tcnChars[o % 8] + String(Math.floor(o / 8) + 1);
      }

      move.to = tcnChars[s % 8] + String(Math.floor(s / 8) + 1);
      moves.push(move);
    }

    return moves;
  }

  const getPieceValue = (piece, scoreActivity = false) => {
    return {
      'p': 1,
      'n': 3,
      'b': 3,
      'r': 5,
      'q': 9,
      'k': scoreActivity ? -3 : 99
    }[piece.toLowerCase()];
  }

  const xyToCoordInverted = (x, y) => {
    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const file = letters[y];
    const rank = x + 1;
    return file + rank;
  }

  const coordToYX = (coord) => {
    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const file = letters.indexOf(coord[0]) + 1;
    const rank = Number(coord[1]);
    return [file, rank];
  }

  const coordsToUCIMoveString = (from, to, promotion) => {
    return xyToCoordInverted(from[0], from[1]) + xyToCoordInverted(to[0], to[1]) + promotion;
  }

  let renderThreatsLastKnownFEN = null;
  const renderThreats = () => {
    let board = document.querySelector('wc-chess-board');
    if (renderThreatsLastKnownFEN === board.game.getFEN()) return;
    renderThreatsLastKnownFEN = board.game.getFEN();

    board.game.markings.removeAll();

    const threats = board.game.getJCEGameCopy().threats();

    for (let pin of threats.pins) {
      board.game.markings.addOne({ type: 'highlight', data: { color: vs.queryConfigKey(namespace + '_renderthreatspincolor'), square: pin } });
    }

    for (let undefended of threats.undefended) {
      board.game.markings.addOne({ type: 'arrow', data: { color: vs.queryConfigKey(namespace + '_renderthreatsundefendedcolor'), from: undefended.substring(0, 2), to: undefended.substring(2, 4) } });
    }

    for (let underdefended of threats.underdefended) {
      board.game.markings.addOne({ type: 'arrow', data: { color: vs.queryConfigKey(namespace + '_renderthreatsunderdefendedcolor'), from: underdefended.substring(0, 2), to: underdefended.substring(2, 4) } });
    }

    for (let mate of threats.mates) {
      board.game.markings.addOne({ type: 'arrow', data: { color: vs.queryConfigKey(namespace + '_renderthreatsmatecolor'), from: mate.substring(0, 2), to: mate.substring(2, 4) } });
    }
  }

  const resolveAfterMs = (ms = 1000) => {
    if (ms <= 0) return new Promise(res => res());
    return new Promise(res => setTimeout(res, ms));
  }

  const mergeMoveToUCI = (move) => move.from + move.to + (move.promotion ? move.promotion : '');

  const cccpEngine = () => {
    const board = document.querySelector('wc-chess-board');

    const legalMoves = board.game.getLegalMoves();

    if (legalMoves.length === 0) return;

    const checkmates = legalMoves.filter(m => m.san.includes('#'));

    if (checkmates.length > 0) {
      return mergeMoveToUCI(checkmates[0]);
    }


    const checks = legalMoves.filter(m => m.san.includes('+'));
    const captureMoves = legalMoves.filter(m => m.san.includes('x'));

    const goodCaptureExists = captureMoves.some(m => {
      const capturedValue = getPieceValue(m.captured, true);
      return capturedValue > 4 || getPieceValue(m.piece, true) < capturedValue;
    });

    if (checks.length > 0 && !goodCaptureExists) {
      return mergeMoveToUCI(checks[0]);
    }

    if (captureMoves.length > 0) {
      return mergeMoveToUCI(captureMoves.sort((a, b) => (getPieceValue(b.captured) - getPieceValue(b.piece) + getPieceValue(b.captured) * 0.1) - (getPieceValue(a.captured) - getPieceValue(b.piece) + getPieceValue(a.captured) * 0.1))[0]);
    }

    const pushes = legalMoves.sort((a, b) => {
      let scoreA = getPieceValue(a.piece, true);
      let scoreB = getPieceValue(b.piece, true);

      const columnScores = { 'a': -1, 'b': 0, 'c': 1, 'd': 3, 'e': 3, 'f': 1, 'g': 0, 'h': -1 };

      scoreA += columnScores[a.to[0]];
      scoreB += columnScores[b.to[0]];

      const scorePush = (to, isWhite) => {
        const toRow = parseInt(to[1]);

        return isWhite ? toRow : 9 - toRow;
      }

      scoreA += scorePush(a.to, a.color === 1);
      scoreB += scorePush(b.to, b.color === 1);

      a.score = scoreA;
      b.score = scoreB;
      return scoreB - scoreA;
    });

    return mergeMoveToUCI(pushes[0]);
  }

  const isMyTurn = () => {
    const board = document.querySelector('wc-chess-board');
    const fen = board.game.getFEN();

    if (vs.queryConfigKey(namespace + '_playingas') !== 'both') {
      if ((vs.queryConfigKey(namespace + '_playingas') === 'white' && fen.split(' ')[1] === 'b') ||
        (vs.queryConfigKey(namespace + '_playingas') === 'black' && fen.split(' ')[1] === 'w')) {
        return false;
      }
    }

    if (vs.queryConfigKey(namespace + '_playingas') === 'auto') {
      const playingAs = board.game.getPlayingAs() === 1 ? 'w' : board.game.getPlayingAs() === 2 ? 'b' : null;
      return playingAs === null || fen.split(' ')[1] === playingAs;
    }

    return true;
  }

  let lastEngineMoveCalcStartTime = performance.now();

  let engineLastKnownFEN = null;
  const getEngineMove = () => {
    const board = document.querySelector('wc-chess-board');

    const fen = board.game.getFEN();
    if (!fen || engineLastKnownFEN === fen) return;
    engineLastKnownFEN = board.game.getFEN();

    if (!isMyTurn()) return;

    addToConsole(`Calculating move based on engine: ${vs.queryConfigKey(namespace + '_whichengine')}...`);

    if (vs.queryConfigKey(namespace + '_automoveinstamovestart') && parseInt(fen.split(' ')[5]) < 6) lastEngineMoveCalcStartTime = 0;
    else lastEngineMoveCalcStartTime = performance.now();

    if (vs.queryConfigKey(namespace + '_whichengine') === 'betafish') {
      betafishWorker.postMessage({ type: 'FEN', payload: fen });
      betafishWorker.postMessage({ type: 'GETMOVE' });
    } else if (vs.queryConfigKey(namespace + '_whichengine') === 'external') {
      if (!externalEngineName) {
        addToConsole('External engine appears to be disconnected. Please check the config.');
        return;
      }
      let goCommand = vs.queryConfigKey(namespace + '_externalengineautogocommand');
      if (!vs.queryConfigKey(namespace + '_externalengineautogocommand') && (!goCommand || !goCommand.includes('go'))) {
        addToConsole('External engine go command is invalid. Please check the config.');
        return;
      } else if (vs.queryConfigKey(namespace + '_externalengineautogocommand')) {
        goCommand = 'go';
        if (board?.game?.timeControl && board.game.timeControl.get() && board.game.timestamps.get) {
          const increment = board.game.timeControl.get().increment;
          const baseTime = board.game.timeControl.get().baseTime;
          let whiteTime = baseTime
          let blackTime = baseTime;
          const timestamps = board.game.timestamps.get();
          for (let i in timestamps) {
            if (i % 2 === 0) {
              whiteTime -= timestamps[i] * 100;
              whiteTime += increment;
            } else {
              blackTime -= timestamps[i] * 100;
              blackTime += increment;
            }
          }
          goCommand += ` wtime ${whiteTime} btime ${blackTime} winc ${increment} binc ${increment}`;
        } else {
          goCommand += ' depth 20';
        }
      }
      addToConsole('External engine is: ' + externalEngineName);
      externalEngineWorker.postMessage({ type: 'GETMOVE', payload: { fen: fen, go: goCommand } });
    } else if (vs.queryConfigKey(namespace + '_whichengine') === 'random') {
      const legalMoves = document.querySelector('wc-chess-board').game.getLegalMoves()
      const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];

      addToConsole(`Random computed move: ${randomMove.san}`);
      handleEngineMove(randomMove.from + randomMove.to + (randomMove.promotion ? randomMove.promotion : ''));
    } else if (vs.queryConfigKey(namespace + '_whichengine') === 'cccp') {
      const move = cccpEngine();
      if (!move) return;

      addToConsole(`CCCP computed move: ${move}`);
      handleEngineMove(move);
    }
  }

  const calculateDOMSquarePosition = (square, fromDoc = true) => {
    const board = document.getElementsByTagName('wc-chess-board')[0];
    if (!board?.game) return;

    const { left, top, width } = board.getBoundingClientRect();
    const squareWidth = width / 8;
    const correction = squareWidth / 2;

    const coords = coordToYX(square);
    if (!board.game.getOptions().flipped) {
      return {
        x: left + squareWidth * coords[0] - correction,
        y: top + width - squareWidth * coords[1] + correction,
      };
    } else {
      return {
        x: left + width - squareWidth * coords[0] + correction,
        y: top + squareWidth * coords[1] - correction,
      };
    }
  }

  let handleMoveLastKnownMarking = null;

  const handleEngineMove = (uciMove) => {
    const board = document.querySelector('wc-chess-board');
    if (!board?.game) return false;

    if (!vs.queryConfigKey(namespace + '_renderthreats')) board.game.markings.removeAll();

    const marking = { type: 'arrow', data: { color: vs.queryConfigKey(namespace + '_enginemovecolor'), from: uciMove.substring(0, 2), to: uciMove.substring(2, 4) } };
    if (handleMoveLastKnownMarking) board.game.markings.removeOne(handleMoveLastKnownMarking);
    board.game.markings.addOne(marking);
    handleMoveLastKnownMarking = marking;

    if (!vs.queryConfigKey(namespace + '_automove')) {
      return;
    }

    let max = vs.queryConfigKey(namespace + '_automovemaxrandomdelay'), min = vs.queryConfigKey(namespace + '_automoveminrandomdelay');
    if (min > max) {
      min = max;
    }

    const delay = (Math.floor(Math.random() * (max - min)) + min) - (performance.now() - lastEngineMoveCalcStartTime);

    resolveAfterMs(delay).then(() => {
      if (['/play/computer', '/analysis'].some(p => document.location.pathname.startsWith(p))) {
        board.game.move(uciMove);
      } else {
        if (uciMove.length > 4) {
          board.game.move({
            from: uciMove.substring(0, 2),
            to: uciMove.substring(2, 4),
            promotion: uciMove.substring(4, 5),
            animate: false,
            userGenerated: true
          });
        } else {
          const fromPos = calculateDOMSquarePosition(uciMove.substring(0, 2));
          const toPos = calculateDOMSquarePosition(uciMove.substring(2, 4));
          board.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: fromPos.x,
            clientY: fromPos.y,
          }));
          board.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: toPos.x,
            clientY: toPos.y,
          }));
        }
      }
    });
  }

  const requestNextPuzzle = () => {
    addToConsole(`[${namespace}] Requesting next puzzle`);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://www.chess.com/rpc/chesscom.puzzles.v1.PuzzleService/GetNextRated', true);

      xhr.setRequestHeader('accept', 'application/json');
      xhr.setRequestHeader('accept-language', 'en-US,en;q=0.9');
      xhr.setRequestHeader('content-type', 'application/json');
      xhr.withCredentials = true;

      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);

            if (result && result.userPuzzle && result.userPuzzle.puzzle) {
              addToConsole(`[${namespace}] Successfully retrieved next puzzle: ${result.userPuzzle.puzzle.legacyPuzzleId}`);
              resolve(result);
            } else {
              const errorMsg = `Failed to get next puzzle: ${result.error || 'No puzzle data in response'}`;
              addToConsole(`[${namespace}] ${errorMsg}`);
              reject(new Error(errorMsg));
            }
          } catch (e) {
            addToConsole(`[${namespace}] Error parsing response:`, e);
            reject(e);
          }
        } else {
          addToConsole(`[${namespace}] Request failed:`, xhr.status, xhr.statusText);
          reject(new Error(`Request failed: ${xhr.status} ${xhr.statusText}`));
        }
      };

      xhr.onerror = function () {
        addToConsole(`[${namespace}] Network error occurred`);
        reject(new Error('Network error'));
      };

      xhr.ontimeout = function () {
        addToConsole(`[${namespace}] Request timed out`);
        reject(new Error('Request timed out'));
      };

      xhr.send('{}');
    });
  }

  const submitPuzzleSolution = async (puzzleId, moves) => {
    try {
      const payload = {
        legacyPuzzleId: puzzleId,
        moves: moves,
        attemptDuration: `0.2s`
      };

      switch(vs.queryConfigKey(namespace + '_apipuzzletimemode')) {
        case 'hour':
          payload.attemptDuration = `${(3600 + Math.random() * 1800).toFixed(3)}s`;
          break;
        case 'legit':
          payload.attemptDuration = `${(15 + Math.random() * 30).toFixed(3)}s`;
          break;
        case 'zero':
          payload.attemptDuration = `${0.1 + Math.random() * 0.3}s`;
          break;
      }

      addToConsole(`[${namespace}] Submitting solution for puzzle ${puzzleId}`);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://www.chess.com/rpc/chesscom.puzzles.v1.PuzzleService/SubmitRatedSolution', true);

        xhr.setRequestHeader('accept', 'application/json');
        xhr.setRequestHeader('accept-language', 'en-US,en;q=0.9');
        xhr.setRequestHeader('content-type', 'application/json');

        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              addToConsole(`[${namespace}] Successfully submitted solution for puzzle ${puzzleId}. ELO: ${result.userRatings[0].rating} (+${result.userRatings[0].ratingChange})`);
              requestNextPuzzle();
              resolve(result);
            } catch (e) {
              addToConsole(`[${namespace}] Error parsing response:`, e);
              reject(e);
            }
          } else {
            addToConsole(`[${namespace}] XHR request failed:`, xhr.status, xhr.statusText, xhr.responseText);
            reject(new Error(`XHR request failed: ${xhr.status} ${xhr.statusText}`));
          }
        };

        xhr.onerror = function () {
          addToConsole(`[${namespace}] Network error occurred`);
          reject(new Error('Network error'));
        };

        xhr.ontimeout = function () {
          addToConsole(`[${namespace}] Request timed out`);
          reject(new Error('Request timed out'));
        };

        xhr.send(JSON.stringify(payload));
      });
    } catch (error) {
      addToConsole(`[${namespace}] Error submitting puzzle solution:`, error);
    }
  };

  const handlePuzzleMove = (moveObj) => {
    const board = document.querySelector('wc-chess-board');
    if (!board?.game) return false;

    if (moveObj.promotion) {
      board.game.move({
        from: moveObj.from,
        to: moveObj.to,
        promotion: moveObj.promotion,
        animate: false,
        userGenerated: true
      });
    } else {
      const fromPos = calculateDOMSquarePosition(moveObj.from);
      const toPos = calculateDOMSquarePosition(moveObj.to);
      board.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: fromPos.x,
        clientY: fromPos.y,
      }));
      board.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: toPos.x,
        clientY: toPos.y,
      }));
    }
  }

  let requeueLastGamePath = null;
  let requeueAttempts = 0;

  const handleRequeue = () => {
    if (requeueLastGamePath === null) {
      requeueLastGamePath = window.location.pathname;
      requeueAttempts = 0;
    } else if (requeueLastGamePath !== window.location.pathname) {
      requeueLastGamePath = null;
    }

    if (requeueLastGamePath === window.location.pathname) {
      try {
        document.querySelector('div.tabs-tab:nth-child(2)').click();
        document.querySelector('.create-game-component > button:nth-child(2)').click();
      } catch {
        if (requeueAttempts.requeueAttempts > 10) {
          requeueLastGamePath = null;
          requeueAttempts = 0;
        } else {
          requeueAttempts.requeueAttempts++;
        }
      }
    }
  }

  const fuzzyFensEqual = (fen1, fen2) => fen1.split(' ').slice(0, 1).join(' ') === fen2.split(' ').slice(0, 1).join(' ');

  const puzzleQueue = [];
  let lastPuzzleFEN = null;
  let playerTurn = false;

  window[namespace].getPuzzleQueue = () => puzzleQueue;

  const manualPuzzleHandler = () => {
    const board = document.querySelector('wc-chess-board');
    if (!board) return;

    const currentFEN = board.game.getFEN();

    for (let i = 0; i < puzzleQueue.length; i++) {
      const puzzle = puzzleQueue[i];

      if (fuzzyFensEqual(puzzle.fen, currentFEN)) {
        puzzle.tagged = true;
      }

      if (puzzle.tagged) {
        if (lastPuzzleFEN && fuzzyFensEqual(currentFEN, lastPuzzleFEN)) return;

        if (document.querySelector("#board-animation").children.length) {
          return;
        }

        while (puzzle.moves.length > 0 && !playerTurn) {
          puzzle.moves.shift();
          playerTurn = !playerTurn;
        }

        if (puzzle.moves.length > 0 && playerTurn) {
          const move = puzzle.moves.shift();
          handlePuzzleMove(move);
          lastPuzzleFEN = currentFEN;
          playerTurn = !playerTurn;
          return;
        } else {
          puzzleQueue.splice(i, 1);
          lastPuzzleFEN = null;
          playerTurn = false;
          break;
        }
      }
    }
  }

  const clickPuzzleNext = () => {
    const nextButton = document.querySelector('#sidebar > section > div.rated-sidebar-footer-component > div.primary-control-buttons-component > button.cc-button-component.cc-button-primary.cc-button-large.cc-bg-primary.primary-control-buttons-half');
    const arrowIcon = nextButton?.querySelector('.arrow-right');
    if (arrowIcon) {
      nextButton.click();
    }
  }

  const updateLoop = () => {
    const board = document.querySelector('wc-chess-board');

    if (!board?.game) return;

    if (board.game.getPositionInfo().gameOver) {
      externalEngineWorker.postMessage({ type: 'STOP' });

      if (vs.queryConfigKey(namespace + '_autoqueue')) {
        handleRequeue();
      }
    }

    if (document.location.pathname.startsWith('/puzzles')) {
      if (vs.queryConfigKey(namespace + '_puzzlemode')) {
        manualPuzzleHandler();
        if (!document.location.pathname.includes('battle')) {
          clickPuzzleNext();
        }
      }
    }

    if (vs.queryConfigKey(namespace + '_renderthreats')) {
      renderThreats();
    }

    if (!vs.queryConfigKey(namespace + '_legitmode') && vs.queryConfigKey(namespace + '_whichengine') !== 'none') {
      getEngineMove();
    }
  }

  window[namespace].updateLoop = setInterval(updateLoop, 20);

  document.addEventListener('readystatechange', () => {
    if (document.readyState === 'interactive') {
      init();
    }
  });
})();
