#!/usr/bin/env python3
"""
scripts/seed_trending_gaming_community.py
Viral Gaming, Roblox Meta, Functional Videos, Threaded Comments & Live Chat Seed for UREfy
Target: Cloudflare D1 Database (aetheris-db)
"""

import json
import time
import os
import subprocess
import random

NOW = 1789797194950  # 2026-09-19 05:53:14 UTC

# ─────────────────────────────────────────────────────────────────────────────
# 1. SPECIALIZED GAMING & TECH PERSONAS (12 NEW PROFILES)
# ─────────────────────────────────────────────────────────────────────────────
NEW_PERSONAS = [
    {
        "user_id": "fp_kai_bloxfan",
        "display_name": "Kai // BloxMeta",
        "handle": "kai_bloxfan",
        "bio": "Competitive Roblox player, Blox Fruits trader, and Luau mechanics tester. 25M bounty, testing engine limits.",
        "avatar_url": "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80",
        "interests": ["roblox", "bloxfruits", "luau", "gaming-meta"],
        "location": "Toronto, CA",
        "created_at": NOW - 10 * 86400000
    },
    {
        "user_id": "fp_glitch_reaper",
        "display_name": "Axel Vance",
        "handle": "glitch_reaper",
        "bio": "Reverse-engineering game netcodes, physics engine quirks, and boundary breaks. If there's an invisible wall, I'll clip through it.",
        "avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80",
        "interests": ["speedrunning", "game-physics", "exploits", "glitches"],
        "location": "Seattle, WA",
        "created_at": NOW - 9 * 86400000
    },
    {
        "user_id": "fp_wooting_chad",
        "display_name": "Marcus Chen",
        "handle": "wooting_chad",
        "bio": "CS2 22k Premier rating. Custom Hall-effect keyboard builder, sub-tick netcode analyst, and competitive counter-strafe nerd.",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1612287232258-a5ec0906be70?w=1200&auto=format&fit=crop&q=80",
        "interests": ["cs2", "keyboards", "esports", "fps"],
        "location": "San Jose, CA",
        "created_at": NOW - 8 * 86400000
    },
    {
        "user_id": "fp_luna_dti",
        "display_name": "Luna 🎀",
        "handle": "luna_dti",
        "bio": "Top tier Dress to Impress runway stylist & Lana ARG lore investigator. The lore rabbit hole goes deeper than you think.",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80",
        "interests": ["dti", "fashion-gaming", "arg", "roblox"],
        "location": "London, UK",
        "created_at": NOW - 8 * 86400000
    },
    {
        "user_id": "fp_souls_vet",
        "display_name": "TarnishedDave",
        "handle": "souls_vet",
        "bio": "Level 1 no-hit runner. Elden Ring, Sekiro, Lies of P. Hitbox visualizer & poise breakpoint spreadsheets on my second monitor.",
        "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
        "interests": ["elden-ring", "souls", "no-hit", "frame-data"],
        "location": "Denver, CO",
        "created_at": NOW - 7 * 86400000
    },
    {
        "user_id": "fp_linux_gamer",
        "display_name": "Mira K.",
        "handle": "mira_linux",
        "bio": "Gaming on Arch Linux (btw). Proton GE, Wine tricks, Sober runner for Roblox, and optimizing Steam Deck OLED battery life.",
        "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80",
        "interests": ["linux-gaming", "proton", "steamdeck", "open-source"],
        "location": "Berlin, DE",
        "created_at": NOW - 7 * 86400000
    },
    {
        "user_id": "fp_emulation_vault",
        "display_name": "RetroArchivist",
        "handle": "retro_arch",
        "bio": "Digital game preservationist. Testing Vulkan shaders on handhelds (Steam Deck, Odin 2 Portal). Emulation is cultural preservation.",
        "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80",
        "interests": ["emulation", "retrogaming", "preservation", "handhelds"],
        "location": "Kyoto, JP",
        "created_at": NOW - 6 * 86400000
    },
    {
        "user_id": "fp_noclip_andy",
        "display_name": "Andy Novak",
        "handle": "noclip_andy",
        "bio": "Unreal Engine 5.5 tech artist & procedural physics experimenter. Obsessed with Euphoria ragdolls and procedural animation blending.",
        "avatar_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1200&auto=format&fit=crop&q=80",
        "interests": ["gamedev", "unrealengine", "ragdoll", "gta6"],
        "location": "Chicago, IL",
        "created_at": NOW - 6 * 86400000
    },
    {
        "user_id": "fp_zenith_fps",
        "display_name": "Zenith",
        "handle": "zenith_fps",
        "bio": "Competitive FPS grinder & security researcher. Looking into Ring-0 anti-cheat drivers vs user-space integrity checks.",
        "avatar_url": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=1200&auto=format&fit=crop&q=80",
        "interests": ["anticheat", "kernel", "valorant", "security"],
        "location": "Stockholm, SE",
        "created_at": NOW - 5 * 86400000
    },
    {
        "user_id": "fp_redstone_seth",
        "display_name": "Seth V.",
        "handle": "redstone_seth",
        "bio": "Technical Minecraft server engineer. Update suppression, 0-tick mechanics, and automated perimeter quarry setups.",
        "avatar_url": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80",
        "interests": ["minecraft", "redstone", "tech-mc", "glitches"],
        "location": "Amsterdam, NL",
        "created_at": NOW - 5 * 86400000
    },
    {
        "user_id": "fp_cyber_samurai",
        "display_name": "Kenji Sato",
        "handle": "kenji_sato",
        "bio": "GPU hardware enthusiast. Benchmarking Full Path Tracing, DLSS Ray Reconstruction, and Frame Gen quirks at 4K.",
        "avatar_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80",
        "interests": ["raytracing", "hardware", "cyberpunk", "benchmarks"],
        "location": "Tokyo, JP",
        "created_at": NOW - 4 * 86400000
    },
    {
        "user_id": "fp_pal_tamer",
        "display_name": "Chloe Brooks",
        "handle": "chloe_pals",
        "bio": "Monster taming gamer & tech IP law nerd. Analyzing gaming patent wars, creature mechanics, and survival sandbox economies.",
        "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
        "interests": ["palworld", "pokemon", "gaming-law", "sandbox"],
        "location": "Melbourne, AU",
        "created_at": NOW - 4 * 86400000
    }
]

ALL_USER_IDS = [
    p["user_id"] for p in NEW_PERSONAS
] + [
    "7f8a910c2b44", "8a31b402ef19", "5b2041e8d902", "14e92a8819bb", "6d88f12a04cb",
    "2d89b14c99a0", "4e198a00b215", "a0914e21fc88", "3c91a4e082aa", "9f4a120c8b31"
]

