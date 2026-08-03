import sys
import os
import webbrowser
import threading
import csv
import re

AIO_PATH = os.path.abspath('./sd-webui-prompt-all-in-one/')
sys.path.append(AIO_PATH)

from dotenv import load_dotenv
import uvicorn
import gradio as gr
from gradio import Blocks
from fastapi import FastAPI, Response, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import JSONResponse
from starlette.requests import Request
from typing import Optional, Dict, Any
try:
    from scripts.on_app_started import on_app_started
    from modules.script_callbacks import app_started_callback
except ImportError:
    # Standalone mode - mock SD webui callbacks
    def on_app_started(*args, **kwargs):
        pass
    def app_started_callback(*args, **kwargs):
        pass

import secrets
import install

# ===== Danbooru Tag Search Data =====
TAG_DATA = []
TAG_DATA_LOADED = False

def load_tag_data():
    global TAG_DATA, TAG_DATA_LOADED
    csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'danbooru.zh_CN.csv')
    if not os.path.exists(csv_path):
        print(f"[TagSearch] WARNING: {csv_path} not found")
        return
    try:
        with open(csv_path, encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) >= 2:
                    en = row[0].strip()
                    zh = row[1].strip()
                    if en and zh:
                        TAG_DATA.append((en, zh))
        TAG_DATA_LOADED = True
        print(f"[TagSearch] Loaded {len(TAG_DATA)} tags")
    except Exception as e:
        print(f"[TagSearch] ERROR: {e}")

# ===== Character Search Data =====
CHARACTER_DATA = {}
CHARACTER_NAMES = []  # (name_lower, char_tag, type) type: 'name'|'name_zh'|'tag'
SERIES_INDEX = {}     # series_tag -> [char_tags]
TAG_INDEX = {}        # tag -> [char_tags]
TAG_FREQ = {}         # tag -> frequency count (across all characters)
ZH_TO_EN_TAG = {}     # 中文标签名 -> 英文标签名 (用于特征搜索)
CHARACTER_DATA_LOADED = False

# ===== Alias Data =====
ALIAS_MAP = {}        # alias_lower → target_tag
TARGET_ALIASES = {}   # target_tag → [aliases]

def load_aliases():
    global ALIAS_MAP, TARGET_ALIASES
    alias_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'aliases.csv')
    if not os.path.exists(alias_path):
        print(f"[Alias] WARNING: {alias_path} not found, aliases disabled")
        return
    try:
        with open(alias_path, encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) >= 2:
                    alias = row[0].strip()
                    target = row[1].strip()
                    if alias and target:
                        ALIAS_MAP[alias.lower()] = target
                        if target not in TARGET_ALIASES:
                            TARGET_ALIASES[target] = []
                        TARGET_ALIASES[target].append(alias)
        print(f"[Alias] Loaded {len(ALIAS_MAP)} aliases")
    except Exception as e:
        print(f"[Alias] ERROR: {e}")

def resolve_alias(q):
    """解析查询中的别名 -> 返回 [(alias, target), ...] 用于 tag 模式"""
    q_lower = q.lower()
    results = []
    for alias, target in ALIAS_MAP.items():
        if q_lower in alias:
            results.append((alias, target))
    return results

def resolve_series_alias(q):
    """解析查询中匹配系列标签的别名 -> 返回 [target_series, ...]"""
    q_lower = q.lower()
    matched = set()
    for alias, target in ALIAS_MAP.items():
        if q_lower in alias and target in SERIES_INDEX:
            matched.add(target)
    return list(matched)

def _match_score(query_lower, en_tag, zh_trans, is_chinese):
    """计算标签搜索相关性评分：精确匹配(3) > 前缀匹配(2) > 子串匹配(1)"""
    if is_chinese:
        target = zh_trans.lower()
    else:
        target = en_tag.lower().replace(' ', '_')
    if target == query_lower:
        return 3
    if target.startswith(query_lower):
        return 2
    return 1

