# -*- coding: utf-8 -*-
"""修复 danbooru.zh_CN.csv 中东方Project标签的翻译错误"""
import csv
import shutil
from datetime import datetime

CSV_PATH = r"E:\sd-webui-prompt-all-in-one\sd-webui-prompt-all-in-one-app\danbooru.zh_CN.csv"

# 所有译名经百度百科/搜狗百科/萌娘百科多方交叉验证
FIXES = {
    # ===== 严重错误：知名角色名完全翻译错误 =====
    "junko_(touhou)": "纯狐（东方）",
    "junko_(touhou)_(cosplay)": "纯狐（东方）(cosplay)",
    "shinki_(touhou)": "神绮（东方）",
    "mima_(touhou)": "魅魔（东方）",
    "shingyoku_(touhou)": "神玉（东方）",
    "kurumi_(touhou)": "胡桃（东方）",
    "genjii_(touhou)": "玄爷（东方）",
    "meira_(touhou)": "明罗（东方）",
    "gengetsu_(touhou)": "幻月（东方）",
    "mugetsu_(touhou)": "梦月（东方）",
    "konngara_(touhou)": "矜羯罗（东方）",
    "yuki_(touhou)": "雪（东方）",
    "seiran_(touhou)": "清兰（东方）",
    "matenshi_(touhou)": "魔天使（东方）",
    "lord_tenma_(touhou)": "天魔（东方）",
    "tokiko_(touhou)": "朱鹭子（东方）",
    "sariel_(touhou)": "萨丽艾尔（东方）",
    "louise_(touhou)": "露易丝（东方）",
    "ellen_(touhou)": "爱莲（东方）",

    # ===== 错误翻译：含义完全不对 =====
    "gap_(touhou)": "隙间（东方）",
    "orange_(touhou)": "橙（东方）",
    "human_village_(touhou)": "人间之里（东方）",
    "fairy_maid_(touhou)": "妖精女仆（东方）",
    "zombie_fairy_(touhou)": "僵尸妖精（东方）",
    "kappa_mob_(touhou)": "河童杂兵（东方）",
    "inaba_mob_(touhou)": "因幡杂兵（东方）",
    "four_of_a_kind_(touhou)": "四天王（东方）",
    "girl_who_trained_on_mt._haku_(touhou)": "圣白莲（东方）",

    # ===== 角色名翻译为空（当前为"东方"）=====
    "kikuri_(touhou)": "菊理（东方）",
    "rika_(touhou)": "里香（东方）",
    "sara_(touhou)": "萨拉（东方）",
    "elis_(touhou)": "伊利斯（东方）",
    "elly_(touhou)": "艾丽（东方）",
    "mai_(touhou)": "舞（东方）",
    "bakedanuki_(touhou)": "化狸（东方）",
    "daiyousei_mob_(touhou)": "大妖精杂兵（东方）",
    "hourai_girl_(touhou)": "蓬莱少女（东方）",
    "agatha_chris_q_outfit_(touhou)": "阿加莎·克丽丝Q服饰（东方）",
    "bakebake_(touhou)": "化化（东方）",

    # ===== 未翻译条目 (tag == translation) =====
    "team_9_(touhou)": "⑨组（东方）",
    "control_rod_(touhou)": "控制棒（东方）",
    "namazu_(touhou)": "大鲶鱼（东方）",
    "koutei_(touhou)": "黄帝（东方）",
    "point_item_(touhou)": "点数道具（东方）",
    "rengeteki_(touhou)": "莲华敌（东方）",
    "kume_(touhou)": "久米（东方）",
    "cleaning_maid_(touhou)": "清洁女仆（东方）",
    "houso_(touhou)": "法相（东方）",
    "kanda_(touhou)": "神田（东方）",
    "evil_dragon_(touhou)": "恶龙（东方）",
    "pink-haired_makai_resident_(touhou)": "粉发魔界居民（东方）",
    "laika_(touhou)": "莱卡（东方）",
    "caved_(touhou)": "洞穴（东方）",

    # ===== 格式/细节修正 =====
    "kedama_(touhou)": "毛玉（东方）",
    "cookie_(touhou)": "曲奇（东方）",
    "wolf_spirit_(touhou)": "狼灵（东方）",
    "eagle_spirit_(touhou)": "鹰灵（东方）",
    "otter_spirit_(touhou)": "水獭灵（东方）",
    "snake_youkai_(touhou)": "蛇妖（东方）",
    "divine_spirit_(touhou)": "神灵（东方）",
    "dream_world_(touhou)": "梦世界（东方）",
    "makai_(touhou)": "魔界（东方）",
    "yumeko_(touhou)": "梦子（东方）",
    "kotohime_(touhou)": "琴姬（东方）",
    "ringo_(touhou)": "林檎（东方）",
    "mochi_(touhou)": "年糕（东方）",
    "bomb_item_(touhou)": "炸弹道具（东方）",
    "power_item_(touhou)": "力量道具（东方）",
    "ability_card_(touhou)": "能力卡（东方）",
    "fortune_teller_(touhou)": "算命先生（东方）",
    "ibaraki_douji_(touhou)": "茨木童子（东方）",
    "sokrates_(touhou)": "苏格拉底（东方）",
    "tupai_(touhou)": "兔派（东方）",
    "hobgoblin_(touhou)": "妖精（东方）",
    "laevatein_(touhou)": "莱瓦汀（东方）",
    "flower_tank_(touhou)": "花缸（东方）",
    "blonde_shrine_maiden_from_a_future_era_(touhou)": "来自未来的金发巫女（东方）",
    "moonlight's_anti-soul_(touhou)": "月光反魂（东方）",
    "wolf_tengu_extra_(touhou)": "狼天狗（东方）",
    "crow_tengu_extra_(touhou)": "乌鸦天狗（东方）",
    "moon_rabbit_extra_(touhou)": "月兔（东方）",
    "sunflower_fairy_(touhou)": "向日葵妖精（东方）",
}

print(f"读取 CSV: {CSV_PATH}")

# 备份
backup_path = CSV_PATH.replace(".csv", f"_backup_touhou_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
shutil.copy2(CSV_PATH, backup_path)
print(f"已备份到: {backup_path}")

# 读取所有行
with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
    reader = csv.reader(f)
    rows = list(reader)

print(f"总行数: {len(rows)}")

fixed_count = 0
not_found = []

for key, new_val in FIXES.items():
    found = False
    for i, row in enumerate(rows):
        if row[0].strip() == key:
            old_val = row[1]
            if old_val != new_val:
                rows[i][1] = new_val
                print(f"  [{i}] {key}: '{old_val.strip()}' → '{new_val}'")
                fixed_count += 1
            found = True
            break
    if not found:
        not_found.append(key)

# 写入
with open(CSV_PATH, "w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(rows)

print(f"\n修复完成: {fixed_count} 条")
if not_found:
    print(f"未找到: {len(not_found)} 条 → {not_found}")
else:
    print("所有目标条目均已修复。")
