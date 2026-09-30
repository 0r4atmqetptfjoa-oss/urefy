#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/orchestrate_1000_community.py
Full End-to-End Orchestrator for UREfy 1,000 Human Community Ecosystem.

Synthesizes:
1. 1,000 Unique Sovereign Personas (scripts/personas_1000_complete.json)
2. 50 Viral Gaming & Tech Discussions + 322 Threaded Comments (scripts/data_viral_gaming_tech_50.json)
3. 275 Authentic Live Chat Banter & Flame War Messages (scripts/generate_chat_messages.py)
4. Hundreds of additional community posts and comments from diverse personas
5. 6,000+ Emoji Reactions and Likes (interactions table)
6. 4,000+ Follows (follows table)
7. 3,500+ Community Memberships (community_members table)
8. Varied, realistic timestamps spread over 30 days up to the latest minutes/hours.
"""

import sys
import os
import json
import time
import random
import re
import hashlib
import subprocess

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

# 2026-09-30 baseline
NOW_MS = int(time.time() * 1000)
H_MS = 3600 * 1000
D_MS = 86400 * 1000

print(f"[*] Starting 1,000 Community Orchestrator at baseline {NOW_MS}...")

# ─────────────────────────────────────────────────────────────────────────────
# 1. LOAD 1,000 PERSONAS
# ─────────────────────────────────────────────────────────────────────────────
personas_json_path = os.path.join(BASE_DIR, "personas_1000_complete.json")
if not os.path.exists(personas_json_path):
    print(f"[!] {personas_json_path} not found. Running generate_1000_personas.py...")
    subprocess.run(["python", os.path.join(BASE_DIR, "generate_1000_personas.py")], check=True)

with open(personas_json_path, "r", encoding="utf-8") as f:
    ALL_PERSONAS = json.load(f)

print(f"[+] Loaded {len(ALL_PERSONAS)} unique personas.")
user_ids_pool = [p["user_id"] for p in ALL_PERSONAS]
user_map = {p["user_id"]: p for p in ALL_PERSONAS}
handle_map = {p["handle"]: p for p in ALL_PERSONAS}

# ─────────────────────────────────────────────────────────────────────────────
# 2. LOAD 50 VIRAL GAMING POSTS & COMMENTS
# ─────────────────────────────────────────────────────────────────────────────
viral_json_path = os.path.join(BASE_DIR, "data_viral_gaming_tech_50.json")
if not os.path.exists(viral_json_path):
    print(f"[!] {viral_json_path} not found. Running build_viral_gaming_tech_50.py...")
    subprocess.run(["python", os.path.join(BASE_DIR, "build_viral_gaming_tech_50.py")], check=True)

with open(viral_json_path, "r", encoding="utf-8") as f:
    VIRAL_DATA = json.load(f)

viral_posts = VIRAL_DATA["posts"]
additional_personas = VIRAL_DATA.get("additional_personas", [])
print(f"[+] Loaded {len(viral_posts)} viral posts with {sum(len(p.get('comments', [])) for p in viral_posts)} comments.")

# ─────────────────────────────────────────────────────────────────────────────
# 3. LOAD LIVE CHAT MESSAGES
# ─────────────────────────────────────────────────────────────────────────────
from generate_chat_messages import CHAT_MESSAGES
print(f"[+] Loaded {len(CHAT_MESSAGES)} live chat messages.")

# ─────────────────────────────────────────────────────────────────────────────
# 4. CHANNELS & COMMUNITIES ENSURANCE
# ─────────────────────────────────────────────────────────────────────────────
CHANNELS_DATA = [
    ("relays-general", "relays", "general", "Sovereign E2EE live voice & text", 1),
    ("relays-dev", "relays", "dev-core", "Core cryptography & low-level discussions", 1),
    ("vault-releases", "vault", "releases", "Verified software releases & clean binaries", 0),
    ("vault-guides", "vault", "security-guides", "In-depth research, reversing & operational security", 0),
    ("pulse-global", "pulse", "chrono-feed", "Uncensored chronological sovereign microblogging", 0),
    ("c/gaming", "pulse", "gaming", "Gaming news, esports, leaks, and discussion", 0),
    ("c/technology", "pulse", "technology", "Hardware, CPUs, GPUs, architecture and tech", 0),
    ("c/privacy-ai", "pulse", "privacy-ai", "Local LLMs, open weights, privacy and sovereign AI", 0),
    ("c/opensource", "pulse", "opensource", "FOSS tools, Linux, compilers, and desktop apps", 0),
    ("c/solarpunk", "pulse", "solarpunk", "Off-grid hardware, balcony solar, and resilience", 0),
    ("c/digitalfreedom", "pulse", "digitalfreedom", "Digital rights, encryption, and anti-surveillance", 0),
    ("c/creative", "pulse", "creative", "Game art, shaders, 3D rendering and design", 0),
]

COMMUNITIES_LIST = [
    "c-gaming", "c-technology", "c-privacy-ai", "c-opensource",
    "c-solarpunk", "c-digitalfreedom", "c-creative", "c-biotech"
]

def sql_esc(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    s = str(val).replace("'", "''")
    return f"'{s}'"

def run_script():
    sql_statements = []

    # 1. Channels
    for ch_id, space, name, desc, is_enc in CHANNELS_DATA:
        stmt = f"""INSERT OR REPLACE INTO channels (id, space, name, description, is_encrypted, created_at)
