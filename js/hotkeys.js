// Hotkey system infrastructure — keymap engine, reassignment, panel rendering
// No app-state dependencies; references globals defined in main <script> block:
//   _hotkeyActions, _customKeys, _keymap, _reassigningActionId, showToast

// Reserved keys that cannot be reassigned
const _RESERVED_KEYS = new Set(['Escape', 'Meta', 'Control', 'Alt', 'Shift', 'Tab', 'Enter', 'CapsLock']);

// Display-friendly names for special keys
const _KEY_DISPLAY = {
    ' ': 'Space', 'ArrowLeft': '←', 'ArrowRight': '→', 'ArrowUp': '↑', 'ArrowDown': '↓',
    '+': '+', '-': '−', '=': '=', '_': '_',
};
function _keyDisplay(key, shift, alt) {
    return (alt ? '⌥' : '') + (shift ? '⇧' : '') + (_KEY_DISPLAY[key] || key.toUpperCase());
}

// Build keymap: maps key (with shift prefix) → action id
// Conflicts detected during keymap build: default key blocked by a user's custom mapping.
// Each entry: { actionId, defaultKey, blockedBy } where blockedBy is the action that owns the key.
let _keymapConflicts = [];

function _buildKeymap() {
    _keymap = {};
    _keymapConflicts = [];
    for (const action of _hotkeyActions) {
        const hasCustom = _customKeys[action.id] !== undefined;
        const key = hasCustom ? _customKeys[action.id] : action.defaultKey;
        const prefix = action.shift ? 'S+' : (action.alt ? 'A+' : '');
        const mapKey = prefix + key;
        if (key) {
            if (hasCustom || !_keymap[mapKey]) {
                _keymap[mapKey] = action.id;
            } else {
                // Default key is blocked by another action's custom mapping — record conflict
                _keymapConflicts.push({
                    actionId:   action.id,
                    defaultKey: key,
                    shift:      !!action.shift,
                    alt:        !!action.alt,
                    blockedBy:  _keymap[mapKey],
                });
            }
        }
        // Also register altKey if present, not overridden, and slot unclaimed
        if (action.altKey && !hasCustom && !_keymap[prefix + action.altKey]) {
            _keymap[prefix + action.altKey] = action.id;
        }
    }
    // Hidden aliases: unshifted = and _ map to +/- zoom (same physical keys)
    if (!_keymap['=']) _keymap['='] = 'zoomIn';
    if (!_keymap['_']) _keymap['_'] = 'zoomOut';
}

// Get current key for an action (custom or default)
function _actionKey(actionId) {
    const action = _hotkeyActions.find(a => a.id === actionId);
    if (!action) return '';
    return _customKeys[actionId] !== undefined ? _customKeys[actionId] : (action.defaultKey || '');
}

// Check if an action has been customised
function _isCustomised(actionId) {
    return _customKeys[actionId] !== undefined;
}

// Reassign a hotkey
function _reassignKey(actionId, newKey) {
    const action = _hotkeyActions.find(a => a.id === actionId);
    if (!action) return false;
    if (_RESERVED_KEYS.has(newKey)) {
        showToast('Key "' + _keyDisplay(newKey, false) + '" is reserved');
        return 'conflict';
    }
    // Normalize to lowercase for letter keys
    if (newKey.length === 1) newKey = newKey.toLowerCase();
    // Check for conflicts (same key + same modifier state)
    const prefix = action.shift ? 'S+' : (action.alt ? 'A+' : '');
    const conflictId = _keymap[prefix + newKey] || _keymap[prefix + newKey.toLowerCase()];
    if (conflictId && conflictId !== actionId) {
        const conflict = _hotkeyActions.find(a => a.id === conflictId);
        // Show conflict message inline on the reassigning kbd element
        const activeKbd = document.querySelector('.shortcut-kbd-clickable.reassigning');
        if (activeKbd) {
            activeKbd.textContent = _keyDisplay(newKey, action.shift) + ' → ' + conflict.label;
            activeKbd.classList.add('conflict-flash');
            setTimeout(() => {
                activeKbd.classList.remove('conflict-flash');
                activeKbd.textContent = 'Press a key…';
            }, 1500);
        }
        showToast(_keyDisplay(newKey, action.shift) + ' is already assigned to "' + conflict.label + '"');
        return 'conflict';
    }
    if (newKey === action.defaultKey) {
        delete _customKeys[actionId]; // revert to default
    } else {
        _customKeys[actionId] = newKey;
    }
    localStorage.setItem('customHotkeys', JSON.stringify(_customKeys));
    _buildKeymap();
    _renderShortcutsList();
    return true;
}

