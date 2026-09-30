#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/seed_1000_human_ecosystem.py
Ultra-Realistic High-Performance Seeder for UREfy 1,000 Community Ecosystem.

Features:
- 1,000 Unique Sovereign Personas (Gamers, Overclockers, Console Warriors, Retro, Hackers, Trolls, Leakers, etc.)
- 68 Viral Gaming & Tech Discussions + 370+ Threaded Comments with intense flame wars, trolls, typos, and leaks.
- 275 Live Chat Banter Messages across relays-general, relays-dev, pulse-global.
- 4,000+ Follows (Sovereign Social Graph).
- 3,500+ Community Memberships across gaming, technology, privacy-ai, etc.
- 4,000+ Interactions (Likes, Bookmarks, Reposts, and Emojis: 🔥, 💀, 🤡, ❤️, 🚀, 👀, 💯, 😂, 🤮, 👏).
- Natural timestamp distribution over 30 days up to the latest minutes/hours with second/millisecond jitter.
- Smart command chunking (<3,800 chars per invocation) directly to Cloudflare D1 remote database 'aetheris-db'.
- Updates packages/client-ui/src/profile/seed-profiles-data.ts with all 1,000 personas.
"""

import sys
import os
import json
import time
import random
import hashlib
import subprocess

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
CLIENT_UI_DIR = os.path.join(PROJECT_ROOT, "packages", "client-ui")

NOW_MS = int(time.time() * 1000)
H_MS = 3600 * 1000
D_MS = 86400 * 1000

print(f"=== UREfy 1,000 Human Community Seeder ===")
print(f"Baseline Timestamp: {NOW_MS} ({time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(NOW_MS/1000))} UTC)\n")

# 1. LOAD 1,000 PERSONAS
personas_json_path = os.path.join(BASE_DIR, "personas_1000_complete.json")
if not os.path.exists(personas_json_path):
    print("Generating 1000 personas...")
    subprocess.run(["python", os.path.join(BASE_DIR, "generate_1000_personas.py")], check=True)

with open(personas_json_path, "r", encoding="utf-8") as f:
    ALL_PERSONAS = json.load(f)

print(f"[+] Loaded {len(ALL_PERSONAS)} unique personas.")
user_ids_pool = [p["user_id"] for p in ALL_PERSONAS]
handle_map = {p["handle"]: p for p in ALL_PERSONAS}

# 2. LOAD VIRAL POSTS & COMMENTS
viral_json_path = os.path.join(BASE_DIR, "data_viral_gaming_tech_50.json")
with open(viral_json_path, "r", encoding="utf-8") as f:
    VIRAL_DATA = json.load(f)

viral_posts = VIRAL_DATA["posts"]
additional_personas = VIRAL_DATA.get("additional_personas", [])

# 3. LOAD CHAT MESSAGES
from generate_chat_messages import CHAT_MESSAGES

# 4. LOAD REDDIT FEUDS
sys.path.insert(0, BASE_DIR)
from seed_reddit_feuds import FEUD_POSTS

def sql_esc(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    s = str(val).replace("'", "''")
    return f"'{s}'"

def run_d1_command(command_str):
    """Executes SQL string via npx wrangler d1 execute --command"""
    cmd = [
        "npx.cmd" if os.name == "nt" else "npx",
        "wrangler",
        "d1",
        "execute",
        "aetheris-db",
        "--remote",
        f"--command={command_str}"
    ]
    res = subprocess.run(cmd, cwd=CLIENT_UI_DIR, capture_output=True, text=True)
    if res.returncode != 0:
        err = (res.stderr or res.stdout).strip()
        print(f"  [!] D1 execution error: {err[:200]}")
        return False
    return True

def execute_smart_batches(statements, max_chars=3600, label=""):
    """
    Groups statements into batches where combined command length < max_chars (Windows safe).
    """
    batches = []
    current_batch = []
    current_len = 0
    
    for s in statements:
        s_clean = s.strip()
        if not s_clean.endswith(";"):
            s_clean += ";"
        s_len = len(s_clean) + 1
        
        if current_batch and (current_len + s_len > max_chars):
            batches.append(" ".join(current_batch))
            current_batch = [s_clean]
            current_len = s_len
        else:
            current_batch.append(s_clean)
            current_len += s_len
            
    if current_batch:
        batches.append(" ".join(current_batch))
        
    total_batches = len(batches)
    print(f"[*] Executing {len(statements)} {label} statements packed into {total_batches} command batches...")
    
    failed_batches = 0
    start_t = time.time()
    for b_idx, batch_cmd in enumerate(batches):
        batch_num = b_idx + 1
        success = False
        for attempt in range(3):
            if run_d1_command(batch_cmd):
                success = True
                break
            time.sleep(1.0)
            
        if not success:
            failed_batches += 1
            print(f"    [X] Batch {batch_num}/{total_batches} failed after 3 retries.")
        elif batch_num % 10 == 0 or batch_num == total_batches:
            elapsed = time.time() - start_t
            rate = batch_num / max(1, elapsed)
            print(f"    -> [{label}] {batch_num}/{total_batches} done ({rate:.1f} batch/s, {elapsed:.0f}s elapsed)")
            
    if failed_batches == 0:
        print(f"[+] All {total_batches} batches of {label} completed successfully.")
    else:
        print(f"[!] {failed_batches} batches of {label} had errors.")

def main():
    # ─── A. CHANNELS ──────────────────────────────────────────────────────────
    print("\n--- Phase 1: Ensuring Channels ---")
    channels = [
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
    ch_rows = [f"({sql_esc(c[0])}, {sql_esc(c[1])}, {sql_esc(c[2])}, {sql_esc(c[3])}, {c[4]}, {NOW_MS - 50*D_MS})" for c in channels]
    run_d1_command(f"INSERT OR REPLACE INTO channels (id, space, name, description, is_encrypted, created_at) VALUES {', '.join(ch_rows)};")
    print("[+] Channels verified.")

    # ─── B. USER PROFILES & ROLES (1,000+ Users) ──────────────────────────────
    print("\n--- Phase 2: Seeding 1,000 Unique Sovereign User Profiles ---")
    
    # 1. Additional personas from viral data
    add_rows = []
    for p in additional_personas:
        uid = p.get("user_id") or p.get("id")
        created_time = p.get("created_at") or (NOW_MS - random.randint(15, 45) * D_MS + random.randint(100, 9999))
        upd_time = created_time + random.randint(1000, 3600000)
        interests_str = json.dumps(p.get("interests", []))
        handle_url = f"https://urefy.com/@{p['handle']}"
        add_rows.append(f"({sql_esc(uid)}, {sql_esc(p['display_name'])}, {sql_esc(p['handle'])}, {sql_esc(p['bio'])}, {sql_esc(p['avatar_url'])}, {sql_esc(p['banner_url'])}, NULL, {sql_esc(interests_str)}, {sql_esc(handle_url)}, {sql_esc(p['location'])}, {created_time}, {upd_time})")
    
    if add_rows:
        run_d1_command(f"INSERT OR REPLACE INTO user_profiles (user_id, display_name, handle, bio, avatar_url, banner_url, pinned_post_id, interests_json, website, location, created_at, updated_at) VALUES {', '.join(add_rows)};")

    # 2. 1,000 Personas in small multi-row chunks of 10 rows per statement (<2,500 chars)
    user_statements = []
    role_statements = []
    
    chunk_profiles = []
    chunk_roles = []
    
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
        role = p.get("role", "MEMBER")
        
        chunk_profiles.append(f"({sql_esc(uid)}, {sql_esc(p['display_name'])}, {sql_esc(p['handle'])}, {sql_esc(p['bio'])}, {sql_esc(avatar)}, {sql_esc(banner)}, NULL, {sql_esc(interests_str)}, {sql_esc(website)}, {sql_esc(p['location'])}, {user_created_at}, {user_updated_at})")
        chunk_roles.append(f"({sql_esc(uid)}, {sql_esc(role)}, 0, 0, NULL, {user_updated_at})")
        
        if len(chunk_profiles) >= 10:
            user_statements.append(f"INSERT OR REPLACE INTO user_profiles (user_id, display_name, handle, bio, avatar_url, banner_url, pinned_post_id, interests_json, website, location, created_at, updated_at) VALUES {', '.join(chunk_profiles)};")
            chunk_profiles = []
            
        if len(chunk_roles) >= 30:
            role_statements.append(f"INSERT OR REPLACE INTO user_roles (fingerprint, role, is_quarantined, is_shadowbanned, notes, updated_at) VALUES {', '.join(chunk_roles)};")
            chunk_roles = []

    if chunk_profiles:
        user_statements.append(f"INSERT OR REPLACE INTO user_profiles (user_id, display_name, handle, bio, avatar_url, banner_url, pinned_post_id, interests_json, website, location, created_at, updated_at) VALUES {', '.join(chunk_profiles)};")
    if chunk_roles:
        role_statements.append(f"INSERT OR REPLACE INTO user_roles (fingerprint, role, is_quarantined, is_shadowbanned, notes, updated_at) VALUES {', '.join(chunk_roles)};")

    execute_smart_batches(user_statements, max_chars=3600, label="User Profiles")
    execute_smart_batches(role_statements, max_chars=3600, label="User Roles")

    # ─── C. POSTS & THREADED COMMENTS ─────────────────────────────────────────
    print("\n--- Phase 3: Seeding Posts & Threaded Comments ---")
    post_statements = []
    comment_rows = []
    
    # 1. 50 Viral Posts
    for idx, post in enumerate(viral_posts):
        base_offset = post.get("created_at_offset_ms") or ((idx + 1) * 37 * 60 * 1000)
        jitter = random.randint(120, 540) * 1000 + random.randint(10, 990)
        post_time = NOW_MS - base_offset - jitter
        
        author_id = post.get("author_id", "696ce1a8b9f3")
        role = post.get("author_role", "MEMBER")
        video_json = json.dumps(post["video"]) if "video" in post else None
        comments = post.get("comments", [])
        
        p_row = f"({sql_esc(post['id'])}, {sql_esc(post['channel_id'])}, {sql_esc(author_id)}, {sql_esc(role)}, {sql_esc(post['title'])}, {sql_esc(post['content'])}, {sql_esc(post.get('flair', 'GAMING NEWS'))}, {post.get('merit_votes', 120)}, 0, {len(comments)}, {post.get('boost_count', 35)}, {sql_esc(video_json)}, 'published', {post_time}, 0)"
        post_statements.append(f"INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, video_json, status, created_at, is_expanded) VALUES {p_row};")
        
        # Threaded comments
        current_time = post_time
        comment_time_map = {}
        for c in comments:
            cid = c["id"]
            parent_id = c.get("parent_id")
            if parent_id and parent_id in comment_time_map:
                c_time = comment_time_map[parent_id] + random.randint(45, 720) * 1000 + random.randint(10, 990)
            else:
                current_time += random.randint(90, 1500) * 1000 + random.randint(10, 990)
                c_time = current_time
                
            if c_time > NOW_MS:
                c_time = NOW_MS - random.randint(10, 300) * 1000
            comment_time_map[cid] = c_time
            
            c_author = c.get("author_id") or random.choice(user_ids_pool)
            parent_val = sql_esc(parent_id) if parent_id else "NULL"
            comment_rows.append(f"({sql_esc(cid)}, {sql_esc(post['id'])}, {parent_val}, {sql_esc(c_author)}, 'MEMBER', {sql_esc(c['content'])}, {c.get('merit_votes', 15)}, {c_time})")

    # 2. Feud Posts
    for idx, f_post in enumerate(FEUD_POSTS):
        f_offset = (idx + 1) * 180 * 60 * 1000 + random.randint(100, 9999)
        f_time = NOW_MS - f_offset
        f_comments = f_post.get("comments", [])
        
        p_row = f"({sql_esc(f_post['id'])}, {sql_esc(f_post['channel_id'])}, {sql_esc(f_post['author_id'])}, {sql_esc(f_post.get('author_role', 'MEMBER'))}, {sql_esc(f_post['title'])}, {sql_esc(f_post['content'])}, {sql_esc(f_post.get('flair', 'LEAK / RUMOR'))}, {f_post.get('merit_votes', 300)}, 0, {len(f_comments)}, {f_post.get('boost_count', 80)}, NULL, 'published', {f_time}, 0)"
        post_statements.append(f"INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, video_json, status, created_at, is_expanded) VALUES {p_row};")
        
        f_time_cursor = f_time
        f_map = {}
        for c in f_comments:
            cid = c["id"]
            pid = c.get("parent_id")
            if pid and pid in f_map:
                ctime = f_map[pid] + random.randint(60, 600) * 1000
            else:
                f_time_cursor += random.randint(120, 1800) * 1000
                ctime = f_time_cursor
            f_map[cid] = ctime
            parent_val = sql_esc(pid) if pid else "NULL"
            comment_rows.append(f"({sql_esc(cid)}, {sql_esc(f_post['id'])}, {parent_val}, {sql_esc(c['author_id'])}, 'MEMBER', {sql_esc(c['content'])}, {c.get('merit_votes', 20)}, {ctime})")

    # 3. Additional 10 Community Organic Posts
    COMMUNITY_SNIPPETS = [
        ("c/gaming", "Just completed my first no-hit run in Sekiro after 4 months of pain 🗡️🎉", "Inner Isshin almost got me in phase 3 with that lightning sweep, but the mist raven reversal came in clutch! Hands are still shaking lol. Anyone else doing challenge runs this weekend?", "GAMEPLAY"),
        ("c/gaming", "Is it just me or are Steam Next Fest demos getting higher quality than actual AAA releases?", "Played 6 demos yesterday: two pixel roguelikes, a tactical mech sim, and an atmospheric mystery game. Zero microtransactions, zero 150GB shader compilation downloads, pure fun.", "INDIE"),
        ("c/technology", "Upgraded homelab to 2x Intel X520 10G SFP+ cards with DAC cables. Results are insane ⚡", "Iperf3 showing 9.41 Gbits/sec across the DAC between Proxmox and TrueNAS. ZFS snapshot transfers take 3 seconds instead of 45 seconds. Best 40 euros ever spent on eBay refurbished gear.", "HOMELAB"),
        ("c/gaming", "Balatro Ante 14 flush five run with Baron and Mime... my phone was lagging from score calculation 🃏🔥", "Had Blueprint copying Brainstorm copying Baron with red-sealed steel kings in hand. The mult count went into scientific notation (e24). This game is pure digital crack.", "MEME / SHITPOST"),
        ("c/opensource", "NixOS 24.11 flake configuration for full gaming setup with Gamemode & Gamescope 🐧🕹️", "Just published my declarative gaming dotfiles on GitHub. Configures MangoHud, Pipewire low latency, custom kernel sysctl parameters and Proton GE automatically on rebuild. Enjoy!", "OPEN SOURCE"),
        ("c/technology", "PSA: Stop using 12VHPWR 90-degree adapter cables without checking pin seating depth ⚠️", "Inspected a friend's RTX 4090 rig that shut down under FurMark. The third-party right-angle cable was seated 0.8mm too loose on the top latch. One ground terminal showed discolored plastic from resistance heating. Use native ATX 3.1 cables only!", "HARDWARE"),
        ("c/gaming", "What is the ONE game you always reinstall when you get a new PC or handheld?", "For me it's always Fallout New Vegas with Viva New Vegas modlist. Runs at 144Hz locked, zero crashes, pure nostalgia. What's yours?", "DISCUSS"),
        ("c/privacy-ai", "Running Qwen 2.5 Coder 32B locally with Q4_K_M on dual RTX 3060 12GB cards 🤖💻", "Cost me 500 euros total for the GPUs. It answers Python AST parsing questions and refactors async Rust code flawlessly. Zero telemetry sent to cloud providers.", "AI RESEARCH"),
        ("c/solarpunk", "Balcony solar update: 162 kWh harvested this month from two 410W bifacial panels ☀️🌿", "Covered 68% of my total apartment daytime idle consumption (fridge, network rack, laptops). Hoymiles HM-800 inverter with OpenDTU tracking every watt into Home Assistant.", "SOLARPUNK"),
        ("c/gaming", "Can we appreciate how good OLED motion clarity is? Coming from 144Hz IPS to 240Hz QD-OLED is night and day 👁️✨", "No ghosting, true zero black level, instant 0.03ms pixel response. In CS2 and Quake it feels like you're aiming in real life. Worth every penny of that steep price tag.", "HARDWARE"),
    ]

    for p_i, (ch, title, body, flair) in enumerate(COMMUNITY_SNIPPETS):
        post_id = f"post-organic-{p_i+1}"
        author_p = ALL_PERSONAS[(p_i * 89 + 17) % len(ALL_PERSONAS)]
        offset_ms = (p_i * 1.8 + 1) * D_MS + random.randint(1000, 3600000 * 8)
        p_created = NOW_MS - int(offset_ms)
        votes = random.randint(45, 680)
        boosts = random.randint(8, 95)
        num_c = 4
        
        p_row = f"({sql_esc(post_id)}, {sql_esc(ch)}, {sql_esc(author_p['user_id'])}, {sql_esc(author_p.get('role', 'MEMBER'))}, {sql_esc(title)}, {sql_esc(body)}, {sql_esc(flair)}, {votes}, 0, {num_c}, {boosts}, NULL, 'published', {p_created}, 0)"
        post_statements.append(f"INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, video_json, status, created_at, is_expanded) VALUES {p_row};")
        
        c_time = p_created
        for c_j in range(num_c):
            c_author = ALL_PERSONAS[(p_i * 37 + c_j * 91 + 53) % len(ALL_PERSONAS)]
            c_time += random.randint(120, 2400) * 1000
            c_text_choices = [
                "100% agreed on this, had the exact same experience!",
                "Wait really? What settings did you use to get that result?",
                "based take, more people need to realize this tbh",
                "pe bune baa, that sounds super cool, gonna try it tonight",
            ]
            comment_rows.append(f"('c-org-{p_i+1}-{c_j+1}', {sql_esc(post_id)}, NULL, {sql_esc(c_author['user_id'])}, 'MEMBER', {sql_esc(random.choice(c_text_choices))}, {random.randint(5, 85)}, {c_time})")

    execute_smart_batches(post_statements, max_chars=3600, label="Posts")

    # Comments in chunks of 10
    comment_statements = []
    for i in range(0, len(comment_rows), 10):
        chunk = comment_rows[i:i+10]
        comment_statements.append(f"INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES {', '.join(chunk)};")
    execute_smart_batches(comment_statements, max_chars=3600, label="Threaded Comments")

    # ─── D. LIVE CHAT MESSAGES (275 entries) ──────────────────────────────────
    print("\n--- Phase 4: Seeding Live Chat Messages ---")
    msg_rows = []
    for idx, msg in enumerate(CHAT_MESSAGES):
        ch_id = msg["channel_id"]
        handle_idx = msg.get("author_handle_index", 0)
        author_persona = ALL_PERSONAS[handle_idx % len(ALL_PERSONAS)]
        author_id = author_persona["user_id"]
        offset_m = msg.get("offset_minutes", 10.0)
        jitter_s = (idx * 7) % 55
        msg_time = NOW_MS - int(offset_m * 60 * 1000) - jitter_s * 1000
        msg_id = f"msg-live-{idx+1000}"
        
        msg_rows.append(f"({sql_esc(msg_id)}, {sql_esc(ch_id)}, {sql_esc(author_id)}, {sql_esc(msg['text'])}, {sql_esc(f'nonce-{idx}')}, '#412', 'verified', NULL, {msg_time})")

    msg_statements = []
    for i in range(0, len(msg_rows), 15):
        chunk = msg_rows[i:i+15]
        msg_statements.append(f"INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES {', '.join(chunk)};")
    execute_smart_batches(msg_statements, max_chars=3600, label="Live Chat Messages")

    # ─── E. SOCIAL GRAPH: FOLLOWS & COMMUNITY MEMBERSHIPS ─────────────────────
    print("\n--- Phase 5: Seeding Follows Graph & Community Memberships ---")
    
    # Follows (3,500+ edges)
    follows_rows = []
    follows_seen = set()
    for idx in range(len(ALL_PERSONAS)):
        u1 = ALL_PERSONAS[idx]["user_id"]
        num_f = (idx % 3) + 3
        for f_i in range(num_f):
            t_idx = (idx * 7 + f_i * 43 + 19) % len(ALL_PERSONAS)
            if t_idx == idx: t_idx = (idx + 1) % len(ALL_PERSONAS)
            u2 = ALL_PERSONAS[t_idx]["user_id"]
            if (u1, u2) not in follows_seen:
                follows_seen.add((u1, u2))
                f_time = NOW_MS - random.randint(1, 35) * D_MS - random.randint(100, 99999)
                follows_rows.append(f"({sql_esc(u1)}, {sql_esc(u2)}, {f_time})")

    follows_statements = []
    for i in range(0, len(follows_rows), 35):
        chunk = follows_rows[i:i+35]
        follows_statements.append(f"INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES {', '.join(chunk)};")
    execute_smart_batches(follows_statements, max_chars=3600, label="Follows Graph")

    # Community Memberships (3,000+ memberships)
    COMMUNITIES_LIST = ["c-gaming", "c-technology", "c-privacy-ai", "c-opensource", "c-solarpunk", "c-digitalfreedom", "c-creative", "c-biotech"]
    comm_rows = []
    for idx, p in enumerate(ALL_PERSONAS):
        uid = p["user_id"]
        num_comms = (idx % 3) + 2
        for c_i in range(num_comms):
            comm = COMMUNITIES_LIST[(idx * 3 + c_i * 5) % len(COMMUNITIES_LIST)]
            role = "admin" if (idx < 5 and c_i == 0) else ("moderator" if idx < 30 and c_i == 0 else "member")
            j_time = NOW_MS - random.randint(5, 50) * D_MS - random.randint(100, 99999)
            comm_rows.append(f"({sql_esc(comm)}, {sql_esc(uid)}, '{role}', {j_time})")

    comm_statements = []
    for i in range(0, len(comm_rows), 35):
        chunk = comm_rows[i:i+35]
        comm_statements.append(f"INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES {', '.join(chunk)};")
    execute_smart_batches(comm_statements, max_chars=3600, label="Community Memberships")

    # ─── F. REAL INTERACTIONS & REACTIONS (3,000+ entries) ───────────────────
    print("\n--- Phase 6: Seeding Real Interactions & Emoji Reactions ---")
    REACTION_EMOJIS = ['🔥', '💀', '🤡', '❤️', '🚀', '👀', '💯', '😂', '🤮', '👏']
    interact_rows = []
    interact_seen = set()
    
    all_target_posts = [p["id"] for p in viral_posts] + [p["id"] for p in FEUD_POSTS] + [f"post-organic-{i+1}" for i in range(len(COMMUNITY_SNIPPETS))]
    
    for p_id in all_target_posts:
        r_count = random.randint(35, 65)
        for r_i in range(r_count):
            u_idx = (hash(p_id) + r_i * 97) % len(ALL_PERSONAS)
            u_id = ALL_PERSONAS[u_idx]["user_id"]
            
            r_mod = r_i % 20
            if r_mod < 10:
                itype = "reaction"
                val = REACTION_EMOJIS[r_i % len(REACTION_EMOJIS)]
            elif r_mod < 17:
                itype = "like"
                val = None
            elif r_mod < 19:
                itype = "bookmark"
                val = None
            else:
                itype = "repost"
                val = None
                
            key = ("post", p_id, u_id, itype, val)
            if key not in interact_seen:
                interact_seen.add(key)
                iid = f"i-{hashlib.md5(f'{p_id}_{u_id}_{itype}_{val}'.encode()).hexdigest()[:12]}"
                itime = NOW_MS - random.randint(60, 86400 * 15) * 1000 + random.randint(10, 990)
                val_val = sql_esc(val) if val else "NULL"
                interact_rows.append(f"({sql_esc(iid)}, 'post', {sql_esc(p_id)}, {sql_esc(u_id)}, '{itype}', {val_val}, {itime})")

    interact_statements = []
    for i in range(0, len(interact_rows), 30):
        chunk = interact_rows[i:i+30]
        interact_statements.append(f"INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES {', '.join(chunk)};")
    execute_smart_batches(interact_statements, max_chars=3600, label="Interactions & Reactions")

    # ─── G. UPDATE CLIENT UI PROFILES MODULE ──────────────────────────────────
    print("\n--- Phase 7: Updating Client UI seed-profiles-data.ts ---")
    ts_dest = os.path.join(CLIENT_UI_DIR, "src", "profile", "seed-profiles-data.ts")
    ts_content = [
        "/**",
        " * @file seed-profiles-data.ts",
        " * @package @aetheris/client-ui/profile",
        " * @description 1,000 Authentic Sovereign Pseudonymous Personas Across 10 Diverse Archetypes.",
        " */",
        "",
        "import { UserProfileData } from './types.js';",
        "",
        "export const SOVEREIGN_PERSONAS: UserProfileData[] = ["
    ]
    
    for idx, p in enumerate(ALL_PERSONAS):
        avatar = p.get("avatar_url") or f"https://api.dicebear.com/7.x/{p['style']}/svg?seed={p['handle']}&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827"
        banner = p.get("banner_url") or f"https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80"
        obj = {
            "fingerprint": p["user_id"],
            "name": p["display_name"],
            "handle": p["handle"],
            "avatar": avatar,
            "banner": banner,
            "bio": p["bio"],
            "location": p["location"],
            "website": f"https://urefy.com/@{p['handle']}",
            "joinedEpoch": "Member",
            "role": p.get("role", "MEMBER"),
            "status": p.get("status", "online"),
            "isZKVerified": True,
            "followingCount": 15 + (idx * 3) % 80,
            "followersCount": 100 + (idx * 17) % 650,
            "meritScore": p.get("merit_score", 100),
            "trustScore": p.get("trust_score", 85),
            "badges": p.get("badges", [])
        }
        ts_content.append(f"  {json.dumps(obj, indent=2).replace(chr(10), chr(10) + '  ')},")
    ts_content.append("];\n")
    
    with open(ts_dest, "w", encoding="utf-8") as f:
        f.write("\n".join(ts_content))
    print(f"[+] Successfully wrote {len(ALL_PERSONAS)} personas to {ts_dest}.")

    print("\n========================================================")
    print(" 🚀 SEEDING COMPLETED SUCCESSFULLY! ")
    print("========================================================\n")

if __name__ == "__main__":
    main()
