#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/seed_trending_tutorials.py
Generates and deploys a massive wave of high-demand English tutorials,
in-depth discussions, threaded comments, reactions, and live chat banter for UREfy.

Topics covered:
1. PS4 11.00 - 13.52 Jailbreak (PPPwn C++ + GoldHEN v2.4b18.11, WebKitty, PPPoE packets)
2. PS5 4.51 - 8.20 etaHEN & Itemzflow Guide (Kstuff, 60fps patches, Bloodborne & RDR2)
3. Nintendo Switch OLED Picofly RP2040 Micro-Soldering (DAT0 adapter ribbon, Hekate, Atmosphere)
4. ShadPS4 v0.4.0 Setup: Bloodborne 4K 60FPS on PC (Shader explosion fix, sound patch, SDL2)
5. iOS 17/18 Sideloading without Revokes: SideStore + WireGuard Local VPN Loopback
6. Local AI: DeepSeek-R1 32B & Qwen 2.5 on a Single 16GB GPU (Ollama + vLLM + Open-WebUI)
7. CS2 & Valorant Ultimate Windows 11 Latency Tuning (DPC, 0.5ms Timer Resolution, HPET)
8. Bazzite Linux Handheld Dual-Boot: SteamOS 3.6 on ROG Ally, Legion Go & Steam Deck
9. Reverse-Engineering Unity & Unreal Games: Il2CppDumper, AssetStudio, Ghidra
10. Android 15 Rooting: KernelSU Next + TrickyStore Strong Play Integrity Bypass
11. CRT Emulation: HSM Mega Bezel Reflection Shaders on 4K OLED (Sub-frame Runahead)
12. 10Gbps Homelab NAS: TrueNAS SCALE, ZFS RaidZ2, Mellanox ConnectX-3, Cloudflare Tunnels
13. Raspberry Pi 5 NVMe PCIe Gen3 Boot + Pi-hole & Unbound Recursive DNS Sinkhole
14. DDR5 Memory Overclocking: Hynix A-Die & M-Die Sub-Timings Tuning & 8000MT/s Stability
15. Proxmox VE 8 Headless Cloud Gaming Server: GPU Passthrough + Sunshine / Moonlight 120FPS
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
H_MS = 3600 * 1000
M_MS = 60 * 1000

print(f"=== UREfy Trending Tutorials & English Chat Seeder ===")
print(f"Baseline Time: {time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(NOW_MS / 1000))} UTC\n")

# Load Personas
personas_file = os.path.join(BASE_DIR, "personas_1000_complete.json")
with open(personas_file, "r", encoding="utf-8") as f:
    PERSONAS = json.load(f)

USER_MAP = {p["handle"]: p for p in PERSONAS}
USER_IDS = [p["user_id"] for p in PERSONAS]

def get_user_by_role(role_keyword=""):
    """Finds a persona matching interest or returns a random one."""
    if role_keyword:
        matches = [p for p in PERSONAS if role_keyword.lower() in p.get("bio", "").lower() or role_keyword.lower() in p.get("role", "").lower()]
        if matches:
            return random.choice(matches)
    return random.choice(PERSONAS)

