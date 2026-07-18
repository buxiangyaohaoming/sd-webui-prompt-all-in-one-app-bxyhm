# sd-webui-prompt-all-in-one-app (AI 增强版)

[![GitHub license](https://img.shields.io/github/license/buxiangyaohaoming/sd-webui-prompt-all-in-one-app-bxyhm?style=flat-square)](https://github.com/buxiangyaohaoming/sd-webui-prompt-all-in-one-app-bxyhm/blob/main/LICENSE)

<div align="center">

### [English](README.MD) | [简体中文](README_CN.MD)

</div>

> 基于 [Physton/sd-webui-prompt-all-in-one-app](https://github.com/Physton/sd-webui-prompt-all-in-one-app) 的 Fork 增强版本。

---

本项目是 [sd-webui-prompt-all-in-one](https://github.com/physton/sd-webui-prompt-all-in-one) 的独立版本，**无需**依赖 [stable-diffusion-webui](https://github.com/AUTOMATIC1111/stable-diffusion-webui)，即可在浏览器中编写和管理 Stable Diffusion 提示词（Prompt）。

相比原版，此 Fork 进行了大量 AI 辅助开发的功能增强和翻译修复。

---

## 功能特性

### 原版功能
- 基于标签（Tag）的提示词编辑器，支持自动补全
- 中英文标签翻译
- 拖拽调整标签顺序
- 提示词导入/导出

### 本 Fork 增强

**标签搜索与自动补全**
- 支持中英文模糊搜索 Danbooru 标签
- 输入时实时显示自动补全建议

**角色名搜索**
- 在左侧标签列表中搜索角色名称，自动补全并显示关联标签
- 按系列（偶像大师、赛马娘、东方 Project 等）分类浏览角色
- 支持"仅显示有属性标签的角色"筛选

**统一搜索**
- 同时搜索标签、角色、组合，一键添加
- 服务端交叉筛选（名称 + 系列 + 特征标签），避免客户端截断

**Tag 组合管理**
- 组合预设：保存常用的 Prompt 标签组合，快速复用
- 组合管理：创建、编辑、删除自定义标签组合

**别名系统**
- Tag 别名解析（如"赛马娘" → "umamusume"）
- 通过 `aliases.csv` 自定义映射

**中文化翻译大幅增强**
- 修复了 **14.3 万+** 条 Danbooru 标签的中文翻译（`danbooru.zh_CN.csv`）
- 重点修正了以下系列的
角色译名：偶像大师、赛马娘、东方 Project、原神、崩坏：星穹铁道、绝区零、鸣潮、碧蓝档案、碧蓝航线等
- 翻译来源以萌娘百科、52poke 等权威中文 ACG 百科为准，置信度达 95%+
- `characters.txt` 含 **24.5 万+** 条角色条目，附带中文名和系列信息

---

## 快速开始

### Windows 用户（内置嵌入 Python）

1. 下载并解压发布包
2. 双击 `AAA启动工具.bat` — 将自动配置 Python 环境、安装依赖并启动应用
3. 浏览器访问 [http://localhost:17860](http://localhost:17860)

其他启动脚本：
- `quickstart.bat` — 跳过依赖检查，快速启动
- `run_only.bat` — 硬编码路径 `E:\sd-webui-prompt-all-in-one`，最简启动

### Git Clone（推荐）

```bash
git clone https://github.com/buxiangyaohaoming/sd-webui-prompt-all-in-one-app-bxyhm.git --recurse-submodules
cd sd-webui-prompt-all-in-one-app-bxyhm
pip install -r requirements.txt
python app.py
```

> 中国大陆用户如遇网络问题，可使用镜像源：
> ```bash
> pip install -r requirements.txt -i https://pypi.mirrors.ustc.edu.cn/simple
> ```

### 下载 ZIP

前往 [Releases](https://github.com/buxiangyaohaoming/sd-webui-prompt-all-in-one-app-bxyhm/releases) 下载最新版压缩包，解压后运行：

```bash
pip install -r requirements.txt
python app.py
```

### 访问

浏览器访问 [http://localhost:17860](http://localhost:17860)

如需修改端口、用户名、密码：

```bash
cp .env.example .env
# 编辑 .env 修改配置
```

---

## Docker 运行

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

## 环境变量

| 参数 | 说明 | 默认值 |
|:---|:---|:---|
| `APP_PORT` | 服务端口 | `17860` |
| `APP_USERNAME` | 登录用户名 | `admin` |
| `APP_PASSWORD` | 登录密码 | 空（无需密码） |

---

## 项目结构

```
sd-webui-prompt-all-in-one-app/
├── app.py                       # 主应用入口
├── launch.py                    # 启动器
├── install.py                   # 初始化安装
├── requirements.txt             # Python 依赖
├── danbooru.zh_CN.csv           # Danbooru 标签中文翻译（14.3万+条）
├── characters.txt               # 角色标签定义（24.5万+行）
├── aliases.csv                  # Tag 别名映射表
├── fix_touhou_translations.py   # 翻译修复工具
├── static/
│   ├── js/
│   │   ├── character-search.js  # 角色搜索
│   │   ├── tag-search.js        # 标签搜索
│   │   ├── unified-search.js    # 统一搜索
│   │   ├── combo-manager.js     # 组合管理
│   │   ├── combo-presets.js     # 组合预设
│   │   └── autocomplete.js      # 自动补全
│   └── css/
│       └── tag-search.css       # 搜索样式
└── modules/                     # SD WebUI 模块适配
```

---

## 致谢

- 原始项目：[Physton/sd-webui-prompt-all-in-one-app](https://github.com/Physton/sd-webui-prompt-all-in-one-app)
- 标签数据来源：[Danbooru](https://danbooru.donmai.us/)
- 翻译参考：[萌娘百科](https://zh.moegirl.org.cn/)、[52poke](https://wiki.52poke.com/)

---

> 本项目代码（功能模块、翻译数据、文档）均由 AI（Claude）在用户指导下生成，并通过实际运行验证。如发现翻译不准确的系列、角色或标签，欢迎反馈指正。
