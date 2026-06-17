/**
 * Combo Manager — 标签组合管理
 * 自由组合标签，保存/加载，一键复制全部或部分
 */
(function() {
    'use strict';

    var COMBO_KEY = 'ts_combos';
    var PRESET_SEEDED_KEY = 'ts_combos_presets_seeded';
    var initialized = false;

    // ===== 推荐预设（约50个） =====
    var PRESETS = [
        // === 性行为场景 ===
        { name: '打飞机（手淫）', tags: ['solo', 'masturbation', 'penis', 'hand_on_own_penis', 'looking_at_penis', 'nsfw'] },
        { name: '口交（舔阴茎）', tags: ['fellatio', 'oral', 'penis_in_mouth', 'deepthroat', 'tongue_out', 'looking_at_viewer', 'nsfw'] },
        { name: '舔阴（口交女）', tags: ['cunnilingus', 'pussy_lick', 'oral', 'tongue_out', 'spread_legs', 'nsfw'] },
        { name: '乳交', tags: ['paizuri', 'breasts', 'between_breasts', 'penis', 'large_breasts', 'nsfw'] },
        { name: '肛交', tags: ['anal', 'anal_sex', 'penis_in_ass', 'doggystyle', 'from_behind', 'nsfw'] },
        { name: '骑乘位', tags: ['cowgirl_position', 'riding', 'breasts', 'looking_at_viewer', 'nsfw'] },
        { name: '后入式', tags: ['doggystyle', 'from_behind', 'ass', 'looking_back', 'arms_supporting', 'nsfw'] },
        { name: '传教士体位', tags: ['missionary', 'on_back', 'spread_legs', 'breasts', 'looking_at_viewer', 'nsfw'] },
        { name: '颜射', tags: ['facial', 'cum_on_face', 'cum', 'cumshot', 'nsfw'] },
        { name: '体内射精', tags: ['internal_cumshot', 'cum_in_pussy', 'cum', 'creampie', 'nsfw'] },
        { name: '口内射精', tags: ['cum_in_mouth', 'cum', 'fellatio', 'oral', 'tongue_out', 'nsfw'] },
        { name: '中出', tags: ['creampie', 'cum_in_pussy', 'internal_cumshot', 'cum_drip', 'nsfw'] },
        { name: '女自慰', tags: ['solo', 'masturbation', 'fingering', 'pussy', 'spread_legs', 'nsfw'] },
        { name: '六九式', tags: ['69', 'fellatio', 'cunnilingus', 'couple', 'oral', 'nsfw'] },
        { name: '足交', tags: ['footjob', 'feet', 'sole', 'toes', 'sitting', 'nsfw'] },
        { name: '指交', tags: ['fingering', 'pussy', 'fingering_self', 'spread_legs', 'solo', 'nsfw'] },
        { name: '手交', tags: ['handjob', 'penis', 'hand_on_another\'s_penis', 'looking_at_penis', 'nsfw'] },
        { name: '互相手淫', tags: ['mutual_masturbation', 'couple', 'penis', 'pussy', 'nsfw'] },
        { name: '多人群交', tags: ['threesome', 'orgy', 'group_sex', 'multiple_girls', 'nsfw'] },
        { name: '百合/女同', tags: ['yuri', 'two_girls', 'kissing', 'breasts', 'nsfw'] },
        { name: '触手', tags: ['tentacles', 'tentacle_sex', 'multiple_tentacles', 'nsfw'] },
        { name: '束缚/捆绑', tags: ['bound', 'bondage', 'rope', 'tied', 'restrained', 'nsfw'] },
        { name: '露出/户外性爱', tags: ['exhibitionism', 'outdoors', 'public', 'nude', 'sex', 'nsfw'] },
        { name: '浴池性爱', tags: ['bath', 'bathroom_sex', 'wet', 'breasts', 'steam', 'nsfw'] },

        // === 兽交 ===
        { name: '与马交配', tags: ['horse_penis', 'bestiality', 'horse', 'from_behind', 'nsfw'] },
        { name: '与狗交配', tags: ['dog', 'animal_penis', 'bestiality', 'from_behind', 'nsfw'] },
        { name: '兽交通用', tags: ['bestiality', 'animal_penis', 'nsfw'] },

        // === 视角/POV ===
        { name: 'POV第一人称', tags: ['pov', 'looking_at_viewer', 'penis', 'close-up', 'nsfw'] },
        { name: '俯视视角', tags: ['from_above', 'looking_down', 'breasts', 'downblouse', 'cleavage'] },
        { name: '仰视视角', tags: ['from_below', 'looking_up', 'upskirt', 'panties', 'skirt'] },

        // === 身体部位特写 ===
        { name: '胸部特写', tags: ['breasts', 'close-up', 'nipples', 'areolae', 'breast_focus', 'nsfw'] },
        { name: '臀部特写', tags: ['ass', 'close-up', 'ass_focus', 'panties', 'nsfw'] },
        { name: '阴部特写', tags: ['pussy', 'close-up', 'spread_legs', 'pussy_focus', 'nsfw'] },
        { name: '面部特写', tags: ['face', 'close-up', 'looking_at_viewer', 'detailed_face', 'detailed_eyes'] },
        { name: '足部特写', tags: ['feet', 'close-up', 'toes', 'soles', 'foot_focus'] },
        { name: '手部特写', tags: ['hands', 'close-up', 'fingers', 'hand_focus'] },
        { name: '阴茎特写', tags: ['penis', 'close-up', 'penis_focus', 'erection', 'nsfw'] },
        { name: '青筋阴茎', tags: ['veiny_penis', 'erection', 'penis', 'close-up', 'nsfw'] },

        // === 服装主题 ===
        { name: 'JK制服', tags: ['school_uniform', 'serafuku', 'pleated_skirt', 'thighhighs', '1girl'] },
        { name: '泳装', tags: ['swimsuit', 'bikini', 'pool', 'wet', 'outdoors', 'summer', '1girl'] },
        { name: '和服', tags: ['kimono', 'japanese_clothes', 'cherry_blossoms', 'traditional', '1girl'] },
        { name: '兔女郎', tags: ['bunny_girl', 'bunny_ears', 'leotard', 'fishnet', 'high_heels', '1girl'] },
        { name: '女仆装', tags: ['maid', 'maid_headdress', 'apron', 'frilled_skirt', 'lace', '1girl'] },
        { name: '旗袍', tags: ['china_dress', 'cheongsam', 'thigh_highs', 'high_heels', 'slit', '1girl'] },
        { name: '裸体', tags: ['completely_nude', 'nude', 'nipples', 'pussy', 'nsfw'] },
        { name: '透视装', tags: ['see-through', 'see-through_clothing', 'see-through_dress', 'nsfw', '1girl'] },

        // === SFW / 日常 ===
        { name: '单人肖像', tags: ['1girl', 'solo', 'portrait', 'looking_at_viewer', 'simple_background'] },
        { name: '户外风光', tags: ['1girl', 'outdoors', 'blue_sky', 'tree', 'grass', 'sunlight', 'masterpiece', 'best_quality'] },
        { name: '室内日常', tags: ['1girl', 'indoors', 'bedroom', 'bed', 'sitting', 'window', 'masterpiece'] },
        { name: '海滩少女', tags: ['1girl', 'beach', 'ocean', 'bikini', 'blue_sky', 'summer'] },
        { name: '校园场景', tags: ['1girl', 'school_uniform', 'classroom', 'desk', 'window', 'masterpiece'] },

        // === 质量增强 ===
        { name: '高质量基础', tags: ['masterpiece', 'best_quality', 'detailed', 'highres', 'absurdres', '1girl'] },
        { name: '写实风格', tags: ['photorealistic', 'realistic', 'detailed_face', 'detailed_eyes', '1girl'] },
        { name: '二次元风格', tags: ['1girl', 'anime_style', 'flat_color', 'simple_background', 'looking_at_viewer'] },
        { name: '负面提示词基础', tags: ['lowres', 'bad_anatomy', 'bad_hands', 'extra_fingers', 'missing_fingers', 'worst_quality', 'low_quality', 'normal_quality', 'jpeg_artifacts', 'signature', 'watermark'] },
    ];

    function getCombos() {
        try { return JSON.parse(localStorage.getItem(COMBO_KEY)) || []; }
        catch(e) { return []; }
    }
    function saveCombos(combos) {
        try { localStorage.setItem(COMBO_KEY, JSON.stringify(combos)); } catch(e) {}
    }

    function init() {
        if (initialized) return;
        initialized = true;
        bindComboEvents();
        seedPresetsIfNeeded();
        renderComboList();
    }

    function seedPresetsIfNeeded() {
        // Auto-seed on very first use (when no combos exist yet)
        var combos = getCombos();
        if (combos.length > 0) return; // Don't overwrite user data
        var seeded = false;
        try { seeded = localStorage.getItem(PRESET_SEEDED_KEY) === 'true'; } catch(e) {}
        if (seeded) return;

        var now = Date.now();
        for (var i = 0; i < PRESETS.length; i++) {
            combos.push({ name: PRESETS[i].name, tags: PRESETS[i].tags.slice(), time: now - (PRESETS.length - i) * 1000 });
        }
        saveCombos(combos);
        try { localStorage.setItem(PRESET_SEEDED_KEY, 'true'); } catch(e) {}
    }

    window.seedAllPresets = function() {
        var existing = getCombos();
        var existingNames = {};
        for (var i = 0; i < existing.length; i++) { existingNames[existing[i].name] = true; }
        var added = 0;
        var now = Date.now();
        for (var j = 0; j < PRESETS.length; j++) {
            if (existingNames[PRESETS[j].name]) continue; // Skip duplicates
            existing.push({ name: PRESETS[j].name, tags: PRESETS[j].tags.slice(), time: now - (PRESETS.length - j) * 1000 });
            added++;
        }
        if (added > 0) {
            saveCombos(existing);
            try { localStorage.setItem(PRESET_SEEDED_KEY, 'true'); } catch(e) {}
            renderComboList();
            showComboToast('✅ 已添加 ' + added + ' 个推荐预设');
        } else {
            showComboToast('所有预设已存在，无需重复添加');
        }
    };

    window.resetAllPresets = function() {
        if (!confirm('⚠️ 确定要重置为推荐预设吗？这将删除你自定义的所有组合！')) return;
        var combos = [];
        var now = Date.now();
        for (var i = 0; i < PRESETS.length; i++) {
            combos.push({ name: PRESETS[i].name, tags: PRESETS[i].tags.slice(), time: now - (PRESETS.length - i) * 1000 });
        }
        saveCombos(combos);
        try { localStorage.setItem(PRESET_SEEDED_KEY, 'true'); } catch(e) {}
        renderComboList();
        showComboToast('🔄 已重置为 ' + PRESETS.length + ' 个推荐预设');
    };

    function bindComboEvents() {
        // Save combo
        var saveBtn = document.getElementById('combo-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                saveCurrentCombo();
            });
        }

        // Clear form
        var clearBtn = document.getElementById('combo-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                document.getElementById('combo-name').value = '';
                document.getElementById('combo-tags').value = '';
            });
        }

        // Import from prompt
        var importBtn = document.getElementById('combo-import-btn');
        if (importBtn) {
            importBtn.addEventListener('click', function() {
                importFromPrompt();
            });
        }

        // Seed presets
        var seedBtn = document.getElementById('combo-seed-presets-btn');
        if (seedBtn) {
            seedBtn.addEventListener('click', function() {
                if (window.seedAllPresets) window.seedAllPresets();
            });
        }

        // Reset presets
        var resetBtn = document.getElementById('combo-reset-presets-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                if (window.resetAllPresets) window.resetAllPresets();
            });
        }
    }

    function saveCurrentCombo() {
        var nameInput = document.getElementById('combo-name');
        var tagsInput = document.getElementById('combo-tags');
        var name = (nameInput.value || '').trim();
        if (!name) {
            showComboToast('请输入组合名称');
            nameInput.focus();
            return;
        }

        // Parse tags: split by newline or comma
        var rawText = tagsInput.value || '';
        var tags = [];
        // First split by newline
        var lines = rawText.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;
            // Then split by comma within each line
            var parts = line.split(',');
            for (var j = 0; j < parts.length; j++) {
                var tag = parts[j].trim();
                if (tag) tags.push(tag);
            }
        }

        if (tags.length === 0) {
            showComboToast('请至少输入一个标签');
            tagsInput.focus();
            return;
        }

        var combos = getCombos();
        // Check if name exists - update
        var existingIdx = -1;
        for (var i = 0; i < combos.length; i++) {
            if (combos[i].name === name) { existingIdx = i; break; }
        }

        if (existingIdx >= 0) {
            combos[existingIdx].tags = tags;
            combos[existingIdx].time = Date.now();
            showComboToast('已更新组合: ' + name);
        } else {
            combos.push({ name: name, tags: tags, time: Date.now() });
            showComboToast('已保存组合: ' + name + ' (' + tags.length + ' 个标签)');
        }

        saveCombos(combos);

        // Clear form
        nameInput.value = '';
        tagsInput.value = '';

        renderComboList();
    }

    function importFromPrompt() {
        var textarea = document.querySelector('#txt2img_prompt textarea');
        if (!textarea || !textarea.value.trim()) {
            showComboToast('正向提示词为空，无法导入');
            return;
        }

        var text = textarea.value.trim();
        // Split by comma
        var tags = text.split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t.length > 0; });

        if (tags.length === 0) {
            showComboToast('未找到有效标签');
            return;
        }

        // Fill the tags textarea
        var tagsInput = document.getElementById('combo-tags');
        if (tagsInput) {
            tagsInput.value = tags.join(', ');
            showComboToast('已导入 ' + tags.length + ' 个标签');
        }
    }

    function renderComboList() {
        var container = document.getElementById('combo-list');
        var countEl = document.getElementById('combo-count');
        if (!container) return;

        var combos = getCombos();

        if (countEl) {
            countEl.textContent = combos.length + ' 个';
        }

        if (combos.length === 0) {
            container.innerHTML = '<div class="tc-empty">还没有保存的组合，上方新建一个吧 👆</div>';
            return;
        }

        // Sort newest first
        combos.sort(function(a, b) { return b.time - a.time; });

        var html = '';
        for (var i = 0; i < combos.length; i++) {
            var c = combos[i];
            var comboId = 'combo-' + i;
            var timeStr = formatTime(c.time);
            var tagCount = c.tags.length;

            html += '<div class="tc-combo-card" id="' + comboId + '">';
            html += '<div class="tc-combo-header">';
            html += '<span class="tc-combo-name">📦 ' + escapeHtml(c.name) + ' <span class="tc-combo-time">' + escapeHtml(timeStr) + '</span></span>';
            html += '<div class="tc-combo-actions">';
            html += '<button class="tc-btn tc-btn-primary tc-btn-sm" data-action="copy-all" data-combo="' + i + '">📋 复制全部 (' + tagCount + ')</button>';
            html += '<button class="tc-btn tc-btn-secondary tc-btn-sm" data-action="insert-all" data-combo="' + i + '">➕ 插入提示词</button>';
            html += '<button class="tc-btn tc-btn-danger tc-btn-sm" data-action="edit" data-combo="' + i + '">✏️</button>';
            html += '<button class="tc-btn tc-btn-danger tc-btn-sm" data-action="delete" data-combo="' + i + '">🗑️</button>';
            html += '</div>';
            html += '</div>';

            html += '<div class="tc-combo-body">';
            html += '<div class="tc-combo-tags">';
            for (var j = 0; j < c.tags.length; j++) {
                html += '<span class="tc-tag-pill" data-combo="' + i + '" data-idx="' + j + '" title="点击复制标签">';
                html += escapeHtml(c.tags[j]);
                html += '<span class="tc-pill-copy">📋</span>';
                html += '</span>';
            }
            html += '</div>';
            html += '<div class="tc-combo-footer">';
            html += '<button class="tc-btn tc-btn-outline tc-btn-sm" data-action="copy-range" data-combo="' + i + '">📋 按范围复制...</button>';
            html += '</div>';
            html += '</div>';
            html += '</div>';
        }

        container.innerHTML = html;

        // Bind combo card events
        bindComboCardEvents(combos);
    }

    function bindComboCardEvents(combos) {
        // Individual tag pill click = copy that tag
        var pills = document.querySelectorAll('.tc-tag-pill');
        pills.forEach(function(pill) {
            pill.addEventListener('click', function() {
                var idx = parseInt(this.dataset.idx);
                var ci = parseInt(this.dataset.combo);
                var tag = combos[ci].tags[idx];
                copyToClipboard(tag);
                showComboToast('已复制: ' + tag);
            });
        });

        // Action buttons
        var actionBtns = document.querySelectorAll('[data-action]');
        actionBtns.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var action = this.dataset.action;
                var ci = parseInt(this.dataset.combo);
                var combo = combos[ci];

                switch (action) {
                    case 'copy-all':
                        copyAllTags(combo);
                        break;
                    case 'insert-all':
                        insertAllToPrompt(combo);
                        break;
                    case 'edit':
                        editCombo(combo);
                        break;
                    case 'delete':
                        deleteCombo(combo.name);
                        break;
                    case 'copy-range':
                        copyRange(combo);
                        break;
                }
            });
        });
    }

    function copyAllTags(combo) {
        var commaSpaceEnabled = localStorage.getItem('ts_comma_space') === 'true';
        var sep = commaSpaceEnabled ? ', ' : ',';
        var text = combo.tags.join(sep);
        copyToClipboard(text);
        showComboToast('已复制 ' + combo.tags.length + ' 个标签: ' + combo.name);
    }

    function insertAllToPrompt(combo) {
        var textarea = document.querySelector('#txt2img_prompt textarea');
        if (!textarea) { showComboToast('找不到提示词输入框'); return; }

        var commaSpaceEnabled = localStorage.getItem('ts_comma_space') === 'true';
        var sep = commaSpaceEnabled ? ', ' : ',';
        var text = combo.tags.join(sep);

        var currentText = textarea.value;
        var suffix = currentText.length > 0 && !/, *$/.test(currentText) ? sep : '';
        textarea.value = currentText + suffix + text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
        showComboToast('已插入 ' + combo.tags.length + ' 个标签到提示词');
    }

    function copyRange(combo) {
        var tags = combo.tags;
        if (tags.length <= 1) {
            copyAllTags(combo);
            return;
        }

        // Show a simple prompt for range
        var msg = '选择要复制的范围（标签序号 1-' + tags.length + '）：\n\n';
        for (var i = 0; i < tags.length; i++) {
            msg += '  ' + (i + 1) + '. ' + tags[i] + '\n';
        }
        msg += '\n输入范围如: 1-5 或 1,3,5 或 2';

        var input = prompt(msg, '1-' + tags.length);
        if (!input) return;

        var selected = [];
        var parts = input.split(',');
        for (var j = 0; j < parts.length; j++) {
            var part = parts[j].trim();
            if (part.indexOf('-') > 0) {
                var rangeParts = part.split('-');
                var start = parseInt(rangeParts[0]) - 1;
                var end = parseInt(rangeParts[1]);
                if (start >= 0 && end <= tags.length) {
                    for (var k = start; k < end; k++) {
                        selected.push(tags[k]);
                    }
                }
            } else {
                var idx = parseInt(part) - 1;
                if (idx >= 0 && idx < tags.length) {
                    selected.push(tags[idx]);
                }
            }
        }

        if (selected.length === 0) {
            showComboToast('无效的范围选择');
            return;
        }

        var commaSpaceEnabled = localStorage.getItem('ts_comma_space') === 'true';
        var sep = commaSpaceEnabled ? ', ' : ',';
        copyToClipboard(selected.join(sep));
        showComboToast('已复制 ' + selected.length + ' 个标签');
    }

    function editCombo(combo) {
        var nameInput = document.getElementById('combo-name');
        var tagsInput = document.getElementById('combo-tags');
        if (nameInput) nameInput.value = combo.name;
        if (tagsInput) tagsInput.value = combo.tags.join(', ');

        // Delete old entry
        var combos = getCombos().filter(function(c) { return c.name !== combo.name; });
        saveCombos(combos);
        renderComboList();

        showComboToast('已加载到编辑区: ' + combo.name + '（点击保存以确认修改）');
    }

    function deleteCombo(name) {
        if (!confirm('确定删除组合 "' + name + '"？')) return;
        var combos = getCombos().filter(function(c) { return c.name !== name; });
        saveCombos(combos);
        renderComboList();
        showComboToast('已删除: ' + name);
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

    function showComboToast(msg) {
        var toast = document.getElementById('combo-toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.style.display = 'block';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(function() { toast.style.display = 'none'; }, 1800);
    }

    function formatTime(ts) {
        var d = new Date(ts);
        var now = new Date();
        var diff = now - d;
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
        var pad = function(n) { return n < 10 ? '0' + n : n; };
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ===== TAB INIT =====
    // Listen for tab switching
    function tryInit() {
        var el = document.getElementById('tab_combo');
        if (el && !initialized) {
            // Hook into existing tab switching
            var tabBtns = document.querySelectorAll('.tab-header-item[data-tab]');
            var observer = new MutationObserver(function() {
                var comboPanel = document.getElementById('tab_combo');
                if (comboPanel && comboPanel.style.display !== 'none') {
                    init();
                }
            });
            if (el) {
                observer.observe(el, { attributes: true, attributeFilter: ['style'] });
            }

            // Also check on click
            tabBtns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    if (this.dataset.tab === 'tab_combo') {
                        init();
                    }
                });
            });

            // Initial check
            if (el.style.display !== 'none') init();
            return true;
        }
        return false;
    }

    // Multi-strategy init
    if (!tryInit()) {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() { tryInit(); }, 100);
            setTimeout(function() { tryInit(); }, 500);
        });
        window.addEventListener('load', function() {
            setTimeout(function() { tryInit(); }, 50);
        });
    }
    // Also try init now (script at end of body, DOM is ready)
    if (!initialized) { try { init(); } catch(e) {} }
})();