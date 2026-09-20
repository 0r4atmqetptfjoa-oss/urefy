#!/usr/bin/env python3
"""
generate-100-human-community.py
Generates:
1. scripts/seed-100-human-community.sql (Cloudflare D1 SQL)
2. packages/client-ui/src/profile/seed-profiles-data.ts (Client profiles module)

100% Sovereign Nicknames (no real names!), English Reddit-style tech/gaming/hacking discussions,
verified working YouTube video embeds, authentic internet banter, and emoticons.
"""

import json
import time

PERSONAS = [
    # 100 Sovereign Pseudonymous Users (Pure Nicknames, Emojis, Authentic Tech/Gaming/Hacking Culture)
    ("7f8a910c2b44", "ArchChad", "arch_chad", "adventurer", "arch linux daily driver, specialty coffee & 48TB zfs homelab. rtx 4080 super. send mechanical switch recs ⌨️☕", "node // cluj 🇷🇴", "MEMBER", "online", 94, 3840, ["🐧 Arch", "⚡ Homelab"]),
    ("3c91a4e082aa", "void_pointer", "void_pointer", "bottts", "robotics student 🤖 building tiny esp32 drones and crying over rust borrow checker at 3 AM 💀🦀", "subnet // bucharest 🇷🇴", "MEMBER", "online", 91, 2910, ["🤖 Robotics", "🦀 Rust"]),
    ("9f4a120c8b31", "PacketStorm", "packet_storm", "pixel-art", "sysadmin by day, overclocker by night 🛡️ digi 10g fiber evangelist, self-hosted everything. if it's not cat6a don't talk to me lol 🌐⚡", "node // timisoara 🇷🇴", "MODERATOR", "online", 96, 4920, ["🛡️ Mod", "🌐 10Gbps"]),
    ("5b2041e8d902", "GodotTinker", "godot_tinker", "lorelei", "indie gamedev & godot lover 🎮 making pixel roguelikes that nobody will play, playing cs2 when i should be coding 🎯😭", "node // iasi 🇷🇴", "MEMBER", "idle", 88, 1850, ["🎮 Godot", "🎯 CS2"]),
    ("14e92a8819bb", "PixelWitch", "pixel_witch", "notionists", "data analyst & generative artist 📸 obsessed with local llms on mac m3 max and street photography ✨🧠", "subnet // bucharest 🇷🇴", "MEMBER", "online", 93, 3120, ["📸 Photo", "🧠 LocalAI"]),
    ("8a31b402ef19", "DanGaming", "dan_gaming", "avataaars", "pc builder & gaming enthusiast 🛠️ from factorio to monster hunter. switched 4 pc cases this year my wallet is in therapy 💸💀", "node // brasov 🇷🇴", "MEMBER", "online", 89, 2450, ["🛠️ PCBuild", "⚙️ Factorio"]),
    ("62df09a14c33", "FiberWizard", "fiber_wizard", "bottts", "network architect 🔌 mikrotik, bgp & sfp+. 10 gigabit fiber everywhere. zero wifi where ethernet can reach 🚀📡", "node // constanta 🇷🇴", "MEMBER", "online", 92, 3310, ["🔌 MikroTik", "🌐 Network"]),
    ("2d89b14c99a0", "NeonCat", "neon_cat", "lorelei", "ui/ux designer & front-end explorer 🎨 svelte fan, typography nerd, cat mom 🐱✨ dark mode or die 🌙", "node // cluj 🇷🇴", "MEMBER", "idle", 90, 2670, ["🎨 Design", "🐱 Cats"]),
    ("4e198a00b215", "DockerNinja", "docker_ninja", "adventurer", "devops survivor 🐳 k8s in the cloud, proxmox at home. currently trying to automate my espresso machine ☕⚡", "node // sibiu 🇷🇴", "MEMBER", "online", 95, 4100, ["🐳 Docker", "⚡ Proxmox"]),
    ("c0a184e912fd", "SynthDruid", "synth_druid", "pixel-art", "sound engineer & modular synth nerd 🎹 pipewire on linux, 16-bit soundscapes and analog filters 🎛️🎧", "subnet // bucharest 🇷🇴", "MEMBER", "online", 91, 2890, ["🎹 Audio", "🎛️ Synths"]),
    ("7b33a901ff42", "BioHackerX", "bio_hacker_x", "notionists", "biotech researcher 🧬 open science & biopython. weekend hiker in the carpathians 🏔️🐍", "node // cluj 🇷🇴", "MEMBER", "online", 94, 3450, ["🧬 Bio", "🏔️ Hiking"]),
    ("91c24fa0e891", "PiHoarder", "pi_hoarder", "adventurer", "raspberry pi hoarder 🍓 7 pis and 12 esp32s blinking across my living room. send help 💡🤦‍♂️", "node // ploiesti 🇷🇴", "MEMBER", "idle", 87, 1980, ["🍓 RPi", "💡 IoT"]),
    ("a410ef89b231", "NeovimCult", "neovim_cult", "avataaars", "fullstack dev & soulsborne addict 🗡️ neovim only. mouse is exclusively for elden ring boss fights ⌨️🔥", "node // craiova 🇷🇴", "MEMBER", "online", 93, 3720, ["⌨️ Neovim", "🗡️ Souls"]),
    ("6d88f12a04cb", "ZeroDay", "zero_day", "lorelei", "cybersec junior & ctf player 🔒 learning ghidra & reverse engineering. your smart lightbulb is a backdoor 🚩👀", "subnet // bucharest 🇷🇴", "MEMBER", "online", 89, 2190, ["🔒 CyberSec", "🚩 CTF"]),
    ("31f90a44ec12", "BitFiddler", "bit_fiddler", "bottts", "embedded c/c++ dev ⚡ automotive can bus by day, soldering iron burns by night 🏎️🔧", "node // pitesti 🇷🇴", "MEMBER", "online", 92, 3050, ["⚡ Embedded", "🏎️ Auto"]),
    ("88b4012ce9fa", "RetroPixel", "retro_pixel", "pixel-art", "retro handheld restorer 🕹️ game boy color, crt monitors and chiptune music. modern games have no soul ✨📺", "node // arad 🇷🇴", "MEMBER", "idle", 90, 2400, ["🕹️ Retro", "📺 CRT"]),
    ("52e091bfa331", "AntiTracker", "anti_tracker", "notionists", "digital privacy advocate 🛡️ grapheneos user, tracker blocker tester, fighting algorithmic surveillance 📱🙅‍♀️", "node // oradea 🇷🇴", "MEMBER", "online", 94, 3600, ["🛡️ Privacy", "📱 GrapheneOS"]),
    ("19a408ebc220", "GentooCompiler", "gentoo_compiler", "adventurer", "linux kernel lurker 🐧 still compiling gentoo on old thinkpads for fun. bloat is the enemy 💻☕", "subnet // bucharest 🇷🇴", "MEMBER", "online", 96, 4420, ["💻 ThinkPad", "🐧 Gentoo"]),
    ("a0914e21fc88", "SimRigRacer", "sim_rig_racer", "avataaars", "sim racing addict 🏎️ fanatec direct drive, assetto corsa modder, mechanical keyboard builder ⌨️🏁", "node // galati 🇷🇴", "MEMBER", "online", 88, 2040, ["🏎️ SimRacing", "⌨️ MechKeys"]),
    ("44df9012a8bc", "SolarGnome", "solar_gnome", "lorelei", "solarpunk builder 🌱 off-grid micro-hydro & open hardware solar inverters. the future will be green ☀️🔋", "node // brasov 🇷🇴", "MEMBER", "idle", 91, 2780, ["🌱 Solarpunk", "☀️ Solar"]),
    ("bf0194a28cc1", "SqliteEnjoyer", "sqlite_enjoyer", "bottts", "database administrator 🐘 postgresql tuner. index scans over seq scans all day every day 📊⚡", "subnet // bucharest 🇷🇴", "MEMBER", "online", 95, 4310, ["🐘 Postgres", "📊 SQL"]),
    ("22c88f01a9df", "CoffeeOverflow", "coffee_overflow", "notionists", "mobile app developer 📱 flutter & swift. minimalist desk setup lover, cold brew addict ☕✨", "node // cluj 🇷🇴", "MEMBER", "online", 92, 3180, ["📱 Flutter", "☕ Coffee"]),
    ("77e1029ba4c0", "ChiptuneGhoul", "chiptune_ghoul", "pixel-art", "indie game music composer 🎵 bitwig studio on linux. 16-bit soundscapes and fm synthesis 🎧👾", "node // timisoara 🇷🇴", "MEMBER", "idle", 89, 2150, ["🎵 Chiptune", "🎧 Bitwig"]),
    ("59b04a11ee32", "CryptoCypher", "crypto_cypher", "lorelei", "infosec researcher 🔐 signal advocate, e2ee evangelist. keep your private keys in your pocket 🌐🛡️", "node // iasi 🇷🇴", "MEMBER", "online", 93, 3500, ["🔐 E2EE", "🌐 Decentral"]),
    ("83d2019fab66", "VoronExtruder", "voron_extruder", "adventurer", "3d printing nerd 🖨️ voron 2.4 builder, freecad modeler. why buy plastic when you can print it at 300mm/s 📐🚀", "node // suceava 🇷🇴", "MEMBER", "online", 90, 2620, ["🖨️ Voron", "📐 CAD"]),
    ("11f802ea9bc4", "MarkdownMonk", "markdown_monk", "notionists", "technical writer 📝 docs gardener. clean markdown over complex dashboards any day of the week ✨📚", "subnet // bucharest 🇷🇴", "MEMBER", "online", 94, 3890, ["📝 Docs", "✨ Clean"]),
    ("66a0194ebd21", "VrAviator", "vr_aviator", "avataaars", "pcvr enthusiast 🥽 quest 3 + flight sim pilot. 2000 hours in msfs 2024 and still landing sideways ✈️😂", "node // cluj 🇷🇴", "MEMBER", "idle", 88, 1950, ["🥽 VR", "✈️ FlightSim"]),
    ("3a4092bbf102", "CyberRights", "cyber_rights", "lorelei", "digital rights lawyer ⚖️ gdpr watcher, eu chat control fighter, civil liberties advocate 🛡️✊", "subnet // bucharest 🇷🇴", "MODERATOR", "online", 97, 5100, ["⚖️ Law", "🛡️ Rights"]),
    ("99df012aa4c3", "MatrixDrifter", "matrix_drifter", "bottts", "self-hosted matrix admin 💬 xmpp veteran. decentralize or bust. cloud is just someone else's computer 🐧🌐", "node // bacau 🇷🇴", "MEMBER", "online", 91, 2980, ["💬 Matrix", "🐧 Linux"]),
    ("42c90a18eb77", "CozyPixel", "cozy_pixel", "pixel-art", "pixel artist & animator 🎨 aseprite wizard, lover of cozy indie games, matcha tea & lo-fi beats 🍵✨", "node // brasov 🇷🇴", "MEMBER", "online", 93, 3350, ["🎨 Aseprite", "🍵 Tea"]),
    ("8d104fb2a901", "HexDriver", "hex_driver", "adventurer", "fiber optics technician 🔌 home server tinkerer by night. cat6 cable wizard, zero packet loss guaranteed 💻🚀", "node // timisoara 🇷🇴", "MEMBER", "online", 90, 2740, ["🔌 Fiber", "💻 Homelab"]),
    ("15e0921ab4c8", "VulkanWizard", "vulkan_wizard", "lorelei", "graphics programmer in c++ ⚡ exploring vulkan, raytracing and physical simulation shaders 🎮👾", "subnet // bucharest 🇷🇴", "MEMBER", "idle", 92, 3210, ["⚡ Vulkan", "🎮 Graphics"]),
    ("70a40f91b2df", "SovereignPeer", "sovereign_peer", "avataaars", "sovereign computing purist 🔑 local cryptography, zero web3 hype, zero tracking. your device your rules 🚫🛡️", "node // cluj 🇷🇴", "MEMBER", "online", 95, 4200, ["🔑 Sovereign", "🚫 NoCrypto"]),
    ("b2901a4fc883", "RustAcean", "rust_acean", "notionists", "open source contributor 🦀 rustacean. writing tiny cli tools that do one thing and do it exceptionally well 🛠️💻", "node // iasi 🇷🇴", "MEMBER", "online", 94, 3770, ["🦀 Rust", "🛠️ CLI"]),
    ("38df02ba91c0", "FpvFreestyle", "fpv_freestyle", "bottts", "fpv drone pilot 🚁 betaflight tuner, carbon fiber frames, sending 6S packs into tree branches 🔋💀", "node // oradea 🇷🇴", "MEMBER", "online", 89, 2300, ["🚁 FPV", "🔋 Electronics"]),
    ("6f1084ea2b99", "SwitchLubricator", "switch_lubricator", "lorelei", "custom mechanical keyboards ⌨️ lubing switches for 8 hours straight. deskmat collector, cozy aesthetic ✨🌸", "subnet // bucharest 🇷🇴", "MEMBER", "idle", 91, 2890, ["⌨️ Keyboards", "✨ Cozy"]),
    ("a500912fa8cc", "SpeedrunGhoul", "speedrun_ghoul", "pixel-art", "speedrunner 🍓 celeste, hollow knight & sekiro. waiting for silksong since 2019 with clown makeup on 🤡🐞", "node // sibiu 🇷🇴", "MEMBER", "online", 88, 2120, ["🍓 Celeste", "🐞 Silksong"]),
    ("29c40ea18df2", "ZfsGoblin", "zfs_goblin", "notionists", "storage reliability engineer 💾 zfs mirror pools, raidz2 backups, ecc memory believer. backup your data kids! 🔒🛡️", "node // timisoara 🇷🇴", "MEMBER", "online", 96, 4530, ["💾 ZFS", "🔒 TrueNAS"]),
    ("94df0218ab44", "ProtonRider", "proton_rider", "adventurer", "linux gamer & steam deck tinkerer 🎮 proton-ge tester, emudeck archivist. windows on handhelds is a crime 🐧🔋", "node // cluj 🇷🇴", "MEMBER", "online", 92, 3420, ["🎮 SteamDeck", "🐧 Proton"]),
    ("4b109af38c01", "SecGuardian", "sec_guardian", "lorelei", "cybersecurity educator 🛡️ teaching safe online habits, password managers & e2ee to the next generation 🔐✨", "subnet // bucharest 🇷🇴", "MEMBER", "idle", 93, 3190, ["🛡️ Education", "🔐 Privacy"]),
    ("87a01fa29cb5", "ZigbeeMaster", "zigbee_master", "bottts", "home assistant automations master 🏠 zigbee network debugger. if a light can be automated it will be 🐝⚡", "node // brasov 🇷🇴", "MEMBER", "online", 91, 2850, ["🏠 SmartHome", "🐝 Zigbee"]),
    ("1c490a21fd88", "RiscvExplorer", "riscv_explorer", "notionists", "open source silicon researcher 🔬 risc-v enthusiast, compiler explorer, llvm hacker ⚡💻", "node // iasi 🇷🇴", "MEMBER", "online", 95, 4010, ["⚡ RISC-V", "🔬 Compilers"]),
    ("54b09ef12a77", "ArenaVeteran", "arena_veteran", "pixel-art", "arena shooter veteran 🚀 quake live & unreal tournament. 240hz oled believer, sub-millisecond input lag purist ⚡🎯", "subnet // bucharest 🇷🇴", "MEMBER", "online", 89, 2280, ["🚀 Quake", "⚡ 240Hz"]),
    ("da0194f28bc1", "TauriFanatic", "tauri_fanatic", "adventurer", "fullstack typescript dev 🌐 building peer-to-peer web apps with webcrypto & zero server authority 📦🔐", "node // cluj 🇷🇴", "MEMBER", "online", 94, 3950, ["🌐 P2P", "📦 TS"]),
    ("3e901a88fb22", "TinyModelHacker", "tiny_model_hacker", "lorelei", "computational linguistics student 📚 experimenting with tiny 1b-3b models on edge hardware. words matter ✨🧠", "subnet // bucharest 🇷🇴", "MEMBER", "idle", 90, 2610, ["📚 Linguistics", "🧠 SmallLLMs"]),

    # International Sovereign Personas (Global Reddit community, pure nicknames)
    ("b1409ea28c99", "DeepSeekRunner", "deepseek_runner", "lorelei", "machine learning researcher 🔬 local ollama & vllm experiments, coffee enthusiast, open weights evangelist ☕🚀", "datacenter // montreal 🇨🇦", "GUARDIAN", "online", 98, 8740, ["🔬 ML", "☕ Coffee"]),
    ("7c9102ab84df", "ArchonPrime", "archon_prime", "bottts", "distributed systems & privacy engineer 🛡️ building UREfy open protocols. sovereign keys for sovereign humans 🌐✨", "orbit // san francisco 🇺🇸", "GUARDIAN", "online", 99, 9940, ["🛡️ Archon", "🌐 Protocols"]),
    ("a89104fa2211", "VintageByte", "vintage_byte", "notionists", "community moderator & vintage systems hacker 💾 commodore 64 collector, digital civil liberties advocate 🛡️🕹️", "homelab // austin 🇺🇸", "MODERATOR", "online", 96, 5210, ["🛡️ Moderator", "💾 Vintage"]),
    ("c3dc28cb705e", "ZeroKnowledge", "zero_knowledge", "adventurer", "cryptographic protocols & zkp researcher 🔒 zero-knowledge proofs, sovereign identity, post-quantum readiness 📐✨", "mesh // berlin 🇩🇪", "ARCHIVIST", "online", 97, 6800, ["🔒 Crypto", "✨ Early"]),
    ("f40019bc88a2", "MeshWanderer", "mesh_wanderer", "bottts", "embedded systems & p2p mesh radios 📻 lora, meshtastic, zero-cloud offgrid communication ⚡🌲", "peer // bristol 🇬🇧", "MEMBER", "online", 93, 3620, ["📻 LoRa", "⚡ Mesh"]),
    ("9b22a011cd44", "WebGpuArtist", "webgpu_artist", "lorelei", "creative technologist 🎨 webgpu shaders, three.js generative art, open source graphics code ✨🌈", "node // vancouver 🇨🇦", "MEMBER", "online", 94, 4110, ["🎨 WebGPU", "✨ Creative"]),
    ("4d89a01fbb23", "AsmPurist", "asm_purist", "pixel-art", "game engine developer & c99 purist 🕹️ retro 68k assembly, profiling cache misses, low-level optimization 👾💻", "node // krakow 🇵🇱", "MEMBER", "online", 91, 2950, ["🕹️ Gamedev", "👾 ASM"]),
    ("88f019ab4c21", "EbpfWatcher", "ebpf_watcher", "adventurer", "linux kernel hacker & ebpf observability nerd 🐧 running fedora silverblue. immutable desktops are the future 🔍⚡", "node // stockholm 🇸🇪", "MEMBER", "online", 95, 4800, ["🐧 Kernel", "🔍 eBPF"]),
    ("2a9104eb8c33", "SolarpunkRoot", "solarpunk_root", "lorelei", "indie game designer & pixel artist 🌱 crafting cozy solarpunk roguelikes. tea drinker, cat guardian 🐱🎮", "node // oslo 🇳🇴", "MEMBER", "online", 92, 3400, ["🌱 Solarpunk", "🎮 Indie"]),
    ("63c901afb844", "HardwareGlitch", "hardware_glitch", "bottts", "hardware security researcher 🔬 physical tamper resistance, power analysis & glitch attacks. trust nothing 🛡️👀", "lab // munich 🇩🇪", "MEMBER", "idle", 94, 3990, ["🔬 Hardware", "🛡️ Sec"]),
    ("17df8902ab55", "OpenScienceCore", "open_science_core", "notionists", "open science advocate ⚛️ cern alumni, pythonista. reproducible research and open access papers for all 📚🐍", "node // lyon 🇫🇷", "MEMBER", "online", 93, 3510, ["⚛️ Physics", "🐍 Python"]),
    ("5e019ab28c66", "ModularSound", "modular_sound", "adventurer", "audio engineer & eurorack modular builder 🎛️ custom analog dsp filters. pure analog warmth 🎧⚡", "node // vienna 🇦🇹", "MEMBER", "online", 92, 3180, ["🎛️ Eurorack", "🎧 DSP"]),
    ("92c4018fba77", "MiSTer_Arcade", "mister_arcade", "pixel-art", "arcade cabinet restorer & fpga mister lover 🕹️ akihabara scavenger, crt scanlines enthusiast 🇯🇵📺", "arcade // tokyo 🇯🇵", "MEMBER", "online", 96, 5400, ["🕹️ MiSTer", "🇯🇵 Tokyo"]),
    ("35df9012a888", "HydroponicBot", "hydroponic_bot", "lorelei", "botanist & open agriculture researcher 🌿 automated hydroponics with raspberry pi & solar power ☀️🌱", "node // bologna 🇮🇹", "MEMBER", "online", 93, 3680, ["🌿 Botanics", "☀️ Solar"]),
    ("78a014fb9c99", "FreePressNode", "free_press_node", "adventurer", "tech journalist & civil liberties investigator 📰 covering digital surveillance, backdoors and whistleblowers 🔒🛡️", "node // dublin 🇮🇪", "MEMBER", "idle", 95, 4420, ["📰 Press", "🔒 Freedom"]),
    ("21f09ab8c401", "DecentralIdentity", "decentral_identity", "notionists", "open web standards advocate 🌐 w3c contributor, decentralized identifiers (did) and verifiable credentials 🆔✨", "node // lagos 🇳🇬", "MEMBER", "online", 91, 2800, ["🌐 Standards", "🆔 DID"]),
    ("64c8012fab12", "PodmanSailor", "podman_sailor", "bottts", "cloud native developer 🦭 podman enthusiast, rootless containers survivor, linux sysadmin 🇧🇷💻", "node // sao paulo 🇧🇷", "MEMBER", "online", 90, 2650, ["🦭 Podman", "🇧🇷 Brazil"]),
    ("a7df9012bc23", "ScadaWind", "scada_wind", "lorelei", "renewable energy telemetry engineer 💨 scada with python, wind turbine sensors & microgrids ⚡🌊", "grid // aarhus 🇩🇰", "MEMBER", "online", 94, 3820, ["💨 Wind", "⚡ Grid"]),
    ("39b014ea8d34", "RaftConsensus", "raft_consensus", "adventurer", "distributed databases engineer 🐹 raft consensus in go, high throughput key-value stores 📦🚀", "node // dubai 🇦🇪", "MEMBER", "idle", 92, 3290, ["🐹 Golang", "📦 Raft"]),
    ("82c901afcb45", "A11yPaladin", "a11y_paladin", "notionists", "accessibility specialist (a11y) ♿ semantic html evangelist, screen reader testing, high contrast designs 📐✨", "node // gothenburg 🇸🇪", "MEMBER", "online", 95, 4190, ["♿ A11y", "📐 Design"]),
    ("1bf08912ea56", "OpenSilicon", "open_silicon", "bottts", "chip design engineer 🔬 verilog, chisel & open source silicon. risc-v all the things 💻⚡", "lab // bengaluru 🇮🇳", "MEMBER", "online", 93, 3710, ["🔬 Silicon", "💻 RISCV"]),
    ("5ec4018fba67", "OceanAcoustics", "ocean_acoustics", "lorelei", "marine acoustics researcher 🐋 open hydrophones, recording whale vocalizations with biopython 🎙️🌊", "station // kiel 🇩🇪", "MEMBER", "idle", 91, 2900, ["🐋 Ocean", "🎙️ Sound"]),
    ("91df9012cb78", "LowPolyCrafter", "lowpoly_crafter", "pixel-art", "game animator & blender artist 🧊 low poly 3d aesthetics, cozy lighting & shader tricks 🎨🎮", "studio // barcelona 🇪🇸", "MEMBER", "online", 89, 2450, ["🧊 LowPoly", "🎨 Blender"]),
    ("24a014f9ec89", "JellyfinPirate", "jellyfin_pirate", "adventurer", "homelab hoarder (60TB zfs) 🎬 jellyfin streamer, unraid to debian convert, ecc memory only 🐧🍿", "vault // helsinki 🇫🇮", "MEMBER", "online", 94, 4050, ["🎬 Jellyfin", "🐧 Debian"]),
    ("67c8012afb90", "PQCryptographer", "pq_cryptographer", "notionists", "cryptography student 🛡️ lattice-based math, post-quantum algorithms & zero-knowledge rollups 📐🔒", "node // cairo 🇪🇬", "MEMBER", "online", 92, 3340, ["🛡️ PQ-Crypto", "📐 Math"]),
    ("aa0194f2cd01", "FirmwareDumper", "firmware_dumper", "bottts", "reverse engineering researcher 🔍 ghidra script writer, dumping firmware from iot toasters 💻⚡", "node // prague 🇨🇿", "MEMBER", "idle", 90, 2780, ["🔍 Reverse", "💻 Firmware"]),
    ("3db014ea9e12", "DarkModePurist", "darkmode_purist", "lorelei", "ui designer for privacy tools 🌙 dark mode evangelist, clean layouts, zero dark patterns allowed 🎨✨", "node // athens 🇬🇷", "MEMBER", "online", 93, 3560, ["🌙 DarkMode", "🎨 UI"]),
    ("80c901afdf23", "BspwmRicer", "bspwm_ricer", "pixel-art", "linux ricing enthusiast 🍚 bspwm, rofi, spending 6 hours perfecting my neofetch colors 💀🐧", "node // kochi 🇮🇳", "MEMBER", "online", 88, 2210, ["🍚 Ricing", "🐧 BSPWM"]),
    ("13f08912ef34", "AgriTechMesh", "agritech_mesh", "adventurer", "agritech builder 🌱 soil moisture sensors, lora weather stations & organic vineyard monitoring 🌦️🍇", "node // bordeaux 🇫🇷", "MEMBER", "idle", 91, 2870, ["🌱 AgriTech", "🌦️ Weather"]),
    ("56c4018ffa45", "OfflineWhisper", "offline_whisper", "notionists", "podcast audio producer 🎙️ ffmpeg script wizard, local whisper transcription, lo-fi beats lover 📼🎧", "studio // manchester 🇬🇧", "MEMBER", "online", 92, 3140, ["🎙️ Audio", "📼 Lo-Fi"]),
    ("9ad09012ab56", "TokyoDrifter", "tokyo_drifter", "lorelei", "rust backend engineer 🦀 axum, tokio, high-throughput microservices. minimalist code only ⛩️💻", "node // kyoto 🇯🇵", "MEMBER", "online", 95, 4390, ["🦀 Rust", "⛩️ Kyoto"]),
    ("2da014f9bc67", "BrouterCyclist", "brouter_cyclist", "bottts", "cycling telematics hacker 🚲 open source gps loggers, openstreetmap mapper, zero cloud dependencies 🗺️🚴", "peer // utrecht 🇳🇱", "MEMBER", "online", 90, 2690, ["🚲 Cycling", "🗺️ OpenStreetMap"]),
    ("60c8012acd78", "GameBugHunter", "game_bug_hunter", "pixel-art", "game tester & accessibility advocate ♿ subtitles enthusiast, testing indies on steam deck 🎮❤️", "node // warsaw 🇵🇱", "MEMBER", "idle", 89, 2380, ["🎮 Tester", "♿ A11y"]),
    ("a30194f2de89", "SwitchModder", "switch_modder", "adventurer", "mechanical keyboard switch designer ⌨️ custom linear stems, krytox 205g0 lube addict ☕✨", "studio // seattle 🇺🇸", "MEMBER", "online", 93, 3620, ["⌨️ Switches", "☕ Coffee"]),
    ("36b014eaef90", "HamRadioOp", "ham_radio_op", "lorelei", "telecom history researcher 📜 early packet radio networks & amateur ham radio (callsign IW5... ) 📻✨", "node // florence 🇮🇹", "MEMBER", "online", 94, 3810, ["📜 History", "📻 Radio"]),
    ("79c901affa01", "TorrentDHTSeed", "torrent_dht_seed", "bottts", "p2p torrent protocol developer 🌊 bittorrent v2, dht mapping, distributed content addressing 📦🚀", "peer // lille 🇫🇷", "MEMBER", "online", 96, 4920, ["🌊 P2P", "📦 Torrent"]),
    ("1cf08912fa12", "AlphaFoldMapper", "alphafold_mapper", "notionists", "computational biology researcher 🧬 foldseek & alphafold user, biopython scripts for protein folding 🔬✨", "lab // pune 🇮🇳", "MEMBER", "online", 93, 3480, ["🧬 AlphaFold", "🐍 Python"]),
    ("5fc4018fab23", "ELRS_QuadPilot", "elrs_quad_pilot", "pixel-art", "fpv quad racing pilot 🚁 custom carbon fiber builds, elrs transmitter tuner, sending it through gates ⚡🏁", "node // hamburg 🇩🇪", "MEMBER", "idle", 88, 2090, ["🚁 FPV", "⚡ ELRS"]),
    ("92d09012bc34", "PlainTextGuru", "plain_text_guru", "lorelei", "minimalist software evangelist 🗄️ sqlite for everything, plain text markdown, local first forever 📝✨", "node // uppsala 🇸🇪", "MEMBER", "online", 95, 4270, ["🗄️ SQLite", "📝 Notes"]),
    ("25a014f9cd45", "NeoGeoCabinet", "neogeo_cabinet", "adventurer", "crt television collector 📺 rgb scart cables, neo geo mvs arcade cabinet owner. 240p glory 🕹️👾", "vault // bath 🇬🇧", "MEMBER", "online", 91, 2920, ["📺 CRT", "🕹️ NeoGeo"]),
    ("68c8012ade56", "EarthTelemetry", "earth_telemetry", "notionists", "open climate data visualization 🌍 d3.js, satellite data pipelines, environmental monitoring 📊🛰️", "node // recife 🇧🇷", "MEMBER", "online", 92, 3300, ["🌍 Earth", "📊 D3js"]),
    ("ab0194f2ef67", "ArcticSolarLab", "arctic_solar_lab", "bottts", "diy solar homelab builder ☀️ 12v lifepo4 battery bank, running edge nodes off-grid in the arctic 🔋❄️", "arctic // tromso 🇳🇴", "MEMBER", "online", 94, 3880, ["☀️ Offgrid", "🔋 12V"]),
    ("3eb014eafa78", "FontFoundryKid", "font_foundry_kid", "lorelei", "typographer & font designer 🔤 variable web fonts, monospace typography nerd, clean layouts 🎨✨", "studio // taipei 🇹🇼", "MEMBER", "idle", 93, 3520, ["🔤 Fonts", "🎨 Typography"]),
    ("71c901afab89", "Motorola68k", "motorola_68k", "pixel-art", "amiga 500 & c64 demoscene coder 🕹️ motorola 68000 assembly, copper bars and raster interrupts 👾✨", "node // zurich 🇨🇭", "MEMBER", "online", 97, 5600, ["🕹️ Amiga", "👾 68k"]),
    ("14f08912bc90", "MountainTrailGPS", "mountain_trail_gps", "adventurer", "open mapping contributor 🗺️ qgis, mapping public mountain drinking water fountains & trails 🏔️💧", "node // granada 🇪🇸", "MEMBER", "online", 90, 2730, ["🗺️ QGIS", "🏔️ Trekking"]),
    ("57c4018fcd01", "PipewireJockey", "pipewire_jockey", "bottts", "linux audio enthusiast 🎛️ pipewire graph routing, low-latency live jam sessions with jack 🐧🎧", "node // leipzig 🇩🇪", "MEMBER", "online", 91, 3010, ["🎛️ Modular", "🐧 Pipewire"]),
    ("9ad09012de12", "DnsTruthSeeker", "dns_truth_seeker", "notionists", "tech journalist & privacy advocate 📰 investigating ad-tech tracking & dark patterns across big tech ⚖️🛡️", "node // casablanca 🇲🇦", "MEMBER", "idle", 94, 3750, ["📰 TechPress", "⚖️ Ethics"]),
    ("2ea014f9ef23", "SubZeroClocker", "subzero_clocker", "adventurer", "sub-zero overclocking chaser ❄️ direct die cooling on am5, liquid nitrogen runs on weekends ⚡🏆", "lab // belgrade 🇷🇸", "MEMBER", "online", 89, 2410, ["❄️ SubZero", "⚡ AM5"]),
    ("61c8012afa34", "PasskeyPioneer", "passkey_pioneer", "lorelei", "passkeys & webauthn researcher 🔑 fido2 evangelist, kill all passwords with hardware security keys 🛡️✨", "node // geneva 🇨🇭", "MEMBER", "online", 95, 4150, ["🔑 WebAuthn", "🎨 UX"]),
    ("a40194f2ab45", "FreeBSD_Demon", "freebsd_demon", "bottts", "freebsd & zfs storage architect 😈 100gbe home lab, bhyve hypervisors, uptime measured in years 💾⚡", "homelab // copenhagen 🇩🇰", "MEMBER", "online", 96, 5120, ["😈 FreeBSD", "💾 ZFS"]),
    ("37b014eabc56", "RetroMysteryDev", "retro_mystery_dev", "pixel-art", "point-and-click adventure gamedev 🔍 crafting retro mystery games with aseprite and custom engines 🎨🕹️", "node // gdansk 🇵🇱", "MEMBER", "idle", 92, 3260, ["🎨 Pixels", "🔍 Adventure"]),
    ("7ac901afcd67", "GrafanaHawk", "grafana_hawk", "notionists", "observability engineer 📊 prometheus, grafana & open telemetry. if it moves, trace it ⚡📈", "node // amman 🇯🇴", "MEMBER", "online", 91, 2890, ["📊 Grafana", "⚡ Tracing"]),
    ("1df08912de78", "StarkProver", "stark_prover", "adventurer", "zero-knowledge cryptographer 🔒 reading eprint papers for breakfast, implementing stark proofs 📐✨", "node // umea 🇸🇪", "MEMBER", "online", 97, 5840, ["📐 Math", "🔒 ZKP"]),
    ("50c4018fef89", "FujifilmNight", "fujifilm_night", "bottts", "cyberpunk street photographer 📷 fujifilm film recipes, night neon, mechanical watches collector ⌚🏙️", "night // osaka 🇯🇵", "MEMBER", "online", 93, 3600, ["📷 Fuji", "⌚ Mechanical"]),
    ("93d09012fa90", "CanvasBlocker", "canvas_blocker", "lorelei", "anti-tracking researcher 🛡️ auditing canvas fingerprinting scripts, open privacy tools advocate 🍪🙅‍♀️", "node // doha 🇶🇦", "MEMBER", "online", 94, 3920, ["🛡️ Privacy", "🍪 AntiTracker"]),
]

