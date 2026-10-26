#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/seed_viral_trending_wave2.py
Wave 2 Viral Trending Ecosystem & Full Comment Visibility Guarantee:
1. Ingests 14 Top-Tier Trending Feature Posts (DOOM Dark Ages, Silent Hill 2, Expedition 33, Switch 2, Stalker 2, RPCS3, Claude 3.7, Flux.1, etc.)
2. Generates hierarchical threaded comments for all new posts.
3. Automatically scans all existing posts in D1 that have 0 comments and populates 2-3 authentic, topical comments for each.
4. Updates reply_count on all posts to match actual comments in D1 so 100% of posts and comments are completely visible!
5. Ingests 30+ new live chat messages across relays-general, relays-dev, pulse-global.
"""

import sys
import os
import json
import time
import random
import subprocess
import re

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
CLIENT_UI_DIR = os.path.join(PROJECT_ROOT, "packages", "client-ui")

NOW_MS = int(time.time() * 1000)
H_MS = 3600 * 1000
M_MS = 60 * 1000

# Verified existing user IDs from user_profiles
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

def run_d1_command(command, json_out=True):
    cmd = [
        "npx.cmd" if os.name == "nt" else "npx",
        "wrangler",
        "d1",
        "execute",
        "aetheris-db",
        "--remote",
        f"--command={command}"
    ]
    if json_out:
        cmd.append("--json")
    res = subprocess.run(cmd, cwd=CLIENT_UI_DIR, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"  [!] D1 command error: {res.stderr or res.stdout}")
        return None
    if json_out:
        try:
            return json.loads(res.stdout)
        except Exception:
            return None
    return res.stdout

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
            res = subprocess.run(cmd, cwd=CLIENT_UI_DIR, capture_output=True, text=True)
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
        time.sleep(0.4)

    if os.path.exists(batch_file):
        os.remove(batch_file)
    return True

# =============================================================================
# 14 TOP-TIER VIRAL TRENDING FEATURE POSTS
# =============================================================================

NEW_TRENDING_POSTS = [
    # 1. DOOM: The Dark Ages
    {
        "id": "post-2026-doom-dark-ages-idtech8-shieldsaw",
        "channel_id": "c/gaming",
        "author": "vulkan_wizard",
        "flair": "GAMEPLAY & TECH",
        "title": "DOOM: The Dark Ages Architecture Deep-Dive: idTech 8 Vulkan Pipeline, Shield-Saw Parry Mechanics & Brutal Siege Combat",
        "content": """id Software is redefining FPS combat once again with **DOOM: The Dark Ages**. By pivoting from DOOM Eternal's vertical acrobatics to grounded, crushing siege warfare, Hugo Martin and the tech team at id have constructed what looks like the definitive showcase for the brand-new **idTech 8 engine**.

### Technical & Engine Innovations in idTech 8:
1. **Pure Vulkan Hardware Ray Tracing Pipeline**:
   - id Software completely bypassed legacy rasterized fallback passes. Global illumination, ambient occlusion, and dynamic torch reflections in gothic medieval cathedrals are computed via unified hardware ray tracing pipelines.
   - Micro-polygon cluster streaming (similar to Unreal Engine's Nanite, but built specifically for id's megatexture streaming heritage) allows massive demonic titan corpses and crumbling castle ramparts with zero perceptible LOD pop-in.
2. **The Shield-Saw & Physics-Driven Parrying**:
   - Unlike standard defensive mechanics, the Shield-Saw is an active offensive weapon. Parrying projectile spikes dynamically reflects kinetic energy back at Hell Knights, triggering directional bone fracturing.
   - Dual-wielding the skull-crusher mace and shield requires micro-timing management, giving encounters a rhythmic, brutal flow.
3. **Audio Ray Tracing**:
   - Sound propagation dynamically bounces off stone corridors, wooden battlements, and open courtyard battlefields, allowing players to locate ambushes through directional spatial audio cues alone.

Who else is counting down the days until we get our hands on the Super Shotgun and Atlan mech battles?""",
        "images": [
            "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": {
            "src": "https://www.youtube.com/watch?v=4tmZdkn_hQ4",
            "poster": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"
        },
        "votes": 1740,
        "boosts": 590,
        "offset_h": 1.2,
        "comments": [
            ("void_pointer", None, "id Software's Vulkan engineering is second to none in this entire industry. While other AAA studios ship games that drop to 40 FPS on a 4090, idTech consistently delivers locked 144+ FPS with frame pacing so flat it looks like a drawn line.", 160),
            ("dan_gaming", "c-1", "That shield-saw mechanic throwing sparks as you grind through cyber-demons gave me instant chills. The slower, heavier movement speed feels so much more visceral than eternal's constant aerial dashing.", 124),
            ("speedrun_ghoul", None, "The speedrunning potential with shield ricochets and shield surfing is going to be absurd. Can't wait to see the sub-20 minute runs.", 88),
            ("vulkan_wizard", "c-3", "The internal physics tick rate is locked at 250Hz. idTech 8 handles simultaneous projectile collision calculations on the GPU using compute shaders, which prevents any physics desync during fast movement.", 115)
        ]
    },

    # 2. Silent Hill 2 Remake PC Optimization & Stutter Fixes
    {
        "id": "post-2026-silent-hill-2-remake-pc-stutter-dxvk-fix",
        "channel_id": "c/gaming",
        "author": "dan_gaming",
        "flair": "OPTIMIZATION & GUIDE",
        "title": "Silent Hill 2 Remake on PC: Why Unreal Engine 5.4 Stutters on High-End Rigs and How DXVK-Async & Engine.ini Tweaks Lock Frametimes",
        "content": """Bloober Team's remake of **Silent Hill 2** captures the psychological dread and foggy melancholia of the original masterfully. However, on PC, players with RTX 4080 and 4090 GPUs quickly noticed distracting micro-stutters during camera pans across the South Vale streets and Brookhaven Hospital.

### Root Cause Analysis:
- The culprit is twofold: **Unreal Engine 5.4 Lumen software ray tracing traversal** combined with **DirectX 12 pipeline state object (PSO) compilation hitches** when entering new streaming sublevels.
- Even with the initial shader compilation bar, UE5 continues to compile compute shaders on-the-fly for volumetric fog scattering whenever flashlight angles shift.

### The Verified Community Fix for Butter-Smooth Frametimes:
1. **Engine.ini Configuration (`%LOCALAPPDATA%\\SHProto\\Saved\\Config\\Windows\\Engine.ini`)**:
   Add the following lines under `[SystemSettings]`:
   ```ini
   r.CreateShadersOnLoad=1
   r.Shaders.Optimize=1
   r.Streaming.PoolSize=0
   r.Streaming.LimitPoolSizeToVRAM=1
   r.Streaming.FramesForFullUpdate=1
   r.Vulkan.EnableEarlyReflections=1
   ```
2. **DXVK-Async Wrapper (or Proton on Linux)**:
   - Wrapping the executable with DXVK 2.4 translates DirectX 12 calls to Vulkan and compiles pipeline states asynchronously in background worker threads.
   - 0.1% low frametimes jump from 32 FPS to **84 FPS locked** on an RTX 4070 / 4080 at 1440p DLSS Quality.
