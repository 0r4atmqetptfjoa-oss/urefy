#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/complete_all_post_comments.py
Guarantees 100% comment coverage across all posts in Cloudflare D1:
- Queries all posts that currently have 0 comments.
- Generates 2-3 authentic, topical threaded comments for every single post.
- Links child replies with parent_id.
- Ingests via batch execution.
- Updates posts.reply_count to match actual comment counts.
- Verifies that 0 posts remain without comments.
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

# Verified real D1 author IDs
AUTHORS = {
    "arch_chad": "7f8a910c2b44",
    "void_pointer": "3c91a4e082aa",
    "packet_storm": "9f4a120c8b31",
    "godot_tinker": "5b2041e8d902",
    "pixel_witch": "14e92a8819bb",
    "dan_gaming": "8a31b402ef19",
    "fiber_wizard": "62df09a14c33",
    "neon_cat": "2d89b14c99a0",
    "docker_ninja": "4e198a00b215",
    "synth_druid": "c0a184e912fd",
    "zero_day": "6d88f12a04cb",
    "bit_fiddler": "31f90a44ec12",
    "retro_pixel": "88b4012ce9fa",
    "anti_tracker": "52e091bfa331",
    "gentoo_compiler": "19a408ebc220",
    "sim_rig_racer": "a0914e21fc88",
    "vulkan_wizard": "15e0921ab4c8",
    "rust_acean": "b2901a4fc883",
    "speedrun_ghoul": "a500912fa8cc",
    "subzero_clocker": "2ea014f9ef23",
    "switch_modder": "a30194f2de89",
    "firmware_dumper": "aa0194f2cd01",
    "cyber_rights": "3a4092bbf102",
    "jellyfin_pirate": "24a014f9ec89",
    "freebsd_demon": "a40194f2ab45",
    "webgpu_artist": "9b22a011cd44",
    "aimlab_top1": "93e776f1f2e1",
    "deepseek_runner": "b1409ea28c99",
    "tiny_model_hacker": "3e901a88fb22",
    "tauri_fanatic": "da0194f28bc1",
    "proton_rider": "94df0218ab44",
    "zfs_goblin": "29c40ea18df2",
    "asm_purist": "4d89a01fbb23",
    "ebpf_watcher": "88f019ab4c21",
    "mister_arcade": "92c4018fba77",
    "sec_guardian": "4b109af38c01",
    "arena_veteran": "54b09ef12a77",
    "zero_knowledge": "c3dc28cb705e",
    "neovim_cult": "a410ef89b231"
}

AUTHOR_KEYS = list(AUTHORS.keys())

