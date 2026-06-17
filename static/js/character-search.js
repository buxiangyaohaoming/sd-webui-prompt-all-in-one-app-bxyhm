/**
 * Character Search — 角色标签搜索
 * 搜索角色名/tag/中文译名，显示角色关联的标签段落
 */
(function() {
    'use strict';

    var $input, $hint, $clearBtn, $results, $status, $emptyState;
    var $modeExact, $toast;
    var searchTimer = null;
    var currentQuery = '';
    var isSearching = false;
    var initialized = false;

    function init() {
        if (initialized) return;
        initialized = true;

        $input = document.getElementById('cs-search-input');
        $hint = document.getElementById('cs-search-hint');
        $clearBtn = document.getElementById('cs-clear-btn');
        $results = document.getElementById('cs-results');
        $status = document.getElementById('cs-status');
        $emptyState = document.getElementById('cs-empty-state');
        $modeExact = document.getElementById('cs-mode-exact');
        $toast = document.getElementById('cs-toast');

        bindEvents();
    }

    function bindEvents() {
        if (!$input) { console.error('[CharacterSearch] input not found'); return; }

        $input.addEventListener('input', function() {
            var val = this.value.trim();
            $clearBtn.style.display = val ? 'block' : 'none';
            updateHint(val);
            clearTimeout(searchTimer);
            if (!val) { showEmpty(); return; }
            searchTimer = setTimeout(function() { doSearch(val); }, 300);
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

        if ($modeExact) {
            $modeExact.addEventListener('change', function() {
                if (currentQuery) doSearch(currentQuery);
            });
        }
    }

    function updateHint(val) {
        if (!val) { $hint.textContent = ''; return; }
        var isChinese = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(val);
        $hint.textContent = isChinese ? '中文搜索' : 'EN搜索';
    }

    async function doSearch(query) {
        if (!$input) return;
        currentQuery = query;
        if (isSearching) return;
        isSearching = true;

        var mode = ($modeExact && $modeExact.checked) ? 'exact' : 'fuzzy';

        if ($results) $results.innerHTML = '<div class="ts-loading">搜索中...</div>';
        if ($status) $status.textContent = '';

        try {
            var resp = await fetch('/api/character-search?q=' + encodeURIComponent(query) + '&mode=' + mode);
            if (!resp.ok) throw new Error('API error: ' + resp.status);
            var data = await resp.json();

            if (data.error) {
                if ($results) $results.innerHTML = '<div class="ts-empty-state"><div class="ts-empty-icon">⚠️</div><div class="ts-empty-text">' + data.error + '</div></div>';
                return;
            }

            renderResults(data.results, query);

            var modeLabel = mode === 'exact' ? '精准' : '模糊';
            if ($status) $status.textContent = modeLabel + '搜索 "' + query + '" — 找到 ' + data.total + ' 个角色';

        } catch(e) {
            if ($results) $results.innerHTML = '<div class="ts-empty-state"><div class="ts-empty-icon">❌</div><div class="ts-empty-text">搜索失败: ' + e.message + '</div></div>';
        } finally {
            isSearching = false;
        }
    }

    function renderResults(results, query) {
        if (!results || results.length === 0) {
            if ($results) {
                $results.innerHTML = '<div class="ts-empty-state"><div class="ts-empty-icon">🔍</div><div class="ts-empty-text">没有找到匹配的角色<br><small>试试其他关键词，或切换到模糊搜索</small></div></div>';
            }
            return;
        }

        var html = '<div class="cs-character-list">';
        for (var i = 0; i < results.length; i++) {
            var r = results[i];
            html += renderCharacterCard(r, query);
        }
        html += '</div>';
        if ($results) $results.innerHTML = html;

        // Bind copy events
        bindCopyEvents();
    }

    function renderCharacterCard(char, query) {
        var nameDisplay = char.name;
        if (char.name_zh) {
            nameDisplay += ' (' + char.name_zh + ')';
        }

        var seriesDisplay = char.series_name;
        if (char.series_zh) {
            seriesDisplay += ' (' + char.series_zh + ')';
        }

        // Build tags HTML
        var tagsHtml = '';
        for (var i = 0; i < char.tags.length; i++) {
            var tag = char.tags[i];
            tagsHtml += '<span class="cs-tag" data-tag="' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</span>';
        }

        var allTags = char.tags.join(', ');

        return '<div class="cs-character-card">' +
            '<div class="cs-character-header">' +
                '<div class="cs-character-name">' + escapeHtml(nameDisplay) + '</div>' +
                '<div class="cs-character-series">' + escapeHtml(seriesDisplay) + '</div>' +
                '<div class="cs-character-tag">' + escapeHtml(char.tag) + '</div>' +
            '</div>' +
            '<div class="cs-tags-section">' +
                '<div class="cs-tags-label">关联标签（点击复制单个，或复制整段）:</div>' +
                '<div class="cs-tags-cloud">' + tagsHtml + '</div>' +
            '</div>' +
            '<div class="cs-actions">' +
                '<button class="cs-copy-all-btn" data-tags="' + escapeHtml(allTags) + '">📋 复制整段标签</button>' +
                '<button class="cs-copy-prompt-btn" data-tags="' + escapeHtml(allTags) + '">📝 复制为 Prompt</button>' +
            '</div>' +
        '</div>';
    }

    function bindCopyEvents() {
        if (!$results) return;

        // Individual tag copy
        var tags = $results.querySelectorAll('.cs-tag');
        for (var i = 0; i < tags.length; i++) {
            tags[i].addEventListener('click', function() {
                copyToClipboard(this.dataset.tag);
                showToast('已复制: ' + this.dataset.tag);
            });
        }

        // Copy all tags
        var copyAllBtns = $results.querySelectorAll('.cs-copy-all-btn');
        for (var j = 0; j < copyAllBtns.length; j++) {
            copyAllBtns[j].addEventListener('click', function() {
                var tags = this.dataset.tags;
                copyToClipboard(tags);
                showToast('已复制整段标签');
            });
        }

        // Copy as prompt (comma-separated, underscore spaces)
        var copyPromptBtns = $results.querySelectorAll('.cs-copy-prompt-btn');
        for (var k = 0; k < copyPromptBtns.length; k++) {
            copyPromptBtns[k].addEventListener('click', function() {
                var tags = this.dataset.tags.split(', ').map(function(t) {
                    return t.trim().replace(/ /g, '_');
                }).join(', ');
                copyToClipboard(tags);
                showToast('已复制为 Prompt 格式');
            });
        }
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(function() { fallbackCopy(text); });
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
        try { document.execCommand('copy'); }
        catch(e) {}
        document.body.removeChild(ta);
    }

    function showToast(msg) {
        if (!$toast) return;
        $toast.textContent = msg;
        $toast.style.display = 'block';
        clearTimeout($toast._timer);
        $toast._timer = setTimeout(function() { $toast.style.display = 'none'; }, 1500);
    }

    function showEmpty() {
        currentQuery = '';
        if ($results) {
            $results.innerHTML = '<div class="ts-empty-state"><div class="ts-empty-icon">👤</div><div class="ts-empty-text">输入角色名开始搜索<br><small>24万+ 角色数据，支持中英双语搜索</small></div></div>';
        }
        if ($status) $status.textContent = '';
    }

    // Multi-strategy initialization
    function tryInit() {
        var el = document.getElementById('cs-search-input');
        if (el && !initialized) { init(); return true; }
        return false;
    }

    if (!tryInit()) {
        document.addEventListener('DOMContentLoaded', function() {
            if (!tryInit()) {
                setTimeout(function() { tryInit(); }, 100);
                setTimeout(function() { tryInit(); }, 500);
            }
        });
        window.addEventListener('load', function() {
            setTimeout(function() { tryInit(); }, 50);
        });
    }
})();
