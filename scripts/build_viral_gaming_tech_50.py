# scripts/build_viral_gaming_tech_50.py
"""
Build and compile the 50 Viral Gaming & Tech Discussions dataset for UREfy.
Generates:
1. scripts/data_viral_gaming_tech_50.py (Python module)
2. scripts/data_viral_gaming_tech_50.json (Structured JSON)
3. scripts/seed_viral_gaming_tech_50.sql (D1 SQL Seed)
"""

import sys
import os
import json
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from viral_gaming_tech_part1 import POSTS_PART1
from viral_gaming_tech_part2 import POSTS_PART2
from viral_gaming_tech_part3 import POSTS_PART3

NOW = 1789797200000

# ─────────────────────────────────────────────────────────────────────────────
# 1. ADDITIONAL GAMING & TECH PERSONAS (9 NEW ARCHETYPES)
# ─────────────────────────────────────────────────────────────────────────────
ADDITIONAL_GAMING_PERSONAS = [
    {
        "user_id": "troll_master_2026",
        "display_name": "RatioMerchant 🤡",
        "handle": "ratio_merchant",
        "bio": "Certified hater. Baiting fanboys on Reddit since 2016. Skill issue enthusiast. If you're mad, my job is done.",
        "avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80",
        "interests": ["trolling", "memes", "consolewars", "ragebait"],
        "location": "Under a Bridge",
        "created_at": NOW - 30 * 86400000
    },
    {
        "user_id": "fps_snob_4k",
        "display_name": "Vance '4K Ultra' Sterling",
        "handle": "fps_snob_4k",
        "bio": "4K 240Hz QD-OLED purist. Custom water-cooling loops. If it drops below 120 FPS or uses TAA blur, it's literally unplayable.",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80",
        "interests": ["pcgaming", "watercooling", "4k", "oled", "benchmarks"],
        "location": "Dallas, TX",
        "created_at": NOW - 28 * 86400000
    },
    {
        "id": "sony_pony_hq",
        "user_id": "sony_pony_hq",
        "display_name": "Kazuo 'PlayStation' Blue",
        "handle": "sony_pony_hq",
        "bio": "PlayStation devotee since PS1. Mark Cerny is my shepherd. Enjoying GOTY masterpieces while PC waits 3 years for ports.",
        "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1612287232258-a5ec0906be70?w=1200&auto=format&fit=crop&q=80",
        "interests": ["playstation", "ps5pro", "pssr", "goty", "dualsense"],
        "location": "San Diego, CA",
        "created_at": NOW - 25 * 86400000
    },
    {
        "user_id": "just_a_casual_3060",
        "display_name": "Casual Connor",
        "handle": "casual_3060",
        "bio": "Just an average college dude playing games after work on my budget RTX 3060. Don't understand 90% of the tech drama, just wanna have fun.",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
        "interests": ["casualgaming", "rtx3060", "steam", "multiplayer"],
        "location": "Columbus, OH",
        "created_at": NOW - 22 * 86400000
    },
    {
        "user_id": "cynic_dan_90s",
        "display_name": "Dan 'Cynic' Miller",
        "handle": "cynic_dan_90s",
        "bio": "Gaming since 1994. Watched the industry trade creativity for live-service microtransactions and DRM. Your hype is corporate conditioning.",
        "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80",
        "interests": ["retrogaming", "preservation", "gamedev-history", "consumer-rights"],
        "location": "Portland, OR",
        "created_at": NOW - 35 * 86400000
    },
    {
        "user_id": "undervolt_king",
        "display_name": "Dmitri 'CurveOptimizer' V.",
        "handle": "undervolt_king",
        "bio": "Silicon lottery enthusiast. Tuning PBO curve optimizer, GPU v/f curves, and memory sub-timings. If it's not undervolted, it's wasting watts.",
        "avatar_url": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80",
        "interests": ["overclocking", "undervolting", "hardware", "efficiency"],
        "location": "Warsaw, PL",
        "created_at": NOW - 20 * 86400000
    },
    {
        "user_id": "ninty_loyalist_mario",
        "display_name": "Tadashi '1-Up' Mori",
        "handle": "ninty_loyalist_mario",
        "bio": "Lifelong Nintendo loyalist. Gameplay > Graphics. 100% completed Mario 64, Sunshine, Galaxy, Odyssey, and Wonder.",
        "avatar_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80",
        "interests": ["nintendo", "mario", "zelda", "switch2", "nostalgia"],
        "location": "Osaka, JP",
        "created_at": NOW - 18 * 86400000
    },
    {
        "user_id": "git_gud_troll",
        "display_name": "IronTarkus_99",
        "handle": "git_gud_troll",
        "bio": "RL1 / SL1 runner. No summons, no armor, no spirit ashes, no buffs. If you summoned, you didn't beat the boss. Cry about it.",
        "avatar_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
        "interests": ["souls", "eldenring", "nohit", "rl1", "challenge-runs"],
        "location": "Sheffield, UK",
        "created_at": NOW - 19 * 86400000
    },
    {
        "user_id": "local_ai_arch",
        "display_name": "SovereignWeights",
        "handle": "local_weights_arch",
        "bio": "Open weights maximalist. Running local inference on home bare metal. No cloud telemetry, no guardrails, no subscription rent.",
        "avatar_url": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80",
        "interests": ["localai", "privacy", "opensource", "vllm", "deepseek"],
        "location": "Berlin, DE",
        "created_at": NOW - 15 * 86400000
    },
    {
        "user_id": "green_team_phil",
        "display_name": "XboxChief_Phil",
        "handle": "green_team_phil",
        "bio": "Team Green and Game Pass subscriber. Cloud gaming advocate. When everyone plays, we all win.",
        "avatar_url": "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80",
        "interests": ["xbox", "gamepass", "halo", "cloudgaming"],
        "location": "Seattle, WA",
        "created_at": NOW - 16 * 86400000
    },
    {
        "user_id": "bryan_plays",
        "display_name": "Bryan // HypeBeast",
        "handle": "bryan_plays",
        "bio": "Just an enthusiastic gamer hyping every new trailer. Life is too short to be a cynical hater!",
        "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1200&auto=format&fit=crop&q=80",
        "interests": ["hype", "trailers", "gaming", "silksong", "gta6"],
        "location": "Toronto, CA",
        "created_at": NOW - 14 * 86400000
    }
]