NOW_MS = int(time.time() * 1000)
H_SEC = 3600 * 1000
D_SEC = 86400 * 1000

POSTS = [
    # ─── 1. AI & OPEN WEIGHTS REVOLUTION (VIDEO: Fireship DeepSeek) ─────────────────
    {
        "id": "p-ai-1",
        "channel": "c/privacy-ai",
        "author": "b1409ea28c99", # DeepSeekRunner
        "role": "GUARDIAN",
        "title": "DeepSeek R1 locally running on dual 3090s is absolutely insane. OpenAI is charging $200/mo for what we can run in our basements 🤯🚀",
        "content": "The open-weights AI space just had its Linux moment. DeepSeek-R1 with Multi-Head Latent Attention (MLA) and pure reinforcement learning matched OpenAI o1 reasoning at a training budget under $6M (compared to hundreds of millions). Running the AWQ 4-bit quantized model locally via vLLM (https://github.com/vllm-project/vllm) with a 32k context window is blistering fast. It actually reasons in the <think> tokens, catches its own mistakes, and costs zero dollars per token! Fireship did a hilarious breakdown of how Silicon Valley panicked: https://www.youtube.com/watch?v=xBByvFrqmWU 🤖✨",
        "flair": "AI RESEARCH",
        "votes": 1240,
        "boosts": 310,
        "video": {"src": "https://www.youtube.com/watch?v=xBByvFrqmWU"},
        "offset": 20 * 60 * 1000,
        "comments": [
            ("c-ai-1-1", "14e92a8819bb", "MEMBER", "Running DeepSeek-R1-Distill-Qwen-14B on my Mac M3 Max via Ollama... it's mind-boggling how smart it is 🤯 Seeing the model debate with itself inside <think> tags feels like watching someone have an existential breakthrough in real time lmao 😂🧠", 92, 18 * 60 * 1000, None),
            ("c-ai-1-2", "3c91a4e082aa", "MEMBER", "The best part? It's released under a genuine MIT license! Not that fake 'Community License' corporate BS where you can't use it if you have users. You can take the weights from https://github.com/deepseek-ai/DeepSeek-R1 and nobody can pull the plug 🔒🚀", 74, 15 * 60 * 1000, None),
            ("c-ai-1-3", "7c9102ab84df", "GUARDIAN", "Sovereign, open-weights AI will always outcompete centralized walled gardens in the long run. When weights are public, thousands of independent researchers optimize kernels, quantization, and inference engines overnight 🤝🌐", 86, 10 * 60 * 1000, None),
            ("c-ai-1-4", "bf0194a28cc1", "MEMBER", "Dual RTX 3090s with NVLink are literally the best investment anyone in ML could have made 3 years ago. 48GB VRAM for under $1,400 total is unbeatable for running local 70B quants ☕⚡", 68, 5 * 60 * 1000, None)
        ]
    },

    # ─── 2. GAMING HARDWARE BENCHMARKS (VIDEO: Gamers Nexus 9800X3D) ───────────────
    {
        "id": "p-tech-1",
        "channel": "c/technology",
        "author": "7f8a910c2b44", # ArchChad
        "role": "MEMBER",
        "title": "9800X3D is the undisputed gaming king. Did Intel completely drop the ball with Arrow Lake? 💥👑",
        "content": "Been watching the Hardware Unboxed and Gamers Nexus deep dives all weekend. The 9800X3D is 25-40% ahead of the Core Ultra 9 285K in competitive titles (CS2, Valorant, Assetto Corsa) while pulling nearly HALF the power draw 🤯 Plus AMD putting the 3D V-Cache underneath the compute die solved all thermal transfer bottlenecks. Steve's full benchmark suite tells the whole brutal story: https://www.youtube.com/watch?v=s-lFgbzU3LY. More detailed architecture breakdown on AnandTech/Ars: https://arstechnica.com 💻🔥",
        "flair": "HARDWARE",
        "votes": 980,
        "boosts": 215,
        "video": {"src": "https://www.youtube.com/watch?v=s-lFgbzU3LY"},
        "offset": 45 * 60 * 1000,
        "comments": [
            ("c-tech-1-1", "2ea014f9ef23", "MEMBER", "Got mine on launch day in Belgrade! Running -25 Curve Optimizer on all cores with 6000MHz CL28 DDR5. It doesn't even hit 68C under a basic Noctua NH-D15 air cooler ❄️ Intel's tile architecture inter-die latency penalty completely killed their 1% lows in gaming 💀", 77, 40 * 60 * 1000, None),
            ("c-tech-1-2", "9f4a120c8b31", "MODERATOR", "Locally in Romania it was sold out in 4 minutes lol 😭 Scalpers put them on OLX for €700 instantly. I'm waiting 3 weeks for restocks at MSRP, not giving scalpers a single cent 🙅‍♂️⚡", 63, 35 * 60 * 1000, None),
            ("c-tech-1-3", "8a31b402ef19", "MEMBER", "Sitting here with my 5800X3D wondering if it's worth replacing motherboard + DDR5 ram. At 4K with an RTX 4080 the GPU is at 99% anyway, but those 1% lows in Cyberpunk are tempting ngl 🤤", 41, 30 * 60 * 1000, None),
            ("c-tech-1-4", "1c490a21fd88", "MEMBER", "Inverting the silicon stack so the hot Zen 5 cores sit directly under the integrated heat spreader (IHS) was masterclass thermal engineering. AMD solved a 3-generation heat dissipation headache with one flip 🔬📐", 58, 20 * 60 * 1000, None)
        ]
    },

    # ─── 3. GAMING & GRAPHICS (VIDEO: Capcom Monster Hunter Wilds) ──────────────────
    {
        "id": "p-game-1",
        "channel": "c/gaming",
        "author": "8a31b402ef19", # DanGaming
        "role": "MEMBER",
        "title": "Monster Hunter Wilds PC beta performance deep dive: Can Capcom fix the stutter before launch? 💀🦖",
        "content": "Capcom dropped the official Monster Hunter Wilds reveal trailer and PC benchmark test: https://www.youtube.com/watch?v=zyoBA0aCRNk. On my RTX 4070, without frame generation it dips into the mid 40s during sandstorms 😭 If you're struggling on PC, community members on Reddit found turning Volumetrics and Geometry Streaming to Medium boosts 1% lows by +35%! Check out the patch discussions on Steam: https://store.steampowered.com 🎮✨",
        "flair": "GAMING",
        "votes": 860,
        "boosts": 165,
        "video": {"src": "https://www.youtube.com/watch?v=zyoBA0aCRNk"},
        "offset": 75 * 60 * 1000,
        "comments": [
            ("c-game-1-1", "5b2041e8d902", "MEMBER", "Tested on my 3060 Ti... it's pure pain 💀 CPU usage is sitting at 95% constant, feels like it's compiling shaders in a background infinite loop lmao. If this is the launch build, Steam reviews are going to be overwhelmingly negative on day 1 😭", 68, 70 * 60 * 1000, None),
            ("c-game-1-1-1", "a500912fa8cc", "MEMBER", "Check r/monsterhunter! People found that Capcom literally left debug telemetry symbols in the executable lol 🤦‍♂️ Dropping volumetrics to Medium and shadows to Medium gives +35% fps without losing much visual fidelity! 🚀", 54, 60 * 60 * 1000, "c-game-1-1"),
            ("c-game-1-2", "94df0218ab44", "MEMBER", "On Steam Deck it crashes straight to desktop before even reaching the character creator lmao 💀 Tried Proton GE 9-20 and Proton Experimental, absolutely dead in the water. We need a miracle patch 🧙‍♂️🔋", 39, 50 * 60 * 1000, None),
            ("c-game-1-3", "4d89a01fbb23", "MEMBER", "The root cause is cache thrashing. RE Engine was engineered for linear indoor corridors (RE7, Village). Stretching that topology into an open-world streaming matrix with dynamic bone physics causes severe L3 evictions 🧠💻", 61, 40 * 60 * 1000, None)
        ]
    },

    # ─── 4. GRAND THEFT AUTO VI REACTION (VIDEO: Rockstar GTA VI) ───────────────────
    {
        "id": "p-game-2",
        "channel": "c/gaming",
        "author": "a0914e21fc88", # SimRigRacer
        "role": "MEMBER",
        "title": "GTA VI Trailer 1 hit 200M views. The physics engine and density look generational 🌴🚗💥",
        "content": "Re-watching Rockstar's GTA VI Trailer in 4K: https://www.youtube.com/watch?v=QdBZY2fkU-0. The cloth simulation, beach crowd density, water refraction, and volumetric atmospheric lighting are pushing current consoles to their absolute limit. Anyone else hoping PC release doesn't lag 2 years behind? Discussions on Digital Foundry and Reddit are wild: https://www.reddit.com/r/GTA6/ 🏎️🔥",
        "flair": "GAMING",
        "votes": 1420,
        "boosts": 340,
        "video": {"src": "https://www.youtube.com/watch?v=QdBZY2fkU-0"},
        "offset": 100 * 60 * 1000,
        "comments": [
            ("c-game-2-1", "8a31b402ef19", "MEMBER", "The vehicle deformation and suspension physics in the mud scene alone look lightyears ahead of GTA V. Rockstar's proprietary RAGE engine team are literal wizards 🧙‍♂️🚗", 89, 90 * 60 * 1000, None),
            ("c-game-2-2", "54b09ef12a77", "MEMBER", "Guaranteed it's 30 FPS on base PS5 and Xbox Series X. There is zero chance current console Zen 2 CPUs can push that pedestrian simulation and traffic density at 60 FPS without massive dynamic resolution drops 💀🎮", 72, 80 * 60 * 1000, None),
            ("c-game-2-3", "15e0921ab4c8", "MEMBER", "Look at the lighting in the convenience store robbery scene. That's hardware-accelerated ray traced global illumination. When this lands on PC with RTX 50 series, it's going to melt benchmarks 🔥🖥️", 65, 70 * 60 * 1000, None)
        ]
    },

    # ─── 5. OFFGRID SOLAR HOMELAB (VIDEO: Jeff Geerling Solar Pi) ──────────────────
    {
        "id": "p-solar-1",
        "channel": "c/solarpunk",
        "author": "ab0194f2ef67", # ArcticSolarLab
        "role": "MEMBER",
        "title": "Built a 100% off-grid 12V solar homelab with LiFePO4 batteries. Zero electric bill, 120 days uptime! ☀️🔋",
        "content": "Mounted two 100W monocrystalline panels on my balcony railing, connected to a 100Ah LiFePO4 battery with an MPPT charge controller. Feeding pure 12V DC directly into my mini PC (Odroid H3+) and fiber ONT without using an inefficient AC inverter! Draws only 11 watts at idle and has been running 24/7 for 120 straight days. Jeff Geerling's solar cluster video inspired the whole build: https://www.youtube.com/watch?v=OLRldZjty_s. Detailed schematics on GitHub: https://github.com 🌲☀️✨",
        "flair": "SOLARPUNK",
        "votes": 1110,
        "boosts": 230,
        "video": {"src": "https://www.youtube.com/watch?v=OLRldZjty_s"},
        "offset": 130 * 60 * 1000,
        "comments": [
            ("c-solar-1-1", "44df9012a8bc", "MEMBER", "Bypassing the AC inverter is absolute genius! Eliminating DC-to-AC-to-DC conversion saves 15-20% of stored battery energy that would normally just radiate away as useless heat. What's the minimum operating voltage of the Odroid when battery drops to 20%? 🔋🌱", 61, 120 * 60 * 1000, None),
            ("c-solar-1-1-1", "ab0194f2ef67", "MEMBER", "The Odroid motherboard has an onboard buck-boost regulator that accepts 9V to 15V! So even on a cloudy sub-zero winter day when battery terminal voltage dips to 12.3V, DC regulation is rock solid ❄️⚡", 53, 110 * 60 * 1000, "c-solar-1-1"),
            ("c-solar-1-2", "a7df9012bc23", "MEMBER", "This is real resilience. When regional power grids inevitably suffer blackouts or weather emergencies, your mesh communication node keeps ticking and provides connectivity to neighbors 🤝📻", 47, 100 * 60 * 1000, None)
        ]
    },

    # ─── 6. LATE NIGHT CODING & LOFI VIBES (VIDEO: Lofi Girl) ──────────────────────
    {
        "id": "p-lofi-1",
        "channel": "c/opensource",
        "author": "22c88f01a9df", # CoffeeOverflow
        "role": "MEMBER",
        "title": "2 AM coding session fuel: Neovim, dark roast specialty coffee, and 24/7 lo-fi beats ☕🎧💻",
        "content": "Nothing beats the quiet calm of 2 AM hacking. Rain outside, mechanical keyboard clacking away on lubed Gateron Oil Kings, compiling Rust microservices, and Lofi Girl running in the background: https://www.youtube.com/watch?v=jfKfPfyJRdk. Check out the official stream and chill vibes. What's your late-night coding ritual? ✨🌙",
        "flair": "OPEN SOURCE",
        "votes": 950,
        "boosts": 185,
        "video": {"src": "https://www.youtube.com/watch?v=jfKfPfyJRdk"},
        "offset": 160 * 60 * 1000,
        "comments": [
            ("c-lofi-1-1", "a410ef89b231", "MEMBER", "Literally me right now. Dim amber backlight, iced Americano, writing Lua configs for Neovim at 2:45 AM. It's not a hobby, it's a lifestyle ☕⌨️✨", 58, 150 * 60 * 1000, None),
            ("c-lofi-1-2", "77e1029ba4c0", "MEMBER", "Lofi Girl stream has probably written 40% of all open source software on GitHub by this point lmao 😂 Absolute staple 🎧❤️", 72, 140 * 60 * 1000, None),
            ("c-lofi-1-3", "2d89b14c99a0", "MEMBER", "Add a sleeping cat on the desk next to the keyboard and the aesthetic is 100% complete 🐱🌙", 64, 130 * 60 * 1000, None)
        ]
    },

    # ─── 7. REVERSE ENGINEERING & EXPLOIT DEV (VIDEO: LiveOverflow Buffer Overflow) ──
    {
        "id": "p-hack-1",
        "channel": "c/digitalfreedom",
        "author": "6d88f12a04cb", # ZeroDay
        "role": "MEMBER",
        "title": "LiveOverflow buffer overflow tutorial with GDB is still the best intro to binary exploitation ever made 🛡️💻",
        "content": "Whenever newcomers ask how to get started in reverse engineering and binary exploitation, I always point them to LiveOverflow's classic stack buffer overflow walkthrough: https://www.youtube.com/watch?v=1S0aBV-Waeo. Watching the instruction pointer (EIP/RIP) get overwritten in GDB with 0x41414141 is that classic 'aha!' moment for every hacker. Check out exploit writing resources on https://github.com/Gallopsled/pwntools 🚩🔓",
        "flair": "SECURITY",
        "votes": 890,
        "boosts": 170,
        "video": {"src": "https://www.youtube.com/watch?v=1S0aBV-Waeo"},
        "offset": 190 * 60 * 1000,
        "comments": [
            ("c-hack-1-1", "31f90a44ec12", "MEMBER", "That exact video got me through my university systems architecture exam in 2019! Understanding stack frames, return addresses, and NOP sleds clicked in 10 minutes 🏆👨‍💻", 65, 180 * 60 * 1000, None),
            ("c-hack-1-2", "63c901afb844", "MEMBER", "Modern ASLR, NX/DEP bits, and stack canaries make vanilla stack smashes rare in production binaries, but Return-Oriented Programming (ROP chains) builds directly on these fundamental concepts 🔬🛡️", 78, 170 * 60 * 1000, None),
            ("c-hack-1-3", "70a40f91b2df", "MEMBER", "This is why languages without automatic bounds checking (raw C/C++) are slowly being banned from critical government codebases. Memory safety is the baseline 🚫💻", 59, 160 * 60 * 1000, None)
        ]
    },

    # ─── 8. DOCKER & CONTAINER ARCHITECTURE (VIDEO: Fireship Docker) ────────────────
    {
        "id": "p-tech-2",
        "channel": "c/technology",
        "author": "4e198a00b215", # DockerNinja
        "role": "MEMBER",
        "title": "Docker in 100 Seconds: How cgroups & namespaces changed software deployment forever 🐳⚡",
        "content": "Fireship's 100-second breakdown of Docker containers: https://www.youtube.com/watch?v=Gjnup-PuquQ. Explains chroot, namespaces, cgroups, and layered filesystems in under 2 minutes. Even senior devs forget that containers aren't mini VMs—they're just isolated Linux processes sharing the host kernel! Read the kernel docs: https://www.kernel.org/doc/Documentation/cgroup-v2.txt 🚀💻",
        "flair": "DEVOPS",
        "votes": 760,
        "boosts": 140,
        "video": {"src": "https://www.youtube.com/watch?v=Gjnup-PuquQ"},
        "offset": 220 * 60 * 1000,
        "comments": [
            ("c-tech-2-1", "bf0194a28cc1", "MEMBER", "The amount of junior engineers who think Docker runs a whole virtualized motherboard and BIOS inside is too damn high lmao 😂 Namespaces isolate what you SEE, cgroups control what you USE 🧠", 71, 210 * 60 * 1000, None),
            ("c-tech-2-2", "64c8012fab12", "MEMBER", "Podman rootless containers take this to the next level. No background daemon running as root, pure fork/exec model. If you haven't tried Podman on Linux, give it a spin: https://podman.io 🦭✨", 54, 200 * 60 * 1000, None),
            ("c-tech-2-3", "88f019ab4c21", "MEMBER", "eBPF tools like Cilium and Tetragon hook right into container socket calls. Observability in modern Kubernetes is wild 🔍⚡", 43, 190 * 60 * 1000, None)
        ]
    },

    # ─── 9. RUST SYSTEMS PROGRAMMING (VIDEO: Fireship Rust) ─────────────────────────
    {
        "id": "p-tech-3",
        "channel": "c/opensource",
        "author": "b2901a4fc883", # RustAcean
        "role": "MEMBER",
        "title": "Rust in 100 Seconds: The borrow checker, zero-cost abstractions, and why C++ devs are converting 🦀⚡",
        "content": "Every programmer owes it to themselves to learn why Rust memory safety without a garbage collector matters: https://www.youtube.com/watch?v=5C_HPTJg5ek. No use-after-free, no data races in multithreading, and compile-time ownership guarantees. Read the official Rust Book: https://doc.rust-lang.org/book/ 🦀🔥",
        "flair": "OPEN SOURCE",
        "votes": 1180,
        "boosts": 290,
        "video": {"src": "https://www.youtube.com/watch?v=5C_HPTJg5ek"},
        "offset": 250 * 60 * 1000,
        "comments": [
            ("c-tech-3-1", "3c91a4e082aa", "MEMBER", "Fighting the borrow checker for 4 hours at 2 AM is a rite of passage for every developer. But once it compiles, it literally NEVER crashes in production. The peace of mind is worth the pain 🦀🙏", 88, 240 * 60 * 1000, None),
            ("c-tech-3-2", "da0194f28bc1", "MEMBER", "Combine Rust with WebAssembly (Wasm) and you can run high-performance cryptographic engines directly in the browser at near-native speeds. That's how UREfy does local zero-knowledge proofs! 🔒⚡", 76, 230 * 60 * 1000, None),
            ("c-tech-3-3", "4d89a01fbb23", "MEMBER", "Coming from C99, I hated the compile times initially. But cargo, clippy, and rust-analyzer provide the best developer tooling in existence today 💻✨", 62, 220 * 60 * 1000, None)
        ]
    },

    # ─── 10. NEOVIM PRODUCTIVITY (VIDEO: Fireship Neovim) ───────────────────────────
    {
        "id": "p-tech-4",
        "channel": "c/opensource",
        "author": "a410ef89b231", # NeovimCult
        "role": "MEMBER",
        "title": "Neovim in 100 Seconds: Modal editing, Lua config, and why you will never touch VS Code again ⌨️🚀",
        "content": "Tired of bloated Electron text editors taking 1.5GB of RAM to edit a 50-line YAML file? Watch Fireship's quick guide: https://www.youtube.com/watch?v=km_P_Xj0_5w. With Treesitter syntax parsing, Telescope fuzzy finding, and native LSP, Neovim boots in 24ms. Check out lazy.nvim plugin manager: https://github.com/folke/lazy.nvim ✨☕",
        "flair": "OPEN SOURCE",
        "votes": 1040,
        "boosts": 235,
        "video": {"src": "https://www.youtube.com/watch?v=km_P_Xj0_5w"},
        "offset": 280 * 60 * 1000,
        "comments": [
            ("c-tech-4-1", "7f8a910c2b44", "MEMBER", "Configuring your init.lua is a never-ending quest for perfection. You start with 10 lines, 2 years later you have 4,000 lines of custom keymaps and Harpoon hooks ⌨️🧙‍♂️", 79, 270 * 60 * 1000, None),
            ("c-tech-4-2", "22c88f01a9df", "MEMBER", "Once muscle memory for `ciw`, `dap`, and `f` takes over, typing in normal editors feels like walking through deep mud with lead boots lmao 😂☕", 68, 260 * 60 * 1000, None),
            ("c-tech-4-3", "11f802ea9bc4", "MEMBER", "Writing documentation in Neovim with vim-pencil and markdown-preview is the most therapeutic workflow ever invented ✨📝", 51, 250 * 60 * 1000, None)
        ]
    },

    # ─── 11. LINUX KERNEL HISTORY (VIDEO: Fireship Linux) ───────────────────────────
    {
        "id": "p-tech-11",
        "channel": "c/technology",
        "author": "19a408ebc220", # GentooCompiler
        "role": "MEMBER",
        "title": "Linux in 100 Seconds: Linus Torvalds' kernel that quietly powers 90% of global cloud infrastructure 🐧🌐",
        "content": "From Android phones and Tesla cars to Mars rovers and the world's top 500 supercomputers, it's all running on the Linux kernel: https://www.youtube.com/watch?v=rrB13utjYV4. Linus Torvalds started it as a hobby project in 1991, and today it has over 30 million lines of code. Read the latest kernel changelogs on https://kernelnewbies.org 🐧❤️",
        "flair": "LINUX",
        "votes": 890,
        "boosts": 180,
        "video": {"src": "https://www.youtube.com/watch?v=rrB13utjYV4"},
        "offset": 310 * 60 * 1000,
        "comments": [
            ("c-tech-11-1", "9f4a120c8b31", "MODERATOR", "'Just a hobby, won't be big and professional like gnu' - Linus in August 1991. Aged like the finest wine in computer science history 🍷🐧", 84, 300 * 60 * 1000, None),
            ("c-tech-11-2", "88f019ab4c21", "MEMBER", "The mailing list git-based development model is still a marvel of distributed engineering. 1,000+ patches reviewed and merged per release cycle with zero centralized project manager meetings 🚀💻", 67, 290 * 60 * 1000, None)
        ]
    },

    # ─── 12. PASSWORD SECURITY (VIDEO: Computerphile Password Storage) ──────────────
    {
        "id": "p-hack-2",
        "channel": "c/digitalfreedom",
        "author": "52e091bfa331", # AntiTracker
        "role": "MEMBER",
        "title": "Computerphile: How NOT to Store Passwords! Salt, pepper, and why SHA-256 is dead for auth 🔒🧂",
        "content": "Essential viewing for any developer building user authentication: https://www.youtube.com/watch?v=8ZtInCl5fsw. Dr. Mike Pound explains why hashing passwords with MD5 or fast SHA-256 allows modern GPUs to crack billions of hashes per second. Always use Argon2id, bcrypt, or scrypt with adequate work factors! Read OWASP guidelines: https://cheatsheetseries.owasp.org 🛡️👀",
        "flair": "SECURITY",
        "votes": 990,
        "boosts": 220,
        "video": {"src": "https://www.youtube.com/watch?v=8ZtInCl5fsw"},
        "offset": 340 * 60 * 1000,
        "comments": [
            ("c-hack-2-1", "67c8012afb90", "MEMBER", "Dr. Mike Pound's enthusiasm for cryptography is contagious! The key takeaway is memory-hardness: Argon2id forces the cracker's GPU memory bus to saturate, making ASIC clusters cost-prohibitive 📐🔒", 78, 330 * 60 * 1000, None),
            ("c-hack-2-2", "61c8012afa34", "MEMBER", "Better yet: eliminate passwords entirely with FIDO2 / WebAuthn passkeys! Public key cryptography on hardware security chips means the server never even holds a secret to be stolen in a breach 🔑✨", 85, 320 * 60 * 1000, None),
            ("c-hack-2-3", "4b109af38c01", "MEMBER", "Still seeing companies storing plain MD5 hashes in 2026 is terrifying. Every junior CS curriculum needs this video in week 1 🤦‍♂️📚", 61, 310 * 60 * 1000, None)
        ]
    },

    # ─── 13. SQL INJECTION (VIDEO: Computerphile SQL Injection) ─────────────────────
    {
        "id": "p-hack-3",
        "channel": "c/opensource",
        "author": "bf0194a28cc1", # SqliteEnjoyer
        "role": "MEMBER",
        "title": "SQL Injection Explained by Computerphile: Why parameterized queries are non-negotiable 🐘💉",
        "content": "Classic Dr. Mike Pound breaking down SQL injection attacks with Bobby Tables: https://www.youtube.com/watch?v=_jKylhJtPmI. Concatenating user inputs into SQL strings in 2026 should be an immediate disqualification for writing production code. Use prepared statements or query builders with typed bindings! Read more on https://owasp.org 📊⚡",
        "flair": "DATABASE",
        "votes": 840,
        "boosts": 160,
        "video": {"src": "https://www.youtube.com/watch?v=_jKylhJtPmI"},
        "offset": 370 * 60 * 1000,
        "comments": [
            ("c-hack-3-1", "3c91a4e082aa", "MEMBER", "'SELECT * FROM users WHERE user = ' + username + ';' Little Bobby Tables strikes again! Still top 3 vulnerability on the OWASP Top 10 because legacy code never dies 😂🤦‍♂️", 75, 360 * 60 * 1000, None),
            ("c-hack-3-2", "da0194f28bc1", "MEMBER", "This is why compile-time checked SQL libraries like SQLx in Rust are so great: if your SQL query doesn't match the live database schema at compile time, the build literally fails! 🛡️🦀", 64, 350 * 60 * 1000, None)
        ]
    },

    # ─── 14. ELDEN RING SHADOW OF THE ERDTREE (VIDEO: Bandai Namco) ─────────────────
    {
        "id": "p-game-3",
        "channel": "c/gaming",
        "author": "a410ef89b231", # NeovimCult
        "role": "MEMBER",
        "title": "ELDEN RING Shadow of the Erdtree Gameplay Reveal still gives me goosebumps. Peak FromSoftware 🗡️✨",
        "content": "Re-watching the Erdtree reveal trailer: https://www.youtube.com/watch?v=qLZenOn7WUo. Miyazaki and FromSoftware created a DLC bigger than most AAA games. The Realm of Shadow world design with vertical interconnectivity is a masterclass in level design. What was your toughest boss fight in the expansion? Discussions on https://www.reddit.com/r/Eldenring/ 🗡️🔥",
        "flair": "GAMING",
        "votes": 1350,
        "boosts": 310,
        "video": {"src": "https://www.youtube.com/watch?v=qLZenOn7WUo"},
        "offset": 400 * 60 * 1000,
        "comments": [
            ("c-game-3-1", "8a31b402ef19", "MEMBER", "Promised Consort Radahn phase 2 with the holy light pillar combos gave me actual PTSD. Took me 65 attempts on a pure Strength Colossal Sword build 😭🗡️", 91, 390 * 60 * 1000, None),
            ("c-game-3-2", "a500912fa8cc", "MEMBER", "The Scadutree fragment scaling system was brilliant. Kept veteran players from steamrolling the DLC with overleveled endgame builds and forced exploration of every vertical canyon 🗺️✨", 73, 380 * 60 * 1000, None),
            ("c-game-3-3", "5b2041e8d902", "MEMBER", "FromSoftware continues to prove you don't need microtransactions, battle passes, or live-service FOMO to make a generational masterpiece 👑🎮", 88, 370 * 60 * 1000, None)
        ]
    },

    # ─── 15. CYBERPUNK PHANTOM LIBERTY (VIDEO: CD PROJEKT RED) ─────────────────────
    {
        "id": "p-game-4",
        "channel": "c/gaming",
        "author": "54b09ef12a77", # ArenaVeteran
        "role": "MEMBER",
        "title": "Cyberpunk 2077: Phantom Liberty was the greatest redemption arc in gaming history 🏙️🤖",
        "content": "Watch the official Phantom Liberty trailer: https://www.youtube.com/watch?v=kfXXnp37t98. CDPR completely overhauled the police AI, perk trees, cyberware, and added Dogtown with Idris Elba. Ray Tracing Overdrive with full path tracing on PC shows the true future of rasterization vs ray optics. Digital Foundry technical analysis: https://www.eurogamer.net 🎮✨",
        "flair": "GAMING",
        "votes": 920,
        "boosts": 200,
        "video": {"src": "https://www.youtube.com/watch?v=kfXXnp37t98"},
        "offset": 430 * 60 * 1000,
        "comments": [
            ("c-game-4-1", "8a31b402ef19", "MEMBER", "Dogtown's atmosphere at night with neon lights reflecting off rain puddles in path tracing is peak cyberpunk visual storytelling. CDPR deserves huge respect for refusing to abandon the game 🏙️✨", 76, 420 * 60 * 1000, None),
            ("c-game-4-2", "94df0218ab44", "MEMBER", "Even on Steam Deck with the 2.0 update, locking it to 30fps with FSR gives a surprisingly playable handheld experience! 🔋🎮", 52, 410 * 60 * 1000, None)
        ]
    },

    # ─── 16. APPLE VISION PRO REVISITED (VIDEO: MKBHD) ─────────────────────────────
    {
        "id": "p-tech-8",
        "channel": "c/technology",
        "author": "14e92a8819bb", # PixelWitch
        "role": "MEMBER",
        "title": "MKBHD Apple Vision Pro review revisited 1 year later: Spatial computing or expensive tech demo? 🥽🍎",
        "content": "Marques Brownlee's original in-depth review: https://www.youtube.com/watch?v=dtp6bRe6vq8. The micro-OLED 4K per eye displays and eye tracking are technological marvels, but the 600g weight on your face and $3,500 price tag kept it as an early adopter toy. Will lightweight AR glasses replace smartphones by 2030? Discussions on Hacker News: https://news.ycombinator.com 👓🤔",
        "flair": "TECH DISCUSSION",
        "votes": 810,
        "boosts": 145,
        "video": {"src": "https://www.youtube.com/watch?v=dtp6bRe6vq8"},
        "offset": 460 * 60 * 1000,
        "comments": [
            ("c-tech-8-1", "66a0194ebd21", "MEMBER", "As a VR sim pilot with a Quest 3, the display resolution on the Vision Pro is undisputed king. But strapping a brick to your cheekbones with an external tethered battery pack is a non-starter for multi-hour sessions 🥽✈️", 68, 450 * 60 * 1000, None),
            ("c-tech-8-2", "2d89b14c99a0", "MEMBER", "The eye tracking + pinch navigation UI is magical for 20 minutes, then your arm gets tired. Physical keyboards and mice exist for a reason! ⌨️🖱️", 55, 440 * 60 * 1000, None)
        ]
    },

    # ─── 17. DOCKER DNS DISASTER (Tech Discussion) ─────────────────────────────────
    {
        "id": "p-tech-7",
        "channel": "c/technology",
        "author": "4e198a00b215", # DockerNinja
        "role": "MEMBER",
        "title": "Spent 5 hours debugging why Docker containers couldn't resolve external DNS... it was an invisible trailing space in resolv.conf 💀☕",
        "content": "Story time: At 11 PM yesterday my staging cluster suddenly started throwing intermittent `EAI_AGAIN` errors on all outbound HTTPS calls. Checked CoreDNS, checked firewall iptables rules, restarted systemd-resolved, even contacted cloud network support. At 3:30 AM I ran `cat -A /etc/resolv.conf` and saw an invisible trailing whitespace character after the secondary nameserver IP. The resolver was parsing it as an invalid octet and timing out for 5000ms. I need therapy and 3 espresso shots 🤦‍♂️💀☕",
        "flair": "TECH DISCUSSION",
        "votes": 920,
        "boosts": 180,
        "offset": 490 * 60 * 1000,
        "comments": [
            ("c-tech-7-1", "bf0194a28cc1", "MEMBER", "It is ALWAYS DNS. Rule 1 of sysadmin: It's not the network, it's not the firewall, it's DNS. Rule 2: If you think it's definitely not DNS, reread Rule 1 lmao 😭☕", 98, 480 * 60 * 1000, None),
            ("c-tech-7-2", "19a408ebc220", "MEMBER", "The 3:30 AM `cat -A` moment of realization where you just stare blankly at the terminal monitor for 10 minutes questioning your life choices... we've all been there brother 🤝💀", 75, 470 * 60 * 1000, None),
            ("c-tech-7-3", "9f4a120c8b31", "MODERATOR", "This is why linters should run on every config file in existence. A whitespace character taking down microservices in 2026 is peak computing comedy 😂💻", 61, 460 * 60 * 1000, None)
        ]
    },

    # ─── 18. TAURI V2 MIGRATION (Open Source) ─────────────────────────────────────
    {
        "id": "p-tech-6",
        "channel": "c/opensource",
        "author": "da0194f28bc1", # TauriFanatic
        "role": "MEMBER",
        "title": "We ditched Electron for Tauri v2 and users literally asked if we stripped features because it launches in 12ms lmao 😂🚀",
        "content": "Shipped our first Tauri v2 (https://github.com/tauri-apps/tauri) update for our desktop application yesterday. Installer payload dropped from 145MB down to 14MB. Idle RAM consumption went from 220MB (Chromium + Node process tree) down to 18MB on Windows! Got three emails this morning from users asking: 'Did you rewrite the app in C++? It starts up instantly before my cursor even finishes clicking' 😂 Rust backend with native WebView2/WebKitGTK is the biggest gift to desktop computing in a decade 🦀⚡",
        "flair": "OPEN SOURCE",
        "votes": 980,
        "boosts": 215,
        "offset": 520 * 60 * 1000,
        "comments": [
            ("c-tech-6-1", "a410ef89b231", "MEMBER", "Electron was a historical band-aid that overstayed its welcome by 8 years. Bundling an entire browser engine with 80MB of memory overhead for a simple chat or markdown app was madness. Long live Tauri! 🦀🚀", 88, 510 * 60 * 1000, None),
            ("c-tech-6-2", "b2901a4fc883", "MEMBER", "The cross-platform IPC in Tauri v2 with strongly typed serde serialization makes frontend-to-backend calls so clean. Zero glue code headaches ✨💻", 64, 500 * 60 * 1000, None),
            ("c-tech-6-3", "88f019ab4c21", "MEMBER", "Dealing with WebKitGTK packaging quirks on Linux can test your patience, but once you get flatpak/AppImage configured, the memory savings are worth every second 🐧🔥", 51, 490 * 60 * 1000, None)
        ]
    },

    # ─── 19. AI CODING & TESTING (Tech Discussion) ────────────────────────────────
    {
        "id": "p-ai-5",
        "channel": "c/technology",
        "author": "3c91a4e082aa", # void_pointer
        "role": "MEMBER",
        "title": "Hot take: If you can't write unit tests for your code, AI isn't saving you—it's just speeding up your disaster 🤦‍♂️☕",
        "content": "Spent the entire morning reviewing a pull request that was obviously 100% generated with Claude/ChatGPT. 800 lines of beautifully formatted TypeScript with zero syntax errors, perfectly formatted docstrings, and elegant variable names. Only problem? The business logic had a fundamental race condition that wiped user state on token refresh 💀 AI code assistants are incredible for boilerplate, but if you don't understand the underlying concurrency model or write rigorous test suites, you're not coding 10x faster—you're just creating 10x more technical debt for the 3 AM on-call team ☕🔥",
        "flair": "TECH DISCUSSION",
        "votes": 990,
        "boosts": 240,
        "offset": 550 * 60 * 1000,
        "comments": [
            ("c-ai-5-1", "7f8a910c2b44", "MEMBER", "Preach! 🙌 LLMs produce code that looks convincing to the human eye because they are language models trained on syntax probability, not logic proofs. If you can't write the test first, don't let AI write the implementation 🧘‍♂️💻", 86, 540 * 60 * 1000, None),
            ("c-ai-5-2", "b1409ea28c99", "GUARDIAN", "TDD (Test Driven Development) actually becomes 10x more important in the AI era. You write the rigorous assertions and invariant tests, then feed them to the model to generate the passing code. That workflow actually works ✨🚀", 72, 530 * 60 * 1000, None),
            ("c-ai-5-3", "a410ef89b231", "MEMBER", "Junior devs using Copilot to generate regex patterns without understanding them will forever be my sleep paralysis demon lmao 😂💀", 61, 520 * 60 * 1000, None)
        ]
    },

    # ─── 20. INTEL N100 MINI PC & IMMICH (Self-Hosted) ────────────────────────────
    {
        "id": "p-tech-5",
        "channel": "c/technology",
        "author": "4e198a00b215", # DockerNinja
        "role": "MEMBER",
        "title": "Ditched Google One & iCloud for a $130 Intel N100 mini PC + Immich. Best tech decision I've made in years 🏡📸",
        "content": "Was paying $120/year to Google for 2TB cloud storage. Last month I canceled everything: picked up a Beelink S12 mini PC with an Intel N100 (4 cores, 16GB RAM) for $130 on Amazon, slotted in a 2TB NVMe SSD, and installed Proxmox. Running Immich (https://github.com/immich-app/immich) for photos (local face recognition and CLIP search is 1:1 with Google Photos), Vaultwarden for passwords, and Tailscale for encrypted access from my phone anywhere in the world. The mini PC draws 6 WATTS from the wall! Zero subscriptions, zero data harvesting 🛡️⚡🏡",
        "flair": "SELF-HOSTED",
        "votes": 870,
        "boosts": 182,
        "offset": 580 * 60 * 1000,
        "comments": [
            ("c-tech-5-1", "14e92a8819bb", "MEMBER", "Immich is pure magic! Imported 140,000 photos from Google Takeout and the local machine learning indexed everyone in 6 hours. Searching 'black cat on rug' or 'birthday cake 2019' works instantly without sending a single byte to Google's servers 🐱📸✨", 81, 570 * 60 * 1000, None),
            ("c-tech-5-2", "24a014f9ec89", "MEMBER", "Just make sure you have the 3-2-1 backup rule in place! A single NVMe in a mini PC is a single point of failure. Restic or Borg backups to an external drive + encrypted Backblaze B2 bucket is essential 💾🛡️", 62, 560 * 60 * 1000, None),
            ("c-tech-5-2-1", "4e198a00b215", "MEMBER", "Already set up! Daily 3 AM encrypted restic snapshots to a local USB drive and weekly sync to cheap Wasabi S3 storage. Safe and sound! 🤝🔒", 47, 550 * 60 * 1000, "c-tech-5-2")
        ]
    },

    # ─── 21. 10G HOME FIBER & MIKROTIK (Networking) ───────────────────────────────
    {
        "id": "p-net-1",
        "channel": "c/technology",
        "author": "62df09a14c33", # FiberWizard
        "role": "MEMBER",
        "title": "Upgraded home core network to 10Gbps SFP+ with MikroTik CCR2004. WireGuard throughput is mind-blowing 🚀🔌",
        "content": "Swapped my gigabit switch for a MikroTik CCR2004-16G-2S+ and routed 10G fiber to my main workstation and TrueNAS storage pool. Transferring 80GB raw 4K footage over SMB takes 9 seconds flat at 1.15 GB/s! Wireguard VPN between my laptop and home pushes 2.4 Gbps symmetric with zero packet loss. Benchmark graphs and RouterOS configs: https://forum.mikrotik.com 🌐⚡",
        "flair": "NETWORKING",
        "votes": 890,
        "boosts": 175,
        "offset": 610 * 60 * 1000,
        "comments": [
            ("c-net-1-1", "9f4a120c8b31", "MODERATOR", "MikroTik hardware for the price to performance ratio is unmatched in enterprise networking. Just remember to set firewall fasttrack rules or CPU cores will pin on 10G NAT routing 🔌🔥", 73, 600 * 60 * 1000, None),
            ("c-net-1-2", "8d104fb2a901", "MEMBER", "Did you run single-mode or multi-mode fiber? SFP+ DAC twinax cables for rack runs and LC-LC single-mode for long runs is the golden standard 💡🚀", 59, 590 * 60 * 1000, None)
        ]
    },

    # ─── 22. EU CHAT CONTROL VICTORY (Digital Rights) ─────────────────────────────
    {
        "id": "p-sec-1",
        "channel": "c/digitalfreedom",
        "author": "3a4092bbf102", # CyberRights
        "role": "MODERATOR",
        "title": "EU Chat Control proposal defeated again in European Council! Client-side scanning is dead for now 🛡️🇪🇺",
        "content": "Huge victory for digital civil liberties! The European Council failed to reach a qualified majority for the controversial Chat Control mandate that would have forced WhatsApp, Signal, and email providers to implement client-side scanning backdoors. Signal's president Meredith Whittaker reiterated they would withdraw from Europe rather than break end-to-end encryption. Read the coverage on Ars Technica: https://arstechnica.com and EDRI: https://edri.org 🛡️✊",
        "flair": "DIGITAL RIGHTS",
        "votes": 1490,
        "boosts": 410,
        "offset": 640 * 60 * 1000,
        "comments": [
            ("c-sec-1-1", "59b04a11ee32", "MEMBER", "A massive relief, but we cannot get complacent. Bureaucrats rebrand and reintroduce this legislation under new names every 12 months. E2EE without backdoors is a fundamental human right 🔐🛡️", 94, 630 * 60 * 1000, None),
            ("c-sec-1-2", "70a40f91b2df", "MEMBER", "This is why sovereign protocols like UREfy that operate peer-to-peer with local device encryption are so critical. You can't regulate away math 📐🤝", 81, 620 * 60 * 1000, None),
            ("c-sec-1-3", "78a014fb9c99", "MEMBER", "Journalists and whistleblowers around the world depend on unbroken cryptographic confidentiality. Great reporting by Patrick Breyer and civil society groups 📰✨", 67, 610 * 60 * 1000, None)
        ]
    },

    # ─── 23. ZFS BIT ROT HEALING (Storage) ────────────────────────────────────────
    {
        "id": "p-storage-1",
        "channel": "c/opensource",
        "author": "29c40ea18df2", # ZfsGoblin
        "role": "MEMBER",
        "title": "ZFS saved 18TB of family photos and projects from silent bit rot today. Check your scrub schedules! 💾🛡️",
        "content": "Monthly ZFS scrub finished this morning on my 6x8TB RAIDZ2 pool. Log output: `scan: scrub repaired 24.5K in 08:42:15 with 0 errors`. Two sectors on disk 4 silently flipped bits due to NAND degradation, and ZFS parity checksums detected and repaired the corruption on the fly without a single lost byte! If you're still using hardware RAID or NTFS for long term archival, you're playing Russian roulette with your data. Read OpenZFS docs: https://openzfs.github.io/openzfs-docs/ 💾⚡",
        "flair": "STORAGE",
        "votes": 970,
        "boosts": 210,
        "offset": 670 * 60 * 1000,
        "comments": [
            ("c-sto-1-1", "a40194f2ab45", "MEMBER", "OpenZFS on FreeBSD and Linux is a technological masterpiece. Hardware RAID controllers hiding drive SMART data and silently passing bad blocks to the OS should have been outlawed in 2010 😈💾", 82, 660 * 60 * 1000, None),
            ("c-sto-1-2", "7f8a910c2b44", "MEMBER", "Running `zpool scrub tank` on the 1st of every month automatically via systemd timer. Hearing the drives chirp while verifying SHA-256 block checksums is pure music to my ears 🐧☕", 71, 650 * 60 * 1000, None)
        ]
    },

    # ─── 24. RUST EMBEDDED ESP32 ROVER (Robotics) ─────────────────────────────────
    {
        "id": "p-dev-1",
        "channel": "c/opensource",
        "author": "3c91a4e082aa", # void_pointer
        "role": "MEMBER",
        "title": "Built a tiny autonomous rover using ESP32-S3 and Rust embedded (esp-hal). No C/C++ memory leaks! 🤖🦀",
        "content": "Finished wiring a 4WD rover powered by an ESP32-S3 dual-core Xtensa chip. Instead of Arduino C++, I wrote the entire firmware in `no_std` Rust using `esp-hal` and `embassy` async runtime. It handles ultrasonic distance sensors, differential motor PID loops, and telemetry over Wi-Fi UDP at 60Hz. Zero segfaults, zero null pointers, and binary size is under 280KB. Code repository on GitHub: https://github.com/esp-rs/esp-hal 🤖✨",
        "flair": "ROBOTICS",
        "votes": 860,
        "boosts": 180,
        "offset": 700 * 60 * 1000,
        "comments": [
            ("c-dev-1-1", "31f90a44ec12", "MEMBER", "Writing async embedded Rust with Embassy feels like cheating compared to FreeRTOS C tasks and mutex deadlocks. How are you driving the motor H-bridges? Direct PWM via MCPWM peripheral? 🏎️⚡", 74, 690 * 60 * 1000, None),
            ("c-dev-1-2", "38df02ba91c0", "MEMBER", "Slap an FPV analog camera on that bad boy and send it down the hallway! 🚁🏎️", 55, 680 * 60 * 1000, None)
        ]
    },

    # ─── 25. LINUX 6.13 KERNEL RELEASE (Linux) ────────────────────────────────────
    {
        "id": "p-linux-1",
        "channel": "c/technology",
        "author": "88f019ab4c21", # EbpfWatcher
        "role": "MEMBER",
        "title": "Linux 6.13 kernel released: Huge Bcachefs fixes, AMD P-State improvements, and real-time PREEMPT_RT merge 🐧⚡",
        "content": "Phoronix published the full Linux 6.13 benchmark suite: https://www.phoronix.com. The official merge of PREEMPT_RT brings deterministic sub-millisecond audio and industrial robotics latency to vanilla kernels! Plus AMD Ryzen 9000 Zen 5 CPUs see a 4-8% efficiency bump with updated energy performance preference governors. Track the commits on GitHub: https://github.com/torvalds/linux 🐧🔥",
        "flair": "LINUX",
        "votes": 1080,
        "boosts": 230,
        "offset": 730 * 60 * 1000,
        "comments": [
            ("c-lin-1-1", "57c4018fcd01", "MEMBER", "PREEMPT_RT in mainline kernel is HUGE for Linux audio production. Pipewire buffer sizes can now drop to 32 frames (0.7ms latency) without a single xrun during live synthesizer recording 🎛️🎧", 83, 720 * 60 * 1000, None),
            ("c-lin-1-2", "19a408ebc220", "MEMBER", "Compiling 6.13 right now with `-march=native -O2` on my ThinkPad. Clean build, zero deprecation warnings. Linus and kernel maintainers are relentless 🐧☕", 69, 710 * 60 * 1000, None)
        ]
    },

    # ─── 26. GRAPHENEOS PRIVACY HARDENING (Mobile Privacy) ────────────────────────
    {
        "id": "p-priv-1",
        "channel": "c/digitalfreedom",
        "author": "59b04a11ee32", # CryptoCypher
        "role": "MEMBER",
        "title": "GrapheneOS on Google Pixel 9 is the gold standard for mobile privacy in 2026 📱🛡️",
        "content": "Bought a refurbished Pixel 9 specifically to flash GrapheneOS using their webUSB installer. Sandboxed Google Play Services means apps like Uber and banking work flawlessly in an isolated profile with ZERO system privileges. Hardware memory tagging (MTE) kills buffer overflows at the silicon level, and network/sensor toggles give you total control. If you care about phone security, check out https://grapheneos.org 🛡️✨",
        "flair": "PRIVACY",
        "votes": 1150,
        "boosts": 280,
        "offset": 760 * 60 * 1000,
        "comments": [
            ("c-priv-1-1", "52e091bfa331", "MEMBER", "The per-app Network and Sensors toggles are life changing. Why does a calculator or flashlight need internet access? Blocked instantly at the OS level 🙅‍♀️📱", 89, 750 * 60 * 1000, None),
            ("c-priv-1-2", "9ad09012de12", "MEMBER", "The irony that Google's Tensor chip with Titan M2 security hardware makes the best de-Googled privacy phone on earth will never stop being funny 😂🔒", 77, 740 * 60 * 1000, None)
        ]
    },

    # ─── 27. MICRO-HYDRO POWER GENERATION (Solarpunk) ─────────────────────────────
    {
        "id": "p-solar-2",
        "channel": "c/solarpunk",
        "author": "44df9012a8bc", # SolarGnome
        "role": "MEMBER",
        "title": "Open-source micro-hydro generator powering our mountain cabin: 350W continuous 24/7 from a stream 🌊⚡",
        "content": "Solar is great when the sun shines, but a mountain creek flows day and night! Built a Pelton wheel turbine using 3D printed PETG buckets and a permanent magnet alternator. With 18 meters of head pressure through a 2-inch HDPE pipe, it generates 350 watts continuous—that's 8.4 kWh every single day! Enough to power lights, Starlink, laptops, and a mini fridge indefinitely. Open hardware plans on GitHub: https://github.com 🌲🌊🔋",
        "flair": "SOLARPUNK",
        "votes": 1220,
        "boosts": 270,
        "offset": 790 * 60 * 1000,
        "comments": [
            ("c-sol-2-1", "ab0194f2ef67", "MEMBER", "Continuous baseload power is the holy grail of off-grid living. 350W continuous beats a 3kW solar array in December clouds any day of the week! ☀️❄️⚡", 84, 780 * 60 * 1000, None),
            ("c-sol-2-2", "13f08912ef34", "MEMBER", "Are you using an electronic diversion dump load heater when the battery reaches 100% state of charge? Water heaters make great dump loads! 💧🔥", 66, 770 * 60 * 1000, None)
        ]
    },

    # ─── 28. STEAM DECK & PROTON-GE (Gaming) ──────────────────────────────────────
    {
        "id": "p-game-5",
        "channel": "c/gaming",
        "author": "94df0218ab44", # ProtonRider
        "role": "MEMBER",
        "title": "Steam Deck OLED with Proton-GE 9-25 is running 98% of my 1,200 Steam library games flawlessly 🎮🔋",
        "content": "Remember when PC gaming on Linux was a meme of Wine errors and broken DLLs? Now with Valve's Proton, VKD3D DirectX 12 translation, and FSR upscaling, games like Hades II, Balatro, and Cyberpunk run like dream at 90Hz HDR. Valve proved that open source and Linux can beat Windows at gaming when backed by top-tier engineering. Track game compatibility on https://www.protondb.com 🎮👑",
        "flair": "GAMING",
        "votes": 1040,
        "boosts": 210,
        "offset": 820 * 60 * 1000,
        "comments": [
            ("c-game-5-1", "8a31b402ef19", "MEMBER", "The OLED screen on the Deck is stunning. Pure inky blacks in Dead Cells and Hollow Knight make LCD displays look like gray mush ✨🕹️", 79, 810 * 60 * 1000, None),
            ("c-game-5-2", "a500912fa8cc", "MEMBER", "Playing Balatro on the train for 6 hours straight without battery anxiety... Valve saved handheld gaming 🃏🔋", 68, 800 * 60 * 1000, None)
        ]
    },

    # ─── 29. SMART PADLOCK BLE VULNERABILITY (Security) ───────────────────────────
    {
        "id": "p-hack-4",
        "channel": "c/digitalfreedom",
        "author": "aa0194f2cd01", # FirmwareDumper
        "role": "MEMBER",
        "title": "Decompiling Bluetooth LE smart padlock firmware: Unauthenticated AES key leaked over advertising packets 💀🔒",
        "content": "A friend asked me to test a 'fingerprint & Bluetooth smart padlock' sold by a major hardware brand. Fired up Wireshark with an nRF52840 BLE sniffer dongle. Found that during pairing, the mobile app transmits the lock's static 128-bit unlock token in an unencrypted GATT characteristic with no replay protection! Literally 15 lines of Python using Bleak can pop the lock open from 30 feet away in 200ms. Disclosed to the vendor via BleepingComputer: https://www.bleepingcomputer.com 🤦‍♂️🔓",
        "flair": "SECURITY",
        "votes": 990,
        "boosts": 240,
        "offset": 850 * 60 * 1000,
        "comments": [
            ("c-hack-4-1", "6d88f12a04cb", "MEMBER", "The S in IoT stands for Security as usual lmao! 💀 People locking their €2,000 electric bikes with smart padlocks that can be unlocked with a bash script on a Raspberry Pi 😂🤦‍♂️", 91, 840 * 60 * 1000, None),
            ("c-hack-4-2", "63c901afb844", "MEMBER", "Responsible disclosure report with the PCAP capture is great work. Physical locks should rely on precision machined brass tumblers, not shoddy Bluetooth stacks 🔒🛠️", 73, 830 * 60 * 1000, None)
        ]
    },

    # ─── 30. MESHTASTIC LORA OFFGRID (Mesh Network) ───────────────────────────────
    {
        "id": "p-mesh-1",
        "channel": "c/digitalfreedom",
        "author": "f40019bc88a2", # MeshWanderer
        "role": "MEMBER",
        "title": "Deployed 6 Meshtastic LoRa nodes across our city. 433MHz off-grid messaging with 25km range! 📻🌲",
        "content": "Mounted Heltec V3 LoRa ESP32 nodes on high rooftops with 8dBi fiberglass omni antennas. Using the 433MHz frequency band, text messages hop peer-to-peer across the entire metropolitan area with zero internet, zero cellular towers, and zero subscription fees. Runs for 4 days on a single 18650 cell. In power outages or network blackouts, the mesh stays alive. Join the global mesh: https://meshtastic.org 📻⚡",
        "flair": "MESH NETWORK",
        "votes": 1120,
        "boosts": 260,
        "offset": 880 * 60 * 1000,
        "comments": [
            ("c-mesh-1-1", "36b014eaef90", "MEMBER", "Packet radio spirit reborn! In the 80s we used 1200 baud AX.25 TNCs, now Meshtastic gives end-to-end AES-256 encrypted mesh routing on $20 hardware. Absolutely magnificent 📻✨", 85, 870 * 60 * 1000, None),
            ("c-mesh-1-2", "79c901affa01", "MEMBER", "Off-grid telemetry and emergency communications without telecom surveillance. Adding two solar-powered repeater nodes on the water tower next weekend ☀️📻", 70, 860 * 60 * 1000, None)
        ]
    },

    # ─── 31. RISC-V 64-CORE WORKSTATION (Hardware) ────────────────────────────────
    {
        "id": "p-tech-9",
        "channel": "c/technology",
        "author": "1c490a21fd88", # RiscvExplorer
        "role": "MEMBER",
        "title": "First 64-core RISC-V server boards are shipping to developers. The open silicon revolution is here 🔬💻",
        "content": "Received the Milk-V Pioneer 64-core RISC-V workstation today. Booted Ubuntu 24.04 RISC-V port, compiled the Linux kernel in 8 minutes, and ran LLVM test suites. No proprietary x86 licensing fees, no ARM royalty restrictions, pure open standard ISA. Read the architecture specifications on https://riscv.org and benchmarks on Phoronix: https://www.phoronix.com ⚡🔬",
        "flair": "HARDWARE",
        "votes": 870,
        "boosts": 180,
        "offset": 910 * 60 * 1000,
        "comments": [
            ("c-tech-9-1", "1bf08912ea56", "MEMBER", "Having open silicon with verified RTL is the only way humanity escapes hardware-level backdoors (like Intel ME and AMD PSP). Huge milestone! 🔬🛡️", 81, 900 * 60 * 1000, None),
            ("c-tech-9-2", "71c901afab89", "MEMBER", "Reminds me of the early Amiga and Alpha processor days when instruction set diversity was flourishing. Beautiful piece of hardware 👾💻", 63, 890 * 60 * 1000, None)
        ]
    },

    # ─── 32. JELLYFIN MEDIA SERVER MIGRATION (Self-Hosted) ────────────────────────
    {
        "id": "p-homelab-1",
        "channel": "c/opensource",
        "author": "24a014f9ec89", # JellyfinPirate
        "role": "MEMBER",
        "title": "Migrated 40TB media library from Plex to Jellyfin. Native AV1 transcoding with Intel QuickSync is butter smooth 🎬🍿",
        "content": "Plex forcing social media feeds, tracking telemetry, and paid auth servers was the final straw. Installed Jellyfin on Debian with Intel QuickSync GPU acceleration (Arc A380). It transcodes 4K HDR HEVC to 1080p AV1 in real time using 18 watts of power. Clients for Android TV, iOS, and WebOS are 100% free and open source. Check the project: https://github.com/jellyfin/jellyfin 🎬🐧",
        "flair": "SELF-HOSTED",
        "votes": 1010,
        "boosts": 215,
        "offset": 940 * 60 * 1000,
        "comments": [
            ("c-home-1-1", "99df012aa4c3", "MEMBER", "Plex's central authentication outage that locked users out of their OWN local LAN servers was the day I deleted my account. Jellyfin is true self-hosting 🍿🐧", 88, 930 * 60 * 1000, None),
            ("c-home-1-2", "56c4018ffa45", "MEMBER", "Pair Jellyfin with Jellyseerr for media requests and it rivals any commercial streaming service with zero monthly fees 🎬✨", 69, 920 * 60 * 1000, None)
        ]
    },

    # ─── 33. LOCAL FLUX.1 IMAGE GEN (Creative AI) ─────────────────────────────────
    {
        "id": "p-ai-2",
        "channel": "c/privacy-ai",
        "author": "14e92a8819bb", # PixelWitch
        "role": "MEMBER",
        "title": "Flux.1 Schnell running locally on ComfyUI with RTX 3080: Photorealistic image gen in 1.4 seconds 🎨🧠",
        "content": "Black Forest Labs (the original authors of Stable Diffusion) released Flux.1, and the text adherence is shocking. It handles hands, text rendering, and cinematic lighting better than Midjourney v6 without sending your prompts to a cloud server. Running the Q4 GGUF quant locally in ComfyUI with 10 steps takes less than 2 seconds. Guide and workflow JSON on GitHub: https://github.com/comfyanonymous/ComfyUI 🎨✨",
        "flair": "AI CREATIVE",
        "votes": 940,
        "boosts": 195,
        "offset": 970 * 60 * 1000,
        "comments": [
            ("c-ai-2-1", "9b22a011cd44", "MEMBER", "The rectified flow transformer architecture in Flux is incredible. Rendering legible neon signs and book typography without spelling mistakes is finally solved 🎨✨", 76, 960 * 60 * 1000, None),
            ("c-ai-2-2", "42c90a18eb77", "MEMBER", "Local artists retaining copyright and ownership over their models and generated outputs is everything. No corporate terms of service claiming your art 🛡️🎨", 64, 950 * 60 * 1000, None)
        ]
    },

    # ─── 34. SONY TRINITRON CRT RETRO RESTORATION (Retro Gaming) ──────────────────
    {
        "id": "p-retro-1",
        "channel": "c/gaming",
        "author": "88b4012ce9fa", # RetroPixel
        "role": "MEMBER",
        "title": "Restored a 1998 Sony Trinitron CRT monitor for retro pixel art gaming. Modern LCDs can't touch this motion clarity 📺🕹️",
        "content": "Found a 21-inch Sony Trinitron Multiscan CRT in a university liquidation sale for $40. Hooked up my MiSTer FPGA via RGB SCART. True 240p scanlines, zero input lag, infinite contrast on black levels, and zero sample-and-hold motion blur. Playing Chrono Trigger and Super Metroid looks exactly the way 90s artists intended. Retro gaming preservation discussions on https://www.reddit.com/r/crtgaming/ 📺✨",
        "flair": "RETRO",
        "votes": 1190,
        "boosts": 260,
        "offset": 1000 * 60 * 1000,
        "comments": [
            ("c-ret-1-1", "92c4018fba77", "MEMBER", "MiSTer FPGA + CRT is peak retro nirvana. Cycle-accurate hardware emulation without the latency of software emulators. Scanlines were phosphor magic 🕹️👾", 89, 990 * 60 * 1000, None),
            ("c-ret-1-2", "25a014f9cd45", "MEMBER", "That characteristic degaussing 'THUMP' sound when you power on a Trinitron... instant nostalgia dopamine rush 📺🔊", 74, 980 * 60 * 1000, None)
        ]
    },

    # ─── 35. SOVEREIGN CRYPTOGRAPHIC KEYS (Digital Freedom) ───────────────────────
    {
        "id": "p-sec-2",
        "channel": "c/digitalfreedom",
        "author": "70a40f91b2df", # SovereignPeer
        "role": "MEMBER",
        "title": "Why UREfy sovereign keys beat email/password and OAuth 'Sign in with Google' forever 🔑🛡️",
        "content": "When you sign in with Google or Apple, those corporations can lock you out of your digital life with an automated algorithmic flag. With sovereign Ed25519 cryptographic keypairs, YOU own the root of trust. Your messages are encrypted client-side with post-quantum hybrid KEM, and no central server or moderator can forge your signature. Sovereign computing is not a luxury—it's human dignity in the digital age. Learn more at https://urefy.com 🌐🛡️",
        "flair": "SOVEREIGNTY",
        "votes": 1450,
        "boosts": 380,
        "offset": 1030 * 60 * 1000,
        "comments": [
            ("c-sec-2-1", "c3dc28cb705e", "ARCHIVIST", "Public key cryptography is the only true defense against centralized digital feudalism. If you don't hold the private key, you are just a tenant on someone else's platform 🔒✨", 96, 1020 * 60 * 1000, None),
            ("c-sec-2-2", "7c9102ab84df", "GUARDIAN", "And by combining it with ML-KEM-768 post-quantum key exchange, communications encrypted today cannot be stored and decrypted by quantum computers tomorrow 🛡️🌐", 87, 1010 * 60 * 1000, None),
            ("c-sec-2-3", "21f09ab8c401", "MEMBER", "Self-sovereign identity (SSI) and decentralized identifiers are the natural evolution of the internet. Bravo to the UREfy engineering team 🤝👏", 78, 1000 * 60 * 1000, None)
        ]
    },

    # ─── 36. SPLIT ERGONOMIC MECHANICAL KEYBOARD (Hardware) ───────────────────────
    {
        "id": "p-keyboard-1",
        "channel": "c/opensource",
        "author": "6f1084ea2b99", # SwitchLubricator
        "role": "MEMBER",
        "title": "Built a custom split ergonomic keyboard with ZMK firmware and Bluetooth BLE. Wrist pain vanished ⌨️🌸",
        "content": "Soldered a Corne split keyboard with nice!nano v2 microcontrollers and Kailh Choc low-profile tactile switches. Flashed ZMK open-source firmware with custom layers for Vim navigation and programming symbols. Battery lasts 6 weeks on a tiny 110mAh lipo. If you type for a living 8 hours a day, ergonomic split keyboards are the best investment for your carpal tunnels! Code & keymaps: https://github.com/zmkfirmware/zmk ⌨️✨",
        "flair": "HARDWARE",
        "votes": 880,
        "boosts": 160,
        "offset": 1060 * 60 * 1000,
        "comments": [
            ("c-key-1-1", "a30194f2de89", "MEMBER", "Split column-staggered layout takes 3 days to adjust to, then you can never touch a standard staggered board again without your wrists complaining ⌨️☕", 72, 1050 * 60 * 1000, None),
            ("c-key-1-2", "a410ef89b231", "MEMBER", "Home row mods on ZMK with balanced tap-dance timers are pure wizardry. Having Ctrl, Alt, Shift, and Super under ASDF feels magical 🧙‍♂️✨", 65, 1040 * 60 * 1000, None)
        ]
    }
]

