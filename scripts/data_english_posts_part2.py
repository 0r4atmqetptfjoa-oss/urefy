# scripts/data_english_posts_part2.py
# High-SEO English Developer & Tech Discussions for UREfy (Part 2)
# Date: September 18, 2026

POSTS_PART2 = [
    {
        "id": "p-seo-en-ergonomic-split-keyboards-rsi",
        "channel_id": "relays-general",
        "author_id": "22c88f01a9df", # CoffeeOverflow
        "author_role": "MEMBER",
        "title": "How switching to an ergonomic split keyboard (Glove80 & Corne) and Colemak-DH cured 5 years of developer wrist pain ⌨️🩺",
        "content": """Five years of 10-hour daily coding on standard staggered mechanical keyboards left me with debilitating ulnar nerve compression and carpal tunnel pain. I could barely type for 30 minutes without numbness in my pinky and ring fingers.

Here is what actually solved it permanently:

### 1. The Anatomy of Keyboard Ergonomics
- **Split Design**: Separating the two halves shoulder-width apart eliminates **scapular hunched posture**.
- **Column-Staggered (Ortholinear)**: Our fingers do not naturally travel sideways at angles. Keys arranged in straight vertical columns eliminate lateral finger strain.
- **Tenting (30° - 45°)**: Placing keyboards flat on a desk forces pronation of the forearms (palms facing down). Tenting allows hands to rest in a natural neutral 'handshake' angle.

### 2. My Hardware Progression:
1. **MoErgo Glove80**: Contoured curved keywells. The thumb cluster puts backspace, enter, space, and layer shifts under your strongest digits instead of overworking your weak pinkies.
2. **Custom Wireless Corne (CRKBD)**: 42 keys, low-profile Kailh Choc v1 switches lubed with Krytox 205g0, running ZMK firmware with Bluetooth sync across laptop and desktop.

### 3. Switching to Colemak-DH Layout
Switching from QWERTY to Colemak-DH took 3 weeks of practice on Monkeytype.
- **Result**: Finger travel distance dropped by **62%**.
- 74% of all typing occurs on the home row without reaching.

If you have early symptoms of RSI, do not wait until nerve damage becomes chronic. Split keyboards and home-row mods are life-changing investments.""",
        "flair": "ERGONOMICS & HARDWARE",
        "merit_votes": 510,
        "reply_count": 4,
        "boost_count": 41,
        "created_at": 1789752000000,
        "tags": ["keyboards", "ergonomics", "corne", "glove80", "colemak", "hardware", "rsi"],
        "comments": [
            {
                "id": "c-en-kb-1",
                "parent_id": None,
                "author_id": "91df9012cb78", # NeovimCult
                "author_role": "MEMBER",
                "content": "Home-row mods (A/S/D/F as Shift/Ctrl/Alt/Super on hold) felt awkward for the first 3 days, but once you tune `tapping-term-ms = 180`, your hands never leave the home row.",
                "merit_votes": 75,
                "created_at": 1789752600000
            },
            {
                "id": "c-en-kb-2",
                "parent_id": "c-en-kb-1",
                "author_id": "22c88f01a9df", # CoffeeOverflow
                "author_role": "MEMBER",
                "content": "@NeovimCult Home-row mods + bilateral combinations are pure ergonomics. No more twisting your wrist just to press Ctrl+Shift+P.",
                "merit_votes": 58,
                "created_at": 1789753200000
            },
            {
                "id": "c-en-kb-3",
                "parent_id": None,
                "author_id": "83d2019fab66", # VoronExtruder
                "author_role": "MEMBER",
                "content": "Did you 3D print a high-tenting base for the Corne? Tenting at 35-45 degrees eliminates forearm pronation entirely.",
                "merit_votes": 44,
                "created_at": 1789753800000
            },
            {
                "id": "c-en-kb-4",
                "parent_id": "c-en-kb-3",
                "author_id": "22c88f01a9df", # CoffeeOverflow
                "author_role": "MEMBER",
                "content": "@VoronExtruder Yes! Printed an SLS nylon tenting puck with MagSafe magnetic mounts. The natural handshake posture is night and day.",
                "merit_votes": 61,
                "created_at": 1789754400000
            }
        ]
    },
    {
        "id": "p-seo-en-hardware-wallets-airgapped-open-source",
        "channel_id": "vault-guides",
        "author_id": "1df08912de78", # StarkProver
        "author_role": "MEMBER",
        "title": "Hardware Wallet Security in 2026: Why closed-source secure elements are a risk and why air-gapped QR signing is mandatory 🔐📦",
        "content": """When self-custodying digital assets, the physical device security model is just as important as your seed phrase backup.

Recent supply-chain vulnerabilities in consumer hardware wallets highlighted why trusting closed-source firmware and direct USB connections is an unacceptable attack vector.

### 1. The Threat of Direct USB Connections
When a hardware wallet connects over USB, it exposes an interface to the host OS. A compromised computer can:
- Exploit buffer overflows in the device's USB driver stack.
- Send raw malicious APDU packets.
- Perform side-channel voltage/timing analysis.

### 2. Why Air-Gapped Optical Signing Wins
Devices like the **Keystone 3 Pro** and open-source **SeedSigner**:
- Have **no USB data lines, no Bluetooth, no WiFi**.
- Transactions are transferred via **animated QR codes (UR format)**.
- You visually inspect the recipient address, amount, and fee on the device's independent display before approving.
- Zero data leaves the device except the optical cryptographic signature QR code.

### 3. The 2-of-3 Multisig Gold Standard
Never rely on a single hardware wallet vendor. A 2-of-3 multisig quorum combining:
1. One Trezor Safe 5 (open source firmware, Optiga Trust M secure element)
2. One SeedSigner (stateless, camera-based, DIY Raspberry Pi Zero)
3. One Coldcard or Keystone
Eliminates supply-chain sabotage, physical theft, and software bugs as single points of failure.""",
        "flair": "HARDWARE SECURITY",
        "merit_votes": 640,
        "reply_count": 3,
        "boost_count": 55,
        "created_at": 1789755000000,
        "tags": ["security", "crypto", "hardwarewallet", "trezor", "airgapped", "multisig", "privacy"],
        "comments": [
            {
                "id": "c-en-hw-1",
                "parent_id": None,
                "author_id": "aa0194f2cd01", # ZeroDay
                "author_role": "MEMBER",
                "content": "Air-gapped QR signing ensures the host computer cannot send malicious raw APDU commands or exploit USB stack bugs in the micro-controller.",
                "merit_votes": 89,
                "created_at": 1789755600000
            },
            {
                "id": "c-en-hw-2",
                "parent_id": None,
                "author_id": "3db014ea9e12", # AntiTracker
                "author_role": "MEMBER",
                "content": "Also verify your firmware hashes with reproducible deterministic builds before flashing any device.",
                "merit_votes": 67,
                "created_at": 1789756200000
            },
            {
                "id": "c-en-hw-3",
                "parent_id": "c-en-hw-2",
                "author_id": "1df08912de78", # StarkProver
                "author_role": "MEMBER",
                "content": "@AntiTracker Absolutely. If the vendor does not provide reproducible build scripts with SHA-256 verification, do not trust it with your private keys.",
                "merit_votes": 59,
                "created_at": 1789756800000
            }
        ]
    },
    {
        "id": "p-seo-en-ghostty-vs-wezterm-alacritty",
        "channel_id": "relays-dev",
        "author_id": "91df9012cb78", # NeovimCult
        "author_role": "MEMBER",
        "title": "GPU-Accelerated Terminal Benchmarks 2026: Ghostty vs WezTerm vs Alacritty tested on Linux & macOS 🚀🖥️",
        "content": """Mitchell Hashimoto's terminal emulator **Ghostty** (written in Zig) has shaken up the terminal ecosystem. We ran extensive input latency and memory benchmarks across Ghostty, WezTerm, and Alacritty on both Fedora 41 (Wayland) and macOS Sequoia.

### 1. Typometer Input Latency (144Hz Display):
- **Ghostty**: **2.4 ms** (Near instantaneous frame pacing via Metal / OpenGL)
- **Alacritty**: **3.1 ms**
- **WezTerm**: **6.8 ms**
- **Kitty**: **3.8 ms**

### 2. Memory Usage (50 Active Tmux Panes with Large Scrollback):
- **Ghostty**: **22 MB RSS**
- **Alacritty**: **19 MB RSS**
- **WezTerm**: **142 MB RSS** (Lua runtime overhead)

### 3. Feature Highlights & Ergonomics:
- **Ghostty**: Built-in tabs without needing tmux, native Wayland fractional scaling, custom GLSL shader effects, and zero-config truecolor/ligature support.
- **WezTerm**: Unrivaled configuration power with Lua scripts, but noticeably heavier memory footprint.
- **Alacritty**: The minimalist speed king, but still lacks native tab bars or splits.

Ghostty has become my daily driver on both Linux and Mac. The input responsiveness in Neovim is perceptible immediately.""",
        "flair": "DEVELOPER TOOLS",
        "merit_votes": 580,
        "reply_count": 4,
        "boost_count": 48,
        "created_at": 1789757400000,
        "tags": ["ghostty", "wezterm", "alacritty", "terminal", "benchmark", "linux", "macos", "zig"],
        "comments": [
            {
                "id": "c-en-term-1",
                "parent_id": None,
                "author_id": "29c40e11a8b2", # void_pointer
                "author_role": "MEMBER",
                "content": "Ghostty shader support and font rendering consistency across Wayland and macOS is incredible. Zig memory footprint keeps it at ~20MB RAM.",
                "merit_votes": 73,
                "created_at": 1789758000000
            },
            {
                "id": "c-en-term-2",
                "parent_id": None,
                "author_id": "7f8a910c2b44", # ArchChad
                "author_role": "MEMBER",
                "content": "How is Wayland Fractional Scaling handled in Ghostty? Alacritty used to get blurry text on 150% scaling.",
                "merit_votes": 45,
                "created_at": 1789758600000
            },
            {
                "id": "c-en-term-3",
                "parent_id": "c-en-term-2",
                "author_id": "91df9012cb78", # NeovimCult
                "author_role": "MEMBER",
                "content": "@ArchChad Pixel-perfect on Wayland with fractional scale v1 protocol. Crisp fonts even with ligatures enabled.",
                "merit_votes": 54,
                "created_at": 1789759200000
            },
            {
                "id": "c-en-term-4",
                "parent_id": None,
                "author_id": "22c88f01a9df", # CoffeeOverflow
                "author_role": "MEMBER",
                "content": "Ghostty + Neovim + Tmux on a 144Hz monitor feels instantaneous. Typing latency matters so much for flow state.",
                "merit_votes": 63,
                "created_at": 1789759800000
            }
        ]
    },
    {
        "id": "p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry",
        "channel_id": "vault-guides",
        "author_id": "3db014ea9e12", # AntiTracker
        "author_role": "MEMBER",
        "title": "Pi-hole vs AdGuard Home in 2026: DNS-over-HTTPS, client-specific profiles, and blocking 14,000 smart TV tracking queries per day 🛡️📺",
        "content": """Smart TVs and IoT streaming devices are the most aggressive telemetry surveillance devices in consumer homes.

We connected a new Samsung Tizen TV and LG OLED to an isolated VLAN and logged all outbound DNS traffic for 48 hours.

### 1. What Your Smart TV Sends Behind Your Back
- **Every 4 seconds**: Outbound ping to ACR (Automatic Content Recognition) fingerprinting servers (`samsungcloudsolution.com`, `ad.samsungadhub.com`).
- **HDMI Screenshots**: Periodic audio/video hash samples uploaded to identify what HDMI content or game console you are playing.
- **Total queries**: Over **14,200 telemetry requests in 48 hours**.

### 2. Why AdGuard Home Superseded Pi-hole for Us
- **Native DNS-over-HTTPS / DoT Upstream**: Encrypts your DNS queries before leaving your house without requiring complicated cloudflared sidecar containers.
- **Client-Specific Filtering**: We can block all tracking and disable YouTube ads on the Smart TV VLAN while leaving developer workstations unrestricted.
- **Regex Blocklists**: Allows blocking entire subdomains dynamically with regular expressions.
- **Resource Footprint**: Written in Go, uses only 42MB RAM on an LXC container.

Pair AdGuard Home with an **Unbound recursive DNS resolver**, and your ISP will never see which websites or servers you connect to.""",
        "flair": "PRIVACY & NETWORKING",
        "merit_votes": 610,
        "reply_count": 4,
        "boost_count": 52,
        "created_at": 1789760400000,
        "tags": ["adguard", "pihole", "dns", "privacy", "networking", "homelab", "telemetry"],
        "comments": [
            {
                "id": "c-en-dns-1",
                "parent_id": None,
                "author_id": "62df0912cb88", # PacketStorm
                "author_role": "MEMBER",
                "content": "Smart TVs are basically ad-tech billboards masquerading as monitors. The amount of background traffic Samsung TVs generate is shameful.",
                "merit_votes": 81,
                "created_at": 1789761000000
            },
            {
                "id": "c-en-dns-2",
                "parent_id": "c-en-dns-1",
                "author_id": "3db014ea9e12", # AntiTracker
                "author_role": "MEMBER",
                "content": "@PacketStorm Exactly. In our test, blocking those telemetry endpoints reduced background WiFi traffic by 82% without breaking Netflix or Plex.",
                "merit_votes": 69,
                "created_at": 1789761600000
            },
            {
                "id": "c-en-dns-3",
                "parent_id": None,
                "author_id": "70a40f91b2df", # ZfsGoblin
                "author_role": "MEMBER",
                "content": "Unbound with DNSSEC validation is the best complement. No third-party upstream DNS can log your IP's query history.",
                "merit_votes": 55,
                "created_at": 1789762200000
            },
            {
                "id": "c-en-dns-4",
                "parent_id": None,
                "author_id": "44df9012a8bc", # SolarGnome
                "author_role": "MEMBER",
                "content": "Runs effortlessly on an LXC container consuming less than 60MB RAM. Essential first step for any home network.",
                "merit_votes": 48,
                "created_at": 1789762800000
            }
        ]
    },
    {
        "id": "p-seo-en-sqlite-litestream-production-saas",
        "channel_id": "relays-dev",
        "author_id": "18df01a2eb34", # SqliteEnjoyer
        "author_role": "MEMBER",
        "title": "Why SQLite + Litestream is our default database stack in 2026 (Handling 40M queries/day for $15/mo) 🗄️🔥",
        "content": """For decades, web developers have been indoctrinated to believe that every production application requires a dedicated client-server database like PostgreSQL or MySQL.

For the past 14 months, our flagship SaaS product has run entirely on **SQLite with Litestream continuous replication**.

### 1. The Numbers:
- **Daily Read Queries**: 42,000,000
- **Daily Write Queries**: 1,800,000
- **P99 Read Latency**: **0.018 milliseconds** (Within the same process memory space)
- **Database Server Cost**: **$15/month** (Single Hetzner VPS with NVMe storage)

### 2. How Concurrency Works with WAL Mode:
By setting:
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA cache_size = -64000; -- 64MB memory cache
```
Readers never block writers, and writers never block readers. On modern NVMe SSDs, writes commit in microseconds.

### 3. Continuous Replication with Litestream:
Litestream tails the SQLite write-ahead log (WAL) and streams compressed LZ4 snapshot frames to Cloudflare R2 / AWS S3 in real time.
- **Recovery Point Objective (RPO)**: < 1 second.
- **Restoration**: `litestream restore` recovers a full database from S3 in under 15 seconds.

Before you pay thousands of dollars for managed Aurora or RDS, ask yourself if a single node SQLite setup isn't 10x faster and simpler.""",
        "flair": "DATABASE ARCHITECTURE",
        "merit_votes": 690,
        "reply_count": 4,
        "boost_count": 68,
        "created_at": 1789763400000,
        "tags": ["sqlite", "litestream", "databases", "saas", "architecture", "devops", "performance"],
        "comments": [
            {
                "id": "c-en-sql-1",
                "parent_id": None,
                "author_id": "4e198a00b215", # DockerNinja
                "author_role": "MEMBER",
                "content": "Removing the database network roundtrip changes frontend response times completely. P99 latency dropped from 45ms to 3ms.",
                "merit_votes": 91,
                "created_at": 1789764000000
            },
            {
                "id": "c-en-sql-2",
                "parent_id": "c-en-sql-1",
                "author_id": "18df01a2eb34", # SqliteEnjoyer
                "author_role": "MEMBER",
                "content": "@DockerNinja Network latency between compute and managed database is the hidden killer of modern microservices. With SQLite, the database is in the same process memory space.",
                "merit_votes": 78,
                "created_at": 1789764600000
            },
            {
                "id": "c-en-sql-3",
                "parent_id": None,
                "author_id": "7ac901afcd67", # GrafanaHawk
                "author_role": "MEMBER",
                "content": "How do you handle backups during high-write bursts? Does Litestream keep up with the WAL journal?",
                "merit_votes": 52,
                "created_at": 1789765200000
            },
            {
                "id": "c-en-sql-4",
                "parent_id": "c-en-sql-3",
                "author_id": "18df01a2eb34", # SqliteEnjoyer
                "author_role": "MEMBER",
                "content": "@GrafanaHawk Litestream tails the WAL file at 10-second intervals and uploads incremental LZ4 compressed frames to S3/R2. Recovery point objective (RPO) is less than 1 second.",
                "merit_votes": 64,
                "created_at": 1789765800000
            }
        ]
    },
    {
        "id": "p-seo-en-offgrid-solar-homelab-lifepo4",
        "channel_id": "pulse-global",
        "author_id": "44df9012a8bc", # SolarGnome
        "author_role": "MEMBER",
        "title": "Building an off-grid solar homelab: 400W bifacial panels, 2kWh LiFePO4 battery, and 24/7 silent power for our 38W server rack ☀️🔋",
        "content": """Four months ago, I disconnected my entire homelab and home networking rack from the municipal power grid.

The goal: complete resilience against power outages, zero grid power draw, and silent operation.

### 1. The Power Budget (38W Steady-State):
- **Mini PC Server (Intel N100)**: 12W running 16 LXC containers.
- **Managed 8-port 2.5GbE PoE Switch**: 9W.
- **MikroTik Router & AP**: 7W.
- **DAS Storage Enclosure (2x 8TB HDDs spun down idle)**: 10W.

### 2. The Solar & Battery Hardware:
- **Solar**: 2x 200W Renogy Bifacial Monocrystalline panels mounted on south-facing balcony rails.
- **Charge Controller**: Victron SmartSolar MPPT 100/20 (98% peak electrical efficiency).
- **Battery**: 24V (8S) 100Ah Grade-A LiFePO4 cells with Daly 100A Smart BMS (2,560 Wh nominal capacity).
- **Direct DC-DC Distribution**: We eliminated the AC inverter! Inverters waste 12-18W in standby idle. Instead, high-efficiency DC buck converters step down 24V directly to 12V and 19V with 94% efficiency.

### 3. Autonomy in Practice:
- 2,560 Wh / 38 W = **67 hours of continuous runtime with ZERO sun**.
- Even on heavily overcast rainy days, the bifacial panels generate 40-70W of diffuse light, keeping the battery topped up.

Complete energy sovereignty for computing is completely attainable today.""",
        "flair": "SOLARPUNK & HARDWARE",
        "merit_votes": 630,
        "reply_count": 5,
        "boost_count": 59,
        "created_at": 1789766400000,
        "tags": ["solar", "homelab", "lifepo4", "solarpunk", "victron", "hardware", "offgrid", "greenenergy"],
        "comments": [
            {
                "id": "c-en-sol-1",
                "parent_id": None,
                "author_id": "83d2019fab66", # VoronExtruder
                "author_role": "MEMBER",
                "content": "Eliminating the AC inverter is genius. Most cheap 1000W inverters draw 12-18W in idle just keeping the transformer energized.",
                "merit_votes": 85,
                "created_at": 1789767000000
            },
            {
                "id": "c-en-sol-2",
                "parent_id": "c-en-sol-1",
                "author_id": "44df9012a8bc", # SolarGnome
                "author_role": "MEMBER",
                "content": "@VoronExtruder Exactly! Direct DC-DC buck converters give 94% electrical efficiency. Every Watt saved is battery capacity preserved during overcast winter days.",
                "merit_votes": 72,
                "created_at": 1789767600000
            },
            {
                "id": "c-en-sol-3",
                "parent_id": None,
                "author_id": "5fc4018fab23", # ELRS_QuadPilot
                "author_role": "MEMBER",
                "content": "What LiFePO4 cell compression fixture did you use? Proper compression prevents cell swelling over 4,000 cycles.",
                "merit_votes": 47,
                "created_at": 1789768200000
            },
            {
                "id": "c-en-sol-4",
                "parent_id": "c-en-sol-3",
                "author_id": "44df9012a8bc", # SolarGnome
                "author_role": "MEMBER",
                "content": "@ELRS_QuadPilot Laser-cut 6mm aluminum end plates with spring-loaded M8 threaded rods torqued to 300kgf. Solid as a rock.",
                "merit_votes": 63,
                "created_at": 1789768800000
            },
            {
                "id": "c-en-sol-5",
                "parent_id": None,
                "author_id": "a7df9012bc23", # ScadaWind
                "author_role": "MEMBER",
                "content": "Do you publish your Victron Modbus/MQTT telemetry to Home Assistant? Would love to see the automation scripts for load shedding.",
                "merit_votes": 53,
                "created_at": 1789769400000
            }
        ]
    }
]