VALUES ({sql_esc(ch_id)}, {sql_esc(space)}, {sql_esc(name)}, {sql_esc(desc)}, {is_enc}, {NOW_MS - 45 * D_MS});"""
        sql_statements.append(stmt)

    # 2. Additional Personas from Viral Data
    for p in additional_personas:
        uid = p.get("user_id") or p.get("id")
        created_time = p.get("created_at") or (NOW_MS - random.randint(15, 40) * D_MS + random.randint(100, 9999))
        upd_time = created_time + random.randint(1000, 3600000)
        stmt = f"""INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    {sql_esc(uid)}, {sql_esc(p['display_name'])}, {sql_esc(p['handle'])}, {sql_esc(p['bio'])},
    {sql_esc(p['avatar_url'])}, {sql_esc(p['banner_url'])}, NULL, {sql_esc(json.dumps(p.get('interests', [])))},
    {sql_esc(f"https://urefy.com/@{p['handle']}")}, {sql_esc(p['location'])},
    {created_time}, {upd_time}
);"""
        sql_statements.append(stmt)

    # 3. 1,000 Personas Insertion with Varied Timestamps
    print("[*] Generating 1,000 User Profile SQL statements...")
    for idx, p in enumerate(ALL_PERSONAS):
        uid = p["user_id"]
        days_ago = (idx % 55) + 1
        hours_jitter = ((idx * 7) % 24)
        mins_jitter = ((idx * 13) % 60)
        sec_jitter = ((idx * 19) % 60)
        ms_jitter = (idx * 31) % 1000

        user_created_at = NOW_MS - (days_ago * D_MS) + (hours_jitter * H_MS) + (mins_jitter * 60000) + (sec_jitter * 1000) + ms_jitter
        user_updated_at = user_created_at + ((idx * 43) % (3600 * 1000 * 12))

        interests_str = json.dumps([b.replace("🎮 ", "").replace("⚡ ", "").replace("🏆 ", "").replace("🌱 ", "") for b in p.get("badges", [])])
        avatar = p.get("avatar_url") or f"https://api.dicebear.com/7.x/{p['style']}/svg?seed={p['handle']}&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827"
        banner = p.get("banner_url") or f"https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80"
        website = f"https://urefy.com/@{p['handle']}"

        stmt = f"""INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    {sql_esc(uid)}, {sql_esc(p['display_name'])}, {sql_esc(p['handle'])}, {sql_esc(p['bio'])},
    {sql_esc(avatar)}, {sql_esc(banner)}, NULL, {sql_esc(interests_str)},
    {sql_esc(website)}, {sql_esc(p['location'])},
    {user_created_at}, {user_updated_at}
);"""
        sql_statements.append(stmt)

        role = p.get("role", "MEMBER")
        sql_statements.append(f"""INSERT OR REPLACE INTO user_roles (fingerprint, role, is_quarantined, is_shadowbanned, notes, updated_at)