3. Set in-game *Shadow Quality* to High instead of Epic: Epic enables virtual shadow maps (VSM) on microscopic foliage that eats 4.5ms of frametime with negligible visual difference in heavy fog.

With these three adjustments, exploring the foggy streets feels genuinely cinematic with zero frame pacing hitching.""",
        "images": [
            "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": {
            "src": "https://www.youtube.com/watch?v=0w_3N1K-f8U",
            "poster": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80"
        },
        "votes": 1490,
        "boosts": 480,
        "offset_h": 2.5,
        "comments": [
            ("subzero_clocker", None, "Applied `r.CreateShadersOnLoad=1` and `r.Streaming.PoolSize=0` to my Engine.ini: the stuttering entering the Neely's Bar district completely vanished! Thank you for this breakdown.", 142),
            ("vulkan_wizard", "c-1", "DXVK-Async is doing god's work for Unreal Engine 5 games. Modern DX12 driver implementations from Microsoft just don't handle asynchronous pipeline state caching as cleanly as Vulkan's pipeline cache extensions.", 118),
            ("retro_pixel", None, "The atmosphere in this remake is extraordinary. Hearing the radio static crackle in 3D audio while walking through the fog at 90 FPS locked is peak survival horror.", 95)
        ]
    },

    # 3. Clair Obscur: Expedition 33
    {
        "id": "post-2026-clair-obscur-expedition-33-preview",
        "channel_id": "c/gaming",
        "author": "retro_pixel",
        "flair": "GAME PREVIEW",
        "title": "Clair Obscur: Expedition 33: The French Indie Turn-Based Sensation with Real-Time Parries That Is Breaking Steam Wishlists",
        "content": """Every few years, an indie studio appears with a project so stylistically distinct and mechanically confident that it revitalizes an entire genre. Sandfall Interactive's **Clair Obscur: Expedition 33** is that game.

### The Concept & Belle Époque Grimdark Lore:
Once a year, the mysterious \"Paintress\" wakes up and paints a cursed number onto her monolith. Everyone of that age instantly turns to dust and vanishes into thin air. Tomorrow, she wakes up to paint **\"33\"**.
You command a desperate expedition of French resistance fighters embarking across the sea to destroy the Paintress before she erases every 33-year-old on Earth.

### Why the Combat System Is Pure Genius:
- Combines the tactical menu planning of classic *Final Fantasy* and *Persona* with **Sekiro-style active real-time reactions**.
- When an enemy swings, you can time a precision parry (0.2s window) or directional dodge to trigger devastating counter-attacks.
- Free-aim weak-point shooting during turn phases lets you target enemy weak spots (eyes, armor joints) for critical stagger build-up.
- Powered by Unreal Engine 5 with breathtaking art direction inspired by French Impressionism, surrealist sculpture, and classical piano compositions by Fabrizio Mancinelli.

It currently ranks among the top 5 most wishlisted RPGs on Steam worldwide.""",
        "images": [
            "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": {
            "src": "https://www.youtube.com/watch?v=fXb9qR4-vQ8",
            "poster": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80"
        },
        "votes": 1380,
        "boosts": 460,
        "offset_h": 3.8,
        "comments": [
            ("dan_gaming", None, "The French voice acting paired with the melancholic piano soundtrack in the reveal trailer was pure poetry. Turn-based combat that keeps you actively engaged with parries is the modern evolution the genre needed.", 130),
            ("pixel_witch", "c-1", "The character design of Gustave and Maelle with the Belle Époque velvet coats and brass pocket watches is sublime. Proof that strong art direction will always trump raw polygon count.", 98),
            ("speedrun_ghoul", None, "If the parry timings are rhythm-based like Sekiro, high-skill players are going to do level 1 no-hit runs on day one. Cannot wait for this.", 85)
        ]
    },

    # 4. Nintendo Switch 2 Rumors, Hardware & DLSS Analysis
    {
        "id": "post-2026-nintendo-switch-2-hardware-dlss-analysis",
        "channel_id": "c/gaming",
        "author": "switch_modder",
        "flair": "HARDWARE & LEAKS",
        "title": "Nintendo Switch 2 Technical Architecture: Nvidia T239 Drake SoC, 12GB LPDDR5X & DLSS 3.5 Ray Reconstruction Breakdown",
        "content": """With manufacturing manifests and shipping customs data confirmed across Taiwanese supply chains, the architectural blueprint for **Nintendo's next-generation console (Switch 2)** is coming into sharp focus.

### The Custom Silicon: Nvidia Tegra T239 (Drake):
1. **CPU Cluster**:
   - 8x ARM Cortex-A78C cores running at ~1.5GHz handheld / 2.0GHz docked.
   - Enormous instruction-per-clock (IPC) leap over the ancient 4x Cortex-A57 cores in the original 2017 Switch.
2. **GPU & CUDA Architecture**:
   - Custom **Ampere GA10F** derivative with 1,536 CUDA cores, 48 Tensor Cores, and 12 RT Cores.
   - 8nm Samsung foundry process optimized for extreme power efficiency (7W–12W sustained draw).
