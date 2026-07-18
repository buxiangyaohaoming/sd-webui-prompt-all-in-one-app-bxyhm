# sd-webui-prompt-all-in-one-app (AI-Enhanced Fork)

[![GitHub license](https://img.shields.io/github/license/buxiangyaohaoming/sd-webui-prompt-all-in-one-app-bxyhm?style=flat-square)](https://github.com/buxiangyaohaoming/sd-webui-prompt-all-in-one-app-bxyhm/blob/main/LICENSE)

<div align="center">

### [English](README.MD) | [简体中文](README_CN.MD)

</div>

> Forked and enhanced from [Physton/sd-webui-prompt-all-in-one-app](https://github.com/Physton/sd-webui-prompt-all-in-one-app).

---

A standalone version of [sd-webui-prompt-all-in-one](https://github.com/physton/sd-webui-prompt-all-in-one) that does **NOT** require [stable-diffusion-webui](https://github.com/AUTOMATIC1111/stable-diffusion-webui). Write and manage Stable Diffusion prompts directly in your browser.

This fork adds AI-assisted features and massive translation improvements on top of the original.

---

## Features

### Original Features
- Tag-based prompt editor with autocomplete (Danbooru tags)
- Chinese/English tag translation support
- Drag-and-drop tag reordering
- Prompt import/export

### Enhanced in This Fork

**Tag Search & Autocomplete**
- Fuzzy search Danbooru tags in both Chinese and English
- Real-time autocomplete suggestions as you type

**Character Name Search**
- Search characters by name with autocomplete
- Browse characters grouped by series (Idolmaster, Uma Musume, Touhou Project, etc.)
- Filter to show only characters with attribute tags

**Unified Search**
- Simultaneously search across tags, characters, and combos
- Server-side intersection of name + series + feature filters

**Combo Management**
- Save frequently used prompt tag combinations as presets
- Create, edit, and delete custom tag combos

**Alias System**
- Tag alias resolution (e.g., "赛马娘" → "umamusume")
- Customizable via `aliases.csv`

**Massive Chinese Translation Fixes**
- **143,000+** Danbooru tag Chinese translations in `danbooru.zh_CN.csv`
- Character names corrected for Idolmaster, Uma Musume, Touhou Project, Genshin Impact, Honkai: Star Rail, Zenless Zone Zero, Wuthering Waves, Blue Archive, Azur Lane, and more
- Translations sourced from authoritative Chinese ACG wikis (Moegirl, 52poke), 95%+ confidence
- 245,000+ character entries in `characters.txt` with Chinese names and series info

---

## Quick Start

### Windows (Bundled Embed Python)

1. Download and extract the release package
2. Double-click `AAA启动工具.bat` — it will auto-configure the Python environment, install dependencies, and launch the app
3. Open [http://localhost:17860](http://localhost:17860)

Alternative scripts:
- `quickstart.bat` — skip dependency check, launch directly
- `run_only.bat` — hardcoded to `E:\sd-webui-prompt-all-in-one`, minimal startup

### Git Clone (Recommended)

```bash
git clone https://github.com/buxiangyaohaoming/sd-webui-prompt-all-in-one-app-bxyhm.git --recurse-submodules
cd sd-webui-prompt-all-in-one-app-bxyhm
pip install -r requirements.txt
python app.py
```

```bash
# China mirror for faster pip install:
pip install -r requirements.txt -i https://pypi.mirrors.ustc.edu.cn/simple
```

### Download ZIP

Download from [Releases](https://github.com/buxiangyaohaoming/sd-webui-prompt-all-in-one-app-bxyhm/releases), extract and run:

```bash
pip install -r requirements.txt
python app.py
```

### Access

Open [http://localhost:17860](http://localhost:17860) in your browser.

To change port, username, or password:

```bash
cp .env.example .env
# Edit .env with your settings
```

---

## Docker

```bash
docker run -d \
  -p 17860:17860 \
  -e APP_PORT=17860 \
  -e APP_USERNAME=admin \
  -e APP_PASSWORD= \
  --name sd-webui-prompt-all-in-one-app \
  buxiangyaohaoming/sd-webui-prompt-all-in-one-app-bxyhm
```

---

## Environment Variables

| Variable | Description | Default |
|:---|:---|:---|
| `APP_PORT` | Service port | `17860` |
| `APP_USERNAME` | Login username | `admin` |
| `APP_PASSWORD` | Login password | Empty (no auth required) |

---

## Project Structure

```
sd-webui-prompt-all-in-one-app/
├── app.py                       # Main application entry
├── launch.py                    # Launcher
├── install.py                   # Initialization
├── requirements.txt             # Python dependencies
├── danbooru.zh_CN.csv           # Danbooru tag translations (143K+ entries)
├── characters.txt               # Character tag definitions (245K+ lines)
├── aliases.csv                  # Tag alias mappings
├── fix_touhou_translations.py   # Translation fix utility
├── static/
│   ├── js/
│   │   ├── character-search.js  # Character search
│   │   ├── tag-search.js        # Tag search
│   │   ├── unified-search.js    # Unified search
│   │   ├── combo-manager.js     # Combo management
│   │   ├── combo-presets.js     # Combo presets
│   │   └── autocomplete.js      # Autocomplete
│   └── css/
│       └── tag-search.css       # Search styles
└── modules/                     # SD WebUI module adapters
```

---

## Credits

- Original project: [Physton/sd-webui-prompt-all-in-one-app](https://github.com/Physton/sd-webui-prompt-all-in-one-app)
- Tag data: [Danbooru](https://danbooru.donmai.us/)
- Translation reference: [Moegirl Wiki](https://zh.moegirl.org.cn/), [52poke](https://wiki.52poke.com/)

---

> This repository's code (new features, translation data, documentation) was generated by AI (Claude) under user guidance and verified through actual execution. If you find any inaccurate translations, please report them.