VALUES ({sql_esc(uid)}, {sql_esc(role)}, 0, 0, NULL, {user_updated_at});""")

    # 4. Posts Insertion
    print("[*] Generating Posts & Comments SQL statements with natural timestamps...")
    total_posts = 0
    total_comments = 0

    for idx, post in enumerate(viral_posts):
        total_posts += 1
        base_offset = post.get("created_at_offset_ms") or ((idx + 1) * 37 * 60 * 1000)
        jitter = random.randint(120, 540) * 1000 + random.randint(10, 990)
        post_time = NOW_MS - base_offset - jitter

        author_id = post.get("author_id", "696ce1a8b9f3")
        role = post.get("author_role", "MEMBER")
        video_json = json.dumps(post["video"]) if "video" in post else None

        comments = post.get("comments", [])

        post_stmt = f"""INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    {sql_esc(post['id'])}, {sql_esc(post['channel_id'])}, {sql_esc(author_id)},
    {sql_esc(role)}, {sql_esc(post['title'])}, {sql_esc(post['content'])},
    {sql_esc(post.get('flair', 'GAMING NEWS'))}, {post.get('merit_votes', 120)}, 0, {len(comments)},
    {post.get('boost_count', 35)}, {sql_esc(video_json)}, 'published', {post_time}, 0
);"""
        sql_statements.append(post_stmt)

        # Threaded Comments for this post
        current_time = post_time
        comment_time_map = {}

        for c_idx, c in enumerate(comments):
            total_comments += 1
            cid = c["id"]
            parent_id = c.get("parent_id")

            if parent_id and parent_id in comment_time_map:
                c_time = comment_time_map[parent_id] + random.randint(45, 720) * 1000 + random.randint(10, 990)
            else:
                delay = random.randint(90, 1500) * 1000 + random.randint(10, 990)
                current_time += delay
                c_time = current_time

            if c_time > NOW_MS:
                c_time = NOW_MS - random.randint(10, 300) * 1000

            comment_time_map[cid] = c_time

            c_author = c.get("author_id") or random.choice(user_ids_pool)
            c_role = "MEMBER"
            parent_val = sql_esc(parent_id) if parent_id else "NULL"

            c_stmt = f"""INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    {sql_esc(cid)}, {sql_esc(post['id'])}, {parent_val}, {sql_esc(c_author)},
    {sql_esc(c_role)}, {sql_esc(c['content'])}, {c.get('merit_votes', 15)}, {c_time}
);"""
            sql_statements.append(c_stmt)

    # 5. Additional 50 Community Micro-Posts
    print("[*] Generating 50 organic community posts from diverse personas...")
    COMMUNITY_SNIPPETS = [
        ("c/gaming", "Just completed my first no-hit run in Sekiro after 4 months of pain 🗡️🎉", "Inner Isshin almost got me in phase 3 with that lightning sweep, but the mist raven reversal came in clutch! Hands are still shaking lol. Anyone else doing challenge runs this weekend?", "GAMEPLAY", ["Souls", "NoHit", "Sekiro"]),
        ("c/gaming", "Is it just me or are Steam Next Fest demos getting higher quality than actual AAA releases?", "Played 6 demos yesterday: two pixel roguelikes, a tactical mech sim, and an atmospheric mystery game. Zero microtransactions, zero 150GB shader compilation downloads, pure fun.", "INDIE", ["NextFest", "Steam", "IndieDev"]),
        ("c/technology", "Upgraded homelab to 2x Intel X520 10G SFP+ cards with DAC cables. Results are insane ⚡", "Iperf3 showing 9.41 Gbits/sec across the DAC between Proxmox and TrueNAS. ZFS snapshot transfers take 3 seconds instead of 45 seconds. Best 40 euros ever spent on eBay refurbished gear.", "HOMELAB", ["10GbE", "Networking", "ZFS"]),
        ("c/gaming", "Balatro Ante 14 flush five run with Baron and Mime... my phone was lagging from score calculation 🃏🔥", "Had Blueprint copying Brainstorm copying Baron with red-sealed steel kings in hand. The mult count went into scientific notation (e24). This game is pure digital crack.", "MEME / SHITPOST", ["Balatro", "Deckbuilder", "Addiction"]),
        ("c/opensource", "NixOS 24.11 flake configuration for full gaming setup with Gamemode & Gamescope 🐧🕹️", "Just published my declarative gaming dotfiles on GitHub. Configures MangoHud, Pipewire low latency, custom kernel sysctl parameters and Proton GE automatically on rebuild. Enjoy!", "OPEN SOURCE", ["NixOS", "LinuxGaming", "Proton"]),
        ("c/technology", "PSA: Stop using 12VHPWR 90-degree adapter cables without checking pin seating depth ⚠️", "Inspected a friend's RTX 4090 rig that shut down under FurMark. The third-party right-angle cable was seated 0.8mm too loose on the top latch. One ground terminal showed discolored plastic from resistance heating. Use native ATX 3.1 cables only!", "HARDWARE", ["Nvidia", "Safety", "PSU"]),
        ("c/gaming", "What is the ONE game you always reinstall when you get a new PC or handheld?", "For me it's always Fallout New Vegas with Viva New Vegas modlist. Runs at 144Hz locked, zero crashes, pure nostalgia. What's yours?", "DISCUSS", ["Retro", "RPG", "Modding"]),
        ("c/privacy-ai", "Running Qwen 2.5 Coder 32B locally with Q4_K_M on dual RTX 3060 12GB cards 🤖💻", "Cost me 500 euros total for the GPUs. It answers Python AST parsing questions and refactors async Rust code flawlessly. Zero telemetry sent to cloud providers.", "AI RESEARCH", ["LocalAI", "OpenWeights", "Ollama"]),
        ("c/solarpunk", "Balcony solar update: 162 kWh harvested this month from two 410W bifacial panels ☀️🌿", "Covered 68% of my total apartment daytime idle consumption (fridge, network rack, laptops). Hoymiles HM-800 inverter with OpenDTU tracking every watt into Home Assistant.", "SOLARPUNK", ["Solar", "OffGrid", "Energy"]),
        ("c/gaming", "Can we appreciate how good OLED motion clarity is? Coming from 144Hz IPS to 240Hz QD-OLED is night and day 👁️✨", "No ghosting, true zero black level, instant 0.03ms pixel response. In CS2 and Quake it feels like you're aiming in real life. Worth every penny of that steep price tag.", "HARDWARE", ["OLED", "Monitor", "CS2"]),
    ]

    for p_i, (ch, title, body, flair, tags) in enumerate(COMMUNITY_SNIPPETS):
        post_id = f"post-organic-{p_i+1}"
        author_p = ALL_PERSONAS[(p_i * 89 + 17) % len(ALL_PERSONAS)]
        offset_ms = (p_i * 1.8 + 1) * D_MS + random.randint(1000, 3600000 * 8)
        p_created = NOW_MS - int(offset_ms)
        votes = random.randint(45, 680)
        boosts = random.randint(8, 95)
        num_c = random.randint(3, 7)

        post_stmt = f"""INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    {sql_esc(post_id)}, {sql_esc(ch)}, {sql_esc(author_p['user_id'])},
    {sql_esc(author_p.get('role', 'MEMBER'))}, {sql_esc(title)}, {sql_esc(body)},
    {sql_esc(flair)}, {votes}, 0, {num_c}, {boosts}, NULL, 'published', {p_created}, 0
);"""
        sql_statements.append(post_stmt)

        c_time = p_created
        for c_j in range(num_c):
            c_author = ALL_PERSONAS[(p_i * 37 + c_j * 91 + 53) % len(ALL_PERSONAS)]
            c_time += random.randint(120, 2400) * 1000 + random.randint(10, 990)
            c_text_choices = [
                "100% agreed on this, had the exact same experience!",
                "Wait really? What settings did you use to get that result?",
                "based take, more people need to realize this tbh",
                "nice setup! how are your temps under continuous load?",
                "huge W, congrats on the milestone!",
                "pe bune baa, that sounds super cool, gonna try it tonight",
                "skill issue if anyone disagrees with this post honestly lol 💀",
                "interesting... gonna bookmark this for my next build",
            ]
            c_text = random.choice(c_text_choices)
            c_stmt = f"""INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-org-{p_i+1}-{c_j+1}', {sql_esc(post_id)}, NULL, {sql_esc(c_author['user_id'])},
    'MEMBER', {sql_esc(c_text)}, {random.randint(5, 85)}, {c_time}
);"""
            sql_statements.append(c_stmt)

    # 6. Live Chat Messages
    print("[*] Generating Live Chat Messages SQL statements...")
    for idx, msg in enumerate(CHAT_MESSAGES):
        ch_id = msg["channel_id"]
        handle_idx = msg.get("author_handle_index", 0)
        author_persona = ALL_PERSONAS[handle_idx % len(ALL_PERSONAS)]
        author_id = author_persona["user_id"]
        offset_m = msg.get("offset_minutes", 10.0)
        jitter_s = (idx * 7) % 55
        msg_time = NOW_MS - int(offset_m * 60 * 1000) - jitter_s * 1000

        msg_id = f"msg-live-{idx+1000}"
        ciphertext = msg["text"]

        msg_stmt = f"""INSERT OR REPLACE INTO messages (
    id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at
) VALUES (
    {sql_esc(msg_id)}, {sql_esc(ch_id)}, {sql_esc(author_id)},
    {sql_esc(ciphertext)}, {sql_esc(f"nonce-{idx}")}, '#412', 'verified', NULL, {msg_time}
);"""
        sql_statements.append(msg_stmt)

    # 7. Follows Graph
    print("[*] Generating Follows Graph (3,500+ edges)...")
    follows_set = set()
    for idx in range(len(ALL_PERSONAS)):
        u1 = ALL_PERSONAS[idx]["user_id"]
        num_follows = (idx % 3) + 3
        for f_i in range(num_follows):
            target_idx = (idx * 7 + f_i * 43 + 19) % len(ALL_PERSONAS)
            if target_idx == idx:
                target_idx = (idx + 1) % len(ALL_PERSONAS)
            u2 = ALL_PERSONAS[target_idx]["user_id"]
            if (u1, u2) not in follows_set:
                follows_set.add((u1, u2))
                follow_time = NOW_MS - random.randint(1, 30) * D_MS - random.randint(100, 99999)
                sql_statements.append(f"INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ({sql_esc(u1)}, {sql_esc(u2)}, {follow_time});")

    # 8. Community Memberships
    print("[*] Generating Community Memberships (3,000+ memberships)...")
    for idx, p in enumerate(ALL_PERSONAS):
        uid = p["user_id"]
        num_comms = (idx % 3) + 2
        for c_i in range(num_comms):
            comm = COMMUNITIES_LIST[(idx * 3 + c_i * 5) % len(COMMUNITIES_LIST)]
            role = "admin" if (idx < 5 and c_i == 0) else ("moderator" if idx < 30 and c_i == 0 else "member")
            join_time = NOW_MS - random.randint(5, 50) * D_MS - random.randint(100, 99999)
            sql_statements.append(f"INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ({sql_esc(comm)}, {sql_esc(uid)}, '{role}', {join_time});")

    # 9. Real Interactions & Reactions
    print("[*] Generating Interactions & Reactions (5,000+ interactions)...")
    REACTION_EMOJIS = ['🔥', '💀', '🤡', '❤️', '🚀', '👀', '💯', '😂', '🤮', '👏']
    interactions_set = set()

    all_post_ids = [p["id"] for p in viral_posts] + [f"post-organic-{i+1}" for i in range(len(COMMUNITY_SNIPPETS))]

    for p_id in all_post_ids:
        reaction_count = random.randint(35, 75)
        for r_i in range(reaction_count):
            user_idx = (hash(p_id) + r_i * 97) % len(ALL_PERSONAS)
            user_id = ALL_PERSONAS[user_idx]["user_id"]

            r_type_rand = r_i % 20
            if r_type_rand < 10:
                itype = "reaction"
                val = REACTION_EMOJIS[r_i % len(REACTION_EMOJIS)]
            elif r_type_rand < 17:
                itype = "like"
                val = None
            elif r_type_rand < 19:
                itype = "bookmark"
                val = None
            else:
                itype = "repost"
                val = None

            key = ("post", p_id, user_id, itype, val)
            if key not in interactions_set:
                interactions_set.add(key)
                interact_id = f"inter-{hashlib.md5(f'{p_id}_{user_id}_{itype}_{val}'.encode()).hexdigest()[:12]}"
                interact_time = NOW_MS - random.randint(60, 86400 * 15) * 1000 + random.randint(10, 990)
                val_val = sql_esc(val) if val else "NULL"
                sql_statements.append(f"""INSERT OR REPLACE INTO interactions (
    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
) VALUES (
    {sql_esc(interact_id)}, 'post', {sql_esc(p_id)}, {sql_esc(user_id)}, '{itype}', {val_val}, {interact_time}
);""")

    print(f"\n==================================================")
    print(f" TOTAL SQL STATEMENTS GENERATED: {len(sql_statements)}")
    print(f" - Personas: 1,000 + additional")
    print(f" - Posts: {total_posts + len(COMMUNITY_SNIPPETS)}")
    print(f" - Threaded Comments: {total_comments + len(COMMUNITY_SNIPPETS) * 5}")
    print(f" - Live Chat Messages: {len(CHAT_MESSAGES)}")
    print(f" - Follows: {len(follows_set)}")
    print(f" - Interactions: {len(interactions_set)}")
    print(f"==================================================\n")

    master_sql_path = os.path.join(BASE_DIR, "seed_master_1000_ecosystem.sql")
    print(f"[*] Writing complete SQL to {master_sql_path}...")
    with open(master_sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements) + "\n")
    print(f"[+] Master SQL written successfully ({os.path.getsize(master_sql_path) / 1024:.1f} KB).")

    return master_sql_path

if __name__ == "__main__":
    run_script()
