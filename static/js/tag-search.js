/**
 * Tag Search — Danbooru 标签中英搜索
 * 输入英文搜索英文原文，输入中文搜索中文翻译
 */
(function() {
    'use strict';

    var SETTINGS_KEY = 'ts_settings';
    var settings = {
        limit: 50,
        format: 'table',
        clickAction: 'copy',
        highlight: 'yes',
    };

    function loadSettings() {
        try {
            var saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) Object.assign(settings, JSON.parse(saved));
        } catch(e) {}
    }
    function saveSettings() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch(e) {}
    }

    var $input, $hint, $clearBtn, $results, $status;
    var $settingsBtn, $settingsPanel, $settingsClose;
    var $setLimit, $setLimitVal, $setFormat, $setClick, $setHighlight;
    var searchTimer = null;
    var currentQuery = '';
    var isSearching = false;
    var initialized = false;

    function init() {
        if (initialized) return;
        initialized = true;

        $input = document.getElementById('ts-search-input');
        $hint = document.getElementById('ts-search-hint');
        $clearBtn = document.getElementById('ts-clear-btn');
        $results = document.getElementById('ts-results');
        $status = document.getElementById('ts-status');
        $settingsBtn = document.getElementById('ts-settings-btn');
        $settingsPanel = document.getElementById('ts-settings-panel');
        $settingsClose = document.getElementById('ts-settings-close');
        $setLimit = document.getElementById('ts-set-limit');
        $setLimitVal = document.getElementById('ts-set-limit-val');
        $setFormat = document.getElementById('ts-set-format');
        $setClick = document.getElementById('ts-set-click');
        $setHighlight = document.getElementById('ts-set-highlight');

        loadSettings();
        applySettingsToUI();
        bindEvents();
    }

    function applySettingsToUI() {
        if ($setLimit) { $setLimit.value = settings.limit; $setLimitVal.textContent = settings.limit; }
        if ($setFormat) $setFormat.value = settings.format;
        if ($setClick) $setClick.value = settings.clickAction;
        if ($setHighlight) $setHighlight.value = settings.highlight;
    }

    function bindEvents() {
        if (!$input) { console.error('[TagSearch] input not found'); return; }

        $input.addEventListener('input', function() {
            var val = this.value.trim();
            $clearBtn.style.display = val ? 'block' : 'none';
            updateHint(val);
            clearTimeout(searchTimer);
            if (!val) { showEmpty(); return; }
            searchTimer = setTimeout(function() { doSearch(val); }, 200);
        });

        $clearBtn.addEventListener('click', function() {
            $input.value = '';
            $clearBtn.style.display = 'none';
            $hint.textContent = '';
            showEmpty();
            $input.focus();
        });

        $input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(searchTimer);
                var val = this.value.trim();
                if (val) doSearch(val);
            }
        });

        if ($settingsBtn) {
            $settingsBtn.addEventListener('click', function() {
                var panel = $settingsPanel;
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            });
        }
        if ($settingsClose) {
            $settingsClose.addEventListener('click', function() {
                $settingsPanel.style.display = 'none';
            });
        }
        if ($setLimit) {
            $setLimit.addEventListener('input', function() {
                settings.limit = parseInt(this.value);
                $setLimitVal.textContent = this.value;
                saveSettings();
                if (currentQuery) doSearch(currentQuery);
            });
        }
        if ($setFormat) {
            $setFormat.addEventListener('change', function() {
                settings.format = this.value;
                saveSettings();
                if (currentQuery && !isSearching) doSearch(currentQuery);
            });
        }
        if ($setClick) {
            $setClick.addEventListener('change', function() {
                settings.clickAction = this.value;
                saveSettings();
            });
        }
        if ($setHighlight) {
            $setHighlight.addEventListener('change', function() {
                settings.highlight = this.value;
                saveSettings();
                if (currentQuery && !isSearching) doSearch(currentQuery);
            });
        }
    }

    function updateHint(val) {
        if (!val) { $hint.textContent = ''; return; }
        $hint.textContent = isChineseQuery(val) ? '中文搜索' : 'EN搜索';
    }

    function isChineseQuery(q) {
        return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(q);
    }

    async function doSearch(query) {
        if (!$input) return;
        currentQuery = query;
        if (isSearching) return;
        isSearching = true;

        if ($results) $results.innerHTML = '<div class="ts-loading">搜索中</div>';
        if ($status) $status.textContent = '';

        try {
            var resp = await fetch('/api/tag-search?q=' + encodeURIComponent(query) + '&limit=' + settings.limit);
            if (!resp.ok) throw new Error('API error: ' + resp.status);
            var data = await resp.json();

            if (data.error) {
                if ($results) $results.innerHTML = '<div class="ts-empty-state"><div class="ts-empty-icon">⚠️</div><div class="ts-empty-text">' + data.error + '</div></div>';
                return;
            }

            renderResults(data.results, query);
            if ($status) $status.textContent = (isChineseQuery(query) ? '中文' : 'EN') + '搜索 "' + query + '" — 找到 ' + data.total + ' 个结果';

        } catch(e) {
            if ($results) $results.innerHTML = '<div class="ts-empty-state"><div class="ts-empty-icon">❌</div><div class="ts-empty-text">搜索失败: ' + e.message + '</div></div>';
        } finally {
            isSearching = false;
        }
    }

    function renderResults(results) {
        if (!results || results.length === 0) {
            if ($results) $results.innerHTML = '<div class="ts-empty-state"><div class="ts-empty-icon">🔍</div><div class="ts-empty-text">没有找到匹配的标签<br><small>试试其他关键词</small></div></div>';
            return;
        }
        var doHighlight = settings.highlight === 'yes';
        if (settings.format === 'table') renderTable(results, doHighlight);
        else if (settings.format === 'card') renderCards(results, doHighlight);
        else renderCompact(results, doHighlight);
    }

    function highlightText(text, doHighlight) {
        if (!doHighlight || !currentQuery) return escapeHtml(text);
        var q = currentQuery.toLowerCase();
        var t = text.toLowerCase();
        var idx = t.indexOf(q);
        if (idx === -1) return escapeHtml(text);
        return escapeHtml(text.slice(0, idx)) + '<span class="ts-mark">' + escapeHtml(text.slice(idx, idx + currentQuery.length)) + '</span>' + highlightText(text.slice(idx + currentQuery.length), doHighlight);
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function attachClickHandlers(els, getData) {
        for (var i = 0; i < els.length; i++) {
            var d = getData(els[i]);
            els[i].addEventListener('click', (function(en, zh) {
                return function() { handleTagClick(en, zh); };
            })(d.en, d.zh));
        }
    }

    function renderTable(results, doHighlight) {
        var html = '<table class="ts-table"><thead><tr><th>English Tag</th><th>中文翻译</th><th>复制</th></tr></thead><tbody>';
        for (var i = 0; i < results.length; i++) {
            var r = results[i];
            html += '<tr data-en="' + escapeHtml(r.en) + '" data-zh="' + escapeHtml(r.zh) + '">' +
                '<td><span class="ts-tag-en">' + highlightText(r.en, doHighlight) + '</span></td>' +
                '<td><span class="ts-tag-zh">' + highlightText(r.zh, doHighlight) + '</span></td>' +
                '<td><span class="ts-copy-cell">📋</span></td></tr>';
        }
        html += '</tbody></table>';
        if ($results) $results.innerHTML = html;
        if ($results) attachClickHandlers($results.querySelectorAll('tr[data-en]'), function(el) { return { en: el.dataset.en, zh: el.dataset.zh }; });
    }

    function renderCards(results, doHighlight) {
        var html = '<div class="ts-cards">';
        for (var i = 0; i < results.length; i++) {
            var r = results[i];
            html += '<div class="ts-card" data-en="' + escapeHtml(r.en) + '" data-zh="' + escapeHtml(r.zh) + '">' +
                '<div class="ts-card-en">' + highlightText(r.en, doHighlight) + '</div>' +
                '<div class="ts-card-zh">' + highlightText(r.zh, doHighlight) + '</div></div>';
        }
        html += '</div>';
        if ($results) $results.innerHTML = html;
        if ($results) attachClickHandlers($results.querySelectorAll('.ts-card[data-en]'), function(el) { return { en: el.dataset.en, zh: el.dataset.zh }; });
    }

    function renderCompact(results, doHighlight) {
        var html = '<div class="ts-compact">';
        for (var i = 0; i < results.length; i++) {
            var r = results[i];
            html += '<div class="ts-compact-item" data-en="' + escapeHtml(r.en) + '" data-zh="' + escapeHtml(r.zh) + '">' +
                '<span class="ts-compact-en">' + highlightText(r.en, doHighlight) + '</span>' +
                '<span class="ts-compact-sep">→</span>' +
                '<span class="ts-compact-zh">' + highlightText(r.zh, doHighlight) + '</span></div>';
        }
        html += '</div>';
        if ($results) $results.innerHTML = html;
        if ($results) attachClickHandlers($results.querySelectorAll('.ts-compact-item[data-en]'), function(el) { return { en: el.dataset.en, zh: el.dataset.zh }; });
    }

    function handleTagClick(en, zh) {
        var text = en.replace(/ /g, '_');
        if (settings.clickAction === 'copy_zh') text = zh;
        else if (settings.clickAction === 'copy_both') text = en + ' → ' + zh;
        copyToClipboard(text);
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() { showToast('已复制: ' + text); }).catch(function() { fallbackCopy(text); });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showToast('已复制: ' + text); }
        catch(e) { showToast('复制失败，请手动复制'); }
        document.body.removeChild(ta);
    }

    function showToast(msg) {
        var toast = document.getElementById('ts-toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.style.display = 'block';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(function() { toast.style.display = 'none'; }, 1500);
    }

    function showEmpty() {
        currentQuery = '';
        if ($results) $results.innerHTML = '<div class="ts-empty-state"><div class="ts-empty-icon">🏷️</div><div class="ts-empty-text">输入关键词开始搜索<br><small>14万 Danbooru 标签，支持中英双语搜索</small></div></div>';
        if ($status) $status.textContent = '';
    }

    
    // ===== Multi-strategy initialization =====
    function tryInit() {
        var el = document.getElementById('ts-search-input');
        if (el && !initialized) { init(); return true; }
        return false;
    }

    if (!tryInit()) {
        document.addEventListener('DOMContentLoaded', function() {
            if (!tryInit()) {
                setTimeout(function() { tryInit(); }, 100);
                setTimeout(function() { tryInit(); }, 500);
                setTimeout(function() { tryInit(); }, 1000);
            }
        });
        window.addEventListener('load', function() {
            setTimeout(function() { tryInit(); }, 50);
        });
    }
})();