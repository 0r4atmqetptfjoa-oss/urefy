-- ========================================================================
-- UREfy Master Trending Tutorials & English Chat Seeder
-- Generated: 2026-10-01 12:36:19 UTC
-- ========================================================================

-- 1. POSTS
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-ps4-1352-pppwn-goldhen', 'vault-guides', 'aeb1d054fcdc', 'MEMBER', '[GUIDE] PS4 11.00 – 13.52 Jailbreak via PPPwn C++ & WebKitty: Step-by-Step with GoldHEN v2.4b18.11', 'The PlayStation 4 homebrew scene has advanced significantly with the release of GoldHEN v2.4b18.11 and the high-speed C++ rewrite of PPPwn (PlayStation 4 PPPoE PWN by TheFlow). Here is the verified, crash-free guide to jailbreaking firmwares 11.00, 11.02, 11.50, and up to 13.52.

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
* [PSX-Place Discussion & Offset Tracking](https://psx-place.com)', 'TUTORIAL / GUIDE', 698, 0, 8, 281, NULL, '{"title": "PS4 11.00 - 13.52 Complete Jailbreak Walkthrough (PPPwn + GoldHEN)", "embed_url": "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "provider": "youtube", "duration": "14:22"}', '[{"url": "https://images.unsplash.com/photo-1507457379470-08b800bebc67?auto=format&fit=crop&w=1000&q=80", "caption": "PS4 Pro connected via Ethernet for PPPoE payload injection", "alt": "PS4 console with ethernet cable and USB drive"}, {"url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80", "caption": "PPPwn terminal output: KASLR defeated and Stage 2 injected successfully", "alt": "Terminal code execution"}]', NULL, NULL, 'published', 1790743136445, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-ps5-etahen-60fps-guide', 'c/technology', '8d6fdfa6f0c9', 'MEMBER', '[TUTORIAL] PS5 4.51 – 8.20 Exploitation Guide: etaHEN, Itemzflow & Unlocking 60FPS in Bloodborne / RDR2', 'With the release of etaHEN v2.0b and the latest Kstuff hypervisor patches by LightningMods and flatz, the PlayStation 5 homebrew ecosystem has reached a mature milestone. You can now dump legitimate games, run FTP, load homebrew, and inject real-time 60FPS patches into 30FPS-locked titles like Bloodborne, The Last of Us Part II, and Red Dead Redemption 2.

### Supported Firmwares
* **Golden Range (3.00 - 4.51)**: Full kernel exploit + WebKit / BD-J entry points with write access to kernel memory.
* **Extended Range (5.00 - 8.20)**: Kernel vulnerability reachable via BD-J disc loader or WebKit socket leak. etaHEN provides Kstuff support for fpkg execution and memory patches.

### Core Capabilities Unlocked
1. **etaHEN Homebrew Enabler**:
   * Kstuff (unsigned code execution bypass)
   * Built-in FTP Server on port 1337
   * Payload Loader on port 9020
   * Real-time game memory patcher (Illusion''s 60fps & resolution patches)
2. **Itemzflow Game Manager**:
   * Backup and dump installed PS4/PS5 titles directly to external NVMe SSDs
   * Virtual disc mounter and file explorer

### How to Apply 60FPS to Bloodborne on PS5
Bloodborne never received an official PS5 60FPS update. Here is how to run Lance McDonald''s true 60fps patch on your exploit-enabled PS5:
1. Boot the PS5 into userland via the web browser exploit host (e.g. `https://es7in1.site` or local ESP32).
2. Send the `etaHEN.bin` payload via Netcat:
   ```bash
   nc -w 3 192.168.1.150 9020 < etaHEN.bin
   ```
3. Open Itemzflow > Settings > Game Patches.
4. Toggle `Enable 60FPS Patch for CUSA03173 (Bloodborne 1.09)`.
5. Launch Bloodborne. The game now renders at flawless, locked 60 frames per second with full frame-pacing correction!

**Important Caution**: Always disable automatic system updates in `Settings > System > System Software > System Software Updates and Settings`. Never log into PSN on a modified console.', 'TUTORIAL / GUIDE', 745, 0, 7, 69, NULL, '{"title": "Bloodborne Running at Native 60FPS on PS5 via etaHEN", "embed_url": "https://www.youtube-nocookie.com/embed/M1W_e_S7GgE", "provider": "youtube", "duration": "09:41"}', '[{"url": "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1000&q=80", "caption": "PS5 DualSense and console running homebrew payload listener", "alt": "PS5 console on desk"}, {"url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80", "caption": "Bloodborne 60FPS patch active in Hunter''s Dream", "alt": "Gamer setup monitor"}]', NULL, NULL, 'published', 1790753232087, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-switch-oled-picofly-guide', 'c/technology', '303ab902e6b3', 'MEMBER', '[HARDWARE MOD] Nintendo Switch OLED Picofly RP2040 Micro-Soldering Guide: DAT0 Adapter vs Kamikaze Modding', 'The Nintendo Switch OLED (Mariko revision) features a revised BGA architecture where the eMMC flash memory is soldered directly beneath the shield, eliminating the removable daughterboard found on the V1/V2 models. To glitch the Tegra X1+ (T210B01) processor, an RP2040 micro-modchip (Picofly) must intercept the `DAT0` line during bootloader execution.

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
1. Format your 512GB / 1TB MicroSD card with **FAT32** using GUIformat (never use exFAT as Nintendo''s exFAT driver causes filesystem corruption).
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
5. `blank_prodinfo_emummc=1` blanks your console''s unique certificates inside the virtual emuMMC, ensuring you can play homebrew and offline mods without risking an immediate hardware BAN on your stock SysNAND!', 'HARDWARE MOD', 1379, 0, 6, 249, NULL, '{"title": "Switch OLED Micro-Soldering Picofly RP2040 Step-by-Step", "embed_url": "https://www.youtube-nocookie.com/embed/3A_sX_H02oQ", "provider": "youtube", "duration": "28:15"}', '[{"url": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80", "caption": "Microscope view of 0.1mm jumper wire soldered to clock test point", "alt": "Microchip soldering under microscope"}, {"url": "https://images.unsplash.com/photo-1612287233215-68045610d486?auto=format&fit=crop&w=1000&q=80", "caption": "Hekate bootloader displaying clean partition layout on OLED panel", "alt": "Nintendo Switch console"}]', NULL, NULL, 'published', 1790763393621, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-shadps4-bloodborne-pc-setup', 'c/gaming', '7eb9c47bfac4', 'MEMBER', '[STEP-BY-STEP] ShadPS4 v0.4.0 Setup: Play Bloodborne on PC at 4K 60FPS (Shader Fixes & Crash Prevention)', 'The open-source PlayStation 4 emulator **ShadPS4** has made miraculous progress over recent weeks. What was previously an unbootable game now runs start-to-finish on modern PC hardware. With the latest vertex pipeline patches and sound backend updates, you can now experience Bloodborne at native 4K 60FPS on your PC.

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
2. Dump your console''s decrypted system modules (`libkernel.sprx`, `libSceSaveData.sprx`, `libScePosix.sprx`) and place them in the `/user/system/` directory of ShadPS4.
3. In ShadPS4 GUI, click `File > Install PKG / Decrypted Game` and select your Bloodborne `eboot.bin` folder.

---

### Step 2: Essential Patches & Fixes
Bloodborne has specific PS4 engine quirks that cause visual anomalies in emulation without community patches:
1. **Vertex Explosion Fix**: Fixes character clothing and beast fur stretching infinitely across the screen. Download the latest `vertex_patch.bin` into `shadps4/patches/CUSA03173/`.
2. **60FPS Unlocked Patch**: Bloodborne''s game logic was hardcoded to 30Hz delta time. The community patch decouples animation timing from frame rate:
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
ShadPS4 includes native SDL2 controller mapping. Plug your PS5 DualSense or PS4 DualShock 4 via USB-C, go to `Settings > Input`, and select `DualSense Wireless Controller`. Vibration and motion sensors for gestures are fully functional!', 'TUTORIAL / GUIDE', 878, 0, 7, 280, NULL, '{"title": "Bloodborne 4K 60FPS on PC (RTX 4080 + Ryzen 7800X3D - ShadPS4 v0.4)", "embed_url": "https://www.youtube-nocookie.com/embed/5W_w_G88Fqo", "provider": "youtube", "duration": "16:40"}', '[{"url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80", "caption": "ShadPS4 graphics settings panel with Vulkan API and shader cache options", "alt": "PC gaming screen settings"}, {"url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80", "caption": "Bloodborne running at smooth 60fps in Central Yharnam on PC", "alt": "Gamer battlestation"}]', NULL, NULL, 'published', 1790773487355, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-ios-sidestore-zero-revokes', 'c/technology', 'd163ab21da3c', 'MEMBER', '[GUIDE] iOS 17 & 18 Sideloading: SideStore + WireGuard Local VPN (Zero 7-Day Revokes, No PC Needed!)', 'Sideloading on iOS has always been plagued by Apple''s strict 7-day expiration timer on free developer provisioning profiles. Traditional AltStore requires your computer running AltServer on the same local Wi-Fi to refresh certificates every week.

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
   * Save this pairing file directly to your iPhone''s Files app in the `SideStore` folder.
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
   * Congratulations! Your apps will now refresh automatically every single night while your phone charges. You will never see a 7-day expired app error again!', 'TUTORIAL / GUIDE', 1122, 0, 6, 159, NULL, '{"title": "Permanent iOS Sideloading with SideStore (No PC Required After Setup)", "embed_url": "https://www.youtube-nocookie.com/embed/9bZkp7q19f0", "provider": "youtube", "duration": "11:05"}', '[{"url": "https://images.unsplash.com/photo-1510519138111-5582f3423c28?auto=format&fit=crop&w=1000&q=80", "caption": "iPhone displaying WireGuard loopback configuration and SideStore installed apps", "alt": "Modern smartphone interface"}]', NULL, NULL, 'published', 1790783525185, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-deepseek-r1-local-gpu', 'c/privacy-ai', 'db30fcedd957', 'MEMBER', '[LOCAL AI] Running DeepSeek-R1 32B & Qwen 2.5 on a Single 16GB Consumer GPU (Ollama + vLLM)', 'Why pay monthly subscriptions for closed-source AI APIs when open-weights reasoning models like **DeepSeek-R1** and **Qwen 2.5** match or exceed proprietary frontier models while keeping 100% of your data private on your own hardware?

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
   vllm serve casperhansen/deepseek-r1-distill-qwen-32b-awq \
     --gpu-memory-utilization 0.92 \
     --max-model-len 8192 \
     --kv-cache-dtype fp8 \
     --trust-remote-code
   ```
2. Run Open-WebUI via Docker:
   ```bash
   docker run -d -p 3000:8080 -e OPENAI_API_BASE_URL=http://localhost:8000/v1 \
     ghcr.io/open-webui/open-webui:main
   ```
3. Open `http://localhost:3000` in your browser. You now have your own self-hosted, unmonitored, private reasoning engine with step-by-step thinking traces!', 'TECH DISCUSSION', 1698, 0, 6, 212, NULL, '{"title": "DeepSeek-R1 32B Benchmark & Local GPU Setup Guide", "embed_url": "https://www.youtube-nocookie.com/embed/aircAruvnKk", "provider": "youtube", "duration": "18:32"}', '[{"url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80", "caption": "GPU monitoring showing 14.1 GB VRAM allocation and 32 t/s throughput", "alt": "Data center server racks"}]', NULL, NULL, 'published', 1790793551578, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-cs2-windows11-latency-tuning', 'c/gaming', '7695726e815f', 'MEMBER', '[PERFORMANCE] Ultimate CS2 & Valorant Windows 11 Latency Optimization Guide (DPC, Timer Resolution, Core Isolation)', 'Micro-stutters, erratic sub-tick hit registration in CS2, and input delay in competitive shooters are often caused by hidden Windows 11 OS bottlenecks rather than raw frame rates. Even on a high-end system pushing 400 FPS, erratic DPC (Deferred Procedure Call) latency can cause mouse movement to feel floaty and unresponsive.

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
* **Disable C-States & SpeedStep/Cool''n''Quiet**: Prevents CPU core frequency down-clocking during millisecond gaps between game frames.
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
* *Result*: 8% to 15% reduction in CPU frame render times and 1% low frame stabilization!', 'TUTORIAL / GUIDE', 394, 0, 6, 298, NULL, '{"title": "Fixing DPC Latency & Input Lag in Windows 11 (CS2 & Valorant Tested)", "embed_url": "https://www.youtube-nocookie.com/embed/eWvFw3g_T6w", "provider": "youtube", "duration": "13:48"}', '[{"url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80", "caption": "Competitive CS2 setup with 360Hz OLED and low-latency mouse tracking", "alt": "Esports gaming setup"}]', NULL, NULL, 'published', 1790803695538, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-bazzite-handheld-dualboot', 'c/gaming', '941861c1932b', 'MEMBER', '[TUTORIAL] Bazzite Linux Handheld Dual-Boot: SteamOS 3.6 Experience on ROG Ally, Legion Go & Steam Deck', 'Windows 11 on handheld gaming devices is an exercise in frustration: clunky touchscreen navigation, broken modern standby sleep mode that cooks your battery in your backpack, and background updates interrupting games.

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
   * Install Decky Loader from the desktop menu for custom themes, TDP controls, and battery monitors!', 'TUTORIAL / GUIDE', 1643, 0, 6, 189, NULL, '{"title": "Bazzite Turn Your ROG Ally into a Steam Deck (Installation Guide)", "embed_url": "https://www.youtube-nocookie.com/embed/6i2x7w_s_r8", "provider": "youtube", "duration": "15:20"}', '[{"url": "https://images.unsplash.com/photo-1612287233215-68045610d486?auto=format&fit=crop&w=1000&q=80", "caption": "Handheld PC booting into custom Bazzite Gamescope session with instant sleep/resume", "alt": "Handheld gaming device"}]', NULL, NULL, 'published', 1790813613876, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-re-unity-unreal-games', 'vault-guides', 'b48bb28b06fe', 'MEMBER', '[DEV & REVERSE-ENG] Decompiling Unity & Unreal Engine Games: Il2CppDumper, AssetStudio & Ghidra Setup', 'Game preservation, translation modding, and technical security analysis frequently require examining compiled game assets and executable binaries.

This technical guide demonstrates how to reconstruct symbol tables, dump metadata, and analyze game logic for modern Unity (IL2CPP) and Unreal Engine 5 titles.

---

### Part 1: Unity IL2CPP De-obfuscation
Modern Unity titles do not ship with readable C# Mono bytecode (`Assembly-CSharp.dll`). Instead, Unity''s Ahead-Of-Time (AOT) compiler converts C# intermediate language into C++ before compiling into machine code (`GameAssembly.dll`).

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
2. Click `File > Load Folder` and select the game''s Data directory.
3. Switch to the `Asset List` tab. Filter by `Texture2D`, `Mesh`, `AudioClip`, or `TextAsset`.
4. Right-click and choose `Export Selected Assets` to PNG / FBX / WAV formats!

---

### Part 3: Unreal Engine FModel Analysis
For Unreal Engine 4 and 5 games packed into `.pak`, `.utoc`, and `.ucas` container files:
* Use **FModel** with the game''s AES decryption key.
* Browse the virtual directory tree, preview materials, skeletal meshes, and audio blueprints in real-time.', 'TUTORIAL / GUIDE', 972, 0, 5, 122, NULL, '{"title": "Reverse-Engineering Unity IL2CPP Games with Il2CppDumper & Ghidra", "embed_url": "https://www.youtube-nocookie.com/embed/503MWQx3kYw", "provider": "youtube", "duration": "21:10"}', '[{"url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80", "caption": "Ghidra decompiler displaying reconstructed Unity C# method signatures", "alt": "Reverse engineering code on monitor"}]', NULL, NULL, 'published', 1790823906445, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-android-15-kernelsu-trickystore', 'c/technology', '19ed1df26baa', 'MEMBER', '[GUIDE] Android 15 Rooting: KernelSU Next & TrickyStore (Bypass Google Play Integrity Strong Verdict)', 'Traditional root methods like Magisk operate in userland and rely on ptrace injection (`zygisk`), making them trivial for Google''s Play Integrity API and aggressive banking applications (Revolut, Google Wallet, banking apps) to detect.

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
5. Google Wallet contactless tap-to-pay and banking apps work flawlessly without warnings!', 'TUTORIAL / GUIDE', 898, 0, 6, 65, NULL, '{"title": "KernelSU Next + TrickyStore Android 15 Root Setup (Strong Integrity Fixed)", "embed_url": "https://www.youtube-nocookie.com/embed/fJ9rUzIMcZQ", "provider": "youtube", "duration": "12:18"}', '[{"url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=80", "caption": "Pixel device passing Strong Play Integrity check with KernelSU Next", "alt": "Modern smartphone running apps"}]', NULL, NULL, 'published', 1790833906165, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-retroarch-crt-megabezel', 'c/gaming', 'ea3ba3d97619', 'MEMBER', '[GUIDE] RetroArch CRT Mega Bezel Reflection Shader: Turn Any 4K Screen into a 1990s Trinitron', 'Pixel art games from the 8-bit, 16-bit, and 32-bit eras (SNES, Genesis, PlayStation 1, Saturn) were deliberately drawn by artists to take advantage of the phosphor bleed, scanline bloom, and shadow masks of cathode-ray tube (CRT) televisions. On raw 4K LCD/OLED panels, raw square pixels look harsh, flat, and disproportioned.

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
4. The emulator executes frames ahead in memory, rolls back state on controller input, and displays the reaction on the exact current millisecond. Jump input feels instantaneous!', 'TUTORIAL / GUIDE', 537, 0, 5, 48, NULL, '{"title": "HSM Mega Bezel CRT Shader Showcase & 4K Setup Guide", "embed_url": "https://www.youtube-nocookie.com/embed/Z1BCujX3pw8", "provider": "youtube", "duration": "14:50"}', '[{"url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80", "caption": "Mega Bezel shader on 4K OLED reproducing authentic Trinitron phosphor glow", "alt": "Retro CRT shader display"}]', NULL, NULL, 'published', 1790843936995, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-truenas-10g-nas-zfs', 'c/opensource', 'b44d4e99e939', 'MEMBER', '[TUTORIAL] 10Gbps Homelab NAS Architecture: TrueNAS SCALE, ZFS RaidZ2 & Cloudflare Tunnels', 'Building a whisper-quiet, enterprise-grade storage server for under $600 using enterprise decommissioned hardware and consumer parts.

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
3. Access Nextcloud, Immich, and management dashboards securely from anywhere on Earth with zero open ports on your home firewall!', 'TUTORIAL / GUIDE', 1745, 0, 5, 195, NULL, '{"title": "Ultimate 10Gbps TrueNAS SCALE Homelab Build (ZFS Deep-Dive)", "embed_url": "https://www.youtube-nocookie.com/embed/5m3l3_sA99w", "provider": "youtube", "duration": "24:10"}', '[{"url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80", "caption": "Mellanox ConnectX-3 10GbE NIC transferring at 1.12 GB/s over ZFS pool", "alt": "Server rack hardware"}]', NULL, NULL, 'published', 1790853932706, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-rpi5-nvme-unbound-dns', 'c/opensource', 'dcbdcf10dc15', 'ARCHIVIST', '[GUIDE] Raspberry Pi 5 NVMe PCIe Gen3 Boot + Pi-hole & Unbound Encrypted Recursive DNS Resolver', 'MicroSD cards are the single biggest point of failure in Raspberry Pi homelabs. They wear out quickly under database write loads and cap random 4K read/write speeds at 5-10 MB/s.

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
4. Point Pi-hole''s upstream DNS to `127.0.0.1#5335`.

*Result*: Absolute network privacy, zero third-party DNS logging, encrypted resolution, and sub-1ms DNS cache responses for your entire home network!', 'TUTORIAL / GUIDE', 659, 0, 4, 213, NULL, '{"title": "Raspberry Pi 5 NVMe Boot + Unbound Recursive DNS Setup", "embed_url": "https://www.youtube-nocookie.com/embed/8v_jZ8_11e0", "provider": "youtube", "duration": "16:25"}', '[{"url": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80", "caption": "Raspberry Pi 5 with Geekworm NVMe bottom HAT running Unbound DNS", "alt": "Raspberry Pi board with NVMe SSD"}]', NULL, NULL, 'published', 1790864231582, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-ddr5-ram-subtimings-oc', 'c/technology', 'c050cc20e81c', 'MEMBER', '[OVERCLOCKING] DDR5 Memory Tuning Guide: Hynix A-Die Sub-Timings & 8000MT/s Stability (TM5 Anta777)', 'Most PC builders simply enable XMP/EXPO in BIOS and leave 25% of their memory performance on the table. While primary timings (CL30-38-38) get all the marketing hype, **secondary and tertiary sub-timings dictate over 80% of actual memory latency and 1% low frame rates in gaming**.

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
3. If error occurs on cycle 2+: Increase VDD by 0.02V or bump tRFC by +20.', 'HARDWARE', 1639, 0, 4, 65, NULL, '{"title": "DDR5 Memory Sub-timings Explained: Turn Cheap RAM into 8000MT/s Monsters", "embed_url": "https://www.youtube-nocookie.com/embed/9M0YV_m6hVo", "provider": "youtube", "duration": "22:45"}', '[{"url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80", "caption": "AIDA64 latency benchmark dropping from 68ns to 52ns after sub-timing tuning", "alt": "RAM benchmark results on screen"}]', NULL, NULL, 'published', 1790874247122, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-proxmox-gpu-passthrough-sunshine', 'c/gaming', '67047c5be367', 'MODERATOR', '[TUTORIAL] Headless Cloud Gaming Server: Proxmox VE 8 GPU Passthrough + Sunshine / Moonlight 120FPS', 'Turn an old gaming PC or server chassis in your basement into your own private GeForce NOW cloud gaming host. Stream full 4K 120FPS HDR games to your Steam Deck, MacBook, Apple TV, or smartphone over local Wi-Fi 6E with imperceptible 3ms input lag.

### Step 1: Proxmox IOMMU & VFIO Isolation
1. Enable IOMMU in `/etc/default/grub`:
   ```bash
   GRUB_CMDLINE_LINUX_DEFAULT="quiet intel_iommu=on iommu=pt"
   ```
2. Blacklist host GPU drivers so Proxmox doesn''t touch the graphics card:
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
* Controller vibration, gyroscopic motion, and keyboard/mouse passthrough are fully synchronized with under 4ms network transit time!', 'TUTORIAL / GUIDE', 1478, 0, 2, 59, NULL, '{"title": "Build Your Own Cloud Gaming Server with Proxmox & Sunshine", "embed_url": "https://www.youtube-nocookie.com/embed/sN6dI8yN1oM", "provider": "youtube", "duration": "19:15"}', '[{"url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80", "caption": "Moonlight streaming 4K 120FPS to OLED TV with sub-4ms decode latency", "alt": "Cloud gaming setup"}]', NULL, NULL, 'published', 1790884318578, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-ps4-1352-webkitty-deepdive', 'vault-guides', '9324ec4fc950', 'MEMBER', '[EXPLOIT ANALYSIS] PS4 11.50 – 13.52 WebKitty Exploit: Userland WebKit RCE & FreeBSD IPv6 Socket Heap Overflow', 'A technical retrospective and deep-dive into how the PS4 11.50 through 13.52 security perimeter was pierced by security researchers.

### The Attack Vector: From WebKit Sandbox to Ring 0 Kernel
1. **Userland Entry Point (WebKitty)**:
   * Leverages a type confusion bug in JavaScriptCore''s JIT compiler.
   * By allocating typed arrays (`Uint32Array`) with overlapping memory backings, arbitrary read/write inside the WebProcess memory space is achieved.
   * This defeats userland ASLR and establishes a ROP (Return-Oriented Programming) chain.
2. **Escaping the Sandbox**:
   * Sony''s WebProcess is sandboxed via FreeBSD `capsicum` rights.
   * To breach the kernel, the exploit accesses POSIX socket descriptors exposed to the network stack.
3. **The Kernel Heap Overflow**:
   * When handling malformed IPv6 socket options (`setsockopt` with `IPV6_PKTINFO`), the kernel network buffer (`mbuf`) fails to validate packet length headers.
   * This allows the attacker to corrupt adjacent kernel structure function pointers and overwrite `sysent` entries, redirecting execution to unsigned shellcode.
4. **GoldHEN Integration**:
   * Once kernel execution is achieved, GoldHEN disables memory write protections (`cr0.WP`), patches `sys_mprotect` to allow RWX memory mapping, and initializes the homebrew loader daemon on localhost port 9020.

Long live software preservation and the right to repair!', 'TECH DISCUSSION', 1663, 0, 2, 272, NULL, '{"title": "PlayStation 4 Kernel Security Architecture & Exploit Chains", "embed_url": "https://www.youtube-nocookie.com/embed/K81jZ9X40_o", "provider": "youtube", "duration": "31:40"}', '[{"url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80", "caption": "Kernel memory hex dump showing poisoned mbuf structure and hijacked RIP register", "alt": "Reverse engineering kernel memory dump"}]', NULL, NULL, 'published', 1790894285550, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-esp32-zigbee-home-assistant', 'c/solarpunk', '1a4cb10518cb', 'MEMBER', '[SMARTHOME] ESP32 & Zigbee Local Home Assistant Setup: Zero Cloud, 100% Offline Automation', 'Smart homes shouldn''t stop working when your internet goes down or when a company shuts down its cloud servers.

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
3. **Automations**: Millisecond motion-to-light trigger without round-tripping to cloud servers!', 'TUTORIAL / GUIDE', 414, 0, 2, 171, NULL, '{"title": "Complete 100% Local Smart Home with Zigbee2MQTT & Home Assistant", "embed_url": "https://www.youtube-nocookie.com/embed/s2j_M7f91kA", "provider": "youtube", "duration": "20:30"}', '[{"url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80", "caption": "Home Assistant Zigbee mesh graph showing 42 connected offline nodes", "alt": "Smart home dashboard"}]', NULL, NULL, 'published', 1790904544859, 0);
INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES ('tut-nix-flakes-reproducible-dev', 'c/opensource', '93e776f1f2e1', 'MEMBER', '[DEV & LINUX] The Definitive Nix Flakes Guide: 100% Reproducible Environments on Mac, Linux & WSL', 'Eliminate ''it works on my machine'' forever. **Nix Flakes** provides hermetic, mathematically pure package management with cryptographic lockfiles (`flake.lock`).

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
The exact instant you `cd` into your project directory, your shell activates the locked compiler versions. When you `cd ..`, they evaporate cleanly without polluting your global PATH!', 'TUTORIAL / GUIDE', 1846, 0, 2, 204, NULL, '{"title": "Nix Flakes Tutorial for Developers (Ditch Docker Dev Containers)", "embed_url": "https://www.youtube-nocookie.com/embed/0UxUzNZpY8E", "provider": "youtube", "duration": "18:40"}', '[{"url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80", "caption": "Terminal showing direnv loading hermetic flake packages in 120ms", "alt": "Nix terminal development environment"}]', NULL, NULL, 'published', 1790914495677, 0);

-- 2. COMMENTS
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps4-13-1', 'tut-ps4-1352-pppwn-goldhen', NULL, '5f5afaabbdaf', 'MEMBER', 'The gigabit switch trick is literally life saving! I spent 3 hours getting kernel panics on stage 4 with direct cable to my Realtek onboard NIC. Put an old TP-Link switch in the middle and it hit on the very first try!!', 91, 1790743847304);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps4-13-2', 'tut-ps4-1352-pppwn-goldhen', NULL, '180cabebf55c', 'ARCHIVIST', 'Wait does 13.52 have 100% success rate or is it still unstable like the early webkit leaks? I''m on 11.02 and scared to update.', 76, 1790743989620);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps4-13-3', 'tut-ps4-1352-pppwn-goldhen', NULL, '7d81c741ad8e', 'MEMBER', 'DO NOT UPDATE! Rule #1 of console modding is always stay on the lowest firmware possible. 11.00 has ~95% exploit stability while 13.52 sometimes requires 2-3 retries if the memory heap gets fragmented.', 118, 1790744071092);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps4-13-4', 'tut-ps4-1352-pppwn-goldhen', NULL, '816dd35d9f1d', 'MODERATOR', 'Can i play online games with this or will sony ban my console instantly??', 95, 1790744171847);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps4-13-5', 'tut-ps4-1352-pppwn-goldhen', 'comm-tut-ps4-13-4', '051851246645', 'MEMBER', 'No online play at all. The moment you connect to PSN you will be forced to update to latest firmware or get console ID permanently banned. Keep your DNS blocked and enjoy offline homebrew/backups.', 130, 1790744556346);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps4-13-6', 'tut-ps4-1352-pppwn-goldhen', NULL, 'ed6816789120', 'MEMBER', 'For anyone with an ESP32-S2, there''s already a compiled bin that auto-triggers PPPwn on boot so you don''t even need a PC running. Just plug the micro-usb into the PS4 back port and ethernet into the board.', 62, 1790745028567);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps4-13-7', 'tut-ps4-1352-pppwn-goldhen', NULL, 'aeca0956d52a', 'MEMBER', 'Sony engineers punching the air right now seeing a 10 year old PPPoE driver take down their security layer lmao 🤡', 106, 1790745385273);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps4-13-8', 'tut-ps4-1352-pppwn-goldhen', NULL, '134ddf35f829', 'MEMBER', 'GoldHEN''s fan curve control is the best part. Set my PS4 Pro to keep temps under 68C and the jet engine fan noise is completely gone.', 71, 1790746506524);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps5-et-1', 'tut-ps5-etahen-60fps-guide', NULL, '615a4f0595c5', 'MEMBER', 'Playing Bloodborne in 60 FPS without the disgusting frame pacing stutter feels like playing a completely different game. FromSoftware should have released this 4 years ago!', 17, 1790754596463);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps5-et-2', 'tut-ps5-etahen-60fps-guide', NULL, 'e3bd6e64c684', 'MEMBER', 'Is the hypervisor completely cracked on 4.51 or is this still relying on Kstuff patching kernel hooks in memory?', 115, 1790755357031);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps5-et-3', 'tut-ps5-etahen-60fps-guide', 'comm-tut-ps5-et-2', '747671412b19', 'MEMBER', 'Hypervisor (HV) is still technically isolated in secure world, but Kstuff redirects function tables in kernel space before hypercalls are dispatched. That''s why we get unsigned code execution without needing a full secure bootchain exploit.', 61, 1790756558160);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps5-et-4', 'tut-ps5-etahen-60fps-guide', 'comm-tut-ps5-et-2', '15cf7c802b3c', 'MEMBER', 'Bro I have a PS5 slim sitting on 8.00, can I use the BD-J disc method or do I need the digital webkit?', 88, 1790757054613);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps5-et-5', 'tut-ps5-etahen-60fps-guide', NULL, 'b84131af1161', 'MEMBER', 'BD-J works if you have the disc drive edition! Burn the exploit iso onto a BD-RE disc. If you have the digital edition without disc drive, stay put on 8.00 and wait for the webkit chain to be released publicly.', 139, 1790757145263);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps5-et-6', 'tut-ps5-etahen-60fps-guide', 'comm-tut-ps5-et-5', 'b7b40e65e386', 'MEMBER', 'Sony charging $700 for PS5 Pro while modders are unlocking 60fps on base PS5 for free 💀💀💀', 47, 1790757327510);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps5-et-7', 'tut-ps5-etahen-60fps-guide', NULL, '1f8a2f53fc46', 'ARCHIVIST', 'Itemzflow dumping speeds over USB 3.2 Gen 2 to an external Samsung 990 Pro are hitting over 450 MB/s. Backed up my 90GB Gran Turismo 7 in under 4 minutes.', 51, 1790757718861);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-switch-1', 'tut-switch-oled-picofly-guide', NULL, 'e4b54103e4ac', 'MEMBER', 'Excellent guide. One critical note: please apply a drop of UV curing solder mask resin over the DAT0 ribbon blade once you verify your 0.68V reading. If you assemble the console without resin, the thermal expansion from the Tegra heatsink will cause the blade to walk off the ball after 2 weeks.', 122, 1790764401619);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-switch-2', 'tut-switch-oled-picofly-guide', NULL, '2d9eef711c4c', 'MEMBER', 'My hands were shaking so bad trying to solder the CLK resistor point lol. You definitely need flux and 0.1mm wire, standard 0.5mm solder wire will bridge everything.', 103, 1790765224408);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-switch-3', 'tut-switch-oled-picofly-guide', NULL, 'ef560a97f2a0', 'MEMBER', 'Why not just buy an unpatched V1 switch on eBay and use a $3 plastic RCM jig?', 67, 1790765932097);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-switch-4', 'tut-switch-oled-picofly-guide', NULL, 'f43228c293d5', 'MEMBER', 'Because the OLED screen makes a massive difference! The deep blacks and 7-inch display combined with battery life that lasts twice as long as the V1 unpatched model is night and day.', 134, 1790766945397);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-switch-5', 'tut-switch-oled-picofly-guide', NULL, 'f5a0f8e0da04', 'MEMBER', 'Blanking prodinfo in emuMMC is the secret sauce. I''ve had my modded OLED for 18 months, play homebrew on emuMMC, and reboot into stock SysNAND to play Mario Kart online on official servers with zero bans.', 138, 1790768234934);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-switch-6', 'tut-switch-oled-picofly-guide', 'comm-tut-switch-5', '744d4502ff7b', 'MEMBER', 'Nintendo ninja lawyers entering the chat with a cease and desist in 3... 2... 1... 🥷', 30, 1790769349633);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-shadps-1', 'tut-shadps4-bloodborne-pc-setup', NULL, '13ff8c3906a1', 'MODERATOR', 'Sony: We cannot port Bloodborne to PC because the engine is too complex. Random open-source devs in their bedrooms: Hold our beer 🍺', 74, 1790773825031);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-shadps-2', 'tut-shadps4-bloodborne-pc-setup', NULL, '615a4f0595c5', 'MEMBER', 'Can confirm! Ryzen 7 7800X3D + RTX 4070 Super running locked 60fps at 1440p. Shader compilation stuttered for the first 10 minutes in the clinic, but once the pipeline compiled, it''s buttery smooth!', 42, 1790774034943);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-shadps-3', 'tut-shadps4-bloodborne-pc-setup', 'comm-tut-shadps-2', '1f305f6553e9', 'MEMBER', 'Does this work on Steam Deck or is the GPU too weak?', 60, 1790775162600);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-shadps-4', 'tut-shadps4-bloodborne-pc-setup', 'comm-tut-shadps-2', '476272a37ad4', 'MEMBER', 'Steam Deck can currently boot to the main menu and get into the graveyard, but hits around 20-25 fps with heavy memory pressure. Give the developers a few more months to optimize compute shaders for RDNA2.', 20, 1790775261598);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-shadps-5', 'tut-shadps4-bloodborne-pc-setup', NULL, 'cd82f10d8c6b', 'MEMBER', 'Finally being able to play Bloodborne without chromatic aberration smearing the entire screen is an absolute revelation. Yharnam gothic architecture is breathtaking in 4K.', 135, 1790776210850);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-shadps-6', 'tut-shadps4-bloodborne-pc-setup', 'comm-tut-shadps-5', '7e3ebbc4cf52', 'ARCHIVIST', 'Are the memory leak crashes during the Father Gascoigne cutscene fixed in v0.4?', 85, 1790777367300);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-shadps-7', 'tut-shadps4-bloodborne-pc-setup', NULL, '2899b7a62823', 'MEMBER', 'Yes! Pull request #894 merged the fix for the audio stream buffer overflow that caused the cutscene memory crash. Works without issues now.', 132, 1790778493440);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ios-si-1', 'tut-ios-sidestore-zero-revokes', NULL, 'ced0b1619aad', 'MEMBER', 'This setup changed my entire iOS experience. Having uYouEnhanced without ads and background playback on my iPhone 15 Pro without jailbreaking is incredible.', 59, 1790784505757);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ios-si-2', 'tut-ios-sidestore-zero-revokes', NULL, '8990924a8e6c', 'MEMBER', 'The WireGuard loopback trick is pure genius. Apple''s sandbox prevents apps from talking to local socket APIs directly, but looping through a local VPN tunnel completely bypasses the restriction.', 73, 1790785134625);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ios-si-3', 'tut-ios-sidestore-zero-revokes', 'comm-tut-ios-si-2', '69bb7cd43d20', 'MEMBER', 'Does this still have the 3 app limit?', 107, 1790785603201);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ios-si-4', 'tut-ios-sidestore-zero-revokes', NULL, 'f69a31d6748f', 'MEMBER', 'Yes, free Apple IDs are restricted by Apple''s server-side certificate limit to 3 active sideloaded apps at a time (1 is SideStore itself, so you get 2 heavy apps like uYou and Delta). If you want unlimited apps, you need a paid $99/year developer account or a signing certificate service like Maplesign/Kravat.', 64, 1790786980157);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ios-si-5', 'tut-ios-sidestore-zero-revokes', NULL, 'd266bba40a69', 'MEMBER', 'EU users with official sideloading watching rest of the world do backflips with WireGuard VPNs just to install an emulator 💀💀💀', 120, 1790787137447);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ios-si-6', 'tut-ios-sidestore-zero-revokes', NULL, '0f3e368ea7f3', 'MEMBER', 'The nightly automation has been running for 4 months straight on my 14 Pro without failing once. 10/10 guide.', 69, 1790787555020);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-deepse-1', 'tut-deepseek-r1-local-gpu', NULL, 'b462135e2856', 'GUARDIAN', 'DeepSeek-R1 reasoning tokens on coding tasks are phenomenal. I gave it a complex Rust async deadlock problem and it thought through 1,200 tokens of internal reasoning before spitting out a flawless fix.', 79, 1790794676338);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-deepse-2', 'tut-deepseek-r1-local-gpu', NULL, '5af5600ed3ab', 'MEMBER', 'Bought two used RTX 3090s off eBay for $650 each and linked them via NVLink. Running the full 70B Llama 3.3 model at 4-bit with 48GB VRAM total. Beats paying OpenAI $20/month every day of the week.', 138, 1790795788097);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-deepse-3', 'tut-deepseek-r1-local-gpu', 'comm-tut-deepse-2', '5841d81bfab4', 'MEMBER', 'What about RTX 3060 12GB? Can it run anything good?', 46, 1790797166326);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-deepse-4', 'tut-deepseek-r1-local-gpu', 'comm-tut-deepse-2', '92adb08137f7', 'MEMBER', 'Yes! On a 12GB card, run `deepseek-r1:14b` or `qwen2.5:14b-instruct-q4_K_M`. The 14B model takes around 8.5 GB VRAM and generates ~42 tokens per second on a 3060. It punches far above its weight.', 39, 1790798229036);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-deepse-5', 'tut-deepseek-r1-local-gpu', 'comm-tut-deepse-2', '72e2cb0ae844', 'MEMBER', 'Zero corporate telemetry, zero logs sent to cloud providers, zero copyright filter censorship. This is what computing was always meant to be.', 53, 1790798660657);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-deepse-6', 'tut-deepseek-r1-local-gpu', NULL, '4ac11fcf7064', 'MEMBER', 'Sam Altman seeing people run better models on their own PCs for free: 👁️👄👁️', 14, 1790799319799);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-cs2-wi-1', 'tut-cs2-windows11-latency-tuning', NULL, '53e9605fc167', 'ARCHIVIST', 'Toggling off Memory Integrity in Windows 11 completely fixed my CS2 micro-stutters. I was getting crazy frametime spikes in smokes on Mirage and now it''s a completely flat line.', 69, 1790804340527);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-cs2-wi-2', 'tut-cs2-windows11-latency-tuning', NULL, '58628c59bebf', 'MEMBER', 'The MSI Mode Utility is mandatory for any modern PC. Changing GPU IRQ to High priority dropped my LatencyMon nvlddmkm.sys spike from 850µs to 72µs!', 55, 1790804575799);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-cs2-wi-3', 'tut-cs2-windows11-latency-tuning', NULL, 'b462135e2856', 'GUARDIAN', 'Is it safe to turn off Core Isolation? Will I get viruses??', 57, 1790804933618);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-cs2-wi-4', 'tut-cs2-windows11-latency-tuning', 'comm-tut-cs2-wi-3', '37be4c890dab', 'MEMBER', 'If you''re not downloading random cracked executables from sketchy Telegram channels, standard Windows Defender real-time antivirus is more than enough. Core Isolation is designed for enterprise corporate laptops to prevent ring-0 kernel DMA attacks.', 96, 1790805342900);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-cs2-wi-5', 'tut-cs2-windows11-latency-tuning', NULL, 'aeca0956d52a', 'MEMBER', 'Bro did all this optimization just to miss spray on someone looking the wrong way 💀💀', 66, 1790805587724);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-cs2-wi-6', 'tut-cs2-windows11-latency-tuning', 'comm-tut-cs2-wi-5', '71d5e35889b7', 'MEMBER', 'Don''t forget to set raw input in CS2 console: `m_rawinput 1` and disable Windows mouse pointer acceleration in Control Panel.', 91, 1790806825958);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-bazzit-1', 'tut-bazzite-handheld-dualboot', NULL, '4025bc14b2bc', 'MODERATOR', 'Bazzite saved my ROG Ally from being sold. Windows sleep mode drained 30% battery overnight every single time. On Bazzite, I press sleep, come back tomorrow, and it lost 2% battery. Exactly like a Nintendo Switch.', 81, 1790814813553);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-bazzit-2', 'tut-bazzite-handheld-dualboot', NULL, 'fe17bea9d8d0', 'MEMBER', 'Does the Legion Go trackpad and scroll wheel work properly in game mode?', 83, 1790816150671);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-bazzit-3', 'tut-bazzite-handheld-dualboot', 'comm-tut-bazzit-2', 'f7eacb7c7296', 'MEMBER', 'Yes! Bazzite maps the optical sensor trackpad as a native mouse in desktop mode and as a Steam haptic touchpad in Game Mode. Works out of the box.', 59, 1790816608531);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-bazzit-4', 'tut-bazzite-handheld-dualboot', NULL, 'e59b24e307ca', 'MEMBER', 'What about games with anti-cheat like Fortnite and Valorant?', 92, 1790817145371);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-bazzit-5', 'tut-bazzite-handheld-dualboot', NULL, '31b60293db79', 'MEMBER', 'Fortnite, Valorant, and CoD Warzone will NOT work on Linux because their kernel anti-cheats (Vanguard / Ricochet) block Proton. That is why we dual-boot! Boot into Windows for those 2-3 games, and use Bazzite for everything else.', 24, 1790818395582);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-bazzit-6', 'tut-bazzite-handheld-dualboot', NULL, 'b7b40e65e386', 'MEMBER', 'Microsoft watching handheld makers ditch Windows 11 the moment an open source alternative exists lmao', 109, 1790818553841);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-re-uni-1', 'tut-re-unity-unreal-games', NULL, '20cb88cae370', 'MEMBER', 'Il2CppDumper combined with BepInEx 6 pre-releases has made Unity modding so pleasant. Being able to hook native C++ methods with Harmony patches in C# without touching assembly is wizardry.', 73, 1790824144576);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-re-uni-2', 'tut-re-unity-unreal-games', NULL, '58159c967492', 'MEMBER', 'It''s always wild how many game developers leave sensitive API tokens and unencrypted backend webhook URLs inside global-metadata.dat thinking nobody can read IL2CPP builds.', 125, 1790824975522);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-re-uni-3', 'tut-re-unity-unreal-games', NULL, '2c7a2590a8e4', 'MEMBER', 'Can you use this to extract 3D character models for 3D printing?', 126, 1790826030766);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-re-uni-4', 'tut-re-unity-unreal-games', 'comm-tut-re-uni-3', '61bc4937c48d', 'MEMBER', 'Yes! AssetStudio exports meshes directly to .obj or .fbx. Open them in Blender, clean up non-manifold geometry, and export to STL for slicing. Done it dozens of times.', 62, 1790827361025);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-re-uni-5', 'tut-re-unity-unreal-games', NULL, '61589596eb90', 'MEMBER', 'Game devs spending 3 years building an anti-cheat only for a 16 year old with Ghidra to bypass it in 20 minutes.', 80, 1790827948700);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-androi-1', 'tut-android-15-kernelsu-trickystore', NULL, '1924cf443966', 'MEMBER', 'KernelSU is the greatest advancement in Android modding since SuperSU. The fact that an app running in user space cannot even inspect kernel syscall hooks makes cat-and-mouse detection games obsolete.', 137, 1790834584886);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-androi-2', 'tut-android-15-kernelsu-trickystore', NULL, '5c8a593dffe8', 'MEMBER', 'Can confirm Google Wallet tap-to-pay worked at the grocery store this morning on my rooted Pixel 8 Pro running Android 15. TrickyStore is essential.', 143, 1790835619143);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-androi-3', 'tut-android-15-kernelsu-trickystore', NULL, 'c80ad57c04b5', 'MEMBER', 'Where do people get valid keybox.xml files? Aren''t they banned quickly?', 19, 1790836063809);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-androi-4', 'tut-android-15-kernelsu-trickystore', 'comm-tut-androi-3', 'b48bb28b06fe', 'MEMBER', 'Keyboxes get leaked from old OEM factory firmware tools or test devices. As long as you don''t share the keybox publicly on GitHub, private ones can last for years without Google revoking the certificate.', 79, 1790836482080);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-androi-5', 'tut-android-15-kernelsu-trickystore', 'comm-tut-androi-3', '609f13e2d05f', 'MEMBER', 'Does this trip Samsung Knox if done on a Galaxy device?', 133, 1790836747983);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-androi-6', 'tut-android-15-kernelsu-trickystore', NULL, 'abf01c8affa0', 'MEMBER', 'YES. Unlocking bootloader on ANY Samsung device blows the physical eFuse (Knox 0x1) permanently. Do not do this on a Samsung if you care about Secure Folder or Samsung Pass.', 19, 1790837502544);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-retroa-1', 'tut-retroarch-crt-megabezel', NULL, 'e4ceb622e518', 'MEMBER', 'On an LG C3/C4 OLED in a dark room with the MBZ Aperture Grille preset, my brain genuinely forgets I''m looking at a flat OLED panel. The ambient reflection of bright explosions bouncing onto the virtual bezel is hypnotic.', 14, 1790845228144);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-retroa-2', 'tut-retroarch-crt-megabezel', NULL, '920989caa4cd', 'ARCHIVIST', 'Runahead is black magic. Doing frame-perfect Super Mario World Kaizo jumps on a wireless 8BitDo controller with 0ms perceived latency is something I never thought possible on an emulator.', 91, 1790846345592);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-retroa-3', 'tut-retroarch-crt-megabezel', NULL, 'd266bba40a69', 'MEMBER', 'Does this require a beefy GPU? My mini PC has an Intel N100.', 34, 1790847247271);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-retroa-4', 'tut-retroarch-crt-megabezel', NULL, 'ae2a1ee2ce6e', 'MEMBER', 'The ADV (Advanced) preset will definitely lag on an Intel N100 iGPU. Use the `MBZ__3__BASIC` preset instead! It disables the real-time ray-traced bezel reflection but preserves the gorgeous Guest-DrVenom CRT scanline filter at 60fps locked.', 73, 1790848155184);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-retroa-5', 'tut-retroarch-crt-megabezel', 'comm-tut-retroa-4', '93fe2ba8dbce', 'MEMBER', 'Castlevania: Symphony of the Night with this shader looks exactly the way my 10-year-old self remembered it on my childhood 14-inch Sony TV. Beautiful work.', 77, 1790849381065);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-truena-1', 'tut-truenas-10g-nas-zfs', NULL, '49415f1dd3a5', 'MODERATOR', 'Mellanox ConnectX-3 cards are the absolute cheat code of homelabbing. $30 on eBay, Linux kernel drivers are built-in, runs cool with a small heatsink fan. Can''t recommend them enough.', 35, 1790854167516);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-truena-2', 'tut-truenas-10g-nas-zfs', NULL, '338ae805b92c', 'MEMBER', 'Setting recordsize to 1M on the video dataset is crucial. People leave it at default 128k and wonder why their 10G link caps out at 350 MB/s. 1M gives you sequential throughput that maxes out the bus.', 30, 1790854988515);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-truena-3', 'tut-truenas-10g-nas-zfs', NULL, '012fbc5eb421', 'MEMBER', 'Is RaidZ2 safe enough or do I need offsite backups too?', 49, 1790856033087);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-truena-4', 'tut-truenas-10g-nas-zfs', NULL, 'c4c12ea367c1', 'MEMBER', 'Raid is NOT a backup! Raid is high availability and uptime. If a power surge fries your PSU or ransomware hits your shares, RaidZ2 won''t save you. Follow 3-2-1: 3 copies, 2 different media, 1 offsite encrypted in Cloudflare R2 / AWS S3.', 144, 1790857319380);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-truena-5', 'tut-truenas-10g-nas-zfs', NULL, 'ec7d62605b8b', 'GUARDIAN', 'Cloudflare Zero Trust tunnels with WARP client make WireGuard feel so outdated. Zero router ports forwarded, SSO passkey login, seamless.', 47, 1790858113366);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-rpi5-n-1', 'tut-rpi5-nvme-unbound-dns', NULL, '92662dede481', 'MEMBER', 'Unbound is so liberating. Knowing my ISP can''t see which domains I''m resolving or sell my browsing patterns to data brokers gives such peace of mind.', 50, 1790858009366);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-rpi5-n-2', 'tut-rpi5-nvme-unbound-dns', NULL, '7cf2500ae93d', 'MEMBER', 'PCIe Gen 3 on Pi 5 has been rock solid for me with a Crucial P3 Plus. Apt updates take 3 seconds instead of 2 minutes on MicroSD.', 141, 1790858046366);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-rpi5-n-3', 'tut-rpi5-nvme-unbound-dns', NULL, '8d85b373ebce', 'MEMBER', 'Does this block YouTube ads on smart TVs?', 121, 1790857972366);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-rpi5-n-4', 'tut-rpi5-nvme-unbound-dns', 'comm-tut-rpi5-n-3', '9169082942f7', 'MEMBER', 'DNS-based ad blockers cannot block YouTube ads because YouTube serves ads from the same video streaming domains (`googlevideo.com`). To block YouTube ads on TVs, you need SmartTube on Android TV or uYouEnhanced on Apple TV / iOS.', 79, 1790858014366);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ddr5-r-1', 'tut-ddr5-ram-subtimings-oc', NULL, '01b674759df5', 'MEMBER', 'Maxing out tREFI to 65535 shaved 6ns off my AIDA64 latency immediately. Make sure you have a fan blowing over your RAM sticks though, high tREFI makes memory sensitive to temperature errors above 52C.', 134, 1790858074366);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ddr5-r-2', 'tut-ddr5-ram-subtimings-oc', NULL, 'ae24bfa3eca4', 'MEMBER', 'My 0.1% lows in Cyberpunk 2077 dogtown went from 58 fps to 78 fps just by tuning tRRD and tRFC. The micro-stuttering is completely gone.', 23, 1790857899366);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ddr5-r-3', 'tut-ddr5-ram-subtimings-oc', 'comm-tut-ddr5-r-2', '42ed2756a63a', 'MEMBER', 'How do I know if my kit is Hynix A-die or Samsung?', 132, 1790857893366);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ddr5-r-4', 'tut-ddr5-ram-subtimings-oc', 'comm-tut-ddr5-r-2', 'd67548d57fec', 'MEMBER', 'Check your label or run CPU-Z / Taiphoon Burner. If the kit is 6000 CL30-36-36 or 6400 CL32, it''s 100% Hynix A-die. If it''s 6000 CL36-36-36, it''s likely Samsung (which cannot tighten tRFC anywhere near as low).', 57, 1790857996366);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-proxmo-1', 'tut-proxmox-gpu-passthrough-sunshine', NULL, '1a7067dabf05', 'MEMBER', 'Streaming Cyberpunk path tracing from my basement 4090 to my Steam Deck OLED at 90Hz while lying in bed is pure sci-fi. The Deck stays completely silent, cold to the touch, and battery lasts 6 hours!', 101, 1790857972366);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-proxmo-2', 'tut-proxmox-gpu-passthrough-sunshine', NULL, '8874b44ee2db', 'MEMBER', 'Moonlight on Apple TV 4K wired via Ethernet is hands down the best console experience. Zero noise in the living room, games look indistinguishable from native HDMI.', 83, 1790858056707);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps4-13-1', 'tut-ps4-1352-webkitty-deepdive', NULL, '1d24cd2b20d8', 'MEMBER', 'The FreeBSD mbuf heap overflow is such an elegant primitive. Shows once again that ancient BSD network stack code from 2008 often has subtle corner cases that modern compilers can''t detect without formal verification.', 54, 1790858158366);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-ps4-13-2', 'tut-ps4-1352-webkitty-deepdive', NULL, 'fe17bea9d8d0', 'MEMBER', 'Brilliant writeup. The fact that WebKit sandbox escapes keep popping up every 18 months proves that monolithic browser engines inside OS kernels are a perpetual attack surface.', 59, 1790857986366);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-esp32--1', 'tut-esp32-zigbee-home-assistant', NULL, 'a26fe18df4f1', 'MEMBER', 'Migrating from Google Home to Home Assistant was the best decision of my life. Zero delayed commands and automations trigger instantly.', 116, 1790858075366);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-esp32--2', 'tut-esp32-zigbee-home-assistant', NULL, '77574d4d27d5', 'MEMBER', 'ESPHome with the ESP32-C3 is incredible. You can buy 5 boards on AliExpress for $12 and build custom air quality sensors for every bedroom.', 42, 1790858148366);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-nix-fl-1', 'tut-nix-flakes-reproducible-dev', NULL, 'd476514e792e', 'MEMBER', 'Nix flakes + direnv is pure bliss. Onboarding a new engineer takes literally 30 seconds: git clone, direnv allow, cargo build. No installing 15 different homebrew formulas.', 140, 1790858042366);
INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES ('comm-tut-nix-fl-2', 'tut-nix-flakes-reproducible-dev', NULL, '5fa10b7345ae', 'MEMBER', 'The fact that flake.lock locks every single transitive dynamic library hash makes debugging CI failures so trivial. Reproducibility at its finest.', 113, 1790857928366);

-- 3. LIVE CHAT MESSAGES
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2001', 'relays-general', '1d24cd2b20d8', 'anyone here tested PPPwn on 11.02 yet? my pro has been sitting in a closet for a year', NULL, '#420', 'verified', NULL, 1790793465421);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2002', 'relays-general', 'd5da5226f632', 'yep just ran it an hour ago! works fine but stage 1 took like 4 retries for me', NULL, '#420', 'verified', NULL, 1790793504645);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2003', 'relays-general', '89982f8d17bd', 'make sure you use the C++ rewrite xfangfang posted. python version is super slow and drops packets', NULL, '#420', 'verified', NULL, 1790793534374);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2004', 'relays-general', '012fbc5eb421', 'wait where do i get the compiled binary for windows?', NULL, '#420', 'verified', NULL, 1790793568924);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2005', 'relays-general', '696ce1a8b9f3', 'check github releases on xfangfang/PPPwn_cpp, grab v1.3.4. takes literally 8 seconds to inject', NULL, '#420', 'verified', NULL, 1790793587214);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2006', 'relays-general', '76fb8c9590f9', 'bro just buy a ps5 why are people still clinging to ps4 lmao', NULL, '#420', 'verified', NULL, 1790793611638);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2007', 'relays-general', 'c3a39d87c434', 'because 60fps patches on bloodborne and 1080p 60fps on ghost of tsushima for free? why would i pay $500 for a dust collector', NULL, '#420', 'verified', NULL, 1790793654514);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2008', 'relays-general', 'd0eacf0598bc', 'fair point tbh bloodborne at 30fps gives me migraines', NULL, '#420', 'verified', NULL, 1790793698771);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2009', 'relays-general', '238f75d5c9d3', 'goldhen 2.4b18 also added temperature fan curves. my ps4 fat sounds like an actual console now instead of an f16 jet taking off', NULL, '#420', 'verified', NULL, 1790793743912);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2010', 'relays-general', '65cb02c6eeac', 'did you guys put a switch between the pc and ps4 or direct cable?', NULL, '#420', 'verified', NULL, 1790793804109);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2011', 'relays-general', 'd9c2edcc1e05', 'i used a direct cat6 cable to my motherboard ethernet port, worked first try', NULL, '#420', 'verified', NULL, 1790793821181);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2012', 'relays-general', 'eaaf654db135', 'nice. my intel nic was resetting on link down so i had to use a $10 unmanaged switch', NULL, '#420', 'verified', NULL, 1790793845360);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2013', 'pulse-global', '134ddf35f829', 'SHADPS4 V0.4 JUST MERGED THE SOUND BUFFER FIX!!', NULL, '#423', 'verified', NULL, 1790802411906);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2014', 'pulse-global', '04bfd3e1e7ab', 'WAIT FR??? DOES GASCOIGNE CUTSCENE CRASH STILL HAPPEN?', NULL, '#423', 'verified', NULL, 1790802470328);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2015', 'pulse-global', 'd7684b33c50b', 'NOPE! fully fixed!! played all the way to cathedral ward without a single crash', NULL, '#423', 'verified', NULL, 1790802534031);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2016', 'pulse-global', '0dc7ffa699af', 'what gpu you running?', NULL, '#423', 'verified', NULL, 1790802598128);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2017', 'pulse-global', '77574d4d27d5', 'rtx 4070 super. getting locked 60fps at 1440p with the Lance McDonald delta patch', NULL, '#423', 'verified', NULL, 1790802627722);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2018', 'pulse-global', 'c7b891ee84c6', 'crying real tears rn... fromsoftware refused for 10 years and emu devs did it in months 😭', NULL, '#423', 'verified', NULL, 1790802653501);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2019', 'pulse-global', '4a36fe5c172c', 'how is frame pacing? any micro-stutter when compiling shaders?', NULL, '#423', 'verified', NULL, 1790802728759);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2020', 'pulse-global', '2be24673ee8a', 'first time entering an area there is brief hitching while pipeline compiles, but second run through is buttery', NULL, '#423', 'verified', NULL, 1790802773623);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2021', 'pulse-global', '43950db2d4a1', 'can confirm, running on a 7800X3D + 4080. looks absolutely stunning at 4K without the disgusting chromatic aberration', NULL, '#423', 'verified', NULL, 1790802820038);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2022', 'pulse-global', '7b291c467943', 'can a steam deck run it yet?', NULL, '#423', 'verified', NULL, 1790802889982);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2023', 'pulse-global', '2929ca6a22a0', 'deck gets around 22fps right now. needs more compute shader optimization. give it 6 months', NULL, '#423', 'verified', NULL, 1790802907589);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2024', 'pulse-global', 'dc0ab6bc359a', 'sony executives punching their desks seeing pc gamers play bloodborne at 4k60 for $0 💀', NULL, '#423', 'verified', NULL, 1790802923065);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2025', 'relays-dev', '65d39cb457e3', 'just finished another oled picofly install. dat0 ribbon seated at 0.67V first attempt', NULL, '#426', 'verified', NULL, 1790811420489);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2026', 'relays-dev', '42034d3bdec0', 'clean! did you use the anchor point or solder mask resin?', NULL, '#426', 'verified', NULL, 1790811439977);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2027', 'relays-dev', '25d85eeb337a', 'both. uv solder mask over the blade and a dab of b7000 glue on the ribbon body. zero chance of drift', NULL, '#426', 'verified', NULL, 1790811474109);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2028', 'relays-dev', '1f667933a1b1', 'i tried soldering the clk point yesterday and bridged the resistor to ground send help', NULL, '#426', 'verified', NULL, 1790811544568);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2029', 'relays-dev', '060dc0ec8ea8', 'lots of flux and copper wick bro. dont press hard or you''ll rip the pad right off', NULL, '#426', 'verified', NULL, 1790811556669);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2030', 'relays-dev', 'a399419f49e0', 'what iron temp were you using?', NULL, '#426', 'verified', NULL, 1790811619511);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2031', 'relays-dev', 'e26107afc299', '400C...', NULL, '#426', 'verified', NULL, 1790811669283);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2032', 'relays-dev', 'ff2c1f2dd1a7', 'WAY too hot dude! you''re gonna bake the traces. drop it to 330C and use amtech flux', NULL, '#426', 'verified', NULL, 1790811729608);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2033', 'relays-dev', 'e05196ce298c', 'ok buying amtech right now. will report back if my switch survives', NULL, '#426', 'verified', NULL, 1790811777751);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2034', 'relays-dev', '9fd369c2ace9', 'also make sure your sd card is formatted fat32 with 32kb clusters. exfat will corrupt emummc eventually', NULL, '#426', 'verified', NULL, 1790811845499);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2035', 'relays-dev', '79959e8bb8a2', 'guiformat is the gold standard for formatting 512gb cards to fat32', NULL, '#426', 'verified', NULL, 1790811899644);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2036', 'relays-dev', 'd49f42438692', 'has anyone tested deepseek-r1-32b with exl2 4bpw on a 16gb card?', NULL, '#429', 'verified', NULL, 1790820449055);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2037', 'relays-dev', '35c0cfe061bd', 'yeah it fits with 14.2gb vram usage if you set context to 8k and kv-cache to fp8', NULL, '#429', 'verified', NULL, 1790820517395);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2038', 'relays-dev', '802fa989978d', 'what t/s are you getting?', NULL, '#429', 'verified', NULL, 1790820588724);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2039', 'relays-dev', 'bc6921d15c1d', 'around 31 tokens/sec on an rtx 4080. reasoning tokens flow super fast', NULL, '#429', 'verified', NULL, 1790820605012);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2040', 'relays-dev', '2be24673ee8a', 'the reasoning traces are insane. it caught a subtle race condition in my go channels that claude 3.5 missed', NULL, '#429', 'verified', NULL, 1790820642415);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2041', 'relays-dev', '5b2066dadf17', 'and zero telemetry sent to sam altman or silicon valley. self-hosted is the future', NULL, '#429', 'verified', NULL, 1790820706143);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2042', 'relays-dev', '53f608500db3', 'how does it compare to the full 70b distilled model?', NULL, '#429', 'verified', NULL, 1790820777931);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2043', 'relays-dev', '3c8cd419f838', '70b is smarter on nuanced architecture decisions, but 32b has 90% of the reasoning capability at twice the speed', NULL, '#429', 'verified', NULL, 1790820853023);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2044', 'relays-dev', '8990924a8e6c', 'setting up open-webui in docker right now with searxng for live web search. dream stack', NULL, '#429', 'verified', NULL, 1790820870245);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2045', 'relays-general', 'f8385e41df4b', 'bro the subtick in cs2 tonight feels atrocious. shots disappearing into the void', NULL, '#432', 'verified', NULL, 1790829447496);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2046', 'relays-general', '134ddf35f829', 'did you check your dpc latency? windows 11 memory integrity was spiking my nvlddmkm to 1200us', NULL, '#432', 'verified', NULL, 1790829506940);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2047', 'relays-general', '1868308573e3', 'wait how do i check that?', NULL, '#432', 'verified', NULL, 1790829537978);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2048', 'relays-general', '816dd35d9f1d', 'download latencymon. run it while dm-ing. if it says your system is having dpc latency drop core isolation immediately', NULL, '#432', 'verified', NULL, 1790829579834);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2049', 'relays-general', 'c0f9101ece8b', 'also set your gpu to MSI mode with high priority. dropped my frame render variance in half', NULL, '#432', 'verified', NULL, 1790829649948);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2050', 'relays-general', 'ec145ff75241', 'just turned off memory integrity and rebooted... testing now', NULL, '#432', 'verified', NULL, 1790829682775);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2051', 'relays-general', '9334c152fec8', 'WAIT WTFFFF. the mouse movement feels so much snappier holy s***', NULL, '#432', 'verified', NULL, 1790829754566);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2052', 'relays-general', '03b23edf2919', 'told you! windows 11 runs the whole kernel in a hyper-v vm by default if memory integrity is on. kills 1% lows', NULL, '#432', 'verified', NULL, 1790829798719);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2053', 'relays-general', '9767afddff12', 'bro spent 30 mins tweaking bios just to go 4-18 in premier 🤡', NULL, '#432', 'verified', NULL, 1790829849217);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2054', 'relays-general', '7eb9c47bfac4', 'shut up i was warming up ok 😭', NULL, '#432', 'verified', NULL, 1790829891016);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2055', 'relays-general', '90c6202b8a19', 'the hsm mega bezel shader on retroarch is blowing my mind on my oled tv', NULL, '#435', 'verified', NULL, 1790838436893);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2056', 'relays-general', '476272a37ad4', 'which preset? aperture grille or slot mask?', NULL, '#435', 'verified', NULL, 1790838497629);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2057', 'relays-general', '720d92e4c49d', 'aperture grille with the curved glass reflection. playing chrono trigger and it looks like a real 90s trinitron', NULL, '#435', 'verified', NULL, 1790838519661);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2058', 'relays-general', '36313844c367', 'sideloaded retroarch on my ipad with sidestore yesterday. automated the wireguard refresh at 3am', NULL, '#435', 'verified', NULL, 1790838566916);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2059', 'relays-general', '698cdffab9fd', 'no revokes at all?', NULL, '#435', 'verified', NULL, 1790838579305);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2060', 'relays-general', 'afa7a99213f7', 'zero revokes! sidestore refreshes itself over local loopback vpn. never plugging into my mac again', NULL, '#435', 'verified', NULL, 1790838636077);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2061', 'relays-general', '32f0ca8d4159', 'uyouenhanced on iphone is also mandatory. zero youtube ads, sponsorblock auto skipping intros', NULL, '#435', 'verified', NULL, 1790838663369);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2062', 'relays-general', '22c18169d85f', 'apple users finally discovering what android users have had since 2012 lmao', NULL, '#435', 'verified', NULL, 1790838680548);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2063', 'relays-general', 'bfa7e2dae92c', 'hey at least our hardware holds its value when we resell it 😉', NULL, '#435', 'verified', NULL, 1790838753917);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2064', 'relays-general', '5357848effca', 'touché haha', NULL, '#435', 'verified', NULL, 1790838818305);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2065', 'relays-general', 'f81c230f13f0', 'anyone up for some elden ring seamless co-op or monster hunter?', NULL, '#438', 'verified', NULL, 1790847471271);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2066', 'relays-general', '9d5bf9ad24ce', 'down for seamless! what level are you at?', NULL, '#438', 'verified', NULL, 1790847522382);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2067', 'relays-general', '80a71dccd2fb', 'level 85 running a dex/bleed build in altus plateau', NULL, '#438', 'verified', NULL, 1790847547693);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2068', 'relays-general', '124b38a47ebc', 'perfect, hop on voice in 5 mins. let me grab a beer first', NULL, '#438', 'verified', NULL, 1790847588447);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2069', 'relays-general', '28b7aa1ca481', 'is the server relay running smooth for everyone tonight? ping to frankfurt node is 18ms', NULL, '#438', 'verified', NULL, 1790847617355);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2070', 'relays-general', 'ccacd5dc2185', 'smooth as butter, d1 and workers handling everything with zero lag', NULL, '#438', 'verified', NULL, 1790847686481);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2071', 'relays-general', '7af628ad91ee', 'salut băieți, spor la fraguri!', NULL, '#438', 'verified', NULL, 1790847736338);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2072', 'relays-dev', '89e7abe9363d', 'monthly zfs scrub just finished on my 64TB RaidZ2 pool. zero checksum errors across 48TB of data!', NULL, '#441', 'verified', NULL, 1790856423718);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2073', 'relays-dev', 'ff8aece0e969', 'what scrub speed did you get?', NULL, '#441', 'verified', NULL, 1790856439503);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2074', 'relays-dev', '2d7cb0a58798', 'averaged around 1.35 GB/s. took about 10 hours overnight', NULL, '#441', 'verified', NULL, 1790856468518);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2075', 'relays-dev', 'e61a7b81ae3c', 'are you using mtus at 9000 jumbo frames or standard 1500?', NULL, '#441', 'verified', NULL, 1790856491292);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2076', 'relays-dev', 'f5a0f8e0da04', 'left it at standard 1500! with modern 10G NICs and TSO/LRO hardware offloading, jumbo frames cause more headache than they solve', NULL, '#441', 'verified', NULL, 1790856557595);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2077', 'relays-dev', '15b43f920aa9', '100% agreed. jumbo frames break so many docker bridges and vlan tags for like 1% cpu reduction', NULL, '#441', 'verified', NULL, 1790856619300);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2078', 'relays-dev', '4cedcc439b52', 'cloud storage providers charging $150/month for 10TB while a home server costs $600 once and gives you 60TB for 7 years', NULL, '#441', 'verified', NULL, 1790856670385);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2079', 'relays-dev', 'afa7a99213f7', 'just installed the geekworm x1001 nvme hat on my pi 5 with a samsung 980', NULL, '#444', 'verified', NULL, 1790857999366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2080', 'relays-dev', 'a67075e0df85', 'did you enable pcie gen 3 in config.txt?', NULL, '#444', 'verified', NULL, 1790858024826);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2081', 'relays-dev', 'e61a7b81ae3c', 'yeah added dtparam=pciex1_gen=3. getting 860 MB/s sequential read in fio!', NULL, '#444', 'verified', NULL, 1790858095680);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2082', 'relays-dev', 'b07ad6cca58d', 'pi-hole queries resolve in literally 0.3ms with unbound cached in ram', NULL, '#444', 'verified', NULL, 1790858152071);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2083', 'relays-dev', '28b7aa1ca481', 'nvme completely fixes the classic pi sd card corruption. i''ve had 4 sandisk cards die in 2 years from sqlite write amplification', NULL, '#444', 'verified', NULL, 1790858178137);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2084', 'relays-dev', '0dc7ffa699af', 'yep! ssd wear leveling will outlive the pi itself', NULL, '#444', 'verified', NULL, 1790858050366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2085', 'relays-dev', '36313844c367', 'passed 6 hours of TM5 Anta777 Absolut at 7600 MT/s CL34!', NULL, '#447', 'verified', NULL, 1790858002366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2086', 'relays-dev', 'ae60e07be4f8', 'what is your tREFI set to?', NULL, '#447', 'verified', NULL, 1790858031627);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2087', 'relays-dev', '4a3214124af7', 'maxed out at 65535 with a dedicated 60mm noctua fan blowing on the dimms', NULL, '#447', 'verified', NULL, 1790858106663);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2088', 'relays-dev', 'a7082f0fa4d8', 'what temps are the sticks reaching under load?', NULL, '#447', 'verified', NULL, 1790858147020);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2089', 'relays-dev', 'dc0ab6bc359a', 'peaking at 44C. without the fan they were hitting 58C and throwing errors on cycle 3', NULL, '#447', 'verified', NULL, 1790858171139);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2090', 'relays-dev', 'b6022798fb43', 'ddr5 thermal sensitivity is real. anything over 50C with high trefi is an instant crash in cyberpunk', NULL, '#447', 'verified', NULL, 1790858056366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2091', 'relays-dev', '062e741974e0', 'yep, airflow is king when pushing memory bandwidth', NULL, '#447', 'verified', NULL, 1790858085735);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2092', 'relays-general', '50d58e025fbd', 'playing god of war ragnarok on my steam deck streamed from my 4080 via sunshine/moonlight', NULL, '#450', 'verified', NULL, 1790858046366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2093', 'relays-general', 'ff1f17cbeabe', 'how is the battery life while streaming?', NULL, '#450', 'verified', NULL, 1790858061529);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2094', 'relays-general', '62b2b9bb1e15', 'over 5.5 hours! the deck is only decoding av1 video so apu power draw is under 6 watts', NULL, '#450', 'verified', NULL, 1790858116784);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2095', 'relays-general', 'a3fd312af0ba', 'that''s insane. and screen latency?', NULL, '#450', 'verified', NULL, 1790858167843);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2096', 'relays-general', 'cc1d423c7110', 'around 3.8ms total on wifi 6e. literally impossible to tell it''s not running natively', NULL, '#450', 'verified', NULL, 1790858030366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2097', 'relays-general', 'bd905e088a5d', 'rip to people who bought playstation portal for $200 just to get 60hz with microstutter 💀', NULL, '#450', 'verified', NULL, 1790858071241);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2098', 'relays-general', 'ea67a584af6d', 'moonlight at 90hz on the oled panel makes the portal look like a toy tbh', NULL, '#450', 'verified', NULL, 1790858135760);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2099', 'pulse-global', 'e315a98f9178', 'NEW LEAK: rtx 5090 board partners confirmed 600W tdp BIOS limits', NULL, '#453', 'verified', NULL, 1790858029366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2100', 'pulse-global', '1fd9f379ce21', '600 WATTS??? are they insane?? my room is gonna turn into a sauna', NULL, '#453', 'verified', NULL, 1790858067109);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2101', 'pulse-global', 'e2af337a6bbf', 'please tell me they redesigned the 12v-2x6 power connector... i don''t want my house burning down', NULL, '#453', 'verified', NULL, 1790858115377);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2102', 'pulse-global', 'f43228c293d5', 'it uses the revised 12v-2x6 with recessed sense pins so it won''t power on if not fully seated', NULL, '#453', 'verified', NULL, 1790858017366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2103', 'pulse-global', 'e05196ce298c', 'still, 600w through a single plastic connector is terrifying. why can''t we just have three 8-pin cables?!', NULL, '#453', 'verified', NULL, 1790858048936);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2104', 'pulse-global', '476272a37ad4', 'because board real estate. but honestly who needs 600w unless you''re rendering 8k or training 70b models locally', NULL, '#453', 'verified', NULL, 1790858063988);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2105', 'pulse-global', '6440bfbf6661', 'Jensen: The more you buy, the more you save! 💸', NULL, '#453', 'verified', NULL, 1790858085820);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2106', 'pulse-global', '5ab12ed4a638', 'ps5 pro detachable disc drives are STILL sold out everywhere in europe and scalpers want $200 on ebay', NULL, '#456', 'verified', NULL, 1790858045366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2107', 'pulse-global', '60479df9131b', 'sony deliberately underproducing the disc drive to force everyone onto digital psn store where they take 30% cut on every game', NULL, '#456', 'verified', NULL, 1790858062267);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2108', 'pulse-global', 'a5a4b2a0d78a', 'this is why jailbreaking and game dumping matters! if you don''t own physical media or have decrypted backups, you''re just renting licenses that can be revoked anytime', NULL, '#456', 'verified', NULL, 1790858105067);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2109', 'pulse-global', 'd1c0f8df2dc5', 'itemzflow + shadps4 = true preservation. keep your discs and dump your own games.', NULL, '#456', 'verified', NULL, 1790858168014);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2110', 'relays-general', '20cf333380e8', 'finally migrated all my smart bulbs from tuya cloud to local zigbee2mqtt!', NULL, '#459', 'verified', NULL, 1790858130366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2111', 'relays-general', 'ead46db651a2', 'was it worth the hassle? tuya app works fine for me', NULL, '#459', 'verified', NULL, 1790858168143);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2112', 'relays-general', '28b7aa1ca481', 'worth every second. light switch latency went from 800ms pinging servers in china to literally 12ms locally', NULL, '#459', 'verified', NULL, 1790858146366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2113', 'relays-general', 'df18e1fc0ae3', 'and when my internet went down yesterday, every light and automation in my house still worked', NULL, '#459', 'verified', NULL, 1790858170972);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2114', 'relays-general', '3b8f955d4507', 'plus tuya isn''t profiling your sleep schedules or selling presence data to insurance brokers', NULL, '#459', 'verified', NULL, 1790858036366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2115', 'relays-general', 'a558474c1fc0', 'wait they do that?? ok ordering a sonoff zigbee dongle right now lol', NULL, '#459', 'verified', NULL, 1790858095947);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2116', 'relays-general', '28895e00b615', 'get the sonoff dongle-E with silk firmware. plug and play in home assistant', NULL, '#459', 'verified', NULL, 1790858151556);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2117', 'relays-dev', 'bd69960aa09f', 'once you switch your dev environment to nix flakes and direnv you can never go back to docker devcontainers', NULL, '#462', 'verified', NULL, 1790858139366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2118', 'relays-dev', '2bb86c1051ef', 'why? docker isolation is clean and everyone knows dockerfile syntax', NULL, '#462', 'verified', NULL, 1790858149366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2119', 'relays-dev', '4a36fe5c172c', 'docker mounts have filesystem latency overhead on mac/wsl and eating 20gb of disk per container is insane. nix shares store packages with hardlinks', NULL, '#462', 'verified', NULL, 1790858110366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2120', 'relays-dev', 'fb591d2b0066', 'direnv `use flake` giving me identical rustc, clang, and openssl headers the instant i `cd` into a repo is pure wizardry', NULL, '#462', 'verified', NULL, 1790858030366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2121', 'relays-dev', '6e7eb7e8978a', 'yeah but nix error messages look like ancient hieroglyphics when an input fails to build', NULL, '#462', 'verified', NULL, 1790858104234);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2122', 'relays-dev', 'b44d4e99e939', 'skill issue tbh 🤡', NULL, '#462', 'verified', NULL, 1790858155930);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2123', 'relays-dev', '71079b25eb82', 'nix error messages build character haha', NULL, '#462', 'verified', NULL, 1790858020366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2124', 'pulse-global', '4f33baaf1c87', 'anyone else pre-ordering monster hunter wilds or waiting for day-1 pc performance patch?', NULL, '#465', 'verified', NULL, 1790858116366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2125', 'pulse-global', 'e2af337a6bbf', 'beta CPU optimization was rough on quad cores but 8-core ryzens handled it fine', NULL, '#465', 'verified', NULL, 1790858166886);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2126', 'pulse-global', 'd1ee859e07d8', 'capcom confirmed the full release includes directstorage and updated dlss 3.7. performance will be way better', NULL, '#465', 'verified', NULL, 1790858108366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2127', 'pulse-global', 'd1f557533fbe', 'i just want to fight arkveld in 144fps without shader stutter', NULL, '#465', 'verified', NULL, 1790858179116);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2128', 'pulse-global', '0ffc2678086f', 'my rtx 3060 is praying for dlss performance mode right now lmao', NULL, '#465', 'verified', NULL, 1790858001366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2129', 'pulse-global', '6e61d7c39a57', '3060 users in 2026 are modern day spartan warriors fr fr', NULL, '#465', 'verified', NULL, 1790858049432);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2130', 'relays-dev', '99b8a1b53b5c', 'gloriouseggroll just dropped GE-Proton9-24 with upstream wine 9.20 rebase!', NULL, '#468', 'verified', NULL, 1790858089366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2131', 'relays-dev', 'b490123f897f', 'does it fix the black screen cutscene bug in dead rising deluxe remaster?', NULL, '#468', 'verified', NULL, 1790858161038);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2132', 'relays-dev', '4ac12d5f04c6', 'YES! includes the latest gstreamer media foundation patches for wmv and h264 cutscene decoding', NULL, '#468', 'verified', NULL, 1790858055366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2133', 'relays-dev', '0f370ac7b7f0', 'updating via protonplus right now, thank god!', NULL, '#468', 'verified', NULL, 1790858104284);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2134', 'relays-dev', '3638534f0dc5', 'valve''s investment in proton is literally the best thing that ever happened to pc gaming in the last 20 years', NULL, '#468', 'verified', NULL, 1790858177697);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2135', 'relays-general', 'a6e3bbcfff8c', 'it''s 2:45 AM and i just decided to completely reorganize my desk cable management why am i like this', NULL, '#471', 'verified', NULL, 1790858026366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2136', 'relays-general', '3c8cd419f838', 'canon event for every tech enthusiast. prepare for your pc not to post because you bumped a sata cable', NULL, '#471', 'verified', NULL, 1790858088117);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2137', 'relays-general', '7af628ad91ee', 'DONT JINX ME', NULL, '#471', 'verified', NULL, 1790858108721);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2138', 'relays-general', 'b754a29d2a9f', 'velcro straps or zip ties? if you say zip ties you deserve the post failure', NULL, '#471', 'verified', NULL, 1790858154266);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2139', 'relays-general', 'a7709a03e0f0', 'velcro only! i''m not a barbarian', NULL, '#471', 'verified', NULL, 1790858172174);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2140', 'relays-general', '84ee23d4db10', 'good luck. sleeping is for people without unrouted cat6 cables', NULL, '#471', 'verified', NULL, 1790858093366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2141', 'relays-general', 'b471ab077771', 'truly words of wisdom. night boys ✌️', NULL, '#471', 'verified', NULL, 1790858153966);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2142', 'relays-dev', '99b8a1b53b5c', 'analyzed the webkitty jsc type confusion poc today on an 11.50 test kit', NULL, '#474', 'verified', NULL, 1790858124366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2143', 'relays-dev', '3c8cd419f838', 'how clean is the arbitrary r/w primitive?', NULL, '#474', 'verified', NULL, 1790858081366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2144', 'relays-dev', '5841d81bfab4', 'very clean. memory leak gives you the base address of WebProcess in under 200ms', NULL, '#474', 'verified', NULL, 1790858133474);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2145', 'relays-dev', '92662dede481', 'and the ipv6 mbuf overwrite?', NULL, '#474', 'verified', NULL, 1790858145933);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2146', 'relays-dev', '06d2d75b0b45', 'hits reliably if you groom the heap with small socket allocations beforehand. Sistr0''s goldhen payload binds nicely to localhost 9020', NULL, '#474', 'verified', NULL, 1790858132366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2147', 'relays-dev', 'c0612c08aa22', 'this community is incredible. thank you guys for keeping the hardware we bought alive!', NULL, '#474', 'verified', NULL, 1790858090366);
INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES ('msg-live-2148', 'relays-dev', '51386ae631bc', 'preservation and ownership are fundamental human rights. always.', NULL, '#474', 'verified', NULL, 1790858104984);

-- 4. INTERACTIONS
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-a5f425-0', 'post', 'tut-ps4-1352-pppwn-goldhen', 'a5f42500dc70', 'reaction', '🧠', 1790743171928);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-4856c1-1', 'post', 'tut-ps4-1352-pppwn-goldhen', '4856c11ba1f1', 'reaction', '👀', 1790743207323);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-d70bdd-2', 'post', 'tut-ps4-1352-pppwn-goldhen', 'd70bdd4b9c43', 'reaction', '🚀', 1790743241838);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-ca17a1-3', 'post', 'tut-ps4-1352-pppwn-goldhen', 'ca17a1293d73', 'reaction', '👀', 1790743276914);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-e4b541-4', 'post', 'tut-ps4-1352-pppwn-goldhen', 'e4b54103e4ac', 'reaction', '🧠', 1790743312313);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-a97cec-5', 'post', 'tut-ps4-1352-pppwn-goldhen', 'a97cec120b24', 'reaction', '👀', 1790743347373);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-c93dca-6', 'post', 'tut-ps4-1352-pppwn-goldhen', 'c93dca3e945b', 'reaction', '🧠', 1790743382091);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-c131c7-7', 'post', 'tut-ps4-1352-pppwn-goldhen', 'c131c72d05a3', 'reaction', '👀', 1790743417134);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-db7cba-8', 'post', 'tut-ps4-1352-pppwn-goldhen', 'db7cba02dcb0', 'reaction', '🚀', 1790743452213);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-0424f1-9', 'post', 'tut-ps4-1352-pppwn-goldhen', '0424f1ef8724', 'reaction', '❤️', 1790743486587);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-bc6921-10', 'post', 'tut-ps4-1352-pppwn-goldhen', 'bc6921d15c1d', 'reaction', '🔥', 1790743521695);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-1924cf-11', 'post', 'tut-ps4-1352-pppwn-goldhen', '1924cf443966', 'reaction', '👏', 1790743556721);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-a7709a-12', 'post', 'tut-ps4-1352-pppwn-goldhen', 'a7709a03e0f0', 'reaction', '👀', 1790743591977);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-488752-13', 'post', 'tut-ps4-1352-pppwn-goldhen', '48875207268e', 'reaction', '🔥', 1790743626572);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-8000e6-14', 'post', 'tut-ps4-1352-pppwn-goldhen', '8000e6ca1a6f', 'reaction', '👏', 1790743661733);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-65c4e0-15', 'post', 'tut-ps4-1352-pppwn-goldhen', '65c4e0605e86', 'reaction', '🧠', 1790743696932);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-6d9322-16', 'post', 'tut-ps4-1352-pppwn-goldhen', '6d9322cd0326', 'reaction', '💯', 1790743732084);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-42ed27-17', 'post', 'tut-ps4-1352-pppwn-goldhen', '42ed2756a63a', 'reaction', '👏', 1790743766656);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ps4-37be', 'comment', 'comm-tut-ps4-13-5', '37be4c890dab', 'reaction', '💯', 1790744571346);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ps4-5b53', 'comment', 'comm-tut-ps4-13-6', '5b538769d471', 'reaction', '💯', 1790745043567);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ps4-c6d0', 'comment', 'comm-tut-ps4-13-7', 'c6d0544b0aca', 'reaction', '💯', 1790745400273);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ps4-f585', 'comment', 'comm-tut-ps4-13-8', 'f585268ecdef', 'reaction', '💯', 1790746521524);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-66fcad-0', 'post', 'tut-ps5-etahen-60fps-guide', '66fcadf18eb2', 'reaction', '🔥', 1790753267871);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-febb2d-1', 'post', 'tut-ps5-etahen-60fps-guide', 'febb2dc98462', 'reaction', '💯', 1790753302698);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-7a43e2-2', 'post', 'tut-ps5-etahen-60fps-guide', '7a43e268ffba', 'reaction', '👀', 1790753337541);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-d00195-3', 'post', 'tut-ps5-etahen-60fps-guide', 'd00195fc63d9', 'reaction', '🧠', 1790753372899);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-2929ca-4', 'post', 'tut-ps5-etahen-60fps-guide', '2929ca6a22a0', 'reaction', '❤️', 1790753407607);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-6e3866-5', 'post', 'tut-ps5-etahen-60fps-guide', '6e386624a0d3', 'reaction', '🧠', 1790753443080);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-b4d640-6', 'post', 'tut-ps5-etahen-60fps-guide', 'b4d64034b39a', 'reaction', '🚀', 1790753477192);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-0a781f-7', 'post', 'tut-ps5-etahen-60fps-guide', '0a781f3ba683', 'reaction', '❤️', 1790753512756);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-ada8bc-8', 'post', 'tut-ps5-etahen-60fps-guide', 'ada8bc01b964', 'reaction', '💯', 1790753548064);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-c80ad5-9', 'post', 'tut-ps5-etahen-60fps-guide', 'c80ad57c04b5', 'reaction', '💀', 1790753583026);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-bb3c6c-10', 'post', 'tut-ps5-etahen-60fps-guide', 'bb3c6c336f00', 'reaction', '🧠', 1790753617697);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-50ad96-11', 'post', 'tut-ps5-etahen-60fps-guide', '50ad966aa587', 'reaction', '👀', 1790753652299);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-ea67a5-12', 'post', 'tut-ps5-etahen-60fps-guide', 'ea67a584af6d', 'reaction', '🚀', 1790753687780);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-09d304-13', 'post', 'tut-ps5-etahen-60fps-guide', '09d3048c80db', 'reaction', '👀', 1790753722906);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-588d81-14', 'post', 'tut-ps5-etahen-60fps-guide', '588d81128dda', 'reaction', '❤️', 1790753757983);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-19ed1d-15', 'post', 'tut-ps5-etahen-60fps-guide', '19ed1df26baa', 'reaction', '🧠', 1790753792506);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-46e2fa-16', 'post', 'tut-ps5-etahen-60fps-guide', '46e2fae2b1ed', 'reaction', '💯', 1790753828048);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps5-et-b85698-17', 'post', 'tut-ps5-etahen-60fps-guide', 'b856982f7490', 'reaction', '👏', 1790753862432);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ps5-4ac1', 'comment', 'comm-tut-ps5-et-1', '4ac12d5f04c6', 'reaction', '👏', 1790754611463);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ps5-c4c1', 'comment', 'comm-tut-ps5-et-2', 'c4c12ea367c1', 'reaction', '😂', 1790755372031);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ps5-9858', 'comment', 'comm-tut-ps5-et-3', '98586de8bbad', 'reaction', '❤️', 1790756573160);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ps5-b07a', 'comment', 'comm-tut-ps5-et-5', 'b07ad6cca58d', 'reaction', '🔥', 1790757160263);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ps5-5b53', 'comment', 'comm-tut-ps5-et-6', '5b538769d471', 'reaction', '💯', 1790757342510);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-a5f425-0', 'post', 'tut-switch-oled-picofly-guide', 'a5f42500dc70', 'reaction', '💯', 1790763429280);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-f47ede-1', 'post', 'tut-switch-oled-picofly-guide', 'f47edec0b51f', 'reaction', '🔥', 1790763464110);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-4ae1b3-2', 'post', 'tut-switch-oled-picofly-guide', '4ae1b31e85c2', 'reaction', '❤️', 1790763499286);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-8d3d40-3', 'post', 'tut-switch-oled-picofly-guide', '8d3d40c12d3d', 'reaction', '🧠', 1790763534159);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-3af19d-4', 'post', 'tut-switch-oled-picofly-guide', '3af19def05a1', 'reaction', '💀', 1790763569008);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-aeca09-5', 'post', 'tut-switch-oled-picofly-guide', 'aeca0956d52a', 'reaction', '❤️', 1790763604184);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-3820f2-6', 'post', 'tut-switch-oled-picofly-guide', '3820f26d77d5', 'reaction', '❤️', 1790763639152);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-792ff6-7', 'post', 'tut-switch-oled-picofly-guide', '792ff625a4bd', 'reaction', '💀', 1790763673900);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-d2c046-8', 'post', 'tut-switch-oled-picofly-guide', 'd2c0465cfe9e', 'reaction', '🧠', 1790763709416);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-77b722-9', 'post', 'tut-switch-oled-picofly-guide', '77b722b117ba', 'reaction', '👀', 1790763744131);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-e4e771-10', 'post', 'tut-switch-oled-picofly-guide', 'e4e7715ef303', 'reaction', '💀', 1790763778865);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-1d24cd-11', 'post', 'tut-switch-oled-picofly-guide', '1d24cd2b20d8', 'reaction', '🔥', 1790763813982);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-0ede06-12', 'post', 'tut-switch-oled-picofly-guide', '0ede06ec7e57', 'reaction', '🚀', 1790763849404);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-8d6fdf-13', 'post', 'tut-switch-oled-picofly-guide', '8d6fdfa6f0c9', 'reaction', '👀', 1790763883918);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-995e68-14', 'post', 'tut-switch-oled-picofly-guide', '995e687861f3', 'reaction', '👏', 1790763919544);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-ca2260-15', 'post', 'tut-switch-oled-picofly-guide', 'ca22608720ee', 'reaction', '❤️', 1790763954520);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-f91976-16', 'post', 'tut-switch-oled-picofly-guide', 'f91976eed048', 'reaction', '👏', 1790763988919);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-switch-420719-17', 'post', 'tut-switch-oled-picofly-guide', '4207190e574c', 'reaction', '💀', 1790764024588);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-swi-c6d0', 'comment', 'comm-tut-switch-3', 'c6d0544b0aca', 'reaction', '😂', 1790765947097);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-swi-93da', 'comment', 'comm-tut-switch-6', '93daeba59dfa', 'reaction', '👏', 1790769364633);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-02823d-0', 'post', 'tut-shadps4-bloodborne-pc-setup', '02823d50e54a', 'reaction', '👀', 1790773522905);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-0f3e36-1', 'post', 'tut-shadps4-bloodborne-pc-setup', '0f3e368ea7f3', 'reaction', '👏', 1790773558171);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-95b493-2', 'post', 'tut-shadps4-bloodborne-pc-setup', '95b493a172aa', 'reaction', '💀', 1790773592963);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-532258-3', 'post', 'tut-shadps4-bloodborne-pc-setup', '53225856a5a7', 'reaction', '👀', 1790773628147);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-bda945-4', 'post', 'tut-shadps4-bloodborne-pc-setup', 'bda945e42093', 'reaction', '🧠', 1790773662898);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-1fc9ba-5', 'post', 'tut-shadps4-bloodborne-pc-setup', '1fc9ba7e024c', 'reaction', '👀', 1790773697934);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-1ed964-6', 'post', 'tut-shadps4-bloodborne-pc-setup', '1ed964ecf319', 'reaction', '🧠', 1790773733004);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-39fb52-7', 'post', 'tut-shadps4-bloodborne-pc-setup', '39fb52ca04b4', 'reaction', '👏', 1790773767648);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-06d2d7-8', 'post', 'tut-shadps4-bloodborne-pc-setup', '06d2d75b0b45', 'reaction', '🔥', 1790773802975);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-cd82f1-9', 'post', 'tut-shadps4-bloodborne-pc-setup', 'cd82f10d8c6b', 'reaction', '🔥', 1790773837597);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-f8850a-10', 'post', 'tut-shadps4-bloodborne-pc-setup', 'f8850ad4d4e4', 'reaction', '💀', 1790773872753);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-b336dd-11', 'post', 'tut-shadps4-bloodborne-pc-setup', 'b336dd41ff10', 'reaction', '💯', 1790773908216);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-48f137-12', 'post', 'tut-shadps4-bloodborne-pc-setup', '48f137af35c1', 'reaction', '💯', 1790773942489);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-d91d46-13', 'post', 'tut-shadps4-bloodborne-pc-setup', 'd91d46e9daf3', 'reaction', '👏', 1790773977541);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-f266d4-14', 'post', 'tut-shadps4-bloodborne-pc-setup', 'f266d49577dd', 'reaction', '👀', 1790774012652);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-d70bdd-15', 'post', 'tut-shadps4-bloodborne-pc-setup', 'd70bdd4b9c43', 'reaction', '👏', 1790774048088);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-0f370a-16', 'post', 'tut-shadps4-bloodborne-pc-setup', '0f370ac7b7f0', 'reaction', '❤️', 1790774082680);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-shadps-d99610-17', 'post', 'tut-shadps4-bloodborne-pc-setup', 'd996106ab4e8', 'reaction', '💯', 1790774117960);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-sha-d69d', 'comment', 'comm-tut-shadps-1', 'd69d0aec59bc', 'reaction', '🔥', 1790773840031);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-sha-54c3', 'comment', 'comm-tut-shadps-2', '54c330a9f699', 'reaction', '❤️', 1790774049943);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-sha-ccf5', 'comment', 'comm-tut-shadps-4', 'ccf55b6fbe7d', 'reaction', '😂', 1790775276598);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-sha-2af5', 'comment', 'comm-tut-shadps-6', '2af5d4e05954', 'reaction', '😂', 1790777382300);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-sha-5138', 'comment', 'comm-tut-shadps-7', '51386ae631bc', 'reaction', '🔥', 1790778508440);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-660074-0', 'post', 'tut-ios-sidestore-zero-revokes', '660074c2afcb', 'reaction', '🚀', 1790783561148);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-75693a-1', 'post', 'tut-ios-sidestore-zero-revokes', '75693ab27df0', 'reaction', '💯', 1790783596030);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-aa4dd2-2', 'post', 'tut-ios-sidestore-zero-revokes', 'aa4dd2274a6e', 'reaction', '❤️', 1790783630760);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-b1b91a-3', 'post', 'tut-ios-sidestore-zero-revokes', 'b1b91a6b769c', 'reaction', '🔥', 1790783666097);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-4a13f6-4', 'post', 'tut-ios-sidestore-zero-revokes', '4a13f671e740', 'reaction', '❤️', 1790783701009);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-c4b7b9-5', 'post', 'tut-ios-sidestore-zero-revokes', 'c4b7b9273b2c', 'reaction', '🚀', 1790783735901);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-0e1b78-6', 'post', 'tut-ios-sidestore-zero-revokes', '0e1b78829632', 'reaction', '💀', 1790783770658);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-89d616-7', 'post', 'tut-ios-sidestore-zero-revokes', '89d616d03b5a', 'reaction', '🔥', 1790783806081);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-b84131-8', 'post', 'tut-ios-sidestore-zero-revokes', 'b84131af1161', 'reaction', '💀', 1790783840585);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-c66a55-9', 'post', 'tut-ios-sidestore-zero-revokes', 'c66a5574a3f3', 'reaction', '🔥', 1790783875666);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-4c178d-10', 'post', 'tut-ios-sidestore-zero-revokes', '4c178d466eab', 'reaction', '👀', 1790783910835);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-57b8cd-11', 'post', 'tut-ios-sidestore-zero-revokes', '57b8cdc70b13', 'reaction', '❤️', 1790783945849);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-79c55d-12', 'post', 'tut-ios-sidestore-zero-revokes', '79c55da29b95', 'reaction', '🚀', 1790783980678);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-2a75d5-13', 'post', 'tut-ios-sidestore-zero-revokes', '2a75d57fc00b', 'reaction', '💀', 1790784015558);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-39fb52-14', 'post', 'tut-ios-sidestore-zero-revokes', '39fb52ca04b4', 'reaction', '🚀', 1790784050853);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-f02c25-15', 'post', 'tut-ios-sidestore-zero-revokes', 'f02c25c82669', 'reaction', '❤️', 1790784086167);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-77c145-16', 'post', 'tut-ios-sidestore-zero-revokes', '77c1455eed66', 'reaction', '🔥', 1790784120994);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ios-si-b1bc87-17', 'post', 'tut-ios-sidestore-zero-revokes', 'b1bc876f4185', 'reaction', '💀', 1790784155402);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ios-4f74', 'comment', 'comm-tut-ios-si-2', '4f74fedfdb31', 'reaction', '💯', 1790785149625);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ios-56f6', 'comment', 'comm-tut-ios-si-3', '56f6f069eed5', 'reaction', '😂', 1790785618201);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ios-8f59', 'comment', 'comm-tut-ios-si-4', '8f597a4004c7', 'reaction', '👏', 1790786995157);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-fd0a1c-0', 'post', 'tut-deepseek-r1-local-gpu', 'fd0a1c00d111', 'reaction', '👏', 1790793587143);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-f8a43d-1', 'post', 'tut-deepseek-r1-local-gpu', 'f8a43d971f06', 'reaction', '💯', 1790793622124);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-398ac2-2', 'post', 'tut-deepseek-r1-local-gpu', '398ac239ae0d', 'reaction', '👏', 1790793656849);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-9d511b-3', 'post', 'tut-deepseek-r1-local-gpu', '9d511b6d4b95', 'reaction', '❤️', 1790793692569);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-b07ad6-4', 'post', 'tut-deepseek-r1-local-gpu', 'b07ad6cca58d', 'reaction', '🧠', 1790793727374);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-94d12f-5', 'post', 'tut-deepseek-r1-local-gpu', '94d12f910b35', 'reaction', '👏', 1790793762363);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-44066d-6', 'post', 'tut-deepseek-r1-local-gpu', '44066d3e2508', 'reaction', '💀', 1790793796805);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-363138-7', 'post', 'tut-deepseek-r1-local-gpu', '36313844c367', 'reaction', '👀', 1790793832236);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-e650c9-8', 'post', 'tut-deepseek-r1-local-gpu', 'e650c98ef174', 'reaction', '🚀', 1790793867118);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-f9b094-9', 'post', 'tut-deepseek-r1-local-gpu', 'f9b09477ab1a', 'reaction', '💯', 1790793901811);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-cc1d42-10', 'post', 'tut-deepseek-r1-local-gpu', 'cc1d423c7110', 'reaction', '👀', 1790793937281);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-2e5210-11', 'post', 'tut-deepseek-r1-local-gpu', '2e5210388c90', 'reaction', '💀', 1790793972138);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-123701-12', 'post', 'tut-deepseek-r1-local-gpu', '123701f1af7c', 'reaction', '❤️', 1790794007576);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-eaaf65-13', 'post', 'tut-deepseek-r1-local-gpu', 'eaaf654db135', 'reaction', '🔥', 1790794042218);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-edf6aa-14', 'post', 'tut-deepseek-r1-local-gpu', 'edf6aaeaa1d6', 'reaction', '👏', 1790794076900);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-c25c3d-15', 'post', 'tut-deepseek-r1-local-gpu', 'c25c3dd1ec4d', 'reaction', '👀', 1790794112272);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-8b0dfc-16', 'post', 'tut-deepseek-r1-local-gpu', '8b0dfc58ac87', 'reaction', '👀', 1790794146958);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-deepse-d49f42-17', 'post', 'tut-deepseek-r1-local-gpu', 'd49f42438692', 'reaction', '❤️', 1790794182179);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-dee-b6bd', 'comment', 'comm-tut-deepse-1', 'b6bdefff5928', 'reaction', '😂', 1790794691338);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-dee-cef9', 'comment', 'comm-tut-deepse-2', 'cef94956fd7c', 'reaction', '🔥', 1790795803097);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-dee-d1f5', 'comment', 'comm-tut-deepse-3', 'd1f557533fbe', 'reaction', '👏', 1790797181326);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-dee-de18', 'comment', 'comm-tut-deepse-4', 'de181d6f6ecf', 'reaction', '🔥', 1790798244036);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-dee-3fd7', 'comment', 'comm-tut-deepse-5', '3fd7c293052b', 'reaction', '❤️', 1790798675657);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-dee-4760', 'comment', 'comm-tut-deepse-6', '4760e532e729', 'reaction', '👏', 1790799334799);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-00a93c-0', 'post', 'tut-cs2-windows11-latency-tuning', '00a93c17bbcc', 'reaction', '💯', 1790803731395);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-e8056e-1', 'post', 'tut-cs2-windows11-latency-tuning', 'e8056ec6ec9b', 'reaction', '👏', 1790803765966);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-ea3ba3-2', 'post', 'tut-cs2-windows11-latency-tuning', 'ea3ba3d97619', 'reaction', '👏', 1790803801001);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-b48bb2-3', 'post', 'tut-cs2-windows11-latency-tuning', 'b48bb28b06fe', 'reaction', '🚀', 1790803835909);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-0dc7ff-4', 'post', 'tut-cs2-windows11-latency-tuning', '0dc7ffa699af', 'reaction', '🚀', 1790803871254);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-d266bb-5', 'post', 'tut-cs2-windows11-latency-tuning', 'd266bba40a69', 'reaction', '👀', 1790803906394);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-225be0-6', 'post', 'tut-cs2-windows11-latency-tuning', '225be0aca5ed', 'reaction', '🚀', 1790803940775);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-2c3605-7', 'post', 'tut-cs2-windows11-latency-tuning', '2c3605ceca77', 'reaction', '👀', 1790803975819);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-bb3c6c-8', 'post', 'tut-cs2-windows11-latency-tuning', 'bb3c6c336f00', 'reaction', '👏', 1790804010820);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-159b93-9', 'post', 'tut-cs2-windows11-latency-tuning', '159b933932e8', 'reaction', '💯', 1790804046369);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-501a39-10', 'post', 'tut-cs2-windows11-latency-tuning', '501a39e707c3', 'reaction', '👀', 1790804080652);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-40a290-11', 'post', 'tut-cs2-windows11-latency-tuning', '40a290bdf4d2', 'reaction', '💯', 1790804116012);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-c8c4bb-12', 'post', 'tut-cs2-windows11-latency-tuning', 'c8c4bb08c74c', 'reaction', '❤️', 1790804151138);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-f7cd26-13', 'post', 'tut-cs2-windows11-latency-tuning', 'f7cd263016fe', 'reaction', '❤️', 1790804186094);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-4025bc-14', 'post', 'tut-cs2-windows11-latency-tuning', '4025bc14b2bc', 'reaction', '👏', 1790804220936);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-cf37c3-15', 'post', 'tut-cs2-windows11-latency-tuning', 'cf37c30dbab9', 'reaction', '🚀', 1790804256399);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-952963-16', 'post', 'tut-cs2-windows11-latency-tuning', '952963af8478', 'reaction', '🚀', 1790804290684);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-cs2-wi-6274b3-17', 'post', 'tut-cs2-windows11-latency-tuning', '6274b33f318b', 'reaction', '🚀', 1790804326282);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-cs2-1ed9', 'comment', 'comm-tut-cs2-wi-1', '1ed964ecf319', 'reaction', '❤️', 1790804355527);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-cs2-15b4', 'comment', 'comm-tut-cs2-wi-2', '15b43f920aa9', 'reaction', '😂', 1790804590799);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-cs2-d814', 'comment', 'comm-tut-cs2-wi-3', 'd814fd383983', 'reaction', '👏', 1790804948618);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-cs2-13ff', 'comment', 'comm-tut-cs2-wi-4', '13ff8c3906a1', 'reaction', '👏', 1790805357900);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-d0f2bf-0', 'post', 'tut-bazzite-handheld-dualboot', 'd0f2bf62c43e', 'reaction', '💯', 1790813649458);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-ec145f-1', 'post', 'tut-bazzite-handheld-dualboot', 'ec145ff75241', 'reaction', '🔥', 1790813684105);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-fd5414-2', 'post', 'tut-bazzite-handheld-dualboot', 'fd541437289c', 'reaction', '👀', 1790813719457);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-ea3ba3-3', 'post', 'tut-bazzite-handheld-dualboot', 'ea3ba3d97619', 'reaction', '👏', 1790813754193);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-054d19-4', 'post', 'tut-bazzite-handheld-dualboot', '054d19cbc4a3', 'reaction', '🧠', 1790813789185);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-aee265-5', 'post', 'tut-bazzite-handheld-dualboot', 'aee265611119', 'reaction', '🧠', 1790813824469);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-a266c4-6', 'post', 'tut-bazzite-handheld-dualboot', 'a266c4b88dd6', 'reaction', '💀', 1790813859033);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-d266bb-7', 'post', 'tut-bazzite-handheld-dualboot', 'd266bba40a69', 'reaction', '🔥', 1790813894266);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-477929-8', 'post', 'tut-bazzite-handheld-dualboot', '477929679258', 'reaction', '💀', 1790813929767);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-9d511b-9', 'post', 'tut-bazzite-handheld-dualboot', '9d511b6d4b95', 'reaction', '🔥', 1790813964614);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-fb2f5a-10', 'post', 'tut-bazzite-handheld-dualboot', 'fb2f5ab89d2a', 'reaction', '👀', 1790813999329);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-0ad17d-11', 'post', 'tut-bazzite-handheld-dualboot', '0ad17d6d4d00', 'reaction', '👀', 1790814034846);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-29504e-12', 'post', 'tut-bazzite-handheld-dualboot', '29504effe600', 'reaction', '🚀', 1790814069516);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-022dfe-13', 'post', 'tut-bazzite-handheld-dualboot', '022dfe273ce3', 'reaction', '🧠', 1790814104346);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-8671be-14', 'post', 'tut-bazzite-handheld-dualboot', '8671be38fa34', 'reaction', '🔥', 1790814139594);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-5ced76-15', 'post', 'tut-bazzite-handheld-dualboot', '5ced76eb24bf', 'reaction', '🧠', 1790814174025);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-b13e24-16', 'post', 'tut-bazzite-handheld-dualboot', 'b13e2433a991', 'reaction', '❤️', 1790814209351);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-bazzit-92662d-17', 'post', 'tut-bazzite-handheld-dualboot', '92662dede481', 'reaction', '❤️', 1790814244766);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-baz-05bf', 'comment', 'comm-tut-bazzit-1', '05bf27b00547', 'reaction', '💯', 1790814828553);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-baz-376f', 'comment', 'comm-tut-bazzit-2', '376f250ce8fc', 'reaction', '👏', 1790816165671);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-baz-159b', 'comment', 'comm-tut-bazzit-3', '159b82b41da3', 'reaction', '💯', 1790816623531);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-baz-e986', 'comment', 'comm-tut-bazzit-4', 'e9863d153494', 'reaction', '👏', 1790817160371);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-baz-f734', 'comment', 'comm-tut-bazzit-5', 'f734b37dad45', 'reaction', '❤️', 1790818410582);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-baz-3be0', 'comment', 'comm-tut-bazzit-6', '3be038fc3cd8', 'reaction', '❤️', 1790818568841);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-92adb0-0', 'post', 'tut-re-unity-unreal-games', '92adb08137f7', 'reaction', '❤️', 1790823942249);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-1a0afc-1', 'post', 'tut-re-unity-unreal-games', '1a0afceb3a08', 'reaction', '💀', 1790823977339);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-09d304-2', 'post', 'tut-re-unity-unreal-games', '09d3048c80db', 'reaction', '💀', 1790824012151);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-ca2260-3', 'post', 'tut-re-unity-unreal-games', 'ca22608720ee', 'reaction', '🧠', 1790824046698);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-b6bc6e-4', 'post', 'tut-re-unity-unreal-games', 'b6bc6ea5b8b1', 'reaction', '🚀', 1790824082018);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-15b43f-5', 'post', 'tut-re-unity-unreal-games', '15b43f920aa9', 'reaction', '❤️', 1790824117118);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-062e74-6', 'post', 'tut-re-unity-unreal-games', '062e741974e0', 'reaction', '🔥', 1790824152152);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-37ec40-7', 'post', 'tut-re-unity-unreal-games', '37ec40aa3af9', 'reaction', '🧠', 1790824186933);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-47b65a-8', 'post', 'tut-re-unity-unreal-games', '47b65add378a', 'reaction', '🔥', 1790824222120);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-bebcca-9', 'post', 'tut-re-unity-unreal-games', 'bebccaee5ef9', 'reaction', '💀', 1790824257150);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-1dbf73-10', 'post', 'tut-re-unity-unreal-games', '1dbf738a7ae9', 'reaction', '👏', 1790824291717);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-f67d83-11', 'post', 'tut-re-unity-unreal-games', 'f67d83df0160', 'reaction', '❤️', 1790824326974);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-2f4535-12', 'post', 'tut-re-unity-unreal-games', '2f45357eb6c0', 'reaction', '❤️', 1790824361960);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-012fbc-13', 'post', 'tut-re-unity-unreal-games', '012fbc5eb421', 'reaction', '🔥', 1790824396995);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-83f433-14', 'post', 'tut-re-unity-unreal-games', '83f43322af51', 'reaction', '🚀', 1790824431747);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-2929ca-15', 'post', 'tut-re-unity-unreal-games', '2929ca6a22a0', 'reaction', '👏', 1790824466874);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-acbeee-16', 'post', 'tut-re-unity-unreal-games', 'acbeee43e1a9', 'reaction', '🧠', 1790824501706);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-re-uni-6fe3e0-17', 'post', 'tut-re-unity-unreal-games', '6fe3e022e10b', 'reaction', '🧠', 1790824537364);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-re--26e1', 'comment', 'comm-tut-re-uni-1', '26e19adb255a', 'reaction', '❤️', 1790824159576);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-re--c2a8', 'comment', 'comm-tut-re-uni-5', 'c2a8237424ff', 'reaction', '❤️', 1790827963700);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-beccf6-0', 'post', 'tut-android-15-kernelsu-trickystore', 'beccf6dfe78d', 'reaction', '👀', 1790833941732);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-363138-1', 'post', 'tut-android-15-kernelsu-trickystore', '36313844c367', 'reaction', '💯', 1790833976724);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-a4e220-2', 'post', 'tut-android-15-kernelsu-trickystore', 'a4e2202effb9', 'reaction', '💯', 1790834011455);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-65cb02-3', 'post', 'tut-android-15-kernelsu-trickystore', '65cb02c6eeac', 'reaction', '🚀', 1790834046896);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-a3d84f-4', 'post', 'tut-android-15-kernelsu-trickystore', 'a3d84f66f226', 'reaction', '❤️', 1790834081690);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-fc1930-5', 'post', 'tut-android-15-kernelsu-trickystore', 'fc1930f2d60e', 'reaction', '🚀', 1790834116777);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-09b273-6', 'post', 'tut-android-15-kernelsu-trickystore', '09b2732575ea', 'reaction', '❤️', 1790834151471);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-c4697d-7', 'post', 'tut-android-15-kernelsu-trickystore', 'c4697d9f8802', 'reaction', '❤️', 1790834186384);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-f6b1ec-8', 'post', 'tut-android-15-kernelsu-trickystore', 'f6b1ecf9330d', 'reaction', '❤️', 1790834222031);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-a7709a-9', 'post', 'tut-android-15-kernelsu-trickystore', 'a7709a03e0f0', 'reaction', '🚀', 1790834257028);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-c1617b-10', 'post', 'tut-android-15-kernelsu-trickystore', 'c1617bb96869', 'reaction', '🔥', 1790834291808);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-7e3cf1-11', 'post', 'tut-android-15-kernelsu-trickystore', '7e3cf121506c', 'reaction', '🧠', 1790834326696);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-d39123-12', 'post', 'tut-android-15-kernelsu-trickystore', 'd39123692ff3', 'reaction', '🔥', 1790834361424);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-84ed92-13', 'post', 'tut-android-15-kernelsu-trickystore', '84ed927a8ff5', 'reaction', '🚀', 1790834397064);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-43cffe-14', 'post', 'tut-android-15-kernelsu-trickystore', '43cffe526dfa', 'reaction', '🚀', 1790834431833);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-bbc638-15', 'post', 'tut-android-15-kernelsu-trickystore', 'bbc638229139', 'reaction', '👏', 1790834466706);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-ae7218-16', 'post', 'tut-android-15-kernelsu-trickystore', 'ae7218af6408', 'reaction', '👀', 1790834501849);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-androi-3b8f95-17', 'post', 'tut-android-15-kernelsu-trickystore', '3b8f955d4507', 'reaction', '💀', 1790834537072);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-and-55ac', 'comment', 'comm-tut-androi-1', '55acee4f3fd6', 'reaction', '👏', 1790834599886);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-and-e25c', 'comment', 'comm-tut-androi-3', 'e25cfe8a0034', 'reaction', '❤️', 1790836078809);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-and-a151', 'comment', 'comm-tut-androi-5', 'a1513119cb10', 'reaction', '💯', 1790836762983);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-and-afa7', 'comment', 'comm-tut-androi-6', 'afa7a99213f7', 'reaction', '🔥', 1790837517544);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-d44e4c-0', 'post', 'tut-retroarch-crt-megabezel', 'd44e4cab4f4a', 'reaction', '🧠', 1790843972946);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-5b5387-1', 'post', 'tut-retroarch-crt-megabezel', '5b538769d471', 'reaction', '💯', 1790844007518);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-62ef02-2', 'post', 'tut-retroarch-crt-megabezel', '62ef02023ea0', 'reaction', '❤️', 1790844042530);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-432a86-3', 'post', 'tut-retroarch-crt-megabezel', '432a86adbede', 'reaction', '🔥', 1790844077149);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-9fd369-4', 'post', 'tut-retroarch-crt-megabezel', '9fd369c2ace9', 'reaction', '👀', 1790844112950);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-82ae1f-5', 'post', 'tut-retroarch-crt-megabezel', '82ae1fd6ab00', 'reaction', '🔥', 1790844147369);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-dcbdcf-6', 'post', 'tut-retroarch-crt-megabezel', 'dcbdcf10dc15', 'reaction', '❤️', 1790844182870);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-847a28-7', 'post', 'tut-retroarch-crt-megabezel', '847a28e09fcf', 'reaction', '👏', 1790844217517);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-5fa88f-8', 'post', 'tut-retroarch-crt-megabezel', '5fa88faed924', 'reaction', '👏', 1790844252953);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-ca5b88-9', 'post', 'tut-retroarch-crt-megabezel', 'ca5b885547aa', 'reaction', '💯', 1790844287232);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-7b291c-10', 'post', 'tut-retroarch-crt-megabezel', '7b291c467943', 'reaction', '💯', 1790844322268);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-61b1fc-11', 'post', 'tut-retroarch-crt-megabezel', '61b1fc3c6a5d', 'reaction', '❤️', 1790844357276);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-e27941-12', 'post', 'tut-retroarch-crt-megabezel', 'e2794137e3fc', 'reaction', '👀', 1790844392512);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-1dd77a-13', 'post', 'tut-retroarch-crt-megabezel', '1dd77aadfbae', 'reaction', '💯', 1790844427662);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-903e13-14', 'post', 'tut-retroarch-crt-megabezel', '903e13ff9b37', 'reaction', '🧠', 1790844462646);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-35b4da-15', 'post', 'tut-retroarch-crt-megabezel', '35b4dad1b1b3', 'reaction', '❤️', 1790844497219);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-f6ce62-16', 'post', 'tut-retroarch-crt-megabezel', 'f6ce62e24b69', 'reaction', '🔥', 1790844532561);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-retroa-dc8d7e-17', 'post', 'tut-retroarch-crt-megabezel', 'dc8d7e74a068', 'reaction', '💯', 1790844567962);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ret-4207', 'comment', 'comm-tut-retroa-2', '4207190e574c', 'reaction', '💯', 1790846360592);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ret-c2a8', 'comment', 'comm-tut-retroa-4', 'c2a8237424ff', 'reaction', '👏', 1790848170184);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ret-159b', 'comment', 'comm-tut-retroa-5', '159b82b41da3', 'reaction', '💯', 1790849396065);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-93daeb-1', 'post', 'tut-truenas-10g-nas-zfs', '93daeba59dfa', 'reaction', '💯', 1790854003094);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-22c181-2', 'post', 'tut-truenas-10g-nas-zfs', '22c18169d85f', 'reaction', '🚀', 1790854038041);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-e25eab-3', 'post', 'tut-truenas-10g-nas-zfs', 'e25eab9566e4', 'reaction', '🧠', 1790854073032);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-ef560a-4', 'post', 'tut-truenas-10g-nas-zfs', 'ef560a97f2a0', 'reaction', '🧠', 1790854108164);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-ea9f37-5', 'post', 'tut-truenas-10g-nas-zfs', 'ea9f3708417d', 'reaction', '🚀', 1790854143193);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-9b2b42-6', 'post', 'tut-truenas-10g-nas-zfs', '9b2b42a4abd6', 'reaction', '👏', 1790854178038);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-c8cbcf-7', 'post', 'tut-truenas-10g-nas-zfs', 'c8cbcf6d1f70', 'reaction', '🧠', 1790854212877);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-4df67e-8', 'post', 'tut-truenas-10g-nas-zfs', '4df67e4730ca', 'reaction', '👀', 1790854247990);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-5f73ab-9', 'post', 'tut-truenas-10g-nas-zfs', '5f73ab705ebc', 'reaction', '👏', 1790854283225);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-f8b604-10', 'post', 'tut-truenas-10g-nas-zfs', 'f8b604a445b1', 'reaction', '💀', 1790854318237);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-b6b3d5-11', 'post', 'tut-truenas-10g-nas-zfs', 'b6b3d53002bd', 'reaction', '🧠', 1790854352994);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-161fe2-12', 'post', 'tut-truenas-10g-nas-zfs', '161fe2932c42', 'reaction', '👀', 1790854388516);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-b85698-13', 'post', 'tut-truenas-10g-nas-zfs', 'b856982f7490', 'reaction', '🚀', 1790854423167);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-3bdeb0-14', 'post', 'tut-truenas-10g-nas-zfs', '3bdeb01e498e', 'reaction', '💀', 1790854458314);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-f266d4-15', 'post', 'tut-truenas-10g-nas-zfs', 'f266d49577dd', 'reaction', '❤️', 1790854492994);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-6e61d7-16', 'post', 'tut-truenas-10g-nas-zfs', '6e61d7c39a57', 'reaction', '👏', 1790854528624);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-truena-4af97f-17', 'post', 'tut-truenas-10g-nas-zfs', '4af97f8d0ee0', 'reaction', '💯', 1790854563472);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-tru-d391', 'comment', 'comm-tut-truena-1', 'd39123692ff3', 'reaction', '🔥', 1790854182516);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-tru-a88d', 'comment', 'comm-tut-truena-2', 'a88df42ff937', 'reaction', '💯', 1790855003515);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-tru-9a1b', 'comment', 'comm-tut-truena-3', '9a1bd426998f', 'reaction', '💯', 1790856048087);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-tru-a558', 'comment', 'comm-tut-truena-5', 'a558474c1fc0', 'reaction', '👏', 1790858128366);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-a273f6-0', 'post', 'tut-rpi5-nvme-unbound-dns', 'a273f6711af3', 'reaction', '👀', 1790864267456);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-cc1d42-1', 'post', 'tut-rpi5-nvme-unbound-dns', 'cc1d423c7110', 'reaction', '👀', 1790864301934);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-f34421-2', 'post', 'tut-rpi5-nvme-unbound-dns', 'f344216bec06', 'reaction', '❤️', 1790864337007);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-77b722-3', 'post', 'tut-rpi5-nvme-unbound-dns', '77b722b117ba', 'reaction', '👏', 1790864372252);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-60479d-4', 'post', 'tut-rpi5-nvme-unbound-dns', '60479df9131b', 'reaction', '👏', 1790864407344);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-0f370a-5', 'post', 'tut-rpi5-nvme-unbound-dns', '0f370ac7b7f0', 'reaction', '❤️', 1790864442168);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-098577-6', 'post', 'tut-rpi5-nvme-unbound-dns', '0985771357ad', 'reaction', '❤️', 1790864476716);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-dcd931-7', 'post', 'tut-rpi5-nvme-unbound-dns', 'dcd931357e8e', 'reaction', '🧠', 1790864512254);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-5b960d-8', 'post', 'tut-rpi5-nvme-unbound-dns', '5b960d79bcf1', 'reaction', '💯', 1790864546684);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-db7a44-9', 'post', 'tut-rpi5-nvme-unbound-dns', 'db7a44b5f7a3', 'reaction', '❤️', 1790864581684);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-11e781-10', 'post', 'tut-rpi5-nvme-unbound-dns', '11e78122e962', 'reaction', '👏', 1790864617311);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-f22da4-11', 'post', 'tut-rpi5-nvme-unbound-dns', 'f22da4c99193', 'reaction', '💯', 1790864651812);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-17e807-12', 'post', 'tut-rpi5-nvme-unbound-dns', '17e8070c0ccf', 'reaction', '🚀', 1790864687203);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-3b0cfb-13', 'post', 'tut-rpi5-nvme-unbound-dns', '3b0cfb0b76e9', 'reaction', '👀', 1790864721968);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-f350c3-14', 'post', 'tut-rpi5-nvme-unbound-dns', 'f350c312acce', 'reaction', '💯', 1790864757310);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-06a627-15', 'post', 'tut-rpi5-nvme-unbound-dns', '06a627bdb716', 'reaction', '❤️', 1790864792194);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-98801b-16', 'post', 'tut-rpi5-nvme-unbound-dns', '98801b3f5e60', 'reaction', '💯', 1790864826815);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-rpi5-n-a3a1b9-17', 'post', 'tut-rpi5-nvme-unbound-dns', 'a3a1b9ab0af9', 'reaction', '🔥', 1790864862261);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-rpi-1a0a', 'comment', 'comm-tut-rpi5-n-2', '1a0afceb3a08', 'reaction', '👏', 1790858061366);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-rpi-28f7', 'comment', 'comm-tut-rpi5-n-3', '28f7a0d483ea', 'reaction', '🔥', 1790857987366);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-rpi-a3a1', 'comment', 'comm-tut-rpi5-n-4', 'a3a1b9ab0af9', 'reaction', '😂', 1790858029366);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-d7684b-0', 'post', 'tut-ddr5-ram-subtimings-oc', 'd7684b33c50b', 'reaction', '❤️', 1790874282471);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-15cf7c-1', 'post', 'tut-ddr5-ram-subtimings-oc', '15cf7c802b3c', 'reaction', '❤️', 1790874318105);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-7af628-2', 'post', 'tut-ddr5-ram-subtimings-oc', '7af628ad91ee', 'reaction', '👀', 1790874353015);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-168966-3', 'post', 'tut-ddr5-ram-subtimings-oc', '16896655a53d', 'reaction', '❤️', 1790874388050);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-af868c-4', 'post', 'tut-ddr5-ram-subtimings-oc', 'af868c7b9821', 'reaction', '🚀', 1790874423052);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-82ae1f-5', 'post', 'tut-ddr5-ram-subtimings-oc', '82ae1fd6ab00', 'reaction', '🧠', 1790874457564);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-55acee-6', 'post', 'tut-ddr5-ram-subtimings-oc', '55acee4f3fd6', 'reaction', '👏', 1790874493110);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-62b2b9-7', 'post', 'tut-ddr5-ram-subtimings-oc', '62b2b9bb1e15', 'reaction', '👏', 1790874527617);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-b46213-8', 'post', 'tut-ddr5-ram-subtimings-oc', 'b462135e2856', 'reaction', '🚀', 1790874562722);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-c87034-9', 'post', 'tut-ddr5-ram-subtimings-oc', 'c87034e600ea', 'reaction', '💀', 1790874597831);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-f61e34-10', 'post', 'tut-ddr5-ram-subtimings-oc', 'f61e3425723b', 'reaction', '❤️', 1790874632886);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-a273f6-11', 'post', 'tut-ddr5-ram-subtimings-oc', 'a273f6711af3', 'reaction', '👏', 1790874667522);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-19ed1d-12', 'post', 'tut-ddr5-ram-subtimings-oc', '19ed1df26baa', 'reaction', '🚀', 1790874702783);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-5054f5-13', 'post', 'tut-ddr5-ram-subtimings-oc', '5054f5773819', 'reaction', '💯', 1790874737368);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-ddbb0b-14', 'post', 'tut-ddr5-ram-subtimings-oc', 'ddbb0be20897', 'reaction', '💀', 1790874772329);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-bb6a5a-15', 'post', 'tut-ddr5-ram-subtimings-oc', 'bb6a5a4b1efd', 'reaction', '👀', 1790874808014);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-df18e1-16', 'post', 'tut-ddr5-ram-subtimings-oc', 'df18e1fc0ae3', 'reaction', '🧠', 1790874842706);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ddr5-r-e26107-17', 'post', 'tut-ddr5-ram-subtimings-oc', 'e26107afc299', 'reaction', '🔥', 1790874877447);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ddr-35b4', 'comment', 'comm-tut-ddr5-r-1', '35b4dad1b1b3', 'reaction', '🔥', 1790858089366);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ddr-ff2c', 'comment', 'comm-tut-ddr5-r-2', 'ff2c1f2dd1a7', 'reaction', '🔥', 1790857914366);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ddr-db30', 'comment', 'comm-tut-ddr5-r-3', 'db30fcedd957', 'reaction', '❤️', 1790857908366);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-cef949-0', 'post', 'tut-proxmox-gpu-passthrough-sunshine', 'cef94956fd7c', 'reaction', '🚀', 1790884353906);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-f8a43d-1', 'post', 'tut-proxmox-gpu-passthrough-sunshine', 'f8a43d971f06', 'reaction', '👀', 1790884388738);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-3820f2-2', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '3820f26d77d5', 'reaction', '👏', 1790884424319);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-1a32b1-3', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '1a32b10d033c', 'reaction', '🚀', 1790884459100);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-de5f08-4', 'post', 'tut-proxmox-gpu-passthrough-sunshine', 'de5f08d53349', 'reaction', '👀', 1790884493996);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-9a1bd4-5', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '9a1bd426998f', 'reaction', '💯', 1790884528781);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-c7b891-6', 'post', 'tut-proxmox-gpu-passthrough-sunshine', 'c7b891ee84c6', 'reaction', '🚀', 1790884563712);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-3af19d-7', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '3af19def05a1', 'reaction', '👀', 1790884599534);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-3cfeda-8', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '3cfeda3ca895', 'reaction', '🧠', 1790884634052);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-051851-9', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '051851246645', 'reaction', '💀', 1790884668775);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-588d81-10', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '588d81128dda', 'reaction', '💀', 1790884704212);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-ae60e0-11', 'post', 'tut-proxmox-gpu-passthrough-sunshine', 'ae60e07be4f8', 'reaction', '💯', 1790884739044);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-d69d0a-12', 'post', 'tut-proxmox-gpu-passthrough-sunshine', 'd69d0aec59bc', 'reaction', '💯', 1790884774290);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-fe4648-13', 'post', 'tut-proxmox-gpu-passthrough-sunshine', 'fe4648aaf3f7', 'reaction', '💀', 1790884809467);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-96d3d8-14', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '96d3d8d56368', 'reaction', '🧠', 1790884843928);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-989875-15', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '9898757207e1', 'reaction', '🧠', 1790884879529);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-594a8a-16', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '594a8ac627da', 'reaction', '👏', 1790884914264);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-proxmo-2c3605-17', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '2c3605ceca77', 'reaction', '❤️', 1790884949297);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-pro-0518', 'comment', 'comm-tut-proxmo-2', '051851246645', 'reaction', '👏', 1790858071707);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-051851-0', 'post', 'tut-ps4-1352-webkitty-deepdive', '051851246645', 'reaction', '💀', 1790894321094);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-0adf13-1', 'post', 'tut-ps4-1352-webkitty-deepdive', '0adf13555456', 'reaction', '👀', 1790894356078);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-952963-2', 'post', 'tut-ps4-1352-webkitty-deepdive', '952963af8478', 'reaction', '💀', 1790894391363);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-1924cf-3', 'post', 'tut-ps4-1352-webkitty-deepdive', '1924cf443966', 'reaction', '👀', 1790894425851);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-37082a-4', 'post', 'tut-ps4-1352-webkitty-deepdive', '37082a43880b', 'reaction', '🚀', 1790894460912);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-9ffbb8-5', 'post', 'tut-ps4-1352-webkitty-deepdive', '9ffbb8260474', 'reaction', '💯', 1790894495819);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-13ce0d-6', 'post', 'tut-ps4-1352-webkitty-deepdive', '13ce0d6aa402', 'reaction', '🧠', 1790894531317);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-89dfe0-7', 'post', 'tut-ps4-1352-webkitty-deepdive', '89dfe0be184c', 'reaction', '🧠', 1790894565773);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-d2b3bb-8', 'post', 'tut-ps4-1352-webkitty-deepdive', 'd2b3bb319ed9', 'reaction', '🧠', 1790894600954);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-6274b3-9', 'post', 'tut-ps4-1352-webkitty-deepdive', '6274b33f318b', 'reaction', '👏', 1790894635948);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-aeca09-10', 'post', 'tut-ps4-1352-webkitty-deepdive', 'aeca0956d52a', 'reaction', '❤️', 1790894670695);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-89fe36-11', 'post', 'tut-ps4-1352-webkitty-deepdive', '89fe36126618', 'reaction', '💯', 1790894705957);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-f67d83-12', 'post', 'tut-ps4-1352-webkitty-deepdive', 'f67d83df0160', 'reaction', '🧠', 1790894740942);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-816dd3-13', 'post', 'tut-ps4-1352-webkitty-deepdive', '816dd35d9f1d', 'reaction', '💯', 1790894775838);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-44066d-14', 'post', 'tut-ps4-1352-webkitty-deepdive', '44066d3e2508', 'reaction', '🔥', 1790894811345);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-90c620-15', 'post', 'tut-ps4-1352-webkitty-deepdive', '90c6202b8a19', 'reaction', '💀', 1790894846533);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-c93dca-16', 'post', 'tut-ps4-1352-webkitty-deepdive', 'c93dca3e945b', 'reaction', '👏', 1790894881537);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-ps4-13-89e7ab-17', 'post', 'tut-ps4-1352-webkitty-deepdive', '89e7abe9363d', 'reaction', '❤️', 1790894916288);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ps4-6704', 'comment', 'comm-tut-ps4-13-1', '67047c5be367', 'reaction', '💯', 1790858173366);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-ps4-5edf', 'comment', 'comm-tut-ps4-13-2', '5edfc2d1ee35', 'reaction', '🔥', 1790858001366);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--05bf27-0', 'post', 'tut-esp32-zigbee-home-assistant', '05bf27b00547', 'reaction', '🚀', 1790904580125);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--cd82f1-1', 'post', 'tut-esp32-zigbee-home-assistant', 'cd82f10d8c6b', 'reaction', '💀', 1790904615242);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--d1ee85-2', 'post', 'tut-esp32-zigbee-home-assistant', 'd1ee859e07d8', 'reaction', '💀', 1790904650094);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--66fcad-3', 'post', 'tut-esp32-zigbee-home-assistant', '66fcadf18eb2', 'reaction', '🚀', 1790904685370);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--9ffbb8-5', 'post', 'tut-esp32-zigbee-home-assistant', '9ffbb8260474', 'reaction', '🚀', 1790904755036);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--588d81-6', 'post', 'tut-esp32-zigbee-home-assistant', '588d81128dda', 'reaction', '🔥', 1790904790481);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--28b7aa-7', 'post', 'tut-esp32-zigbee-home-assistant', '28b7aa1ca481', 'reaction', '💀', 1790904825577);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--0dc7ff-8', 'post', 'tut-esp32-zigbee-home-assistant', '0dc7ffa699af', 'reaction', '👏', 1790904860104);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--66f496-9', 'post', 'tut-esp32-zigbee-home-assistant', '66f496427166', 'reaction', '🔥', 1790904895454);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--395160-10', 'post', 'tut-esp32-zigbee-home-assistant', '39516029d644', 'reaction', '🔥', 1790904930682);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--44066d-11', 'post', 'tut-esp32-zigbee-home-assistant', '44066d3e2508', 'reaction', '👀', 1790904965435);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--53f148-12', 'post', 'tut-esp32-zigbee-home-assistant', '53f14836513d', 'reaction', '🚀', 1790905000070);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--0ffc26-13', 'post', 'tut-esp32-zigbee-home-assistant', '0ffc2678086f', 'reaction', '👀', 1790905035507);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--84fc07-14', 'post', 'tut-esp32-zigbee-home-assistant', '84fc076c21fe', 'reaction', '👏', 1790905070200);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--265877-15', 'post', 'tut-esp32-zigbee-home-assistant', '265877d50a1f', 'reaction', '🧠', 1790905105162);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--dd2771-16', 'post', 'tut-esp32-zigbee-home-assistant', 'dd2771b9cd8a', 'reaction', '👏', 1790905140741);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-esp32--fa9f91-17', 'post', 'tut-esp32-zigbee-home-assistant', 'fa9f912a5c41', 'reaction', '🧠', 1790905175225);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-esp-fcd5', 'comment', 'comm-tut-esp32--1', 'fcd5c0b6bdea', 'reaction', '💯', 1790858090366);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-esp-9f63', 'comment', 'comm-tut-esp32--2', '9f639bef455b', 'reaction', '💯', 1790858163366);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-bd2fb8-0', 'post', 'tut-nix-flakes-reproducible-dev', 'bd2fb89abbd8', 'reaction', '💀', 1790914531617);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-704fa6-1', 'post', 'tut-nix-flakes-reproducible-dev', '704fa6c0a379', 'reaction', '👀', 1790914565918);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-e59a31-2', 'post', 'tut-nix-flakes-reproducible-dev', 'e59a3143c511', 'reaction', '💯', 1790914600993);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-f8385e-3', 'post', 'tut-nix-flakes-reproducible-dev', 'f8385e41df4b', 'reaction', '❤️', 1790914635779);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-e15db1-4', 'post', 'tut-nix-flakes-reproducible-dev', 'e15db12e226d', 'reaction', '❤️', 1790914671007);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-f87800-5', 'post', 'tut-nix-flakes-reproducible-dev', 'f87800223f20', 'reaction', '💀', 1790914705799);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-e61a7b-6', 'post', 'tut-nix-flakes-reproducible-dev', 'e61a7b81ae3c', 'reaction', '🧠', 1790914741094);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-ae0c18-7', 'post', 'tut-nix-flakes-reproducible-dev', 'ae0c18f7e2a9', 'reaction', '🚀', 1790914776632);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-6d6dfa-8', 'post', 'tut-nix-flakes-reproducible-dev', '6d6dfa8b6c5f', 'reaction', '🚀', 1790914811138);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-e71142-9', 'post', 'tut-nix-flakes-reproducible-dev', 'e71142b36966', 'reaction', '👏', 1790914846349);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-3bdeb0-10', 'post', 'tut-nix-flakes-reproducible-dev', '3bdeb01e498e', 'reaction', '🧠', 1790914881166);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-99b8a1-11', 'post', 'tut-nix-flakes-reproducible-dev', '99b8a1b53b5c', 'reaction', '💯', 1790914916158);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-7c0c3a-12', 'post', 'tut-nix-flakes-reproducible-dev', '7c0c3a0cf7bd', 'reaction', '👏', 1790914951169);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-721860-13', 'post', 'tut-nix-flakes-reproducible-dev', '72186038ccf3', 'reaction', '🧠', 1790914986671);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-9797a9-14', 'post', 'tut-nix-flakes-reproducible-dev', '9797a9cad01c', 'reaction', '🔥', 1790915021033);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-432a86-15', 'post', 'tut-nix-flakes-reproducible-dev', '432a86adbede', 'reaction', '💀', 1790915055889);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-c14ce6-16', 'post', 'tut-nix-flakes-reproducible-dev', 'c14ce66e338c', 'reaction', '💀', 1790915091052);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('int-tut-nix-fl-cef949-17', 'post', 'tut-nix-flakes-reproducible-dev', 'cef94956fd7c', 'reaction', '❤️', 1790915126296);
INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ('intc-comm-tut-nix-404c', 'comment', 'comm-tut-nix-fl-2', '404c7059bb19', 'reaction', '😂', 1790857943366);