// Reset one or all hotkeys
function _resetHotkey(actionId) {
    delete _customKeys[actionId];
    localStorage.setItem('customHotkeys', JSON.stringify(_customKeys));
    _buildKeymap();
    _renderShortcutsList();
}
function _resetAllHotkeys() {
    _customKeys = {};
    localStorage.setItem('customHotkeys', '{}');
    _buildKeymap();
    _renderShortcutsList();
    showToast('All hotkeys reset to defaults');
}

// ── Panel rendering ──────────────────────────────────────────────

// Panel display: which paired groups to show together, with custom combined labels
const _pairedLabels = {
    loupeSize:     'Resize loupe',
    frameStepping: 'Frame back / forward',
    zoomInOut:     'Zoom in / out',
    speed:         'Slower / Faster',
    loopPoints:    'Loop in / out point',
    copyTc:        'Timecode: Copy / Format',
    rotate:        'Rotate CW / CCW',
};

// Which sections go in which column, with display headers
const _leftSections = new Set(['files', 'view', 'zoom', 'panels']);
const _rightSections = new Set(['transport', 'analysis']);
const _sectionHeaders = {
    files: 'Files', view: 'View', zoom: 'Zoom',
    transport: 'Transport', analysis: 'Analysis',
};

function _renderShortcutsList() {
    const list = document.querySelector('#shortcutsPanel .shortcuts-list');
    if (!list) return;
    list.innerHTML = '';
    // Remove any previous reset-all row
    const oldReset = list.parentElement.querySelector('.shortcut-reset-all-row');
    if (oldReset) oldReset.remove();

    // ── Conflict warnings (full-width row inside the scrollable list) ──
    const oldConflicts = list.parentElement.querySelector('.shortcut-conflicts');
    if (oldConflicts) oldConflicts.remove();
    if (_keymapConflicts.length > 0) {
        const box = document.createElement('div');
        box.className = 'shortcut-conflicts';
        const hdr = document.createElement('div');
        hdr.className = 'shortcut-conflicts-header';
        hdr.innerHTML = '&#9888; Key conflict' + (_keymapConflicts.length > 1 ? 's' : '');
        box.appendChild(hdr);
        _keymapConflicts.forEach(c => {
            const blocker = _hotkeyActions.find(a => a.id === c.blockedBy);
            const unbound = _hotkeyActions.find(a => a.id === c.actionId);
            if (!blocker || !unbound) return;
            const row = document.createElement('div');
            row.className = 'shortcut-conflict-row';
            const keyEl = document.createElement('span');
            keyEl.className = 'shortcut-conflict-key';
            keyEl.textContent = _keyDisplay(c.defaultKey, c.shift, c.alt);
            const desc = document.createElement('span');
            desc.className = 'shortcut-conflict-desc';
            desc.innerHTML =
                '<strong>' + unbound.label + '</strong> has no key \u2014 ' +
                '<kbd class="shortcut-conflict-key">' + _keyDisplay(c.defaultKey, c.shift, c.alt) + '</kbd>' +
                ' is taken by your custom <strong>' + blocker.label + '</strong> mapping.';
            const btn = document.createElement('button');
            btn.className = 'shortcut-conflict-assign';
            btn.textContent = 'Assign key';
            btn.addEventListener('click', () => {
                const kbd = document.querySelector('[data-action-id="' + c.actionId + '"]');
                if (kbd) kbd.click();
            });
            row.appendChild(keyEl);
            row.appendChild(desc);
            row.appendChild(btn);
            box.appendChild(row);
        });
        list.appendChild(box);
    }

    const leftCol = document.createElement('div');
    leftCol.className = 'shortcuts-col';
    const rightCol = document.createElement('div');
    rightCol.className = 'shortcuts-col';

    const renderedPairs = new Set();
    let lastLeftSection = null;
    let lastRightSection = null;

    for (const action of _hotkeyActions) {
        const isLeft = _leftSections.has(action.section);
        const col = isLeft ? leftCol : rightCol;
        const lastSection = isLeft ? lastLeftSection : lastRightSection;

        // Section headers
        if (action.section !== lastSection) {
            const header = _sectionHeaders[action.section];
            if (header) {
                if (lastSection) col.appendChild(document.createElement('hr')).className = 'shortcut-divider';
                const h = document.createElement('div');
                h.className = 'shortcut-section-header';
                h.textContent = header;
                col.appendChild(h);
            } else if (lastSection) {
                col.appendChild(document.createElement('hr')).className = 'shortcut-divider';
            }
        }
        if (isLeft) lastLeftSection = action.section;
        else lastRightSection = action.section;

        // Handle paired actions (show on one row)
        if (action.paired) {
            if (renderedPairs.has(action.paired)) continue;
            renderedPairs.add(action.paired);
            col.appendChild(_buildPairedRow(action));
            // Append Esc Esc row right after loop points
            if (action.paired === 'loopPoints') {
                col.appendChild(_buildFixedRow('<kbd>Esc</kbd> <small>2×</small>', 'Clear loop markers'));
            }
            continue;
        }

        col.appendChild(_buildSingleRow(action));
    }

    // "Escape" row in left column (non-reassignable, same section as panels)
    leftCol.appendChild(_buildFixedRow('<kbd>Esc</kbd>', 'Dismiss panel'));

    const colsRow = document.createElement('div');
    colsRow.className = 'shortcuts-cols';
    colsRow.appendChild(leftCol);
    colsRow.appendChild(rightCol);
    list.appendChild(colsRow);

    // ── Appearance section (slot color pickers) ──
    const SLOTS = [
        { id: 'original', label: 'Ref' },
        { id: 'editA',    label: 'A'   },
        { id: 'editB',    label: 'B'   },
    ];
    const appearSection = document.createElement('div');
    appearSection.className = 'slot-appearance-section';

    const appearHeader = document.createElement('div');
    appearHeader.className = 'shortcut-section-header';
    appearHeader.textContent = 'Appearance';
    appearSection.appendChild(appearHeader);

    const swatchRow = document.createElement('div');
    swatchRow.className = 'slot-appearance-row';

    SLOTS.forEach(({ id, label }) => {
        const bgVar  = `--slot-${id}-bg`;
        const txtVar = `--slot-${id}-txt`;
        const currentBg  = getComputedStyle(document.documentElement).getPropertyValue(bgVar).trim()
                        || _SLOT_COLOR_DEFAULTS[id];
        const currentTxt = getComputedStyle(document.documentElement).getPropertyValue(txtVar).trim()
                        || '#0a0c0a';

        const swatch = document.createElement('label');
        swatch.className = 'slot-color-swatch';
        swatch.style.background = currentBg;
        swatch.style.color      = currentTxt;
        swatch.title = `Change ${label} slot color`;

        const dot = document.createElement('span');
        dot.className = 'slot-color-dot';
        dot.style.background = currentTxt;

        const name = document.createElement('span');
        name.textContent = label;

        const picker = document.createElement('input');
        picker.type  = 'color';
        picker.value = currentBg;

        picker.addEventListener('input', () => {
            _applySlotColors(Object.assign({}, _slotColors, { [id]: picker.value }), false);
            const newTxt = getComputedStyle(document.documentElement).getPropertyValue(`--slot-${id}-txt`).trim();
            swatch.style.background = picker.value;
            swatch.style.color      = newTxt;
            dot.style.background    = newTxt;
            resetBtn.classList.toggle('hidden', _isDefaultColors());
        });

        // Persist on close — _slotColors already up-to-date from input events
        picker.addEventListener('change', () => {
            localStorage.setItem('slotColors', JSON.stringify(_slotColors));
        });

        swatch.appendChild(dot);
        swatch.appendChild(name);
        swatch.appendChild(picker);
        swatchRow.appendChild(swatch);
    });

    // Reset to defaults button
    const resetBtn = document.createElement('button');
    resetBtn.className = 'slot-appearance-reset';
    resetBtn.title  = 'Reset to default colors';
    resetBtn.textContent = 'Reset';
    const _isDefaultColors = () =>
        SLOTS.every(({ id }) => _slotColors[id] === _SLOT_COLOR_DEFAULTS[id]);
    resetBtn.classList.toggle('hidden', _isDefaultColors());
    resetBtn.addEventListener('click', () => {
        _applySlotColors(_SLOT_COLOR_DEFAULTS, true);
        _renderShortcutsList(); // re-render to sync swatch values
    });

    swatchRow.appendChild(resetBtn);
    appearSection.appendChild(swatchRow);
    list.appendChild(appearSection);

    // Reset All button (only show if any customised)
    if (Object.keys(_customKeys).length > 0) {
        const resetRow = document.createElement('div');
        resetRow.className = 'shortcut-reset-all-row';
        const resetBtn = document.createElement('button');
        resetBtn.className = 'shortcut-reset-all';
        resetBtn.textContent = 'Reset All to Defaults';
        resetBtn.addEventListener('click', _resetAllHotkeys);
        resetRow.appendChild(resetBtn);
        // Append below the columns
        list.parentElement.appendChild(resetRow);
    }
}

