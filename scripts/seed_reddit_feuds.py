#!/usr/bin/env python3
"""
scripts/seed_reddit_feuds.py
Generates 8 viral, trending Reddit-style posts with heated comment feuds,
sensational leaks/rumors ("fake news"), debates, and realistic interactions.
Everything in English.
Cloudflare D1: aetheris-db
"""

import json
import time
import os
import subprocess
import random

BASE_TIME = int(time.time() * 1000) - 1000 * 60 * 60 * 12 # 12 hours ago on Sept 18, 2026

FEUD_POSTS = [
    {
        "id": "post-feud-nvidia-leak",
        "channel_id": "c/technology",
        "author_id": "6d88f12a04cb",
        "author_role": "SECURITY_AUDITOR",
        "flair": "🚨 LEAK / RUMOR",
        "title": "LEAK: Nvidia Driver 572.10 allegedly scans local directories for unauthorized AI model weights to report unlicensed commercial inference",
        "content": """A whistleblower from an enterprise AI infrastructure partner has leaked what appears to be internal documentation regarding **Nvidia Driver version 572.10 (Linux x86_64)**.

According to the leaked symbols and strings, a new background daemon dubbed `nvtelemetry_ai.so` hooks into the CUDA runtime during model initialization. If the active context allocates more than 8GB of VRAM and performs tensor matrix multiplications matching common transformer architectures (Llama, DeepSeek, Qwen), the driver allegedly hashes the first 256MB of weight layers and queries an internal telemetry endpoint (`telemetry.nvidia.com:443`).

The apparent goal? Detect whether enterprise users are running open-weights models in commercial clusters without an active Nvidia AI Enterprise licensing tier.

### What is allegedly happening:
1. **CUDA hook intercept**: Monitors `cudaMalloc` and pattern-matches transformer weight matrices.
2. **Weight Fingerprinting**: Generates a SHA-256 digest of layer headers.
3. **Telemetry Beacon**: Pings Nvidia endpoints even if `GEFORCE_EXPERIENCE=0` and telemetry flags are disabled in `/etc/nvidia/gridd.conf`.

If verified, this represents an unprecedented overreach into user compute workloads. Is this the end of running local AI on consumer GeForce hardware?""",
        "merit_votes": 612,
        "boost_count": 184,
        "reply_count": 6,
        "created_at": BASE_TIME + 1000 * 60 * 15,
        "tags": ["nvidia", "fakenews", "leak", "privacy", "cuda", "localllm", "opensource"],
        "comments": [
            {
                "id": "c-nv-1",
                "parent_id": None,
                "author_id": "7f8a910c2b44",
                "author_role": "ARCHIVIST",
                "content": "Average proprietary binary blob experience. Why is anyone in 2026 still giving Jensen Huang money? I migrated my entire inference rig to AMD RX 7900 XTX running ROCm on Arch Linux. Open-source kernel drivers, zero telemetry, zero licensing checks. You get what you tolerate.",
                "merit_votes": 142,
                "created_at": BASE_TIME + 1000 * 60 * 25
            },
            {
                "id": "c-nv-2",
                "parent_id": "c-nv-1",
                "author_id": "3c91a4e082aa",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "This is complete and utter fake news. I ran Ghidra and IDA Pro on libnvidia-ml.so.572.10 from the beta branch for 5 hours today. The symbol 'nvtelemetry_ai' literally DOES NOT EXIST. OP is reposting an unverified pastebin from 4chan /g/ to farm karma. Can mods delete this unverified FUD already?",
                "merit_votes": 89,
                "created_at": BASE_TIME + 1000 * 60 * 35
            },
            {
                "id": "c-nv-3",
                "parent_id": "c-nv-2",
                "author_id": "4e198a00b215",
                "author_role": "SECURITY_AUDITOR",
                "content": "@void_pointer Did you even inspect runtime dynamic linking with dlopen? It doesn't ship as an exported static symbol, you genius. It gets downloaded in memory via an encrypted payload if the driver connects to GeForce Experience servers. Stop defending a trillion-dollar monopoly before doing actual packet analysis.",
                "merit_votes": 67,
                "created_at": BASE_TIME + 1000 * 60 * 45
            },
            {
                "id": "c-nv-4",
                "parent_id": "c-nv-3",
                "author_id": "3c91a4e082aa",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "@DockerNinja Oh so now it's a dynamic encrypted payload that mysteriously leaves no trace on disk? The goalposts are moving at supersonic speed. I have a dedicated hardware TAP running tcpdump on port 443 with TLS interception. Zero outbound connections during model loading. Don't call me a shill because your tin-foil hat fell off.",
                "merit_votes": 115,
                "created_at": BASE_TIME + 1000 * 60 * 55
            },
            {
                "id": "c-nv-5",
                "parent_id": None,
                "author_id": "83d2019fab66",
                "author_role": "AI_RESEARCHER",
                "content": "Real or fake, I just blocked *.nvidia.com in my network Pi-hole. Remember when people laughed at the idea that HP printers would brick cartridges over Wi-Fi? Or when Intel Management Engine was called a conspiracy before MINIX was proven on ring -3? If a corporation CAN extract rent from you, they WILL.",
                "merit_votes": 98,
                "created_at": BASE_TIME + 1000 * 60 * 70
            },
            {
                "id": "c-nv-6",
                "parent_id": "c-nv-5",
                "author_id": "9f4a120c8b31",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "Blocking domain names doesn't prevent hardcoded IP connections if they use DoH or raw TCP sockets. The real solution is kernel-level network namespaces (`unshare -n`) for inference containers. If the CUDA process has no virtual net device, it cannot phone home period.",
                "merit_votes": 76,
                "created_at": BASE_TIME + 1000 * 60 * 85
            }
        ]
    },
    {
        "id": "post-feud-windows-local-account",
        "channel_id": "c/digitalfreedom",
        "author_id": "9f4a120c8b31",
        "author_role": "CORE_CONTRIBUTOR",
        "flair": "🔥 CONTROVERSY",
        "title": "Windows 12 build 28014 reportedly mandates government ID upload or biometric iris scan to enable offline local accounts",
        "content": """The latest leak from the Windows Insider Canary channel (Build 28014.1000) has ignited a firestorm across the tech community.

According to leaked Group Policy documentation and registry hives (`HKLM\\SYSTEM\\CurrentControlSet\\Control\\Sovereignty\\LocalAccountPolicy`), Microsoft is deprecating the `OOBE\\BYPASSNRO` command and standard local account creation. In its place, the installer reportedly presents two options:

1. **Sign in with Microsoft Entra / Microsoft Cloud ID** (Default).
2. **Sovereign Local Account (Requires Hardware Real-ID Attestation)**: The user must submit a government-issued photo ID via Windows Hello camera or perform an iris scan verified against Microsoft's cloud identity verification service under the pretext of 'complying with upcoming international digital safety directives'.

The policy notes claim this is to 'prevent bot farm deployments and ensure child safety in AI-generated content workflows'.

If this goes live in the consumer release, it will be the single most aggressive anti-user lockdown in the history of desktop operating systems. Is this finally the death knell for Windows?""",
        "merit_votes": 845,
        "boost_count": 290,
        "reply_count": 6,
        "created_at": BASE_TIME + 1000 * 60 * 90,
        "tags": ["windows12", "fakenews", "privacy", "microsoft", "rumor", "linux", "surveillance"],
        "comments": [
            {
                "id": "c-win-1",
                "parent_id": None,
                "author_id": "8a31b402ef19",
                "author_role": "VERIFIED_NODE",
                "content": "Please tell me this is satire. I just dropped $2,800 on a high-end gaming PC with Windows 11. If Microsoft actually pushes this garbage in Windows 12, I am wiping my NVMe drive and installing Bazzite Linux immediately. I'd rather lose 10% FPS in Fortnite than upload my passport to Microsoft.",
                "merit_votes": 178,
                "created_at": BASE_TIME + 1000 * 60 * 105
            },
            {
                "id": "c-win-2",
                "parent_id": "c-win-1",
                "author_id": "7f8a910c2b44",
                "author_role": "ARCHIVIST",
                "content": "@DanGaming You guys never learn! We told you in 2021 when TPM 2.0 became mandatory. You said 'who cares, games run fine'. We told you in 2024 when Recall started screenshotting your screen every 3 seconds. You said 'I can just toggle it off'. Now they want your national ID. The boiling frog analogy has never been more accurate.",
                "merit_votes": 210,
                "created_at": BASE_TIME + 1000 * 60 * 115
            },
            {
                "id": "c-win-3",
                "parent_id": "c-win-1",
                "author_id": "62df09a14c33",
                "author_role": "VERIFIED_NODE",
                "content": "Can everyone stop panicking over clickbait? The 'leak' originated from a parody account on X that reposted a satirical mock-up. The actual Canary 28014 changelog mentions hardware-backed credentials for high-security DoD enterprise workstations, NOT regular home users. Stop falling for outrage farming.",
                "merit_votes": 64,
                "created_at": BASE_TIME + 1000 * 60 * 125
            },
            {
                "id": "c-win-4",
                "parent_id": "c-win-3",
                "author_id": "8a31b402ef19",
                "author_role": "VERIFIED_NODE",
                "content": "@FiberWizard 'Enterprise only' is how it literally always starts. BitLocker was enterprise-only. Online account requirement was 'Windows 11 Home only', then 6 months later they shoved it down Pro users' throats. Defending Microsoft in 2026 is stockholm syndrome.",
                "merit_votes": 133,
                "created_at": BASE_TIME + 1000 * 60 * 135
            },
            {
                "id": "c-win-5",
                "parent_id": None,
                "author_id": "a410ef89b231",
                "author_role": "SOVEREIGN_FOUNDER",
                "content": "Year of the Linux Desktop isn't happening because the Linux Foundation ran good marketing. It's happening because Satya Nadella is systematically driving every sane human being away from Windows.",
                "merit_votes": 245,
                "created_at": BASE_TIME + 1000 * 60 * 145
            },
            {
                "id": "c-win-6",
                "parent_id": "c-win-5",
                "author_id": "5fc4018fab23",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "I would switch to Linux in a heartbeat if Anti-Cheat didn't treat Wine like a criminal hack. Vanguard and Ricochet literally demand Ring 0 kernel access. Until game publishers stop treating PC players like suspects, 90% of gamers are stuck on Windows whether we hate it or not.",
                "merit_votes": 88,
                "created_at": BASE_TIME + 1000 * 60 * 160
            }
        ]
    },
    {
        "id": "post-feud-linus-rust-rant",
        "channel_id": "c/opensource",
        "author_id": "a410ef89b231",
        "author_role": "SOVEREIGN_FOUNDER",
        "flair": "⚔️ DRAMA",
        "title": "Linus Torvalds rejects kernel patch with explosive mailing list rant: 'Rust zealots are poisoning the kernel with bloated abstractions — compile times tripled and for what?'",
        "content": """The Linux Kernel Mailing List (LKML) exploded this morning after Linus Torvalds delivered an unvarnished rebuke to the maintainers of the Rust-for-Linux subsystem.

The dispute erupted over a 4,000-line patch attempting to replace the legacy C implementation of the virtual memory allocator hooks with an experimental Rust trait hierarchy.

In his response, Torvalds did not hold back:
> *'I am sick and tired of reviewing patches that replace 50 lines of clean, transparent C with 800 lines of arcane macro voodoo, nested generics, and unsafe blocks that pretend to be safe until someone sneezes on the borrow checker. My local kernel compilation time on an AMD Threadripper has ballooned by 140%. And the worst part? The C code has run without a memory corruption bug in 14 years.*
>
> *If your religion requires 10 layers of zero-cost abstractions that cost 15 seconds per compilation unit, go write a web browser. The kernel is not your sandbox.'*

Pro-Rust contributors are already calling this an emotional reaction from an entrenched C generation, while veteran maintainers are celebrating. Has the Rust experiment in the Linux kernel officially hit a brick wall?""",
        "merit_votes": 952,
        "boost_count": 312,
        "reply_count": 6,
        "created_at": BASE_TIME + 1000 * 60 * 180,
        "tags": ["linux", "rust", "kernel", "drama", "linustorvalds", "cprogramming", "opensource"],
        "comments": [
            {
                "id": "c-rust-1",
                "parent_id": None,
                "author_id": "3c91a4e082aa",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "Absolute king behavior from Linus. I've been saying this for 3 years: Rust advocates promised us zero bugs and high productivity. What we actually got was 10-minute compile times, incompatible LLVM toolchain upgrades every 6 weeks, and drivers that panic on out-of-memory because unwinding in ring 0 is a nightmare. C wins again.",
                "merit_votes": 267,
                "created_at": BASE_TIME + 1000 * 60 * 195
            },
            {
                "id": "c-rust-2",
                "parent_id": "c-rust-1",
                "author_id": "1bf08912ea56",
                "author_role": "SECURITY_AUDITOR",
                "content": "@void_pointer 'C wins again'? Are you delusional? Over 68% of all remote code execution CVEs in the Linux kernel over the past decade were memory safety bugs — use-after-free, buffer overflows, double frees. Linus complaining about compile times while userland servers get pwned by state actors exploiting 1980s C pointer arithmetic is ridiculous.",
                "merit_votes": 145,
                "created_at": BASE_TIME + 1000 * 60 * 205
            },
            {
                "id": "c-rust-3",
                "parent_id": "c-rust-2",
                "author_id": "7f8a910c2b44",
                "author_role": "ARCHIVIST",
                "content": "@RustaceanGod If you write proper modern C with static analyzers, AddressSanitizer, and strict compiler warnings, memory bugs are virtually non-existent. The problem isn't C; the problem is lazy developers who don't understand cache coherency and pointer lifetimes. Stop blaming the language for your skill issue.",
                "merit_votes": 189,
                "created_at": BASE_TIME + 1000 * 60 * 215
            },
            {
                "id": "c-rust-4",
                "parent_id": "c-rust-3",
                "author_id": "1bf08912ea56",
                "author_role": "SECURITY_AUDITOR",
                "content": "@ArchChad 'Just write bug-free C, it is a skill issue'. That has got to be the most intellectually bankrupt argument in software engineering history. Microsoft, Google, NSA, and Apple have the best engineers on Earth with limitless budgets, and ALL of them concluded human brains cannot manually manage pointers at scale. Keep coping.",
                "merit_votes": 172,
                "created_at": BASE_TIME + 1000 * 60 * 225
            },
            {
                "id": "c-rust-5",
                "parent_id": None,
                "author_id": "4e198a00b215",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "Meanwhile Zig is sitting in the corner with clean manual memory control, zero hidden control flow, compile times that are 10x faster than Rust, and seamless C interop without requiring a 4GB LLVM dependency chain. If the kernel moves away from C, Zig makes 100x more sense than Rust.",
                "merit_votes": 85,
                "created_at": BASE_TIME + 1000 * 60 * 240
            },
            {
                "id": "c-rust-6",
                "parent_id": "c-rust-5",
                "author_id": "3c91a4e082aa",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "@DockerNinja Zig doesn't even have a stable 1.0 specification yet and breaks syntax every minor release. Suggesting we rewrite the foundation of modern internet infrastructure in an alpha language is peak Reddit engineering.",
                "merit_votes": 128,
                "created_at": BASE_TIME + 1000 * 60 * 255
            }
        ]
    },
    {
        "id": "post-feud-openai-2000-tier",
        "channel_id": "c/privacy-ai",
        "author_id": "83d2019fab66",
        "author_role": "AI_RESEARCHER",
        "flair": "🤖 AI WARS",
        "title": "OpenAI reportedly testing $2,000/month 'Titan Reasoning' subscription while slashing Plus users down to 12 messages every 3 hours",
        "content": """A financial leak from a Silicon Valley venture fund with early access to upcoming OpenAI enterprise offerings has revealed a dramatic pricing restructuring codenamed 'Project Orchard'.

Faced with an astronomical compute burn rate exceeding $8.5 billion annually, OpenAI is reportedly preparing to segment the market into extreme tiers:

- **Titan Reasoning Tier ($2,000/month)**: Uncapped access to autonomous multi-agent reasoning models with 500k token output horizons, dedicated H200 cluster allocations, and zero token latency throttling.
- **Plus Tier ($20/month)**: Drastic downgrade. Rate limits reportedly dropped from 40 messages/3 hours down to just **12 messages every 3 hours** during peak business hours, with inference routed through quantized lightweight models.
- **Free Tier**: Ad-supported, multi-turn context capped at 4,000 tokens.

When asked for comment, internal sources claim: 'High-compute reasoning loops cost $3.50 per query in raw server electricity. A $20 subscription was burning $300 in compute per heavy user. The math simply does not work anymore.'

Is the era of affordable, cutting-edge consumer AI officially dead?""",
        "merit_votes": 789,
        "boost_count": 215,
        "reply_count": 6,
        "created_at": BASE_TIME + 1000 * 60 * 270,
        "tags": ["openai", "chatgpt", "localllm", "fakenews", "pricing", "ai", "deepseek"],
        "comments": [
            {
                "id": "c-ai-1",
                "parent_id": None,
                "author_id": "c0a184e912fd",
                "author_role": "VERIFIED_NODE",
                "content": "$2,000 a month for a chatbot that still hallucinates npm packages and invents nonexistent legal citations with supreme confidence. Who in their right mind is paying this? Only VC-funded startups burning other people's money.",
                "merit_votes": 215,
                "created_at": BASE_TIME + 1000 * 60 * 285
            },
            {
                "id": "c-ai-2",
                "parent_id": "c-ai-1",
                "author_id": "7b33a901ff42",
                "author_role": "SECURITY_AUDITOR",
                "content": "This leak smells like blatant ragebait and fake news. Altman literally gave an interview two weeks ago explaining that algorithmic breakthroughs in mixture-of-agents have reduced training and inference costs by 80%. Why would they drop Plus to 12 messages? It would trigger mass cancellations overnight.",
                "merit_votes": 72,
                "created_at": BASE_TIME + 1000 * 60 * 295
            },
            {
                "id": "c-ai-3",
                "parent_id": "c-ai-2",
                "author_id": "83d2019fab66",
                "author_role": "AI_RESEARCHER",
                "content": "@BioHackerX Because consumer subscriptions don't make profit! Sam Altman says whatever pumps equity valuation before the next funding tranche. If you look at the raw compute cost of generating 30,000 internal thinking tokens per response, it is mathematically impossible to sustain on a $20/mo gym-membership model.",
                "merit_votes": 164,
                "created_at": BASE_TIME + 1000 * 60 * 305
            },
            {
                "id": "c-ai-4",
                "parent_id": None,
                "author_id": "91c24fa0e891",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "Imagine paying a monthly subscription for AI in 2026. I bought a Mac Studio M4 Max with 128GB Unified Memory 6 months ago. I run Qwen 2.5 Coder 32B and DeepSeek R1 locally on Ollama at 42 tokens/second. Zero rate limits, zero privacy leaks, zero subscription fees. The hardware paid for itself in 4 months.",
                "merit_votes": 198,
                "created_at": BASE_TIME + 1000 * 60 * 315
            },
            {
                "id": "c-ai-5",
                "parent_id": "c-ai-4",
                "author_id": "8a31b402ef19",
                "author_role": "VERIFIED_NODE",
                "content": "@PiHoarder 'Hardware paid for itself'? Bro, an M4 Max Studio with 128GB RAM costs $4,200 out the door! Most people don't have $4,000 lying around to run open-weight models that still score 15% lower on SWE-bench than Claude 3.5 Sonnet. The techbro bubble is insane.",
                "merit_votes": 154,
                "created_at": BASE_TIME + 1000 * 60 * 325
            },
            {
                "id": "c-ai-6",
                "parent_id": "c-ai-5",
                "author_id": "91c24fa0e891",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "@DanGaming If you write code for a living, $4,000 is a tax-deductible tool that saves 20 hours a week and protects your intellectual property from training OpenAI's next model. If you just use it to generate anime memes, of course you can't justify the cost.",
                "merit_votes": 112,
                "created_at": BASE_TIME + 1000 * 60 * 340
            }
        ]
    },
    {
        "id": "post-feud-valve-cs2-patent",
        "channel_id": "c/gaming",
        "author_id": "8a31b402ef19",
        "author_role": "VERIFIED_NODE",
        "flair": "🎮 GAMING SCANDAL",
        "title": "Valve patent reveals 'Adaptive Hitbox Inflation' system that secretly widens headshots for losing players who recently bought weapon cases",
        "content": """A bombshell patent assigned to Valve Corporation (US Patent Application 2026/0189441) titled *'Dynamic Latency Compensation and Session Engagement Modeling in Networked Environments'* has sent shockwaves through the competitive esports scene.

According to Claim 14 of the patent:
> *'In one embodiment, client-side hit registration parameters, including projectile collision boundaries (hitboxes), may be dynamically modulated within a bounded tolerance (1% to 14%) based on player churn probability metrics, recent transactional micro-engagement events, and consecutive defeat telemetry to sustain aggregate session length.'*

Translating from legal jargon to plain English: If you're on a 5-game losing streak and you recently purchased keys or weapon cases from the Steam Community Market, the server allegedly gives you larger head hitboxes to make you feel like you're 'playing better' and keep you hooked.

Competitive Counter-Strike 2 players have suspected this for months: shots that clearly miss registering as crisp one-taps, while pinpoint crosshair alignments ghost right through player models.

Is competitive integrity dead in modern multiplayer gaming?""",
        "merit_votes": 1120,
        "boost_count": 420,
        "reply_count": 6,
        "created_at": BASE_TIME + 1000 * 60 * 360,
        "tags": ["valve", "cs2", "gaming", "patent", "esports", "counterstrike", "fakenews"],
        "comments": [
            {
                "id": "c-cs-1",
                "parent_id": None,
                "author_id": "14e92a8819bb",
                "author_role": "VERIFIED_NODE",
                "content": "I KNEW IT! I KNEW I WAS NOT CRAZY! The amount of times I downloaded demo files and analyzed them tick-by-tick at 0.1x speed seeing my crosshair dead center on an enemy's forehead while the game says 'Damage Given: 0 in 0 hits'. Meanwhile a silver with an anime profile picture and a $400 knife runs and sprays with an AK and gets a running headshot. Valve is scamming us!",
                "merit_votes": 289,
                "created_at": BASE_TIME + 1000 * 60 * 375
            },
            {
                "id": "c-cs-2",
                "parent_id": "c-cs-1",
                "author_id": "7f8a910c2b44",
                "author_role": "ARCHIVIST",
                "content": "@PixelWitch Or maybe you just have 65ms jitter and bad counter-strafing? Did anyone in this thread actually read the patent before melting down? Claim 14 is in the section titled 'Experimental VR Accessibility Modes for Cooperative Physics Puzzles'. It has literally NOTHING to do with Counter-Strike 2 or competitive matchmaking. Stop spreading fake news because you whiffed your spray.",
                "merit_votes": 194,
                "created_at": BASE_TIME + 1000 * 60 * 385
            },
            {
                "id": "c-cs-3",
                "parent_id": "c-cs-2",
                "author_id": "14e92a8819bb",
                "author_role": "VERIFIED_NODE",
                "content": "@ArchChad Ah yes, the Valve defense taskforce has arrived! How much store credit does Gabe Newell pay you to defend a company that abandoned CS:GO for an unoptimized subtick disaster full of spinbots? EA already has an active patent for EOMM (Engagement Optimized Matchmaking). Activision has patents matching players against skins. You think Valve is an angelic charity?",
                "merit_votes": 215,
                "created_at": BASE_TIME + 1000 * 60 * 395
            },
            {
                "id": "c-cs-4",
                "parent_id": None,
                "author_id": "3c91a4e082aa",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "As someone who reverse-engineers game netcode: subtick in CS2 is fundamentally flawed because the animation client interpolation runs on your monitor refresh rate while subtick timestamps actions between server ticks. It creates visual desync where what you see doesn't match the server state. It's bad engine engineering, not an Illuminati conspiracy to sell lootboxes.",
                "merit_votes": 230,
                "created_at": BASE_TIME + 1000 * 60 * 410
            },
            {
                "id": "c-cs-5",
                "parent_id": "c-cs-4",
                "author_id": "8a31b402ef19",
                "author_role": "VERIFIED_NODE",
                "content": "@void_pointer Bad engineering or greedy engineering, the result is the same: the game feels like garbage compared to 128-tick CS:GO on Faceit. And Valve refusing to let third-party platforms run 128-tick servers proved they only care about controlling the ecosystem.",
                "merit_votes": 167,
                "created_at": BASE_TIME + 1000 * 60 * 425
            },
            {
                "id": "c-cs-6",
                "parent_id": "c-cs-5",
                "author_id": "5b2041e8d902",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "This is why peer-to-peer open source competitive shooters like Xonotic and Warsow had superior netcode 15 years ago. The moment games became live-service casino storefronts, competitive integrity was sacrificed for shareholder retention charts.",
                "merit_votes": 95,
                "created_at": BASE_TIME + 1000 * 60 * 440
            }
        ]
    },
    {
        "id": "post-feud-meta-eye-tracking",
        "channel_id": "c/zeroknowledge",
        "author_id": "7b33a901ff42",
        "author_role": "SECURITY_AUDITOR",
        "flair": "👁️ SURVEILLANCE",
        "title": "WHISTLEBLOWER: Social media apps allegedly using front-facing cameras for 'Pupil Micro-Dilation' biometric ad pricing without user consent",
        "content": """A chilling internal memo allegedly originating from a joint ad-tech consortium (involving major short-form video algorithms) reveals a project titled **'NeuroGaze Pulse'**.

The document claims that when users grant standard camera permissions (for filters, avatar creation, or live streaming), the SDK continuously analyzes front camera frames in volatile memory. It does not record video to disk; instead, it runs an on-device lightweight convolutional net that estimates:

1. **Fixation Duration**: Millisecond gaze dwell time on specific UI elements (e.g. luxury items, fitness models, junk food).
2. **Pupil Dilation Ratio**: Micro-changes in pupil aperture indicating emotional arousal, surprise, or stress.
3. **Blink Rate Fatigue**: Detecting late-night vulnerability to trigger impulse e-commerce checkout ads.

The data is purportedly hashed into an anonymous 8-dimensional vector and bundled with auction bids submitted to real-time ad exchanges.

If authentic, this crosses the boundary from behavioural tracking into non-consensual biometric involuntary feedback manipulation.""",
        "merit_votes": 890,
        "boost_count": 340,
        "reply_count": 6,
        "created_at": BASE_TIME + 1000 * 60 * 460,
        "tags": ["privacy", "surveillance", "biometrics", "fakenews", "whistleblower", "grapheneos"],
        "comments": [
            {
                "id": "c-eye-1",
                "parent_id": None,
                "author_id": "62df09a14c33",
                "author_role": "VERIFIED_NODE",
                "content": "This is mathematically and technically impossible on modern mobile OSs. Both iOS and Android display a persistent green hardware indicator dot whenever the camera sensor draws current. Furthermore, iOS requires explicit permission prompts for TrueDepth depth-sensing. You can't just 'secretly read pupils' without the user seeing the camera light on 24/7. Total fake news.",
                "merit_votes": 120,
                "created_at": BASE_TIME + 1000 * 60 * 475
            },
            {
                "id": "c-eye-2",
                "parent_id": "c-eye-1",
                "author_id": "7b33a901ff42",
                "author_role": "SECURITY_AUDITOR",
                "content": "@FiberWizard You completely missed the point of the leak. It does NOT run in the background. It runs WHILE YOU ARE IN THE APP USING A CAMERA FILTER! Millions of teenagers spend 45 minutes a day with the selfie camera active trying on digital makeup, filters, or recording clips. While the green dot is already expected, the app runs secondary biometric telemetry on the camera buffer. That is the exploit.",
                "merit_votes": 240,
                "created_at": BASE_TIME + 1000 * 60 * 485
            },
            {
                "id": "c-eye-3",
                "parent_id": "c-eye-2",
                "author_id": "6d88f12a04cb",
                "author_role": "SECURITY_AUDITOR",
                "content": "Confirmed. I audited an ad-tech analytics SDK last November that requested `AVCaptureSessionPresetLow` on iOS. The frame processing pipeline literally had ML models running face landmark estimation at 30 FPS. Software permissions are broken by design because once access is granted, the app can do whatever it wants with the buffer in RAM.",
                "merit_votes": 185,
                "created_at": BASE_TIME + 1000 * 60 * 500
            },
            {
                "id": "c-eye-4",
                "parent_id": None,
                "author_id": "9f4a120c8b31",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "Remember when Edward Snowden put a piece of physical tape over his laptop camera and mainstream news called him a paranoid nutjob? 13 years later, people are defending multi-billion dollar surveillance corporations harvesting their pupil dilation while they doomscroll on the toilet.",
                "merit_votes": 310,
                "created_at": BASE_TIME + 1000 * 60 * 515
            },
            {
                "id": "c-eye-5",
                "parent_id": "c-eye-4",
                "author_id": "2d89b14c99a0",
                "author_role": "VERIFIED_NODE",
                "content": "Physical camera killswitches are the only real security. Purism Librem and PinePhone had physical hardware DIP switches on the motherboard for a reason. Modern glass sandwiches with sealed batteries and closed-source baseband firmware are digital tracking collars.",
                "merit_votes": 95,
                "created_at": BASE_TIME + 1000 * 60 * 530
            },
            {
                "id": "c-eye-6",
                "parent_id": "c-eye-5",
                "author_id": "c0a184e912fd",
                "author_role": "VERIFIED_NODE",
                "content": "Good luck convincing the general public to carry a 20mm thick Linux brick that has 3 hours of battery life and can't run banking apps. Privacy won't win by demanding people sacrifice 100% of modern convenience.",
                "merit_votes": 82,
                "created_at": BASE_TIME + 1000 * 60 * 545
            }
        ]
    },
    {
        "id": "post-feud-hardware-intel-vs-amd",
        "channel_id": "c/technology",
        "author_id": "91c24fa0e891",
        "author_role": "CORE_CONTRIBUTOR",
        "flair": "⚡ HARDWARE WARS",
        "title": "Core Ultra 200 vs Ryzen 9000 X3D: Intel draws 315W to get demolished by 26% in 1% lows. Can we stop the fanboy cope?",
        "content": """After extensive testing across 25 modern titles (Cyberpunk 2077, Black Myth Wukong, Factorio, Starfield, Flight Sim 2024), the independent benchmark numbers are unequivocal.

### 1080p Low & 1440p Competitive Benchmarks:
- **Ryzen 7 9800X3D**: Average 248 FPS | 1% Lows: 194 FPS | **Peak Package Power: 78W**
- **Core Ultra 9 285K**: Average 202 FPS | 1% Lows: 142 FPS | **Peak Package Power: 318W**

Intel removed hyperthreading, completely decoupled the compute tiles onto TSMC N3B, redesigned the ring bus, and yet somehow managed to lose over a quarter of their frame pacing to an AMD chip drawing less electricity than an incandescent lightbulb.

To make matters worse, motherboards require high-end VRMs and $250 custom 360mm AIO liquid coolers just to keep the chip under 95°C during sustained loads.

At what point does the community admit that Intel's desktop CPU division has lost the architectural plot?""",
        "merit_votes": 920,
        "boost_count": 280,
        "reply_count": 6,
        "created_at": BASE_TIME + 1000 * 60 * 560,
        "tags": ["hardware", "intel", "amd", "benchmarks", "gaming", "pcbuilding", "techdebate"],
        "comments": [
            {
                "id": "c-hw-1",
                "parent_id": None,
                "author_id": "8a31b402ef19",
                "author_role": "VERIFIED_NODE",
                "content": "You can literally heat a studio apartment in Berlin during winter with an Intel Core Ultra workstation. 318 watts to lose to a 78W chip is embarrassing beyond words. Pat Gelsinger bet the farm on tile disaggregation and got completely schooled by AMD's 3D V-Cache.",
                "merit_votes": 210,
                "created_at": BASE_TIME + 1000 * 60 * 575
            },
            {
                "id": "c-hw-2",
                "parent_id": "c-hw-1",
                "author_id": "4e198a00b215",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "Nice cherry-picked benchmarks. Now run Premiere Pro 4K timeline scrub, DaVinci Resolve color grading, 7-Zip decompression, and Docker build pipelines. Intel demolishes Ryzen because the E-core cluster obliterates AMD in sustained multi-threaded throughput. Not everyone uses their computer exclusively to play video games at 1080p low settings like a 14-year-old.",
                "merit_votes": 165,
                "created_at": BASE_TIME + 1000 * 60 * 585
            },
            {
                "id": "c-hw-3",
                "parent_id": "c-hw-2",
                "author_id": "91c24fa0e891",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "@DockerNinja 'Docker build pipelines'? I build production kernel images on a Ryzen 9 9950X daily. The 9950X finishes compilation 18% faster than the 285K while consuming 90W less power. The only reason anyone buys Intel in 2026 is brand nostalgia or enterprise purchasing contracts with Dell.",
                "merit_votes": 195,
                "created_at": BASE_TIME + 1000 * 60 * 595
            },
            {
                "id": "c-hw-4",
                "parent_id": "c-hw-3",
                "author_id": "4e198a00b215",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "@PiHoarder Brand nostalgia? At least Intel motherboards don't take 55 seconds to train DDR5 memory on every single cold boot! I built an AM5 system last month and thought the motherboard was dead because the debug LED stayed amber for a minute before posting. AMD platform stability is still a circus.",
                "merit_votes": 142,
                "created_at": BASE_TIME + 1000 * 60 * 610
            },
            {
                "id": "c-hw-5",
                "parent_id": "c-hw-4",
                "author_id": "3c91a4e082aa",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "Memory training on AM5 was fixed in AGESA 1.2.0.2 with Memory Context Restore enabled. If your system takes 55 seconds, update your BIOS instead of crying on Reddit.",
                "merit_votes": 180,
                "created_at": BASE_TIME + 1000 * 60 * 625
            },
            {
                "id": "c-hw-6",
                "parent_id": None,
                "author_id": "7f8a910c2b44",
                "author_role": "ARCHIVIST",
                "content": "Both companies are laughing all the way to the bank while charging $600 for a desktop CPU and $300 for a mid-tier motherboard. Meanwhile 90% of user workloads could run on an $80 used ThinkPad T480 running Debian.",
                "merit_votes": 275,
                "created_at": BASE_TIME + 1000 * 60 * 640
            }
        ]
    },
    {
        "id": "post-feud-rto-mandate-leak",
        "channel_id": "c/digitalfreedom",
        "author_id": "4e198a00b215",
        "author_role": "CORE_CONTRIBUTOR",
        "flair": "💼 RTO WARS",
        "title": "LEAKED AUDIO: Big Tech VP admits 5-day in-office mandate is 'Strictly a stealth layoff tool to avoid paying severance packages'",
        "content": """An explosive leaked audio recording from an executive sync at a Fortune 50 cloud giant has confirmed what remote workers have maintained for the past three years.

In the recording, an Executive Vice President of Human Capital tells senior directors:
> *'Look, our board mandated an 8% headcount reduction by Q4, but a formal WARN notice in California and Washington creates catastrophic PR, tanks stock momentum, and costs $42,000 per engineer in statutory severance and health continuation.*
>
> *By enforcing strict badge-swiping 5 days a week and calibrating anyone badge-deficient into the bottom 10% performance band, we expect 25% of our senior remote staff to voluntarily resign within 90 days. We get the headcount reduction for zero severance expense, and we rehire in Bangalore at 1/5th the labor rate. It's clean.'*

This is the smoking gun: Return To Office mandates have never been about 'collaboration', 'serendipity', or 'mentorship'. They are calculated financial engineering maneuvers designed to exploit housing locks and commute fatigue to slash payroll without triggering legal layoff protections.

How are engineers responding?""",
        "merit_votes": 1280,
        "boost_count": 510,
        "reply_count": 6,
        "created_at": BASE_TIME + 1000 * 60 * 660,
        "tags": ["remotework", "rto", "techcareers", "leaked", "fakenews", "overemployed", "quietfiring"],
        "comments": [
            {
                "id": "c-rto-1",
                "parent_id": None,
                "author_id": "7f8a910c2b44",
                "author_role": "ARCHIVIST",
                "content": "Finally, the quiet part said out loud with a megaphone. Everyone with more than two functioning neurons knew RTO was a constructive dismissal scheme. Overhire like drunken sailors during the zero-interest rate bubble, then treat loyal senior engineers like kindergarteners who need badge-tracking surveillance.",
                "merit_votes": 340,
                "created_at": BASE_TIME + 1000 * 60 * 675
            },
            {
                "id": "c-rto-2",
                "parent_id": "c-rto-1",
                "author_id": "1bf08912ea56",
                "author_role": "SECURITY_AUDITOR",
                "content": "Unpopular opinion: A huge portion of 'remote' senior engineers were literally working 2 or 3 simultaneous full-time jobs on separate laptops while junior developers couldn't get a single PR reviewed for three days. You abused remote work flexibility to enrich yourselves, and now honest developers are paying the price.",
                "merit_votes": 115,
                "created_at": BASE_TIME + 1000 * 60 * 685
            },
            {
                "id": "c-rto-3",
                "parent_id": "c-rto-2",
                "author_id": "4e198a00b215",
                "author_role": "CORE_CONTRIBUTOR",
                "content": "@RustaceanGod If a developer finishes all their sprint commitments, delivers production-ready code with unit tests, and responds within 15 minutes on Slack, who cares what they do with the rest of their day? Software engineering is about VALUE DELIVERED, not warming an ergonomic Herman Miller chair for 8 hours. Found the bootlicker.",
                "merit_votes": 290,
                "created_at": BASE_TIME + 1000 * 60 * 695
            },
            {
                "id": "c-rto-4",
                "parent_id": "c-rto-3",
                "author_id": "1bf08912ea56",
                "author_role": "SECURITY_AUDITOR",
                "content": "@DockerNinja Calling me a bootlicker because I expect colleagues to uphold their employment contract and actually mentor junior staff? Typical narcissistic overemployed mentality. Go ahead, quit. See how many fully-remote $300k roles exist in this market. There are 600 applicants for every remote job posting right now.",
                "merit_votes": 138,
                "created_at": BASE_TIME + 1000 * 60 * 710
            },
            {
                "id": "c-rto-5",
                "parent_id": None,
                "author_id": "a410ef89b231",
                "author_role": "SOVEREIGN_FOUNDER",
                "content": "The greatest irony of in-office mandates is that once you drive 1.5 hours through gridlock traffic, find an open desk in a noisy open-plan floor, and put on noise-canceling headphones, all your meetings are STILL ON ZOOM because your team is distributed across 4 time zones.",
                "merit_votes": 410,
                "created_at": BASE_TIME + 1000 * 60 * 725
            },
            {
                "id": "c-rto-6",
                "parent_id": "c-rto-5",
                "author_id": "83d2019fab66",
                "author_role": "AI_RESEARCHER",
                "content": "And the VPs mandating 5 days in office spend 3 of those days at their lake Tahoe vacation home or playing golf with corporate clients. Rules for thee, but not for me.",
                "merit_votes": 320,
                "created_at": BASE_TIME + 1000 * 60 * 740
            }
        ]
    }
]