-- 5. VOTES
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-a5f425', 'post', 'tut-ps4-1352-pppwn-goldhen', 'a5f42500dc70', 1, 1790743171928);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-4856c1', 'post', 'tut-ps4-1352-pppwn-goldhen', '4856c11ba1f1', 1, 1790743207323);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-d70bdd', 'post', 'tut-ps4-1352-pppwn-goldhen', 'd70bdd4b9c43', 1, 1790743241838);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-ca17a1', 'post', 'tut-ps4-1352-pppwn-goldhen', 'ca17a1293d73', 1, 1790743276914);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-e4b541', 'post', 'tut-ps4-1352-pppwn-goldhen', 'e4b54103e4ac', 1, 1790743312313);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-a97cec', 'post', 'tut-ps4-1352-pppwn-goldhen', 'a97cec120b24', 1, 1790743347373);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-c93dca', 'post', 'tut-ps4-1352-pppwn-goldhen', 'c93dca3e945b', 1, 1790743382091);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-c131c7', 'post', 'tut-ps4-1352-pppwn-goldhen', 'c131c72d05a3', 1, 1790743417134);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-db7cba', 'post', 'tut-ps4-1352-pppwn-goldhen', 'db7cba02dcb0', 1, 1790743452213);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-0424f1', 'post', 'tut-ps4-1352-pppwn-goldhen', '0424f1ef8724', 1, 1790743486587);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-bc6921', 'post', 'tut-ps4-1352-pppwn-goldhen', 'bc6921d15c1d', 1, 1790743521695);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-1924cf', 'post', 'tut-ps4-1352-pppwn-goldhen', '1924cf443966', 1, 1790743556721);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-a7709a', 'post', 'tut-ps4-1352-pppwn-goldhen', 'a7709a03e0f0', 1, 1790743591977);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-488752', 'post', 'tut-ps4-1352-pppwn-goldhen', '48875207268e', 1, 1790743626572);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-8000e6', 'post', 'tut-ps4-1352-pppwn-goldhen', '8000e6ca1a6f', 1, 1790743661733);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-65c4e0', 'post', 'tut-ps4-1352-pppwn-goldhen', '65c4e0605e86', 1, 1790743696932);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-6d9322', 'post', 'tut-ps4-1352-pppwn-goldhen', '6d9322cd0326', 1, 1790743732084);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-42ed27', 'post', 'tut-ps4-1352-pppwn-goldhen', '42ed2756a63a', 1, 1790743766656);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-66fcad', 'post', 'tut-ps5-etahen-60fps-guide', '66fcadf18eb2', 1, 1790753267871);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-febb2d', 'post', 'tut-ps5-etahen-60fps-guide', 'febb2dc98462', 1, 1790753302698);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-7a43e2', 'post', 'tut-ps5-etahen-60fps-guide', '7a43e268ffba', 1, 1790753337541);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-d00195', 'post', 'tut-ps5-etahen-60fps-guide', 'd00195fc63d9', 1, 1790753372899);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-2929ca', 'post', 'tut-ps5-etahen-60fps-guide', '2929ca6a22a0', 1, 1790753407607);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-6e3866', 'post', 'tut-ps5-etahen-60fps-guide', '6e386624a0d3', 1, 1790753443080);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-b4d640', 'post', 'tut-ps5-etahen-60fps-guide', 'b4d64034b39a', 1, 1790753477192);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-0a781f', 'post', 'tut-ps5-etahen-60fps-guide', '0a781f3ba683', 1, 1790753512756);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-ada8bc', 'post', 'tut-ps5-etahen-60fps-guide', 'ada8bc01b964', 1, 1790753548064);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-c80ad5', 'post', 'tut-ps5-etahen-60fps-guide', 'c80ad57c04b5', 1, 1790753583026);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-bb3c6c', 'post', 'tut-ps5-etahen-60fps-guide', 'bb3c6c336f00', 1, 1790753617697);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-50ad96', 'post', 'tut-ps5-etahen-60fps-guide', '50ad966aa587', 1, 1790753652299);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-ea67a5', 'post', 'tut-ps5-etahen-60fps-guide', 'ea67a584af6d', 1, 1790753687780);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-09d304', 'post', 'tut-ps5-etahen-60fps-guide', '09d3048c80db', 1, 1790753722906);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-588d81', 'post', 'tut-ps5-etahen-60fps-guide', '588d81128dda', 1, 1790753757983);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-19ed1d', 'post', 'tut-ps5-etahen-60fps-guide', '19ed1df26baa', 1, 1790753792506);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-46e2fa', 'post', 'tut-ps5-etahen-60fps-guide', '46e2fae2b1ed', 1, 1790753828048);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps5-et-b85698', 'post', 'tut-ps5-etahen-60fps-guide', 'b856982f7490', 1, 1790753862432);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-a5f425', 'post', 'tut-switch-oled-picofly-guide', 'a5f42500dc70', 1, 1790763429280);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-f47ede', 'post', 'tut-switch-oled-picofly-guide', 'f47edec0b51f', 1, 1790763464110);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-4ae1b3', 'post', 'tut-switch-oled-picofly-guide', '4ae1b31e85c2', 1, 1790763499286);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-8d3d40', 'post', 'tut-switch-oled-picofly-guide', '8d3d40c12d3d', 1, 1790763534159);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-3af19d', 'post', 'tut-switch-oled-picofly-guide', '3af19def05a1', 1, 1790763569008);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-aeca09', 'post', 'tut-switch-oled-picofly-guide', 'aeca0956d52a', 1, 1790763604184);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-3820f2', 'post', 'tut-switch-oled-picofly-guide', '3820f26d77d5', 1, 1790763639152);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-792ff6', 'post', 'tut-switch-oled-picofly-guide', '792ff625a4bd', 1, 1790763673900);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-d2c046', 'post', 'tut-switch-oled-picofly-guide', 'd2c0465cfe9e', 1, 1790763709416);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-77b722', 'post', 'tut-switch-oled-picofly-guide', '77b722b117ba', 1, 1790763744131);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-e4e771', 'post', 'tut-switch-oled-picofly-guide', 'e4e7715ef303', 1, 1790763778865);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-1d24cd', 'post', 'tut-switch-oled-picofly-guide', '1d24cd2b20d8', 1, 1790763813982);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-0ede06', 'post', 'tut-switch-oled-picofly-guide', '0ede06ec7e57', 1, 1790763849404);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-8d6fdf', 'post', 'tut-switch-oled-picofly-guide', '8d6fdfa6f0c9', 1, 1790763883918);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-995e68', 'post', 'tut-switch-oled-picofly-guide', '995e687861f3', 1, 1790763919544);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-ca2260', 'post', 'tut-switch-oled-picofly-guide', 'ca22608720ee', 1, 1790763954520);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-f91976', 'post', 'tut-switch-oled-picofly-guide', 'f91976eed048', 1, 1790763988919);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-switch-420719', 'post', 'tut-switch-oled-picofly-guide', '4207190e574c', 1, 1790764024588);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-02823d', 'post', 'tut-shadps4-bloodborne-pc-setup', '02823d50e54a', 1, 1790773522905);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-0f3e36', 'post', 'tut-shadps4-bloodborne-pc-setup', '0f3e368ea7f3', 1, 1790773558171);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-95b493', 'post', 'tut-shadps4-bloodborne-pc-setup', '95b493a172aa', 1, 1790773592963);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-532258', 'post', 'tut-shadps4-bloodborne-pc-setup', '53225856a5a7', 1, 1790773628147);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-bda945', 'post', 'tut-shadps4-bloodborne-pc-setup', 'bda945e42093', 1, 1790773662898);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-1fc9ba', 'post', 'tut-shadps4-bloodborne-pc-setup', '1fc9ba7e024c', 1, 1790773697934);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-1ed964', 'post', 'tut-shadps4-bloodborne-pc-setup', '1ed964ecf319', 1, 1790773733004);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-39fb52', 'post', 'tut-shadps4-bloodborne-pc-setup', '39fb52ca04b4', 1, 1790773767648);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-06d2d7', 'post', 'tut-shadps4-bloodborne-pc-setup', '06d2d75b0b45', 1, 1790773802975);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-cd82f1', 'post', 'tut-shadps4-bloodborne-pc-setup', 'cd82f10d8c6b', 1, 1790773837597);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-f8850a', 'post', 'tut-shadps4-bloodborne-pc-setup', 'f8850ad4d4e4', 1, 1790773872753);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-b336dd', 'post', 'tut-shadps4-bloodborne-pc-setup', 'b336dd41ff10', 1, 1790773908216);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-48f137', 'post', 'tut-shadps4-bloodborne-pc-setup', '48f137af35c1', 1, 1790773942489);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-d91d46', 'post', 'tut-shadps4-bloodborne-pc-setup', 'd91d46e9daf3', 1, 1790773977541);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-f266d4', 'post', 'tut-shadps4-bloodborne-pc-setup', 'f266d49577dd', 1, 1790774012652);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-d70bdd', 'post', 'tut-shadps4-bloodborne-pc-setup', 'd70bdd4b9c43', 1, 1790774048088);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-0f370a', 'post', 'tut-shadps4-bloodborne-pc-setup', '0f370ac7b7f0', 1, 1790774082680);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-shadps-d99610', 'post', 'tut-shadps4-bloodborne-pc-setup', 'd996106ab4e8', 1, 1790774117960);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-660074', 'post', 'tut-ios-sidestore-zero-revokes', '660074c2afcb', 1, 1790783561148);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-75693a', 'post', 'tut-ios-sidestore-zero-revokes', '75693ab27df0', 1, 1790783596030);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-aa4dd2', 'post', 'tut-ios-sidestore-zero-revokes', 'aa4dd2274a6e', 1, 1790783630760);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-b1b91a', 'post', 'tut-ios-sidestore-zero-revokes', 'b1b91a6b769c', 1, 1790783666097);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-4a13f6', 'post', 'tut-ios-sidestore-zero-revokes', '4a13f671e740', 1, 1790783701009);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-c4b7b9', 'post', 'tut-ios-sidestore-zero-revokes', 'c4b7b9273b2c', 1, 1790783735901);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-0e1b78', 'post', 'tut-ios-sidestore-zero-revokes', '0e1b78829632', 1, 1790783770658);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-89d616', 'post', 'tut-ios-sidestore-zero-revokes', '89d616d03b5a', 1, 1790783806081);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-b84131', 'post', 'tut-ios-sidestore-zero-revokes', 'b84131af1161', 1, 1790783840585);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-c66a55', 'post', 'tut-ios-sidestore-zero-revokes', 'c66a5574a3f3', 1, 1790783875666);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-4c178d', 'post', 'tut-ios-sidestore-zero-revokes', '4c178d466eab', 1, 1790783910835);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-57b8cd', 'post', 'tut-ios-sidestore-zero-revokes', '57b8cdc70b13', 1, 1790783945849);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-79c55d', 'post', 'tut-ios-sidestore-zero-revokes', '79c55da29b95', 1, 1790783980678);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-2a75d5', 'post', 'tut-ios-sidestore-zero-revokes', '2a75d57fc00b', 1, 1790784015558);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-39fb52', 'post', 'tut-ios-sidestore-zero-revokes', '39fb52ca04b4', 1, 1790784050853);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-f02c25', 'post', 'tut-ios-sidestore-zero-revokes', 'f02c25c82669', 1, 1790784086167);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-77c145', 'post', 'tut-ios-sidestore-zero-revokes', '77c1455eed66', 1, 1790784120994);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ios-si-b1bc87', 'post', 'tut-ios-sidestore-zero-revokes', 'b1bc876f4185', 1, 1790784155402);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-fd0a1c', 'post', 'tut-deepseek-r1-local-gpu', 'fd0a1c00d111', 1, 1790793587143);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-f8a43d', 'post', 'tut-deepseek-r1-local-gpu', 'f8a43d971f06', 1, 1790793622124);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-398ac2', 'post', 'tut-deepseek-r1-local-gpu', '398ac239ae0d', 1, 1790793656849);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-9d511b', 'post', 'tut-deepseek-r1-local-gpu', '9d511b6d4b95', 1, 1790793692569);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-b07ad6', 'post', 'tut-deepseek-r1-local-gpu', 'b07ad6cca58d', 1, 1790793727374);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-94d12f', 'post', 'tut-deepseek-r1-local-gpu', '94d12f910b35', 1, 1790793762363);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-44066d', 'post', 'tut-deepseek-r1-local-gpu', '44066d3e2508', 1, 1790793796805);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-363138', 'post', 'tut-deepseek-r1-local-gpu', '36313844c367', 1, 1790793832236);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-e650c9', 'post', 'tut-deepseek-r1-local-gpu', 'e650c98ef174', 1, 1790793867118);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-f9b094', 'post', 'tut-deepseek-r1-local-gpu', 'f9b09477ab1a', 1, 1790793901811);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-cc1d42', 'post', 'tut-deepseek-r1-local-gpu', 'cc1d423c7110', 1, 1790793937281);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-2e5210', 'post', 'tut-deepseek-r1-local-gpu', '2e5210388c90', 1, 1790793972138);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-123701', 'post', 'tut-deepseek-r1-local-gpu', '123701f1af7c', 1, 1790794007576);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-eaaf65', 'post', 'tut-deepseek-r1-local-gpu', 'eaaf654db135', 1, 1790794042218);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-edf6aa', 'post', 'tut-deepseek-r1-local-gpu', 'edf6aaeaa1d6', 1, 1790794076900);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-c25c3d', 'post', 'tut-deepseek-r1-local-gpu', 'c25c3dd1ec4d', 1, 1790794112272);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-8b0dfc', 'post', 'tut-deepseek-r1-local-gpu', '8b0dfc58ac87', 1, 1790794146958);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-deepse-d49f42', 'post', 'tut-deepseek-r1-local-gpu', 'd49f42438692', 1, 1790794182179);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-00a93c', 'post', 'tut-cs2-windows11-latency-tuning', '00a93c17bbcc', 1, 1790803731395);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-e8056e', 'post', 'tut-cs2-windows11-latency-tuning', 'e8056ec6ec9b', 1, 1790803765966);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-ea3ba3', 'post', 'tut-cs2-windows11-latency-tuning', 'ea3ba3d97619', 1, 1790803801001);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-b48bb2', 'post', 'tut-cs2-windows11-latency-tuning', 'b48bb28b06fe', 1, 1790803835909);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-0dc7ff', 'post', 'tut-cs2-windows11-latency-tuning', '0dc7ffa699af', 1, 1790803871254);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-d266bb', 'post', 'tut-cs2-windows11-latency-tuning', 'd266bba40a69', 1, 1790803906394);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-225be0', 'post', 'tut-cs2-windows11-latency-tuning', '225be0aca5ed', 1, 1790803940775);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-2c3605', 'post', 'tut-cs2-windows11-latency-tuning', '2c3605ceca77', 1, 1790803975819);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-bb3c6c', 'post', 'tut-cs2-windows11-latency-tuning', 'bb3c6c336f00', 1, 1790804010820);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-159b93', 'post', 'tut-cs2-windows11-latency-tuning', '159b933932e8', 1, 1790804046369);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-501a39', 'post', 'tut-cs2-windows11-latency-tuning', '501a39e707c3', 1, 1790804080652);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-40a290', 'post', 'tut-cs2-windows11-latency-tuning', '40a290bdf4d2', 1, 1790804116012);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-c8c4bb', 'post', 'tut-cs2-windows11-latency-tuning', 'c8c4bb08c74c', 1, 1790804151138);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-f7cd26', 'post', 'tut-cs2-windows11-latency-tuning', 'f7cd263016fe', 1, 1790804186094);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-4025bc', 'post', 'tut-cs2-windows11-latency-tuning', '4025bc14b2bc', 1, 1790804220936);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-cf37c3', 'post', 'tut-cs2-windows11-latency-tuning', 'cf37c30dbab9', 1, 1790804256399);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-952963', 'post', 'tut-cs2-windows11-latency-tuning', '952963af8478', 1, 1790804290684);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-cs2-wi-6274b3', 'post', 'tut-cs2-windows11-latency-tuning', '6274b33f318b', 1, 1790804326282);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-d0f2bf', 'post', 'tut-bazzite-handheld-dualboot', 'd0f2bf62c43e', 1, 1790813649458);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-ec145f', 'post', 'tut-bazzite-handheld-dualboot', 'ec145ff75241', 1, 1790813684105);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-fd5414', 'post', 'tut-bazzite-handheld-dualboot', 'fd541437289c', 1, 1790813719457);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-ea3ba3', 'post', 'tut-bazzite-handheld-dualboot', 'ea3ba3d97619', 1, 1790813754193);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-054d19', 'post', 'tut-bazzite-handheld-dualboot', '054d19cbc4a3', 1, 1790813789185);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-aee265', 'post', 'tut-bazzite-handheld-dualboot', 'aee265611119', 1, 1790813824469);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-a266c4', 'post', 'tut-bazzite-handheld-dualboot', 'a266c4b88dd6', 1, 1790813859033);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-d266bb', 'post', 'tut-bazzite-handheld-dualboot', 'd266bba40a69', 1, 1790813894266);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-477929', 'post', 'tut-bazzite-handheld-dualboot', '477929679258', 1, 1790813929767);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-9d511b', 'post', 'tut-bazzite-handheld-dualboot', '9d511b6d4b95', 1, 1790813964614);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-fb2f5a', 'post', 'tut-bazzite-handheld-dualboot', 'fb2f5ab89d2a', 1, 1790813999329);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-0ad17d', 'post', 'tut-bazzite-handheld-dualboot', '0ad17d6d4d00', 1, 1790814034846);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-29504e', 'post', 'tut-bazzite-handheld-dualboot', '29504effe600', 1, 1790814069516);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-022dfe', 'post', 'tut-bazzite-handheld-dualboot', '022dfe273ce3', 1, 1790814104346);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-8671be', 'post', 'tut-bazzite-handheld-dualboot', '8671be38fa34', 1, 1790814139594);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-5ced76', 'post', 'tut-bazzite-handheld-dualboot', '5ced76eb24bf', 1, 1790814174025);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-b13e24', 'post', 'tut-bazzite-handheld-dualboot', 'b13e2433a991', 1, 1790814209351);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-bazzit-92662d', 'post', 'tut-bazzite-handheld-dualboot', '92662dede481', 1, 1790814244766);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-92adb0', 'post', 'tut-re-unity-unreal-games', '92adb08137f7', 1, 1790823942249);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-1a0afc', 'post', 'tut-re-unity-unreal-games', '1a0afceb3a08', 1, 1790823977339);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-09d304', 'post', 'tut-re-unity-unreal-games', '09d3048c80db', 1, 1790824012151);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-ca2260', 'post', 'tut-re-unity-unreal-games', 'ca22608720ee', 1, 1790824046698);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-b6bc6e', 'post', 'tut-re-unity-unreal-games', 'b6bc6ea5b8b1', 1, 1790824082018);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-15b43f', 'post', 'tut-re-unity-unreal-games', '15b43f920aa9', 1, 1790824117118);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-062e74', 'post', 'tut-re-unity-unreal-games', '062e741974e0', 1, 1790824152152);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-37ec40', 'post', 'tut-re-unity-unreal-games', '37ec40aa3af9', 1, 1790824186933);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-47b65a', 'post', 'tut-re-unity-unreal-games', '47b65add378a', 1, 1790824222120);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-bebcca', 'post', 'tut-re-unity-unreal-games', 'bebccaee5ef9', 1, 1790824257150);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-1dbf73', 'post', 'tut-re-unity-unreal-games', '1dbf738a7ae9', 1, 1790824291717);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-f67d83', 'post', 'tut-re-unity-unreal-games', 'f67d83df0160', 1, 1790824326974);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-2f4535', 'post', 'tut-re-unity-unreal-games', '2f45357eb6c0', 1, 1790824361960);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-012fbc', 'post', 'tut-re-unity-unreal-games', '012fbc5eb421', 1, 1790824396995);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-83f433', 'post', 'tut-re-unity-unreal-games', '83f43322af51', 1, 1790824431747);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-2929ca', 'post', 'tut-re-unity-unreal-games', '2929ca6a22a0', 1, 1790824466874);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-acbeee', 'post', 'tut-re-unity-unreal-games', 'acbeee43e1a9', 1, 1790824501706);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-re-uni-6fe3e0', 'post', 'tut-re-unity-unreal-games', '6fe3e022e10b', 1, 1790824537364);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-beccf6', 'post', 'tut-android-15-kernelsu-trickystore', 'beccf6dfe78d', 1, 1790833941732);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-363138', 'post', 'tut-android-15-kernelsu-trickystore', '36313844c367', 1, 1790833976724);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-a4e220', 'post', 'tut-android-15-kernelsu-trickystore', 'a4e2202effb9', 1, 1790834011455);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-65cb02', 'post', 'tut-android-15-kernelsu-trickystore', '65cb02c6eeac', 1, 1790834046896);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-a3d84f', 'post', 'tut-android-15-kernelsu-trickystore', 'a3d84f66f226', 1, 1790834081690);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-fc1930', 'post', 'tut-android-15-kernelsu-trickystore', 'fc1930f2d60e', 1, 1790834116777);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-09b273', 'post', 'tut-android-15-kernelsu-trickystore', '09b2732575ea', 1, 1790834151471);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-c4697d', 'post', 'tut-android-15-kernelsu-trickystore', 'c4697d9f8802', 1, 1790834186384);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-f6b1ec', 'post', 'tut-android-15-kernelsu-trickystore', 'f6b1ecf9330d', 1, 1790834222031);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-a7709a', 'post', 'tut-android-15-kernelsu-trickystore', 'a7709a03e0f0', 1, 1790834257028);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-c1617b', 'post', 'tut-android-15-kernelsu-trickystore', 'c1617bb96869', 1, 1790834291808);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-7e3cf1', 'post', 'tut-android-15-kernelsu-trickystore', '7e3cf121506c', 1, 1790834326696);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-d39123', 'post', 'tut-android-15-kernelsu-trickystore', 'd39123692ff3', 1, 1790834361424);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-84ed92', 'post', 'tut-android-15-kernelsu-trickystore', '84ed927a8ff5', 1, 1790834397064);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-43cffe', 'post', 'tut-android-15-kernelsu-trickystore', '43cffe526dfa', 1, 1790834431833);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-bbc638', 'post', 'tut-android-15-kernelsu-trickystore', 'bbc638229139', 1, 1790834466706);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-ae7218', 'post', 'tut-android-15-kernelsu-trickystore', 'ae7218af6408', 1, 1790834501849);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-androi-3b8f95', 'post', 'tut-android-15-kernelsu-trickystore', '3b8f955d4507', 1, 1790834537072);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-d44e4c', 'post', 'tut-retroarch-crt-megabezel', 'd44e4cab4f4a', 1, 1790843972946);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-5b5387', 'post', 'tut-retroarch-crt-megabezel', '5b538769d471', 1, 1790844007518);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-62ef02', 'post', 'tut-retroarch-crt-megabezel', '62ef02023ea0', 1, 1790844042530);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-432a86', 'post', 'tut-retroarch-crt-megabezel', '432a86adbede', 1, 1790844077149);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-9fd369', 'post', 'tut-retroarch-crt-megabezel', '9fd369c2ace9', 1, 1790844112950);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-82ae1f', 'post', 'tut-retroarch-crt-megabezel', '82ae1fd6ab00', 1, 1790844147369);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-dcbdcf', 'post', 'tut-retroarch-crt-megabezel', 'dcbdcf10dc15', 1, 1790844182870);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-847a28', 'post', 'tut-retroarch-crt-megabezel', '847a28e09fcf', 1, 1790844217517);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-5fa88f', 'post', 'tut-retroarch-crt-megabezel', '5fa88faed924', 1, 1790844252953);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-ca5b88', 'post', 'tut-retroarch-crt-megabezel', 'ca5b885547aa', 1, 1790844287232);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-7b291c', 'post', 'tut-retroarch-crt-megabezel', '7b291c467943', 1, 1790844322268);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-61b1fc', 'post', 'tut-retroarch-crt-megabezel', '61b1fc3c6a5d', 1, 1790844357276);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-e27941', 'post', 'tut-retroarch-crt-megabezel', 'e2794137e3fc', 1, 1790844392512);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-1dd77a', 'post', 'tut-retroarch-crt-megabezel', '1dd77aadfbae', 1, 1790844427662);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-903e13', 'post', 'tut-retroarch-crt-megabezel', '903e13ff9b37', 1, 1790844462646);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-35b4da', 'post', 'tut-retroarch-crt-megabezel', '35b4dad1b1b3', 1, 1790844497219);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-f6ce62', 'post', 'tut-retroarch-crt-megabezel', 'f6ce62e24b69', 1, 1790844532561);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-retroa-dc8d7e', 'post', 'tut-retroarch-crt-megabezel', 'dc8d7e74a068', 1, 1790844567962);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-93daeb', 'post', 'tut-truenas-10g-nas-zfs', '93daeba59dfa', 1, 1790854003094);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-22c181', 'post', 'tut-truenas-10g-nas-zfs', '22c18169d85f', 1, 1790854038041);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-e25eab', 'post', 'tut-truenas-10g-nas-zfs', 'e25eab9566e4', 1, 1790854073032);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-ef560a', 'post', 'tut-truenas-10g-nas-zfs', 'ef560a97f2a0', 1, 1790854108164);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-ea9f37', 'post', 'tut-truenas-10g-nas-zfs', 'ea9f3708417d', 1, 1790854143193);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-9b2b42', 'post', 'tut-truenas-10g-nas-zfs', '9b2b42a4abd6', 1, 1790854178038);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-c8cbcf', 'post', 'tut-truenas-10g-nas-zfs', 'c8cbcf6d1f70', 1, 1790854212877);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-4df67e', 'post', 'tut-truenas-10g-nas-zfs', '4df67e4730ca', 1, 1790854247990);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-5f73ab', 'post', 'tut-truenas-10g-nas-zfs', '5f73ab705ebc', 1, 1790854283225);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-f8b604', 'post', 'tut-truenas-10g-nas-zfs', 'f8b604a445b1', 1, 1790854318237);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-b6b3d5', 'post', 'tut-truenas-10g-nas-zfs', 'b6b3d53002bd', 1, 1790854352994);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-161fe2', 'post', 'tut-truenas-10g-nas-zfs', '161fe2932c42', 1, 1790854388516);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-b85698', 'post', 'tut-truenas-10g-nas-zfs', 'b856982f7490', 1, 1790854423167);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-3bdeb0', 'post', 'tut-truenas-10g-nas-zfs', '3bdeb01e498e', 1, 1790854458314);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-f266d4', 'post', 'tut-truenas-10g-nas-zfs', 'f266d49577dd', 1, 1790854492994);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-6e61d7', 'post', 'tut-truenas-10g-nas-zfs', '6e61d7c39a57', 1, 1790854528624);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-truena-4af97f', 'post', 'tut-truenas-10g-nas-zfs', '4af97f8d0ee0', 1, 1790854563472);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-a273f6', 'post', 'tut-rpi5-nvme-unbound-dns', 'a273f6711af3', 1, 1790864267456);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-cc1d42', 'post', 'tut-rpi5-nvme-unbound-dns', 'cc1d423c7110', 1, 1790864301934);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-f34421', 'post', 'tut-rpi5-nvme-unbound-dns', 'f344216bec06', 1, 1790864337007);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-77b722', 'post', 'tut-rpi5-nvme-unbound-dns', '77b722b117ba', 1, 1790864372252);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-60479d', 'post', 'tut-rpi5-nvme-unbound-dns', '60479df9131b', 1, 1790864407344);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-0f370a', 'post', 'tut-rpi5-nvme-unbound-dns', '0f370ac7b7f0', 1, 1790864442168);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-098577', 'post', 'tut-rpi5-nvme-unbound-dns', '0985771357ad', 1, 1790864476716);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-dcd931', 'post', 'tut-rpi5-nvme-unbound-dns', 'dcd931357e8e', 1, 1790864512254);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-5b960d', 'post', 'tut-rpi5-nvme-unbound-dns', '5b960d79bcf1', 1, 1790864546684);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-db7a44', 'post', 'tut-rpi5-nvme-unbound-dns', 'db7a44b5f7a3', 1, 1790864581684);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-11e781', 'post', 'tut-rpi5-nvme-unbound-dns', '11e78122e962', 1, 1790864617311);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-f22da4', 'post', 'tut-rpi5-nvme-unbound-dns', 'f22da4c99193', 1, 1790864651812);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-17e807', 'post', 'tut-rpi5-nvme-unbound-dns', '17e8070c0ccf', 1, 1790864687203);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-3b0cfb', 'post', 'tut-rpi5-nvme-unbound-dns', '3b0cfb0b76e9', 1, 1790864721968);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-f350c3', 'post', 'tut-rpi5-nvme-unbound-dns', 'f350c312acce', 1, 1790864757310);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-06a627', 'post', 'tut-rpi5-nvme-unbound-dns', '06a627bdb716', 1, 1790864792194);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-98801b', 'post', 'tut-rpi5-nvme-unbound-dns', '98801b3f5e60', 1, 1790864826815);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-rpi5-n-a3a1b9', 'post', 'tut-rpi5-nvme-unbound-dns', 'a3a1b9ab0af9', 1, 1790864862261);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-d7684b', 'post', 'tut-ddr5-ram-subtimings-oc', 'd7684b33c50b', 1, 1790874282471);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-15cf7c', 'post', 'tut-ddr5-ram-subtimings-oc', '15cf7c802b3c', 1, 1790874318105);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-7af628', 'post', 'tut-ddr5-ram-subtimings-oc', '7af628ad91ee', 1, 1790874353015);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-168966', 'post', 'tut-ddr5-ram-subtimings-oc', '16896655a53d', 1, 1790874388050);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-af868c', 'post', 'tut-ddr5-ram-subtimings-oc', 'af868c7b9821', 1, 1790874423052);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-82ae1f', 'post', 'tut-ddr5-ram-subtimings-oc', '82ae1fd6ab00', 1, 1790874457564);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-55acee', 'post', 'tut-ddr5-ram-subtimings-oc', '55acee4f3fd6', 1, 1790874493110);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-62b2b9', 'post', 'tut-ddr5-ram-subtimings-oc', '62b2b9bb1e15', 1, 1790874527617);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-b46213', 'post', 'tut-ddr5-ram-subtimings-oc', 'b462135e2856', 1, 1790874562722);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-c87034', 'post', 'tut-ddr5-ram-subtimings-oc', 'c87034e600ea', 1, 1790874597831);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-f61e34', 'post', 'tut-ddr5-ram-subtimings-oc', 'f61e3425723b', 1, 1790874632886);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-a273f6', 'post', 'tut-ddr5-ram-subtimings-oc', 'a273f6711af3', 1, 1790874667522);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-19ed1d', 'post', 'tut-ddr5-ram-subtimings-oc', '19ed1df26baa', 1, 1790874702783);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-5054f5', 'post', 'tut-ddr5-ram-subtimings-oc', '5054f5773819', 1, 1790874737368);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-ddbb0b', 'post', 'tut-ddr5-ram-subtimings-oc', 'ddbb0be20897', 1, 1790874772329);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-bb6a5a', 'post', 'tut-ddr5-ram-subtimings-oc', 'bb6a5a4b1efd', 1, 1790874808014);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-df18e1', 'post', 'tut-ddr5-ram-subtimings-oc', 'df18e1fc0ae3', 1, 1790874842706);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ddr5-r-e26107', 'post', 'tut-ddr5-ram-subtimings-oc', 'e26107afc299', 1, 1790874877447);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-cef949', 'post', 'tut-proxmox-gpu-passthrough-sunshine', 'cef94956fd7c', 1, 1790884353906);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-f8a43d', 'post', 'tut-proxmox-gpu-passthrough-sunshine', 'f8a43d971f06', 1, 1790884388738);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-3820f2', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '3820f26d77d5', 1, 1790884424319);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-1a32b1', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '1a32b10d033c', 1, 1790884459100);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-de5f08', 'post', 'tut-proxmox-gpu-passthrough-sunshine', 'de5f08d53349', 1, 1790884493996);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-9a1bd4', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '9a1bd426998f', 1, 1790884528781);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-c7b891', 'post', 'tut-proxmox-gpu-passthrough-sunshine', 'c7b891ee84c6', 1, 1790884563712);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-3af19d', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '3af19def05a1', 1, 1790884599534);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-3cfeda', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '3cfeda3ca895', 1, 1790884634052);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-051851', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '051851246645', 1, 1790884668775);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-588d81', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '588d81128dda', 1, 1790884704212);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-ae60e0', 'post', 'tut-proxmox-gpu-passthrough-sunshine', 'ae60e07be4f8', 1, 1790884739044);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-d69d0a', 'post', 'tut-proxmox-gpu-passthrough-sunshine', 'd69d0aec59bc', 1, 1790884774290);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-fe4648', 'post', 'tut-proxmox-gpu-passthrough-sunshine', 'fe4648aaf3f7', 1, 1790884809467);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-96d3d8', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '96d3d8d56368', 1, 1790884843928);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-989875', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '9898757207e1', 1, 1790884879529);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-594a8a', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '594a8ac627da', 1, 1790884914264);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-proxmo-2c3605', 'post', 'tut-proxmox-gpu-passthrough-sunshine', '2c3605ceca77', 1, 1790884949297);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-051851', 'post', 'tut-ps4-1352-webkitty-deepdive', '051851246645', 1, 1790894321094);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-0adf13', 'post', 'tut-ps4-1352-webkitty-deepdive', '0adf13555456', 1, 1790894356078);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-952963', 'post', 'tut-ps4-1352-webkitty-deepdive', '952963af8478', 1, 1790894391363);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-1924cf', 'post', 'tut-ps4-1352-webkitty-deepdive', '1924cf443966', 1, 1790894425851);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-37082a', 'post', 'tut-ps4-1352-webkitty-deepdive', '37082a43880b', 1, 1790894460912);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-9ffbb8', 'post', 'tut-ps4-1352-webkitty-deepdive', '9ffbb8260474', 1, 1790894495819);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-13ce0d', 'post', 'tut-ps4-1352-webkitty-deepdive', '13ce0d6aa402', 1, 1790894531317);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-89dfe0', 'post', 'tut-ps4-1352-webkitty-deepdive', '89dfe0be184c', 1, 1790894565773);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-d2b3bb', 'post', 'tut-ps4-1352-webkitty-deepdive', 'd2b3bb319ed9', 1, 1790894600954);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-6274b3', 'post', 'tut-ps4-1352-webkitty-deepdive', '6274b33f318b', 1, 1790894635948);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-aeca09', 'post', 'tut-ps4-1352-webkitty-deepdive', 'aeca0956d52a', 1, 1790894670695);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-89fe36', 'post', 'tut-ps4-1352-webkitty-deepdive', '89fe36126618', 1, 1790894705957);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-f67d83', 'post', 'tut-ps4-1352-webkitty-deepdive', 'f67d83df0160', 1, 1790894740942);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-816dd3', 'post', 'tut-ps4-1352-webkitty-deepdive', '816dd35d9f1d', 1, 1790894775838);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-44066d', 'post', 'tut-ps4-1352-webkitty-deepdive', '44066d3e2508', 1, 1790894811345);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-90c620', 'post', 'tut-ps4-1352-webkitty-deepdive', '90c6202b8a19', 1, 1790894846533);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-c93dca', 'post', 'tut-ps4-1352-webkitty-deepdive', 'c93dca3e945b', 1, 1790894881537);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-ps4-13-89e7ab', 'post', 'tut-ps4-1352-webkitty-deepdive', '89e7abe9363d', 1, 1790894916288);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--05bf27', 'post', 'tut-esp32-zigbee-home-assistant', '05bf27b00547', 1, 1790904580125);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--cd82f1', 'post', 'tut-esp32-zigbee-home-assistant', 'cd82f10d8c6b', 1, 1790904615242);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--d1ee85', 'post', 'tut-esp32-zigbee-home-assistant', 'd1ee859e07d8', 1, 1790904650094);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--66fcad', 'post', 'tut-esp32-zigbee-home-assistant', '66fcadf18eb2', 1, 1790904685370);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--9ffbb8', 'post', 'tut-esp32-zigbee-home-assistant', '9ffbb8260474', 1, 1790904755036);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--588d81', 'post', 'tut-esp32-zigbee-home-assistant', '588d81128dda', 1, 1790904790481);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--28b7aa', 'post', 'tut-esp32-zigbee-home-assistant', '28b7aa1ca481', 1, 1790904825577);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--0dc7ff', 'post', 'tut-esp32-zigbee-home-assistant', '0dc7ffa699af', 1, 1790904860104);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--66f496', 'post', 'tut-esp32-zigbee-home-assistant', '66f496427166', 1, 1790904895454);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--395160', 'post', 'tut-esp32-zigbee-home-assistant', '39516029d644', 1, 1790904930682);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--44066d', 'post', 'tut-esp32-zigbee-home-assistant', '44066d3e2508', 1, 1790904965435);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--53f148', 'post', 'tut-esp32-zigbee-home-assistant', '53f14836513d', 1, 1790905000070);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--0ffc26', 'post', 'tut-esp32-zigbee-home-assistant', '0ffc2678086f', 1, 1790905035507);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--84fc07', 'post', 'tut-esp32-zigbee-home-assistant', '84fc076c21fe', 1, 1790905070200);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--265877', 'post', 'tut-esp32-zigbee-home-assistant', '265877d50a1f', 1, 1790905105162);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--dd2771', 'post', 'tut-esp32-zigbee-home-assistant', 'dd2771b9cd8a', 1, 1790905140741);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-esp32--fa9f91', 'post', 'tut-esp32-zigbee-home-assistant', 'fa9f912a5c41', 1, 1790905175225);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-bd2fb8', 'post', 'tut-nix-flakes-reproducible-dev', 'bd2fb89abbd8', 1, 1790914531617);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-704fa6', 'post', 'tut-nix-flakes-reproducible-dev', '704fa6c0a379', 1, 1790914565918);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-e59a31', 'post', 'tut-nix-flakes-reproducible-dev', 'e59a3143c511', 1, 1790914600993);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-f8385e', 'post', 'tut-nix-flakes-reproducible-dev', 'f8385e41df4b', 1, 1790914635779);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-e15db1', 'post', 'tut-nix-flakes-reproducible-dev', 'e15db12e226d', 1, 1790914671007);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-f87800', 'post', 'tut-nix-flakes-reproducible-dev', 'f87800223f20', 1, 1790914705799);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-e61a7b', 'post', 'tut-nix-flakes-reproducible-dev', 'e61a7b81ae3c', 1, 1790914741094);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-ae0c18', 'post', 'tut-nix-flakes-reproducible-dev', 'ae0c18f7e2a9', 1, 1790914776632);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-6d6dfa', 'post', 'tut-nix-flakes-reproducible-dev', '6d6dfa8b6c5f', 1, 1790914811138);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-e71142', 'post', 'tut-nix-flakes-reproducible-dev', 'e71142b36966', 1, 1790914846349);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-3bdeb0', 'post', 'tut-nix-flakes-reproducible-dev', '3bdeb01e498e', 1, 1790914881166);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-99b8a1', 'post', 'tut-nix-flakes-reproducible-dev', '99b8a1b53b5c', 1, 1790914916158);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-7c0c3a', 'post', 'tut-nix-flakes-reproducible-dev', '7c0c3a0cf7bd', 1, 1790914951169);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-721860', 'post', 'tut-nix-flakes-reproducible-dev', '72186038ccf3', 1, 1790914986671);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-9797a9', 'post', 'tut-nix-flakes-reproducible-dev', '9797a9cad01c', 1, 1790915021033);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-432a86', 'post', 'tut-nix-flakes-reproducible-dev', '432a86adbede', 1, 1790915055889);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-c14ce6', 'post', 'tut-nix-flakes-reproducible-dev', 'c14ce66e338c', 1, 1790915091052);
INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ('v-tut-nix-fl-cef949', 'post', 'tut-nix-flakes-reproducible-dev', 'cef94956fd7c', 1, 1790915126296);