def sql_esc(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    v_str = str(v).replace("'", "''")
    return f"'{v_str}'"

# ─────────────────────────────────────────────────────────────────────────────
# TUTORIAL POST DEFINITIONS
# ─────────────────────────────────────────────────────────────────────────────

TUTORIALS = [
    {
        "id": "tut-ps4-1352-pppwn-goldhen",
        "channel_id": "vault-guides",
        "flair": "TUTORIAL / GUIDE",
        "author_tag": "modder",
        "title": "[GUIDE] PS4 11.00 – 13.52 Jailbreak via PPPwn C++ & WebKitty: Step-by-Step with GoldHEN v2.4b18.11",
        "content": """The PlayStation 4 homebrew scene has advanced significantly with the release of GoldHEN v2.4b18.11 and the high-speed C++ rewrite of PPPwn (PlayStation 4 PPPoE PWN by TheFlow). Here is the verified, crash-free guide to jailbreaking firmwares 11.00, 11.02, 11.50, and up to 13.52.

### What is PPPwn?
PPPwn exploits a remote kernel buffer overflow in the FreeBSD network stack (`sys/net/if_spppsubr.c`) via malformed PPPoE LCP packets sent through the Ethernet interface. For newer 11.50 - 13.52 firmwares, a hybrid WebKit userland loader (WebKitty) triggers the entry point before passing control to the kernel exploit.

### Hardware Prerequisites
* PS4 (Fat, Slim, or Pro) running firmware 11.00 up to 13.52. **DO NOT UPDATE beyond your current firmware.**
* Standard Cat6 Ethernet cable connecting your PS4 directly to your PC, or an ESP32-S2 / Raspberry Pi Zero 2W auto-pwn dongle.
* USB flash drive formatted to **exFAT with MBR partition table** (FAT32 also works).
* Latest `goldhen.bin` (v2.4b18.11) copied directly to the USB drive root (`USB:/goldhen.bin`).

### Step-by-Step Setup
1. **Network Configuration on PS4**:
   * Go to `Settings > Network > Set Up Internet Connection > Use a LAN Cable > Custom`.
   * IP Address: `PPPoE`.
   * Username / Password: enter `ppp` for both (can be any dummy string).
   * DNS Settings: `Manual`.
     - Primary DNS: `62.210.38.117` (Al-Azif update blocker)
     - Secondary DNS: `0.0.0.0`
   * MTU Settings: `Automatic`. Proxy: `Do Not Use`.
2. **Executing PPPwn on PC**:
   * Download the latest `PPPwn_cpp` release from GitHub: [xfangfang/PPPwn_cpp](https://github.com/xfangfang/PPPwn_cpp).
   * Download the `stage1.bin` and `stage2.bin` matching your exact firmware version (e.g. `1100`, `1150`, `1352`).
   * Plug the USB drive with `goldhen.bin` into the right-most PS4 USB port.
   * Open Administrator Command Prompt on PC and run:
     ```bash
     pppwn.exe --interface "Ethernet" --fw 1100 --stage1 stage1.bin --stage2 stage2.bin --auto-retry
     ```
3. **Triggering the Exploit**:
   * On the PS4 screen, select `Test Internet Connection`.
   * Watch the PC console output. Stage 1 will scan the memory offsets and Stage 2 will inject the kernel payload.
   * If Stage 1 reports `Scanning for KASLR offset... OK`, the kernel payload will execute within 15 to 45 seconds.
4. **Verification**:
   * A pop-up notification will appear in the top-left corner: **"GoldHEN v2.4b18.11 loaded!"** with CPU/GPU temperature sensors and IP address.
   * You now have `Debug Settings > Package Installer` unlocked at the bottom of the Settings menu.

### Troubleshooting Known Issues
* **Kernel Panic / Instant Shutdown at Stage 4**: This happens when the network interface resets before the socket buffer clears. *Fix*: Place a cheap 5-port Gigabit switch between the PC and PS4 so the PC network adapter never drops carrier link during the handshake.
* **Payload Not Found**: Ensure your USB drive is formatted as MBR, not GPT. The PS4 bootloader cannot read GPT root partitions during early payload load.

Source code & official repositories:
* [SiSTR0 / GoldHEN Official GitHub](https://github.com/GoldHEN/GoldHEN)
* [PSX-Place Discussion & Offset Tracking](https://psx-place.com)""",
        "video": {
            "title": "PS4 11.00 - 13.52 Complete Jailbreak Walkthrough (PPPwn + GoldHEN)",
            "embed_url": "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
            "provider": "youtube",
            "duration": "14:22"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1507457379470-08b800bebc67?auto=format&fit=crop&w=1000&q=80",
                "caption": "PS4 Pro connected via Ethernet for PPPoE payload injection",
                "alt": "PS4 console with ethernet cable and USB drive"
            },
            {
                "url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80",
                "caption": "PPPwn terminal output: KASLR defeated and Stage 2 injected successfully",
                "alt": "Terminal code execution"
            }
        ],
        "comments": [
            ("tinkerer", "The gigabit switch trick is literally life saving! I spent 3 hours getting kernel panics on stage 4 with direct cable to my Realtek onboard NIC. Put an old TP-Link switch in the middle and it hit on the very first try!!"),
            ("skeptic", "Wait does 13.52 have 100% success rate or is it still unstable like the early webkit leaks? I'm on 11.02 and scared to update."),
            ("modder", "DO NOT UPDATE! Rule #1 of console modding is always stay on the lowest firmware possible. 11.00 has ~95% exploit stability while 13.52 sometimes requires 2-3 retries if the memory heap gets fragmented."),
            ("casual", "Can i play online games with this or will sony ban my console instantly??"),
            ("veteran", "No online play at all. The moment you connect to PSN you will be forced to update to latest firmware or get console ID permanently banned. Keep your DNS blocked and enjoy offline homebrew/backups."),
            ("coder", "For anyone with an ESP32-S2, there's already a compiled bin that auto-triggers PPPwn on boot so you don't even need a PC running. Just plug the micro-usb into the PS4 back port and ethernet into the board."),
            ("troll", "Sony engineers punching the air right now seeing a 10 year old PPPoE driver take down their security layer lmao 🤡"),
            ("audiophile", "GoldHEN's fan curve control is the best part. Set my PS4 Pro to keep temps under 68C and the jet engine fan noise is completely gone.")
        ]
    },
    {
        "id": "tut-ps5-etahen-60fps-guide",
        "channel_id": "c/technology",
        "flair": "TUTORIAL / GUIDE",
        "author_tag": "reverse-eng",
        "title": "[TUTORIAL] PS5 4.51 – 8.20 Exploitation Guide: etaHEN, Itemzflow & Unlocking 60FPS in Bloodborne / RDR2",
        "content": """With the release of etaHEN v2.0b and the latest Kstuff hypervisor patches by LightningMods and flatz, the PlayStation 5 homebrew ecosystem has reached a mature milestone. You can now dump legitimate games, run FTP, load homebrew, and inject real-time 60FPS patches into 30FPS-locked titles like Bloodborne, The Last of Us Part II, and Red Dead Redemption 2.

### Supported Firmwares
* **Golden Range (3.00 - 4.51)**: Full kernel exploit + WebKit / BD-J entry points with write access to kernel memory.
* **Extended Range (5.00 - 8.20)**: Kernel vulnerability reachable via BD-J disc loader or WebKit socket leak. etaHEN provides Kstuff support for fpkg execution and memory patches.

### Core Capabilities Unlocked
1. **etaHEN Homebrew Enabler**:
   * Kstuff (unsigned code execution bypass)
   * Built-in FTP Server on port 1337
   * Payload Loader on port 9020
   * Real-time game memory patcher (Illusion's 60fps & resolution patches)
2. **Itemzflow Game Manager**:
   * Backup and dump installed PS4/PS5 titles directly to external NVMe SSDs
   * Virtual disc mounter and file explorer

### How to Apply 60FPS to Bloodborne on PS5
Bloodborne never received an official PS5 60FPS update. Here is how to run Lance McDonald's true 60fps patch on your exploit-enabled PS5:
1. Boot the PS5 into userland via the web browser exploit host (e.g. `https://es7in1.site` or local ESP32).
2. Send the `etaHEN.bin` payload via Netcat:
   ```bash
   nc -w 3 192.168.1.150 9020 < etaHEN.bin
   ```
3. Open Itemzflow > Settings > Game Patches.
4. Toggle `Enable 60FPS Patch for CUSA03173 (Bloodborne 1.09)`.
5. Launch Bloodborne. The game now renders at flawless, locked 60 frames per second with full frame-pacing correction!

**Important Caution**: Always disable automatic system updates in `Settings > System > System Software > System Software Updates and Settings`. Never log into PSN on a modified console.""",
        "video": {
            "title": "Bloodborne Running at Native 60FPS on PS5 via etaHEN",
            "embed_url": "https://www.youtube-nocookie.com/embed/M1W_e_S7GgE",
            "provider": "youtube",
            "duration": "09:41"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1000&q=80",
                "caption": "PS5 DualSense and console running homebrew payload listener",
                "alt": "PS5 console on desk"
            },
            {
                "url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80",
                "caption": "Bloodborne 60FPS patch active in Hunter's Dream",
                "alt": "Gamer setup monitor"
            }
        ],
        "comments": [
            ("gamer", "Playing Bloodborne in 60 FPS without the disgusting frame pacing stutter feels like playing a completely different game. FromSoftware should have released this 4 years ago!"),
            ("hardware-enthusiast", "Is the hypervisor completely cracked on 4.51 or is this still relying on Kstuff patching kernel hooks in memory?"),
            ("reverse-eng", "Hypervisor (HV) is still technically isolated in secure world, but Kstuff redirects function tables in kernel space before hypercalls are dispatched. That's why we get unsigned code execution without needing a full secure bootchain exploit."),
            ("casual", "Bro I have a PS5 slim sitting on 8.00, can I use the BD-J disc method or do I need the digital webkit?"),
            ("modder", "BD-J works if you have the disc drive edition! Burn the exploit iso onto a BD-RE disc. If you have the digital edition without disc drive, stay put on 8.00 and wait for the webkit chain to be released publicly."),
            ("troll", "Sony charging $700 for PS5 Pro while modders are unlocking 60fps on base PS5 for free 💀💀💀"),
            ("dev", "Itemzflow dumping speeds over USB 3.2 Gen 2 to an external Samsung 990 Pro are hitting over 450 MB/s. Backed up my 90GB Gran Turismo 7 in under 4 minutes.")
        ]
    },
    {
        "id": "tut-switch-oled-picofly-guide",
        "channel_id": "c/technology",
        "flair": "HARDWARE MOD",
        "author_tag": "hardware",
        "title": "[HARDWARE MOD] Nintendo Switch OLED Picofly RP2040 Micro-Soldering Guide: DAT0 Adapter vs Kamikaze Modding",
        "content": """The Nintendo Switch OLED (Mariko revision) features a revised BGA architecture where the eMMC flash memory is soldered directly beneath the shield, eliminating the removable daughterboard found on the V1/V2 models. To glitch the Tegra X1+ (T210B01) processor, an RP2040 micro-modchip (Picofly) must intercept the `DAT0` line during bootloader execution.

In this guide, we break down the micro-soldering procedure, DAT0 ribbon placement, diagnostic blink codes, and emuMMC software configuration.

---

### Required Tools & Materials
* **Modchip**: Waveshare RP2040-Zero or dedicated Picofly Core ribbon board flashed with Picofly v2.73 firmware.
* **Soldering Iron**: Fine micro-pencil tip (TS100-I or Pinecil with short tip) set to **330°C - 340°C**.
* **Wire**: 0.1mm enameled copper jumper wire (polyurethane coated for self-fluxing).
* **Flux**: High-grade no-clean tacky flux (Amtech NC-559-V2 or Chip Quik).
* **Microscope / Magnifier**: At least 20x magnification (0.1mm trace work is impossible with the naked eye).
* **Multimeter**: For diode mode continuity testing.

---

### Phase 1: DAT0 Ribbon Installation
You have two choices for connecting the `DAT0` eMMC line:
1. **DAT0 Adapter Ribbon (Recommended)**: A flexible PCB with a tiny contact blade that slips underneath the BGA eMMC chip to touch ball `B5`.
2. **Kamikaze Mod (High Risk)**: Dremeling / scratching the motherboard layers with a scalpel to expose the internal copper via. Do NOT attempt this unless you have years of PCB trace repair experience!

**Testing the DAT0 connection**:
Place your multimeter in **Diode Mode**. Connect red probe to Motherboard Ground (shield frame) and black probe to the DAT0 pad on the adapter ribbon.
* **Target Reading**: `0.60V - 0.75V`.
* If reading is `0L` (open loop): The contact pin has slipped and is not touching ball B5. Re-align and re-seat.
* If reading is `< 0.20V`: You have shorted against an adjacent ground ball. Clean and adjust.

---

### Phase 2: Wiring the Rest of the Points
* **CLK (Clock)**: 47-ohm inline resistor point on the APU shield capacitor array.
* **CMD (Command)**: eMMC CMD trace test pad on top side of motherboard.
* **RST (Reset)**: APU reset trace.
* **3.3V & GND**: Power rail taken from the decoupling capacitors near the power management IC.

---

### Phase 3: Picofly LED Blink Code Diagnostics
Once wired and powered, the onboard RGB/Blue LED on the RP2040 will pulse to report status:
* `*=*` (Short blue pulse, long pause, green): **Glitch Success!** Console will immediately boot into Hekate bootloader.
* `*` (Continuous blinking blue): Still attempting glitch timings.
* `**` (Two short blinks): RST line shorted or disconnected.
* `***` (Three short blinks): CMD point error.
* `****` (Four short blinks): DAT0 line not responding. Check diode reading!

---

### Phase 4: Software Setup (Hekate & Atmosphere)
1. Format your 512GB / 1TB MicroSD card with **FAT32** using GUIformat (never use exFAT as Nintendo's exFAT driver causes filesystem corruption).
2. Download the latest Hekate (v6.2.2) and Atmosphere (v1.8.0).
3. In Hekate > Tools > Partition SD Card, allocate **29 GB for emuMMC**.
4. In `bootloader/exosphere.ini`, ensure:
   ```ini
   [exosphere]
   debugmode=1
   perform_custom_unittype_check=0
   blank_prodinfo_sysmmc=0
   blank_prodinfo_emummc=1
   ```
5. `blank_prodinfo_emummc=1` blanks your console's unique certificates inside the virtual emuMMC, ensuring you can play homebrew and offline mods without risking an immediate hardware BAN on your stock SysNAND!""",
        "video": {
            "title": "Switch OLED Micro-Soldering Picofly RP2040 Step-by-Step",
            "embed_url": "https://www.youtube-nocookie.com/embed/3A_sX_H02oQ",
            "provider": "youtube",
            "duration": "28:15"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80",
                "caption": "Microscope view of 0.1mm jumper wire soldered to clock test point",
                "alt": "Microchip soldering under microscope"
            },
            {
                "url": "https://images.unsplash.com/photo-1612287233215-68045610d486?auto=format&fit=crop&w=1000&q=80",
                "caption": "Hekate bootloader displaying clean partition layout on OLED panel",
                "alt": "Nintendo Switch console"
            }
        ],
        "comments": [
            ("solder-pro", "Excellent guide. One critical note: please apply a drop of UV curing solder mask resin over the DAT0 ribbon blade once you verify your 0.68V reading. If you assemble the console without resin, the thermal expansion from the Tegra heatsink will cause the blade to walk off the ball after 2 weeks."),
            ("newbie", "My hands were shaking so bad trying to solder the CLK resistor point lol. You definitely need flux and 0.1mm wire, standard 0.5mm solder wire will bridge everything."),
            ("skeptic", "Why not just buy an unpatched V1 switch on eBay and use a $3 plastic RCM jig?"),
            ("modder", "Because the OLED screen makes a massive difference! The deep blacks and 7-inch display combined with battery life that lasts twice as long as the V1 unpatched model is night and day."),
            ("purist", "Blanking prodinfo in emuMMC is the secret sauce. I've had my modded OLED for 18 months, play homebrew on emuMMC, and reboot into stock SysNAND to play Mario Kart online on official servers with zero bans."),
            ("troll", "Nintendo ninja lawyers entering the chat with a cease and desist in 3... 2... 1... 🥷")
        ]
    },
    {
        "id": "tut-shadps4-bloodborne-pc-setup",
        "channel_id": "c/gaming",
        "flair": "TUTORIAL / GUIDE",
        "author_tag": "emulation",
        "title": "[STEP-BY-STEP] ShadPS4 v0.4.0 Setup: Play Bloodborne on PC at 4K 60FPS (Shader Fixes & Crash Prevention)",
        "content": """The open-source PlayStation 4 emulator **ShadPS4** has made miraculous progress over recent weeks. What was previously an unbootable game now runs start-to-finish on modern PC hardware. With the latest vertex pipeline patches and sound backend updates, you can now experience Bloodborne at native 4K 60FPS on your PC.

Here is the definitive guide to configuring ShadPS4 for maximum frame rates and zero crashes.

---

### Hardware Requirements
* **CPU**: Modern x86-64 with AVX2 instruction set (AMD Ryzen 5000/7000/9000 or Intel 12th/13th/14th Gen).
* **GPU**: Vulkan 1.3 compliant GPU with at least 8GB VRAM (NVIDIA RTX 3070 / 4070 or AMD RX 6700 XT / 7800 XT).
* **RAM**: 16 GB minimum (32 GB strongly recommended for shader compilation cache).
* **Storage**: Fast NVMe SSD (Shader caching will stutter heavily on mechanical HDDs).

---

### Step 1: Extracting PS4 System Modules & Game Files
1. Dump your legitimate copy of Bloodborne (`CUSA03173` or `CUSA00207`) from your jailbroken PS4 using Itemzflow or FTP. Ensure the game is updated to **Patch 1.09**.
2. Dump your console's decrypted system modules (`libkernel.sprx`, `libSceSaveData.sprx`, `libScePosix.sprx`) and place them in the `/user/system/` directory of ShadPS4.
3. In ShadPS4 GUI, click `File > Install PKG / Decrypted Game` and select your Bloodborne `eboot.bin` folder.

---

### Step 2: Essential Patches & Fixes
Bloodborne has specific PS4 engine quirks that cause visual anomalies in emulation without community patches:
1. **Vertex Explosion Fix**: Fixes character clothing and beast fur stretching infinitely across the screen. Download the latest `vertex_patch.bin` into `shadps4/patches/CUSA03173/`.
2. **60FPS Unlocked Patch**: Bloodborne's game logic was hardcoded to 30Hz delta time. The community patch decouples animation timing from frame rate:
   ```ini
   # Bloodborne 1.09 60 FPS Patch
   [60FPS_Patch]
   address = 0x002B4870
   bytes = 90 90 90 90
   ```
3. **Chromatic Aberration & Motion Blur Removal**: Greatly enhances image clarity at 1440p and 4K resolutions.

---

### Step 3: Audio Stutter Workaround
Under `Settings > Audio`:
* Audio Backend: Select **Cubeb**.
* Buffer Size: Set to **512 frames** (prevents audio de-sync and clicking noise during heavy combat in Central Yharnam).

---

### Step 4: Controller & DualSense Haptics
ShadPS4 includes native SDL2 controller mapping. Plug your PS5 DualSense or PS4 DualShock 4 via USB-C, go to `Settings > Input`, and select `DualSense Wireless Controller`. Vibration and motion sensors for gestures are fully functional!""",
        "video": {
            "title": "Bloodborne 4K 60FPS on PC (RTX 4080 + Ryzen 7800X3D - ShadPS4 v0.4)",
            "embed_url": "https://www.youtube-nocookie.com/embed/5W_w_G88Fqo",
            "provider": "youtube",
            "duration": "16:40"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80",
                "caption": "ShadPS4 graphics settings panel with Vulkan API and shader cache options",
                "alt": "PC gaming screen settings"
            },
            {
                "url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80",
                "caption": "Bloodborne running at smooth 60fps in Central Yharnam on PC",
                "alt": "Gamer battlestation"
            }
        ],
        "comments": [
            ("pc-elitist", "Sony: We cannot port Bloodborne to PC because the engine is too complex. Random open-source devs in their bedrooms: Hold our beer 🍺"),
            ("tester", "Can confirm! Ryzen 7 7800X3D + RTX 4070 Super running locked 60fps at 1440p. Shader compilation stuttered for the first 10 minutes in the clinic, but once the pipeline compiled, it's buttery smooth!"),
            ("casual", "Does this work on Steam Deck or is the GPU too weak?"),
            ("emulation", "Steam Deck can currently boot to the main menu and get into the graveyard, but hits around 20-25 fps with heavy memory pressure. Give the developers a few more months to optimize compute shaders for RDNA2."),
            ("lore-master", "Finally being able to play Bloodborne without chromatic aberration smearing the entire screen is an absolute revelation. Yharnam gothic architecture is breathtaking in 4K."),
            ("skeptic", "Are the memory leak crashes during the Father Gascoigne cutscene fixed in v0.4?"),
            ("coder", "Yes! Pull request #894 merged the fix for the audio stream buffer overflow that caused the cutscene memory crash. Works without issues now.")
        ]
    },
    {
        "id": "tut-ios-sidestore-zero-revokes",
        "channel_id": "c/technology",
        "flair": "TUTORIAL / GUIDE",
        "author_tag": "mobile-dev",
        "title": "[GUIDE] iOS 17 & 18 Sideloading: SideStore + WireGuard Local VPN (Zero 7-Day Revokes, No PC Needed!)",
        "content": """Sideloading on iOS has always been plagued by Apple's strict 7-day expiration timer on free developer provisioning profiles. Traditional AltStore requires your computer running AltServer on the same local Wi-Fi to refresh certificates every week.

**SideStore** solves this permanently. By executing a local mini-server directly on your iPhone or iPad, SideStore tricks iOS into refreshing its own certificates on-device over a dummy loopback WireGuard VPN. You only touch a computer ONCE during initial installation.

---

### What Can You Run with Sideloading?
* **uYouEnhanced**: Ad-free YouTube with SponsorBlock, Return YouTube Dislike, background audio, and OLED dark mode.
* **Delta / RetroArch**: Full Nintendo DS, N64, GBA, and PS1 emulation.
* **UTM SE**: Virtualize Windows XP, Windows 98, or Alpine Linux on your iPad.
* **Apollo for Reddit**: Using your own free Reddit API client key.

---

### Step-by-Step Setup
1. **Initial Pairing File Generation**:
   * Connect your iPhone to your PC or Mac via USB cable.
   * Open SideServer (or JitterbugPair) on your computer to generate `your_device.mobiledevicepairing`.
   * Save this pairing file directly to your iPhone's Files app in the `SideStore` folder.
2. **WireGuard Local Loopback VPN Setup**:
   * Download the official **WireGuard** app from the iOS App Store.
   * Import the `SideStore.conf` profile:
     ```ini
     [Interface]
     PrivateKey = (generated)
     Address = 10.7.0.1/32
     DNS = 1.1.1.1

     [Peer]
     PublicKey = (generated)
     AllowedIPs = 10.7.0.1/32
     Endpoint = 127.0.0.1:22
     ```
   * *Note*: This VPN does not route your internet traffic anywhere—it simply binds iOS lockdown services to local port 22 so SideStore can talk to device pairing APIs without needing a computer!
3. **Installing SideStore**:
   * Sideload the `SideStore.ipa` once via your computer.
   * Trust your developer certificate in `Settings > General > VPN & Device Management`.
   * Enable `Developer Mode` in `Settings > Privacy & Security` (requires a quick reboot).
4. **Enabling Perpetual Auto-Refresh**:
   * Open the native **Shortcuts** app on iOS.
   * Create an Automation: `When connected to power at 3:00 AM`.
   * Action: `Open SideStore WireGuard VPN > Refresh SideStore Apps > Disconnect WireGuard VPN`.
   * Congratulations! Your apps will now refresh automatically every single night while your phone charges. You will never see a 7-day expired app error again!""",
        "video": {
            "title": "Permanent iOS Sideloading with SideStore (No PC Required After Setup)",
            "embed_url": "https://www.youtube-nocookie.com/embed/9bZkp7q19f0",
            "provider": "youtube",
            "duration": "11:05"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1510519138111-5582f3423c28?auto=format&fit=crop&w=1000&q=80",
                "caption": "iPhone displaying WireGuard loopback configuration and SideStore installed apps",
                "alt": "Modern smartphone interface"
            }
        ],
        "comments": [
            ("apple-user", "This setup changed my entire iOS experience. Having uYouEnhanced without ads and background playback on my iPhone 15 Pro without jailbreaking is incredible."),
            ("tinkerer", "The WireGuard loopback trick is pure genius. Apple's sandbox prevents apps from talking to local socket APIs directly, but looping through a local VPN tunnel completely bypasses the restriction."),
            ("casual", "Does this still have the 3 app limit?"),
            ("mobile-dev", "Yes, free Apple IDs are restricted by Apple's server-side certificate limit to 3 active sideloaded apps at a time (1 is SideStore itself, so you get 2 heavy apps like uYou and Delta). If you want unlimited apps, you need a paid $99/year developer account or a signing certificate service like Maplesign/Kravat."),
            ("troll", "EU users with official sideloading watching rest of the world do backflips with WireGuard VPNs just to install an emulator 💀💀💀"),
            ("sysadmin", "The nightly automation has been running for 4 months straight on my 14 Pro without failing once. 10/10 guide.")
        ]
    },
    {
        "id": "tut-deepseek-r1-local-gpu",
        "channel_id": "c/privacy-ai",
        "flair": "TECH DISCUSSION",
        "author_tag": "ai-research",
        "title": "[LOCAL AI] Running DeepSeek-R1 32B & Qwen 2.5 on a Single 16GB Consumer GPU (Ollama + vLLM)",
        "content": """Why pay monthly subscriptions for closed-source AI APIs when open-weights reasoning models like **DeepSeek-R1** and **Qwen 2.5** match or exceed proprietary frontier models while keeping 100% of your data private on your own hardware?

In this guide, we cover how to fit and run the ultra-capable **DeepSeek-R1-Distill-Qwen-32B** model on a single 16GB consumer GPU (such as an NVIDIA RTX 4070 Ti Super 16GB, RTX 4080, or RTX 3090 24GB) using modern quantization and KV-cache optimizations.

---

### Hardware VRAM Math
* Unquantized 32B FP16 weights require **64 GB VRAM**.
* **4-bit Quantization (GGUF Q4_K_M / AWQ / EXL2)** reduces weights down to **18.5 GB**.
* Using **Q3_K_M** or **EXL2 3.5bpw** + quantized 8-bit KV cache fits the entire model into **14.2 GB VRAM**, leaving 1.8 GB headroom for full 8,192 token reasoning context!

---

### Method 1: The One-Click Setup with Ollama
1. Install Ollama:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```
2. Pull the optimized quantized 32B reasoning model:
   ```bash
   ollama run deepseek-r1:32b-q4_K_M
   ```
3. Set environment variable to enable flash attention:
   ```bash
   export OLLAMA_FLASH_ATTENTION=1
   export OLLAMA_KV_CACHE_TYPE=q8_0
   ```
   *Speed*: On an RTX 4080 (16GB), you will achieve **28 to 34 tokens per second** during reasoning generation!

---

### Method 2: High-Throughput vLLM Server + Open-WebUI
For production API serving or beautiful ChatGPT-like web UI:
1. Launch vLLM with AWQ 4-bit quantization:
   ```bash
   vllm serve casperhansen/deepseek-r1-distill-qwen-32b-awq \\
     --gpu-memory-utilization 0.92 \\
     --max-model-len 8192 \\
     --kv-cache-dtype fp8 \\
     --trust-remote-code
   ```
2. Run Open-WebUI via Docker:
   ```bash
   docker run -d -p 3000:8080 -e OPENAI_API_BASE_URL=http://localhost:8000/v1 \\
     ghcr.io/open-webui/open-webui:main
   ```
3. Open `http://localhost:3000` in your browser. You now have your own self-hosted, unmonitored, private reasoning engine with step-by-step thinking traces!""",
        "video": {
            "title": "DeepSeek-R1 32B Benchmark & Local GPU Setup Guide",
            "embed_url": "https://www.youtube-nocookie.com/embed/aircAruvnKk",
            "provider": "youtube",
            "duration": "18:32"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80",
                "caption": "GPU monitoring showing 14.1 GB VRAM allocation and 32 t/s throughput",
                "alt": "Data center server racks"
            }
        ],
        "comments": [
            ("homelabber", "DeepSeek-R1 reasoning tokens on coding tasks are phenomenal. I gave it a complex Rust async deadlock problem and it thought through 1,200 tokens of internal reasoning before spitting out a flawless fix."),
            ("hardware-nerd", "Bought two used RTX 3090s off eBay for $650 each and linked them via NVLink. Running the full 70B Llama 3.3 model at 4-bit with 48GB VRAM total. Beats paying OpenAI $20/month every day of the week."),
            ("casual", "What about RTX 3060 12GB? Can it run anything good?"),
            ("ai-research", "Yes! On a 12GB card, run `deepseek-r1:14b` or `qwen2.5:14b-instruct-q4_K_M`. The 14B model takes around 8.5 GB VRAM and generates ~42 tokens per second on a 3060. It punches far above its weight."),
            ("privacy-advocate", "Zero corporate telemetry, zero logs sent to cloud providers, zero copyright filter censorship. This is what computing was always meant to be."),
            ("troll", "Sam Altman seeing people run better models on their own PCs for free: 👁️👄👁️")
        ]
    },
    {
        "id": "tut-cs2-windows11-latency-tuning",
        "channel_id": "c/gaming",
        "flair": "TUTORIAL / GUIDE",
        "author_tag": "esports",
        "title": "[PERFORMANCE] Ultimate CS2 & Valorant Windows 11 Latency Optimization Guide (DPC, Timer Resolution, Core Isolation)",
        "content": """Micro-stutters, erratic sub-tick hit registration in CS2, and input delay in competitive shooters are often caused by hidden Windows 11 OS bottlenecks rather than raw frame rates. Even on a high-end system pushing 400 FPS, erratic DPC (Deferred Procedure Call) latency can cause mouse movement to feel floaty and unresponsive.

Here is the systematic, measurement-driven guide to achieving sub-0.5ms system latency.

---

### Step 1: Diagnose with LatencyMon
1. Download [LatencyMon](https://www.resplendence.com/latencymon).
2. Start monitoring and play 15 minutes of competitive deathmatch.
3. Look at the `Drivers` tab sorted by highest DPC execution time:
   * `nvlddmkm.sys` (NVIDIA graphics driver): Should be `< 250 µs`.
   * `ndis.sys` / `tcpip.sys` (Network interface): Should be `< 100 µs`.
   * `wdf01000.sys` (Windows Driver Framework): Should be `< 80 µs`.

---

### Step 2: BIOS Level Tuning
* **Disable HPET (High Precision Event Timer)**: HPET incurs high CPU cycle overhead compared to TSC (Time Stamp Counter).
* **Disable C-States & SpeedStep/Cool'n'Quiet**: Prevents CPU core frequency down-clocking during millisecond gaps between game frames.
* **Enable XMP / EXPO**: Memory sub-timings drastically affect 0.1% low FPS.

---

### Step 3: Windows Kernel & BCD Settings
Run Administrator Command Prompt:
```cmd
:: Enforce invariant TSC timer
bcdedit /set useplatformclock false

:: Disable dynamic tick power saving
bcdedit /set disabledynamictick yes

:: Disable synthetic timer virtualization
bcdedit /set useplatformtick yes
```

---

### Step 4: MSI (Message Signaled Interrupts) Mode Utility
By default, Windows uses legacy line-based interrupts (IRQ sharing) for graphics cards:
1. Download `MSI Utility v3`.
2. Check the box for your NVIDIA / AMD GPU.
3. Set interrupt priority from `Undefined` to **High**.
4. Click Apply and reboot. This eliminates IRQ conflicts between your GPU and USB mouse controllers.

---

### Step 5: Core Isolation & Virtualization-Based Security (VBS)
Windows 11 enables Memory Integrity (HVCI) by default, running the entire OS inside a Hyper-V hypervisor container:
* Go to `Windows Security > Device Security > Core Isolation details`.
* Toggle **Memory Integrity to OFF** on dedicated gaming machines.
* *Result*: 8% to 15% reduction in CPU frame render times and 1% low frame stabilization!""",
        "video": {
            "title": "Fixing DPC Latency & Input Lag in Windows 11 (CS2 & Valorant Tested)",
            "embed_url": "https://www.youtube-nocookie.com/embed/eWvFw3g_T6w",
            "provider": "youtube",
            "duration": "13:48"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80",
                "caption": "Competitive CS2 setup with 360Hz OLED and low-latency mouse tracking",
                "alt": "Esports gaming setup"
            }
        ],
        "comments": [
            ("esports-pro", "Toggling off Memory Integrity in Windows 11 completely fixed my CS2 micro-stutters. I was getting crazy frametime spikes in smokes on Mirage and now it's a completely flat line."),
            ("hardware-geek", "The MSI Mode Utility is mandatory for any modern PC. Changing GPU IRQ to High priority dropped my LatencyMon nvlddmkm.sys spike from 850µs to 72µs!"),
            ("casual", "Is it safe to turn off Core Isolation? Will I get viruses??"),
            ("security-analyst", "If you're not downloading random cracked executables from sketchy Telegram channels, standard Windows Defender real-time antivirus is more than enough. Core Isolation is designed for enterprise corporate laptops to prevent ring-0 kernel DMA attacks."),
            ("troll", "Bro did all this optimization just to miss spray on someone looking the wrong way 💀💀"),
            ("coder", "Don't forget to set raw input in CS2 console: `m_rawinput 1` and disable Windows mouse pointer acceleration in Control Panel.")
        ]
    },
    {
        "id": "tut-bazzite-handheld-dualboot",
        "channel_id": "c/gaming",
        "flair": "TUTORIAL / GUIDE",
        "author_tag": "linux-dev",
        "title": "[TUTORIAL] Bazzite Linux Handheld Dual-Boot: SteamOS 3.6 Experience on ROG Ally, Legion Go & Steam Deck",
        "content": """Windows 11 on handheld gaming devices is an exercise in frustration: clunky touchscreen navigation, broken modern standby sleep mode that cooks your battery in your backpack, and background updates interrupting games.

**Bazzite** is a custom Fedora Silverblue immutable operating system that brings the complete Valve SteamOS Gamescope gaming console experience to non-Valve hardware (ASUS ROG Ally, Lenovo Legion Go, GPD Win, and AYANEO).

---

### Why Bazzite Beats Windows on Handhelds
* **Instant Sleep & Resume**: Press the power button once to suspend any AAA game in mid-action, put it away for 3 days, and resume in 1.5 seconds.
* **Valve SteamOS Game Mode**: Full gamepad-navigated UI, per-game TDP sliders, manual GPU clock scaling, and built-in FSR upscaling.
* **Gyro Aiming & Back Paddles**: Native support for ASUS and Lenovo extra rear buttons without needing bulky proprietary background software (Armoury Crate / Legion Space).

---

### Step-by-Step Installation
1. **Shrink Windows Partition**:
   * On your handheld, press `Win + X > Disk Management`.
   * Right-click your `C:` drive and select `Shrink Volume`. Shrink by at least **128 GB** (or 256 GB) to leave unallocated space for Bazzite.
2. **Download & Flash Bazzite**:
   * Visit [bazzite.gg](https://bazzite.gg) and select your specific handheld model (e.g. `Bazzite - ASUS ROG Ally / Ally X`).
   * Flash the ISO image to a USB-C flash drive using **BalenaEtcher** or **Rufus**.
3. **Boot & Install**:
   * Hold `Volume Down + Power` to enter boot menu. Select your USB drive.
   * In the installer, select `Automatic Partitioning` on the Free Unallocated Space.
   * Bazzite will install the `rEFInd` graphical dual-boot bootloader automatically.
4. **First Boot into Steam Game Mode**:
   * On reboot, you will be greeted by the iconic Steam Deck setup animation.
   * Log into your Steam account.
   * Install Decky Loader from the desktop menu for custom themes, TDP controls, and battery monitors!""",
        "video": {
            "title": "Bazzite Turn Your ROG Ally into a Steam Deck (Installation Guide)",
            "embed_url": "https://www.youtube-nocookie.com/embed/6i2x7w_s_r8",
            "provider": "youtube",
            "duration": "15:20"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1612287233215-68045610d486?auto=format&fit=crop&w=1000&q=80",
                "caption": "Handheld PC booting into custom Bazzite Gamescope session with instant sleep/resume",
                "alt": "Handheld gaming device"
            }
        ],
        "comments": [
            ("ally-owner", "Bazzite saved my ROG Ally from being sold. Windows sleep mode drained 30% battery overnight every single time. On Bazzite, I press sleep, come back tomorrow, and it lost 2% battery. Exactly like a Nintendo Switch."),
            ("legion-user", "Does the Legion Go trackpad and scroll wheel work properly in game mode?"),
            ("linux-dev", "Yes! Bazzite maps the optical sensor trackpad as a native mouse in desktop mode and as a Steam haptic touchpad in Game Mode. Works out of the box."),
            ("casual", "What about games with anti-cheat like Fortnite and Valorant?"),
            ("veteran", "Fortnite, Valorant, and CoD Warzone will NOT work on Linux because their kernel anti-cheats (Vanguard / Ricochet) block Proton. That is why we dual-boot! Boot into Windows for those 2-3 games, and use Bazzite for everything else."),
            ("troll", "Microsoft watching handheld makers ditch Windows 11 the moment an open source alternative exists lmao")
        ]
    },
    {
        "id": "tut-re-unity-unreal-games",
        "channel_id": "vault-guides",
        "flair": "TUTORIAL / GUIDE",
        "author_tag": "reverse-eng",
        "title": "[DEV & REVERSE-ENG] Decompiling Unity & Unreal Engine Games: Il2CppDumper, AssetStudio & Ghidra Setup",
        "content": """Game preservation, translation modding, and technical security analysis frequently require examining compiled game assets and executable binaries.

This technical guide demonstrates how to reconstruct symbol tables, dump metadata, and analyze game logic for modern Unity (IL2CPP) and Unreal Engine 5 titles.

---

### Part 1: Unity IL2CPP De-obfuscation
Modern Unity titles do not ship with readable C# Mono bytecode (`Assembly-CSharp.dll`). Instead, Unity's Ahead-Of-Time (AOT) compiler converts C# intermediate language into C++ before compiling into machine code (`GameAssembly.dll`).

**Step 1: Locating the Files**:
* `GameAssembly.dll` (The compiled C++ native binary)
* `[GameName]_Data/il2cpp_data/Metadata/global-metadata.dat` (Type strings, method signatures, field offsets)

**Step 2: Reconstructing Symbol Headers with Il2CppDumper**:
1. Run [Il2CppDumper](https://github.com/Perfare/Il2CppDumper):
   ```cmd
   Il2CppDumper.exe GameAssembly.dll global-metadata.dat output_folder
   ```
2. Il2CppDumper parses the metadata pool and produces:
   * `dump.cs`: Complete C# dummy class hierarchies with reconstructed method signatures and memory offsets.
   * `script.py`: IDA Pro / Ghidra python script to automatically rename thousands of `sub_7FF...` functions to their actual method names (e.g. `PlayerController$$TakeDamage`).

**Step 3: Loading into Ghidra**:
* Open Ghidra, create a new project, and import `GameAssembly.dll`.
* Run `Script Manager > script.py`.
* In seconds, your decompiler window populates with legible class names, function arguments, and struct fields!

---

### Part 2: Extracting Assets with AssetStudio
To inspect 3D models, textures, animations, and audio clips:
1. Open [AssetStudio GUI](https://github.com/Razmoth/AssetStudio).
2. Click `File > Load Folder` and select the game's Data directory.
3. Switch to the `Asset List` tab. Filter by `Texture2D`, `Mesh`, `AudioClip`, or `TextAsset`.
4. Right-click and choose `Export Selected Assets` to PNG / FBX / WAV formats!

---

### Part 3: Unreal Engine FModel Analysis
For Unreal Engine 4 and 5 games packed into `.pak`, `.utoc`, and `.ucas` container files:
* Use **FModel** with the game's AES decryption key.
* Browse the virtual directory tree, preview materials, skeletal meshes, and audio blueprints in real-time.""",
        "video": {
            "title": "Reverse-Engineering Unity IL2CPP Games with Il2CppDumper & Ghidra",
            "embed_url": "https://www.youtube-nocookie.com/embed/503MWQx3kYw",
            "provider": "youtube",
            "duration": "21:10"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80",
                "caption": "Ghidra decompiler displaying reconstructed Unity C# method signatures",
                "alt": "Reverse engineering code on monitor"
            }
        ],
        "comments": [
            ("mod-creator", "Il2CppDumper combined with BepInEx 6 pre-releases has made Unity modding so pleasant. Being able to hook native C++ methods with Harmony patches in C# without touching assembly is wizardry."),
            ("security-dev", "It's always wild how many game developers leave sensitive API tokens and unencrypted backend webhook URLs inside global-metadata.dat thinking nobody can read IL2CPP builds."),
            ("casual", "Can you use this to extract 3D character models for 3D printing?"),
            ("3d-artist", "Yes! AssetStudio exports meshes directly to .obj or .fbx. Open them in Blender, clean up non-manifold geometry, and export to STL for slicing. Done it dozens of times."),
            ("troll", "Game devs spending 3 years building an anti-cheat only for a 16 year old with Ghidra to bypass it in 20 minutes.")
        ]
    },
    {
        "id": "tut-android-15-kernelsu-trickystore",
        "channel_id": "c/technology",
        "flair": "TUTORIAL / GUIDE",
        "author_tag": "android-dev",
        "title": "[GUIDE] Android 15 Rooting: KernelSU Next & TrickyStore (Bypass Google Play Integrity Strong Verdict)",
        "content": """Traditional root methods like Magisk operate in userland and rely on ptrace injection (`zygisk`), making them trivial for Google's Play Integrity API and aggressive banking applications (Revolut, Google Wallet, banking apps) to detect.

**KernelSU Next** operates directly within the Linux kernel space (GKI - Generic Kernel Image). Because root permissions are granted directly by system calls inside the kernel, userland apps cannot detect root artifacts or su binaries. Combined with **TrickyStore**, your device can pass even the dreaded **MEETS_STRONG_INTEGRITY** hardware-backed attestation!

---

### Prerequisites
* Unlocked bootloader on any Android 13, 14, or 15 device running GKI kernel (Kernel version `5.10.x`, `5.15.x`, or `6.1.x`).
* Fastboot tools on PC.
* Custom keystore keybox XML file (for TrickyStore).

---

### Step 1: Flashing KernelSU Next Boot Image
1. Identify your kernel version in `Settings > About Phone > Android Version > Kernel Version`.
2. Download the matching KernelSU GKI `boot.img` from official releases.
3. Boot into fastboot mode and flash:
   ```bash
   fastboot flash boot ksu_boot.img
   fastboot reboot
   ```
4. Install the **KernelSU Next Manager** APK. Open it: status will display **"Working (Kernel Mode)"**.

---

### Step 2: Hiding Root from Userland
1. In KernelSU Manager, install the **Zygisk Next** module.
2. Install **Shamiko** for namespace isolation.
3. Configure the Root Profile: by default, NO APP is granted root access unless explicitly toggled in the manager. To banking apps, your device appears 100% unrooted stock.

---

### Step 3: Conquering Play Integrity with TrickyStore
Google recently enforced hardware-backed key attestation, causing unlocked bootloaders to fail `MEETS_STRONG_INTEGRITY`.
1. Install the **TrickyStore** module.
2. Place a valid `keybox.xml` file in `/data/adb/tricky_store/keybox.xml`.
3. In `/data/adb/tricky_store/target.txt`, list target applications:
   ```text
   com.google.android.gms
   com.google.android.apps.walletnfcrel
   com.revolut.revolut
   ```
4. Open the Play Integrity API Checker app. You will now get green checkmarks for:
   * `MEETS_BASIC_INTEGRITY` ✅
   * `MEETS_DEVICE_INTEGRITY` ✅
   * `MEETS_STRONG_INTEGRITY` ✅
5. Google Wallet contactless tap-to-pay and banking apps work flawlessly without warnings!""",
        "video": {
            "title": "KernelSU Next + TrickyStore Android 15 Root Setup (Strong Integrity Fixed)",
            "embed_url": "https://www.youtube-nocookie.com/embed/fJ9rUzIMcZQ",
            "provider": "youtube",
            "duration": "12:18"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=80",
                "caption": "Pixel device passing Strong Play Integrity check with KernelSU Next",
                "alt": "Modern smartphone running apps"
            }
        ],
        "comments": [
            ("dev-mod", "KernelSU is the greatest advancement in Android modding since SuperSU. The fact that an app running in user space cannot even inspect kernel syscall hooks makes cat-and-mouse detection games obsolete."),
            ("bank-user", "Can confirm Google Wallet tap-to-pay worked at the grocery store this morning on my rooted Pixel 8 Pro running Android 15. TrickyStore is essential."),
            ("casual", "Where do people get valid keybox.xml files? Aren't they banned quickly?"),
            ("android-dev", "Keyboxes get leaked from old OEM factory firmware tools or test devices. As long as you don't share the keybox publicly on GitHub, private ones can last for years without Google revoking the certificate."),
            ("skeptic", "Does this trip Samsung Knox if done on a Galaxy device?"),
            ("veteran", "YES. Unlocking bootloader on ANY Samsung device blows the physical eFuse (Knox 0x1) permanently. Do not do this on a Samsung if you care about Secure Folder or Samsung Pass.")
        ]
    },
    {
        "id": "tut-retroarch-crt-megabezel",
        "channel_id": "c/gaming",
        "flair": "TUTORIAL / GUIDE",
        "author_tag": "retro-gamer",
        "title": "[GUIDE] RetroArch CRT Mega Bezel Reflection Shader: Turn Any 4K Screen into a 1990s Trinitron",
        "content": """Pixel art games from the 8-bit, 16-bit, and 32-bit eras (SNES, Genesis, PlayStation 1, Saturn) were deliberately drawn by artists to take advantage of the phosphor bleed, scanline bloom, and shadow masks of cathode-ray tube (CRT) televisions. On raw 4K LCD/OLED panels, raw square pixels look harsh, flat, and disproportioned.

The **HSM Mega Bezel Reflection Shader** suite simulates the entire physical experience: curved glass reflections, phosphor grid simulation, dynamic ambient bezel illumination, and zero-latency runahead.

---

### Step 1: Downloading & Installing HSM Mega Bezel
1. Download the complete shader pack from the [Libretro Forums HSM Mega Bezel thread](https://forums.libretro.com).
2. Extract the `shaders_slang/bezel` folder into your RetroArch directory: `RetroArch/shaders/shaders_slang/bezel/Mega_Bezel/`.
3. In RetroArch `Settings > Video > Output`, ensure your Video Driver is set to **Vulkan** or **Direct3D 11/12** (OpenGL does not have enough compute shader bandwidth for real-time reflections).

---

### Step 2: Choosing Your Display Preset
Navigate to `Quick Menu > Shaders > Load Preset > shaders_slang > bezel > Mega_Bezel > Presets`:
* **Mega_Bezel/Presets/Base_CRT/MBZ__1__ADV__GDV.slangp**: Highest fidelity Guest-DrVenom CRT shader with dynamic real-time frame reflections bouncing off the simulated plastic TV bezel.
* **Aperture Grille (Sony Trinitron)**: Sharp vertical RGB phosphor stripes with vibrant color separation.
* **Slot Mask (PVM / Consumer TV)**: Characteristic staggered brick-style phosphor layout reminiscent of 1990s living room TVs.

---

### Step 3: Eliminating Input Lag with Sub-Frame Runahead
Modern displays introduce 1 to 2 frames of buffer delay. RetroArch can actually achieve **LOWER latency than original CRT hardware** using Runahead:
1. Go to `Settings > Latency`.
2. Toggle `Run-Ahead to Reduce Latency` to **ON**.
3. Set `Number of Frames to Run Ahead`:
   * Super Mario World: `1 frame`
   * Mega Man X: `1 frame`
   * Street Fighter II: `2 frames`
4. The emulator executes frames ahead in memory, rolls back state on controller input, and displays the reaction on the exact current millisecond. Jump input feels instantaneous!""",
        "video": {
            "title": "HSM Mega Bezel CRT Shader Showcase & 4K Setup Guide",
            "embed_url": "https://www.youtube-nocookie.com/embed/Z1BCujX3pw8",
            "provider": "youtube",
            "duration": "14:50"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80",
                "caption": "Mega Bezel shader on 4K OLED reproducing authentic Trinitron phosphor glow",
                "alt": "Retro CRT shader display"
            }
        ],
        "comments": [
            ("crt-enthusiast", "On an LG C3/C4 OLED in a dark room with the MBZ Aperture Grille preset, my brain genuinely forgets I'm looking at a flat OLED panel. The ambient reflection of bright explosions bouncing onto the virtual bezel is hypnotic."),
            ("retro-gamer", "Runahead is black magic. Doing frame-perfect Super Mario World Kaizo jumps on a wireless 8BitDo controller with 0ms perceived latency is something I never thought possible on an emulator."),
            ("casual", "Does this require a beefy GPU? My mini PC has an Intel N100."),
            ("emulation-dev", "The ADV (Advanced) preset will definitely lag on an Intel N100 iGPU. Use the `MBZ__3__BASIC` preset instead! It disables the real-time ray-traced bezel reflection but preserves the gorgeous Guest-DrVenom CRT scanline filter at 60fps locked."),
            ("nostalgia", "Castlevania: Symphony of the Night with this shader looks exactly the way my 10-year-old self remembered it on my childhood 14-inch Sony TV. Beautiful work.")
        ]
    },
    {
        "id": "tut-truenas-10g-nas-zfs",
        "channel_id": "c/opensource",
        "flair": "TUTORIAL / GUIDE",
        "author_tag": "sysadmin",
        "title": "[TUTORIAL] 10Gbps Homelab NAS Architecture: TrueNAS SCALE, ZFS RaidZ2 & Cloudflare Tunnels",
        "content": """Building a whisper-quiet, enterprise-grade storage server for under $600 using enterprise decommissioned hardware and consumer parts.

### Hardware Bill of Materials
* **Chassis & Board**: Fractal Node 804 or used 2U Supermicro chassis with IT-mode LSI SAS9211-8i HBA card.
* **Networking**: Used Mellanox ConnectX-3 10GbE SFP+ Dual Port PCIe card ($35 on eBay) + 10Gtek SFP+ DAC copper cables.
* **Storage**: 6x 16TB Seagate Exos enterprise SATA drives in **RaidZ2** (dual disk failure parity, ~64 TB usable).
* **Boot & Cache**: Dual 256GB NVMe mirrored boot pool + 1TB WD Black SN850X for L2ARC and Docker containers.

### TrueNAS SCALE Dataset Configuration
ZFS performance depends entirely on configuring `recordsize` to match your payload:
* **Media / Video Dataset**: `recordsize=1M`, `compression=lz4`. Massive contiguous files stream with near-zero IOPS overhead, saturating 10Gbps (1.1 GB/s sustained).
* **Database / Nextcloud / Docker**: `recordsize=16k` or `64k` to avoid write amplification.
* **Disable atime**: Set `atime=off` across all datasets. Updating access timestamps on read introduces pointless random write IOPS.

### Remote Access Without Port Forwarding
Never expose TrueNAS or SMB to the public internet!
1. Run `cloudflared` (Cloudflare Tunnel) as a lightweight Docker container.
2. In Cloudflare Zero Trust dashboard, route `nas.yourdomain.com` through the tunnel protected by Google OAuth or email OTP passkeys.
3. Access Nextcloud, Immich, and management dashboards securely from anywhere on Earth with zero open ports on your home firewall!""",
        "video": {
            "title": "Ultimate 10Gbps TrueNAS SCALE Homelab Build (ZFS Deep-Dive)",
            "embed_url": "https://www.youtube-nocookie.com/embed/5m3l3_sA99w",
            "provider": "youtube",
            "duration": "24:10"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80",
                "caption": "Mellanox ConnectX-3 10GbE NIC transferring at 1.12 GB/s over ZFS pool",
                "alt": "Server rack hardware"
            }
        ],
        "comments": [
            ("homelab-guy", "Mellanox ConnectX-3 cards are the absolute cheat code of homelabbing. $30 on eBay, Linux kernel drivers are built-in, runs cool with a small heatsink fan. Can't recommend them enough."),
            ("storage-dev", "Setting recordsize to 1M on the video dataset is crucial. People leave it at default 128k and wonder why their 10G link caps out at 350 MB/s. 1M gives you sequential throughput that maxes out the bus."),
            ("casual", "Is RaidZ2 safe enough or do I need offsite backups too?"),
            ("sysadmin", "Raid is NOT a backup! Raid is high availability and uptime. If a power surge fries your PSU or ransomware hits your shares, RaidZ2 won't save you. Follow 3-2-1: 3 copies, 2 different media, 1 offsite encrypted in Cloudflare R2 / AWS S3."),
            ("coder", "Cloudflare Zero Trust tunnels with WARP client make WireGuard feel so outdated. Zero router ports forwarded, SSO passkey login, seamless.")
        ]
    },
    {
        "id": "tut-rpi5-nvme-unbound-dns",
        "channel_id": "c/opensource",
        "flair": "TUTORIAL / GUIDE",
        "author_tag": "homelab",
        "title": "[GUIDE] Raspberry Pi 5 NVMe PCIe Gen3 Boot + Pi-hole & Unbound Encrypted Recursive DNS Resolver",
        "content": """MicroSD cards are the single biggest point of failure in Raspberry Pi homelabs. They wear out quickly under database write loads and cap random 4K read/write speeds at 5-10 MB/s.

The Raspberry Pi 5 includes an official PCIe 2.0/3.0 FPC interface. By attaching an M.2 NVMe HAT, you transform the Pi 5 into a blistering-fast, silent micro-server booting directly from an SSD at 850 MB/s!

### Step 1: Enabling PCIe Gen 3 in Bootloader EEPROM
Edit `/boot/firmware/config.txt`:
```ini
# Enable PCIe external connector
dtparam=pciex1

# Force PCIe Gen 3.0 speed (8.0 GT/s)
dtparam=pciex1_gen=3
```
Update the EEPROM to boot directly from NVMe before SD:
```bash
sudo rpi-eeprom-config --edit
# Change BOOT_ORDER to 0xf416 (NVMe first, then SD, then USB)
```

### Step 2: Pi-hole + Unbound Recursive DNS
Instead of sending every DNS query your household makes to Google (8.8.8.8) or your ISP:
1. Install **Pi-hole** to block network-wide ads, telemetry, smart TV trackers, and mobile ads.
2. Install **Unbound** as an authoritative recursive resolver:
   ```bash
   sudo apt install unbound
   ```
3. Configure Unbound to query the Internet Root DNS Servers (`a.root-servers.net` to `m.root-servers.net`) directly with DNSSEC validation enabled.
4. Point Pi-hole's upstream DNS to `127.0.0.1#5335`.

*Result*: Absolute network privacy, zero third-party DNS logging, encrypted resolution, and sub-1ms DNS cache responses for your entire home network!""",
        "video": {
            "title": "Raspberry Pi 5 NVMe Boot + Unbound Recursive DNS Setup",
            "embed_url": "https://www.youtube-nocookie.com/embed/8v_jZ8_11e0",
            "provider": "youtube",
            "duration": "16:25"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80",
                "caption": "Raspberry Pi 5 with Geekworm NVMe bottom HAT running Unbound DNS",
                "alt": "Raspberry Pi board with NVMe SSD"
            }
        ],
        "comments": [
            ("privacy-fan", "Unbound is so liberating. Knowing my ISP can't see which domains I'm resolving or sell my browsing patterns to data brokers gives such peace of mind."),
            ("linux-guy", "PCIe Gen 3 on Pi 5 has been rock solid for me with a Crucial P3 Plus. Apt updates take 3 seconds instead of 2 minutes on MicroSD."),
            ("casual", "Does this block YouTube ads on smart TVs?"),
            ("homelab", "DNS-based ad blockers cannot block YouTube ads because YouTube serves ads from the same video streaming domains (`googlevideo.com`). To block YouTube ads on TVs, you need SmartTube on Android TV or uYouEnhanced on Apple TV / iOS.")
        ]
    },
    {
        "id": "tut-ddr5-ram-subtimings-oc",
        "channel_id": "c/technology",
        "flair": "HARDWARE",
        "author_tag": "overclocker",
        "title": "[OVERCLOCKING] DDR5 Memory Tuning Guide: Hynix A-Die Sub-Timings & 8000MT/s Stability (TM5 Anta777)",
        "content": """Most PC builders simply enable XMP/EXPO in BIOS and leave 25% of their memory performance on the table. While primary timings (CL30-38-38) get all the marketing hype, **secondary and tertiary sub-timings dictate over 80% of actual memory latency and 1% low frame rates in gaming**.

Here is how to safely tune SK Hynix A-Die and M-Die DDR5 kits on Intel 13th/14th Gen and AMD Ryzen 7000/9000 platforms.

---

### The Golden Primary & Secondary Timings (Hynix A-Die @ 6000 - 8000 MT/s)
* **tREFI (Refresh Interval)**: By default, JEDEC sets this to ~32768. Max it out to **65535** (or **131070** on Intel). This single change provides the biggest gaming latency reduction of any timing! (Requires decent case airflow to keep DIMMs under 55°C).
* **tRFC (Refresh Cycle Time)**: Lower from stock ~800 to **420 - 480**.
* **tFAW (Four Activate Window)**: Drop to **16** or **20**.
* **tRRD_S / tRRD_L**: Set to **4 / 8** or **4 / 4**.
* **tWR (Write Recovery)**: Set to **48** (down from stock 96).

---

### Safe Daily Voltages
* **VDD / VDDQ**: 1.38V - 1.45V (1.45V is completely safe with basic airflow).
* **CPU VDD2 / IMC**: 1.25V - 1.30V.
* **SOC Voltage (AMD Ryzen)**: **1.20V - 1.25V max** (never exceed 1.30V!).

---

### Verification: The 6-Hour Torture Test
A memory overclock is never stable until it passes rigorous testing:
1. Run **TestMem5 (TM5)** with the **Anta777 Absolut** or **1usmus_v3** profile for at least 3 cycles (zero errors allowed).
2. Run **Y-Cruncher VT3** for 2 hours to test memory controller stability.
3. If error occurs on cycle 2+: Increase VDD by 0.02V or bump tRFC by +20.""",
        "video": {
            "title": "DDR5 Memory Sub-timings Explained: Turn Cheap RAM into 8000MT/s Monsters",
            "embed_url": "https://www.youtube-nocookie.com/embed/9M0YV_m6hVo",
            "provider": "youtube",
            "duration": "22:45"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80",
                "caption": "AIDA64 latency benchmark dropping from 68ns to 52ns after sub-timing tuning",
                "alt": "RAM benchmark results on screen"
            }
        ],
        "comments": [
            ("overclocker-pro", "Maxing out tREFI to 65535 shaved 6ns off my AIDA64 latency immediately. Make sure you have a fan blowing over your RAM sticks though, high tREFI makes memory sensitive to temperature errors above 52C."),
            ("gamer", "My 0.1% lows in Cyberpunk 2077 dogtown went from 58 fps to 78 fps just by tuning tRRD and tRFC. The micro-stuttering is completely gone."),
            ("casual", "How do I know if my kit is Hynix A-die or Samsung?"),
            ("hardware-guy", "Check your label or run CPU-Z / Taiphoon Burner. If the kit is 6000 CL30-36-36 or 6400 CL32, it's 100% Hynix A-die. If it's 6000 CL36-36-36, it's likely Samsung (which cannot tighten tRFC anywhere near as low).")
        ]
    },
    {
        "id": "tut-proxmox-gpu-passthrough-sunshine",
        "channel_id": "c/gaming",
        "flair": "TUTORIAL / GUIDE",
        "author_tag": "sysadmin",
        "title": "[TUTORIAL] Headless Cloud Gaming Server: Proxmox VE 8 GPU Passthrough + Sunshine / Moonlight 120FPS",
        "content": """Turn an old gaming PC or server chassis in your basement into your own private GeForce NOW cloud gaming host. Stream full 4K 120FPS HDR games to your Steam Deck, MacBook, Apple TV, or smartphone over local Wi-Fi 6E with imperceptible 3ms input lag.

### Step 1: Proxmox IOMMU & VFIO Isolation
1. Enable IOMMU in `/etc/default/grub`:
   ```bash
   GRUB_CMDLINE_LINUX_DEFAULT="quiet intel_iommu=on iommu=pt"
   ```
2. Blacklist host GPU drivers so Proxmox doesn't touch the graphics card:
   ```bash
   echo "blacklist nouveau" >> /etc/modprobe.d/blacklist.conf
   echo "blacklist nvidia" >> /etc/modprobe.d/blacklist.conf
   ```
3. Pass through the GPU and its HDMI audio controller directly to a Windows 11 VM with VirtIO SCSI and PCIe root ports.

### Step 2: Sunshine Low-Latency Host Setup
1. Inside Windows VM, install the latest NVIDIA game-ready driver.
2. Install [Sunshine](https://github.com/LizardByte/Sunshine) (the open-source game streaming server).
3. Under Configuration:
   * Encoder: **NVENC HEVC (H.265)** or **AV1**.
   * Bitrate: **80 Mbps** (local network) or **35 Mbps** (remote).
   * Packet size: `1400`.
   * Enable HDR10 metadata pass-through.

### Step 3: Moonlight Client Configuration
Install **Moonlight** on your client device (Steam Deck, iPad Pro, Android TV):
* Set resolution to match client display (e.g. 2560x1600 on Steam Deck OLED or 3840x2160 on TV).
* Enable 120 FPS streaming.
* Controller vibration, gyroscopic motion, and keyboard/mouse passthrough are fully synchronized with under 4ms network transit time!""",
        "video": {
            "title": "Build Your Own Cloud Gaming Server with Proxmox & Sunshine",
            "embed_url": "https://www.youtube-nocookie.com/embed/sN6dI8yN1oM",
            "provider": "youtube",
            "duration": "19:15"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80",
                "caption": "Moonlight streaming 4K 120FPS to OLED TV with sub-4ms decode latency",
                "alt": "Cloud gaming setup"
            }
        ],
        "comments": [
            ("deck-user", "Streaming Cyberpunk path tracing from my basement 4090 to my Steam Deck OLED at 90Hz while lying in bed is pure sci-fi. The Deck stays completely silent, cold to the touch, and battery lasts 6 hours!"),
            ("apple-tv-fan", "Moonlight on Apple TV 4K wired via Ethernet is hands down the best console experience. Zero noise in the living room, games look indistinguishable from native HDMI.")
        ]
    },
    {
        "id": "tut-ps4-1352-webkitty-deepdive",
        "channel_id": "vault-guides",
        "flair": "TECH DISCUSSION",
        "author_tag": "reverse-eng",
        "title": "[EXPLOIT ANALYSIS] PS4 11.50 – 13.52 WebKitty Exploit: Userland WebKit RCE & FreeBSD IPv6 Socket Heap Overflow",
        "content": """A technical retrospective and deep-dive into how the PS4 11.50 through 13.52 security perimeter was pierced by security researchers.

### The Attack Vector: From WebKit Sandbox to Ring 0 Kernel
1. **Userland Entry Point (WebKitty)**:
   * Leverages a type confusion bug in JavaScriptCore's JIT compiler.
   * By allocating typed arrays (`Uint32Array`) with overlapping memory backings, arbitrary read/write inside the WebProcess memory space is achieved.
   * This defeats userland ASLR and establishes a ROP (Return-Oriented Programming) chain.
2. **Escaping the Sandbox**:
   * Sony's WebProcess is sandboxed via FreeBSD `capsicum` rights.
   * To breach the kernel, the exploit accesses POSIX socket descriptors exposed to the network stack.
3. **The Kernel Heap Overflow**:
   * When handling malformed IPv6 socket options (`setsockopt` with `IPV6_PKTINFO`), the kernel network buffer (`mbuf`) fails to validate packet length headers.
   * This allows the attacker to corrupt adjacent kernel structure function pointers and overwrite `sysent` entries, redirecting execution to unsigned shellcode.
4. **GoldHEN Integration**:
   * Once kernel execution is achieved, GoldHEN disables memory write protections (`cr0.WP`), patches `sys_mprotect` to allow RWX memory mapping, and initializes the homebrew loader daemon on localhost port 9020.

Long live software preservation and the right to repair!""",
        "video": {
            "title": "PlayStation 4 Kernel Security Architecture & Exploit Chains",
            "embed_url": "https://www.youtube-nocookie.com/embed/K81jZ9X40_o",
            "provider": "youtube",
            "duration": "31:40"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80",
                "caption": "Kernel memory hex dump showing poisoned mbuf structure and hijacked RIP register",
                "alt": "Reverse engineering kernel memory dump"
            }
        ],
        "comments": [
            ("kernel-hacker", "The FreeBSD mbuf heap overflow is such an elegant primitive. Shows once again that ancient BSD network stack code from 2008 often has subtle corner cases that modern compilers can't detect without formal verification."),
            ("security-audit", "Brilliant writeup. The fact that WebKit sandbox escapes keep popping up every 18 months proves that monolithic browser engines inside OS kernels are a perpetual attack surface.")
        ]
    },
    {
        "id": "tut-esp32-zigbee-home-assistant",
        "channel_id": "c/solarpunk",
        "flair": "TUTORIAL / GUIDE",
        "author_tag": "homelab",
        "title": "[SMARTHOME] ESP32 & Zigbee Local Home Assistant Setup: Zero Cloud, 100% Offline Automation",
        "content": """Smart homes shouldn't stop working when your internet goes down or when a company shuts down its cloud servers.

Here is how to build an enterprise-reliability smart home with **Home Assistant OS**, **Zigbee2MQTT**, and custom **ESPHome sensors** running completely offline.

### Hardware Checklist
* **Coordinator**: Sonoff Zigbee 3.0 USB Dongle Plus-E (EFR32MG21 chip flashed with Ember coordinator firmware).
* **Sensors**: Aqara presence millimeter-wave (mmWave) radar sensors + Tuya Zigbee 3.0 smart power plugs (which act as network mesh routers).
* **DIY Nodes**: ESP32-C3 / ESP32-S3 boards with BME280 temperature/humidity sensors and relay modules.

### Software Stack
1. **Zigbee2MQTT over Mosquitto MQTT**:
   * Direct pairing without proprietary hubs.
   * Real-time signal strength (LQI) mapping across your home mesh.
2. **ESPHome YAML Definition**:
   ```yaml
   esphome:
     name: livingroom-multisensor
   esp32:
     board: esp32-c3-devkitm-1
     framework:
       type: esp-idf
   sensor:
     - platform: bme280_i2c
       temperature:
         name: "Living Room Temperature"
       humidity:
         name: "Living Room Humidity"
   ```
3. **Automations**: Millisecond motion-to-light trigger without round-tripping to cloud servers!""",
        "video": {
            "title": "Complete 100% Local Smart Home with Zigbee2MQTT & Home Assistant",
            "embed_url": "https://www.youtube-nocookie.com/embed/s2j_M7f91kA",
            "provider": "youtube",
            "duration": "20:30"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80",
                "caption": "Home Assistant Zigbee mesh graph showing 42 connected offline nodes",
                "alt": "Smart home dashboard"
            }
        ],
        "comments": [
            ("smart-home-fan", "Migrating from Google Home to Home Assistant was the best decision of my life. Zero delayed commands and automations trigger instantly."),
            ("iot-builder", "ESPHome with the ESP32-C3 is incredible. You can buy 5 boards on AliExpress for $12 and build custom air quality sensors for every bedroom.")
        ]
    },
    {
        "id": "tut-nix-flakes-reproducible-dev",
        "channel_id": "c/opensource",
        "flair": "TUTORIAL / GUIDE",
        "author_tag": "linux-dev",
        "title": "[DEV & LINUX] The Definitive Nix Flakes Guide: 100% Reproducible Environments on Mac, Linux & WSL",
        "content": """Eliminate 'it works on my machine' forever. **Nix Flakes** provides hermetic, mathematically pure package management with cryptographic lockfiles (`flake.lock`).

### Basic flake.nix Structure
```nix
{
  description = "Modern Rust + Node + Clang hermetic dev shell";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            rustc cargo clippy rustfmt
            nodejs_22 pnpm
            llvmPackages_18.clang
            openssl pkg-config
          ];
        };
      });
}
```

### Direnv Integration: Automatic Environment Loading
Create `.envrc` in your repo:
```bash
use flake
```
The exact instant you `cd` into your project directory, your shell activates the locked compiler versions. When you `cd ..`, they evaporate cleanly without polluting your global PATH!""",
        "video": {
            "title": "Nix Flakes Tutorial for Developers (Ditch Docker Dev Containers)",
            "embed_url": "https://www.youtube-nocookie.com/embed/0UxUzNZpY8E",
            "provider": "youtube",
            "duration": "18:40"
        },
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80",
                "caption": "Terminal showing direnv loading hermetic flake packages in 120ms",
                "alt": "Nix terminal development environment"
            }
        ],
        "comments": [
            ("nix-dev", "Nix flakes + direnv is pure bliss. Onboarding a new engineer takes literally 30 seconds: git clone, direnv allow, cargo build. No installing 15 different homebrew formulas."),
            ("rustacean", "The fact that flake.lock locks every single transitive dynamic library hash makes debugging CI failures so trivial. Reproducibility at its finest.")
        ]
    }
]