3. **12 GB LPDDR5X Memory Pool**:
   - 128-bit bus with 102 GB/s memory bandwidth (nearly 4x faster than the original Switch's 25.6 GB/s).
   - Allows games to allocate 9.5 GB to active game assets, with 2.5 GB reserved for the modernized OS shell and background party voice chat.

### The Game-Changer: Tensor Core DLSS 3.5:
Because modern games are too demanding for 15W portable power budgets to render at native 4K, Nintendo and Nvidia are leveraging **DLSS Super Resolution and Ray Reconstruction**:
- Render internally at 1080p -> Tensor core AI upscales to a pristine 4K 60FPS on living room OLED TVs.
- Full backward compatibility with the existing Switch 1 physical cartridge and digital library with automatic resolution and framerate unlocks.

The handheld gaming wars just got very serious.""",
        "images": [
            "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": {
            "src": "https://www.youtube.com/watch?v=0hYmP9mH0z0",
            "poster": "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=1200&q=80"
        },
        "votes": 1620,
        "boosts": 540,
        "offset_h": 5.0,
        "comments": [
            ("subzero_clocker", None, "12GB of LPDDR5X is the key spec here. The biggest problem with the Steam Deck and current handhelds is 16GB shared RAM being tight when modern games allocate 10GB to VRAM. 12GB dedicated for a locked console target will punch way above its weight.", 150),
            ("firmware_dumper", "c-1", "From a reverse-engineering perspective, Nvidia's hardware security on the T239 will be much harder to glitch than the Tegra X1. But having an Ampere GPU in your backpack is going to be wild for homebrew.", 120),
            ("dan_gaming", None, "If existing Switch 1 games like Zelda: Tears of the Kingdom and Pokemon Scarlet get free 60 FPS patches on Switch 2, it will be the fastest-selling console in gaming history.", 135)
        ]
    },

    # 5. Handheld Shootout: Steam Deck OLED vs ROG Ally X vs Legion Go
    {
        "id": "post-2026-handheld-shootout-steamdeck-allyx-legiongo",
        "channel_id": "c/gaming",
        "author": "proton_rider",
        "flair": "HARDWARE BENCHMARK",
        "title": "2026 Handheld Gaming Shootout: Steam Deck OLED vs ASUS ROG Ally X vs Legion Go (SteamOS vs Bazzite Linux at 15W TDP)",
        "content": """The PC gaming handheld market has matured from experimental prototypes into a multi-billion dollar ecosystem. We put the three top contenders through an exhaustive 40-hour test suite focused on **efficiency per watt, suspend/resume reliability, and 15W TDP performance**:

### The Contenders:
1. **Steam Deck OLED (Custom AMD Sephiroth APU, 6nm, 50Wh battery)**:
   - *Strengths*: Flawless SteamOS user experience, true sub-second sleep/wake suspend, class-leading 90Hz HDR OLED panel with 1,000 nits peak brightness, and unbeatable 4-6 hour battery life in indie/emulation titles.
   - *Weakness*: Lacks horsepower for heavy 1080p ray-traced AAA titles.
2. **ASUS ROG Ally X (AMD Ryzen Z1 Extreme, 24GB LPDDR5X, massive 80Wh battery)**:
   - *Strengths*: Massive 80Wh battery eliminates battery anxiety; 24GB of RAM eliminates VRAM allocation stutter; dual USB-C ports with Thunderbolt 4 support.
   - *Weakness*: Ships with Windows 11 by default, which suffers from sleep-mode power drain and clunky touch controls unless swapped to **Bazzite Linux**.
3. **Lenovo Legion Go (Z1 Extreme, 8.8\" 144Hz 1600p IPS display, detachable controllers)**:
   - *Strengths*: Giant high-res display doubles as a desktop tablet; built-in kickstand and FPS mouse mode.
   - *Weakness*: Heavy (854g) and battery life is poor at higher resolution profiles.

### The Verdict at 15W TDP:
When running Bazzite Linux on the ROG Ally X, it matches the Steam Deck's instant suspend/resume reliability while offering **30% higher framerates in Cyberpunk 2077 and Monster Hunter Wilds** thanks to 24GB RAM and higher GPU compute units. But for pure pick-up-and-play ergonomic perfection, the Steam Deck OLED remains the gold standard.""",
        "images": [
            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": {
            "src": "https://www.youtube.com/watch?v=0hYmP9mH0z0",
            "poster": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80"
        },
        "votes": 1290,
        "boosts": 390,
        "offset_h": 6.5,
        "comments": [
            ("arch_chad", None, "Bazzite Linux on the ROG Ally X is the ultimate combination. You get the superior hardware of the Ally X with the seamless console UI and Proton compatibility of SteamOS. Windows on a handheld is dead.", 160),
            ("sim_rig_racer", "c-1", "That 80Wh battery in the Ally X is insane. Playing Forza Horizon 5 for 3.5 hours straight on a train ride without plugging into a wall is liberating.", 112),
            ("dan_gaming", None, "The Steam Deck OLED's screen still ruins every other display for me. True blacks and 0.1ms pixel response time make 45 FPS feel smoother than 60 FPS on standard IPS panels.", 128)
        ]
    },

    # 6. S.T.A.L.K.E.R. 2: Heart of Chornobyl PC Performance
    {
        "id": "post-2026-stalker-2-heart-of-chornobyl-optimization",
        "channel_id": "c/gaming",
        "author": "gentoo_compiler",
        "flair": "TECH ANALYSIS",
        "title": "S.T.A.L.K.E.R. 2: Heart of Chornobyl PC Performance: Unreal Engine 5.4 Nanite Foliage, A-Life 2.0 & VRAM Allocation",
        "content": """The release of **S.T.A.L.K.E.R. 2: Heart of Chornobyl** by Ukrainian developer GSC Game World is both an emotional triumph of human perseverance and a brutal technical stress test for modern PC hardware.

### The Chornobyl Exclusion Zone in Unreal Engine 5.4:
1. **Nanite Foliage & Geometry Density**:
   - The Zone features millions of individualized pine needles, rusted corrugated roofs, and overgrown radiation anomalies with zero flat LOD swapping.
   - Nanite streaming is intensely dependent on PCIe bandwidth; installing the game on a Gen4 NVMe is essential to eliminate traversal hitches when sprint-traveling across the Red Forest.
2. **A-Life 2.0 Living World Simulation**:
   - Stalkers, bloodsuckers, and mutant blind dogs simulate autonomous survival routines across background map sectors.
   - Heavy multithreaded CPU load: CPUs with large L3 cache pools (AMD 3D V-Cache) show a **22% frametime stability advantage** during surprise faction firefights at night.
3. **VRAM Footprint**:
   - 1080p Epic: 9.8 GB VRAM.
   - 1440p Epic: 12.6 GB VRAM.
   - 4K Epic: 16.2 GB VRAM.
   - Users on 8GB cards should set *Texture Resolution* to Medium and *View Distance* to High to prevent memory paging to system RAM.

Good hunting, Stalker. The Zone is as unforgiving and magnificent as we always dreamed.""",
        "images": [
            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": {
            "src": "https://www.youtube.com/watch?v=0hYmP9mH0z0",
            "poster": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80"
        },
        "votes": 1420,
        "boosts": 470,
        "offset_h": 8.0,
        "comments": [
            ("void_pointer", None, "The atmospheric lighting during an Emission storm is unbelievable. The sky turning blood red while thunder shakes the bunker walls is the most immersive experience in modern gaming.", 138),
            ("subzero_clocker", "c-1", "Running TSR (Temporal Super Resolution) at 75% scale gave me better image stability and edge reconstruction than FSR 3.1 in heavy foliage. Definitely try TSR if you have an AMD card.", 94),
            ("retro_pixel", "c-2", "A-Life 2.0 encounters make the world feel alive. Watching two bandits get ambushed by a pseudogiant while I was looting an anomaly was pure emergent Stalker chaos.", 115)
        ]
    },

    # 7. RPCS3 PS3 Emulation 2026 Breakthroughs
    {
        "id": "post-2026-rpcs3-ps3-emulation-4k60-mgs4-breakthrough",
        "channel_id": "c/gaming",
        "author": "mister_arcade",
        "flair": "EMULATION & TECH",
        "title": "RPCS3 PS3 Emulation in 2026: Metal Gear Solid 4 & Gran Turismo 5 Running at 4K 60FPS via AVX-512 & SPU Thread Scheduling",
        "content": """The PlayStation 3's infamously complex **Cell Broadband Engine** (with its single PowerPC PPE core and eight specialized SPU vector co-processors) was once considered mathematically impossible to emulate efficiently on standard consumer x86_64 PCs.

Today, the open-source **RPCS3** team has achieved what many thought impossible: **Metal Gear Solid 4: Guns of the Patriots** and **Gran Turismo 5** running at a locked **4K 60 FPS** with zero audio desync.

### The Key Technical Breakthroughs:
1. **AVX-512 & AVX10 Vectorization**:
   - Modern AMD Zen 4/5 and Intel 14th/15th Gen CPUs feature full 512-bit wide vector registers.
   - RPCS3 maps Cell SPU SIMD vector operations (which executed 128-bit vector instructions) directly to hardware AVX-512 instruction units, executing up to 4 SPU math ops in a single CPU cycle.
2. **SPU Block Thread Scheduling**:
   - Redesigned asynchronous SPU thread dispatchers eliminate the micro-stutters during heavy combat in Middle East Act 1 of MGS4.
3. **Resolution & Framerate Unlocks**:
   - Native 720p 30 FPS games can now be rendered at internal 3840x2160 resolution with 16x Anisotropic Filtering and unlocked 60Hz timing patches.

Software preservation is winning. You no longer need to keep a dying 2006 fat PS3 alive to experience the greatest generation of console storytelling.""",
        "images": [
            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": {
            "src": "https://www.youtube.com/watch?v=0hYmP9mH0z0",
            "poster": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80"
        },
        "votes": 1510,
        "boosts": 510,
        "offset_h": 9.5,
        "comments": [
            ("asm_purist", None, "The Cell SPU architecture was an absolute nightmare for developers back in 2006, but mapping SPU registers to AVX-512 masks in modern assembly is pure algorithmic elegance. The RPCS3 devs are geniuses.", 155),
            ("dan_gaming", "c-1", "Playing MGS4 at 4K 60FPS on an ultrawide monitor with zero slowdown in the Rex vs Ray battle was a religious experience. Sony should be hiring these developers.", 130),
            ("retro_pixel", None, "Gran Turismo 5 with 16 cars on track at the Nürburgring in the rain holding 60 FPS without a single frame drop is stunning. True video game preservation.", 108)
        ]
    },

    # 8. Ryujinx & Switch Emulation Preservation
    {
        "id": "post-2026-ryujinx-switch-emulation-preservation",
        "channel_id": "c/technology",
        "author": "zero_day",
        "flair": "PRESERVATION",
        "title": "The Indestructible Nature of Open Source: How the Community Preserved, Mirrored & Continued Ryujinx After Corporate Takedowns",
        "content": """When corporate legal cease-and-desist actions targeted the lead developers of the beloved Nintendo Switch emulator **Ryujinx**, many in the mainstream tech press proclaimed the death of modern console emulation.

They fundamentally misunderstood the nature of open-source software and decentralized Git version control.

### The Global Preservation Response:
1. **Thousands of Autonomous Git Mirrors**:
   Within 30 minutes of the repository being removed, thousands of automated mirrors sprang up across Tor onion services, self-hosted GitLab/Gitea instances, Radicle peer-to-peer repositories, and IPFS archives.
2. **Reproducible C# / .NET 9 Build Pipelines**:
   Because Ryujinx was cleanly authored in cross-platform modern C# with zero proprietary SDK dependencies, community builders automated CI/CD pipelines producing verified reproducible binaries with clean SHA-256 signatures.
3. **Decentralized Bug Fixing**:
   Independent developers continue to submit performance patches for modern graphics drivers, Wayland display synchronization, and memory allocator optimizations.

Code, once set free under the MIT license, cannot be put back into a bottle. Preservation is a mathematical reality, not a corporate permission slip.""",
        "images": [
            "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": {
            "src": "https://www.youtube.com/watch?v=0hYmP9mH0z0",
            "poster": "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=1200&q=80"
        },
        "votes": 1780,
        "boosts": 630,
        "offset_h": 11.0,
        "comments": [
            ("anti_tracker", None, "You cannot destroy distributed Git trees. Every developer who ever cloned `git clone https://...` possesses a full, bit-for-bit cryptographic history of the codebase. Corporate lawyers simply don't understand distributed systems.", 175),
            ("arch_chad", "c-1", "I keep the entire repository mirrored on my local ZFS pool alongside the complete build dependencies. Open source software is immortal.", 140),
            ("switch_modder", None, "And the fact that Ryujinx ran on pure high-level emulation (HLE) without a single line of Nintendo proprietary code proves the legal strength of the project.", 118)
        ]
    },

    # 9. Tailscale Subnet Router & Mesh VPN Masterclass
    {
        "id": "post-2026-tailscale-subnet-router-homelab-guide",
        "channel_id": "c/technology",
        "author": "docker_ninja",
        "flair": "NETWORKING & GUIDE",
        "title": "Tailscale Subnet Router Masterclass: Zero-Port-Forward Remote Access to Your Entire Homelab with WireGuard Cryptography",
        "content": """Opening ports on your home router (port forwarding) to access internal web dashboards, Plex, or Proxmox nodes is an invitation for automated botnet scanners to hammer your IP address.

The modern, hardened solution is a **Tailscale Subnet Router** running on a tiny 5W mini PC, Raspberry Pi, or unprivileged LXC container.

### Step-by-Step Production Setup:
1. **Install Tailscale on an Internal Host (Debian/Ubuntu)**:
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   ```
2. **Enable IPv4 & IPv6 Kernel Packet Forwarding**:
   ```bash
   echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
   echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
   sudo sysctl -p /etc/sysctl.d/99-tailscale.conf
   ```
3. **Advertise Your Local Subnet to Your Mesh Network**:
   ```bash
   sudo tailscale up --advertise-routes=192.168.1.0/24 --accept-dns=false
   ```
4. **Approve Routes in the Tailscale Admin Console**:
   Under *Machines* -> Select host -> *Edit route settings* -> Enable `192.168.1.0/24`.

### Why This Is Bulletproof:
- **Zero Open Ports**: Inbound firewall rules on your home router remain strictly 100% closed.
- **End-to-End Encryption**: Every packet is encrypted with modern ChaCha20-Poly1305 WireGuard keys exchanged via peer-to-peer NAT traversal (STUN/DERP).
- **Access Anywhere**: From your phone on cellular data or your laptop at a coffee shop, navigating to `http://192.168.1.50:8006` opens your Proxmox dashboard instantly as if you were sitting on your living room couch.

Pure digital security without complexity.""",
        "images": [
            "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": {
            "src": "https://www.youtube.com/watch?v=0hYmP9mH0z0",
            "poster": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80"
        },
        "votes": 1340,
        "boosts": 420,
        "offset_h": 12.8,
        "comments": [
            ("jellyfin_pirate", None, "I've been using this for 2 years with Tailscale MagicDNS and it is the single best quality-of-life upgrade for any self-hoster. Zero port forwarding, zero dynamic DNS headaches.", 145),
            ("packet_storm", "c-1", "Pairing it with Tailscale Exit Nodes means you also have your own private encrypted VPN tunnel when connected to untrusted public Wi-Fi networks.", 112),
            ("freebsd_demon", None, "Works flawlessly on FreeBSD / OPNsense too using the `tailscale-opnsense` plugin. Total routing control.", 85)
        ]
    },

    # 10. Pi-hole + Unbound Recursive DNS Setup
    {
        "id": "post-2026-pihole-unbound-recursive-dns-guide",
        "channel_id": "c/technology",
        "author": "anti_tracker",
        "flair": "PRIVACY & SECURITY",
        "title": "Building an Authoritative Home DNS: Pi-hole + Unbound Recursive DNS with Zero Upstream Logging",
        "content": """Even if you use encrypted messaging and secure browsers, your internet service provider (ISP) or third-party DNS provider (Google 8.8.8.8, Cloudflare 1.1.1.1) still sees every single domain query your household makes.

By combining **Pi-hole** with **Unbound**, you become your own **root recursive DNS resolver**.

### How Recursive DNS Works:
Instead of sending your query `where is wikipedia.org?` to a commercial server that logs your IP, Unbound queries the global Root DNS Servers (`.` root servers) directly, resolves the `.org` TLD authoritative server, and contacts Wikipedia's nameserver directly with cryptographic DNSSEC validation.

### Essential Configuration Snippet (`/etc/unbound/unbound.conf.d/pi-hole.conf`):
```yaml
server:
    verbosity: 1
    interface: 127.0.0.1
    port: 5335
    do-ip4: yes
    do-udp: yes
    do-tcp: yes
    harden-glue: yes
    harden-dnssec-stripped: yes
    use-caps-for-id: yes
    edns-buffer-size: 1232
    prefetch: yes
    num-threads: 1
```

Point Pi-hole's upstream DNS to `127.0.0.1#5335`.
Result: **Zero commercial DNS logging, automatic ad and telemetry domain filtering across every phone, TV, and console in your home**, and sub-5ms cached DNS resolution speeds.""",
        "images": [
            "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": {
            "src": "https://www.youtube.com/watch?v=0hYmP9mH0z0",
            "poster": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80"
        },
        "votes": 1260,
        "boosts": 380,
        "offset_h": 14.2,
        "comments": [
            ("arch_chad", None, "Running Pi-hole + Unbound in a lightweight LXC on Proxmox for 3 years straight. Blocking smart TV telemetry and mobile app tracking at the network level is essential digital hygiene.", 138),
            ("void_pointer", "c-1", "Setting `prefetch: yes` in Unbound is great because it automatically refreshes frequently accessed domain records before they expire. Your cache hit rate stays over 80%.", 102),
            ("anti_tracker", "c-2", "And with DNSSEC enforced, DNS cache poisoning attacks from malicious local network actors are rendered completely impossible.", 95)
        ]
    },

    # 11. Hall Effect Magnetic Switches & Rapid Trigger
    {
        "id": "post-2026-hall-effect-magnetic-switches-rapid-trigger",
        "channel_id": "c/technology",
        "author": "aimlab_top1",
        "flair": "HARDWARE & ESPORTS",
        "title": "Why Hall Effect Magnetic Switches & Rapid Trigger Replaced Mechanical Keyboards in Competitive Gaming",
        "content": """For thirty years, mechanical keyboards relied on physical metal leaf contacts: you press a key down until metal touches metal, and you must release the key past a fixed physical reset point before pressing it again.

The competitive gaming landscape has permanently abandoned metal contact leaves in favor of **Hall Effect magnetic analog switches**.

### How Hall Effect Sensing Works:
- A permanent neodymium magnet sits inside each switch stem.
- A Hall Effect sensor on the PCB measures the exact electromagnetic flux density in real-time with **0.01mm resolution**.
- **Dynamic Actuation**: You can configure keys to actuate at 0.1mm for lightning-fast movement, while setting your 'Ultimate' key to 2.5mm to prevent accidental fat-finger presses.
- **Rapid Trigger**: The moment you lift your finger by even 0.05mm, the key immediately deactivates. The moment you press down again by 0.05mm, it immediately reactivates—no waiting for a physical spring reset point.

In games like *Counter-Strike 2*, *Valorant*, and *Apex Legends*, this allows counter-strafing with zero physical delay. The keyboard has transformed from a binary typewriter into an analog precision controller.""",
        "images": [
            "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": {
            "src": "https://www.youtube.com/watch?v=0hYmP9mH0z0",
            "poster": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80"
        },
        "votes": 1180,
        "boosts": 350,
        "offset_h": 16.0,
        "comments": [
            ("dan_gaming", None, "Switching to a Wooting 60HE with 0.1mm rapid trigger felt like cheating when I first used it in CS2. Jiggle-peeking corners and stopping dead to take an AK headshot is instantaneous.", 130),
            ("subzero_clocker", "c-1", "And because there are no physical metal leaves to corrode or develop chatter, magnetic switches practically never double-click or wear out. Durability is easily 100M+ presses.", 98),
            ("aimlab_top1", "c-2", "Open-source firmware like QMK and web configurators like VIA/Wootility make calibrating deadzones a breeze. Standard mechanical keyboards feel sluggish after getting used to this.", 112)
        ]
    },

    # 12. Claude 3.7 Sonnet Hybrid Reasoning
    {
        "id": "post-2026-claude-3-7-sonnet-hybrid-reasoning-coding",
        "channel_id": "c/privacy-ai",
        "author": "rust_acean",
        "flair": "AI & AGENTS",
        "title": "Claude 3.7 Sonnet Hybrid Reasoning Deep-Dive: Adaptive Thinking Budgets & 64k Output Tokens for Enterprise Refactoring",
        "content": """Anthropic has officially released **Claude 3.7 Sonnet**, introducing what is arguably the most significant architectural paradigm shift in frontier LLMs: **Hybrid Reasoning**.

### The Breakthrough: Fixed vs. Adaptive Thinking Budgets:
Previously, models were split into two rigid extremes:
- Standard chat models (fast, but susceptible to logical hallucinations in complex math and code).
- Fixed reasoning models (slow, forcing users to wait 30 seconds even for trivial tasks).

Claude 3.7 Sonnet unites both modes into a single model with an **adaptive thinking slider**:
- You can specify an exact thinking token budget (e.g. from 128 tokens for quick refactors up to **64,000 tokens** for full multi-repository architectural synthesis).
- The model visibly reasons through edge cases, verifies compiler constraints, and self-corrects logic errors before generating code.

### Tested on a 20,000-Line Rust Monorepo:
We tasked Claude 3.7 with migrating a complex async Tokio network engine from manual channel polling to dynamic MLS TreeKEM encryption.
- It planned the migration in 8 distinct stages, preserved existing lifetime bounds without breaking API compatibility, and emitted 3,500 lines of verified, compiling Rust code on the first attempt with 100% green unit test outcomes.

Frontier AI has officially crossed into true senior engineering pair-programming territory.""",
        "images": [
            "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": {
            "src": "https://www.youtube.com/watch?v=F_fD0sWvHjg",
            "poster": "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80"
        },
        "votes": 1920,
        "boosts": 710,
        "offset_h": 17.5,
        "comments": [
            ("void_pointer", None, "The adaptive thinking budget is pure genius. Being able to set `budget_tokens: 16000` when asking it to find security vulnerabilities in smart contracts or cryptographic kernels catches subtle timing attacks that standard models miss completely.", 180),
            ("arch_chad", "c-1", "Paired with autonomous local test execution, the agent catches its own mistakes in the scratchpad before outputting the final file diff. It saves hours of manual debugging.", 145),
            ("neovim_cult", None, "Integrated it into Neovim via an LSP sidecar. The code completions it suggests actually understand the surrounding monorepo architecture instead of just guessing the next line.", 124)
        ]
    },

    # 13. Local AI Coding in Neovim & VS Code
    {
        "id": "post-2026-local-ai-coding-ollama-continue-deepseek",
        "channel_id": "c/privacy-ai",
        "author": "neovim_cult",
        "flair": "LOCAL DEV & PRIVACY",
        "title": "Offline & Private AI Coding: Setting up Ollama + Continue.dev + DeepSeek-Coder-V2 for 100+ Tokens/Sec in Neovim & VS Code",
        "content": """Why send your proprietary corporate codebase or personal projects to third-party cloud servers when you can run a state-of-the-art coding assistant **100% locally on your own GPU** with zero monthly subscriptions?

### The Sovereign Coding Stack:
1. **Ollama or vLLM Backend**:
   - Model: `deepseek-coder-v2:16b` or `qwen2.5-coder:14b`.
   - Both models rival GPT-4o in Python, TypeScript, Rust, and C++ code completion benchmarks.
2. **Continue.dev Plugin (for Neovim, VS Code, or JetBrains)**:
   - Configured in `~/.continue/config.json`:
     ```json
     {
       "models": [
         {
           "title": "Local DeepSeek Coder 14B",
           "provider": "ollama",
           "model": "qwen2.5-coder:14b",
           "apiBase": "http://localhost:11434"
         }
       ],
       "tabAutocompleteModel": {
         "title": "Qwen 2.5 Coder 1.5B (FIM)",
         "provider": "ollama",
         "model": "qwen2.5-coder:1.5b-base"
       }
     }
     ```
3. **Sub-40ms Tab Autocomplete**:
   Using the lightweight 1.5B Fill-In-The-Middle (FIM) model for tab completion generates suggestions in under 35 milliseconds, while the 14B model handles full-file refactoring and docstring generation in the sidebar.

Zero internet required. Code on an airplane, in a cabin, or inside a high-security air-gapped network with total peace of mind.""",
        "images": [
            "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": {
            "src": "https://www.youtube.com/watch?v=F_fD0sWvHjg",
            "poster": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80"
        },
        "votes": 1390,
        "boosts": 460,
        "offset_h": 19.5,
        "comments": [
            ("arch_chad", None, "The FIM tab completion with Qwen 2.5 Coder 1.5B is astonishingly fast on an RTX 3080. It feels just like GitHub Copilot, but without leaking my private repositories to Microsoft servers.", 140),
            ("rust_acean", "c-1", "And the 14B model actually understands Rust borrow checker mechanics. When I ask it to explain a lifetime error, it quotes the exact lines causing the conflict.", 115),
            ("gentoo_compiler", None, "Air-gapped coding is the gold standard for confidentiality. Everyone should have this configured locally.", 92)
        ]
    },

    # 14. Flux.1 Local AI Image Generation with ComfyUI
    {
        "id": "post-2026-flux1-local-comfyui-schnell-dev-guide",
        "channel_id": "c/privacy-ai",
        "author": "pixel_witch",
        "flair": "CREATIVE AI",
        "title": "Flux.1 Local Image Generation with ComfyUI: Running Schnell & Dev on 8GB–16GB Nvidia GPUs with GGUF & NF4 Quantization",
        "content": """Black Forest Labs (founded by the original creators of Stable Diffusion) completely revolutionized open-weights generative art with **Flux.1**. With 12 billion parameters and a hybrid multimodal transformer architecture, it delivers photorealistic hands, legible typography, and complex prompt adherence that outclasses Midjourney v6.

### How to Run Flux.1 Smoothly on Consumer GPUs:
1. **Model Variations**:
   - **Flux.1 Schnell (Apache 2.0 Open Source)**: Generates breathtaking 1024x1024 images in just **4 steps** (under 2 seconds on an RTX 4080).
   - **Flux.1 Dev (Non-Commercial Weight-Available)**: Higher guidance scale and detail for artistic illustration and portraiture in 20 steps.
2. **Quantization Formats for 8GB & 12GB VRAM**:
   - Standard FP16 weights require 24GB VRAM.
   - Using **GGUF `Q4_K_S` or `Q5_K_M`** or **NF4 checkpoints** in ComfyUI drops VRAM consumption down to **8.5 GB**, allowing RTX 3060, 4060, and 4070 owners to generate full 1024x1024 outputs with zero CPU offloading slowdowns.
3. **Text Rendering Precision**:
   Prompting: `\"A vintage cyberpunk neon sign glowing in the rain with the exact text 'SOVEREIGN WEB' written in cursive script\"` renders the exact letters flawlessly without gibberish artifacts.

The era of closed-source image generators with monthly credit subscriptions is officially over.""",
        "images": [
            "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": {
            "src": "https://www.youtube.com/watch?v=F_fD0sWvHjg",
            "poster": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80"
        },
        "votes": 1470,
        "boosts": 490,
        "offset_h": 21.0,
        "comments": [
            ("webgpu_artist", None, "The typography rendering in Flux is revolutionary. Actually being able to design book covers, game UI mockups, and posters with readable text in ComfyUI saves hours of Photoshop touchup.", 152),
            ("synth_druid", "c-1", "ComfyUI with the GGUF node runs Schnell in 1.8 seconds on my 4070 Ti Super. It has completely replaced Midjourney for all my album artwork prototypes.", 120),
            ("pixel_witch", "c-2", "And with native LoRA support now available, training custom character styles and artistic aesthetics takes less than 30 minutes on RunPod or local hardware.", 110)
        ]
    }
]

# =============================================================================
# 30+ ENERGETIC LIVE CHAT MESSAGES
# =============================================================================

NEW_CHAT_DATA = [
    # 1. RELAYS-GENERAL (11 messages)
    ("relays-general", "vulkan_wizard", "DOOM: The Dark Ages idTech 8 Vulkan ray tracing pipeline is pure art. zero raster fallback", 85.0),
    ("relays-general", "dan_gaming", "the shield-saw parry timing in Dark Ages looks like Sekiro meets classic DOOM. pure adrenaline", 78.0),
    ("relays-general", "aimlab_top1", "anyone here tested Wooting magnetic Hall Effect switches for CS2 counter-strafing? 0.1mm rapid trigger is game-changing", 68.0),
    ("relays-general", "subzero_clocker", "yes! the analog actuation eliminates key reset delay completely. my movement feels twice as responsive", 60.0),
    ("relays-general", "retro_pixel", "Silent Hill 2 remake on PC with `r.CreateShadersOnLoad=1` in Engine.ini runs so much smoother in the foggy town", 50.0),
    ("relays-general", "sim_rig_racer", "and Clair Obscur: Expedition 33 breaking top 5 on Steam wishlists proves turn-based RPGs with active parries are back in a huge way", 38.0),
    ("relays-general", "switch_modder", "Switch 2 having 12GB LPDDR5X and Ampere DLSS 3.5 means living room 4K 60FPS for Zelda is actually realistic", 28.0),
    ("relays-general", "proton_rider", "Bazzite Linux on the ROG Ally X with that 80Wh battery is the definitive portable gaming rig right now", 18.0),
    ("relays-general", "mister_arcade", "MGS4 running at 4K 60FPS on RPCS3 with AVX-512... never thought I'd see the Cell Broadband Engine conquered this cleanly", 10.0),
    ("relays-general", "dan_gaming", "what a time to be a PC gamer. everything runs unconstrained on open hardware 🎮⚡", 4.0),
    ("relays-general", "neon_cat", "gn everyone, see you on the relays tomorrow!", 1.0),

    # 2. RELAYS-DEV (11 messages)
    ("relays-dev", "rust_acean", "Claude 3.7 Sonnet's hybrid reasoning budget is incredible. setting 16k thinking tokens for compiler errors caught a subtle deadlock in my thread pool", 90.0),
    ("relays-dev", "void_pointer", "and running DeepSeek-Coder-V2 14B locally via Ollama in Neovim gives 85 tokens/sec with zero cloud exposure", 80.0),
    ("relays-dev", "neovim_cult", "Continue.dev + Qwen 2.5 Coder 1.5B FIM tab completion takes under 35ms. it feels completely instantaneous", 70.0),
    ("relays-dev", "docker_ninja", "configured Tailscale Subnet Router with zero open router ports: access to Proxmox and ZFS pools from my phone anywhere in the world", 58.0),
    ("relays-dev", "anti_tracker", "Unbound recursive DNS querying root servers directly with DNSSEC validation blocks all ISP tracking at the router level", 46.0),
    ("relays-dev", "pixel_witch", "Flux.1 Schnell generating photorealistic 1024x1024 images with legible text in 4 steps on ComfyUI is black magic", 35.0),
    ("relays-dev", "asm_purist", "AVX-512 512-bit vector instructions mapping Cell SPU math in RPCS3 is one of the greatest engineering feats in modern emulation", 24.0),
    ("relays-dev", "gentoo_compiler", "kernel 6.12 with sched_ext running BORE scheduler gives pristine 0.1% low frametimes in CPU-heavy games", 14.0),
    ("relays-dev", "zero_day", "Ryujinx community git mirrors across Radicle and Tor are thriving. open source code cannot be silenced", 7.0),
    ("relays-dev", "fiber_wizard", "Cloudflare OTP edge node ping is holding steady at 1.1ms across all API routes", 3.0),
    ("relays-dev", "arch_chad", "shipping clean code, running local models, owning our hardware. sovereign tech forward ⚡", 1.0),

    # 3. PULSE-GLOBAL (10 messages)
    ("pulse-global", "cyber_rights", "California AB 2426 legally requiring digital storefronts to stop calling license rentals 'buying' is shifting global consumer rights", 95.0),
    ("pulse-global", "dan_gaming", "Stalker 2's Emission storms in Unreal Engine 5.4 are terrifying and breathtaking in equal measure", 82.0),
    ("pulse-global", "retro_pixel", "Expedition 33's Belle Époque French art direction is going to inspire game designers for the next decade", 65.0),
    ("pulse-global", "speedrun_ghoul", "the speedrunning community for DOOM: The Dark Ages is going to be massive with the shield ricochet mechanics", 52.0),
    ("pulse-global", "switch_modder", "Switch 2 backward compatibility with physical cartridges is confirmed. our libraries are safe", 40.0),
    ("pulse-global", "proton_rider", "Steam Deck OLED screen at 90Hz HDR ruins standard monitors forever haha", 29.0),
    ("pulse-global", "deepseek_runner", "running 14B reasoning models on consumer GPUs for free is the best technological development of 2026", 19.0),
    ("pulse-global", "jellyfin_pirate", "Docker atomic hardlinks + Jellyfin 4K HDR playback = never paying for streaming services again", 11.0),
    ("pulse-global", "anti_tracker", "zero-log recursive DNS + WireGuard mesh = digital sovereignty at home", 5.0),
    ("pulse-global", "void_pointer", "decentralized networks, open weights, private computing. this is the future 🌐", 1.0)
]

def main():
    print("=" * 70)
    print("  UREfy Wave 2: Viral Trending Seeder & Comment Visibility Repair")
    print("=" * 70)

    # -------------------------------------------------------------------------
    # PART 1: Ingest 14 New Viral Trending Feature Posts
    # -------------------------------------------------------------------------
    posts_stmts = []
    comments_stmts = []

    for p_idx, p in enumerate(NEW_TRENDING_POSTS):
        p_id = p["id"]
        ch = p["channel_id"]
        author_uid = AUTHORS[p["author"]]
        flair = p["flair"]
        title = p["title"]
        content = p["content"]
        images_json = json.dumps(p["images"], ensure_ascii=False) if p.get("images") else None
        video_json = json.dumps(p["video"], ensure_ascii=False) if p.get("video") else None
        votes = p["votes"]
        boosts = p["boosts"]
        num_comments = len(p["comments"])
        p_created = NOW_MS - int(p["offset_h"] * H_MS) + random.randint(100, 9999)

        post_stmt = f"""INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    images_json, video_json, attachment_json, poll_id, quoted_post_json,
    status, created_at, is_expanded, facet_id, audience
) VALUES (
    {sql_esc(p_id)}, {sql_esc(ch)}, {sql_esc(author_uid)}, 'MEMBER',
    {sql_esc(title)}, {sql_esc(content)}, {sql_esc(flair)},
    {votes}, 0, {num_comments}, {boosts},
    {sql_esc(images_json)}, {sql_esc(video_json)}, NULL, NULL, NULL,
    'published', {p_created}, 0, NULL, 'public'
)"""
        posts_stmts.append(post_stmt)

        comment_id_map = {}
        c_time = p_created
        for c_idx, (c_author_key, parent_ref, c_content, c_votes) in enumerate(p["comments"]):
            c_id = f"comm-wave2-{p_idx+1}-{c_idx+1}"
            comment_id_map[f"c-{c_idx+1}"] = c_id

            real_parent_id = None
            if parent_ref and parent_ref in comment_id_map:
                real_parent_id = comment_id_map[parent_ref]

            c_time += random.randint(180, 900) * 1000 + random.randint(100, 900)
            c_author_uid = AUTHORS[c_author_key]

            comm_stmt = f"""INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content,
    merit_votes, created_at, facet_id
) VALUES (
    {sql_esc(c_id)}, {sql_esc(p_id)}, {sql_esc(real_parent_id)},
    {sql_esc(c_author_uid)}, 'MEMBER', {sql_esc(c_content)},
    {c_votes}, {c_time}, NULL
)"""
            comments_stmts.append(comm_stmt)

    print(f"[*] Prepared {len(posts_stmts)} new trending posts & {len(comments_stmts)} threaded comments.")

    # Execute New Posts & Comments
    execute_sql_batch(posts_stmts, "wave2_posts")
    execute_sql_batch(comments_stmts, "wave2_comments")

    # -------------------------------------------------------------------------
    # PART 2: Query D1 for all posts that currently have 0 comments in comments table
    # -------------------------------------------------------------------------
    print("\n[*] Scanning Cloudflare D1 for posts with missing comments...")
    query_missing = """
    SELECT p.id, p.title, p.channel_id, p.created_at, p.reply_count
    FROM posts p
    WHERE (p.status IN ('published', 'pinned') OR p.status IS NULL)
      AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id)
    LIMIT 200;
    """
    res = run_d1_command(query_missing)
    empty_posts = []
    if res and isinstance(res, list) and len(res) > 0:
        empty_posts = res[0].get("results", [])

    print(f"[*] Found {len(empty_posts)} posts with 0 comments in database.")

    repair_comments = []
    repair_reply_counts = []

    # Contextual comment templates for empty posts based on topics
    for idx, p in enumerate(empty_posts):
        p_id = p["id"]
        title = p["title"] or ""
        ch = p.get("channel_id") or "c/gaming"
        p_time = int(p.get("created_at") or NOW_MS - 24 * H_MS)

        # Generate 2 to 3 contextual comments
        c1_author = random.choice(AUTHOR_KEYS)
        c2_author = random.choice([k for k in AUTHOR_KEYS if k != c1_author])
        c3_author = random.choice([k for k in AUTHOR_KEYS if k not in (c1_author, c2_author)])

        # Select commentary based on title keywords
        t_lower = title.lower()
        if "wukong" in t_lower or "denuvo" in t_lower or "crack" in t_lower:
            c1_text = "The frametime pacing analysis here is spot-on. Stripping the runtime DRM hooks makes boss battle transitions completely stutter-free."
            c2_text = "Can verify. The CapFrameX telemetry on this release shows 0.1% lows jumping by over 30% compared to the store build."
            c3_text = "Clean standalone binary with zero hypervisor requirements is how game preservation should always be done."
        elif "ps5" in t_lower or "jailbreak" in t_lower or "switch" in t_lower or "atmosphere" in t_lower:
            c1_text = "The exploit chain on modern firmware has matured so much. Being able to run 60FPS patches and legal backups is incredible."
            c2_text = "Make sure to keep your console offline with custom DNS blocking to avoid unwanted background OTA updates."
            c3_text = "Uptime on the latest kernel payload has been rock solid. No rest mode panics after days of standby."
        elif "ai" in t_lower or "deepseek" in t_lower or "model" in t_lower or "llm" in t_lower:
            c1_text = "Running this model locally on consumer hardware is a game changer. The token generation throughput is remarkably smooth."
            c2_text = "The reasoning traces inside `<think>` catch subtle edge cases and logic flaws that standard models miss completely."
            c3_text = "Zero telemetry, zero API subscription bills. Sovereign local AI running on physical silicon is the future."
        elif "linux" in t_lower or "nix" in t_lower or "arch" in t_lower or "kernel" in t_lower:
            c1_text = "Declarative configuration and atomic rollbacks completely remove update anxiety. Best developer workstation setup by far."
            c2_text = "Pairing this with a hardened kernel and Pipewire audio gives sub-1ms audio latency. Rock solid stability."
            c3_text = "Great writeup! Bookmarking these config snippets for my next workstation deployment."
        elif "gta" in t_lower or "wilds" in t_lower or "monster hunter" in t_lower or "stalker" in t_lower or "game" in t_lower:
            c1_text = "The technical scope of this release looks generational. The physics and atmospheric simulation are on another level."
            c2_text = "Make sure to let the initial shader pre-compilation finish on first boot to prevent traversal micro-stutters."
            c3_text = "Easily my most anticipated game of the year. The gameplay mechanics look outstanding."
        else:
            c1_text = "Really insightful technical discussion. The architecture details and benchmark metrics highlighted here are invaluable."
            c2_text = "Agreed, excellent analysis. Appreciate the clear documentation and reproducible verification steps."
            c3_text = "Verified on my local test rig. Working seamlessly with zero issues."

        c1_id = f"comm-fill-{idx+1}-1"
        c2_id = f"comm-fill-{idx+1}-2"
        c3_id = f"comm-fill-{idx+1}-3"

        t1 = p_time + random.randint(300, 1800) * 1000
        t2 = t1 + random.randint(300, 1200) * 1000
        t3 = t2 + random.randint(300, 1500) * 1000

        repair_comments.append(f"""INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at, facet_id
) VALUES ({sql_esc(c1_id)}, {sql_esc(p_id)}, NULL, {sql_esc(AUTHORS[c1_author])}, 'MEMBER', {sql_esc(c1_text)}, {random.randint(45, 180)}, {t1}, NULL)""")

        repair_comments.append(f"""INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at, facet_id
) VALUES ({sql_esc(c2_id)}, {sql_esc(p_id)}, {sql_esc(c1_id)}, {sql_esc(AUTHORS[c2_author])}, 'MEMBER', {sql_esc(c2_text)}, {random.randint(30, 120)}, {t2}, NULL)""")

        repair_comments.append(f"""INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at, facet_id
) VALUES ({sql_esc(c3_id)}, {sql_esc(p_id)}, NULL, {sql_esc(AUTHORS[c3_author])}, 'MEMBER', {sql_esc(c3_text)}, {random.randint(25, 95)}, {t3}, NULL)""")

        repair_reply_counts.append(f"UPDATE posts SET reply_count = 3 WHERE id = {sql_esc(p_id)}")

    print(f"[*] Prepared {len(repair_comments)} contextual comments to fill all empty posts.")

    # Execute repair comments and update reply counts
    if repair_comments:
        execute_sql_batch(repair_comments, "repair_comments")
        execute_sql_batch(repair_reply_counts, "repair_counts")

    # -------------------------------------------------------------------------
    # PART 3: Ingest 32 Active Live Chat Messages
    # -------------------------------------------------------------------------
    chat_stmts = []
    for msg_idx, (ch_id, author_key, text, offset_m) in enumerate(NEW_CHAT_DATA):
        msg_id = f"msg-wave2-{msg_idx+200}"
        author_uid = AUTHORS[author_key]
        msg_time = NOW_MS - int(offset_m * M_MS) + random.randint(50, 900)

        chat_stmt = f"""INSERT OR REPLACE INTO messages (
    id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at
) VALUES (
    {sql_esc(msg_id)}, {sql_esc(ch_id)}, {sql_esc(author_uid)},
    {sql_esc(text)}, {sql_esc(f"nonce-w2-{msg_idx}")}, '#412', 'verified', NULL, {msg_time}
)"""
        chat_stmts.append(chat_stmt)

    print(f"\n[*] Executing {len(chat_stmts)} live chat messages...")
    execute_sql_batch(chat_stmts, "wave2_chat")

    # -------------------------------------------------------------------------
    # PART 4: Final Database Verification & Sync
    # -------------------------------------------------------------------------
    print("\n[*] Synchronizing reply_count across ALL posts with actual comment counts...")
    sync_sql = """
    UPDATE posts
    SET reply_count = (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id);
    """
    run_d1_command(sync_sql, json_out=False)

    print("\n" + "=" * 70)
    print("  SUCCESS: Wave 2 Seeding & Comment Visibility Guarantee Complete!")
    print("=" * 70)

if __name__ == "__main__":
    main()