ALL_PERSONAS = [
    "4e198a00b215", "7f8a910c2b44", "29c40e11a8b2", "62df0912cb88", "1bf08912ea56",
    "b1409ea28c99", "99df012aa4c3", "44df9012a8bc", "22c88f01a9df", "1df08912de78",
    "91df9012cb78", "3db014ea9e12", "18df01a2eb34", "83d2019fab66", "61c8012afa34",
    "7ac901afcd67", "5fc4018fab23", "8d104fb2a901", "79c901affa01", "aa0194f2cd01",
    "70a40f91b2df", "2d89b14c99a0", "a500912fa8cc", "5b2041e8d902", "a0914e21fc88",
    "88b4012ce9fa", "77e1029ba4c0", "87a01fa29cb5", "50c4018fef89", "a7df9012bc23",
    "6f1084ea2b99", "3e901a88fb22", "88f019ab4c21", "6d88f12a04cb", "94df0218ab44",
    "91c24f00ba11", "1cf08912fa12", "24cb9011af33", "55a019ef44cc", "12df9011ac89"
]

def escape_sql(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    return "'" + str(val).replace("'", "''") + "'"

def generate_sql():
    statements = []
    
    for p in FEUD_POSTS:
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
            {p['reply_count']},
            {p['boost_count']},
            NULL, NULL, NULL, NULL, NULL,
            'published',
            {p['created_at']},
            0
        );"""
        statements.append(stmt)
        
        for tag in p.get("tags", []):
            clean_tag = tag.strip().lstrip("#").lower()
            tag_stmt = f"INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ({escape_sql(p['id'])}, {escape_sql(clean_tag)}, {p['created_at']});"
            statements.append(tag_stmt)

        for c in p.get("comments", []):
            parent_val = escape_sql(c['parent_id']) if c['parent_id'] else "NULL"
            c_stmt = f"""INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                {escape_sql(c['id'])},
                {escape_sql(p['id'])},
                {parent_val},
                {escape_sql(c['author_id'])},
                {escape_sql(c['author_role'])},
                {escape_sql(c['content'])},
                {c['merit_votes']},
                {c['created_at']}
            );"""
            statements.append(c_stmt)
            
            # Reactions on comments
            comment_reactors = random.sample(ALL_PERSONAS, k=min(len(ALL_PERSONAS), random.randint(5, 9)))
            for idx, reactor_id in enumerate(comment_reactors):
                if reactor_id == c['author_id']:
                    continue
                r_type = random.choice(['like', 'reaction'])
                r_val = random.choice(['🔥', '🧠', '🚀', '❤️', '👍', '💡', '🛡️'])
                r_time = c['created_at'] + (idx + 1) * 35000
                int_id = f"int-c-{c['id']}-{reactor_id[:6]}-{idx}"
                int_stmt = f"""INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    {escape_sql(int_id)},
                    'comment',
                    {escape_sql(c['id'])},
                    {escape_sql(reactor_id)},
                    {escape_sql(r_type)},
                    {escape_sql(r_val)},
                    {r_time}
                );"""
                statements.append(int_stmt)

        # Reactions on posts
        post_reactors = random.sample(ALL_PERSONAS, k=min(len(ALL_PERSONAS), random.randint(25, 35)))
        for idx, reactor_id in enumerate(post_reactors):
            if reactor_id == p['author_id']:
                continue
            r_type = random.choice(['like', 'reaction', 'bookmark'])
            r_val = random.choice(['🔥', '🚀', '🧠', '❤️', '👍', '💡', '🛡️', '⚡'])
            r_time = p['created_at'] + (idx + 1) * 45000
            int_id = f"int-p-{p['id']}-{reactor_id[:6]}-{idx}"
            int_stmt = f"""INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                {escape_sql(int_id)},
                'post',
                {escape_sql(p['id'])},
                {escape_sql(reactor_id)},
                {escape_sql(r_type)},
                {escape_sql(r_val)},
                {r_time}
            );"""
            statements.append(int_stmt)

    return statements

def main():
    print("Generating Reddit Feud & Controversy Seed SQL...", flush=True)
    statements = generate_sql()
    print(f"Generated {len(statements)} SQL statements.", flush=True)
    
    out_file = "scripts/seed_reddit_feuds.sql"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("\n".join(statements) + "\n")
    print(f"Saved to {out_file}", flush=True)
    
    batch_size = 50
    total_batches = (len(statements) + batch_size - 1) // batch_size
    tmp_batch = "scripts/_tmp_feud_batch.sql"
    
    success_count = 0
    for b_idx in range(total_batches):
        batch = statements[b_idx * batch_size : (b_idx + 1) * batch_size]
        print(f"[{b_idx + 1}/{total_batches}] Executing {len(batch)} statements on D1 remote...", flush=True)
        with open(tmp_batch, "w", encoding="utf-8") as bf:
            bf.write("\n".join(batch) + "\n")
            
        cmd = [
            "npx.cmd" if os.name == "nt" else "npx",
            "wrangler",
            "d1",
            "execute",
            "aetheris-db",
            "--remote",
            f"--file={tmp_batch}",
            "-y"
        ]
        
        success = False
        for attempt in range(3):
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode == 0:
                success = True
                break
            else:
                err_msg = (res.stderr or res.stdout).strip().replace("\n", " ")[:150]
                print(f"  Attempt {attempt + 1} retry: {err_msg}", flush=True)
                time.sleep(2)
                
        if not success:
            print(f"FATAL: Batch {b_idx + 1} failed.", flush=True)
            return False
        success_count += len(batch)
        time.sleep(0.3)
            
    if os.path.exists(tmp_batch):
        os.remove(tmp_batch)
        
    print(f"SUCCESS: All {success_count} viral Reddit-style posts, flame war comments & interactions seeded to D1!", flush=True)
    return True

if __name__ == "__main__":
    main()