# ─────────────────────────────────────────────────────────────────────────────
# LIVE CHAT BANTER BURSTS (150+ English Chat Messages)
# ─────────────────────────────────────────────────────────────────────────────

CHAT_BURSTS = [
    # Burst 1: PS4 PPPwn & GoldHEN 13.52 discussion (relays-general)
    {
        "channel_id": "relays-general",
        "topic": "ps4 jailbreak",
        "messages": [
            ("alyens8i", "anyone here tested PPPwn on 11.02 yet? my pro has been sitting in a closet for a year"),
            ("tinkerer_dan", "yep just ran it an hour ago! works fine but stage 1 took like 4 retries for me"),
            ("cluj_coder", "make sure you use the C++ rewrite xfangfang posted. python version is super slow and drops packets"),
            ("alyens8i", "wait where do i get the compiled binary for windows?"),
            ("cluj_coder", "check github releases on xfangfang/PPPwn_cpp, grab v1.3.4. takes literally 8 seconds to inject"),
            ("gamer_flame", "bro just buy a ps5 why are people still clinging to ps4 lmao"),
            ("alyens8i", "because 60fps patches on bloodborne and 1080p 60fps on ghost of tsushima for free? why would i pay $500 for a dust collector"),
            ("gamer_flame", "fair point tbh bloodborne at 30fps gives me migraines"),
            ("pixel_crafter", "goldhen 2.4b18 also added temperature fan curves. my ps4 fat sounds like an actual console now instead of an f16 jet taking off"),
            ("hardware_sam", "did you guys put a switch between the pc and ps4 or direct cable?"),
            ("alyens8i", "i used a direct cat6 cable to my motherboard ethernet port, worked first try"),
            ("hardware_sam", "nice. my intel nic was resetting on link down so i had to use a $10 unmanaged switch")
        ]
    },
    # Burst 2: ShadPS4 Bloodborne PC emulation hype (pulse-global)
    {
        "channel_id": "pulse-global",
        "topic": "shadps4 bloodborne",
        "messages": [
            ("emulation_nerd", "SHADPS4 V0.4 JUST MERGED THE SOUND BUFFER FIX!!"),
            ("bloodborne_stan", "WAIT FR??? DOES GASCOIGNE CUTSCENE CRASH STILL HAPPEN?"),
            ("emulation_nerd", "NOPE! fully fixed!! played all the way to cathedral ward without a single crash"),
            ("pc_master_alex", "what gpu you running?"),
            ("emulation_nerd", "rtx 4070 super. getting locked 60fps at 1440p with the Lance McDonald delta patch"),
            ("bloodborne_stan", "crying real tears rn... fromsoftware refused for 10 years and emu devs did it in months 😭"),
            ("fps_snob", "how is frame pacing? any micro-stutter when compiling shaders?"),
            ("emulation_nerd", "first time entering an area there is brief hitching while pipeline compiles, but second run through is buttery"),
            ("london_peer", "can confirm, running on a 7800X3D + 4080. looks absolutely stunning at 4K without the disgusting chromatic aberration"),
            ("casual_kevin", "can a steam deck run it yet?"),
            ("pc_master_alex", "deck gets around 22fps right now. needs more compute shader optimization. give it 6 months"),
            ("troll_god", "sony executives punching their desks seeing pc gamers play bloodborne at 4k60 for $0 💀")
        ]
    },
    # Burst 3: Switch OLED Modding & Soldering Banter (relays-dev)
    {
        "channel_id": "relays-dev",
        "topic": "switch modding",
        "messages": [
            ("solder_wizard", "just finished another oled picofly install. dat0 ribbon seated at 0.67V first attempt"),
            ("micro_tech", "clean! did you use the anchor point or solder mask resin?"),
            ("solder_wizard", "both. uv solder mask over the blade and a dab of b7000 glue on the ribbon body. zero chance of drift"),
            ("noob_tinker", "i tried soldering the clk point yesterday and bridged the resistor to ground send help"),
            ("micro_tech", "lots of flux and copper wick bro. dont press hard or you'll rip the pad right off"),
            ("solder_wizard", "what iron temp were you using?"),
            ("noob_tinker", "400C..."),
            ("solder_wizard", "WAY too hot dude! you're gonna bake the traces. drop it to 330C and use amtech flux"),
            ("noob_tinker", "ok buying amtech right now. will report back if my switch survives"),
            ("dev_bogdan", "also make sure your sd card is formatted fat32 with 32kb clusters. exfat will corrupt emummc eventually"),
            ("solder_wizard", "guiformat is the gold standard for formatting 512gb cards to fat32")
        ]
    },
    # Burst 4: DeepSeek R1 & Local LLM Benchmarks (relays-dev)
    {
        "channel_id": "relays-dev",
        "topic": "local ai",
        "messages": [
            ("ai_hacker", "has anyone tested deepseek-r1-32b with exl2 4bpw on a 16gb card?"),
            ("tensor_max", "yeah it fits with 14.2gb vram usage if you set context to 8k and kv-cache to fp8"),
            ("ai_hacker", "what t/s are you getting?"),
            ("tensor_max", "around 31 tokens/sec on an rtx 4080. reasoning tokens flow super fast"),
            ("prompt_ninja", "the reasoning traces are insane. it caught a subtle race condition in my go channels that claude 3.5 missed"),
            ("open_source_hero", "and zero telemetry sent to sam altman or silicon valley. self-hosted is the future"),
            ("cloud_cynic", "how does it compare to the full 70b distilled model?"),
            ("tensor_max", "70b is smarter on nuanced architecture decisions, but 32b has 90% of the reasoning capability at twice the speed"),
            ("ai_hacker", "setting up open-webui in docker right now with searxng for live web search. dream stack")
        ]
    },
    # Burst 5: Windows 11 Gaming Latency & CS2 Rants (relays-general)
    {
        "channel_id": "relays-general",
        "topic": "cs2 performance",
        "messages": [
            ("cs2_grinder", "bro the subtick in cs2 tonight feels atrocious. shots disappearing into the void"),
            ("esports_dan", "did you check your dpc latency? windows 11 memory integrity was spiking my nvlddmkm to 1200us"),
            ("cs2_grinder", "wait how do i check that?"),
            ("esports_dan", "download latencymon. run it while dm-ing. if it says your system is having dpc latency drop core isolation immediately"),
            ("timisoara_frag", "also set your gpu to MSI mode with high priority. dropped my frame render variance in half"),
            ("cs2_grinder", "just turned off memory integrity and rebooted... testing now"),
            ("cs2_grinder", "WAIT WTFFFF. the mouse movement feels so much snappier holy s***"),
            ("esports_dan", "told you! windows 11 runs the whole kernel in a hyper-v vm by default if memory integrity is on. kills 1% lows"),
            ("clown_emoji", "bro spent 30 mins tweaking bios just to go 4-18 in premier 🤡"),
            ("cs2_grinder", "shut up i was warming up ok 😭")
        ]
    },
    # Burst 6: Sideloading & RetroArch CRT Shaders (relays-general)
    {
        "channel_id": "relays-general",
        "topic": "emulation & apps",
        "messages": [
            ("retro_fanatic", "the hsm mega bezel shader on retroarch is blowing my mind on my oled tv"),
            ("pixel_dan", "which preset? aperture grille or slot mask?"),
            ("retro_fanatic", "aperture grille with the curved glass reflection. playing chrono trigger and it looks like a real 90s trinitron"),
            ("ios_modder", "sideloaded retroarch on my ipad with sidestore yesterday. automated the wireguard refresh at 3am"),
            ("retro_fanatic", "no revokes at all?"),
            ("ios_modder", "zero revokes! sidestore refreshes itself over local loopback vpn. never plugging into my mac again"),
            ("delta_kid", "uyouenhanced on iphone is also mandatory. zero youtube ads, sponsorblock auto skipping intros"),
            ("timisoara_frag", "apple users finally discovering what android users have had since 2012 lmao"),
            ("ios_modder", "hey at least our hardware holds its value when we resell it 😉"),
            ("timisoara_frag", "touché haha")
        ]
    },
    # Burst 7: General sovereign relay chatter & late night gaming (relays-general)
    {
        "channel_id": "relays-general",
        "topic": "gaming squads",
        "messages": [
            ("night_owl", "anyone up for some elden ring seamless co-op or monster hunter?"),
            ("brassov_beast", "down for seamless! what level are you at?"),
            ("night_owl", "level 85 running a dex/bleed build in altus plateau"),
            ("brassov_beast", "perfect, hop on voice in 5 mins. let me grab a beer first"),
            ("bucharest_node", "is the server relay running smooth for everyone tonight? ping to frankfurt node is 18ms"),
            ("night_owl", "smooth as butter, d1 and workers handling everything with zero lag"),
            ("chill_gamer", "salut băieți, spor la fraguri!")
        ]
    },
    # Burst 8: 10GbE Networking & ZFS Scrub Performance (relays-dev)
    {
        "channel_id": "relays-dev",
        "topic": "homelab 10gbe",
        "messages": [
            ("nas_architect", "monthly zfs scrub just finished on my 64TB RaidZ2 pool. zero checksum errors across 48TB of data!"),
            ("linux_dan", "what scrub speed did you get?"),
            ("nas_architect", "averaged around 1.35 GB/s. took about 10 hours overnight"),
            ("net_wizard", "are you using mtus at 9000 jumbo frames or standard 1500?"),
            ("nas_architect", "left it at standard 1500! with modern 10G NICs and TSO/LRO hardware offloading, jumbo frames cause more headache than they solve"),
            ("net_wizard", "100% agreed. jumbo frames break so many docker bridges and vlan tags for like 1% cpu reduction"),
            ("cloud_cynic", "cloud storage providers charging $150/month for 10TB while a home server costs $600 once and gives you 60TB for 7 years")
        ]
    },
    # Burst 9: Pi 5 NVMe HATs & Speed Tests (relays-dev)
    {
        "channel_id": "relays-dev",
        "topic": "raspberry pi nvme",
        "messages": [
            ("iot_maker", "just installed the geekworm x1001 nvme hat on my pi 5 with a samsung 980"),
            ("bench_geek", "did you enable pcie gen 3 in config.txt?"),
            ("iot_maker", "yeah added dtparam=pciex1_gen=3. getting 860 MB/s sequential read in fio!"),
            ("iot_maker", "pi-hole queries resolve in literally 0.3ms with unbound cached in ram"),
            ("bench_geek", "nvme completely fixes the classic pi sd card corruption. i've had 4 sandisk cards die in 2 years from sqlite write amplification"),
            ("iot_maker", "yep! ssd wear leveling will outlive the pi itself")
        ]
    },
    # Burst 10: DDR5 Overclocking & Subtimings (relays-dev)
    {
        "channel_id": "relays-dev",
        "topic": "ddr5 overclocking",
        "messages": [
            ("ram_tuner", "passed 6 hours of TM5 Anta777 Absolut at 7600 MT/s CL34!"),
            ("hw_elitist", "what is your tREFI set to?"),
            ("ram_tuner", "maxed out at 65535 with a dedicated 60mm noctua fan blowing on the dimms"),
            ("hw_elitist", "what temps are the sticks reaching under load?"),
            ("ram_tuner", "peaking at 44C. without the fan they were hitting 58C and throwing errors on cycle 3"),
            ("timisoara_frag", "ddr5 thermal sensitivity is real. anything over 50C with high trefi is an instant crash in cyberpunk"),
            ("ram_tuner", "yep, airflow is king when pushing memory bandwidth")
        ]
    },
    # Burst 11: Moonlight 120Hz Streaming (relays-general)
    {
        "channel_id": "relays-general",
        "topic": "cloud streaming",
        "messages": [
            ("stream_master", "playing god of war ragnarok on my steam deck streamed from my 4080 via sunshine/moonlight"),
            ("deck_lover", "how is the battery life while streaming?"),
            ("stream_master", "over 5.5 hours! the deck is only decoding av1 video so apu power draw is under 6 watts"),
            ("deck_lover", "that's insane. and screen latency?"),
            ("stream_master", "around 3.8ms total on wifi 6e. literally impossible to tell it's not running natively"),
            ("troll_god", "rip to people who bought playstation portal for $200 just to get 60hz with microstutter 💀"),
            ("stream_master", "moonlight at 90hz on the oled panel makes the portal look like a toy tbh")
        ]
    },
    # Burst 12: RTX 5090 600W & 16-pin Power Connector Fears (pulse-global)
    {
        "channel_id": "pulse-global",
        "topic": "rtx 5090 drama",
        "messages": [
            ("gpu_watcher", "NEW LEAK: rtx 5090 board partners confirmed 600W tdp BIOS limits"),
            ("pc_builder_joe", "600 WATTS??? are they insane?? my room is gonna turn into a sauna"),
            ("connector_fear", "please tell me they redesigned the 12v-2x6 power connector... i don't want my house burning down"),
            ("gpu_watcher", "it uses the revised 12v-2x6 with recessed sense pins so it won't power on if not fully seated"),
            ("pc_builder_joe", "still, 600w through a single plastic connector is terrifying. why can't we just have three 8-pin cables?!"),
            ("tech_veteran", "because board real estate. but honestly who needs 600w unless you're rendering 8k or training 70b models locally"),
            ("jensen_jacket", "Jensen: The more you buy, the more you save! 💸")
        ]
    },
    # Burst 13: PS5 Pro Shortages & Physical Game Preservation (pulse-global)
    {
        "channel_id": "pulse-global",
        "topic": "ps5 pro disc drive",
        "messages": [
            ("disc_collector", "ps5 pro detachable disc drives are STILL sold out everywhere in europe and scalpers want $200 on ebay"),
            ("console_warrior", "sony deliberately underproducing the disc drive to force everyone onto digital psn store where they take 30% cut on every game"),
            ("preservation_hero", "this is why jailbreaking and game dumping matters! if you don't own physical media or have decrypted backups, you're just renting licenses that can be revoked anytime"),
            ("rom_archivist", "itemzflow + shadps4 = true preservation. keep your discs and dump your own games.")
        ]
    },
    # Burst 14: Home Assistant Local Zigbee vs Cloud Tuya (relays-general)
    {
        "channel_id": "relays-general",
        "topic": "smart home",
        "messages": [
            ("iot_tinker", "finally migrated all my smart bulbs from tuya cloud to local zigbee2mqtt!"),
            ("smart_skeptic", "was it worth the hassle? tuya app works fine for me"),
            ("iot_tinker", "worth every second. light switch latency went from 800ms pinging servers in china to literally 12ms locally"),
            ("iot_tinker", "and when my internet went down yesterday, every light and automation in my house still worked"),
            ("privacy_first", "plus tuya isn't profiling your sleep schedules or selling presence data to insurance brokers"),
            ("smart_skeptic", "wait they do that?? ok ordering a sonoff zigbee dongle right now lol"),
            ("iot_tinker", "get the sonoff dongle-E with silk firmware. plug and play in home assistant")
        ]
    },
    # Burst 15: Nix Flakes vs Docker Containers (relays-dev)
    {
        "channel_id": "relays-dev",
        "topic": "nix flakes",
        "messages": [
            ("nix_zealot", "once you switch your dev environment to nix flakes and direnv you can never go back to docker devcontainers"),
            ("docker_dan", "why? docker isolation is clean and everyone knows dockerfile syntax"),
            ("nix_zealot", "docker mounts have filesystem latency overhead on mac/wsl and eating 20gb of disk per container is insane. nix shares store packages with hardlinks"),
            ("rust_coder", "direnv `use flake` giving me identical rustc, clang, and openssl headers the instant i `cd` into a repo is pure wizardry"),
            ("docker_dan", "yeah but nix error messages look like ancient hieroglyphics when an input fails to build"),
            ("nix_zealot", "skill issue tbh 🤡"),
            ("rust_coder", "nix error messages build character haha")
        ]
    },
    # Burst 16: Elden Ring Nightreign & Monster Hunter Wilds hype (pulse-global)
    {
        "channel_id": "pulse-global",
        "topic": "gaming hype",
        "messages": [
            ("souls_veteran", "anyone else pre-ordering monster hunter wilds or waiting for day-1 pc performance patch?"),
            ("capcom_stan", "beta CPU optimization was rough on quad cores but 8-core ryzens handled it fine"),
            ("hunter_99", "capcom confirmed the full release includes directstorage and updated dlss 3.7. performance will be way better"),
            ("souls_veteran", "i just want to fight arkveld in 144fps without shader stutter"),
            ("casual_gamer", "my rtx 3060 is praying for dlss performance mode right now lmao"),
            ("troll_king", "3060 users in 2026 are modern day spartan warriors fr fr")
        ]
    },
    # Burst 17: Proton-GE 9 Media Foundation Fixes (relays-dev)
    {
        "channel_id": "relays-dev",
        "topic": "linux gaming proton",
        "messages": [
            ("proton_dev", "gloriouseggroll just dropped GE-Proton9-24 with upstream wine 9.20 rebase!"),
            ("deck_user_7", "does it fix the black screen cutscene bug in dead rising deluxe remaster?"),
            ("proton_dev", "YES! includes the latest gstreamer media foundation patches for wmv and h264 cutscene decoding"),
            ("deck_user_7", "updating via protonplus right now, thank god!"),
            ("kernel_ricer", "valve's investment in proton is literally the best thing that ever happened to pc gaming in the last 20 years")
        ]
    },
    # Burst 18: Midnight banter & cable management roasted (relays-general)
    {
        "channel_id": "relays-general",
        "topic": "late night banter",
        "messages": [
            ("coffee_demon", "it's 2:45 AM and i just decided to completely reorganize my desk cable management why am i like this"),
            ("bucharest_node", "canon event for every tech enthusiast. prepare for your pc not to post because you bumped a sata cable"),
            ("coffee_demon", "DONT JINX ME"),
            ("cluj_coder", "velcro straps or zip ties? if you say zip ties you deserve the post failure"),
            ("coffee_demon", "velcro only! i'm not a barbarian"),
            ("night_owl", "good luck. sleeping is for people without unrouted cat6 cables"),
            ("coffee_demon", "truly words of wisdom. night boys ✌️")
        ]
    },
    # Burst 19: PS4 11.50 WebKitty testing & PoC verification (relays-dev)
    {
        "channel_id": "relays-dev",
        "topic": "ps4 webkitty",
        "messages": [
            ("sec_researcher", "analyzed the webkitty jsc type confusion poc today on an 11.50 test kit"),
            ("kernel_hacker", "how clean is the arbitrary r/w primitive?"),
            ("sec_researcher", "very clean. memory leak gives you the base address of WebProcess in under 200ms"),
            ("kernel_hacker", "and the ipv6 mbuf overwrite?"),
            ("sec_researcher", "hits reliably if you groom the heap with small socket allocations beforehand. Sistr0's goldhen payload binds nicely to localhost 9020"),
            ("alyens8i", "this community is incredible. thank you guys for keeping the hardware we bought alive!"),
            ("sec_researcher", "preservation and ownership are fundamental human rights. always.")
        ]
    }
]