function _buildPairedRow(action) {
    const partners = _hotkeyActions.filter(a => a.paired === action.paired);
    const row = document.createElement('div');
    row.className = 'shortcut-row';
    if (partners.some(p => p.id === 'fullscreen') && window.matchMedia('(display-mode: standalone)').matches) {
        row.classList.add('disabled');
    }
    const keySpan = document.createElement('span');
    keySpan.className = 'shortcut-key';
    partners.forEach((p, idx) => {
        if (idx > 0) keySpan.appendChild(document.createTextNode(' '));
        keySpan.appendChild(_buildKbd(p));
        if (_isCustomised(p.id)) keySpan.appendChild(_buildResetIcon(p));
        // Show altKey as a secondary kbd if present and not customised
        if (p.altKey && !_isCustomised(p.id)) {
            const altKbd = document.createElement('kbd');
            altKbd.textContent = _keyDisplay(p.altKey, p.shift);
            altKbd.className = 'shortcut-kbd-clickable';
            altKbd.title = 'Alternate key (not reassignable)';
            altKbd.addEventListener('click', () => {
                altKbd.textContent = 'Not reassignable';
                altKbd.classList.add('flash-conflict');
                setTimeout(() => { altKbd.textContent = _keyDisplay(p.altKey, p.shift); altKbd.classList.remove('flash-conflict'); }, 1000);
            });
            keySpan.appendChild(altKbd);
        }
    });
    row.appendChild(keySpan);
    const descSpan = document.createElement('span');
    descSpan.className = 'shortcut-desc';
    descSpan.textContent = _pairedLabels[action.paired] || partners.map(p => p.label).join(' / ');
    row.appendChild(descSpan);
    return row;
}