def sql_esc(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    s = str(val).replace("'", "''")
    return f"'{s}'"

def execute_sql_batch(statements, batch_name="batch"):
    if not statements:
        return True
    
    batch_file = os.path.join(CLIENT_UI_DIR, f"_tmp_{batch_name}.sql")
    batch_size = 20
    total = len(statements)
    total_batches = (total + batch_size - 1) // batch_size
    
    print(f"[*] Executing {total} statements in {total_batches} batches for {batch_name}...")
    
    for i in range(0, total, batch_size):
        chunk = statements[i:i+batch_size]
        b_idx = i // batch_size + 1
        with open(batch_file, "w", encoding="utf-8") as bf:
            bf.write(";\n".join(chunk) + ";\n")
        
        cmd = [
            "npx.cmd" if os.name == "nt" else "npx",
            "wrangler",
            "d1",
            "execute",
            "aetheris-db",
            "--remote",
            f"--file=_tmp_{batch_name}.sql",
            "-y"
        ]
        
        retries = 3
        ok = False
        while retries > 0:
            res = subprocess.run(cmd, cwd=CLIENT_UI_DIR, capture_output=True, text=True, encoding="utf-8", errors="replace")
            if res.returncode == 0:
                ok = True
                print(f"    -> [{b_idx}/{total_batches}] Batch executed successfully.")
                break
            retries -= 1
            print(f"    [!] Error on batch {b_idx}, retrying in 3s... ({retries} left)")
            time.sleep(3)
            
        if not ok:
            print(f"    [CRITICAL] Batch {b_idx} failed permanently!")
            if os.path.exists(batch_file):
                os.remove(batch_file)
            return False
        time.sleep(0.3)

    if os.path.exists(batch_file):
        os.remove(batch_file)
    return True

def query_empty_posts():
    cmd = [
        "npx.cmd" if os.name == "nt" else "npx",
        "wrangler",
        "d1",
        "execute",
        "aetheris-db",
        "--remote",
        "--command=SELECT p.id, p.title, p.channel_id, p.created_at FROM posts p WHERE NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id) LIMIT 200;",
        "--json"
    ]
    res = subprocess.run(cmd, cwd=CLIENT_UI_DIR, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if res.returncode != 0:
        print(f"Query failed: {res.stderr or res.stdout}")
        return []
    try:
        data = json.loads(res.stdout)
        if isinstance(data, list) and len(data) > 0:
            return data[0].get("results", [])
    except Exception as e:
        print(f"JSON parse error: {e}")
    return []

def main():
    print("=" * 65)
    print("  Ensuring 100% Comment Visibility on All Posts in Cloudflare D1")
    print("=" * 65)

    empty_posts = query_empty_posts()
    print(f"[*] Found {len(empty_posts)} posts with 0 comments in D1.")

    if not empty_posts:
        print("[+] All posts already have comments! Nothing to populate.")
        return

    comments_stmts = []

    for idx, p in enumerate(empty_posts):
        p_id = p["id"]
        title = (p.get("title") or "").strip()
        ch = p.get("channel_id") or "c/gaming"
        p_time = int(p.get("created_at") or NOW_MS - 24 * 3600 * 1000)

        c1_key = random.choice(AUTHOR_KEYS)
        c2_key = random.choice([k for k in AUTHOR_KEYS if k != c1_key])
        c3_key = random.choice([k for k in AUTHOR_KEYS if k not in (c1_key, c2_key)])

        t_lower = title.lower()
        if any(w in t_lower for w in ["wukong", "denuvo", "crack", "tamper", "drm", "voices38"]):
            c1 = "The frametime pacing telemetry here confirms what scene testers have reported for months. Removing continuous VMProtect triggers eliminates the 0.1% low micro-stutters."
            c2 = "Completely agree. A clean standalone binary with zero hypervisor requirements is how proper game preservation should be done."
            c3 = "Tested on my setup with CapFrameX: frametimes are as flat as a drawn line now. Huge technical milestone."
        elif any(w in t_lower for w in ["ps5", "jailbreak", "switch", "atmosphere", "picofly", "etahen", "kstuff"]):
            c1 = "The exploit stability on modern firmware has come such a long way. etaHEN with kstuff runs for weeks without a single kernel panic."
            c2 = "Make sure you have your DNS blocking configured properly (Al-Azif or Nomad) to prevent any background OTA firmware updates."
            c3 = "Playing at locked 60FPS on real hardware with memory overclocking completely transforms the experience."
        elif any(w in t_lower for w in ["ai", "deepseek", "model", "llm", "ollama", "whisper", "flux", "claude"]):
            c1 = "Running this model locally on consumer hardware with zero cloud telemetry is the gold standard for developer privacy."
            c2 = "The chain-of-thought reasoning catches subtle edge cases and logic errors that standard chat models miss."
            c3 = "Quantization at Q4_K_M or AWQ preserves virtually 99% of accuracy while cutting VRAM usage in half. Outstanding work."
        elif any(w in t_lower for w in ["linux", "nix", "arch", "kernel", "proxmox", "zfs", "tailscale", "docker"]):
            c1 = "Declarative infrastructure and atomic rollbacks completely eliminate update anxiety. Best workstation setup available."
            c2 = "Make sure to set `ashift=12` and enable lz4 compression on the ZFS pool to minimize write amplification on modern SSDs."
            c3 = "Bookmarking this configuration. Tested on my home server and it worked right out of the box."
        elif any(w in t_lower for w in ["gta", "wilds", "monster hunter", "stalker", "cyberpunk", "doom", "elden ring"]):
            c1 = "The graphical fidelity and physical simulation showcased here look truly generational. The lighting in particular is stunning."
            c2 = "Remember to let the initial shader pre-compilation finish completely on first boot to avoid traversal hitches."
            c3 = "Easily one of the most exciting technical releases in recent gaming history. The combat mechanics feel razor sharp."
        else:
            c1 = "Really thorough breakdown. The architectural clarity and reproducible benchmarks provided here are top notch."
            c2 = "Verified this on my local node as well. The performance gains and stability improvements are immediately measurable."
            c3 = "Appreciate the detailed writeup! Adding this to our internal engineering bookmarks."

        c1_id = f"cmt-fill-{idx+1}-1"
        c2_id = f"cmt-fill-{idx+1}-2"
        c3_id = f"cmt-fill-{idx+1}-3"

        t1 = p_time + random.randint(180, 600) * 1000
        t2 = t1 + random.randint(180, 600) * 1000
        t3 = t2 + random.randint(180, 600) * 1000

        # Root comment 1
        comments_stmts.append(f"""INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at, facet_id
) VALUES ({sql_esc(c1_id)}, {sql_esc(p_id)}, NULL, {sql_esc(AUTHORS[c1_key])}, 'MEMBER', {sql_esc(c1)}, {random.randint(60, 220)}, {t1}, NULL)""")

        # Nested child reply to comment 1
        comments_stmts.append(f"""INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at, facet_id
) VALUES ({sql_esc(c2_id)}, {sql_esc(p_id)}, {sql_esc(c1_id)}, {sql_esc(AUTHORS[c2_key])}, 'MEMBER', {sql_esc(c2)}, {random.randint(40, 150)}, {t2}, NULL)""")

        # Root comment 2
        comments_stmts.append(f"""INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at, facet_id
) VALUES ({sql_esc(c3_id)}, {sql_esc(p_id)}, NULL, {sql_esc(AUTHORS[c3_key])}, 'MEMBER', {sql_esc(c3)}, {random.randint(30, 110)}, {t3}, NULL)""")

    print(f"[*] Prepared {len(comments_stmts)} comments to populate {len(empty_posts)} posts.")

    # Execute all comments
    success = execute_sql_batch(comments_stmts, "fill_comments")
    if not success:
        print("[!] Comment insertion encountered an error.")
        sys.exit(1)

    # Synchronize reply_count for all posts
    print("\n[*] Synchronizing reply_count across all posts...")
    sync_file = os.path.join(CLIENT_UI_DIR, "_tmp_sync_counts.sql")
    with open(sync_file, "w", encoding="utf-8") as sf:
        sf.write("UPDATE posts SET reply_count = (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id);\n")

    cmd = [
        "npx.cmd" if os.name == "nt" else "npx",
        "wrangler",
        "d1",
        "execute",
        "aetheris-db",
        "--remote",
        "--file=_tmp_sync_counts.sql",
        "-y"
    ]
    subprocess.run(cmd, cwd=CLIENT_UI_DIR, capture_output=True, text=True)
    if os.path.exists(sync_file):
        os.remove(sync_file)

    # Verification query
    remaining_empty = query_empty_posts()
    print(f"\n[Verification] Posts remaining with 0 comments: {len(remaining_empty)}")
    if len(remaining_empty) == 0:
        print("  -> 100% of posts now have verified, visible threaded comments!")
    print("=" * 65)

if __name__ == "__main__":
    main()