# ─────────────────────────────────────────────────────────────────────────────
# GENERATOR LOGIC
# ─────────────────────────────────────────────────────────────────────────────

def build_sql_statements():
    post_statements = []
    comment_statements = []
    interaction_statements = []
    vote_statements = []
    message_statements = []
    active_summaries = []

    print("[*] Generating 10 High-Demand Tutorial Posts & Threaded Comments...")

    # We distribute posts over the past 24-36 hours up to 20 minutes ago
    for p_idx, tut in enumerate(TUTORIALS):
        # Time offset: from 32 hours ago to 2 hours ago
        hours_ago = 32 - (p_idx * 2.8)
        post_time = NOW_MS - int(hours_ago * H_MS) + random.randint(10000, 300000)

        author_persona = get_user_by_role(tut.get("author_tag", ""))
        author_id = author_persona["user_id"]
        role = author_persona.get("role", "MEMBER")

        video_json = json.dumps(tut["video"]) if "video" in tut else None
        images_json = json.dumps(tut["images"]) if "images" in tut else None
        comments = tut.get("comments", [])

        merit_votes = random.randint(380, 1850)
        boost_count = random.randint(45, 320)

        p_row = f"({sql_esc(tut['id'])}, {sql_esc(tut['channel_id'])}, {sql_esc(author_id)}, {sql_esc(role)}, {sql_esc(tut['title'])}, {sql_esc(tut['content'])}, {sql_esc(tut['flair'])}, {merit_votes}, 0, {len(comments)}, {boost_count}, NULL, {sql_esc(video_json)}, {sql_esc(images_json)}, NULL, NULL, 'published', {post_time}, 0)"
        post_statements.append(f"INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES {p_row};")

        # Post Interactions & Votes
        reactors = random.sample(USER_IDS, k=min(len(USER_IDS), 18))
        for r_i, r_uid in enumerate(reactors):
            if r_uid == author_id:
                continue
            r_emoji = random.choice(['🔥', '💀', '🚀', '❤️', '👀', '💯', '👏', '🧠'])
            r_time = post_time + (r_i + 1) * 35000 + random.randint(100, 999)
            int_id = f"int-{tut['id'][:10]}-{r_uid[:6]}-{r_i}"
            v_id = f"v-{tut['id'][:10]}-{r_uid[:6]}"
            interaction_statements.append(f"INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ({sql_esc(int_id)}, 'post', {sql_esc(tut['id'])}, {sql_esc(r_uid)}, 'reaction', {sql_esc(r_emoji)}, {r_time});")
            vote_statements.append(f"INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ({sql_esc(v_id)}, 'post', {sql_esc(tut['id'])}, {sql_esc(r_uid)}, 1, {r_time});")

        # Track active persona
        active_summaries.append((author_id, post_time))

        # Threaded Comments
        comment_time = post_time
        parent_id = None
        for c_idx, (c_tag, c_text) in enumerate(comments):
            c_time = comment_time + random.randint(80, 1400) * 1000 + random.randint(100, 999)
            if c_time > NOW_MS:
                c_time = NOW_MS - random.randint(10, 300) * 1000
            comment_time = c_time

            c_author = get_user_by_role(c_tag)
            cid = f"comm-{tut['id'][:10]}-{c_idx+1}"
            c_merit = random.randint(12, 145)

            # Some comments are replies to previous
            p_ref = parent_id if (c_idx > 1 and random.random() < 0.4) else None
            if not p_ref:
                parent_id = cid

            c_row = f"({sql_esc(cid)}, {sql_esc(tut['id'])}, {sql_esc(p_ref)}, {sql_esc(c_author['user_id'])}, {sql_esc(c_author.get('role', 'MEMBER'))}, {sql_esc(c_text)}, {c_merit}, {c_time})"
            comment_statements.append(f"INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES {c_row};")
            active_summaries.append((c_author['user_id'], c_time))

            # Comment reactions
            if random.random() < 0.6:
                c_reactor = random.choice(USER_IDS)
                int_cid = f"intc-{cid[:12]}-{c_reactor[:4]}"
                interaction_statements.append(f"INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ({sql_esc(int_cid)}, 'comment', {sql_esc(cid)}, {sql_esc(c_reactor)}, 'reaction', {sql_esc(random.choice(['🔥', '💯', '😂', '👏', '❤️']))}, {c_time + 15000});")

    print("[*] Generating 150+ Live Chat Banter Messages across channels...")
    msg_counter = 2000

    # Distribute chat bursts from 18 hours ago down to 3 minutes ago
    for b_idx, burst in enumerate(CHAT_BURSTS):
        channel_id = burst["channel_id"]
        messages = burst["messages"]
        burst_base_time = NOW_MS - int((18 - (b_idx * 2.5)) * H_MS) + random.randint(5000, 50000)

        current_msg_time = burst_base_time
        for (handle, text) in messages:
            msg_counter += 1
            mid = f"msg-live-{msg_counter}"

            # Pick persona
            if handle in USER_MAP:
                author_id = USER_MAP[handle]["user_id"]
            else:
                author = get_user_by_role()
                author_id = author["user_id"]

            jitter_sec = random.randint(12, 75)
            current_msg_time += (jitter_sec * 1000) + random.randint(10, 990)
            if current_msg_time > NOW_MS:
                current_msg_time = NOW_MS - random.randint(30, 180) * 1000

            epoch = f"#{420 + (b_idx * 3)}"
            m_row = f"({sql_esc(mid)}, {sql_esc(channel_id)}, {sql_esc(author_id)}, {sql_esc(text)}, NULL, {sql_esc(epoch)}, 'verified', NULL, {current_msg_time})"
            message_statements.append(f"INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES {m_row};")
            active_summaries.append((author_id, current_msg_time))

    # Activity summaries updates
    activity_statements = []
    unique_active = {}
    for uid, t in active_summaries:
        if uid not in unique_active or t > unique_active[uid]:
            unique_active[uid] = t

    for uid, last_t in unique_active.items():
        unread = random.randint(1, 7)
        activity_statements.append(f"INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ({sql_esc(uid)}, {last_t}, {unread}, {NOW_MS});")

    return {
        "posts": post_statements,
        "comments": comment_statements,
        "interactions": interaction_statements,
        "votes": vote_statements,
        "messages": message_statements,
        "activity": activity_statements
    }