def escape_sql(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    return "'" + str(val).replace("'", "''") + "'"

# ─────────────────────────────────────────────────────────────────────────────
# 2. 14 VIRAL TRENDING POSTS WITH VIDEOS, IMAGES, COMMENTS & SPREAD TIMESTAMPS
# ─────────────────────────────────────────────────────────────────────────────
POSTS_DATA = [
    # Post 1 (~4 days ago)
    {
        "id": "p-roblox-physics-desync-corner-clip",
        "channel_id": "relays-general",
        "author_id": "fp_glitch_reaper",
        "author_role": "MEMBER",
        "title": "Why Roblox physics engine breaks at >144 FPS: The math behind Corner Clipping and Truss Fling glitches 📐🕹️",
        "content": """If you've played any competitive Roblox obby, speedrun, or battleground game on a high-refresh monitor, you've probably noticed that walls feel 'squishy' and truss ladders launch you into the stratosphere.

Here is the technical reason why this happens in the Luau physics pipeline:

### 1. Fixed-Step vs Variable Client Interpolation
Roblox's internal physics solver runs at a target **60 Hz** (or 240 Hz sub-stepped physics on newer servers). However, when unlocking client framerate using modern tools or native FPS unlockers (e.g. 240Hz/360Hz), the client-side character prediction runs out of sync with the replicated server state.

```lua
-- How client prediction desyncs during high-velocity collisions
local rootPart = character.HumanoidRootPart
local currentVelocity = rootPart.AssemblyLinearVelocity

-- On 240Hz, delta time is ~0.00416s instead of standard 0.0166s
-- The raycast hit-box test occasionally fails to detect edge boundaries
local predictedPos = rootPart.Position + (currentVelocity * dt)
```

### 2. Corner Clipping Explained
When your avatar hits a 90-degree corner at an angle while in first-person shift-lock, the collision solver checks bounding boxes sequentially on X and Z axes. At high velocities, the displacement per sub-frame exceeds the collision boundary thickness, causing the engine to resolve penetration by ejecting the player on the *other side* of the wall!

### 3. Truss Ladder Momentum Glitch
Trusses have custom vertical climbing friction. If you spam spacebar while turning your camera 180 degrees at the top rung, the upward linear velocity isn't cleared by the state machine before the physics engine applies normal ground reaction force. Result? Upward velocity multiplies by 4.5x.

Has anyone else noticed that certain games try to patch this server-side and just end up rubberbanding innocent players? What's your favorite speedrun glitch in Roblox?""",
        "flair": "GAMING & TECH",
        "merit_votes": 412,
        "reply_count": 6,
        "boost_count": 54,
        "created_at": NOW - (96 * 3600 * 1000) - (23 * 60 * 1000),
        "video": None,
        "images": ["https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80"],
        "tags": ["roblox", "physics", "gamedev", "exploits", "glitches", "luau", "speedrun"],
        "comments": [
            {
                "id": "c-rbx-phys-1",
                "parent_id": None,
                "author_id": "fp_kai_bloxfan",
                "content": "fr fr bro, this is literally why Blox Fruits PvP on 144hz feels so different than 60hz. you can literally dash through certain mansion walls if your ping spikes above 120ms lmao",
                "created_at_offset": 14 * 60 * 1000,
                "merit_votes": 38
            },
            {
                "id": "c-rbx-phys-2",
                "parent_id": "c-rbx-phys-1",
                "author_id": "fp_glitch_reaper",
                "content": "Exactly! The network lag compensation assumes your linear velocity is constant between packet updates. If you change direction on the exact frame of the tick packet, the server extrapolates your position inside the geometry.",
                "created_at_offset": 28 * 60 * 1000,
                "merit_votes": 25
            },
            {
                "id": "c-rbx-phys-3",
                "parent_id": None,
                "author_id": "8a31b402ef19",
                "content": "Wait is this why Tower of Hell speedrunners all play on uncapped fps?? I thought it was just for lower input latency",
                "created_at_offset": 45 * 60 * 1000,
                "merit_votes": 19
            },
            {
                "id": "c-rbx-phys-4",
                "parent_id": "c-rbx-phys-3",
                "author_id": "fp_glitch_reaper",
                "content": "Both! Lower input latency makes micro-adjustments easier, but high FPS also makes wall-hops much more consistent because the jump register window gets more physics polling frames.",
                "created_at_offset": 62 * 60 * 1000,
                "merit_votes": 29
            },
            {
                "id": "c-rbx-phys-5",
                "parent_id": None,
                "author_id": "fp_linux_gamer",
                "content": "The worst part is when lazy developers try to fix this by adding client-side anti-exploit scripts that fire on AssemblyLinearVelocity spikes. If you lag for half a second while falling, the anticheat instantly kicks you for 'teleportation' 💀",
                "created_at_offset": 120 * 60 * 1000,
                "merit_votes": 44
            }
        ]
    },

    # Post 2 (~3.2 days ago) - WITH YOUTUBE VIDEO
    {
        "id": "p-roblox-byfron-hyperion-linux-wine-drama",
        "channel_id": "pulse-global",
        "author_id": "fp_linux_gamer",
        "author_role": "MEMBER",
        "title": "Roblox Byfron (Hyperion) anti-cheat and why blocking Linux/Wine was a huge mistake 🐧🛡️",
        "content": """Let's have an honest discussion about Byfron (Hyperion) and the ongoing war between game security and Linux desktop users.

Roblox rolled out their 64-bit client with Hyperion anti-cheat. While their stated goal was stopping injection cheats, memory scanners, and script executors on Windows, they also explicitly severed Wine and Proton support.

For thousands of kids and developers on Steam Deck, ChimeraOS, and Linux workstations, Roblox suddenly went dark with a silent crash to desktop.

### What is Byfron doing under the hood?
1. **Ring-3 Obfuscation & Telemetry**: Unlike kernel drivers like Vanguard or EasyAntiCheat, Byfron operates in user-mode (Ring-3) with aggressive code virtualization, integrity checksumming, and memory page traps (`PAGE_GUARD` hooks).
2. **The Wine Problem**: Wine translates Windows NT system calls into POSIX Linux kernel calls. Because Wine doesn't emulate every obscure undocumented Windows NT kernel heuristic 1:1, Hyperion flags the translation layer as an unauthorized debugger or memory hook.
3. **The 'Sober' & 'Vinegar' Workarounds**: The open-source community created Sober (which runs the Android ARM64/x86_64 Roblox APK inside an isolated translation container). It worked brilliantly, but Roblox continuously tries to patch APK signatures.

### Why this hurts more than it helps:
Real malicious cheat developers don't use Linux desktop; 99.9% of script kiddies and exploit buyers are running Windows 11 with downgraded kernel drivers or DMA hardware. Banning Linux just alienates open-source contributors and Steam Deck players.

Check out the official Roblox trailer below to remember what the platform is supposed to be about—creativity and open access:""",
        "flair": "TECH DISCUSSION",
        "merit_votes": 530,
        "reply_count": 7,
        "boost_count": 68,
        "created_at": NOW - (76 * 3600 * 1000) - (41 * 60 * 1000),
        "video": {
            "src": "https://www.youtube.com/watch?v=LTnMKjXEnMY",
            "poster": "https://i.ytimg.com/vi/LTnMKjXEnMY/hqdefault.jpg"
        },
        "images": None,
        "tags": ["roblox", "byfron", "hyperion", "linux", "steamdeck", "anticheat", "wine"],
        "comments": [
            {
                "id": "c-byfron-1",
                "parent_id": None,
                "author_id": "fp_zenith_fps",
                "content": "Spot on analysis. As someone who analyzes anticheats, user-mode virtualization is fundamentally cat-and-mouse. Blocking Wine is just lazy threat-surface reduction because they don't want to maintain a Linux QA pipeline.",
                "created_at_offset": 18 * 60 * 1000,
                "merit_votes": 52
            },
            {
                "id": "c-byfron-2",
                "parent_id": "c-byfron-1",
                "author_id": "fp_linux_gamer",
                "content": "Thank you! And the irony is that Valve proved with Proton + EAC / BattlEye that you CAN support Wine without compromising security. Roblox just won't allocate the engineering hours.",
                "created_at_offset": 35 * 60 * 1000,
                "merit_votes": 37
            },
            {
                "id": "c-byfron-3",
                "parent_id": None,
                "author_id": "fp_kai_bloxfan",
                "content": "bruh my little brother's Steam Deck literally turned into a paperweight for a month until we installed Sober 😭 bro was having Blox Fruits withdrawal symptoms no cap",
                "created_at_offset": 50 * 60 * 1000,
                "merit_votes": 41
            },
            {
                "id": "c-byfron-4",
                "parent_id": None,
                "author_id": "7f8a910c2b44",
                "content": "Running proprietary code with invasive memory virtualization on your main OS is why decentralized platforms like UREfy are the future. Zero telemetry, zero invasive rootkits.",
                "created_at_offset": 80 * 60 * 1000,
                "merit_votes": 65
            }
        ]
    },

    # Post 3 (~2.6 days ago)
    {
        "id": "p-blox-fruits-update-trading-economy-meta",
        "channel_id": "pulse-global",
        "author_id": "fp_kai_bloxfan",
        "author_role": "MEMBER",
        "title": "The Blox Fruits Dragon rework delay and how the trading economy is completely cooked 🐉🍎",
        "content": """Alright, we need to talk about the state of the Blox Fruits economy right now because it's getting absurd.

People have been hoarding Physical Dragons and Gamepasses for months waiting for the mythical Dragon update rework. But because the developers keep pushing back the release date, the inflation in Third Sea trading hubs is out of control.

### The Current Market Breakdown:
- **Physical Dragon**: People are asking for 2 Kitsune + Leo + Dough just for ONE un-reworked Dragon. The speculative bubble is bigger than 2021 crypto lmao.
- **Kitsune Dominance**: Kitsune is still undisputed for Sea Beast hunting and speed farming, but the hitbox on the C move is so forgiving that PvP in Cafe is 90% spamming transformation.
- **Server Hop Exploits**: Players are running automated server hop scripts to hunt Mirage Island and collect blue gears for Race V4. If you join a public server, 4 out of 10 people are afk script-hopping the sea events.

### Recommended Strategy for Seasoned Players:
If you have extra Dragons, **trade them now** while hype is at peak bubble. Once the rework drops, the developers will almost certainly nerf the first-week damage numbers just like they did with Dough V2 and Mammoth.

What are you guys currently trading for? Are you rocking Portal, Buddha, or Kitsune for Bounty hunting?""",
        "flair": "GAMING & TECH",
        "merit_votes": 348,
        "reply_count": 6,
        "boost_count": 39,
        "created_at": NOW - (62 * 3600 * 1000) - (17 * 60 * 1000),
        "video": None,
        "images": [
            "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80"
        ],
        "tags": ["bloxfruits", "roblox", "trading", "economy", "dragon", "pvp", "meta"],
        "comments": [
            {
                "id": "c-bf-1",
                "parent_id": None,
                "author_id": "fp_glitch_reaper",
                "content": "Portal + Soul Guitar + Cursed Dual Katana is still the highest skill-ceiling combo in the game imo. The rift teleport cancel into CDK Z move is undodgeable if you time the stun frames right.",
                "created_at_offset": 22 * 60 * 1000,
                "merit_votes": 28
            },
            {
                "id": "c-bf-2",
                "parent_id": "c-bf-1",
                "author_id": "fp_kai_bloxfan",
                "content": "Portal users are either 30M bounty gods or complete bots who miss every V move, there is zero in between 😂",
                "created_at_offset": 39 * 60 * 1000,
                "merit_votes": 35
            },
            {
                "id": "c-bf-3",
                "parent_id": None,
                "author_id": "fp_luna_dti",
                "content": "not me reading this while all my robux went to Dress to Impress VIP instead of blox fruit perm fruits 😭 fashion > bounty hunting any day",
                "created_at_offset": 55 * 60 * 1000,
                "merit_votes": 31
            }
        ]
    },

    # Post 4 (~2.0 days ago)
    {
        "id": "p-dress-to-impress-lana-lore-arg-analysis",
        "channel_id": "relays-general",
        "author_id": "fp_luna_dti",
        "author_role": "MEMBER",
        "title": "Dress to Impress (DTI) has deeper horror ARG lore than 90% of modern AAA games 🎀🔍💅",
        "content": """Don't laugh until you've actually looked into what the DTI developers are doing behind the scenes. What looks like a casual runway fashion game on the surface is genuinely one of the most clever psychological horror ARGs on Roblox right now.

### The Lana Rabbit Hole:
1. **The Nail Salon Underground**: If you noclip or peek behind the salon mirrors, there are hidden diary entries, bloody footprints, and encrypted Morse code blinking from the ceiling lights.
2. **Lana vs The Doppelgänger (Lina)**: Lana (the salon technician) was replaced by an impostor named Lina in recent updates. Her dialogue lines subtly shifted from friendly fashion tips to disturbing warnings about 'the basement' and 'the forest'.
3. **The Fortress & The Hospital Sub-Game**: The developers literally created separate sub-games accessible only through coded portals in the dressing room. In the hospital sub-map, you find medical charts detailing clone experiments and brainwashing tests conducted on models!
4. **Custom Layering Glitches**: Top stylists aren't just wearing default outfits. By combining the strawberry dress with the ruffled corset and clipping the sheer gloves through the leather sleeves, you can create custom high-fashion runway silhouettes that look like real haute couture.

Who else has been following the Lana lore updates? Are you team Lana or team Lina? Also what's your go-to pattern combo for the 'Cyberpunk' runway theme?""",
        "flair": "COMMUNITY & CULTURE",
        "merit_votes": 490,
        "reply_count": 8,
        "boost_count": 62,
        "created_at": NOW - (49 * 3600 * 1000) - (52 * 60 * 1000),
        "video": None,
        "images": [
            "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80"
        ],
        "tags": ["dti", "dresstoimpress", "roblox", "arg", "gaming-lore", "horror", "fashion"],
        "comments": [
            {
                "id": "c-dti-1",
                "parent_id": None,
                "author_id": "14e92a8819bb",
                "content": "I legit thought DTI was just a funny casual game my sister played until I watched a 2-hour video essay on the Lana lore at 3 AM. The morse code in the nails area translated to 'SHE IS NOT WHO SHE SAYS SHE IS'. Genuinely unhinged in the best way 💀",
                "created_at_offset": 19 * 60 * 1000,
                "merit_votes": 46
            },
            {
                "id": "c-dti-2",
                "parent_id": "c-dti-1",
                "author_id": "fp_luna_dti",
                "content": "RIGHT?! And in the newest update there's a cage in the sewer with Lana's old apron. The fact that an outfit game has better worldbuilding than Skull & Bones is wild 😭",
                "created_at_offset": 34 * 60 * 1000,
                "merit_votes": 39
            },
            {
                "id": "c-dti-3",
                "parent_id": None,
                "author_id": "fp_glitch_reaper",
                "content": "The outfit layering glitch is actually so sick from an engine perspective. They don't have strict vertex occlusion checks, so mesh bones from two different dresses bind to the same avatar rig without clipping artifacts.",
                "created_at_offset": 58 * 60 * 1000,
                "merit_votes": 33
            }
        ]
    },

    # Post 5 (~37 hours ago) - WITH YOUTUBE VIDEO (GTA 6)
    {
        "id": "p-gta-6-euphoria-physics-water-simulation-analysis",
        "channel_id": "pulse-global",
        "author_id": "fp_noclip_andy",
        "author_role": "MEMBER",
        "title": "Grand Theft Auto VI: Deep breakdown of the Euphoria physics overhaul & procedural water simulation 🚗🌊",
        "content": """With all the discussions happening on Reddit and X about GTA VI, I wanted to do a technical breakdown of what Rockstar is actually achieving with RAGE 9 (Rockstar Advanced Game Engine) based on the official trailer and technical leaks.

### 1. The Euphoria Physics Evolution
GTA IV had the most reactive procedural ragdoll physics in gaming history, but GTA V heavily toned it down in favor of scripted animations. In GTA VI:
- **Muscle Tension & Self-Balancing**: Pedestrians don't just collapse into limp ragdolls. The procedural animation controller calculates center-of-mass, stumbling vectors, and arm-reach bracing against car hoods or walls before going airborne.
- **Weight Distribution**: In the beach scenes from the trailer, watch the sand deformation under different character body types. Footsteps displace volumetric sand particles with memory persistence.

### 2. Real-Time Volumetric Fluid Simulation
The waters of Leonida (Vice City) aren't just scrolling planar normal maps:
- Dynamic boat wakes interact with shallow sandbanks, causing localized foam generation and turbidity changes.
- Fluid buoyancy accurately calculates vehicle mass when driving through flooded wetlands and swamp terrain.

Watch the official Trailer 1 again below and observe the crowd density and physics interactions—it's running real-time on current-gen silicon:""",
        "flair": "TECH DISCUSSION",
        "merit_votes": 585,
        "reply_count": 9,
        "boost_count": 92,
        "created_at": NOW - (37 * 3600 * 1000) - (11 * 60 * 1000),
        "video": {
            "src": "https://www.youtube.com/watch?v=QdBZY2fkU-0",
            "poster": "https://i.ytimg.com/vi/QdBZY2fkU-0/hqdefault.jpg"
        },
        "images": None,
        "tags": ["gta6", "rockstar", "gamedev", "euphoria", "physics", "rage9", "graphics"],
        "comments": [
            {
                "id": "c-gta-1",
                "parent_id": None,
                "author_id": "fp_cyber_samurai",
                "content": "The global illumination in the bikini pool scene is fully hardware ray-traced ambient occlusion. Notice how the ambient bounce light from the pink towel tints the underside of the sunbed. This is gonna cook our consoles at 30fps lol",
                "created_at_offset": 15 * 60 * 1000,
                "merit_votes": 61
            },
            {
                "id": "c-gta-2",
                "parent_id": "c-gta-1",
                "author_id": "fp_noclip_andy",
                "content": "Spot on Kenji. Digital Foundry pointed out that Rockstar uses a proprietary hybrid SDF (Signed Distance Field) GI cache similar to Lumen, which gives them instant lighting bounces without killing frame pacing.",
                "created_at_offset": 32 * 60 * 1000,
                "merit_votes": 43
            },
            {
                "id": "c-gta-3",
                "parent_id": None,
                "author_id": "fp_wooting_chad",
                "content": "All I care about is vehicle handling physics. If they bring back the weighty suspension and tire grip from GTA 4 with modern drift mechanics, it will be the greatest driving game ever made.",
                "created_at_offset": 58 * 60 * 1000,
                "merit_votes": 35
            }
        ]
    },

    # Post 6 (~28.5 hours ago) - WITH YOUTUBE VIDEO (CS2)
    {
        "id": "p-cs2-snap-tap-socd-valve-ban-netcode",
        "channel_id": "pulse-global",
        "author_id": "fp_wooting_chad",
        "author_role": "MEMBER",
        "title": "CS2 banned Snap Tap & SOCD null-binds: Did Valve save competitive integrity or fight a losing hardware war? 🎯⌨️",
        "content": """Valve dropped a massive update banning **Snap Tap** (Razer) and **Snappy Tappy** (Wooting) along with in-game jump-throw and null-cancel aliases in Counter-Strike 2.

If the server detects hardware SOCD (Simultaneous Opposite Cardinal Direction) resolution, players get immediately kicked from official matchmaking matches.

### The Core Problem:
In classic Counter-Strike, perfect counter-strafing requires human mechanical discipline:
1. Release `A` key.
2. Tap `D` key to bring velocity to exactly `0.00` u/s.
3. Fire on the first frame of standstill accuracy.

With Snap Tap on Hall-Effect switches, pressing `D` automatically cancels the input of `A` with zero release delay, granting 100% automated frame-perfect stops every single time. It completely erased the mechanical gap between a 15,000 rating player and an ESL pro.

### Sub-Tick Netcode Complications:
CS2's sub-tick architecture timestamps inputs between server ticks. When combined with analog keyboards, players were achieving stopping frames that the interpolation engine struggled to render smoothly for opponents on 60Hz/120Hz displays.

Check out the official CS2 trailer below and let's debate: Was Valve right to kick players for hardware keyboard features, or should peripheral tech evolve naturally?""",
        "flair": "ESPORTS & FPS",
        "merit_votes": 472,
        "reply_count": 8,
        "boost_count": 58,
        "created_at": NOW - (28 * 3600 * 1000) - (34 * 60 * 1000),
        "video": {
            "src": "https://www.youtube.com/watch?v=c80dVYcL69E",
            "poster": "https://i.ytimg.com/vi/c80dVYcL69E/hqdefault.jpg"
        },
        "images": None,
        "tags": ["cs2", "counterstrike", "snaptap", "wooting", "razer", "esports", "hardware"],
        "comments": [
            {
                "id": "c-cs2-1",
                "parent_id": None,
                "author_id": "fp_zenith_fps",
                "content": "100% the right move by Valve. Hardware macroing that overrides human finger release latency has no place in a tactical shooter. Next thing you know mice manufacturers would automate recoil pull-down in firmware and claim it's 'just a hardware feature' lol",
                "created_at_offset": 16 * 60 * 1000,
                "merit_votes": 58
            },
            {
                "id": "c-cs2-2",
                "parent_id": "c-cs2-1",
                "author_id": "fp_wooting_chad",
                "content": "I agree with the ban on null-binds, but the implementation is sloppy. Some players on regular mechanical boards with sticky switches or rapid stutters have gotten kicked mid-round during overtime in Premier. The false-positive threshold needs tuning.",
                "created_at_offset": 31 * 60 * 1000,
                "merit_votes": 42
            },
            {
                "id": "c-cs2-3",
                "parent_id": None,
                "author_id": "fp_glitch_reaper",
                "content": "The irony is that sub-tick was supposed to eliminate tick-rate arguments, but now everyone misses 128-tick native servers even more than before 💀",
                "created_at_offset": 64 * 60 * 1000,
                "merit_votes": 49
            }
        ]
    },

    # Post 7 (~21 hours ago) - WITH YOUTUBE VIDEO (ELDEN RING)
    {
        "id": "p-elden-ring-sote-radahn-hitbox-poise-meta",
        "channel_id": "pulse-global",
        "author_id": "fp_souls_vet",
        "author_role": "MEMBER",
        "title": "Elden Ring Shadow of the Erdtree: Consort Radahn hitboxes, poise break frame data & the shield-poke meta ⚔️🛡️",
        "content": """Now that the dust has settled on *Shadow of the Erdtree*, let's break down the mathematical reason why Promised Consort Radahn forced 70% of players into the Fingerprint Stone Shield + Bleed Antspur Rapier build.

### 1. The Cross-Slash Frame Trap
Radahn's infamous 3-hit cross slash has an initial right swipe, left swipe, and cross-strike:
- Frame gap between Hit 1 and Hit 2: **~12 frames (at 60 FPS)**.
- Standard Medium Roll invulnerability frames: **13 frames**.
- Standard Recovery frames: **~14 frames**.

Unless you are positioned specifically on his right hip or have Light Roll with Crucible Feather Talisman, **it is physically impossible to dodge Hit 2 if you were forced to roll Hit 1 from neutral position**. You take clipped chip damage every single cycle.

### 2. The Fingerprint Greatshield Counter-Meta:
- Guard Boost: **86 (up to 90+ with Greatshield Talisman)**.
- Stamina cost per blocked hit drops to nearly negligible levels.
- By maintaining block while thrusting with a heavy spear or rapier, you bypass all light beam Holy chip damage from Phase 2 without ever touching your roll button.

Watch the official gameplay reveal trailer below to see Miyazaki's masterclass in combat pacing before you decide whether this boss was genius or overtuned:""",
        "flair": "GAMING & TECH",
        "merit_votes": 515,
        "reply_count": 7,
        "boost_count": 74,
        "created_at": NOW - (21 * 3600 * 1000) - (5 * 60 * 1000),
        "video": {
            "src": "https://www.youtube.com/watch?v=E3Huy2cdih0",
            "poster": "https://i.ytimg.com/vi/E3Huy2cdih0/hqdefault.jpg"
        },
        "images": None,
        "tags": ["eldenring", "shadowoftheerdtree", "fromsoftware", "souls", "radahn", "framedata", "gaming"],
        "comments": [
            {
                "id": "c-er-1",
                "parent_id": None,
                "author_id": "fp_glitch_reaper",
                "content": "I spent 6 hours trying to light roll him with dual colossal swords before finally caving in and crafting the Verdigris shield. Beat him on the 2nd attempt with shield poke. Zero dignity but the remembrance is mine 🗿",
                "created_at_offset": 20 * 60 * 1000,
                "merit_votes": 54
            },
            {
                "id": "c-er-2",
                "parent_id": "c-er-1",
                "author_id": "fp_souls_vet",
                "content": "No shame in using the tools the game gives you! The recent patch slightly widened the recovery on the cross-slash anyway, so FromSoftware quietly acknowledged the frame trap issue.",
                "created_at_offset": 38 * 60 * 1000,
                "merit_votes": 36
            },
            {
                "id": "c-er-3",
                "parent_id": None,
                "author_id": "fp_kai_bloxfan",
                "content": "bro the visual clutter in phase 2 was giving me flashbangs in dark room, the holy light pillars literally drop my fps from 60 to 45 😭",
                "created_at_offset": 70 * 60 * 1000,
                "merit_votes": 39
            }
        ]
    },

    # Post 8 (~15.5 hours ago)
    {
        "id": "p-black-myth-wukong-frame-pacing-cloud-step-exploits",
        "channel_id": "vault-guides",
        "author_id": "fp_souls_vet",
        "author_role": "MEMBER",
        "title": "Black Myth: Wukong frame pacing, Tiger Vanguard hitbox tricks & Cloud Step invulnerability abuse 🐒💨",
        "content": """Black Myth: Wukong took the gaming world by storm with over 2 million concurrent players on Steam. But behind the stunning Unreal Engine 5 visual fidelity lies several fascinating quirks in the combat engine and hitbox registration.

### 1. Cloud Step: The Ultimate Get-Out-of-Jail Card
Cloud Step leaves behind a decoy decoy clone while the Destined One enters invisible invulnerability:
- While in Cloud Step, the player has **0 collision volume** against bosses.
- You can literally sprint directly through a sweeping AoE wind attack (like Yellow Wind Sage's tornado storm) without triggering damage ticks.
- Uncharging a heavy Smash Stance attack out of Cloud Step guarantees a 100% critical stagger frame on almost every Chapter 2 and Chapter 3 boss.

### 2. The Tiger Vanguard Blood Arena Hitbox Glitch
In the Crouching Tiger Temple blood pool:
When Tiger Vanguard prepares his sword draw dash across the blood pool, jumping and initiating a Pillar Stance hold elevates your character bounding box above the horizontal cleave plane.
Even though the visual blade effect passes through your staff, the hit check is strictly 2D cylinder-based at ground height, resulting in zero damage!

### 3. Frame Generation on Unreal Engine 5.4
If you're playing on PC, ensure you cap your base framerate before enabling FSR or DLSS Frame Gen. UE5's input buffer samples your dodge input on real render ticks—if your base FPS drops below 45, frame gen adds noticeable input lag to your perfect dodge timing.

What build are you guys running? Spell Binder pure melee or Pluck of Many clone spam?""",
        "flair": "GUIDES & TECH",
        "merit_votes": 435,
        "reply_count": 6,
        "boost_count": 48,
        "created_at": NOW - (15 * 3600 * 1000) - (28 * 60 * 1000),
        "video": None,
        "images": [
            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80"
        ],
        "tags": ["blackmythwukong", "wukong", "actionrpg", "gamedev", "unrealengine5", "bossguide", "exploits"],
        "comments": [
            {
                "id": "c-bmw-1",
                "parent_id": None,
                "author_id": "fp_cyber_samurai",
                "content": "Pillar Stance cheese is so real. I thought I was gonna get stuck on Yellow Loong for days until I realized you can just sit on top of your staff and watch his sweep attacks whiff completely 😂",
                "created_at_offset": 25 * 60 * 1000,
                "merit_votes": 41
            },
            {
                "id": "c-bmw-2",
                "parent_id": "c-bmw-1",
                "author_id": "fp_souls_vet",
                "content": "Yellow Loong is such an incredible duel boss though! His attack rhythm actually rewards rhythmic light attack combos more than brute force.",
                "created_at_offset": 42 * 60 * 1000,
                "merit_votes": 30
            },
            {
                "id": "c-bmw-3",
                "parent_id": None,
                "author_id": "fp_linux_gamer",
                "content": "On Steam Deck with Proton Experimental, locking to 30fps with TSR at 75% resolution makes the whole game surprisingly playable on handheld. Game Science did great optimization work.",
                "created_at_offset": 68 * 60 * 1000,
                "merit_votes": 35
            }
        ]
    },

    # Post 9 (~10.3 hours ago)
    {
        "id": "p-palworld-nintendo-patent-lawsuit-breakdown",
        "channel_id": "pulse-global",
        "author_id": "fp_pal_tamer",
        "author_role": "MEMBER",
        "title": "The Nintendo vs Palworld (Pocketpair) patent lawsuit: Why the 'Creature Capture Sphere' claim is dangerous for all gaming ⚖️🎮",
        "content": """Nintendo and The Pokémon Company officially filed a patent infringement lawsuit against Pocketpair in Tokyo District Court.

Unlike what most people assumed on Twitter, this is **NOT a copyright lawsuit** about character designs resembling Pokémon. This is a **patent infringement lawsuit** regarding gameplay mechanics.

### What are the targeted patents?
Japanese patent law allows for divisional patent filings based on parent applications. Nintendo appears to be asserting patents filed around *Pokémon Legends: Arceus*:
1. **Aimed Sphere Throw Mechanic**: Aiming an aiming reticle in a 3D environment, throwing a spherical object at a field creature, and triggering a success/failure capture state calculation.
2. **Mount Transition**: Riding a creature seamlessly in an open field and switching between ground and flying movement states.

### Why this is a terrible precedent for the industry:
If companies can broadly patent fundamental interaction mechanics (aiming an item to capture an NPC, riding a mount, building structures):
- Should id Software have patented WASD movement or mouse look?
- Should Warner Bros have locked the Nemesis system away forever (which they did, and nobody could use it)?
- Should Bioware have patented dialogue wheels?

Video games innovate by iterating on each other's ideas. Palworld combined Ark: Survival Evolved crafting, Rust automation, and monster collecting into something fresh that sold 25 million copies. Trying to crush competitors via patent divisionals hurts players everywhere.

What are your thoughts? Is Nintendo protecting innovation, or stifling creative game design?""",
        "flair": "NEWS & DEBATE",
        "merit_votes": 540,
        "reply_count": 8,
        "boost_count": 76,
        "created_at": NOW - (10 * 3600 * 1000) - (19 * 60 * 1000),
        "video": None,
        "images": [
            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80"
        ],
        "tags": ["palworld", "nintendo", "pokemon", "gaminglaw", "patents", "pocketpair", "lawsuit"],
        "comments": [
            {
                "id": "c-pal-1",
                "parent_id": None,
                "author_id": "fp_emulation_vault",
                "content": "Patent law applied to game mechanics is genuinely toxic. Imagine if Namco still owned the patent on loading screen minigames. Nintendo doing this because their own recent Pokémon games run at 20fps on Switch is pure corporate insecurity.",
                "created_at_offset": 18 * 60 * 1000,
                "merit_votes": 72
            },
            {
                "id": "c-pal-2",
                "parent_id": "c-pal-1",
                "author_id": "fp_pal_tamer",
                "content": "Exactly! And Pocketpair is a relatively small indie studio compared to the Nintendo/Pokemon juggernaut. Legal defense fees in Tokyo court alone can bleed a mid-sized studio dry even if they have strong prior art defense.",
                "created_at_offset": 34 * 60 * 1000,
                "merit_votes": 48
            },
            {
                "id": "c-pal-3",
                "parent_id": None,
                "author_id": "fp_kai_bloxfan",
                "content": "Roblox devs are sweating right now because half the games on Roblox have capture balls and pet breeding systems lmao 💀",
                "created_at_offset": 52 * 60 * 1000,
                "merit_votes": 63
            }
        ]
    },

    # Post 10 (~6.7 hours ago)
    {
        "id": "p-valorant-vanguard-windows-11-24h2-bsod",
        "channel_id": "relays-dev",
        "author_id": "fp_zenith_fps",
        "author_role": "MEMBER",
        "title": "Valorant Vanguard vs Windows 11 24H2: Why Ring-0 anti-cheat drivers clash with Kernel Virtualization (VBS) 💻⚠️",
        "content": """If you recently updated to the Windows 11 24H2 release build and your PC started throwing `PAGE_FAULT_IN_NONPAGED_AREA` or `CRITICAL_STRUCTURE_CORRUPTION` Blue Screens when launching Valorant, here is the technical post-mortem.

### The Architectural Conflict:
Riot Vanguard runs as a boot-start kernel driver (`vgk.sys`) in **Ring-0**. It hooks into low-level kernel dispatch tables before third-party software can load.

In Windows 11 24H2, Microsoft turned on **Virtualization-Based Security (VBS)** and **Hypervisor-Protected Code Integrity (HVCI)** by default on all qualified CPUs.

```text
[Hardware Silicon]
       │
[Hyper-V Hypervisor (Ring -1)] ◄── Hardware Isolation
       ├── Virtual Trust Level 1 (VTL 1): Secure Kernel, Credential Guard
       └── Virtual Trust Level 0 (VTL 0): Standard NT Kernel (where vgk.sys lives)
```

### Why Vanguard Chokes:
When `vgk.sys` attempts to inspect or write-protect physical memory pages containing its own checksummed routines, HVCI in VTL 1 blocks the memory remapping because it detects arbitrary page attribute modification outside the hypervisor whitelist.

Result? Instant hypervisor crash (Bugcheck 0x139 or 0x50) to protect system memory integrity.

### The Broader Question:
Are ring-0 kernel rootkits truly the sustainable future of competitive anti-cheat? When a game crash can take down the host operating system, we have traded system stability and user autonomy for a temporary wall against cheaters who will just move to second-PC DMA (Direct Memory Access) cards anyway.""",
        "flair": "SECURITY & DEV",
        "merit_votes": 488,
        "reply_count": 6,
        "boost_count": 61,
        "created_at": NOW - (6 * 3600 * 1000) - (44 * 60 * 1000),
        "video": None,
        "images": [
            "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80"
        ],
        "tags": ["valorant", "vanguard", "anticheat", "windows11", "kernel", "security", "sysadmin"],
        "comments": [
            {
                "id": "c-vg-1",
                "parent_id": None,
                "author_id": "7f8a910c2b44",
                "content": "This is why I refuse to install games with kernel anti-cheats on my bare-metal machine. Giving a game publisher ring-0 execution rights is an unacceptable operational security risk.",
                "created_at_offset": 14 * 60 * 1000,
                "merit_votes": 67
            },
            {
                "id": "c-vg-2",
                "parent_id": "c-vg-1",
                "author_id": "fp_zenith_fps",
                "content": "And the crazy thing is that Vanguard boots with Windows on startup even when you aren't playing Valorant. Riot claims it's for pre-boot integrity, but no other game driver requires that.",
                "created_at_offset": 29 * 60 * 1000,
                "merit_votes": 45
            },
            {
                "id": "c-vg-3",
                "parent_id": None,
                "author_id": "fp_wooting_chad",
                "content": "Had this exact BSOD yesterday during a ranked match. Disabling Memory Integrity in Core Isolation fixed the crash, but now my Windows security center has a big yellow warning triangle 😭",
                "created_at_offset": 51 * 60 * 1000,
                "merit_votes": 28
            }
        ]
    },

    # Post 11 (~4.2 hours ago)
    {
        "id": "p-ryujinx-shutdown-handheld-emulation-future",
        "channel_id": "pulse-global",
        "author_id": "fp_emulation_vault",
        "author_role": "MEMBER",
        "title": "The Ryujinx shutdown and the resilient future of self-hosted handheld emulation 🕹️💾",
        "content": """Following the Yuzu settlement earlier this year, the sudden takedown of the Ryujinx GitHub repository and project assets sent shockwaves across the emulation and preservation community.

### Emulation is Legal, But Legal Intimidation is Real
In landmark court rulings (Sony v. Bleem!, Sony v. Connectix), reverse-engineered software emulation without proprietary copyrighted BIOS or keys was repeatedly affirmed as completely legal fair use.

However, corporate legal threats don't need to win in court to be effective. Individual open-source maintainers working on passion projects cannot fund $500,000 legal defenses against multinational legal teams.

### The Shift to Decentralized Self-Hosting:
What we are seeing now in the emulation scene is a fundamental architectural evolution:
1. **Git Bundles on Tor & IPFS**: Source code trees are being mirrored automatically across distributed hash tables and decentralized storage networks.
2. **Local Compiled Builds on Steam Deck & ROG Ally**: Gamers are learning how to build their own binaries using local LLVM toolchains rather than relying on centralized download portals.
3. **Hardware Independence**: The Steam Deck OLED and modern handhelds have proven that PC gaming hardware is the ultimate long-term preservation platform. Once your console's digital store is turned off, your physical device remains completely functional.

Game preservation is cultural preservation. What handheld are you currently emulating on, and what's in your essential offline library?""",
        "flair": "OPEN SOURCE & PRESERVATION",
        "merit_votes": 510,
        "reply_count": 6,
        "boost_count": 71,
        "created_at": NOW - (4 * 3600 * 1000) - (12 * 60 * 1000),
        "video": None,
        "images": [
            "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80"
        ],
        "tags": ["emulation", "ryujinx", "steamdeck", "gaming", "preservation", "opensource", "vulkan"],
        "comments": [
            {
                "id": "c-ryu-1",
                "parent_id": None,
                "author_id": "fp_linux_gamer",
                "content": "This is why decentralized tools like UREfy resonate so much with the open-source community. When centralized platforms (GitHub, Discord servers) can vanish with one corporate email, decentralized networks are our only hedge.",
                "created_at_offset": 16 * 60 * 1000,
                "merit_votes": 62
            },
            {
                "id": "c-ryu-2",
                "parent_id": "c-ryu-1",
                "author_id": "fp_emulation_vault",
                "content": "Precisely Mira. You can remove a repository URL, but you can't delete source code that's distributed across thousands of sovereign developer SSDs.",
                "created_at_offset": 31 * 60 * 1000,
                "merit_votes": 49
            },
            {
                "id": "c-ryu-3",
                "parent_id": None,
                "author_id": "88b4012ce9fa",
                "content": "Steam Deck OLED with 1TB SSD + 1.5TB MicroSD card is literally the greatest retro station mankind has ever assembled. Battery lasts 7 hours playing PS2 / Gamecube at 2x resolution.",
                "created_at_offset": 58 * 60 * 1000,
                "merit_votes": 44
            }
        ]
    },

    # Post 12 (~2.6 hours ago) - WITH YOUTUBE VIDEO (CYBERPUNK)
    {
        "id": "p-cyberpunk-path-tracing-why-cdpr-abandoned-redengine",
        "channel_id": "relays-general",
        "author_id": "fp_cyber_samurai",
        "author_role": "MEMBER",
        "title": "Cyberpunk 2077 Full Path Tracing: Why CDPR abandoned REDengine for Unreal Engine 5 🌃⚡",
        "content": """Playing Cyberpunk 2077 in Overdrive Mode with Full Path Tracing at 4K DLSS 3.7 is arguably the graphical pinnacle of this console generation.

Every single ray of light—specular reflections, diffuse bounces, caustics, and subsurface skin scattering—is calculated without rasterized hacks or screen-space approximations.

### So why did CD Projekt Red publicly drop REDengine for the Cyberpunk sequel and Witcher 4?
1. **Engine Maintenance Overhead**: At its peak, CDPR had over 120 senior engine programmers exclusively fixing proprietary render bugs, streaming pipelines, and physics glitches in REDengine instead of developing game content.
2. **The City Streaming Bottleneck**: In REDengine, driving at 150 mph down City Center caused high-speed asset streaming stalls because the memory heap couldn't deallocate old chunk LODs fast enough.
3. **Unreal Engine 5 Nanite & Lumen Maturity**: With UE 5.4+, Epic Games absorbs the multi-million dollar engineering cost of supporting cutting-edge shader execution reordering (SER), neural rendering, and multi-threaded CPU task graphs.

Check out the classic cinematic trailer below to appreciate the visual design that started this revolution:""",
        "flair": "GRAPHICS & HARDWARE",
        "merit_votes": 465,
        "reply_count": 6,
        "boost_count": 52,
        "created_at": NOW - (2 * 3600 * 1000) - (38 * 60 * 1000),
        "video": {
            "src": "https://www.youtube.com/watch?v=qIcTM8WXFjk",
            "poster": "https://i.ytimg.com/vi/qIcTM8WXFjk/hqdefault.jpg"
        },
        "images": None,
        "tags": ["cyberpunk2077", "pathtracing", "unrealengine5", "redengine", "nvidia", "rtx", "gamedev"],
        "comments": [
            {
                "id": "c-cp-1",
                "parent_id": None,
                "author_id": "fp_noclip_andy",
                "content": "From a technical artist perspective, REDengine was brilliant for cutscenes and lighting, but building custom level tools for 300 developers when everyone in the industry already knows Unreal Engine made hiring senior devs a nightmare for CDPR.",
                "created_at_offset": 12 * 60 * 1000,
                "merit_votes": 43
            },
            {
                "id": "c-cp-2",
                "parent_id": "c-cp-1",
                "author_id": "fp_cyber_samurai",
                "content": "Exactly Andy. When your new hires spend 6 months just learning proprietary internal engine quirks instead of writing game features, it kills development velocity.",
                "created_at_offset": 24 * 60 * 1000,
                "merit_votes": 31
            },
            {
                "id": "c-cp-3",
                "parent_id": None,
                "author_id": "fp_wooting_chad",
                "content": "Path tracing looks insane but even on my RTX 4080 I need DLSS Performance + Frame Gen to hit 80fps. Can't wait to see what the RTX 5090 does with native ray reconstruction.",
                "created_at_offset": 45 * 60 * 1000,
                "merit_votes": 38
            }
        ]
    },

    # Post 13 (~1.25 hours ago) - WITH YOUTUBE VIDEO (MINECRAFT)
    {
        "id": "p-minecraft-rail-duplication-update-suppression-glitch",
        "channel_id": "pulse-global",
        "author_id": "fp_redstone_seth",
        "author_role": "MEMBER",
        "title": "Technical Minecraft: The Rail Duplication glitch that Mojang can't patch without breaking redstone ⛏️🚂",
        "content": """Did you know that the famous slime block / sticky piston powered rail duplication glitch in Minecraft Java Edition has survived over **10 years of major updates**?

Every time Mojang attempts to fix it, the technical redstone community proves that patching it breaks fundamental game mechanics.

### How Rail Duplication Works:
1. Powered rails have a distinct state update when moving between powered and unpowered block states.
2. A sticky piston pushes a slime block with an attached rail across a chunk boundary within **1 redstone tick (2 game ticks = 0.1s)**.
3. The block displacement occurs before the tile entity update triggers the item drop validation check.
4. The engine spawns an item entity drop while simultaneously retaining the moved block in the target grid!

### Why Mojang Kept It:
In survival servers like SciCraft and Hermitcraft, automated perimeter diggers require tens of thousands of powered rails and TNT blocks to dig massive void perimeters.

Until Mojang provides an official survival mechanic for automated quarrying or renewable sand/gravel, breaking these quirks would alienate the most dedicated server admins.

Check out the original Minecraft trailer below to see how far the game has evolved from simple dirt huts to full 8-bit computers and automated industrial factories:""",
        "flair": "GAMING & TECH",
        "merit_votes": 380,
        "reply_count": 5,
        "boost_count": 42,
        "created_at": NOW - (1 * 3600 * 1000) - (15 * 60 * 1000),
        "video": {
            "src": "https://www.youtube.com/watch?v=MmB9b5njVbA",
            "poster": "https://i.ytimg.com/vi/MmB9b5njVbA/hqdefault.jpg"
        },
        "images": None,
        "tags": ["minecraft", "redstone", "glitches", "technicalmc", "scicraft", "gamedev", "sandbox"],
        "comments": [
            {
                "id": "c-mc-1",
                "parent_id": None,
                "author_id": "fp_glitch_reaper",
                "content": "Update suppression was even crazier before 1.19. You could literally force Java stack overflow errors to freeze block state changes and build portal slices in mid-air. Technical Minecraft players are basically low-level compiler engineers in disguise lol",
                "created_at_offset": 10 * 60 * 1000,
                "merit_votes": 37
            },
            {
                "id": "c-mc-2",
                "parent_id": "c-mc-1",
                "author_id": "fp_redstone_seth",
                "content": "Haha absolutely! Building an update suppressor with 256 trapdoors and listening for packet exceptions is basically debugging race conditions in a sandbox world.",
                "created_at_offset": 22 * 60 * 1000,
                "merit_votes": 29
            }
        ]
    },

    # Post 14 (~38 minutes ago)
    {
        "id": "p-deepwoken-type-soul-animation-cancel-tech",
        "channel_id": "pulse-global",
        "author_id": "fp_glitch_reaper",
        "author_role": "MEMBER",
        "title": "Deepwoken & Type Soul: Frame data breakdown of roll cancelling, feints and hit-stun exploits 🥋⚡",
        "content": """For anyone playing competitive Roblox combat RPGs like *Deepwoken* or *Type Soul*, you already know that the difference between an average player and an elo demon isn't your build stats—it's **animation cancelling and hit-stun queuing**.

### 1. Roll-Cancel Feint Tech
In Deepwoken, pressing `M2` (feint) during the startup windup of a heavy weapon swing buffers a cancellation frame:
- If you immediately input `Q` (roll) within a **3-frame window**, the weapon swing hitbox sound effect still triggers on the opponent's client.
- The opponent instinctively presses `F` (parry).
- Because their parry window has 18 frames of recovery if they whiff, your roll immediately puts you behind their back for an unblockable critical strike!

### 2. Type Soul Flash Step Desync
In Type Soul, chaining Flash Step into aerial shift-lock alters your avatar's vertical hurtbox before the server replicates the descent animation.
If you input your Shikai ability on the exact landing frame, the client skips the 4-frame grounding stun, allowing for true infinite block strings.

### 3. Server Tickrate Discrepancies
Most Roblox game servers run at dynamic tickrates between 45 and 60 Hz depending on player count. When fighting in a 30-player guild war, hit-stun register latency fluctuates by up to 40ms. If you aren't adapting your combo delays to the server's current ping graph, your true combos will drop every time.

What combat system do you prefer: Deepwoken's deliberate posture management or Type Soul's high-speed anime pressure?""",
        "flair": "GAMING & TECH",
        "merit_votes": 325,
        "reply_count": 4,
        "boost_count": 34,
        "created_at": NOW - (38 * 60 * 1000),
        "video": None,
        "images": [
            "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80"
        ],
        "tags": ["deepwoken", "typesoul", "roblox", "pvp", "framedata", "animationcancel", "gaming"],
        "comments": [
            {
                "id": "c-dw-1",
                "parent_id": None,
                "author_id": "fp_kai_bloxfan",
                "content": "Deepwoken parry sounds give me pure dopamine ngl. When you parry a 5-hit curved blade combo and hear the *CLANG CLANG CLANG* it's so satisfying",
                "created_at_offset": 8 * 60 * 1000,
                "merit_votes": 25
            },
            {
                "id": "c-dw-2",
                "parent_id": "c-dw-1",
                "author_id": "fp_souls_vet",
                "content": "Deepwoken's posture system is literally Sekiro running on a Luau engine. The fact that high-schoolers coded a combat system with tighter parry windows than many $70 AAA games is wildly impressive.",
                "created_at_offset": 18 * 60 * 1000,
                "merit_votes": 34
            }
        ]
    }
]

# ─────────────────────────────────────────────────────────────────────────────
# 3. LIVE CHAT / RELAY MESSAGES (45 REALISTIC ENGLISH MESSAGES IN 5 CLUSTERS)
# ─────────────────────────────────────────────────────────────────────────────
CHAT_CLUSTERS = [
    # Cluster 1: 34 hours ago (CS2 Snap tap debate)
    {
        "channel_id": "relays-general",
        "base_time": NOW - (34 * 3600 * 1000),
        "messages": [
            ("fp_wooting_chad", "yo anyone else see the cs2 update notes today?? valve actually banned snap tap 💀"),
            ("fp_zenith_fps", "bruh about time ngl. people were literally letting keyboard firmware do all the counter strafe work"),
            ("fp_wooting_chad", "nah bro my 60HE was feeling so clean tho 😭 now i gotta relearn finger release timing like a peasant"),
            ("8a31b402ef19", "lmao skill issue marcus, back to aim_botz for you"),
            ("fp_wooting_chad", "1v1 me on dust2 right now dan i will still tap your head off no cap 😤"),
            ("fp_glitch_reaper", "did they patch the jump-throw bind alias too or just null binds?"),
            ("fp_wooting_chad", "both! if you have multiple actions bound to one key press the server kicks you instantly"),
            ("fp_zenith_fps", "good riddance. competitive integrity > hardware gimmicks")
        ]
    },
    # Cluster 2: 24 hours ago (Roblox on Linux & Sober)
    {
        "channel_id": "relays-dev",
        "base_time": NOW - (24 * 3600 * 1000),
        "messages": [
            ("fp_linux_gamer", "has anyone tested the new sober release for roblox on debian?"),
            ("7f8a910c2b44", "running it on arch here with flatpak, working smoothly. 144fps stable on wayland"),
            ("fp_linux_gamer", "nice! byfron didn't flag the arm translation layer?"),
            ("7f8a910c2b44", "not yet. because it's running the android apk build, hyperion isn't active inside that container"),
            ("fp_glitch_reaper", "the cat and mouse game between roblox and linux devs is honestly legendary"),
            ("fp_kai_bloxfan", "fr fr just let people play the game on whatever os they want, why roblox hating on penguins lol 🐧"),
            ("fp_linux_gamer", "literally! steam deck is the most popular handheld on earth and they act like supporting it is a crime"),
            ("4e198a00b215", "valve should just acquire roblox and proton-enable it on day one haha")
        ]
    },
    # Cluster 3: 16 hours ago (DTI Lore & Roblox Trading)
    {
        "channel_id": "relays-general",
        "base_time": NOW - (16 * 3600 * 1000),
        "messages": [
            ("fp_luna_dti", "guys did you see the new dress to impress update?? the lana lore is getting so creepy"),
            ("14e92a8819bb", "wait what happened now?? i haven't logged on since yesterday"),
            ("fp_luna_dti", "there's a bloody diary in the VIP dressing room and the diary owner says lana was replaced by a clone named lina 😭"),
            ("fp_kai_bloxfan", "bro why does a fashion game have more lore than call of duty lmao"),
            ("fp_luna_dti", "BECAUSE ITS ART KAI 💅 you wouldn't understand"),
            ("fp_kai_bloxfan", "anyway anyone wanna trade for kitsune fruit? i need perm portal ASAP"),
            ("8a31b402ef19", "nobody is giving you perm portal for kitsune bro, dragon rework hype is too high"),
            ("fp_kai_bloxfan", "dragon rework is never coming out, we gonna have GTA 7 before dragon drops fr fr 💀"),
            ("fp_luna_dti", "lmao so true")
        ]
    },
    # Cluster 4: 7 hours ago (Wukong & Elden Ring on Steam Deck)
    {
        "channel_id": "relays-general",
        "base_time": NOW - (7 * 3600 * 1000),
        "messages": [
            ("fp_emulation_vault", "steam deck oled battery life while playing black myth wukong is surprisingly decent"),
            ("fp_souls_vet", "what settings you running? mine was getting pretty toasty in the chapter 2 desert"),
            ("fp_emulation_vault", "locked 30fps at 11W TDP limit. TSR at 70% with low shadows. runs super quiet"),
            ("fp_souls_vet", "did you beat tiger vanguard yet? that sword dash was giving me consort radahn ptsd"),
            ("fp_glitch_reaper", "just use pillar stance bro! climb the stick and watch him whiff"),
            ("fp_souls_vet", "nah no pillar cheese for me, pure smash stance deflect timing or bust 🗿"),
            ("fp_emulation_vault", "souls vets refusing to use game mechanics to preserve their honor as always haha"),
            ("fp_souls_vet", "it's not honor it's a mental illness but we wear it proudly 😂")
        ]
    },
    # Cluster 5: 1.5 hours ago (UREfy platform, E2EE, Vault security)
    {
        "channel_id": "relays-general",
        "base_time": NOW - (90 * 60 * 1000),
        "messages": [
            ("2d89b14c99a0", "yo this new site speed on urefy is insanely fast now, zero flicker when switching tabs"),
            ("7f8a910c2b44", "yeah the team completely removed the redundant re-renders and cleaned up the dom layers"),
            ("fp_zenith_fps", "is the messaging here actually end-to-end encrypted or is it just https?"),
            ("7f8a910c2b44", "actual client-side MLS TreeKEM ratchets with Kyber post-quantum hybrid encapsulation. server only relays ciphertext blobs"),
            ("fp_zenith_fps", "damn ok that's actually legit. no phone number required either?"),
            ("7f8a910c2b44", "zero phone numbers, zero emails. your identity is an ed25519 public key pair stored in your browser local vault"),
            ("fp_linux_gamer", "make sure you write down your 12-word seed phrase though! if you clear your browser cache without it your account is gone forever"),
            ("fp_wooting_chad", "backed mine up in my password manager immediately 🫡"),
            ("fp_luna_dti", "the UI looks so clean in dark mode too ✨"),
            ("genesis-core", "Welcome to sovereign social networking everyone. You own your data here.")
        ]
    }
]

# ─────────────────────────────────────────────────────────────────────────────
# 4. SQL GENERATOR
# ─────────────────────────────────────────────────────────────────────────────
def generate_sql():
    statements = []

    # 1. Insert New Personas into user_profiles
    print(f"Generating {len(NEW_PERSONAS)} new user profiles...")
    for p in NEW_PERSONAS:
        stmt = f"""INSERT OR REPLACE INTO user_profiles (
            user_id, display_name, handle, bio, avatar_url, banner_url, pinned_post_id, interests_json, website, location, created_at, updated_at
        ) VALUES (
            {escape_sql(p['user_id'])},
            {escape_sql(p['display_name'])},
            {escape_sql(p['handle'])},
            {escape_sql(p['bio'])},
            {escape_sql(p['avatar_url'])},
            {escape_sql(p['banner_url'])},
            NULL,
            {escape_sql(json.dumps(p['interests']))},
            NULL,
            {escape_sql(p['location'])},
            {p['created_at']},
            {NOW}
        );"""
        statements.append(stmt)

    # 2. Insert Posts, Post Tags, Comments & Interactions
    print(f"Generating {len(POSTS_DATA)} viral posts with comments & reactions...")
    for p in POSTS_DATA:
        video_json = escape_sql(json.dumps(p['video'])) if p['video'] else "NULL"
        images_json = escape_sql(json.dumps(p['images'])) if p['images'] else "NULL"

        stmt = f"""INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            {escape_sql(p['id'])},
            {escape_sql(p['channel_id'])},
            {escape_sql(p['author_id'])},
            {escape_sql(p['author_role'])},
            {escape_sql(p['title'])},
            {escape_sql(p['content'])},
            {escape_sql(p['flair'])},
            {p['merit_votes']},
            0,
            {len(p['comments'])},
            {p['boost_count']},
            NULL,
            {video_json},
            {images_json},
            NULL,
            NULL,
            'published',
            {p['created_at']},
            0
        );"""
        statements.append(stmt)

        # Tags
        for tag in p.get("tags", []):
            clean_tag = tag.strip().lstrip("#").lower()
            tag_stmt = f"INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ({escape_sql(p['id'])}, {escape_sql(clean_tag)}, {p['created_at']});"
            statements.append(tag_stmt)

        # Post Reactions & Votes (20-35 reactions from diverse personas)
        reactors = random.sample(ALL_USER_IDS, k=min(len(ALL_USER_IDS), random.randint(18, 25)))
        for idx, reactor_id in enumerate(reactors):
            if reactor_id == p['author_id']:
                continue
            r_emoji = random.choice(['🔥', '💀', '🚀', '😭', '🎮', '🧠', '⚡', '❤️', '💡', '👍'])
            r_time = p['created_at'] + (idx + 1) * 75000
            int_id = f"int-p-{p['id'][:15]}-{reactor_id[:6]}-{idx}"
            statements.append(f"""INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                {escape_sql(int_id)}, 'post', {escape_sql(p['id'])}, {escape_sql(reactor_id)}, 'reaction', {escape_sql(r_emoji)}, {r_time}
            );""")
            # Merit Vote
            v_id = f"v-p-{p['id'][:15]}-{reactor_id[:6]}"
            statements.append(f"""INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                {escape_sql(v_id)}, 'post', {escape_sql(p['id'])}, {escape_sql(reactor_id)}, 1, {r_time}
            );""")

        # Threaded Comments
        for c in p.get("comments", []):
            c_time = p['created_at'] + c['created_at_offset']
            parent_val = escape_sql(c['parent_id']) if c['parent_id'] else "NULL"
            c_stmt = f"""INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                {escape_sql(c['id'])},
                {escape_sql(p['id'])},
                {parent_val},
                {escape_sql(c['author_id'])},
                'MEMBER',
                {escape_sql(c['content'])},
                {c['merit_votes']},
                {c_time}
            );"""
            statements.append(c_stmt)

            # Comment Reactions (3-6 per comment)
            c_reactors = random.sample(ALL_USER_IDS, k=min(len(ALL_USER_IDS), random.randint(3, 6)))
            for idx, c_reactor_id in enumerate(c_reactors):
                if c_reactor_id == c['author_id']:
                    continue
                c_emoji = random.choice(['🔥', '💀', '❤️', '👍', '🧠', '😭', '🚀'])
                c_r_time = c_time + (idx + 1) * 45000
                c_int_id = f"int-c-{c['id']}-{c_reactor_id[:6]}-{idx}"
                statements.append(f"""INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    {escape_sql(c_int_id)}, 'comment', {escape_sql(c['id'])}, {escape_sql(c_reactor_id)}, 'reaction', {escape_sql(c_emoji)}, {c_r_time}
                );""")

    # 3. Live Chat / Relay Feed Messages (in messages table)
    print(f"Generating live chat messages across {len(CHAT_CLUSTERS)} conversation clusters...")
    msg_idx = 100
    for cluster in CHAT_CLUSTERS:
        channel_id = cluster["channel_id"]
        base_time = cluster["base_time"]
        for offset_minutes, (author, text) in enumerate(cluster["messages"]):
            msg_idx += 1
            msg_id = f"msg-live-{msg_idx}"
            msg_time = base_time + (offset_minutes * 90 * 1000) + random.randint(5000, 35000)
            stmt = f"""INSERT OR REPLACE INTO messages (
                id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at
            ) VALUES (
                {escape_sql(msg_id)},
                {escape_sql(channel_id)},
                {escape_sql(author)},
                {escape_sql(text)},
                NULL,
                '#1',
                'verified',
                NULL,
                {msg_time}
            );"""
            statements.append(stmt)

    return statements

# ─────────────────────────────────────────────────────────────────────────────
# 5. BATCH EXECUTION VIA WRANGLER D1
# ─────────────────────────────────────────────────────────────────────────────
def execute_in_batches(statements):
    batch_size = 40
    total_stmts = len(statements)
    total_batches = (total_stmts + batch_size - 1) // batch_size
    print(f"\n=======================================================")
    print(f"TOTAL SQL STATEMENTS TO EXECUTE: {total_stmts}")
    print(f"TOTAL BATCHES: {total_batches} (Batch size: {batch_size})")
    print(f"=======================================================\n", flush=True)

    tmp_file = "scripts/_tmp_gaming_seed.sql"
    success_count = 0

    for i in range(0, total_stmts, batch_size):
        batch = statements[i:i+batch_size]
        batch_num = i // batch_size + 1
        print(f"[{batch_num}/{total_batches}] Executing {len(batch)} statements...", flush=True)

        batch_content = "\n".join(batch) + "\n"
        with open(tmp_file, "w", encoding="utf-8") as bf:
            bf.write(batch_content)

        cmd = [
            "npx.cmd" if os.name == "nt" else "npx",
            "wrangler",
            "d1",
            "execute",
            "aetheris-db",
            "--remote",
            f"--file={tmp_file}",
            "-y"
        ]

        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"ERROR on batch {batch_num}:", flush=True)
            print(res.stderr or res.stdout, flush=True)
            time.sleep(2.0)
            # Retry once
            res2 = subprocess.run(cmd, capture_output=True, text=True)
            if res2.returncode != 0:
                print(f"FATAL: Batch {batch_num} retry failed. Aborting.", flush=True)
                return False

        success_count += len(batch)
        time.sleep(0.25)

    if os.path.exists(tmp_file):
        os.remove(tmp_file)

    print(f"\nSUCCESS! All {success_count} statements committed to remote Cloudflare D1 aetheris-db!", flush=True)
    return True

if __name__ == "__main__":
    stmts = generate_sql()
    output_sql = "scripts/seed_trending_gaming_community.sql"
    with open(output_sql, "w", encoding="utf-8") as f:
        f.write("\n".join(stmts) + "\n")
    print(f"Written complete SQL seed to {output_sql}")
    success = execute_in_batches(stmts)
    if not success:
        exit(1)