function _buildSingleRow(action) {
    const row = document.createElement('div');
    row.className = 'shortcut-row';
    if (action.id === 'fullscreen' && window.matchMedia('(display-mode: standalone)').matches) {
        row.classList.add('disabled');
        row.id = 'shortcutFullscreen';
    }
    const keySpan = document.createElement('span');
    keySpan.className = 'shortcut-key';
    keySpan.appendChild(_buildKbd(action));
    if (_isCustomised(action.id)) keySpan.appendChild(_buildResetIcon(action));
    if (action.altKey && !_isCustomised(action.id)) {
        const altKbd = document.createElement('kbd');
        altKbd.textContent = _keyDisplay(action.altKey, action.shift);
        altKbd.className = 'shortcut-kbd-clickable';
        altKbd.title = 'Alternate key (not reassignable)';
        altKbd.addEventListener('click', () => {
            altKbd.textContent = 'Not reassignable';
            altKbd.classList.add('conflict-flash');
            setTimeout(() => { altKbd.textContent = _keyDisplay(action.altKey, action.shift); altKbd.classList.remove('conflict-flash'); }, 1000);
        });
        keySpan.appendChild(altKbd);
    }
    row.appendChild(keySpan);
    const descSpan = document.createElement('span');
    descSpan.className = 'shortcut-desc';
    descSpan.textContent = action.label;
    if (action.id === 'fullscreen' && window.matchMedia('(display-mode: standalone)').matches) {
        descSpan.innerHTML = 'Browser fullscreen <span class="shortcut-note">(N/A in app mode)</span>';
    }
    row.appendChild(descSpan);
    return row;
}