def main():
    data = build_sql_statements()
    print(f"\n[+] Total statements prepared:")
    print(f"    - Posts: {len(data['posts'])}")
    print(f"    - Comments: {len(data['comments'])}")
    print(f"    - Interactions: {len(data['interactions'])}")
    print(f"    - Votes: {len(data['votes'])}")
    print(f"    - Messages: {len(data['messages'])}")
    print(f"    - Activity Updates: {len(data['activity'])}")

    sql_file = os.path.join(BASE_DIR, "seed_trending_tutorials.sql")
    print(f"\n[*] Writing statements to: {sql_file}")

    with open(sql_file, "w", encoding="utf-8") as f:
        f.write("-- ========================================================================\n")
        f.write("-- UREfy Master Trending Tutorials & English Chat Seeder\n")
        f.write(f"-- Generated: {time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(NOW_MS / 1000))} UTC\n")
        f.write("-- ========================================================================\n\n")

        f.write("-- 1. POSTS\n")
        for s in data["posts"]:
            f.write(s + "\n")
        f.write("\n-- 2. COMMENTS\n")
        for s in data["comments"]:
            f.write(s + "\n")
        f.write("\n-- 3. LIVE CHAT MESSAGES\n")
        for s in data["messages"]:
            f.write(s + "\n")
        f.write("\n-- 4. INTERACTIONS\n")
        for s in data["interactions"]:
            f.write(s + "\n")
        f.write("\n-- 5. VOTES\n")
        for s in data["votes"]:
            f.write(s + "\n")
        f.write("\n-- 6. USER ACTIVITY SUMMARIES\n")
        for s in data["activity"]:
            f.write(s + "\n")

    file_size_kb = os.path.getsize(sql_file) / 1024
    print(f"[+] Successfully wrote {sql_file} ({file_size_kb:.1f} KB).")

if __name__ == "__main__":
    main()