ALL_50_POSTS = POSTS_PART1 + POSTS_PART2 + POSTS_PART3

# ─────────────────────────────────────────────────────────────────────────────
# 2. WRITE PYTHON MODULE (scripts/data_viral_gaming_tech_50.py)
# ─────────────────────────────────────────────────────────────────────────────
py_target = os.path.join(os.path.dirname(__file__), "data_viral_gaming_tech_50.py")
with open(py_target, "w", encoding="utf-8") as f:
    f.write('"""\nscripts/data_viral_gaming_tech_50.py\n')
    f.write('Comprehensive collection of 50 viral gaming & tech posts and heated comment feuds for UREfy.\n')
    f.write('Topics: GTA 6, PS5 Pro, RTX 5090/5080, Switch 2, MH Wilds, Deadlock/CS2, Silksong, Wukong/Radahn, Denuvo, Local LLMs.\n')
    f.write('"""\n\n')
    f.write(f'ADDITIONAL_GAMING_PERSONAS = {repr(ADDITIONAL_GAMING_PERSONAS)}\n\n')
    f.write(f'VIRAL_GAMING_TECH_50_POSTS = {repr(ALL_50_POSTS)}\n')

print(f"Successfully generated Python dataset: {py_target}")

# ─────────────────────────────────────────────────────────────────────────────
# 3. WRITE JSON DATASET (scripts/data_viral_gaming_tech_50.json)
# ─────────────────────────────────────────────────────────────────────────────
json_target = os.path.join(os.path.dirname(__file__), "data_viral_gaming_tech_50.json")
json_payload = {
    "generated_at": NOW,
    "total_posts": len(ALL_50_POSTS),
    "personas": ADDITIONAL_GAMING_PERSONAS,
    "posts": ALL_50_POSTS
}
with open(json_target, "w", encoding="utf-8") as f:
    json.dump(json_payload, f, indent=2, ensure_ascii=False)

