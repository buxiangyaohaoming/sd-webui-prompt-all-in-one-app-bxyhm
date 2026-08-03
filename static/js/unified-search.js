/**
 * Unified Search — 智能搜索（标签/角色/系列/特征）
 */
(function() {
    'use strict';

    // ===== State =====
    var currentMode = 'tag';
    var currentQuery = '';
    var currentPage = 1;
    var totalPages = 1;
    var isSearching = false;
    var searchTimer = null;
    var charSearchTimer = null;
    var initialized = false;
    var underscoreToSpace = false;
    var commaSpaceEnabled = false;

    // ===== DOM Elements =====
    var $input, $hint, $clearBtn, $results, $resultsTag, $resultsChar, $status, $toast;
    var $pagination, $pageInfo, $prevPage, $nextPage;
    var $modeBtns, $searchIcon, $searchOptions, $underscoreToggle, $commaSpaceToggle;
    var $inputSeries, $inputFeature, $wrapSeries, $wrapFeature;

    // ===== Mode Config =====
    var MODE_CONFIG = {
        tag: {
            icon: '🏷️',
            placeholder: '输入英文搜标签 / 输中文搜翻译...',
            emptyIcon: '🏷️',
            emptyText: '输入关键词开始搜索<br><small>14万 Danbooru 标签，支持中英双语搜索</small>',
            options: ''
        },
        character: {
            icon: '👤',
            placeholder: '输入角色名 / 角色tag / 中文译名...',
            emptyIcon: '👤',
            emptyText: '输入角色名、系列或特征开始搜索<br><small>可组合筛选：任意字段均可留空</small>',
            options: '<label class="search-option-label"><input type="checkbox" id="opt-exact"> <span>精准匹配</span></label>' +
                     '<label class="search-option-label"><input type="checkbox" id="opt-hide-no-tags" checked> <span>仅显示有属性标签的角色</span></label>'
        }
    };

    function init() {
        if (initialized) return;
        initialized = true;

        // 隔离 range 滑块滚轮行为：滚轮调整滑块值时阻止页面滚动
        initRangeScrollIsolation();

        $input = document.getElementById('search-input');
        $hint = document.getElementById('search-hint');
        $clearBtn = document.getElementById('search-clear-btn');
        $status = document.getElementById('search-status');
        $toast = document.getElementById('search-toast');
        $pagination = document.getElementById('search-pagination');
        $pageInfo = document.getElementById('search-page-info');
        $prevPage = document.getElementById('search-prev-page');
        $nextPage = document.getElementById('search-next-page');
        $modeBtns = document.querySelectorAll('.search-mode-btn');
        $searchIcon = document.getElementById('search-icon');
        $searchOptions = document.getElementById('search-options');
        $underscoreToggle = document.getElementById('underscore-toggle');
        $inputSeries = document.getElementById('search-input-series');
        $inputFeature = document.getElementById('search-input-feature');
        $wrapSeries = document.getElementById('search-input-wrap-series');
        $wrapFeature = document.getElementById('search-input-wrap-feature');

        // 双容器：切换子模式不销毁内容
        $resultsTag = document.getElementById('search-results-tag');
        $resultsChar = document.getElementById('search-results-character');

        // Load underscore setting
        try {
            underscoreToSpace = localStorage.getItem('ts_underscore_to_space') === 'true';
        } catch(e) { underscoreToSpace = false; }
        if ($underscoreToggle) {
            $underscoreToggle.checked = underscoreToSpace;
            $underscoreToggle.addEventListener('change', function() {
                underscoreToSpace = this.checked;
                try { localStorage.setItem('ts_underscore_to_space', String(this.checked)); } catch(e) {}
            });
        }

        // Load comma-space setting
        $commaSpaceToggle = document.getElementById('comma-space-toggle');
        try {
            commaSpaceEnabled = localStorage.getItem('ts_comma_space') === 'true';
        } catch(e) { commaSpaceEnabled = false; }
        if ($commaSpaceToggle) {
            $commaSpaceToggle.checked = commaSpaceEnabled;
            $commaSpaceToggle.addEventListener('change', function() {
                commaSpaceEnabled = this.checked;
                try { localStorage.setItem('ts_comma_space', String(this.checked)); } catch(e) {}
            });
        }

        bindEvents();
        initBackToTop();
        switchMode('tag');
        updateInitWithNewFeatures();
    }

    function bindEvents() {
        if (!$input) { console.error('[UnifiedSearch] input not found'); return; }

        // Mode switching
        $modeBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var mode = this.dataset.mode;
                switchMode(mode);
            });
        });

        // Input handling — main search input
        $input.addEventListener('input', function() {
            var val = this.value.trim();
            updateHint(val);
            clearTimeout(searchTimer);
            if (currentMode === 'tag') {
                // Tag mode: requires input
                $clearBtn.style.display = val ? 'block' : 'none';
                if (!val) { showEmpty(); return; }
                searchTimer = setTimeout(function() { doSearch(val, 1); }, 300);
            } else {
                // Character mode: any field can trigger search
                triggerCharacterSearch();
            }
        });

        // Input handling — series input
        if ($inputSeries) {
            $inputSeries.addEventListener('input', function() { triggerCharacterSearch(); });
            $inputSeries.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') { e.preventDefault(); triggerCharacterSearch(true); }
            });
        }

        // Input handling — feature input
        if ($inputFeature) {
            $inputFeature.addEventListener('input', function() { triggerCharacterSearch(); });
            $inputFeature.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') { e.preventDefault(); triggerCharacterSearch(true); }
            });
        }

        $clearBtn.addEventListener('click', function() {
            $input.value = '';
            if ($inputSeries) $inputSeries.value = '';
            if ($inputFeature) $inputFeature.value = '';
            $clearBtn.style.display = 'none';
            $hint.textContent = '';
            showEmpty();
            $input.focus();
        });

        $input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(searchTimer);
                if (currentMode === 'tag') {
                    var val = this.value.trim();
                    if (val) doSearch(val, 1);
                } else {
                    triggerCharacterSearch(true);
                }
            }
        });

        // Pagination
        if ($prevPage) {
            $prevPage.addEventListener('click', function() {
                if (currentPage > 1) {
                    if (currentMode === 'character') {
                        triggerCharacterSearch(true, currentPage - 1);
                    } else {
                        doSearch(currentQuery, currentPage - 1);
                    }
                }
            });
        }
        if ($nextPage) {
            $nextPage.addEventListener('click', function() {
                if (currentPage < totalPages) {
                    if (currentMode === 'character') {
                        triggerCharacterSearch(true, currentPage + 1);
                    } else {
                        doSearch(currentQuery, currentPage + 1);
                    }
                }
            });
        }
    }

    // 各子模式独立页面滚动位置
    var _modeScrollY = { tag: 0, character: 0 };
    var _switchingSubMode = false;

    function switchMode(mode) {
        // 保存当前模式的页面滚动位置
        _modeScrollY[currentMode] = window.scrollY;

        currentMode = mode;
        currentPage = 1;
        totalPages = 1;

        // 切换结果容器：不销毁内容，仅显隐
        if ($resultsTag) $resultsTag.style.display = mode === 'tag' ? '' : 'none';
        if ($resultsChar) $resultsChar.style.display = mode === 'character' ? '' : 'none';
        $results = mode === 'tag' ? $resultsTag : $resultsChar;

        // Update button states
        $modeBtns.forEach(function(btn) {
            if (btn.dataset.mode === mode) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // Update UI for mode
        var config = MODE_CONFIG[mode];
        $searchIcon.textContent = config.icon;
        $input.placeholder = config.placeholder;

        // Update empty state in active container
        var emptyIcon = $results ? $results.querySelector('.ts-empty-icon') : null;
        var emptyText = $results ? $results.querySelector('.ts-empty-text') : null;
        if (emptyIcon) emptyIcon.textContent = config.emptyIcon;
        if (emptyText) emptyText.innerHTML = config.emptyText;

        $searchOptions.innerHTML = config.options;

        // Show/hide character-specific inputs
        var showExtra = mode === 'character';
        if ($wrapSeries) $wrapSeries.style.display = showExtra ? 'flex' : 'none';
        if ($wrapFeature) $wrapFeature.style.display = showExtra ? 'flex' : 'none';

        // Set main input ID hint
        if ($input) $input.dataset.field = 'name';

        // 清空输入框，但保留搜索结果（内容不销毁）
        $input.value = '';
        if ($inputSeries) $inputSeries.value = '';
        if ($inputFeature) $inputFeature.value = '';
        $clearBtn.style.display = 'none';
        $input.focus();

        // 恢复目标模式的页面滚动位置
        _switchingSubMode = true;
        window.scrollTo({ top: _modeScrollY[mode] || 0, behavior: 'instant' });
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                _switchingSubMode = false;
            });
        });
    }

    function updateHint(val) {
        if (!val) { $hint.textContent = ''; return; }
        var isChinese = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(val);
        $hint.textContent = isChinese ? '中文搜索' : 'EN搜索';
    }

    // ===== #10: Combined Character Search (server-side intersection) =====
    function triggerCharacterSearch(immediate, page) {
        page = page || 1;
        var nameVal = ($input && $input.value || '').trim();
        var seriesVal = ($inputSeries && $inputSeries.value || '').trim();
        var featureVal = ($inputFeature && $inputFeature.value || '').trim();

        // Show clear button if any field has content
        if ($clearBtn) $clearBtn.style.display = (nameVal || seriesVal || featureVal) ? 'block' : 'none';

        // If all empty, show empty state
        if (!nameVal && !seriesVal && !featureVal) { showEmpty(); return; }

        clearTimeout(charSearchTimer);
        var delay = immediate ? 0 : 300;
        charSearchTimer = setTimeout(function() {
            doCharacterSearch(nameVal, seriesVal, featureVal, page);
        }, delay);
    }

    async function doCharacterSearch(nameQuery, seriesQuery, featureQuery, page) {
        if (isSearching) return;
        isSearching = true;
        page = page || 1;
        currentQuery = [nameQuery, seriesQuery, featureQuery].filter(Boolean).join(' | ');

        if ($results) $results.innerHTML = '<div class="ts-loading">搜索中...</div>';
        if ($pagination) $pagination.style.display = 'none';

        try {
            var submode = 'fuzzy';
            var exactOpt = document.getElementById('opt-exact');
            if (exactOpt && exactOpt.checked) submode = 'exact';

            // Single API call with server-side intersection — no truncation
            var url = '/api/search?mode=combined&page=' + page + '&per_page=200';
            if (nameQuery) url += '&q=' + encodeURIComponent(nameQuery) + '&submode=' + submode;
            if (seriesQuery) url += '&series=' + encodeURIComponent(seriesQuery);
            if (featureQuery) url += '&feature=' + encodeURIComponent(featureQuery);
            var hideNoTags = document.getElementById('opt-hide-no-tags');
            if (hideNoTags && hideNoTags.checked) url += '&exclude_no_tags=true';

            var resp = await fetch(url);
            if (!resp.ok) throw new Error('API error: ' + resp.status);
            var data = await resp.json();

            if (data.error) {
                if ($results) $results.innerHTML = '<div class="ts-empty-state"><div class="ts-empty-icon">⚠️</div><div class="ts-empty-text">' + data.error + '</div></div>';
                return;
            }

            if (!data.results || data.results.length === 0) {
                if ($results) $results.innerHTML = '<div class="ts-empty-state"><div class="ts-empty-icon">🔍</div><div class="ts-empty-text">没有找到匹配的角色<br><small>尝试减少筛选条件</small></div></div>';
            } else {
                renderResults(data.results, currentQuery);
            }

            updatePagination(data.page, data.total_pages, data.total);
            if ($status) $status.textContent = '角色搜索 "' + currentQuery + '" — 找到 ' + (data.total || 0) + ' 个结果';

        } catch(e) {
            if ($results) $results.innerHTML = '<div class="ts-empty-state"><div class="ts-empty-icon">❌</div><div class="ts-empty-text">搜索失败: ' + e.message + '</div></div>';
        } finally {
            isSearching = false;
        }
    }

    async function doSearch(query, page) {
        if (!$input || isSearching) return;
        isSearching = true;
        currentQuery = query;
        currentPage = page;

        var url = '/api/search?q=' + encodeURIComponent(query) + '&mode=' + currentMode + '&page=' + page + '&per_page=100';
        
        // Add submode for character search
        if (currentMode === 'character') {
            var exactOpt = document.getElementById('opt-exact');
            var submode = (exactOpt && exactOpt.checked) ? 'exact' : 'fuzzy';
            url += '&submode=' + submode;
        }

        if ($results) $results.innerHTML = '<div class="ts-loading">搜索中...</div>';
        if ($pagination) $pagination.style.display = 'none';

        try {
            var resp = await fetch(url);
            if (!resp.ok) throw new Error('API error: ' + resp.status);
            var data = await resp.json();

            if (data.error) {
                if ($results) $results.innerHTML = '<div class="ts-empty-state"><div class="ts-empty-icon">⚠️</div><div class="ts-empty-text">' + data.error + '</div></div>';
                return;
            }

            renderResults(data.results, query);
            updatePagination(data.page, data.total_pages, data.total);

        } catch(e) {
            if ($results) $results.innerHTML = '<div class="ts-empty-state"><div class="ts-empty-icon">❌</div><div class="ts-empty-text">搜索失败: ' + e.message + '</div></div>';
        } finally {
            isSearching = false;
        }
    }

    function renderResults(results, query) {
        if (!results || results.length === 0) {
            if ($results) {
                $results.innerHTML = '<div class="ts-empty-state"><div class="ts-empty-icon">🔍</div><div class="ts-empty-text">没有找到匹配的结果<br><small>试试其他关键词</small></div></div>';
            }
            return;
        }

        var html = '';
        if (currentMode === 'tag') {
            html = renderTagResults(results, query);
        } else {
            html = renderCharacterResults(results);
        }

        if ($results) $results.innerHTML = html;
        bindResultEvents();

        // 搜索结果已渲染，延迟加载角色图片（不阻塞搜索展示）
        lazyLoadCharacterImages();
    }

    /**
     * 延迟加载角色图片：先展示搜索结果，再错峰加载图片。
     * 避免所有图片同时请求阻塞服务器，确保搜索响应不受影响。
     *
     * 重试机制：每张图片最多尝试 4 次（首次 + 3 次重试），
     * 全部失败后停止，直到下次搜索（DOM 重建）或页面刷新。
     */
    var _imageLoadTimer = null;
    function lazyLoadCharacterImages() {
        // 清除上次未完成的加载计划
        if (_imageLoadTimer) clearTimeout(_imageLoadTimer);

        _imageLoadTimer = setTimeout(function() {
            var images = document.querySelectorAll('img.cs-character-image[data-src]');
            if (images.length === 0) return;

            // 交错加载：每张图片间隔 80ms，避免瞬间大量并发请求
            var staggerMs = 80;
            // 同一时间最多 3 个并发（浏览器自身限制通常为 6，留余量给其他资源）
            var batchSize = 3;

            for (var i = 0; i < images.length; i++) {
                (function(img, delay) {
                    setTimeout(function() {
                        var src = img.getAttribute('data-src');
                        if (src) {
                            // 绑定错误重试处理器（在设置 src 之前）
                            _bindImageRetry(img, src);
                            img.setAttribute('src', src);
                            img.removeAttribute('data-src');
                        }
                    }, delay);
                })(images[i], Math.floor(i / batchSize) * staggerMs);
            }
        }, 100); // 100ms 延迟确保 DOM 已渲染完成
    }

    /**
     * 为单张图片绑定加载错误时的重试逻辑。
     * - 最多尝试 retryMax 次（默认 4）
     * - 每次重试间隔递增：1s, 2s, 4s
     * - 全部失败后隐藏图片容器（添加 cs-image-error 类）
     */
    function _bindImageRetry(img, baseSrc) {
        var _retrying = false; // 防止并发重试

        img.addEventListener('error', function() {
            if (_retrying) return; // 已在重试流程中，忽略重复 error 事件
            _retrying = true;

            var count = parseInt(img.getAttribute('data-retry-count')) || 0;
            var maxRetries = parseInt(img.getAttribute('data-retry-max')) || 4;

            count++;
            img.setAttribute('data-retry-count', count);

            if (count < maxRetries) {
                // 还有重试机会：递增延迟后重试
                var delay = Math.pow(2, count - 1) * 1000; // 1s, 2s, 4s
                setTimeout(function() {
                    // 添加 cache-busting 参数，确保重新请求
                    var retrySrc = baseSrc + '&_retry=' + count;
                    img.setAttribute('src', retrySrc);
                    _retrying = false;
                }, delay);
            } else {
                // 所有重试次数用尽：隐藏图片容器
                img.parentElement.classList.add('cs-image-error');
                _retrying = false;
            }
        });

        // 加载成功时重置重试计数（用于未来可能的动态操作）
        img.addEventListener('load', function() {
            _retrying = false;
        });
    }

    function renderTagResults(results, query) {
        var html = '<table class="ts-table"><thead><tr><th>English Tag</th><th>中文翻译</th><th>操作</th></tr></thead><tbody>';
        for (var i = 0; i < results.length; i++) {
            var r = results[i];
            html += '<tr data-en="' + escapeHtml(r.en) + '" data-zh="' + escapeHtml(r.zh) + '">' +
                '<td><span class="ts-tag-en">' + highlightText(r.en, query) + '</span></td>' +
                '<td><span class="ts-tag-zh">' + highlightText(r.zh, query) + '</span></td>' +
                '<td class="ts-action-cell">' +
                    '<span class="ts-action-btn ts-copy-btn" title="复制">📋</span>' +
                    '<span class="ts-action-btn ts-insert-btn" title="插入到提示词">➕</span>' +
                '</td></tr>';
        }
        html += '</tbody></table>';
        return html;
    }

    function renderCharacterResults(results) {
        var html = '<div class="cs-character-list">';
        for (var i = 0; i < results.length; i++) {
            var r = results[i];
            html += renderCharacterCard(r);
        }
        html += '</div>';
        return html;
    }

    function renderCharacterCard(char) {
        var nameDisplay = char.name;
        if (char.name_zh) nameDisplay += ' (' + char.name_zh + ')';

        var seriesDisplay = char.series_name;
        if (char.series_zh) seriesDisplay += ' (' + char.series_zh + ')';

        var tagsHtml = '';
        for (var i = 0; i < char.tags.length; i++) {
            var tag = char.tags[i];
            var tagZh = char.tags_zh && char.tags_zh[i] ? char.tags_zh[i] : '';
            var displayText = tagZh ? escapeHtml(tag) + ' <span class="cs-tag-zh">(' + escapeHtml(tagZh) + ')</span>' : escapeHtml(tag);
            tagsHtml += '<span class="cs-tag" data-tag="' + escapeHtml(tag) + '" data-type="attr">' + displayText + '</span>';
        }

        var totalTags = char.tags.length + 2;

        // 角色图片：延迟加载，先展示搜索结果再加载图片
        var imgUrl = '/api/character-image?slug=' + encodeURIComponent(char.tag);

        return '<div class="cs-character-card">' +
            '<div class="cs-character-image-wrap">' +
                '<img class="cs-character-image" data-src="' + imgUrl + '"' +
                ' alt="' + escapeHtml(char.name) + '"' +
                ' loading="lazy"' +
                ' data-retry-count="0"' +
                ' data-retry-max="4" />' +
            '</div>' +
            '<div class="cs-character-body">' +
                '<div class="cs-character-header">' +
                    '<div class="cs-character-name">' + escapeHtml(nameDisplay) + '</div>' +
                    '<div class="cs-character-series">' + escapeHtml(seriesDisplay) + '</div>' +
                '</div>' +
                '<div class="cs-tags-section">' +
                    '<div class="cs-tags-label">角色 &amp; 作品（默认已选）</div>' +
                    '<div class="cs-tags-cloud">' +
                        '<span class="cs-tag cs-meta-tag cs-selected" data-tag="' + escapeHtml(char.tag) + '" data-type="meta">👤 ' + escapeHtml(char.tag) + '</span>' +
                        '<span class="cs-tag cs-meta-tag cs-selected" data-tag="' + escapeHtml(char.series) + '" data-type="meta">📺 ' + escapeHtml(char.series) + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="cs-tags-section">' +
                    '<div class="cs-tags-label">属性标签（点击选择 / 取消）</div>' +
                    '<div class="cs-tags-cloud">' + tagsHtml + '</div>' +
                '</div>' +
                '<div class="cs-actions">' +
                    '<button class="cs-copy-selected-btn">📋 复制选中（<span class="cs-sel-num">2</span> 个标签）</button>' +
                    '<button class="cs-select-all-btn">✅ 全选属性</button>' +
                    '<span class="cs-selected-count">已选 <strong class="cs-sel-num">2</strong> / ' + totalTags + '</span>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    function highlightText(text, query) {
        if (!query) return escapeHtml(text);
        var q = query.toLowerCase();
        var t = text.toLowerCase();
        var idx = t.indexOf(q);
        if (idx === -1) return escapeHtml(text);
        return escapeHtml(text.slice(0, idx)) + '<span class="ts-mark">' + escapeHtml(text.slice(idx, idx + query.length)) + '</span>' + highlightText(text.slice(idx + query.length), query);
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function updateCardSelection(card) {
        var selected = card.querySelectorAll('.cs-tag.cs-selected').length;
        var nums = card.querySelectorAll('.cs-sel-num');
        nums.forEach(function(el) { el.textContent = selected; });
        var copyBtn = card.querySelector('.cs-copy-selected-btn');
        if (copyBtn) copyBtn.disabled = selected === 0;
    }

    function bindResultEvents() {
        if (!$results) return;

        if (currentMode === 'tag') {
            // Tag copy and insert
            var rows = $results.querySelectorAll('tr[data-en]');
            rows.forEach(function(row) {
                // Copy button
                var copyBtn = row.querySelector('.ts-copy-btn');
                if (copyBtn) {
                    copyBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        copyToClipboard(row.dataset.en.replace(/ /g, '_'));
                        showToast('已复制: ' + row.dataset.en);
                    });
                }
                // Insert button
                var insertBtn = row.querySelector('.ts-insert-btn');
                if (insertBtn) {
                    insertBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        insertToPrompt(row.dataset.en);
                    });
                }
                // Click row = copy
                row.addEventListener('click', function() {
                    copyToClipboard(this.dataset.en.replace(/ /g, '_'));
                    showToast('已复制: ' + this.dataset.en);
                });
            });
        } else {
            // Character cards: click-to-select mechanism
            var cards = $results.querySelectorAll('.cs-character-card');
            cards.forEach(function(card) {
                // Tag click → toggle selection
                var tags = card.querySelectorAll('.cs-tag');
                tags.forEach(function(tag) {
                    tag.addEventListener('click', function(e) {
                        e.stopPropagation();
                        this.classList.toggle('cs-selected');
                        updateCardSelection(card);
                    });
                });

                // Select all / deselect all attribute tags (toggle)
                var selectAllBtn = card.querySelector('.cs-select-all-btn');
                if (selectAllBtn) {
                    selectAllBtn.addEventListener('click', function() {
                        var attrTags = card.querySelectorAll('.cs-tag[data-type="attr"]');
                        var allSelected = true;
                        attrTags.forEach(function(t) {
                            if (!t.classList.contains('cs-selected')) allSelected = false;
                        });
                        if (allSelected) {
                            // Deselect all
                            attrTags.forEach(function(t) { t.classList.remove('cs-selected'); });
                            this.textContent = '✅ 全选属性';
                        } else {
                            // Select all
                            attrTags.forEach(function(t) { t.classList.add('cs-selected'); });
                            this.textContent = '🔄 取消全选';
                        }
                        updateCardSelection(card);
                    });
                }

                // Copy selected tags
                var copyBtn = card.querySelector('.cs-copy-selected-btn');
                if (copyBtn) {
                    copyBtn.addEventListener('click', function() {
                        var selected = card.querySelectorAll('.cs-tag.cs-selected');
                        if (selected.length === 0) return;
                        var selTags = [];
                        selected.forEach(function(t) { selTags.push(t.dataset.tag); });
                        var sep = commaSpaceEnabled ? ', ' : ',';
                        copyToClipboard(selTags.join(sep));
                        showToast('已复制 ' + selected.length + ' 个标签');
                    });
                }
            });
        }
    }

    function updatePagination(page, tp, total) {
        currentPage = page;
        totalPages = tp;

        if ($pagination) {
            if (tp > 1) {
                $pagination.style.display = 'flex';
                if ($pageInfo) $pageInfo.textContent = '第 ' + page + ' 页 / 共 ' + tp + ' 页（' + total + ' 条）';
                if ($prevPage) $prevPage.disabled = page <= 1;
                if ($nextPage) $nextPage.disabled = page >= tp;
            } else {
                $pagination.style.display = 'none';
            }
        }

        if ($status) {
            var modeNames = { tag: '标签', character: '角色' };
            $status.textContent = modeNames[currentMode] + '搜索 "' + currentQuery + '" — 找到 ' + total + ' 个结果';
        }
    }

    function copyToClipboard(text) {
        if (underscoreToSpace) {
            text = text.replace(/_/g, ' ');
        }
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

    // ===== #1: 插入到提示词 =====
    function insertToPrompt(tag) {
        trackTagUsage(tag);
        var textarea = document.querySelector('#txt2img_prompt textarea');
        if (!textarea) { showToast('找不到提示词输入框'); return; }
        var text = textarea.value;
        var tagFormatted = underscoreToSpace ? tag.replace(/_/g, ' ') : tag;
        var sep = commaSpaceEnabled ? ', ' : ',';
        var suffix = text.length > 0 && !/, *$/.test(text) ? sep : '';
        var insertText = suffix + tagFormatted;
        var pos = textarea.selectionStart;
        textarea.value = text.slice(0, pos) + insertText + text.slice(pos);
        var newPos = pos + insertText.length;
        textarea.selectionStart = newPos;
        textarea.selectionEnd = newPos;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
        showToast('已插入: ' + tagFormatted);
    }

    // ===== #8: 个人使用频率统计 =====
    var FREQ_KEY = 'ts_personal_freq';
    function getPersonalFreq() {
        try { return JSON.parse(localStorage.getItem(FREQ_KEY)) || {}; }
        catch(e) { return {}; }
    }
    function trackTagUsage(tag) {
        try {
            var freq = getPersonalFreq();
            freq[tag] = (freq[tag] || 0) + 1;
            localStorage.setItem(FREQ_KEY, JSON.stringify(freq));
        } catch(e) {}
    }
    function getTagPersonalFreq(tag) {
        var freq = getPersonalFreq();
        return freq[tag] || 0;
    }

    // ===== #9: 导出提示词 =====
    function exportPrompt() {
        var textarea = document.querySelector('#txt2img_prompt textarea');
        if (!textarea || !textarea.value.trim()) {
            showToast('提示词为空，无法导出');
            return;
        }
        var text = textarea.value;
        var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'prompt_' + new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-') + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('提示词已导出');
    }

    // ===== #7: 提示词模板 =====
    var TEMPLATE_KEY = 'ts_templates';
    function getTemplates() {
        try { return JSON.parse(localStorage.getItem(TEMPLATE_KEY)) || []; }
        catch(e) { return []; }
    }
    function saveTemplate(name) {
        var textarea = document.querySelector('#txt2img_prompt textarea');
        if (!textarea || !textarea.value.trim()) {
            showToast('提示词为空，无法保存模板');
            return;
        }
        if (!name || !name.trim()) {
            name = prompt('请输入模板名称:');
            if (!name) return;
        }
        var templates = getTemplates();
        templates.push({ name: name.trim(), text: textarea.value, time: Date.now() });
        localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
        showToast('模板已保存: ' + name.trim());
        renderTemplateList();
    }
    function loadTemplate(name) {
        var templates = getTemplates();
        for (var i = 0; i < templates.length; i++) {
            if (templates[i].name === name) {
                var textarea = document.querySelector('#txt2img_prompt textarea');
                if (!textarea) return;
                textarea.value = templates[i].text;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                showToast('已加载模板: ' + name);
                return;
            }
        }
    }
    function deleteTemplate(name) {
        var templates = getTemplates().filter(function(t) { return t.name !== name; });
        localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
        renderTemplateList();
    }
    function renderTemplateList() {
        var container = document.getElementById('ts-template-list');
        if (!container) return;
        var templates = getTemplates();
        if (templates.length === 0) {
            container.innerHTML = '<div class="ts-empty-small">暂无模板</div>';
            return;
        }
        var html = '';
        for (var i = templates.length - 1; i >= 0; i--) {
            var t = templates[i];
            var safeName = escapeHtml(t.name).replace(/'/g, "\\'");
            html += '<div class="ts-tpl-item">' +
                '<span class="ts-tpl-name" onclick="loadTemplate(\'' + safeName + '\')">' + escapeHtml(t.name) + '</span>' +
                '<span class="ts-tpl-del" onclick="deleteTemplate(\'' + safeName + '\')">✕</span></div>';
        }
        container.innerHTML = html;
    }

    // Expose globals for HTML onclick handlers
    window.insertToPrompt = insertToPrompt;
    window.exportPrompt = exportPrompt;
    window.saveTemplate = saveTemplate;
    window.loadTemplate = loadTemplate;
    window.deleteTemplate = deleteTemplate;
    window.renderTemplateList = renderTemplateList;

    // ===== Range Slider Scroll Isolation =====
    // 在 range 滑块上使用滚轮时，手动调整滑块值并阻止页面滚动
    function initRangeScrollIsolation() {
        document.addEventListener('wheel', function(e) {
            var target = e.target;
            if (target.tagName !== 'INPUT' || target.type !== 'range') return;

            // 阻止页面滚动
            e.preventDefault();

            // 手动步进滑块值
            var step = parseFloat(target.step) || 1;
            var min = parseFloat(target.min);
            var max = parseFloat(target.max);
            var delta = e.deltaY > 0 ? -step : step;
            var newVal = parseFloat(target.value) + delta;

            // 边界钳制
            if (!isNaN(min)) newVal = Math.max(min, newVal);
            if (!isNaN(max)) newVal = Math.min(max, newVal);

            target.value = newVal;
            // 触发 input + change 事件，确保 Gradio 感知值变化
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
        }, { passive: false });
    }

    // ===== Back to Top Button + Sticky Top Tabs =====
    var $backToTop;
    var $tabHeaders;
    var _lastScrollY = 0;
    var _scrollTicking = false;

    function initBackToTop() {
        $backToTop = document.getElementById('search-back-to-top');
        $tabHeaders = document.getElementById('tab-headers');

        // Unified scroll handler (rAF-throttled)
        window.addEventListener('scroll', function() {
            if (!_scrollTicking) {
                requestAnimationFrame(function() {
                    var scrollY = window.scrollY;

                    // 记录当前子模式的页面滚动位置（切换期间跳过，避免覆盖恢复值）
                    if (!_switchingSubMode) {
                        _modeScrollY[currentMode] = scrollY;
                    }

                    // Back-to-top button
                    if ($backToTop) {
                        if (scrollY > 400) {
                            $backToTop.classList.add('visible');
                        } else {
                            $backToTop.classList.remove('visible');
                        }
                    }

                    // 顶部标签切换栏：下滑缓慢隐藏，上滑立即出现
                    if ($tabHeaders) {
                        var SCROLL_THRESHOLD = 50;
                        if (scrollY > _lastScrollY && scrollY > SCROLL_THRESHOLD) {
                            $tabHeaders.classList.add('tab-headers-hidden');
                        } else if (scrollY < _lastScrollY) {
                            $tabHeaders.classList.remove('tab-headers-hidden');
                        }
                    }

                    _lastScrollY = scrollY;
                    _scrollTicking = false;
                });
                _scrollTicking = true;
            }
        }, { passive: true });

        // Click to scroll to top
        if ($backToTop) {
            $backToTop.addEventListener('click', function() {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    function updateInitWithNewFeatures() {
        // Bind export/template buttons in the search tab
        var exportBtn = document.querySelector('.ts-header-btn[onclick*="exportPrompt"]');
        var templateBtn = document.querySelector('.ts-header-btn[onclick*="saveTemplate"]');
        // These are handled via onclick in HTML, but we also render template list on init
        renderTemplateList();
    }

    function showEmpty() {
        currentQuery = '';
        currentPage = 1;
        totalPages = 1;
        if ($pagination) $pagination.style.display = 'none';
        if ($results) {
            var config = MODE_CONFIG[currentMode];
            $results.innerHTML = '<div class="ts-empty-state"><div class="ts-empty-icon">' + config.emptyIcon + '</div><div class="ts-empty-text">' + config.emptyText + '</div></div>';
        }
        if ($status) $status.textContent = '';
    }

    // Multi-strategy initialization
    function tryInit() {
        var el = document.getElementById('search-input');
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
