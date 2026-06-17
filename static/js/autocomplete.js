// ===== Tag Autocomplete =====
(function() {
    'use strict';

    var DROPDOWN_ID = 'tag-autocomplete-dropdown';
    var DEBOUNCE_MS = 200;
    var MIN_CHARS = 1;

    var debounceTimer = null;
    var currentQuery = '';
    var results = [];
    var selectedIndex = -1;
    var isVisible = false;
    var targetTextarea = null;

    function underscoreToSpace() {
        try { return localStorage.getItem('ts_underscore_to_space') === 'true'; } catch(e) { return false; }
    }

    function commaSpaceEnabled() {
        try { return localStorage.getItem('ts_comma_space') === 'true'; } catch(e) { return false; }
    }

    var FREQ_KEY = 'ts_personal_freq';
    function getPersonalFreq() {
        try { return JSON.parse(localStorage.getItem(FREQ_KEY)) || {}; }
        catch(e) { return {}; }
    }

    var dropdown = document.createElement('div');
    dropdown.id = DROPDOWN_ID;
    dropdown.className = 'tag-ac-dropdown';
    dropdown.style.display = 'none';
    document.body.appendChild(dropdown);

    function getWordAtCursor(textarea) {
        var text = textarea.value;
        var pos = textarea.selectionStart;
        if (pos === 0) return '';
        var start = pos;
        while (start > 0) {
            var ch = text[start - 1];
            if (ch === ',' || ch === '\n' || ch === '\r' || ch === '(' || ch === ')' || ch === '[' || ch === ']') break;
            start--;
        }
        var partial = text.substring(start, pos);
        partial = partial.replace(/^[\s,\(\)\[\]]+/, '');
        return partial;
    }

    function replaceCurrentWord(textarea, newTag) {
        var text = textarea.value;
        var pos = textarea.selectionStart;
        var start = pos;
        while (start > 0) {
            var ch = text[start - 1];
            if (ch === ',' || ch === '\n' || ch === '\r' || ch === '(' || ch === ')' || ch === '[' || ch === ']') break;
            start--;
        }
        var end = pos;
        while (end < text.length) {
            var ch2 = text[end];
            if (ch2 === ',' || ch2 === '\n' || ch2 === '\r' || ch2 === '(' || ch2 === ')' || ch2 === '[' || ch2 === ']') break;
            end++;
        }
        var before = text.substring(0, start);
        var after = text.substring(end);
        var needsComma = before.length > 0 && !/[,]\s*$/.test(before);
        var sep = commaSpaceEnabled() ? ', ' : ',';
        var prefix = needsComma ? sep : '';
        if (underscoreToSpace()) newTag = newTag.replace(/_/g, ' ');
        var suffix = sep;
        // 如果后面已有逗号，不重复添加
        if (after.trim().startsWith(',') || after.trim().startsWith('\uff0c')) {
            suffix = '';
        }
        textarea.value = before + prefix + newTag + suffix + after;
        var newPos = (before + prefix + newTag + suffix).length;
        textarea.selectionStart = newPos;
        textarea.selectionEnd = newPos;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function fetchAutocomplete(query) {
        if (!query || query.length < MIN_CHARS) { hideDropdown(); return; }
        currentQuery = query;
        fetch('/api/autocomplete?q=' + encodeURIComponent(query))
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (currentQuery !== query) return;
                results = data.results || [];
                if (results.length === 0) { hideDropdown(); return; }
                selectedIndex = -1;
                renderDropdown();
                positionDropdown();
                showDropdown();
            })
            .catch(function() { hideDropdown(); });
    }

    function renderDropdown() {
        // Add personal frequency to results and sort
        var personalFreq = getPersonalFreq();
        for (var i = 0; i < results.length; i++) {
            results[i].personalFreq = personalFreq[results[i].en] || 0;
        }
        // Sort: personal frequency desc (if >0) then global frequency desc
        results.sort(function(a, b) {
            if (a.personalFreq !== b.personalFreq) return b.personalFreq - a.personalFreq;
            return (b.freq || 0) - (a.freq || 0);
        });

        var html = '';
        for (var i = 0; i < results.length; i++) {
            var r = results[i];
            var cls = (i === selectedIndex) ? ' ac-selected' : '';
            var freqBadge = r.freq > 0 ? '<span class="ac-freq">' + r.freq + '</span>' : '';
            var personalBadge = r.personalFreq > 0 ? '<span class="ac-personal" title="你使用了 ' + r.personalFreq + ' 次">★' + r.personalFreq + '</span>' : '';
            html += '<div class="ac-item' + cls + '" data-index="' + i + '">' +
                '<span class="ac-en">' + escapeHtml(r.en) + '</span>' +
                '<span class="ac-zh">' + escapeHtml(r.zh || '') + '</span>' +
                personalBadge +
                freqBadge + '</div>';
        }
        html += '<div class="ac-footer">共 ' + results.length + ' 条匹配（你的常用靠前）</div>';
        dropdown.innerHTML = html;
        var items = dropdown.querySelectorAll('.ac-item');
        for (var j = 0; j < items.length; j++) {
            items[j].addEventListener('mousedown', function(e) {
                e.preventDefault();
                selectResult(parseInt(this.dataset.index));
            });
        }
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function positionDropdown() {
        if (!targetTextarea) return;
        var rect = targetTextarea.getBoundingClientRect();
        dropdown.style.top = (rect.bottom + window.scrollY + 2) + 'px';
        dropdown.style.left = (rect.left + window.scrollX) + 'px';
        dropdown.style.minWidth = rect.width + 'px';
        dropdown.style.maxWidth = Math.max(rect.width, 420) + 'px';
    }

    function showDropdown() { dropdown.style.display = 'block'; isVisible = true; }
    function hideDropdown() { dropdown.style.display = 'none'; isVisible = false; results = []; selectedIndex = -1; currentQuery = ''; }

    function selectResult(index) {
        if (!targetTextarea || index < 0 || index >= results.length) return;
        replaceCurrentWord(targetTextarea, results[index].en);
        hideDropdown();
        targetTextarea.focus();
    }

    function moveSelection(delta) {
        if (!isVisible || results.length === 0) return;
        selectedIndex += delta;
        if (selectedIndex >= results.length) selectedIndex = 0;
        if (selectedIndex < 0) selectedIndex = results.length - 1;
        var items = dropdown.querySelectorAll('.ac-item');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (parseInt(item.dataset.index) === selectedIndex) {
                item.classList.add('ac-selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('ac-selected');
            }
        }
    }

    function handleInput(e) {
        targetTextarea = e.target;
        clearTimeout(debounceTimer);
        var query = getWordAtCursor(e.target);
        if (!query || query.length < MIN_CHARS) { hideDropdown(); return; }
        debounceTimer = setTimeout(function() { fetchAutocomplete(query); }, DEBOUNCE_MS);
    }

    function handleKeydown(e) {
        if (!isVisible) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1); }
        else if (e.key === 'Enter' || e.key === 'Tab') {
            if (selectedIndex >= 0) { e.preventDefault(); selectResult(selectedIndex); }
        }
        else if (e.key === 'Escape') { e.preventDefault(); hideDropdown(); }
    }

    function handleBlur(e) {
        setTimeout(function() {
            if (!dropdown.contains(document.activeElement)) hideDropdown();
        }, 150);
    }

    function handleClickOutside(e) {
        if (isVisible && dropdown !== e.target && !dropdown.contains(e.target) && e.target !== targetTextarea) {
            hideDropdown();
        }
    }

    function initTextarea(textarea) {
        textarea.addEventListener('input', handleInput);
        textarea.addEventListener('keydown', handleKeydown);
        textarea.addEventListener('blur', handleBlur);
    }

    function init() {
        var textareas = document.querySelectorAll('#txt2img_prompt textarea, #img2img_prompt textarea');
        for (var i = 0; i < textareas.length; i++) {
            initTextarea(textareas[i]);
        }
        document.addEventListener('click', handleClickOutside);
        console.log('[Autocomplete] Initialized on', textareas.length, 'textareas');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 1000); });
    } else {
        setTimeout(init, 1500);
    }
})();
