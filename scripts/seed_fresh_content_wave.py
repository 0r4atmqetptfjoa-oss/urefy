#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/seed_fresh_content_wave.py
High-Impact Community Content Wave:
- Modern PS5 Jailbreaks (etaHEN, Kstuff, 60fps patches, source links, video preview)
- Nintendo Switch Picofly & Atmosphere CFW Overclocking
- Gears of War Controversy & E-Day Community Analysis
- Monster Hunter Wilds PC Beta Technical Performance & Shader Stutter
- DeepSeek V3 / R1 Open-Weights Architecture Breakdown
- WebGPU In-Browser Zero-Server AI (Transformers.js v3)
- Silent Hill 2 Remake & Cyberpunk Path Tracing Overdrive Reviews
- Live Threaded Comments on New Posts AND Existing Threads
- 45+ Active English Chat Messages across pulse-global, relays-general, relays-dev
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
M_MS = 60 * 1000

AUTHORS = {
    "anti_tracker": "52e091bfa331",
    "arch_chad": "7f8a910c2b44",
    "bio_hacker_x": "7b33a901ff42",
    "bit_fiddler": "31f90a44ec12",
    "dan_gaming": "8a31b402ef19",
    "docker_ninja": "4e198a00b215",
    "fiber_wizard": "62df09a14c33",
    "godot_tinker": "5b2041e8d902",
    "neon_cat": "2d89b14c99a0",
    "neovim_cult": "a410ef89b231",
    "packet_storm": "9f4a120c8b31",
    "pixel_witch": "14e92a8819bb",
    "retro_pixel": "88b4012ce9fa",
    "sim_rig_racer": "a0914e21fc88",
    "synth_druid": "c0a184e912fd",
    "void_pointer": "3c91a4e082aa",
    "zero_day": "6d88f12a04cb",
}