function _buildKbd(action) {
    const isBlocked  = _keymapConflicts.some(c => c.actionId === action.id);
    const hasNoKey   = !_isCustomised(action.id) && !action.defaultKey;
    const isUnbound  = isBlocked || hasNoKey;
    const kbd = document.createElement('kbd');
    kbd.textContent = _reassigningActionId === action.id ? 'Press a key\u2026'
                    : isUnbound                          ? '\u2014'
                    : _keyDisplay(_actionKey(action.id), action.shift, action.alt);
    kbd.className = 'shortcut-kbd-clickable' +
                    (_reassigningActionId === action.id ? ' reassigning' : '') +
                    (_isCustomised(action.id) ? ' customised' : '') +
                    (isUnbound ? ' unbound' : '');
    kbd.title = isUnbound ? 'No key assigned \u2014 click to assign' : 'Click to reassign';
    kbd.dataset.actionId = action.id;
    kbd.addEventListener('click', _startReassign);
    return kbd;
}

function _buildResetIcon(action) {
    const rst = document.createElement('span');
    rst.className = 'shortcut-reset';
    rst.textContent = '↺';
    rst.title = 'Reset to default (' + _keyDisplay(action.defaultKey, action.shift, action.alt) + ')';
    rst.addEventListener('click', (ev) => { ev.stopPropagation(); _resetHotkey(action.id); });
    return rst;
}

function _buildFixedRow(keyHtml, label) {
    const row = document.createElement('div');
    row.className = 'shortcut-row';
    const keySpan = document.createElement('span');
    keySpan.className = 'shortcut-key';
    keySpan.innerHTML = keyHtml;
    // Flash "not reassignable" on click
    keySpan.querySelectorAll('kbd').forEach(kbd => {
        kbd.className = 'shortcut-kbd-clickable';
        kbd.style.cursor = 'pointer';
        kbd.addEventListener('click', () => {
            kbd.textContent = 'Not reassignable';
            kbd.classList.add('conflict-flash');
            setTimeout(() => {
                kbd.classList.remove('conflict-flash');
                kbd.textContent = 'Esc';
            }, 1200);
        });
    });
    row.appendChild(keySpan);
    const descSpan = document.createElement('span');
    descSpan.className = 'shortcut-desc';
    descSpan.textContent = label;
    row.appendChild(descSpan);
    return row;
}

function _startReassign(ev) {
    ev.stopPropagation();
    const actionId = ev.currentTarget.dataset.actionId;
    if (_reassigningActionId === actionId) {
        // Cancel reassignment on second click
        _reassigningActionId = null;
        _renderShortcutsList();
        return;
    }
    _reassigningActionId = actionId;
    _renderShortcutsList();
}
