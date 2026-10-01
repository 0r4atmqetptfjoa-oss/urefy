#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/seed_missing_profiles.py
Identifies all author IDs in posts and comments that are missing from user_profiles in remote D1,
generates authentic, rich human gamer/tech personas for all of them,
and deploys them to Cloudflare D1 so that ZERO profiles remain 'Profile not set up' on UREfy.
"""

import os
import sys
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
DAY_MS = 86400 * 1000

# Well-known mapping for specific prefixes
KNOWN_PROFILES = {
    "fp_alex_dev": {
        "display_name": "Alex Rivers",
        "handle": "alex_rivers",
        "bio": "Senior systems engineer, Linux kernel tinkerer & hardware benchmark enthusiast. RAGE engine deep dives & C++ optimization ⚙️💻",
        "location": "node // cluj 🇷🇴",
        "website": "https://github.com/alex-rivers-sys",
        "style": "bottts",
        "role": "MODERATOR",
        "trust_score": 96,
        "merit_score": 840,
        "interests": ["Linux", "Hardware", "C++", "Kernel", "Benchmarks"]
    },
    "fp_chloe_gamedev": {
        "display_name": "Chloe Vance",
        "handle": "chloe_gamedev",
        "bio": "Indie game dev & 3D technical artist. Unreal Engine 5 Nanite geometry, Godot 4 shaders and cozy gaming enthusiast 🎮✨",
        "location": "subnet // bucharest 🇷🇴",
        "website": "https://artstation.com/chloe_vance",
        "style": "lorelei",
        "role": "MEMBER",
        "trust_score": 92,
        "merit_score": 620,
        "interests": ["GameDev", "Unreal Engine 5", "Godot", "Shaders", "3D Art"]
    },
    "fp_chloe_pals": {
        "display_name": "Chloe Vance",
        "handle": "chloe_pals",
        "bio": "Palworld breeder & creature collection archivist. Level 55 base management & breeding passive spreadsheet master 🐾⚔️",
        "location": "subnet // bucharest 🇷🇴",
        "website": "https://paldb.cc",
        "style": "lorelei",
        "role": "MEMBER",
        "trust_score": 89,
        "merit_score": 410,
        "interests": ["Palworld", "Gaming", "Co-op", "Breeding", "Survival"]
    },
    "fp_mayalin_ai": {
        "display_name": "Dr. Maya Lin",
        "handle": "mayalin_ai",
        "bio": "AI research scientist focusing on sparse multi-head attention, FP8 quantization, and autonomous reasoning agent architectures 🧠🔬",
        "location": "node // timisoara 🇷🇴",
        "website": "https://arxiv.org/abs/2609.ai-sparse",
        "style": "notionists",
        "role": "GUARDIAN",
        "trust_score": 98,
        "merit_score": 1280,
        "interests": ["Artificial Intelligence", "Transformers", "Research", "Deep Learning", "Mathematics"]
    },
    "fp_nadia_foss": {
        "display_name": "Nadia Moreau",
        "handle": "r6_bandit_trick",
        "bio": "FOSS advocate, privacy researcher & Diamond R6 Siege anchor. Battery tricking thermite charges since 2017 🛡️⚡",
        "location": "node // brasov 🇷🇴",
        "website": "https://gitlab.com/nadiamoreau",
        "style": "bottts",
        "role": "MEMBER",
        "trust_score": 94,
        "merit_score": 750,
        "interests": ["Cybersecurity", "Siege", "FOSS", "SelfHosting", "Privacy"]
    }
}

FIRST_NAMES = [
    "Darius", "Elena", "Marcus", "Viktor", "Matei", "Ioana", "Andrei", "Soren", 
    "Katarina", "Liam", "Sophia", "Gabriel", "Adrian", "Bianca", "Stefan", "Roxana",
    "Cristian", "Alina", "Filip", "Diana", "Sebastian", "Anca", "Tudor", "Laura",
    "Vlad", "Patricia", "Bogdan", "Simona", "Radu", "Teodora", "Alexandru", "Irina"
]

LAST_NAMES = [
    "Popa", "Ionescu", "Novak", "Radu", "Stan", "Dumitrescu", "Vance", "Lindqvist",
    "Moraru", "Stanescu", "Stoica", "Gheorghiu", "Popescu", "Vasilescu", "Diaconu",
    "Constantin", "Munteanu", "Nistor", "Enache", "Olaru", "Toma", "Marin", "Barbu"
]

GAMER_TAGS = [
    "pixel_knight", "cyber_wraith", "shadow_root", "neon_pulse", "bit_runner", 
    "quantum_flux", "void_walker", "zero_delay", "mesh_driver", "packet_storm",
    "turbo_boost", "render_core", "subtick_god", "kernel_panic", "iron_sights",
    "overclock_king", "latency_zero", "crypto_phantom", "hyper_thread", "stack_trace"
]

ROLES = ["MEMBER", "MEMBER", "MEMBER", "MODERATOR", "ARCHIVIST", "GUARDIAN"]
STYLES = ["bottts", "adventurer", "lorelei", "pixel-art", "notionists", "avataaars"]
LOCATIONS = [
    "node // cluj 🇷🇴", "subnet // bucharest 🇷🇴", "node // timisoara 🇷🇴",
    "node // brasov 🇷🇴", "node // iasi 🇷🇴", "node // sibiu 🇷🇴",
    "node // craiova 🇷🇴", "datacenter // frankfurt 🇩🇪", "peer // london 🇬🇧",
    "mesh // tokyo 🇯🇵", "node // warsaw 🇵🇱", "node // austin 🇺🇸"
]

BIOS = [
    "Full-stack engineer & custom mechanical keyboard collector. Lubricating switches and compiling Gentoo on weekends ⌨️⚡",
    "Passionate about emulation, retro handhelds, and CRT scanline shaders. Running MiSTer FPGA at 240p 🎮🕹️",
    "Hardcore competitive shooter grinder. Aim Lab top 1% and CS2 Premier fanatic. Pure muscle memory 🎯",
    "Home lab operator running Proxmox VE, ZFS RAID-Z2, and 10GbE fiber across my apartment 💾🖥️",
    "Hardware overclocker. Delidding CPUs, custom loop water cooling, and chasing top 10 TimeSpy scores ❄️🔥",
    "Open source advocate and privacy maximalist. Self-hosting Bitwarden, Jellyfin, and Nextcloud 🛡️☁️",
    "Indie game developer building procedural worlds in Godot. Lover of pixel art, low-poly aesthetics, and chiptunes 🎨👾",
    "Cybersecurity analyst & penetration tester. Hunting memory leaks and privilege escalation vectors 🔍🔐",
    "Audio engineer and synthesizer nerd. Designing spatial soundscapes and dynamic DSP filters 🎧🔊",
    "Linux rice enthusiast. Custom Wayland compositors, Hyprland dotfiles, and minimal terminal setups 🐧✨"
]

def sql_esc(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    v_str = str(v).replace("'", "''")
    return f"'{v_str}'"

def run_cmd(cmd_list):
    res = subprocess.run(cmd_list, capture_output=True, text=True, cwd=CLIENT_UI_DIR, shell=True)
    return res.stdout, res.stderr, res.returncode

def main():
    print("=== UREfy Missing Profiles Resolver ===")
    
    # 1. Query all missing author IDs from remote D1
    query = "SELECT DISTINCT author_id FROM (SELECT author_id FROM posts UNION SELECT author_id FROM comments) WHERE author_id NOT IN (SELECT user_id FROM user_profiles);"
    stdout, stderr, code = run_cmd(["npx.cmd", "wrangler", "d1", "execute", "aetheris-db", "--remote", f"--command={query}"])
    
    if code != 0:
        print("Failed to query D1:", stderr)
        sys.exit(1)
        
    # Extract IDs from json response in stdout
    # The output from wrangler has JSON block
    lines = stdout.splitlines()
    json_str = ""
    start = False
    for line in lines:
        if line.strip().startswith("["):
            start = True
        if start:
            json_str += line + "\n"
            
    try:
        data = json.loads(json_str)
        missing_ids = [r["author_id"] for r in data[0]["results"]]
    except Exception as e:
        print("Error parsing wrangler output:", e)
        print("Output was:\n", stdout[:500])
        sys.exit(1)
        
    print(f"Found {len(missing_ids)} missing author IDs in remote D1:")
    print(missing_ids)
    
    if not missing_ids:
        print("No missing profiles! All authors have active profiles.")
        return

    # 2. Build profile objects for each missing author
    statements = []
    used_handles = set()
    
    # Query existing handles to prevent collision
    h_query = "SELECT handle FROM user_profiles;"
    h_out, _, _ = run_cmd(["npx.cmd", "wrangler", "d1", "execute", "aetheris-db", "--remote", f"--command={h_query}"])
    for line in h_out.splitlines():
        clean = line.strip().strip('",')
        if clean and not clean.startswith("[") and not clean.startswith("{"):
            used_handles.add(clean.lower())

    for i, aid in enumerate(missing_ids):
        if aid in KNOWN_PROFILES:
            kp = KNOWN_PROFILES[aid]
            display_name = kp["display_name"]
            handle = kp["handle"]
            bio = kp["bio"]
            location = kp["location"]
            website = kp["website"]
            style = kp["style"]
            role = kp["role"]
            trust_score = kp["trust_score"]
            merit_score = kp["merit_score"]
            interests = kp["interests"]
        else:
            first = FIRST_NAMES[i % len(FIRST_NAMES)]
            last = LAST_NAMES[(i * 3 + 1) % len(LAST_NAMES)]
            display_name = f"{first} {last}"
            
            tag = GAMER_TAGS[i % len(GAMER_TAGS)]
            suffix = aid[:4] if len(aid) >= 4 else str(random.randint(10, 99))
            handle = f"{tag}_{suffix}"
            if handle.lower() in used_handles:
                handle = f"{tag}_{aid[:6]}"
            used_handles.add(handle.lower())
            
            style = STYLES[i % len(STYLES)]
            bio = BIOS[i % len(BIOS)]
            location = LOCATIONS[i % len(LOCATIONS)]
            website = f"https://urefy.com/u/{handle}"
            role = ROLES[i % len(ROLES)]
            trust_score = random.randint(82, 98)
            merit_score = random.randint(45, 620)
            interests = ["Gaming", "OpenSource", "Technology", "Privacy"]

        avatar_url = f"https://api.dicebear.com/7.x/{style}/svg?seed={handle}&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827"
        banner_url = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80"
        created_at = NOW_MS - random.randint(30, 180) * DAY_MS
        updated_at = NOW_MS - random.randint(1, 25) * DAY_MS
        interests_json = json.dumps(interests)
        
        row = (
            f"({sql_esc(aid)}, {sql_esc(display_name)}, {sql_esc(handle)}, "
            f"{sql_esc(bio)}, {sql_esc(avatar_url)}, {sql_esc(banner_url)}, "
            f"NULL, {sql_esc(interests_json)}, {sql_esc(website)}, {sql_esc(location)}, "
            f"{created_at}, {updated_at})"
        )
        statements.append(f"INSERT OR REPLACE INTO user_profiles (user_id, display_name, handle, bio, avatar_url, banner_url, pinned_post_id, interests_json, website, location, created_at, updated_at) VALUES {row};")

    print(f"Generated {len(statements)} profile insertion statements.")
    
    # Save SQL file
    sql_file = os.path.join(BASE_DIR, "seed_missing_profiles.sql")
    with open(sql_file, "w", encoding="utf-8") as f:
        f.write("\n".join(statements) + "\n")
    print(f"Saved statements to: {sql_file}")
    
    # Execute batch in D1
    print("\nExecuting batch upload to Cloudflare D1 remote database...")
    exec_cmd = ["npx.cmd", "wrangler", "d1", "execute", "aetheris-db", "--remote", f"--file={sql_file}"]
    out, err, code = run_cmd(exec_cmd)
    
    if code != 0:
        print("D1 execution failed:", err)
        print("Output:", out)
        sys.exit(1)
        
    print("D1 execution successful!")
    print(out)
    
    # Verify count
    v_query = "SELECT COUNT(*) as count FROM user_profiles;"
    vout, _, _ = run_cmd(["npx.cmd", "wrangler", "d1", "execute", "aetheris-db", "--remote", f"--command={v_query}"])
    print("Updated user_profiles count verification:")
    print(vout)

if __name__ == "__main__":
    main()
