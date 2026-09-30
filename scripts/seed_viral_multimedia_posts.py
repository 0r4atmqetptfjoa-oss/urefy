#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/seed_viral_multimedia_posts.py
Master Multimedia & High-Activity Seeder for UREfy Social Network.

Seeds:
1. 50 Viral 2026 Gaming & Tech Posts with:
   - Embedded video_json (YouTube embeds & custom video posters)
   - High-res images_json galleries (Unsplash battlestations, hardware dies, CRTs)
   - Clickable source links (Digital Foundry, Videocardz, SteamDB, Rockstar, ArXiv, etc.)
   - Authentic slang, emojis, and realistic typos
2. 322+ Threaded Comments with nested flame wars, trolls, and brand debates.
3. 8 Heated Tech/Reddit Feud Posts + comments.
4. 10 Organic Community Discussions + comments.
5. Rich Interactions (emojis: 🔥, 💀, 🤡, ❤️, 🚀, 👀, 💯, 😂, 👏) and Votes.
6. user_activity_summaries for all 1,153 users with recent active timestamps.
7. Safe SQLite char(10) escaping to prevent Windows command line truncation.
"""

import sys
import os
import json
import time
import random
import subprocess

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
CLIENT_UI_DIR = os.path.join(PROJECT_ROOT, "packages", "client-ui")

NOW_MS = int(time.time() * 1000)
H_MS = 3600 * 1000
D_MS = 86400 * 1000

print(f"=== UREfy Master Multimedia & Viral Posts Seeder ===")
print(f"Baseline Timestamp: {NOW_MS} ({time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(NOW_MS/1000))} UTC)\n")

# 1. LOAD MASTER 1,000 PERSONAS
personas_path = os.path.join(BASE_DIR, "personas_1000_complete.json")
with open(personas_path, "r", encoding="utf-8") as f:
    ALL_PERSONAS = json.load(f)

USER_IDS = [p["user_id"] for p in ALL_PERSONAS]
print(f"[+] Loaded {len(ALL_PERSONAS)} sovereign personas.")

# 2. LOAD VIRAL GAMING DATA
viral_json_path = os.path.join(BASE_DIR, "data_viral_gaming_tech_50.json")
with open(viral_json_path, "r", encoding="utf-8") as f:
    VIRAL_DATA = json.load(f)

viral_posts = VIRAL_DATA["posts"]
print(f"[+] Loaded {len(viral_posts)} viral posts.")

# 3. LOAD FEUD POSTS
sys.path.insert(0, BASE_DIR)
try:
    from seed_reddit_feuds import FEUD_POSTS
except ImportError:
    FEUD_POSTS = []

def sql_esc(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    v_str = str(v).replace("'", "''")
    if "\r\n" in v_str or "\n" in v_str:
        parts = v_str.replace("\r\n", "\n").split("\n")
        escaped_parts = [f"'{p}'" for p in parts]
        return " || char(10) || ".join(escaped_parts)
    return f"'{v_str}'"

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

def execute_smart_batches(statements, max_chars=3400, label=""):
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
    # ─── 1. VIRAL MULTIMEDIA POSTS & COMMENTS ─────────────────────────────────
    print("\n--- Phase 1: Seeding 50 Viral Multimedia Posts & Threaded Comments ---")
    post_statements = []
    interaction_statements = []
    vote_statements = []
    comment_rows = []

    for idx, post in enumerate(viral_posts):
        base_offset = ((idx + 1) * 35 * 60 * 1000)
        jitter = ((idx * 73) % 900) * 1000 + ((idx * 17) % 990)
        post_time = NOW_MS - base_offset - jitter
        
        author_id = post.get("author_id", USER_IDS[idx % len(USER_IDS)])
        role = post.get("author_role", "MEMBER")
        
        video_json = json.dumps(post["video"]) if "video" in post and post["video"] else None
        images_json = json.dumps(post["images"]) if "images" in post and post["images"] else None
        comments = post.get("comments", [])
        
        merit_votes = post.get("merit_votes", 250 + (idx * 37) % 1500)
        boost_count = post.get("boost_count", 40 + (idx * 19) % 450)
        
        p_row = f"({sql_esc(post['id'])}, {sql_esc(post['channel_id'])}, {sql_esc(author_id)}, {sql_esc(role)}, {sql_esc(post['title'])}, {sql_esc(post['content'])}, {sql_esc(post.get('flair', 'GAMING NEWS'))}, {merit_votes}, 0, {len(comments)}, {boost_count}, NULL, {sql_esc(video_json)}, {sql_esc(images_json)}, NULL, NULL, 'published', {post_time}, 0)"
        post_statements.append(f"INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES {p_row};")
        
        # Post Reactions & Votes
        reactors = random.sample(USER_IDS, k=min(len(USER_IDS), 15))
        for r_i, r_uid in enumerate(reactors):
            if r_uid == author_id:
                continue
            r_emoji = random.choice(['🔥', '💀', '🤡', '❤️', '🚀', '👀', '💯', '😂', '👏'])
            r_time = post_time + (r_i + 1) * 45000 + random.randint(100, 999)
            int_id = f"int-vp-{post['id'][:12]}-{r_uid[:6]}-{r_i}"
            v_id = f"v-vp-{post['id'][:12]}-{r_uid[:6]}"
            interaction_statements.append(f"INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ({sql_esc(int_id)}, 'post', {sql_esc(post['id'])}, {sql_esc(r_uid)}, 'reaction', {sql_esc(r_emoji)}, {r_time});")
            vote_statements.append(f"INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ({sql_esc(v_id)}, 'post', {sql_esc(post['id'])}, {sql_esc(r_uid)}, 1, {r_time});")

        # Threaded Comments
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
            
            c_author = c.get("author_id") or random.choice(USER_IDS)
            parent_val = sql_esc(parent_id) if parent_id else "NULL"
            c_merit = c.get("merit_votes", random.randint(15, 210))
            comment_rows.append(f"({sql_esc(cid)}, {sql_esc(post['id'])}, {parent_val}, {sql_esc(c_author)}, 'MEMBER', {sql_esc(c['content'])}, {c_merit}, {c_time})")

    # ─── 2. REDDIT FEUD POSTS & COMMENTS ──────────────────────────────────────
    print("[*] Processing Feud Posts...")
    for idx, f_post in enumerate(FEUD_POSTS):
        f_offset = (idx + 1) * 160 * 60 * 1000 + random.randint(100, 9999)
        f_time = NOW_MS - f_offset
        f_comments = f_post.get("comments", [])
        
        p_row = f"({sql_esc(f_post['id'])}, {sql_esc(f_post['channel_id'])}, {sql_esc(f_post['author_id'])}, {sql_esc(f_post.get('author_role', 'MEMBER'))}, {sql_esc(f_post['title'])}, {sql_esc(f_post['content'])}, {sql_esc(f_post.get('flair', 'LEAK / RUMOR'))}, {f_post.get('merit_votes', 380)}, 0, {len(f_comments)}, {f_post.get('boost_count', 95)}, NULL, NULL, NULL, NULL, NULL, 'published', {f_time}, 0)"
        post_statements.append(f"INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES {p_row};")
        
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

    # ─── 3. ORGANIC COMMUNITY DISCUSSIONS ─────────────────────────────────────
    print("[*] Processing Organic Community Discussions...")
    COMMUNITY_SNIPPETS = [
        ("c/gaming", "Just completed my first no-hit run in Sekiro after 4 months of pain 🗡️🎉", "Inner Isshin almost got me in phase 3 with that lightning sweep, but the mist raven reversal came in clutch! Hands are still shaking lol. Anyone else doing challenge runs this weekend?", "GAMEPLAY"),
        ("c/gaming", "Is it just me or are Steam Next Fest demos getting higher quality than actual AAA releases?", "Played 6 demos yesterday: two pixel roguelikes, a tactical mech sim, and an atmospheric mystery game. Zero microtransactions, zero 150GB shader compilation downloads, pure fun. Check out the [Steam Next Fest Hub](https://store.steampowered.com).", "INDIE"),
        ("c/technology", "Upgraded homelab to 2x Intel X520 10G SFP+ cards with DAC cables. Results are insane ⚡", "Iperf3 showing 9.41 Gbits/sec across the DAC between Proxmox and TrueNAS. ZFS snapshot transfers take 3 seconds instead of 45 seconds. Best 40 euros ever spent on eBay refurbished gear. Detailed benchmarks posted on [ServeTheHome Forums](https://forums.servethehome.com).", "HOMELAB"),
        ("c/gaming", "Balatro Ante 14 flush five run with Baron and Mime... my phone was lagging from score calculation 🃏🔥", "Had Blueprint copying Brainstorm copying Baron with red-sealed steel kings in hand. The mult count went into scientific notation (e24). This game is pure digital crack. View the seed on [Balatro Calculator](https://balatro.io).", "MEME / SHITPOST"),
        ("c/opensource", "NixOS 24.11 flake configuration for full gaming setup with Gamemode & Gamescope 🐧🕹️", "Just published my declarative gaming dotfiles on GitHub: [github.com/nixos-gamer/gaming-flake](https://github.com). Configures MangoHud, Pipewire low latency, custom kernel sysctl parameters and Proton GE automatically on rebuild. Enjoy!", "OPEN SOURCE"),
        ("c/technology", "PSA: Stop using 12VHPWR 90-degree adapter cables without checking pin seating depth ⚠️", "Inspected a friend's RTX 4090 rig that shut down under FurMark. The third-party right-angle cable was seated 0.8mm too loose on the top latch. One ground terminal showed discolored plastic from resistance heating. Read the [Gamers Nexus 12V-2x6 Safety Guide](https://gamersnexus.net). Use native ATX 3.1 cables only!", "HARDWARE"),
        ("c/gaming", "What is the ONE game you always reinstall when you get a new PC or handheld?", "For me it's always Fallout New Vegas with Viva New Vegas modlist. Runs at 144Hz locked, zero crashes, pure nostalgia. What's yours?", "DISCUSS"),
        ("c/privacy-ai", "Running Qwen 2.5 Coder 32B locally with Q4_K_M on dual RTX 3060 12GB cards 🤖💻", "Cost me 500 euros total for the GPUs. It answers Python AST parsing questions and refactors async Rust code flawlessly. Zero telemetry sent to cloud providers. Setup details on [GitHub Ollama](https://github.com/ollama/ollama).", "AI RESEARCH"),
        ("c/solarpunk", "Balcony solar update: 162 kWh harvested this month from two 410W bifacial panels ☀️🌿", "Covered 68% of my total apartment daytime idle consumption (fridge, network rack, laptops). Hoymiles HM-800 inverter with OpenDTU tracking every watt into Home Assistant. Check [OpenDTU Project](https://github.com/tbnobody/OpenDTU).", "SOLARPUNK"),
        ("c/gaming", "Can we appreciate how good OLED motion clarity is? Coming from 144Hz IPS to 240Hz QD-OLED is night and day 👁️✨", "No ghosting, true zero black level, instant 0.03ms pixel response. In CS2 and Quake it feels like you're aiming in real life. Verified with the [Blur Busters UFO Motion Test](https://testufo.com). Worth every penny of that steep price tag.", "HARDWARE"),
    ]

    for p_i, (ch, title, body, flair) in enumerate(COMMUNITY_SNIPPETS):
        post_id = f"post-organic-{p_i+1}"
        author_p = ALL_PERSONAS[(p_i * 89 + 17) % len(ALL_PERSONAS)]
        offset_ms = (p_i * 1.8 + 1) * D_MS + random.randint(1000, 3600000 * 8)
        p_created = NOW_MS - int(offset_ms)
        votes = random.randint(45, 680)
        boosts = random.randint(8, 95)
        num_c = 4
        
        p_row = f"({sql_esc(post_id)}, {sql_esc(ch)}, {sql_esc(author_p['user_id'])}, {sql_esc(author_p.get('role', 'MEMBER'))}, {sql_esc(title)}, {sql_esc(body)}, {sql_esc(flair)}, {votes}, 0, {num_c}, {boosts}, NULL, NULL, NULL, NULL, NULL, 'published', {p_created}, 0)"
        post_statements.append(f"INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES {p_row};")
        
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

    # ─── EXECUTE POSTS ────────────────────────────────────────────────────────
    execute_smart_batches(post_statements, max_chars=3400, label="Viral & Organic Posts")

    # ─── EXECUTE COMMENTS ─────────────────────────────────────────────────────
    print(f"\n[*] Packing {len(comment_rows)} comments into multi-row statements...")
    c_stmts = []
    for i in range(0, len(comment_rows), 4):
        chunk = comment_rows[i:i+4]
        c_stmts.append(f"INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES {', '.join(chunk)};")
    execute_smart_batches(c_stmts, max_chars=3400, label="Threaded Comments")

    # ─── EXECUTE INTERACTIONS & VOTES ─────────────────────────────────────────
    if interaction_statements:
        print(f"\n[*] Packing {len(interaction_statements)} interactions...")
        execute_smart_batches(interaction_statements, max_chars=3400, label="Post Reactions")
    if vote_statements:
        print(f"\n[*] Packing {len(vote_statements)} votes...")
        execute_smart_batches(vote_statements, max_chars=3400, label="Merit Votes")

    # ─── 4. POPULATE USER ACTIVITY SUMMARIES ───────────────────────────────────
    print("\n--- Phase 2: Seeding User Activity Summaries for all 1,153 Users ---")
    act_rows = []
    for idx, p in enumerate(ALL_PERSONAS):
        uid = p["user_id"]
        # Recent active timestamps (within minutes to 3 days ago)
        if idx % 5 == 0:
            last_active = NOW_MS - random.randint(60, 900) * 1000  # last 15 mins
        elif idx % 2 == 0:
            last_active = NOW_MS - random.randint(900, 7200) * 1000  # last 2 hours
        else:
            last_active = NOW_MS - random.randint(7200, 86400 * 3) * 1000  # last 3 days
            
        unread = random.randint(0, 4)
        act_rows.append(f"({sql_esc(uid)}, {last_active}, {unread}, {last_active})")
        
    act_stmts = []
    for i in range(0, len(act_rows), 20):
        chunk = act_rows[i:i+20]
        act_stmts.append(f"INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES {', '.join(chunk)};")
    execute_smart_batches(act_stmts, max_chars=3400, label="User Activity Summaries")

    print("\n==================================================================")
    print(" ALL VIRAL POSTS, COMMENTS, REACTIONS & ACTIVITY SUMMARIES SEEDED!")
    print("==================================================================")

if __name__ == "__main__":
    main()