print(f"Successfully generated JSON dataset: {json_target}")

# ─────────────────────────────────────────────────────────────────────────────
# 4. GENERATE D1 SQL SEED SCRIPT (scripts/seed_viral_gaming_tech_50.sql)
# ─────────────────────────────────────────────────────────────────────────────
def escape_sql(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    return "'" + str(val).replace("'", "''") + "'"

sql_target = os.path.join(os.path.dirname(__file__), "seed_viral_gaming_tech_50.sql")
with open(sql_target, "w", encoding="utf-8") as f:
    f.write("-- ============================================================================\n")
    f.write("-- UREfy — 50 VIRAL GAMING & TECH DISCUSSIONS, THREADED FEUDS & PERSONAS (2026)\n")
    f.write("-- Target: Cloudflare D1 Database (aetheris-db)\n")
    f.write("-- ============================================================================\n\n")

    f.write("-- 1. INSERT ADDITIONAL USER PERSONAS\n")
    f.write("INSERT OR REPLACE INTO user_profiles (\n")
    f.write("    user_id, display_name, handle, bio, avatar_url, banner_url, pinned_post_id, interests_json, location, created_at, updated_at\n")
    f.write(") VALUES\n")
    
    persona_vals = []
    for p in ADDITIONAL_GAMING_PERSONAS:
        p_row = f"({escape_sql(p['user_id'])}, {escape_sql(p['display_name'])}, {escape_sql(p['handle'])}, {escape_sql(p['bio'])}, {escape_sql(p['avatar_url'])}, {escape_sql(p['banner_url'])}, NULL, {escape_sql(json.dumps(p['interests']))}, {escape_sql(p['location'])}, {p['created_at']}, {p['created_at']})"
        persona_vals.append(p_row)
    f.write(",\n".join(persona_vals) + ";\n\n")

    f.write("-- 2. INSERT 50 VIRAL POSTS\n")
    f.write("INSERT OR REPLACE INTO posts (\n")
    f.write("    id, channel_id, author_id, author_role, title, content, flair, merit_votes, reply_count, boost_count, tags_json, created_at, updated_at\n")
    f.write(") VALUES\n")

    post_vals = []
    for p in ALL_50_POSTS:
        p_row = f"({escape_sql(p['id'])}, {escape_sql(p['channel_id'])}, {escape_sql(p['author_id'])}, {escape_sql(p['author_role'])}, {escape_sql(p['title'])}, {escape_sql(p['content'])}, {escape_sql(p['flair'])}, {p['merit_votes']}, {len(p.get('comments', []))}, {p.get('boost_count', 0)}, {escape_sql(json.dumps(p.get('tags', [])))}, {p['created_at']}, {p['created_at']})"
        post_vals.append(p_row)
    f.write(",\n".join(post_vals) + ";\n\n")

    f.write("-- 3. INSERT THREADED COMMENTS (WITH REPLIES & TROLLS)\n")
    f.write("INSERT OR REPLACE INTO comments (\n")
    f.write("    id, post_id, parent_id, author_id, content, merit_votes, created_at\n")
    f.write(") VALUES\n")

    comment_vals = []
    for p in ALL_50_POSTS:
        for idx, c in enumerate(p.get('comments', [])):
            c_time = p['created_at'] + (idx + 1) * 7 * 60 * 1000
            c_row = f"({escape_sql(c['id'])}, {escape_sql(p['id'])}, {escape_sql(c.get('parent_id'))}, {escape_sql(c['author_id'])}, {escape_sql(c['content'])}, {c.get('merit_votes', 0)}, {c_time})"
            comment_vals.append(c_row)
    f.write(",\n".join(comment_vals) + ";\n")

print(f"Successfully generated D1 SQL seed: {sql_target}")
print(f"Total Posts: {len(ALL_50_POSTS)}")
print(f"Total Comments: {len(comment_vals)}")
print("All artifacts generated and verified successfully!")