-- 6. USER ACTIVITY SUMMARIES
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('aeb1d054fcdc', 1790743136445, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('5f5afaabbdaf', 1790743847304, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('180cabebf55c', 1790743989620, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('7d81c741ad8e', 1790744071092, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('816dd35d9f1d', 1790829579834, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('051851246645', 1790744556346, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('ed6816789120', 1790745028567, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('aeca0956d52a', 1790805587724, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('134ddf35f829', 1790829506940, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('8d6fdfa6f0c9', 1790753232087, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('615a4f0595c5', 1790774034943, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('e3bd6e64c684', 1790755357031, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('747671412b19', 1790756558160, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('15cf7c802b3c', 1790757054613, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('b84131af1161', 1790757145263, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('b7b40e65e386', 1790818553841, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('1f8a2f53fc46', 1790757718861, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('303ab902e6b3', 1790763393621, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('e4b54103e4ac', 1790764401619, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('2d9eef711c4c', 1790765224408, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('ef560a97f2a0', 1790765932097, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('f43228c293d5', 1790858017366, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('f5a0f8e0da04', 1790856557595, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('744d4502ff7b', 1790769349633, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('7eb9c47bfac4', 1790829891016, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('13ff8c3906a1', 1790773825031, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('1f305f6553e9', 1790775162600, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('476272a37ad4', 1790858063988, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('cd82f10d8c6b', 1790776210850, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('7e3ebbc4cf52', 1790777367300, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('2899b7a62823', 1790778493440, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('d163ab21da3c', 1790783525185, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('ced0b1619aad', 1790784505757, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('8990924a8e6c', 1790820870245, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('69bb7cd43d20', 1790785603201, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('f69a31d6748f', 1790786980157, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('d266bba40a69', 1790847247271, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('0f3e368ea7f3', 1790787555020, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('db30fcedd957', 1790793551578, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('b462135e2856', 1790804933618, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('5af5600ed3ab', 1790795788097, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('5841d81bfab4', 1790858133474, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('92adb08137f7', 1790798229036, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('72e2cb0ae844', 1790798660657, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('4ac11fcf7064', 1790799319799, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('7695726e815f', 1790803695538, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('53e9605fc167', 1790804340527, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('58628c59bebf', 1790804575799, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('37be4c890dab', 1790805342900, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('71d5e35889b7', 1790806825958, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('941861c1932b', 1790813613876, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('4025bc14b2bc', 1790814813553, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('fe17bea9d8d0', 1790857986366, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('f7eacb7c7296', 1790816608531, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('e59b24e307ca', 1790817145371, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('31b60293db79', 1790818395582, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('b48bb28b06fe', 1790836482080, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('20cb88cae370', 1790824144576, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('58159c967492', 1790824975522, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('2c7a2590a8e4', 1790826030766, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('61bc4937c48d', 1790827361025, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('61589596eb90', 1790827948700, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('19ed1df26baa', 1790833906165, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('1924cf443966', 1790834584886, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('5c8a593dffe8', 1790835619143, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('c80ad57c04b5', 1790836063809, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('609f13e2d05f', 1790836747983, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('abf01c8affa0', 1790837502544, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('ea3ba3d97619', 1790843936995, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('e4ceb622e518', 1790845228144, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('920989caa4cd', 1790846345592, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('ae2a1ee2ce6e', 1790848155184, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('93fe2ba8dbce', 1790849381065, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('b44d4e99e939', 1790858155930, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('49415f1dd3a5', 1790854167516, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('338ae805b92c', 1790854988515, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('012fbc5eb421', 1790856033087, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('c4c12ea367c1', 1790857319380, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('ec7d62605b8b', 1790858113366, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('dcbdcf10dc15', 1790864231582, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('92662dede481', 1790858145933, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('7cf2500ae93d', 1790858046366, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('8d85b373ebce', 1790857972366, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('9169082942f7', 1790858014366, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('c050cc20e81c', 1790874247122, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('01b674759df5', 1790858074366, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('ae24bfa3eca4', 1790857899366, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('42ed2756a63a', 1790857893366, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('d67548d57fec', 1790857996366, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('67047c5be367', 1790884318578, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('1a7067dabf05', 1790857972366, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('8874b44ee2db', 1790858056707, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('9324ec4fc950', 1790894285550, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('1d24cd2b20d8', 1790858158366, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('1a4cb10518cb', 1790904544859, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('a26fe18df4f1', 1790858075366, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('77574d4d27d5', 1790858148366, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('93e776f1f2e1', 1790914495677, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('d476514e792e', 1790858042366, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('5fa10b7345ae', 1790857928366, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('d5da5226f632', 1790793504645, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('89982f8d17bd', 1790793534374, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('696ce1a8b9f3', 1790793587214, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('76fb8c9590f9', 1790793611638, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('c3a39d87c434', 1790793654514, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('d0eacf0598bc', 1790793698771, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('238f75d5c9d3', 1790793743912, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('65cb02c6eeac', 1790793804109, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('d9c2edcc1e05', 1790793821181, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('eaaf654db135', 1790793845360, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('04bfd3e1e7ab', 1790802470328, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('d7684b33c50b', 1790802534031, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('0dc7ffa699af', 1790858050366, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('c7b891ee84c6', 1790802653501, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('4a36fe5c172c', 1790858110366, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('2be24673ee8a', 1790820642415, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('43950db2d4a1', 1790802820038, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('7b291c467943', 1790802889982, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('2929ca6a22a0', 1790802907589, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('dc0ab6bc359a', 1790858171139, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('65d39cb457e3', 1790811420489, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('42034d3bdec0', 1790811439977, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('25d85eeb337a', 1790811474109, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('1f667933a1b1', 1790811544568, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('060dc0ec8ea8', 1790811556669, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('a399419f49e0', 1790811619511, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('e26107afc299', 1790811669283, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('ff2c1f2dd1a7', 1790811729608, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('e05196ce298c', 1790858048936, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('9fd369c2ace9', 1790811845499, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('79959e8bb8a2', 1790811899644, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('d49f42438692', 1790820449055, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('35c0cfe061bd', 1790820517395, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('802fa989978d', 1790820588724, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('bc6921d15c1d', 1790820605012, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('5b2066dadf17', 1790820706143, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('53f608500db3', 1790820777931, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('3c8cd419f838', 1790858088117, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('f8385e41df4b', 1790829447496, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('1868308573e3', 1790829537978, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('c0f9101ece8b', 1790829649948, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('ec145ff75241', 1790829682775, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('9334c152fec8', 1790829754566, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('03b23edf2919', 1790829798719, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('9767afddff12', 1790829849217, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('90c6202b8a19', 1790838436893, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('720d92e4c49d', 1790838519661, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('36313844c367', 1790858002366, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('698cdffab9fd', 1790838579305, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('afa7a99213f7', 1790857999366, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('32f0ca8d4159', 1790838663369, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('22c18169d85f', 1790838680548, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('bfa7e2dae92c', 1790838753917, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('5357848effca', 1790838818305, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('f81c230f13f0', 1790847471271, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('9d5bf9ad24ce', 1790847522382, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('80a71dccd2fb', 1790847547693, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('124b38a47ebc', 1790847588447, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('28b7aa1ca481', 1790858178137, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('ccacd5dc2185', 1790847686481, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('7af628ad91ee', 1790858108721, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('89e7abe9363d', 1790856423718, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('ff8aece0e969', 1790856439503, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('2d7cb0a58798', 1790856468518, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('e61a7b81ae3c', 1790858095680, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('15b43f920aa9', 1790856619300, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('4cedcc439b52', 1790856670385, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('a67075e0df85', 1790858024826, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('b07ad6cca58d', 1790858152071, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('ae60e07be4f8', 1790858031627, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('4a3214124af7', 1790858106663, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('a7082f0fa4d8', 1790858147020, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('b6022798fb43', 1790858056366, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('062e741974e0', 1790858085735, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('50d58e025fbd', 1790858046366, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('ff1f17cbeabe', 1790858061529, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('62b2b9bb1e15', 1790858116784, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('a3fd312af0ba', 1790858167843, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('cc1d423c7110', 1790858030366, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('bd905e088a5d', 1790858071241, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('ea67a584af6d', 1790858135760, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('e315a98f9178', 1790858029366, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('1fd9f379ce21', 1790858067109, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('e2af337a6bbf', 1790858166886, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('6440bfbf6661', 1790858085820, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('5ab12ed4a638', 1790858045366, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('60479df9131b', 1790858062267, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('a5a4b2a0d78a', 1790858105067, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('d1c0f8df2dc5', 1790858168014, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('20cf333380e8', 1790858130366, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('ead46db651a2', 1790858168143, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('df18e1fc0ae3', 1790858170972, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('3b8f955d4507', 1790858036366, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('a558474c1fc0', 1790858095947, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('28895e00b615', 1790858151556, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('bd69960aa09f', 1790858139366, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('2bb86c1051ef', 1790858149366, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('fb591d2b0066', 1790858030366, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('6e7eb7e8978a', 1790858104234, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('71079b25eb82', 1790858020366, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('4f33baaf1c87', 1790858116366, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('d1ee859e07d8', 1790858108366, 3, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('d1f557533fbe', 1790858179116, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('0ffc2678086f', 1790858001366, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('6e61d7c39a57', 1790858049432, 5, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('99b8a1b53b5c', 1790858124366, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('b490123f897f', 1790858161038, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('4ac12d5f04c6', 1790858055366, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('0f370ac7b7f0', 1790858104284, 4, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('3638534f0dc5', 1790858177697, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('a6e3bbcfff8c', 1790858026366, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('b754a29d2a9f', 1790858154266, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('a7709a03e0f0', 1790858172174, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('84ee23d4db10', 1790858093366, 2, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('b471ab077771', 1790858153966, 1, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('06d2d75b0b45', 1790858132366, 7, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('c0612c08aa22', 1790858090366, 6, 1790858179366);
INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ('51386ae631bc', 1790858104984, 3, 1790858179366);