def load_character_data():
    global CHARACTER_DATA, CHARACTER_NAMES, SERIES_INDEX, TAG_INDEX, ZH_TO_EN_TAG, CHARACTER_DATA_LOADED
    char_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'characters.txt')
    if not os.path.exists(char_path):
        print(f"[CharacterSearch] WARNING: {char_path} not found")
        return

    tag_zh_map = {en: zh for en, zh in TAG_DATA}
    # 有些 tag 用空格分隔（如 "blue eyes"），CSV 里用下划线（"blue_eyes"），双向索引
    tag_zh_map_extra = {}

    # Build Chinese → English reverse mapping for feature search
    ZH_TO_EN_TAG = {}
    for en, zh in TAG_DATA:
        if zh:
            ZH_TO_EN_TAG[zh.lower()] = en
    for en, zh in TAG_DATA:
        en_space = en.replace('_', ' ')
        if en_space != en:
            tag_zh_map_extra[en_space] = zh

    try:
        skipped_invalid = 0      # 缺少必要字段（<4列）
        loaded_no_tags = 0       # 有4列但没有属性标签
        with open(char_path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = [p.strip() for p in line.split(',')]
                # 至少需要4列：char_tag, series, char_name, series_name
                if len(parts) < 4:
                    skipped_invalid += 1
                    continue

                char_tag = parts[0]
                series = parts[1]
                char_name = parts[2]
                series_name = parts[3]
                # 过滤空字符串（末尾空逗号产生的 ""），保留真实标签
                tags = [t for t in parts[4:] if t]
                if not tags:
                    loaded_no_tags += 1

                name_zh = tag_zh_map.get(char_tag, '')
                series_zh = tag_zh_map.get(series, '')

                CHARACTER_DATA[char_tag] = {
                    'tag': char_tag,
                    'name': char_name,
                    'series': series,
                    'series_name': series_name,
                    'tags': tags,
                    'tags_zh': [tag_zh_map.get(t) or tag_zh_map_extra.get(t) or tag_zh_map.get(t.replace(' ', '_')) or '' for t in tags],
                    'name_zh': name_zh,
                    'series_zh': series_zh,
                }

                # Name index
                CHARACTER_NAMES.append((char_name.lower(), char_tag, 'name'))
                if name_zh:
                    CHARACTER_NAMES.append((name_zh.lower(), char_tag, 'name_zh'))
                CHARACTER_NAMES.append((char_tag.lower(), char_tag, 'tag'))

                # Series index
                if series not in SERIES_INDEX:
                    SERIES_INDEX[series] = []
                SERIES_INDEX[series].append(char_tag)

                # Tag frequency (count across all characters)
                for tag in tags:
                    freq_key = tag.lower()
                    TAG_FREQ[freq_key] = TAG_FREQ.get(freq_key, 0) + 1

                # Tag index (index both space and underscore versions)
                for tag in tags:
                    tag_key = tag.lower()
                    # Add space version
                    if tag_key not in TAG_INDEX:
                        TAG_INDEX[tag_key] = []
                    TAG_INDEX[tag_key].append(char_tag)
                    # Also add underscore version (for queries like 'blue_eyes')
                    tag_key_underscore = tag_key.replace(' ', '_')
                    if tag_key_underscore not in TAG_INDEX:
                        TAG_INDEX[tag_key_underscore] = []
                    TAG_INDEX[tag_key_underscore].append(char_tag)

        CHARACTER_DATA_LOADED = True
        print(f"[CharacterSearch] Loaded {len(CHARACTER_DATA)} characters ({loaded_no_tags} without attribute tags, {skipped_invalid} invalid lines skipped)")
        print(f"[CharacterSearch] Series index: {len(SERIES_INDEX)} series")
        print(f"[CharacterSearch] Tag index: {len(TAG_INDEX)} unique tags")
    except Exception as e:
        print(f"[CharacterSearch] ERROR: {e}")

def char_to_dict(char_tag):
    """Convert character data to API response dict."""
    char = CHARACTER_DATA[char_tag]
    return {
        "tag": char['tag'],
        "name": char['name'],
        "name_zh": char['name_zh'],
        "series": char['series'],
        "series_name": char['series_name'],
        "series_zh": char['series_zh'],
        "tags": char['tags'],
        "tags_zh": char.get('tags_zh', []),
    }

# =====

if __name__ == "__main__":
    install.run()

    load_dotenv()
    app_port = int(os.environ.get('APP_PORT', 17860))
    app = FastAPI()

    app_username = os.environ.get('APP_USERNAME')
    app_password = os.environ.get('APP_PASSWORD')
    if app_username and app_password and app_username != '' and app_password != '':
        security = HTTPBasic()
        @app.middleware("http")
        async def authenticate(request: Request, call_next):
            try:
                credentials: HTTPBasicCredentials = await security(request)
                if not (secrets.compare_digest(credentials.username, app_username) and secrets.compare_digest(credentials.password, app_password)):
                    return Response("Unauthorized", status_code=401, headers={"WWW-Authenticate": "Basic"})
                return await call_next(request)
            except:
                return Response("Unauthorized", status_code=401, headers={"WWW-Authenticate": "Basic"})

    @app.get("/sd-webui-prompt-all-in-one-js")
    async def sd_webui_prompt_all_in_one_js():
        js = ''
        for file in os.listdir(os.path.join(AIO_PATH, 'javascript')):
            if file.endswith('.js'):
                with open(os.path.join(AIO_PATH, 'javascript', file), 'r', encoding='utf-8') as f:
                    js += f.read() + '\n'
        return Response(content=js, media_type="application/javascript")

    # ===== Tag Search API (legacy - called by tag-search.js) =====
    @app.get("/api/tag-search")
    async def tag_search(q: str = "", limit: int = 50):
        """Search danbooru tags by English or Chinese text (relevance-sorted)."""
        if not TAG_DATA_LOADED:
            return JSONResponse({"error": "Tag data not loaded"}, status_code=500)

        if not q or len(q.strip()) < 1:
            return {"results": [], "total": 0, "query": q}

        q = q.strip()
        limit = min(max(limit, 1), 200)
        is_chinese = bool(re.search(r'[\u4e00-\u9fff\u3400-\u4dbf]', q))
        q_lower = q.lower()

        results = []
        for en, zh in TAG_DATA:
            matched = False
            if is_chinese:
                if q_lower in zh.lower():
                    matched = True
            else:
                if q_lower in en.lower().replace(' ', '_'):
                    matched = True

            if matched:
                score = _match_score(q_lower, en, zh, is_chinese)
                results.append({"en": en, "zh": zh, "_score": score})

        # 按相关性排序，取前 limit 个
        results.sort(key=lambda x: x["_score"], reverse=True)
        results = results[:limit]
        for r in results:
            r.pop("_score", None)

        return {"results": results, "total": len(results), "query": q}

    # ===== Unified Search API =====
    @app.get("/api/search")
    async def unified_search(
        q: str = "",
        mode: str = "tag",      # tag | character | series | feature | combined
        submode: str = "fuzzy", # fuzzy | exact (for character/combined mode)
        series: str = "",       # pre-filter by series (fuzzy match)
        feature: str = "",      # comma-separated feature tags (for combined mode)
        exclude_no_tags: bool = False,  # hide characters without attribute tags
        page: int = 1,
        per_page: int = 100
    ):
        """Unified search API supporting multiple search modes.

        Modes:
        - tag: Search danbooru tags (English/Chinese)
        - character: Search characters by name/tag (optionally filtered by series)
        - series: Search characters by series name
        - feature: Search characters by tags (multiple tags supported, comma-separated)
        - combined: Server-side intersection of name + series + feature (no truncation)

        exclude_no_tags: When true, filters out characters that have no attribute tags
                         (only char_tag + series_tag, no feature tags like 1girl, blue_eyes, etc.)
        """
        page = max(1, page)
        per_page = min(max(per_page, 10), 200)
        offset = (page - 1) * per_page

        # Combined mode handles empty query gracefully (each field is optional)
        if mode != "combined":
            if not q or len(q.strip()) < 1:
                return {"results": [], "total": 0, "page": page, "per_page": per_page, "total_pages": 0, "mode": mode, "query": q}

            q = q.strip()

        if mode == "tag":
            return search_tags(q, offset, per_page)
        elif mode == "character":
            return search_characters(q, submode, offset, per_page, series, exclude_no_tags)
        elif mode == "series":
            return search_series(q, offset, per_page, exclude_no_tags)
        elif mode == "feature":
            return search_feature(q, offset, per_page)
        elif mode == "combined":
            return search_combined(q.strip() if q else "", submode, series, feature, offset, per_page, exclude_no_tags)
        else:
            return JSONResponse({"error": f"Unknown mode: {mode}"}, status_code=400)

    def search_tags(q, offset, per_page):
        if not TAG_DATA_LOADED:
            return JSONResponse({"error": "Tag data not loaded"}, status_code=500)

        is_chinese = bool(re.search(r'[\u4e00-\u9fff\u3400-\u4dbf]', q))
        q_lower = q.lower()

        results = []
        seen = set()
        for en, zh in TAG_DATA:
            matched = False
            if is_chinese:
                if q_lower in zh.lower():
                    matched = True
            else:
                if q_lower in en.lower().replace(' ', '_'):
                    matched = True

            if matched:
                key = en
                if key not in seen:
                    seen.add(key)
                    score = _match_score(q_lower, en, zh, is_chinese)
                    results.append({"en": en, "zh": zh, "_score": score})

        # 别名解析：查询命中别名时，追加目标标签（score=0 排在最后）
        alias_matches = resolve_alias(q)
        for alias, target in alias_matches:
            if target not in seen:
                seen.add(target)
                zh_trans = ''
                for tag_en, tag_zh in TAG_DATA:
                    if tag_en == target:
                        zh_trans = tag_zh
                        break
                results.append({"en": target, "zh": zh_trans, "matched_via_alias": alias, "_score": 0})

        # 按相关性排序：高分优先
        results.sort(key=lambda x: x["_score"], reverse=True)

        total = len(results)
        paginated = results[offset:offset + per_page]
        # 移除内部评分字段
        for r in paginated:
            r.pop("_score", None)

        return {
            "results": paginated,
            "total": total,
            "page": (offset // per_page) + 1,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page,
            "mode": "tag",
            "query": q
        }

    def search_characters(q, submode, offset, per_page, series="", exclude_no_tags=False):
        if not CHARACTER_DATA_LOADED:
            return JSONResponse({"error": "Character data not loaded"}, status_code=500)

        q_lower = q.lower()

        # Pre-compute matching series if series filter is provided
        matching_series_chars = None  # None means no series filter
        if series and series.strip():
            series_lower = series.strip().lower()
            matching_series_chars = set()

            # 检查别名：系列筛选词命中别名时解析为目标系列
            series_aliases = resolve_series_alias(series.strip())
            for target in series_aliases:
                if target in SERIES_INDEX:
                    matching_series_chars.update(SERIES_INDEX[target])

            for series_tag, char_tags in SERIES_INDEX.items():
                series_name = CHARACTER_DATA[char_tags[0]]['series_name'].lower() if char_tags else ''
                series_zh = CHARACTER_DATA[char_tags[0]]['series_zh'].lower() if char_tags else ''
                if series_lower in series_tag.lower() or series_lower in series_name or series_lower in series_zh:
                    matching_series_chars.update(char_tags)

        seen = set()
        results = []

        for name_lower, char_tag, _ in CHARACTER_NAMES:
            if char_tag in seen:
                continue

            # Series pre-filter: skip characters not in matching series
            if matching_series_chars is not None and char_tag not in matching_series_chars:
                continue

            # Exclude characters without attribute tags
            if exclude_no_tags and not CHARACTER_DATA[char_tag]['tags']:
                continue

            matched = False
            if submode == "exact":
                if name_lower == q_lower:
                    matched = True
            else:
                if q_lower in name_lower:
                    matched = True

            if matched:
                seen.add(char_tag)
                results.append(char_to_dict(char_tag))

        total = len(results)
        paginated = results[offset:offset + per_page]

        return {
            "results": paginated,
            "total": total,
            "page": (offset // per_page) + 1,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page,
            "mode": "character",
            "query": q,
            "submode": submode
        }

    def search_series(q, offset, per_page, exclude_no_tags=False):
        if not CHARACTER_DATA_LOADED:
            return JSONResponse({"error": "Character data not loaded"}, status_code=500)

        q_lower = q.lower()
        results = []
        seen = set()
        matched_series = set()

        # Search in series names (常规匹配)
        for series_tag, char_tags in SERIES_INDEX.items():
            series_lower = series_tag.lower()
            series_name = CHARACTER_DATA[char_tags[0]]['series_name'].lower()
            series_zh = CHARACTER_DATA[char_tags[0]]['series_zh'].lower()

            if q_lower in series_lower or q_lower in series_name or q_lower in series_zh:
                matched_series.add(series_tag)

        # 别名解析：查询命中别名时加入对应系列
        for target in resolve_series_alias(q):
            matched_series.add(target)

        for series_tag in matched_series:
            for char_tag in SERIES_INDEX.get(series_tag, []):
                if char_tag not in seen:
                    # Exclude characters without attribute tags
                    if exclude_no_tags and not CHARACTER_DATA[char_tag]['tags']:
                        continue
                    seen.add(char_tag)
                    results.append(char_to_dict(char_tag))

        total = len(results)
        paginated = results[offset:offset + per_page]

        return {
            "results": paginated,
            "total": total,
            "page": (offset // per_page) + 1,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page,
            "mode": "series",
            "query": q
        }

    def search_feature(q, offset, per_page):
        if not CHARACTER_DATA_LOADED:
            return JSONResponse({"error": "Character data not loaded"}, status_code=500)

        # Parse multiple tags (comma-separated)
        raw_tags = [t.strip() for t in q.split(',') if t.strip()]
        if not raw_tags:
            return {"results": [], "total": 0, "page": 1, "per_page": per_page, "total_pages": 0, "mode": "feature", "query": q}

        # Translate Chinese tags to English for lookup (含别名解析)
        search_tags = []
        for tag in raw_tags:
            tag_lower = tag.lower()
            # 别名解析优先
            if tag_lower in ALIAS_MAP:
                search_tags.append(ALIAS_MAP[tag_lower])
                continue
            is_chinese = bool(re.search(r'[\u4e00-\u9fff\u3400-\u4dbf]', tag_lower))
            if is_chinese and tag_lower in ZH_TO_EN_TAG:
                search_tags.append(ZH_TO_EN_TAG[tag_lower])
            else:
                search_tags.append(tag_lower)

        # Find characters that have ALL specified tags
        candidate_sets = []
        for tag in search_tags:
            chars_with_tag = set(TAG_INDEX.get(tag, []))
            candidate_sets.append(chars_with_tag)

        if not candidate_sets:
            return {"results": [], "total": 0, "page": 1, "per_page": per_page, "total_pages": 0, "mode": "feature", "query": q}

        # Intersection of all sets
        result_chars = candidate_sets[0]
        for s in candidate_sets[1:]:
            result_chars = result_chars.intersection(s)

        results = [char_to_dict(tag) for tag in result_chars]

        total = len(results)
        paginated = results[offset:offset + per_page]

        return {
            "results": paginated,
            "total": total,
            "page": (offset // per_page) + 1,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page,
            "mode": "feature",
            "query": q,
            "matched_tags": search_tags
        }

    def search_combined(q, submode, series, feature, offset, per_page, exclude_no_tags=False):
        """Server-side intersection: name + series + feature, avoids client-side per_page truncation."""
        if not CHARACTER_DATA_LOADED:
            return JSONResponse({"error": "Character data not loaded"}, status_code=500)

        candidate_sets = []

        # 1. Name filter (linear scan CHARACTER_NAMES, same as search_characters)
        if q and q.strip():
            q_lower = q.strip().lower()
            name_chars = set()
            for name_lower, char_tag, _ in CHARACTER_NAMES:
                if submode == "exact":
                    if name_lower == q_lower:
                        name_chars.add(char_tag)
                else:
                    if q_lower in name_lower:
                        name_chars.add(char_tag)
            candidate_sets.append(name_chars)

        # 2. Series filter (same logic as search_series)
        if series and series.strip():
            series_lower = series.strip().lower()
            series_chars = set()

            # Resolve aliases
            for target in resolve_series_alias(series.strip()):
                if target in SERIES_INDEX:
                    series_chars.update(SERIES_INDEX[target])

            # Substring match on series tag/name/zh
            for series_tag, char_tags in SERIES_INDEX.items():
                series_name = CHARACTER_DATA[char_tags[0]]['series_name'].lower() if char_tags else ''
                series_zh = CHARACTER_DATA[char_tags[0]]['series_zh'].lower() if char_tags else ''
                if series_lower in series_tag.lower() or series_lower in series_name or series_lower in series_zh:
                    series_chars.update(char_tags)

            candidate_sets.append(series_chars)

        # 3. Feature filter (same logic as search_feature, comma-separated AND)
        if feature and feature.strip():
            raw_tags = [t.strip() for t in feature.split(',') if t.strip()]
            feature_chars = None
            for tag in raw_tags:
                tag_lower = tag.lower()
                # Resolve alias
                if tag_lower in ALIAS_MAP:
                    tag_lower = ALIAS_MAP[tag_lower]
                # Translate Chinese tag to English
                is_chinese = bool(re.search(r'[\u4e00-\u9fff\u3400-\u4dbf]', tag_lower))
                if is_chinese and tag_lower in ZH_TO_EN_TAG:
                    tag_lower = ZH_TO_EN_TAG[tag_lower]

                chars_with_tag = set(TAG_INDEX.get(tag_lower, []))
                if feature_chars is None:
                    feature_chars = chars_with_tag
                else:
                    feature_chars = feature_chars.intersection(chars_with_tag)

            if feature_chars is not None:
                candidate_sets.append(feature_chars)

        # Intersect all candidate sets
        if not candidate_sets:
            return {"results": [], "total": 0, "page": 1, "per_page": per_page,
                    "total_pages": 0, "mode": "combined", "query": q, "series": series, "feature": feature}

        result_chars = candidate_sets[0]
        for s in candidate_sets[1:]:
            result_chars = result_chars.intersection(s)

        # Build results, optionally excluding no-tag characters
        results = []
        for tag in result_chars:
            if exclude_no_tags and not CHARACTER_DATA[tag]['tags']:
                continue
            results.append(char_to_dict(tag))

        # Sort by name for stable pagination
        results.sort(key=lambda x: x['name'])

        total = len(results)
        paginated = results[offset:offset + per_page]

        return {
            "results": paginated,
            "total": total,
            "page": (offset // per_page) + 1,
            "per_page": per_page,
            "total_pages": max((total + per_page - 1) // per_page, 1),
            "mode": "combined",
            "query": q,
            "series": series,
            "feature": feature
        }

    # ===== Autocomplete API =====
    @app.get("/api/autocomplete")
    async def tag_autocomplete(q: str = ""):
        """Autocomplete for txt2img prompt. Returns top 100 most relevant tags matching query.
        排序优先级：精确匹配 > 前缀匹配 > 子串匹配，同级别按使用频率降序。
        """
        if not q or len(q.strip()) < 1:
            return {"results": [], "total": 0, "query": q}

        if not TAG_DATA_LOADED:
            return {"results": [], "total": 0, "query": q, "error": "Tag data not loaded"}

        q = q.strip().lower()
        is_chinese = bool(re.search(r'[\u4e00-\u9fff\u3400-\u4dbf]', q))

        matches = []
        for en, zh in TAG_DATA:
            if is_chinese:
                if q in zh.lower():
                    freq = TAG_FREQ.get(en.lower(), 0)
                    score = _match_score(q, en, zh, is_chinese)
                    matches.append((en, zh, freq, score))
            else:
                if q in en.lower():
                    freq = TAG_FREQ.get(en.lower(), 0)
                    score = _match_score(q, en, zh, is_chinese)
                    matches.append((en, zh, freq, score))

        # 相关性优先，同级别按频率降序，取前100
        matches.sort(key=lambda x: (x[3], x[2]), reverse=True)
        top = matches[:100]

        return {
            "results": [{"en": en, "zh": zh, "freq": freq} for en, zh, freq, _score in top],
            "total": len(matches),
            "query": q
        }

    # ═══════════════════════════════════════════
    # Character Image API — 从 Animadex 获取角色外观图片
    # ═══════════════════════════════════════════

    # 内存缓存：slug → {image_bytes, content_type}
    CHARACTER_IMAGE_CACHE = {}

    ANIMADEX_API_BASE = 'https://animadex.net/api'

    # curl_cffi 浏览器指纹轮换池（绕过 Animadex Cloudflare 防护）
    _animadex_impersonate_targets = ['chrome131', 'chrome124', 'chrome120', 'chrome110']
    _animadex_impersonate_idx = 0

    def _animadex_api_get(url: str, params: dict = None):
        """调用 Animadex API（curl_cffi TLS 指纹模拟 + requests fallback）

        策略:
        1. 优先使用 curl_cffi + Chrome impersonation（绕过 Cloudflare）
        2. curl_cffi 不可用时 fallback 到原生 requests
        3. 网络错误返回 None（上层处理 503 重试逻辑）
        """
        global _animadex_impersonate_idx
        import sys
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'}

        # 策略1: curl_cffi（TLS 指纹伪装）
        try:
            from curl_cffi import requests as curl_req
            target = _animadex_impersonate_targets[_animadex_impersonate_idx % len(_animadex_impersonate_targets)]
            _animadex_impersonate_idx += 1
            resp = curl_req.get(url, params=params or {}, headers=headers, timeout=15, impersonate=target)
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 403:
                # 403 可能是指纹被识别，换下一个 impersonation target 再试一次
                target2 = _animadex_impersonate_targets[_animadex_impersonate_idx % len(_animadex_impersonate_targets)]
                _animadex_impersonate_idx += 1
                resp2 = curl_req.get(url, params=params or {}, headers=headers, timeout=15, impersonate=target2)
                if resp2.status_code == 200:
                    return resp2.json()
            print(f'[CharacterImage] curl_cffi returned status {resp.status_code}', file=sys.stderr)
        except Exception as e:
            print(f'[CharacterImage] curl_cffi error: {type(e).__name__}: {e}', file=sys.stderr)

        # 策略2: fallback 到原生 requests
        try:
            import requests as http
            resp = http.get(url, params=params or {}, headers=headers, timeout=15)
            if resp.status_code == 200:
                return resp.json()
            print(f'[CharacterImage] requests fallback returned status {resp.status_code}', file=sys.stderr)
        except Exception as e:
            print(f'[CharacterImage] requests fallback error: {type(e).__name__}: {e}', file=sys.stderr)

        return None

    def _download_image_bytes(img_url: str):
        """下载图片字节，返回 (bytes, content_type) 或 None

        优先使用 curl_cffi，失败则 fallback 到原生 requests。
        """
        import sys
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Referer': 'https://animadex.net/',
            'Accept': 'image/webp,image/*,*/*',
        }

        # 策略1: curl_cffi
        try:
            from curl_cffi import requests as curl_req
            resp = curl_req.get(img_url, headers=headers, timeout=15, impersonate='chrome131')
            if resp.status_code == 200:
                ct = 'image/webp' if '.webp' in img_url else 'image/png'
                return (resp.content, ct)
            print(f'[CharacterImage] curl_cffi img download returned {resp.status_code}', file=sys.stderr)
        except Exception as e:
            print(f'[CharacterImage] curl_cffi img error: {type(e).__name__}: {e}', file=sys.stderr)

        # 策略2: fallback 原生 requests
        try:
            import requests as http
            resp = http.get(img_url, headers=headers, timeout=15)
            if resp.status_code == 200:
                ct = 'image/webp' if '.webp' in img_url else 'image/png'
                return (resp.content, ct)
            print(f'[CharacterImage] requests img download returned {resp.status_code}', file=sys.stderr)
        except Exception as e:
            print(f'[CharacterImage] requests img error: {type(e).__name__}: {e}', file=sys.stderr)

        return None

    @app.get("/api/character-image")
    def character_image(slug: str = ""):
        """获取角色外观缩略图（从 Animadex 拉取并缓存）。

        缓存策略：
        - 成功获取图片 → 永久缓存（image_bytes）
        - 角色不存在/无图片 → 永久缓存（definitive=True，确定性失败）
        - API 不可用/下载失败 → 不缓存（临时性失败，下次请求重试）
        """
        if not slug:
            raise HTTPException(status_code=400, detail="slug is required")

        slug_lower = slug.lower().strip()

        # 检查缓存
        if slug_lower in CHARACTER_IMAGE_CACHE:
            cached = CHARACTER_IMAGE_CACHE[slug_lower]
            if cached['image_bytes']:
                return Response(content=cached['image_bytes'],
                              media_type=cached['content_type'],
                              headers={'Cache-Control': 'public, max-age=86400'})
            # 确定性失败（角色不存在或确实无图片）→ 直接返回 404
            if cached.get('definitive', False):
                raise HTTPException(status_code=404, detail="No image available")
            # 非确定性失败缓存已过期，允许重试
            del CHARACTER_IMAGE_CACHE[slug_lower]

        # 1. 从 Animadex API 查找角色的图片 URL
        search_result = _animadex_api_get(
            f'{ANIMADEX_API_BASE}/characters/search',
            {'q': slug_lower, 'sort': 'count', 'limit': 1, 'page': 1}
        )

        if not search_result:
            # 临时性失败：API 暂时不可用，不缓存，下次请求重试
            raise HTTPException(status_code=503, detail="Animadex API unavailable, will retry")

        chars = search_result.get('results', [])
        if not chars:
            # 确定性失败：角色在 Animadex 上不存在
            CHARACTER_IMAGE_CACHE[slug_lower] = {'image_bytes': None, 'content_type': '', 'definitive': True}
            raise HTTPException(status_code=404, detail="Character not found on Animadex")

        char = chars[0]
        thumb_url = char.get('thumb_url', '')
        img_url = char.get('img_url', '')
        has_image = char.get('has_image', False)

        if not has_image or (not thumb_url and not img_url):
            # 确定性失败：角色存在但 Animadex 无图片
            CHARACTER_IMAGE_CACHE[slug_lower] = {'image_bytes': None, 'content_type': '', 'definitive': True}
            raise HTTPException(status_code=404, detail="No image for this character")

        # 2. 下载图片（优先缩略图）
        url = thumb_url or img_url
        img_result = _download_image_bytes(url)

        if not img_result:
            # 临时性失败：下载可能因网络波动失败，不缓存
            raise HTTPException(status_code=504, detail="Failed to download image, will retry")

        image_bytes, content_type = img_result

        # 3. 缓存并返回（成功时永久缓存）
        CHARACTER_IMAGE_CACHE[slug_lower] = {
            'image_bytes': image_bytes,
            'content_type': content_type,
            'definitive': True,
        }

        return Response(content=image_bytes, media_type=content_type,
                       headers={'Cache-Control': 'public, max-age=86400'})

    # =====

    app_started_callback(Optional[Blocks], app)
    app.mount("/", StaticFiles(directory="./static", html=True), name="static")

    print("")
    print(f"Listening on port {app_port}...")
    print(f"Open http://localhost:{app_port}/?__theme=dark to access this app.")

    def open_browser():
        webbrowser.open(f"http://localhost:{app_port}/?__theme=dark")
    threading.Timer(1.0, open_browser).start()

    load_tag_data()
    load_aliases()
    load_character_data()

    uvicorn.run(app, host="0.0.0.0", port=app_port, log_level="warning")