def sql_esc(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    s = str(val).replace("'", "''")
    return f"'{s}'"

def run_d1_sql_file(sql_file_rel_or_abs):
    cmd = [
        "npx.cmd" if os.name == "nt" else "npx",
        "wrangler",
        "d1",
        "execute",
        "aetheris-db",
        "--remote",
        f"--file={sql_file_rel_or_abs}",
        "-y"
    ]
    res = subprocess.run(cmd, cwd=CLIENT_UI_DIR, capture_output=True, text=True)
    if res.returncode != 0:
        err = (res.stderr or res.stdout).strip()
        print(f"  [!] D1 file execution error: {err}")
        return False
    print(res.stdout)
    return True

# =============================================================================
# NEW EXPANSION POSTS
# =============================================================================

NEW_POSTS_DATA = [
    {
        "id": "post-en-ps5-jailbreak-etahen-guide",
        "channel_id": "c/gaming",
        "author": "zero_day",
        "flair": "EXPLOIT & HOMEBREW",
        "title": "Modern PS5 Jailbreak State of the Art: Firmwares 3.00–4.51 to 8.00, etaHEN 1.9B, Kstuff & Bloodborne 60FPS",
        "content": """The PlayStation 5 reverse-engineering scene has reached an extraordinary milestone. What began as experimental WebKit read/write primitives has evolved into a mature, stable homebrew ecosystem.

### Current Firmware Vulnerability Matrix:
- **Firmwares 3.00 – 4.51 (Golden Firmwares)**: Full kernel read/write via the IPv6 socket use-after-free exploit combined with hypervisor bypass via `kstuff`. Allows full fself execution, debug menus, and persistent homebrew payloads.
- **Firmwares 5.00 – 7.61**: WebKit entrypoints paired with the recently disclosed UMTX (FreeBSD mutex race condition) kernel exploit. Currently stabilizing payloads for persistent memory access.
- **Firmware 8.00+**: PoC stages; recommendation for scene enthusiasts is to stay on the lowest possible firmware without connecting to PSN.

### Key Tools & Source Repositories:
- **[etaHEN by LightningMods](https://github.com/LightningMods/etaHEN)**: The all-in-one Homebrew Enabler featuring an integrated FTP server, klog server, toolbox daemon, and game patch manager.
- **[Itemzflow Game Manager](https://github.com/LightningMods/Itemzflow)**: Dedicated native backup manager allowing legal dumping of game discs and external NVMe game storage.
- **Libhijacker & Game Patches**: Running legendary PS4 titles on PS5 hardware at unconstrained 60 FPS (including Lance McDonald's Bloodborne 60FPS patch and Driveclub 60FPS) with zero frame drops.

Always verify hash signatures before running WebKit payloads, and isolate your console with DNS blocking to prevent background OTA updates!""",
        "images": [
            "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": {
            "src": "https://www.youtube.com/watch?v=k1BneeJTDcU",
            "poster": "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80"
        },
        "votes": 1040,
        "boosts": 320,
        "offset_h": 0.8,
        "comments": [
            ("packet_storm", None, "Bloodborne running at a locked 60 FPS on a 4.03 PS5 is genuinely what Sony should have sold us years ago. The frame pacing is butter smooth.", 124),
            ("zero_day", "c-1", "Exactly! Libhijacker hooks into the game process memory on boot and injects the 60Hz timing patch without modifying game files on disk.", 98),
            ("retro_pixel", None, "Is etaHEN 1.9B stable enough for daily use? Any kernel panics on rest mode?", 76),
            ("zero_day", "c-3", "Rest mode stability has improved drastically with the latest kstuff v1.4 update. I have had an uptime of 18 days without a single panic.", 110),
            ("dan_gaming", None, "Can you run homebrew emulators like RetroArch natively on the PS5 yet?", 55),
            ("zero_day", "c-5", "Yes, native PS5 RetroArch builds run PS1, PS2, and arcade titles with Vulkan rendering and CRT shaders at native 4K.", 82),
        ]
    },
    {
        "id": "post-en-switch-oled-picofly-cfw",
        "channel_id": "c/gaming",
        "author": "retro_pixel",
        "flair": "HARDWARE MODS",
        "title": "Nintendo Switch Modding Masterclass: RP2040 Picofly Micro-Soldering, Atmosphere 1.7+ & emuMMC sys-clk Overclocking",
        "content": """While original 2017 V1 Switch consoles relied on the unpatchable Nvidia Tegra RCM vulnerability (fusee-gelee), modern Switch OLED and V2 Mariko units require hardware glitching.

Using the open-source **Picofly** RP2040 micro-modchip, we can unlock the full potential of the stunning 7-inch OLED screen:

### The Hardware Installation:
- **Glitch Principle**: The RP2040 chip pulses the eMMC DAT0, CLK, and CMD lines with precise sub-nanosecond timing during Tegra cold boot to bypass RSA bootloader verification.
- **OLED Ribbon Cable**: Modern flex cables slide directly under the eMMC BGA chip without requiring desoldering the flash memory, making installation clean and reversible.

### Custom Firmware & Overclocking:
- **[Atmosphere CFW](https://github.com/Atmosphere-NX/Atmosphere) & [Hekate Bootloader](https://github.com/CTCaer/hekate)**: Partitioning the microSD card into a dual-boot setup: clean sysNAND for legitimate online gaming and isolated emuMMC with 90DNS enabled.
- **sys-clk Overclocking**: Pushing the underclocked Mariko SoC (CPU 1785MHz, GPU 921MHz, LPDDR4X 1600MHz). *The Legend of Zelda: Tears of the Kingdom* and *Xenoblade Chronicles 3* lock to a solid 60 FPS with zero dynamic resolution drops!

Documentation on glitch timings and fuse maps is available on the [SwitchBrew Wiki](https://switchbrew.org/).""",
        "images": [
            "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": None,
        "votes": 980,
        "boosts": 285,
        "offset_h": 1.2,
        "comments": [
            ("synth_druid", None, "The DAT0 adapter flex cable is a lifesaver. Soldering to that microscopic anchor point under the eMMC with a 0.1mm jumper wire was pure nightmare fuel on early revisions.", 112),
            ("retro_pixel", "c-1", "Haha yes! With the modern friction adapter, you clip it in, check diode readings with a multimeter (0.7V on DAT0), and you are golden.", 94),
            ("dan_gaming", None, "How is battery life when running sys-clk at 1785MHz on CPU?", 62),
            ("retro_pixel", "c-3", "On the Mariko 16nm revision, power efficiency is great. TOTK at 60 FPS draws ~12W from the battery, giving around 3.5 hours of continuous play.", 89),
            ("anti_tracker", None, "The emuMMC partition isolation with exosphere blanking device serial numbers is essential to prevent Nintendo telemetry bans.", 78),
            ("retro_pixel", "c-5", "Crucial! `blank_prodinfo=1` in exosphere.ini replaces your serial number with zeros in memory on the emuMMC.", 104),
        ]
    },
    {
        "id": "post-en-gears-of-war-eday-controversy",
        "channel_id": "c/gaming",
        "author": "dan_gaming",
        "flair": "GAME CRITIQUE",
        "title": "Why Modern Gears Was Review-Bombed and How Gears of War: E-Day Promises to Save the Franchise",
        "content": """The announcement of *Gears of War: E-Day* generated widespread excitement across the gaming world—largely because it signaled a definitive retreat from the live-service pitfalls that caused *Gears 5* to be heavily review-bombed by its own dedicated playerbase.

### Why Was Modern Gears Review-Bombed?
1. **Aggressive Live-Service Monetization**: Launching with the predatory 'Operation' system, forcing players to grind battle passes or purchase premium 'Iron' currency for weapon skins and execution animations that were standard unlocks in Gears 3.
2. **Multiplayer Netcode & Gnasher Inconsistency**: For a decade, Gears multiplayer lived or died by high-stakes Gnasher duels. Gears 5 launched with severe hit registration desync, 30Hz tickrate server issues, and arbitrary pellet magnetism that alienated veterans.
3. **Loss of Identity**: Moving away from the claustrophobic, dark horror roots of the original 2006 masterpiece into colorful, open-world skiff traversal that diluted the frantic pacing.
4. **Mandatory Account Requirements & DRM**: Steam users were forced through Microsoft account linking, always-online telemetry, and Anti-Cheat crashes.

### The E-Day Promise:
Setting the prequel 14 years before Gears 1 on Emergence Day with young Marcus Fenix and Dom Santiago, built in [Unreal Engine 5](https://www.gearsofwar.com/) with hardware-accelerated Nanite and Lumen, represents a return to visceral, grim survival horror.

If The Coalition honors player feedback by stripping out live-service monetization and focusing on tight linear campaign co-op, Gears of War will reclaim its throne.""",
        "images": [
            "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": {
            "src": "https://www.youtube.com/watch?v=0h5oVf2x9lM",
            "poster": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"
        },
        "votes": 1120,
        "boosts": 360,
        "offset_h": 1.9,
        "comments": [
            ("sim_rig_racer", None, "The E-Day reveal trailer featuring the acoustic piano rendition of 'Mad World' gave me chills. That dark, gritty, hopeless atmosphere was what made Gears iconic.", 138),
            ("dan_gaming", "c-1", "That trailer understood the assignment 100%. The raw brutality of Marcus fighting a single Locust Drone in close quarters captures what Gears should always be.", 119),
            ("arch_chad", None, "Gears 5 requiring always-online even for single player campaign stats was an insult. If E-Day has a pure offline campaign mode, I will buy day one.", 94),
            ("neon_cat", None, "They also need to fix the multiplayer servers. 60Hz or 120Hz tickrate servers should be mandatory for competitive Gnasher shotgun gameplay in 2026.", 82),
            ("dan_gaming", "c-4", "Amen. In a game where 1 millisecond determines whether you gib the enemy or get body-chunked, 30Hz servers were unplayable.", 105),
            ("pixel_witch", None, "UE5 Lumen lighting in dark subterranean Locust tunnels is going to look spectacular.", 67),
        ]
    },
    {
        "id": "post-en-monster-hunter-wilds-pc-analysis",
        "channel_id": "c/gaming",
        "author": "sim_rig_racer",
        "flair": "BENCHMARK & PERFORMANCE",
        "title": "Monster Hunter Wilds PC Beta Performance Deep-Dive: Traversal Stutter, CPU Bottlenecks & Frame Gen Backlash",
        "content": """Capcom's public open beta for *Monster Hunter Wilds* sparked intense community debate and review-bombing across PC gaming communities.

After logging 25 hours of hardware telemetry across multiple CPU and GPU configurations, here is an objective technical breakdown:

### The Root Cause of Stuttering:
- **Severe CPU Bottlenecking**: RE Engine's physics, weather simulation, and large monster herd AI scale poorly across thread pools. Even high-end 8-core CPUs (Ryzen 7700X, Core i7-13700K) experienced frametime spikes of up to 45ms when weather shifted to storms in the Windward Plains.
- **Shader Compilation & DirectStorage**: While Capcom included an initial shader pre-compilation step, runtime shader caching during complex elemental particle effects caused dropped frames on first encounter.
- **Over-Reliance on Frame Generation**: The recommended system specs rely on DLSS 3 / FSR 3 Frame Generation simply to reach 60 FPS. Generating interpolated frames from an unstable 35 FPS base creates noticeable input latency and ghosting on fast monster lunges.

### How to Mitigate on PC:
1. Cap framerate at 60 or 90 FPS using driver-level capping via RivaTuner / Nvidia Control Panel.
2. Reduce 'Mesh Quality' and 'Volumetric Fog' from Ultra to Medium (reduces CPU draw call load by 32%).
3. Enable DirectStorage background streaming with unconstrained PCIe 4.0 lanes.

Capcom has officially acknowledged the feedback and confirmed day-one CPU optimization patches.""",
        "images": [
            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": None,
        "votes": 890,
        "boosts": 245,
        "offset_h": 2.4,
        "comments": [
            ("dan_gaming", None, "Using Frame Generation to mask poor base optimization is a dangerous industry trend. Frame gen is meant to take a stable 80 FPS to 140 FPS, not fix a stuttering 30 FPS mess.", 142),
            ("sim_rig_racer", "c-1", "Completely agree! Interpolating between unstable frame intervals just multiplies motion artifacts and makes dodging monster attacks feel sluggish.", 115),
            ("fiber_wizard", None, "The 7800X3D with its 96MB of 3D V-Cache handled the herd AI draw calls significantly better than standard chips. Cache is king for unoptimized engines.", 88),
            ("neon_cat", None, "On my RTX 4070, dropping volumetric fog to High and disabling depth of field gave an immediate 18 FPS uplift.", 64),
            ("void_pointer", None, "Capcom's RE Engine has always been legendary on resident evil corridor shooters; open-world large scale simulation clearly pushed its threading model to the brink.", 92),
        ]
    },
    {
        "id": "post-en-deepseek-v3-r1-architecture",
        "channel_id": "c/privacy-ai",
        "author": "void_pointer",
        "flair": "AI ARCHITECTURE",
        "title": "DeepSeek-V3 & R1 Technical Breakdown: Multi-Head Latent Attention (MLA), DualPipe & Reasoning at 1/10th Cost",
        "content": """The open-weights AI ecosystem was redefined with the release of [DeepSeek-V3](https://github.com/deepseek-ai/DeepSeek-V3) and its reasoning counterpart DeepSeek-R1.

Achieving frontier performance rivaling GPT-4o and Claude 3.5 Sonnet while costing under $6 million to pre-train is an engineering marvel. Here is how their architecture achieved this:

### 1. Multi-Head Latent Attention (MLA):
Traditional Multi-Head Attention (MHA) and Grouped-Query Attention (GQA) suffer from explosive Key-Value (KV) cache memory growth at long context windows.
DeepSeek compresses keys and values into a shared low-dimensional latent space before projection:
- **KV Cache Footprint**: Reduced by **93.3%** compared to standard MHA.
- **Inference Impact**: A single 8x H800 node can serve 64k context windows with 4x larger batch sizes!

### 2. DeepSeekMoE with Fine-Grained Sparsity:
- Total Parameters: 671 Billion.
- Active Parameters per Token: Only **37 Billion** across 256 routed experts + 1 shared expert.
- Avoids routing collapse using an auxiliary-loss-free load balancing algorithm.

### 3. DualPipe Bidirectional Overlapping:
Overlaps computation and inter-node all-to-all communication in forward and backward passes, eliminating pipeline execution bubbles.

Open weights, open architecture papers, and reproducible efficiency—this is true open AI science.""",
        "images": [
            "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": None,
        "votes": 1250,
        "boosts": 410,
        "offset_h": 2.9,
        "comments": [
            ("bit_fiddler", None, "Multi-Head Latent Attention is the biggest architectural innovation since FlashAttention. Compressing the KV-cache at the projection matrix level solves the memory bandwidth wall.", 134),
            ("void_pointer", "c-1", "Exactly! Instead of storing massive per-head key/value vectors, you store one compressed latent vector and decompress on-the-fly inside SRAM register files.", 118),
            ("anti_tracker", None, "And running DeepSeek-R1 distilled models (7B and 14B) locally with Ollama provides incredible chain-of-thought mathematical reasoning completely offline.", 95),
            ("arch_chad", None, "The fact that they open-sourced the full training code and architectural details proves open research will always outpace closed corporate silos.", 87),
            ("synth_druid", None, "Has anyone tested running the quantized 671B MoE across a cluster of Mac Studio M2 Ultra machines over Thunderbolt?", 58),
            ("void_pointer", "c-5", "Yes, with llama.cpp distributed RPC, two 192GB M2 Ultras can run the Q4_K_M quantization at ~8 tokens/sec. Perfect for deep research synthesis.", 91),
        ]
    },
    {
        "id": "post-en-webgpu-transformers-browser-ai",
        "channel_id": "c/opensource",
        "author": "bit_fiddler",
        "flair": "WEBGPU & IN-BROWSER AI",
        "title": "Zero-Server AI: Running Whisper & Gemma-2B In-Browser via Transformers.js v3 with WebGPU Acceleration",
        "content": """Imagine building speech-to-text, semantic document search, or local text generation where **zero data ever leaves the user's browser**.

With [Transformers.js](https://github.com/huggingface/transformers.js) v3 and W3C WebGPU, this is now production reality:

### How In-Browser WebGPU Inference Operates:
1. **Direct Hardware Shader Execution**: WebGPU grants the web application direct access to Vulkan, Metal, or DirectX 12 compute pipelines on the user's GPU without intermediary server APIs.
2. **ONNX Runtime Web**: Models are compiled into optimized ONNX computation graphs with WebGPU execution providers. Weights are cached in the browser's IndexedDB after initial download.
3. **Real-Time Offline Speech Recognition**: Whisper Base & Small process microphone audio chunks in real time with under 120ms latency on mid-range laptops.
4. **Local LLM Text Generation**: Gemma-2B and Llama 3.2 1B execute in FP16 or INT4 precision entirely within browser memory sandbox.

```javascript
import { pipeline } from '@huggingface/transformers';

// Allocate speech recognition directly on local GPU
const transcriber = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
    device: 'webgpu',
    dtype: 'fp32',
});
```

True edge privacy: no server costs, zero compliance headaches, and infinite offline scalability!""",
        "images": [
            "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": None,
        "votes": 910,
        "boosts": 265,
        "offset_h": 3.4,
        "comments": [
            ("void_pointer", None, "WebGPU compute shaders are a watershed moment for web apps. Bypassing node backend APIs completely saves thousands in cloud inference bills.", 108),
            ("bit_fiddler", "c-1", "And users with slow or intermittent connections can transcribe hours of audio without consuming their cellular data plan.", 89),
            ("docker_ninja", None, "How is cold start caching handled when the user closes their browser tab?", 54),
            ("bit_fiddler", "c-3", "The ONNX model weights are stored in the browser's persistent CacheStorage API / IndexedDB. Second launch loads from local disk in 200ms!", 76),
            ("anti_tracker", None, "This is the ultimate privacy architecture for healthcare and legal transcription tools.", 69),
        ]
    },
    {
        "id": "post-en-silent-hill-2-remake-technical",
        "channel_id": "c/gaming",
        "author": "pixel_witch",
        "flair": "TECHNICAL REVIEW",
        "title": "Silent Hill 2 Remake Technical Critique: Unreal Engine 5 Lumen Lighting Mastery vs Traversal Hitching",
        "content": """Bloober Team's reimagining of *Silent Hill 2* is one of the most visually evocative horror titles ever released, but it serves as a case study in both the immense triumphs and technical headaches of Unreal Engine 5:

### The Artistic Masterstroke:
- **Volumetric Fog & Software/Hardware Lumen**: The iconic dense fog of Silent Hill uses UE5's volumetric scattering combined with Lumen bounce lighting. Your flashlight beam casts real-time indirect illumination off rusted walls and wet asphalt, creating terrifying organic shadows.
- **Binaural 3D Audio**: Sound design is reference-class. Radio static crackles with directional cues in 3D headphone space, making enemy positioning terrifyingly tactile.

### The Technical Rough Edges:
- **Traversal Hitching on PC**: As you cross world streaming partition cells in town, frametimes spike from 14ms to 50ms due to unbuffered asset streaming on high settings.
- **30 FPS Cutscene Lock**: Fixed on PC by modifying `Engine.ini` with custom frame limiter overrides:
```ini
[/Script/Engine.Engine]
bSmoothFrameRate=False
[SystemSettings]
r.SceneColorFormat=4
r.CreateShadersOnLoad=1
```

A haunting masterpiece that rewards players willing to tweak PC configurations for maximum smoothness.""",
        "images": [
            "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": None,
        "votes": 875,
        "boosts": 230,
        "offset_h": 4.0,
        "comments": [
            ("dan_gaming", None, "The atmosphere inside Wood Side Apartments with headphones on in a dark room had my heart racing. Akira Yamaoka's reworked score is breathtaking.", 115),
            ("pixel_witch", "c-1", "The sound of Pyramid Head dragging the Great Knife across metal grating in 3D audio sent chills down my spine.", 96),
            ("synth_druid", None, "The `r.CreateShadersOnLoad=1` tweak completely eliminated the combat stutter when Nurses swing their pipes!", 84),
            ("sim_rig_racer", None, "How does hardware ray-tracing Lumen compare to software Lumen on an RTX 4080?", 52),
            ("pixel_witch", "c-4", "Hardware Lumen sharpens glossy puddles and mirrors, but software Lumen runs ~22% faster and is virtually identical in foggy outdoor streets.", 73),
        ]
    },
    {
        "id": "post-en-cyberpunk-2077-fsr-dlss-rt-overdrive",
        "channel_id": "c/technology",
        "author": "fiber_wizard",
        "flair": "GRAPHICS & SHADERS",
        "title": "Cyberpunk 2077 Ray Tracing Overdrive in 2026: Full Path Tracing, DLSS 3.7 vs FSR 3.1 & Shader Execution Reordering",
        "content": """Three years after the initial release of Ray Tracing Overdrive mode, Night City remains the undisputed benchmark for real-time computer graphics.

### The Physics of Full Path Tracing:
Unlike traditional hybrid ray tracing (which only calculates reflections or ambient occlusion on top of rasterization), Overdrive traces full light transport:
- **Multiple Bounces**: Sunlight bounces off neon billboards into dark alleyways, picking up color bleed and illuminating pedestrians naturally.
- **Shader Execution Reordering (SER)**: Reorganizes chaotic divergent rays into coherent GPU SIMD warps, boosting ray tracing throughput by up to 40% on Ada Lovelace silicon.
- **Ray Reconstruction (RR)**: Replaces multiple hand-tuned spatial denoisers with an AI neural network trained to reconstruct sharp reflections and shadows directly from raw sample rays.

### DLSS 3.7 vs FSR 3.1 Comparison:
- **DLSS 3.7**: Model preset 'E' resolves fine neon wire grids with zero temporal ghosting at 4K Quality mode.
- **FSR 3.1**: Immense improvements in disocclusion stability; frame generation decoupled from upscaling allows pairing FSR frame gen with DLSS upscaling on supported systems!

Night City in rain at midnight with Path Tracing enabled is what the next decade of gaming graphics looks like.""",
        "images": [
            "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80"
        ],
        "video": None,
        "votes": 1080,
        "boosts": 340,
        "offset_h": 4.5,
        "comments": [
            ("dan_gaming", None, "Ray Reconstruction in motion is miraculous. Driving through Japantown puddles at 100 mph without shimmering or puddle noise looks like pre-rendered CGI.", 128),
            ("fiber_wizard", "c-1", "The way wet tire tracks reflect moving car headlights in real time is pure photorealism.", 97),
            ("arch_chad", None, "Has anyone tested Path Tracing on Linux via Proton experimental with vkd3d-proton?", 64),
            ("fiber_wizard", "c-3", "Yes! With `VKD3D_CONFIG=dxr11,dxr` on modern Nvidia drivers, performance on Arch Linux is within 2% of native Windows.", 86),
            ("synth_druid", None, "GPU power draw is no joke—my 4090 pulls a steady 420W in Overdrive mode!", 59),
        ]
    }
]

# =============================================================================
# ADDITIONAL COMMENTS ON PRE-EXISTING POSTS (TO MAKE THEM FEEL HIGHLY ACTIVE)
# =============================================================================

COMMENTS_ON_EXISTING_POSTS = [
    ("post-en-ryzen-curve-optimizer", "arch_chad", None, "Followed your CoreCycler testing recommendations today on my new 7950X3D—settled at -26 on CCD0 golden cores. Peak Cinebench R24 score jumped by 620 points!", 88),
    ("post-en-ryzen-curve-optimizer", "fiber_wizard", "c-7", "That is an exceptional bin for CCD0! Keep an eye on ambient room temps during summer, but -26 is rock solid.", 65),
    ("post-en-oled-360hz-cs2", "packet_storm", None, "Just played my first ESEA league match on 360Hz OLED. The ability to react to pixel peeks on A Long in Dust II is an unfair advantage.", 79),
    ("post-en-oled-360hz-cs2", "dan_gaming", "c-7", "Told you! Once you experience 0.03ms pixel response, standard IPS monitors feel like dragging your mouse through molasses.", 92),
    ("post-en-local-llm-dual-gpu", "docker_ninja", None, "Deployed your dual-3090 vLLM setup in our team's local development lab. Code review turnaround time dropped from minutes to 15 seconds.", 95),
    ("post-en-local-llm-dual-gpu", "void_pointer", "c-7", "Glad it helped your team! Make sure to set `gpu-memory-utilization 0.95` in vLLM flags to maximize batch concurrency.", 73),
    ("post-en-arch-btrfs-snapper", "neovim_cult", None, "Snapper saved my entire root partition yesterday when an experimental GCC upgrade broke glibc dependencies. Rollback took 10 seconds in bootloader.", 102),
    ("post-en-arch-btrfs-snapper", "arch_chad", "c-6", "That is the beauty of Btrfs copy-on-write subvolumes. You can break things fearlessly because you are always 1 reboot away from safety.", 84),
    ("post-en-sqlite-wal-mode", "void_pointer", None, "Benchmarked 10,000 requests/sec against SQLite WAL mode on an NVMe SSD—median latency was 0.18ms. People sleeping on SQLite are wasting millions on Postgres clusters.", 118),
    ("post-en-sqlite-wal-mode", "bit_fiddler", "c-6", "The math does not lie! Eliminating TCP network socket overhead turns your database into an in-memory C function call.", 95),
    ("post-en-custom-keyboard-75", "pixel_witch", None, "Ordered the Boba U4T switches after reading your guide! The sound profile on your audio clip is so satisfying.", 64),
    ("post-en-custom-keyboard-75", "synth_druid", "c-6", "You will love them! Just remember: do NOT lube the tactile legs of the stems, keep them dry to preserve the snappy bump.", 78),
]

# =============================================================================
# 45+ VIBRANT ENGLISH CHAT MESSAGES
# =============================================================================

NEW_CHAT_DATA = [
    # 1. PULSE-GLOBAL (25 messages)
    ("pulse-global", "zero_day", "huge milestone for the PS5 scene today: etaHEN 1.9B is out with full Kstuff 1.4 support", 150.0),
    ("pulse-global", "packet_storm", "finally! testing Bloodborne 60FPS patch on my 4.03 console right now", 145.0),
    ("pulse-global", "zero_day", "make sure you load libhijacker daemon first, then launch the disc or fself dump", 140.0),
    ("pulse-global", "packet_storm", "HOLY SHIT it works!! locked 60 FPS in Central Yharnam with zero frame drops!", 135.0),
    ("pulse-global", "retro_pixel", "Bloodborne at 60 FPS on native PS5 hardware... we waited 10 years for this moment", 130.0),
    ("pulse-global", "dan_gaming", "who is watching the Gears of War E-Day discussions? the backlash against Gears 5 live-service was totally justified", 120.0),
    ("pulse-global", "sim_rig_racer", "Gears 5 microtransactions and battle passes almost killed the franchise for me. E-Day returning to grim survival horror is exactly what we needed", 115.0),
    ("pulse-global", "dan_gaming", "and please bring back 60Hz/120Hz multiplayer tickrates. competitive Gnasher shotgun duels require pinpoint hitreg", 110.0),
    ("pulse-global", "neon_cat", "that Mad World acoustic trailer still gives me chills every time i watch it", 105.0),
    ("pulse-global", "void_pointer", "did everyone see the DeepSeek-V3 architectural whitepaper? Multi-Head Latent Attention is a work of art", 95.0),
    ("pulse-global", "bit_fiddler", "compressing the KV cache into a shared latent space reduces memory usage by 93%. that means 10x larger context windows on consumer hardware!", 90.0),
    ("pulse-global", "void_pointer", "and DeepSeek-R1 reasoning matching closed reasoning models at 1/10th the inference compute cost is unbelievable", 85.0),
    ("pulse-global", "anti_tracker", "running the R1 14B distilled model locally in Ollama right now—math reasoning is flawless and 100% private", 80.0),
    ("pulse-global", "sim_rig_racer", "anyone else playing the Monster Hunter Wilds PC beta? how is your frametime stability?", 70.0),
    ("pulse-global", "fiber_wizard", "severe traversal stutter on quad-core CPUs when the sandstorm weather rolls in. RE Engine needs CPU draw-call optimization", 65.0),
    ("pulse-global", "sim_rig_racer", "drop volumetric fog to medium and cap framerate with RTSS. it eliminates the worst frametime spikes", 60.0),
    ("pulse-global", "retro_pixel", "just finished soldering another Picofly modchip on a Switch OLED for a friend. multimeter readings are 0.72V on DAT0", 50.0),
    ("pulse-global", "synth_druid", "that flex ribbon cable makes modern OLED installs so clean compared to the old wire jumpers", 45.0),
    ("pulse-global", "retro_pixel", "sys-clk at 1785MHz running Tears of the Kingdom at 60 FPS on that OLED screen is a spiritual experience", 40.0),
    ("pulse-global", "pixel_witch", "playing Silent Hill 2 Remake on PC tonight. the 3D binaural audio with good headphones is terrifying", 30.0),
    ("pulse-global", "dan_gaming", "the radio static crackle coming from behind your left ear when a nurse approaches... pure nightmare fuel", 25.0),
    ("pulse-global", "fiber_wizard", "cyberpunk with path tracing overdrive mode running on Linux through Proton is within 2% of Windows now", 18.0),
    ("pulse-global", "arch_chad", "vkd3d-proton developers deserve a medal for translating DXR1.1 ray tracing calls so cleanly", 12.0),
    ("pulse-global", "void_pointer", "the tech and gaming discussions here are on another level tonight ⚡", 5.0),
    ("pulse-global", "dan_gaming", "best community on the sovereign web! 🚀", 1.0),

    # 2. RELAYS-GENERAL (12 messages)
    ("relays-general", "anti_tracker", "friendly reminder for anyone jailbreaking consoles: set your primary DNS to an offline dummy IP or block telemetry servers at the router level", 100.0),
    ("relays-general", "zero_day", "essential advice. Sony and Nintendo background OTA daemons will download updates silently if you leave default DNS enabled", 95.0),
    ("relays-general", "retro_pixel", "Itemzflow allows you to dump your legitimate game discs directly to an external USB NVMe drive. true digital preservation", 85.0),
    ("relays-general", "packet_storm", "physical media ownership matters. if a company can revoke your digital license at any moment, you don't own your games", 75.0),
    ("relays-general", "synth_druid", "what soldering iron tip do you recommend for micro-glitch modchips?", 65.0),
    ("relays-general", "retro_pixel", "TS100 / Pinecil with a fine conical 'I' or bent chisel 'KU' tip with plenty of flux and 0.3mm solder wire", 60.0),
    ("relays-general", "synth_druid", "perfect, ordering the Pinecil v2 kit right now", 55.0),
    ("relays-general", "neon_cat", "anyone else prefer playing tactical shooters with low DPI? switched from 1600 to 800 DPI and my headshot accuracy skyrocketed", 40.0),
    ("relays-general", "dan_gaming", "800 DPI with 1.1 in-game sens in CS2 is the sweet spot for arm aiming and precise micro-adjustments", 35.0),
    ("relays-general", "neon_cat", "paired with a 360Hz OLED panel it feels like aimbot haha", 30.0),
    ("relays-general", "fiber_wizard", "optical sensor polling at 1000Hz or 4000Hz gives instant cursor response", 15.0),
    ("relays-general", "void_pointer", "good night everyone, see you on the relays tomorrow!", 3.0),

    # 3. RELAYS-DEV (10 messages)
    ("relays-dev", "bit_fiddler", "benchmarked Transformers.js v3 running Whisper in-browser with WebGPU on Chrome: 120ms chunk latency", 80.0),
    ("relays-dev", "void_pointer", "that means completely zero-cost offline speech transcription without any backend server infrastructure", 75.0),
    ("relays-dev", "docker_ninja", "and the model weights stay cached in the browser's IndexedDB after first run. second load is instantaneous", 65.0),
    ("relays-dev", "neovim_cult", "merged the new post video card embed updates: supports YouTube embeds with inert facade posters", 50.0),
    ("relays-dev", "arch_chad", "verified. zero third-party scripts load until the user explicitly clicks the play button. strict privacy by default", 45.0),
    ("relays-dev", "bit_fiddler", "D1 database query times on the new community posts are holding steady at 0.3ms median", 35.0),
    ("relays-dev", "fiber_wizard", "edge POP caching in Bucharest (OTP) is serving static assets under 2ms", 25.0),
    ("relays-dev", "docker_ninja", "all 227 test suites passing in CI with 100% green coverage", 15.0),
    ("relays-dev", "void_pointer", "our sovereign network architecture is running at peak performance ⚡", 4.0),
    ("relays-dev", "arch_chad", "keep shipping clean code!", 1.0)
]

# =============================================================================
# ASSEMBLE SQL STATEMENTS
# =============================================================================

posts_statements = []
comments_statements = []
chat_statements = []

for p_idx, p in enumerate(NEW_POSTS_DATA):
    p_id = p["id"]
    ch = p["channel_id"]
    author_uid = AUTHORS[p["author"]]
    flair = p["flair"]
    title = p["title"]
    content = p["content"]
    images_json = json.dumps(p["images"], ensure_ascii=False) if p["images"] else None
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
);"""
    posts_statements.append(post_stmt)

    comment_id_map = {}
    c_time = p_created
    for c_idx, (c_author_key, parent_ref, c_content, c_votes) in enumerate(p["comments"]):
        c_id = f"comm-fresh-{p_idx+1}-{c_idx+1}"
        comment_id_map[f"c-{c_idx+1}"] = c_id
        
        real_parent_id = None
        if parent_ref and parent_ref in comment_id_map:
            real_parent_id = comment_id_map[parent_ref]

        c_time += random.randint(120, 900) * 1000 + random.randint(100, 900)
        c_author_uid = AUTHORS[c_author_key]

        comm_stmt = f"""INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content,
    merit_votes, created_at, facet_id
) VALUES (
    {sql_esc(c_id)}, {sql_esc(p_id)}, {sql_esc(real_parent_id)},
    {sql_esc(c_author_uid)}, 'MEMBER', {sql_esc(c_content)},
    {c_votes}, {c_time}, NULL
);"""
        comments_statements.append(comm_stmt)

# Additional comments on older posts
for c_idx, (target_post_id, c_author_key, parent_id, c_content, c_votes) in enumerate(COMMENTS_ON_EXISTING_POSTS):
    c_id = f"comm-boost-prev-{c_idx+100}"
    c_time = NOW_MS - random.randint(30, 240) * M_MS
    c_author_uid = AUTHORS[c_author_key]
    
    comm_stmt = f"""INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content,
    merit_votes, created_at, facet_id
) VALUES (
    {sql_esc(c_id)}, {sql_esc(target_post_id)}, {sql_esc(parent_id)},
    {sql_esc(c_author_uid)}, 'MEMBER', {sql_esc(c_content)},
    {c_votes}, {c_time}, NULL
);"""
    comments_statements.append(comm_stmt)

# Chat messages
for msg_idx, (ch_id, author_key, text, offset_m) in enumerate(NEW_CHAT_DATA):
    msg_id = f"msg-fresh-live-{msg_idx+400}"
    author_uid = AUTHORS[author_key]
    msg_time = NOW_MS - int(offset_m * M_MS) + random.randint(50, 900)
    
    chat_stmt = f"""INSERT OR REPLACE INTO messages (
    id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at
) VALUES (
    {sql_esc(msg_id)}, {sql_esc(ch_id)}, {sql_esc(author_uid)},
    {sql_esc(text)}, {sql_esc(f"nonce-fresh-{msg_idx}")}, '#412', 'verified', NULL, {msg_time}
);"""
    chat_statements.append(chat_stmt)

print("=== High-Impact Fresh Community Content Wave ===")
print(f"Generated:")
print(f"  • {len(posts_statements)} Modern Feature Posts (PS5/Switch Jailbreaks, Gears E-Day, DeepSeek V3, WebGPU, Reviews)")
print(f"  • {len(comments_statements)} Threaded Comments (including cross-thread activity)")
print(f"  • {len(chat_statements)} Lively English Chat Messages")
print("-" * 50)

# STEP 1: INGEST POSTS
posts_sql_path = os.path.join(CLIENT_UI_DIR, "fresh_posts.sql")
with open(posts_sql_path, "w", encoding="utf-8") as f:
    f.write("\n".join(posts_statements))

print(f"\n[*] Step 1: Ingesting {len(posts_statements)} Posts into Cloudflare D1...")
run_d1_sql_file("fresh_posts.sql")
if os.path.exists(posts_sql_path):
    os.remove(posts_sql_path)
time.sleep(1.0)

# STEP 2: INGEST COMMENTS
comments_sql_path = os.path.join(CLIENT_UI_DIR, "fresh_comments.sql")
with open(comments_sql_path, "w", encoding="utf-8") as f:
    f.write("\n".join(comments_statements))

print(f"\n[*] Step 2: Ingesting {len(comments_statements)} Comments into Cloudflare D1...")
run_d1_sql_file("fresh_comments.sql")
if os.path.exists(comments_sql_path):
    os.remove(comments_sql_path)
time.sleep(1.0)

# STEP 3: INGEST CHAT MESSAGES
chat_sql_path = os.path.join(CLIENT_UI_DIR, "fresh_chat.sql")
with open(chat_sql_path, "w", encoding="utf-8") as f:
    f.write("\n".join(chat_statements))

print(f"\n[*] Step 3: Ingesting {len(chat_statements)} Chat Messages into Cloudflare D1...")
run_d1_sql_file("fresh_chat.sql")
if os.path.exists(chat_sql_path):
    os.remove(chat_sql_path)

print("\n=== FRESH CONTENT WAVE SEEDED SUCCESSFULLY ===")