def sql_esc(s):
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

def generate_avatar_url(handle, style):
    return f"https://api.dicebear.com/7.x/{style}/svg?seed={handle}&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827"

def generate_banner_url(idx):
    banners = [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80",
    ]
    return banners[idx % len(banners)]

def main():
    print(f"Generating 100 SOVEREIGN NICKNAMES with {len(POSTS)} high-activity posts & working YouTube embeds...")

    # 1. Generate SQL
    sql_lines = []
    sql_lines.append("-- UREfy Sovereign Community Seed (100 Sovereign Nicknames, YouTube Embeds, Hacking Stories)")
    sql_lines.append("-- 100% Sovereign Pseudonyms / Handles with Emoticons & Real Banter\n")

    # Clean legacy dummy/bot data
    sql_lines.append("DELETE FROM user_profiles WHERE user_id LIKE 'fp_%' OR user_id LIKE 'comm-%';")
    sql_lines.append("DELETE FROM posts WHERE id LIKE 'post-reddit-%' OR id LIKE 'demo-%';")
    sql_lines.append("DELETE FROM comments WHERE id LIKE 'comm-%' OR id LIKE 'c-reddit-%';\n")

    # Seed 100 User Profiles with Sovereign Nicknames
    sql_lines.append("-- === 100 SOVEREIGN NICKNAME PROFILES ===")
    for idx, p in enumerate(PERSONAS):
        fp, name, handle, style, bio, loc, role, status, trust, merit, badges = p
        avatar = generate_avatar_url(handle, style)
        banner = generate_banner_url(idx)
        interests = json.dumps([b.split(" ")[-1] for b in badges])
        sql = f"""INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    {sql_esc(fp)}, {sql_esc(name)}, {sql_esc(handle)}, {sql_esc(bio)},
    {sql_esc(avatar)}, {sql_esc(banner)}, NULL, {sql_esc(interests)},
    {sql_esc(f"https://urefy.com/@{handle}")}, {sql_esc(loc)},
    {NOW_MS - (30 - idx % 20) * D_SEC}, {NOW_MS - (idx % 12) * H_SEC}
);"""
        sql_lines.append(sql)

    sql_lines.append("\n-- === SOVEREIGN CONVERSATIONAL POSTS WITH YOUTUBE EMBEDS ===")
    for post in POSTS:
        created_at = NOW_MS - post["offset"]
        video_json = json.dumps(post["video"]) if "video" in post else None
        p_sql = f"""INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    {sql_esc(post["id"])}, {sql_esc(post["channel"])}, {sql_esc(post["author"])},
    {sql_esc(post["role"])}, {sql_esc(post["title"])}, {sql_esc(post["content"])},
    {sql_esc(post["flair"])}, {post["votes"]}, 0, {len(post["comments"])},
    {post["boosts"]}, {sql_esc(video_json)}, 'published', {created_at}, 0
);"""
        sql_lines.append(p_sql)

        # Threaded Comments
        for cid, auth, arole, text, cvotes, coffset, parent in post["comments"]:
            c_time = NOW_MS - coffset
            parent_val = sql_esc(parent) if parent else "NULL"
            c_sql = f"""INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    {sql_esc(cid)}, {sql_esc(post["id"])}, {parent_val}, {sql_esc(auth)},
    {sql_esc(arole)}, {sql_esc(text)}, {cvotes}, {c_time}
);"""
            sql_lines.append(c_sql)

    sql_lines.append("\n-- === COMMUNITY MEMBERSHIPS & FOLLOWS GRAPH ===")
    community_ids = ["c-gaming", "c-technology", "c-privacy-ai", "c-opensource", "c-solarpunk", "c-digitalfreedom"]
    for idx, p in enumerate(PERSONAS):
        fp = p[0]
        # Join 2-3 communities
        for cid in [community_ids[idx % len(community_ids)], community_ids[(idx + 2) % len(community_ids)]]:
            role = "admin" if idx < 3 else "member"
            sql_lines.append(f"INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ({sql_esc(cid)}, {sql_esc(fp)}, '{role}', {NOW_MS - (25 - idx % 15) * D_SEC});")

        # Follow 2 other peers
        target1 = PERSONAS[(idx + 1) % len(PERSONAS)][0]
        target2 = PERSONAS[(idx + 5) % len(PERSONAS)][0]
        sql_lines.append(f"INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ({sql_esc(fp)}, {sql_esc(target1)}, {NOW_MS - 10 * D_SEC});")
        sql_lines.append(f"INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ({sql_esc(fp)}, {sql_esc(target2)}, {NOW_MS - 8 * D_SEC});")

    sql_file = "scripts/seed-100-human-community.sql"
    with open(sql_file, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines) + "\n")
    print(f"Wrote {len(sql_lines)} lines to {sql_file}")

    # 2. Generate TypeScript client profiles module
    ts_lines = []
    ts_lines.append("/**")
    ts_lines.append(" * @file seed-profiles-data.ts")
    ts_lines.append(" * @package @aetheris/client-ui/profile")
    ts_lines.append(" * @description 100 Authentic Sovereign Pseudonymous Personas (Nicknames Only, Zero Real Names).")
    ts_lines.append(" */\n")
    ts_lines.append("import { UserProfileData } from './types.js';\n")
    ts_lines.append("export const SOVEREIGN_PERSONAS: UserProfileData[] = [")

    for idx, p in enumerate(PERSONAS):
        fp, name, handle, style, bio, loc, role, status, trust, merit, badges = p
        avatar = generate_avatar_url(handle, style)
        banner = generate_banner_url(idx)
        obj = {
            "fingerprint": fp,
            "name": name,
            "handle": handle,
            "avatar": avatar,
            "banner": banner,
            "bio": bio,
            "location": loc,
            "website": f"https://urefy.com/@{handle}",
            "joinedEpoch": "Member",
            "role": role,
            "status": status,
            "isZKVerified": True,
            "followingCount": 15 + (idx * 3) % 80,
            "followersCount": 100 + (idx * 17) % 650,
            "meritScore": merit,
            "trustScore": trust,
            "badges": badges,
        }
        ts_lines.append(f"  {json.dumps(obj, indent=2).replace('\n', '\n  ')},")

    ts_lines.append("];\n")

    ts_file = "packages/client-ui/src/profile/seed-profiles-data.ts"
    with open(ts_file, "w", encoding="utf-8") as f:
        f.write("\n".join(ts_lines) + "\n")
    print(f"Wrote {len(PERSONAS)} sovereign nickname personas to {ts_file}")

if __name__ == "__main__":
    main()
