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
        with open(char_path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = [p.strip() for p in line.split(',')]
                if len(parts) < 5:
                    continue

                char_tag = parts[0]
                series = parts[1]
                char_name = parts[2]
                series_name = parts[3]
                tags = parts[4:]

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
        print(f"[CharacterSearch] Loaded {len(CHARACTER_DATA)} characters")
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
        """Search danbooru tags by English or Chinese text."""
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
                results.append({"en": en, "zh": zh})
                if len(results) >= limit:
                    break

        return {"results": results, "total": len(results), "query": q}

    # ===== Unified Search API =====
    @app.get("/api/search")
    async def unified_search(
        q: str = "",
        mode: str = "tag",      # tag | character | series | feature
        submode: str = "fuzzy", # fuzzy | exact (for character mode)
        page: int = 1,
        per_page: int = 100
    ):
        """Unified search API supporting multiple search modes.

        Modes:
        - tag: Search danbooru tags (English/Chinese)
        - character: Search characters by name/tag
        - series: Search characters by series name
        - feature: Search characters by tags (multiple tags supported, comma-separated)
        """
        page = max(1, page)
        per_page = min(max(per_page, 10), 100)
        offset = (page - 1) * per_page

        if not q or len(q.strip()) < 1:
            return {"results": [], "total": 0, "page": page, "per_page": per_page, "total_pages": 0, "mode": mode, "query": q}

        q = q.strip()

        if mode == "tag":
            return search_tags(q, offset, per_page)
        elif mode == "character":
            return search_characters(q, submode, offset, per_page)
        elif mode == "series":
            return search_series(q, offset, per_page)
        elif mode == "feature":
            return search_feature(q, offset, per_page)
        else:
            return JSONResponse({"error": f"Unknown mode: {mode}"}, status_code=400)

    def search_tags(q, offset, per_page):
        if not TAG_DATA_LOADED:
            return JSONResponse({"error": "Tag data not loaded"}, status_code=500)

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
                results.append({"en": en, "zh": zh})

        total = len(results)
        paginated = results[offset:offset + per_page]

        return {
            "results": paginated,
            "total": total,
            "page": (offset // per_page) + 1,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page,
            "mode": "tag",
            "query": q
        }

    def search_characters(q, submode, offset, per_page):
        if not CHARACTER_DATA_LOADED:
            return JSONResponse({"error": "Character data not loaded"}, status_code=500)

        q_lower = q.lower()
        seen = set()
        results = []

        for name_lower, char_tag, _ in CHARACTER_NAMES:
            if char_tag in seen:
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

    def search_series(q, offset, per_page):
        if not CHARACTER_DATA_LOADED:
            return JSONResponse({"error": "Character data not loaded"}, status_code=500)

        q_lower = q.lower()
        results = []
        seen = set()

        # Search in series names
        for series_tag, char_tags in SERIES_INDEX.items():
            series_lower = series_tag.lower()
            series_name = CHARACTER_DATA[char_tags[0]]['series_name'].lower()
            series_zh = CHARACTER_DATA[char_tags[0]]['series_zh'].lower()

            if q_lower in series_lower or q_lower in series_name or q_lower in series_zh:
                for char_tag in char_tags:
                    if char_tag not in seen:
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

        # Translate Chinese tags to English for lookup
        search_tags = []
        for tag in raw_tags:
            tag_lower = tag.lower()
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

    # ===== Autocomplete API =====
    @app.get("/api/autocomplete")
    async def tag_autocomplete(q: str = ""):
        """Autocomplete for txt2img prompt. Returns top 100 most frequently used tags matching query."""
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
                    matches.append((en, zh, freq))
            else:
                if q in en.lower():
                    freq = TAG_FREQ.get(en.lower(), 0)
                    matches.append((en, zh, freq))
        
        # Sort by frequency descending, take top 100
        matches.sort(key=lambda x: x[2], reverse=True)
        top = matches[:100]
        
        return {
            "results": [{"en": en, "zh": zh, "freq": freq} for en, zh, freq in top],
            "total": len(matches),
            "query": q
        }

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
    load_character_data()

    uvicorn.run(app, host="0.0.0.0", port=app_port, log_level="warning")
