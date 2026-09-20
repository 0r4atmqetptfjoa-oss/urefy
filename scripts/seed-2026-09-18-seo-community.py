#!/usr/bin/env python3
"""
seed-2026-09-18-seo-community.py

Generates and deploys fresh, high-SEO / Google search-intent posts,
multi-level threaded discussions with authentic persona banter,
real reactions (interactions table), and discovery tags.

Date: September 18, 2026
Database: Cloudflare D1 aetheris-db
"""

import json
import time
import os
import subprocess
import re

POSTS_DATA = [
    {
        "id": "p-seo-n100-homelab",
        "channel_id": "vault-guides",
        "author_id": "4e198a00b215", # DockerNinja
        "author_role": "MEMBER",
        "title": "Am trecut la Proxmox pe Mini PC Intel N100: 6W consum la priză, 14 containere LXC și TrueNAS pe ZFS. Ghid complet de setup ⚡🖥️",
        "content": """După 4 ani de rulat un server masiv cu Xeon v4 care îmi umfla factura de curent la 180 lei/lună doar pentru idle, am decis să fac pasul către un mini PC fanless cu **Intel N100 (4 cores / 4 threads, Alder Lake-N)**.

Iată concluziile mele reale după 30 de zile de rulare neîntreruptă:

### 1. Hardware & Costuri
- **Mini PC**: Celeron N100, 16GB DDR5 4800MHz (suportă neoficial și 32GB!), 1TB NVMe PCIe 3.0 x4.
- **Porturi de rețea**: 2x Intel i226-V 2.5GbE (esențial pentru separarea rețelei de management de traficul de storage).
- **Consum măsurat la priză (Sonoff POWR3)**:
  - Idle (cu C-States C10 activate în BIOS): **5.8 Watt**
  - Load mediu (Plex transcoding + download torrents): **11.2 Watt**
  - Full load (compilare Docker container): **18.4 Watt**

### 2. Ce rulează acum pe el (14 LXC + 1 VM):
- **TrueNAS Core** (VM cu passthrough la un DAS extern cu 2x Seagate IronWolf 8TB în mirror ZFS)
- **Pi-hole + Unbound** (LXC Debian minimal, consumă 45MB RAM)
- **Home Assistant OS** (LXC cu passthrough la dongle-ul Zigbee Sonoff P)
- **Jellyfin** cu hardware transcoding QuickSync activat (LXC unprivileged, transcodează 4K HDR HEVC -> 1080p cu 4% CPU)
- **Tailscale Subnet Router** (acces de la distanță la toată casa fără niciun port deschis în router)
- **Uptime Kuma & Vaultwarden**

### 3. Sfat critic pentru Proxmox 8 pe N100:
Dacă folosiți plăcile de rețea Intel i226-V, asigurați-vă că instalați kernel-ul PVE `6.8+` și dezactivați EEE (Energy Efficient Ethernet) în `/etc/network/interfaces`, altfel veți avea deconectări aleatorii de 2 secunde la transferuri mari.

Merită 100% dacă vreți un homelab silențios, rece și prietenos cu factura la energie!""",
        "flair": "HOMELAB & SERVER",
        "merit_votes": 348,
        "reply_count": 4,
        "boost_count": 28,
        "created_at": 1789726800000, # 2026-09-18 10:20:00 UTC
        "tags": ["homelab", "proxmox", "n100", "truenas", "zfs", "selfhosted", "lowpower"],
        "comments": [
            {
                "id": "c-n100-1",
                "author_id": "7f8a910c2b44", # ArchChad
                "author_role": "MEMBER",
                "content": "Super setup! Cum stai cu temperaturile pe NVMe într-o carcasă atât de mică? Eu am testat un Beelink similar și în full write ajungea NVMe-ul la 72°C până i-am lipit un radiator de cupru de 3mm pe el.",
                "merit_votes": 42,
                "created_at": 1789727700000,
                "parent_id": None
            },
            {
                "id": "c-n100-2",
                "author_id": "4e198a00b215", # DockerNinja
                "author_role": "MEMBER",
                "content": "@ArchChad Exact aceeași problemă am avut-o în primele 2 zile! SSD-ul din fabrică era un no-name fierbinte. L-am schimbat cu un Samsung 980 (fără Pro) care stă rece și i-am pus un pad termic Thermalright care face contact direct cu șasiul de aluminiu. Acum stă la 41°C în idle și max 54°C în load prelungit.",
                "merit_votes": 35,
                "created_at": 1789728600000,
                "parent_id": "c-n100-1"
            },
            {
                "id": "c-n100-3",
                "author_id": "29c40ea18df2", # ZfsGoblin
                "author_role": "MEMBER",
                "content": "Confirm faza cu 32GB RAM! Am pus un modul Crucial DDR5 4800MHz 32GB single-rank și l-a recunoscut instant. Pe ZFS am setat `zfs_arc_max=12884901888` (12GB) și caching-ul e impecabil, ARC hit rate de 94%. N100 e cel mai bun silicon de homelab buget din ultimii 5 ani.",
                "merit_votes": 68,
                "created_at": 1789729800000,
                "parent_id": None
            },
            {
                "id": "c-n100-4",
                "author_id": "62df09a14c33", # FiberWizard
                "author_role": "MEMBER",
                "content": "Foarte bun pontul cu dezactivarea EEE la i226-V! Am pierdut o noapte întreagă anul trecut crezând că am mufat prost un cablu Cat6a pe un switch MikroTik. Era fix negocierea de power saving din driverul igc.",
                "merit_votes": 29,
                "created_at": 1789731000000,
                "parent_id": None
            }
        ]
    },
    {
        "id": "p-seo-notion-alternatives",
        "channel_id": "relays-general",
        "author_id": "11f802ea9bc4", # MarkdownMonk
        "author_role": "MEMBER",
        "title": "După 3 ani de Notion, am migrat 1.200 de notițe în AppFlowy + Obsidian cu sync P2P criptat. De ce centralizarea cloud nu mai are sens 📚🔒",
        "content": """În 2023 credeam că Notion e paradisul productivității. În 2026 am realizat 3 lucruri dureroase:
1. **Latența**: Deschiderea unei baze de date pe mobil dura între 3 și 6 secunde cu ecran de loading alb.
2. **Proprietatea datelor**: Formatul lor intern este un JSON proprietar masiv. Dacă Notion își schimbă Termenii sau dă faliment, reconstrucția relațiilor e un coșmar.
3. **Confidențialitatea**: Notițele tale personale, ideile de business și jurnalele sunt stocate în plaintext pe serverele altcuiva.

### Ce am ales în schimb:
- **Obsidian pentru knowledge base personal**: Fișiere pure `.md` stocate local pe disc. Căutare instantanee (0ms) prin zeci de mii de fișiere datorită indexării locale.
- **AppFlowy (Self-hosted pe serverul propriu)** pentru tabele kanban și baze de date relaționale stil Notion, dar scrise în Rust + Flutter.
- **Sincronizare P2P**: Zero cloud centralizat. Folosesc protocolul nativ P2P din UREfy + Syncthing cu criptare la capete (E2EE) între desktop, laptop și telefon.

Când nu depinzi de o conexiune activă la internet ca să-ți notezi un gând, viteza mentală se schimbă complet. Cine a mai făcut tranziția spre local-first software?""",
        "flair": "PRIVACY & PRODUCTIVITY",
        "merit_votes": 412,
        "reply_count": 5,
        "boost_count": 34,
        "created_at": 1789730400000, # 2026-09-18 11:20:00 UTC
        "tags": ["notion", "obsidian", "appflowy", "privacy", "localfirst", "markdown", "p2p"],
        "comments": [
            {
                "id": "c-notion-1",
                "author_id": "14e92a8819bb", # PixelWitch
                "author_role": "MEMBER",
                "content": "Obsidian cu plugin-ul Dataview și Canvas a înlocuit complet Notion la mine. Am 4.000 de articole salvate și zbor prin ele cu fuzzy finder. Plus că graficul de conexiuni îți arată asocieri la care nu te-ai fi gândit niciodată.",
                "merit_votes": 51,
                "created_at": 1789731600000,
                "parent_id": None
            },
            {
                "id": "c-notion-2",
                "author_id": "3db014ea9e12", # DarkModePurist
                "author_role": "MEMBER",
                "content": "Cel mai mare avantaj la Obsidian e că dacă dispare aplicația mâine, ai un folder cu fișiere `.txt` / `.md` pe care le poți deschide cu orice text editor din lume. Asta înseamnă software suveran și durabil.",
                "merit_votes": 47,
                "created_at": 1789732800000,
                "parent_id": None
            },
            {
                "id": "c-notion-3",
                "author_id": "52e091bfa331", # AntiTracker
                "author_role": "MEMBER",
                "content": "Ai observat și cât consuma aplicația de desktop de la Notion? 700MB de RAM pentru un wrapper Electron de web. Obsidian consumă sub 150MB, iar un editor nativ de markdown sub 20MB. Nu mai vorbesc de miile de request-uri de telemetrie blocate de Pi-hole.",
                "merit_votes": 38,
                "created_at": 1789734000000,
                "parent_id": None
            },
            {
                "id": "c-notion-4",
                "author_id": "2d89b14c99a0", # NeonCat
                "author_role": "MEMBER",
                "content": "Cum ai rezolvat cu nested tables la export din Notion? Mie mi le-a exportat ca csv-uri separate într-un zip și a trebuit să scriu un script în Python să re-leg linkurile interne.",
                "merit_votes": 22,
                "created_at": 1789735200000,
                "parent_id": "c-notion-1"
            },
            {
                "id": "c-notion-5",
                "author_id": "11f802ea9bc4", # MarkdownMonk
                "author_role": "MEMBER",
                "content": "@NeonCat Am folosit tool-ul open-source `notion-to-obsidian` pe GitHub. Îți păstrează ierarhia de foldere, convertește tabelele în markdown tables curate și transformă `[[page mentions]]` în wikilinks valide automat!",
                "merit_votes": 61,
                "created_at": 1789736400000,
                "parent_id": "c-notion-4"
            }
        ]
    },
    {
        "id": "p-seo-gpu-benchmark-2026",
        "channel_id": "relays-general",
        "author_id": "8a31b402ef19", # DanGaming
        "author_role": "MEMBER",
        "title": "Ce placă video chiar merită cumpărată în 2026? RTX 4070 Super vs RX 7800 XT vs piața second-hand după 1 an de teste reale 🎮🔥",
        "content": """Primesc săptămânal întrebarea: *„Am un buget de 2.500 - 3.500 lei, ce placă video să iau pentru 1440p gaming și eventual niște AI local?”*

Am testat ambele tabere timp de 12 luni în condiții reale de gaming și lucru. Iată concluziile fără sponsorizări:

### 1. RTX 4070 Super (12GB VRAM)
- **Plusuri**: DLSS 3.7 Transformer este la ani lumină distanță de orice alt upscaler. În jocuri grele cu Path Tracing (Cyberpunk 2077, Alan Wake 2, Black Myth Wukong), NVIDIA domină clar. Consum excelent (max 220W). Suport nativ impecabil pentru CUDA / PyTorch / Ollama.
- **Minusuri**: Cei 12GB VRAM încep să fie la limită la texturi Ultra 1440p în jocurile din 2026. În Monster Hunter Wilds, alocarea de memorie video trece lejer de 11.5GB.

### 2. AMD Radeon RX 7800 XT (16GB VRAM)
- **Plusuri**: 16GB VRAM oferă liniște sufletească pentru următorii 4 ani. În raster pur (fără Ray Tracing), este adesea cu 5-10% mai rapidă decât 4070 Super și costă cu ~400-500 lei mai puțin. Drivere open-source pe Linux (Mesa) out of the box fără bătăi de cap cu proprietăți DKMS.
- **Minusuri**: FSR 3.1 are ghosting vizibil în mișcare rapidă comparat cu DLSS. Consumă mai mult la priză (~260W).

### 3. Alternativa Second-Hand: RTX 3080 10GB / 3090 24GB
Dacă găsiți un **RTX 3090 la 3.000 - 3.200 lei**, pentru oricine vrea să ruleze LLM-uri mari (70B quantizat sau 32B FP16) local, este **cea mai bună investiție posibilă**. Nimic în clasa nouă sub 6.000 lei nu vă oferă 24GB VRAM!

Voi ce ați alege azi pentru un build curat de 1440p?""",
        "flair": "HARDWARE BENCHMARK",
        "merit_votes": 520,
        "reply_count": 5,
        "boost_count": 45,
        "created_at": 1789734000000, # 2026-09-18 12:20:00 UTC
        "tags": ["gpu", "rtx4070", "rx7800xt", "gaming", "benchmark", "hardware", "rtx3090"],
        "comments": [
            {
                "id": "c-gpu-1",
                "author_id": "b1409ea28c99", # DeepSeekRunner
                "author_role": "GUARDIAN",
                "content": "Ca om care rulează zilnic modele locale: dacă ai chiar și 1% intenție să folosești LLM-uri sau Stable Diffusion, 12GB VRAM este o fundătură. Cu 24GB pe 3090 poți rula Qwen 2.5 Coder 32B Q4 complet în VRAM la 45 tokens/secundă. Pe 12GB ești limitat la modele de 7B sau 14B foarte comprimate.",
                "merit_votes": 84,
                "created_at": 1789735200000,
                "parent_id": None
            },
            {
                "id": "c-gpu-2",
                "author_id": "7f8a910c2b44", # ArchChad
                "author_role": "MEMBER",
                "content": "Pe Linux, experiența cu AMD (Mesa / RADV) e ca o gură de aer proaspăt. Zero screen tearing pe Wayland, suspend/resume funcționează perfect pe kernel 6.10. La NVIDIA încă mai prinzi mici artefacte când ieși din standby pe anumite monitoare 240Hz.",
                "merit_votes": 49,
                "created_at": 1789736400000,
                "parent_id": None
            },
            {
                "id": "c-gpu-3",
                "author_id": "54b09ef12a77", # ArenaVeteran
                "author_role": "MEMBER",
                "content": "Pentru shooter-e competitive (CS2, Valorant, Quake) unde joci la 240Hz sau 360Hz, NVIDIA Reflex este încă imbatabil. Latency-ul total de sistem scade cu vreo 3-4ms comparat cu Anti-Lag de la Radeon. Pentru esports pur, 4070 Super e alegerea firească.",
                "merit_votes": 36,
                "created_at": 1789737600000,
                "parent_id": None
            },
            {
                "id": "c-gpu-4",
                "author_id": "15e0921ab4c8", # VulkanWizard
                "author_role": "MEMBER",
                "content": "Oricine își ia RTX 3090 second-hand: **schimbați obligatoriu thermal pad-urile pe VRAM-ul de pe spatele plăcii**. GDDR6X pe spatele PCB-ului atinge 105°C în 10 minute de stress test fără un backplate ventilat activ.",
                "merit_votes": 72,
                "created_at": 1789738800000,
                "parent_id": "c-gpu-1"
            },
            {
                "id": "c-gpu-5",
                "author_id": "8a31b402ef19", # DanGaming
                "author_role": "MEMBER",
                "content": "@VulkanWizard Aur curat sfatul ăsta! Gelid GP-Ultimate de 1.5mm pe backplate mi-au coborât temperaturile la memorie de la 102°C la 82°C pe un 3090 FE.",
                "merit_votes": 40,
                "created_at": 1789740000000,
                "parent_id": "c-gpu-4"
            }
        ]
    },
    {
        "id": "p-seo-linux-hardening",
        "channel_id": "vault-guides",
        "author_id": "9f4a120c8b31", # PacketStorm
        "author_role": "MODERATOR",
        "title": "Checklist practic de securitate pentru un server Linux nou expus în internet: SSH pe hardware YubiKey, UFW, CrowdSec și audit Lynis 🛡️🐧",
        "content": """Dacă ai un VPS pe Hetzner, DigitalOcean sau un IP public dedicat acasă, în primele 10 minute de la pornire vei vedea în `journalctl` sute de încercări de login pe portul 22 din botnet-uri automate.

Iată checklist-ul meu de producție pe care îl aplic pe orice server Debian/Ubuntu înainte să pun vreun serviciu live:

### 1. SSH Hardening Fără Parole (Zero Password Auth)
Renunțați complet la parole pentru SSH. Generați chei criptografice legate hardware (FIDO2 / U2F) dacă aveți un YubiKey:
```bash
ssh-keygen -t ed25519-sk -O resident -O verify-required -C \"admin-hardware-key\"
```
În `/etc/ssh/sshd_config.d/99-hardened.conf`:
```
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 3
```

### 2. Înlocuiți Fail2Ban cu CrowdSec
Fail2Ban e ok, dar e reactiv și izolat. **CrowdSec** acționează ca un firewall colaborativ: când un IP încearcă exploit-uri pe mii de alte servere din lume, serverul tău îl blochează *înainte* să trimită primul pachet malițios la tine.
Instalare în 1 minut:
```bash
curl -s https://packagecloud.io/install/repositories/crowdsecurity/crowdsec/script.deb.sh | sudo bash
sudo apt install crowdsec crowdsec-firewall-bouncer-iptables
```

### 3. Kernel Sysctl Tweaks împotriva atacurilor de rețea
În `/etc/sysctl.d/99-security.conf`:
```
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
```

### 4. Audit cu Lynis
Rulați `lynis audit system`. Dacă scorul de hardening e sub 75, aplicați recomandările afișate în raport.

Cine folosește deja port knocking sau WireGuard jump-hosts pentru management?""",
        "flair": "CYBER SECURITY",
        "merit_votes": 485,
        "reply_count": 4,
        "boost_count": 39,
        "created_at": 1789737600000, # 2026-09-18 13:20:00 UTC
        "tags": ["linux", "security", "ssh", "yubikey", "crowdsec", "sysadmin", "cybersec"],
        "comments": [
            {
                "id": "c-sec-1",
                "author_id": "6d88f12a04cb", # ZeroDay
                "author_role": "MEMBER",
                "content": "Recomand cu căldură și activarea modulului `auditd` pentru monitorizarea executabilelor din `/tmp` și `/dev/shm`. Mulți atacatori descarcă shell-uri ELF direct în `/tmp` crezând că sysadminul nu are montat `/tmp` cu opțiunea `noexec`.",
                "merit_votes": 58,
                "created_at": 1789738800000,
                "parent_id": None
            },
            {
                "id": "c-sec-2",
                "author_id": "4e198a00b215", # DockerNinja
                "author_role": "MEMBER",
                "content": "Atenție mare dacă folosiți Docker împreună cu UFW! Docker ocolește regulile normale de iptables și publică porturile direct în internet chiar dacă UFW zice `deny`. Trebuie neapărat adăugată directiva `\"iptables\": false` în `/etc/docker/daemon.json` sau folosit lanțul `DOCKER-USER`.",
                "merit_votes": 92,
                "created_at": 1789740000000,
                "parent_id": None
            },
            {
                "id": "c-sec-3",
                "author_id": "9f4a120c8b31", # PacketStorm
                "author_role": "MODERATOR",
                "content": "@DockerNinja Fix din cauza asta am trecut la Podman pe toate nodurile de producție. Podman rootless nu atinge deloc iptables-ul sistemului și respectă firewall-ul nativ 100%.",
                "merit_votes": 44,
                "created_at": 1789741200000,
                "parent_id": "c-sec-2"
            },
            {
                "id": "c-sec-4",
                "author_id": "3a4092bbf102", # CyberRights
                "author_role": "MODERATOR",
                "content": "La nivel de legislație europeană (NIS2), astfel de măsuri de bază (autentificare cu factor hardware pe SSH, jurnale imutabile, firewall restrictiv) devin obligatorii pentru orice entitate care gestionează infrastructuri esențiale.",
                "merit_votes": 37,
                "created_at": 1789742400000,
                "parent_id": None
            }
        ]
    },
    {
        "id": "p-seo-qwen-coder-local",
        "channel_id": "relays-dev",
        "author_id": "b1409ea28c99", # DeepSeekRunner
        "author_role": "GUARDIAN",
        "title": "Qwen 2.5 Coder 32B rulat local pe Ollama / vLLM: A ajuns la nivelul Claude 3.5 Sonnet pentru refactoring TypeScript & Rust? Test pe cod real 🧠💻",
        "content": """În ultimele 3 săptămâni am rulat un experiment în orb: am trimis 50 de task-uri complexe de refactoring atât către **Claude 3.5 Sonnet**, cât și către modelul open-weights **Qwen 2.5 Coder 32B Instruct** (rulat local prin vLLM pe 2x RTX 3090, cuantizare Q4_K_M).

Rezultatele m-au șocat:

### 1. Unde Qwen 2.5 Coder 32B este la egalitate cu Claude:
- **Rust borrow checker & lifetimes**: A rezolvat probleme de referințe circulare în `tokio::sync::RwLock` fără nicio halucinație. Codul a compilat din prima încercare în 42 din 50 de cazuri.
- **Strict TypeScript Types**: A generat discriminative unions și mapped types pentru envelope-uri criptografice complexe fără `any` sau aserțiuni de tip forțate (`as unknown as X`).
- **Generare teste unitare**: A identificat edge-case-uri de rețea (timeout, jitter, out-of-order packets) extrem de rapid.

### 2. Unde Claude 3.5 Sonnet încă are avantaj:
- **Vedere de ansamblu pe codebase masiv**: Când contextul depășește 64.000 tokens, Claude își amintește mai bine detalii obscure din fișierele de configurare.
- **Eleganța documentației**: Comentariile generate de Claude au un ton mai fluent în limba engleză.

### 3. Setup recomandat pe Ollama:
```bash
ollama run qwen2.5-coder:32b
```
Parametri optimi în `Modelfile`:
```
PARAMETER temperature 0.2
PARAMETER top_p 0.95
PARAMETER num_ctx 32768
```
Dacă aveți cel puțin 24GB VRAM (sau un Mac Apple Silicon cu 36GB+ Unified Memory), vă recomand să încercați. Cost marginal pe interogare: $0.00. Zero date trimise în cloud.""",
        "flair": "AI ENGINEERING",
        "merit_votes": 590,
        "reply_count": 5,
        "boost_count": 52,
        "created_at": 1789741200000, # 2026-09-18 14:20:00 UTC
        "tags": ["ai", "ollama", "qwen", "claude", "programming", "typescript", "rust", "localai"],
        "comments": [
            {
                "id": "c-ai-1",
                "author_id": "a410ef89b231", # NeovimCult
                "author_role": "MEMBER",
                "content": "Îl folosesc legat la Neovim prin `avante.nvim` de vreo săptămână. Răspunde în 400ms la solicitări de inline completion. Să tastezi cod la 2 noaptea fără să aștepți request-ul de la un API comercial din SUA e o plăcere divină.",
                "merit_votes": 75,
                "created_at": 1789742400000,
                "parent_id": None
            },
            {
                "id": "c-ai-2",
                "author_id": "b2901a4fc883", # RustAcean
                "author_role": "MEMBER",
                "content": "Confirm pe partea de Rust! I-am dat să convertească un wrapper FFI scris în C++ către idiomatic Rust cu `cxx` și a tratat pointerii raw cu maximă prudență, punând blocuri `unsafe` doar strict unde era necesar și adăugând comentarii explicative.",
                "merit_votes": 63,
                "created_at": 1789743600000,
                "parent_id": None
            },
            {
                "id": "c-ai-3",
                "author_id": "3c91a4e082aa", # void_pointer
                "author_role": "MEMBER",
                "content": "Merge impecabil și varianta mai mică de 7B pe un MacBook Air M2 de 16GB! Scoate vreo 48 tokens/secundă și pentru scripturi de C/C++ pe microcontrollere ESP32 este mai mult decât suficient.",
                "merit_votes": 46,
                "created_at": 1789744800000,
                "parent_id": None
            },
            {
                "id": "c-ai-4",
                "author_id": "3e901a88fb22", # TinyModelHacker
                "author_role": "MEMBER",
                "content": "E incredibil cum acum 2 ani ne minunam de GPT-3.5 pe cloud de milioane de dolari, iar azi un model deschis de 32B pe care îl ții pe birou îl depășește la orice benchmark de programare.",
                "merit_votes": 53,
                "created_at": 1789746000000,
                "parent_id": None
            },
            {
                "id": "c-ai-5",
                "author_id": "b1409ea28c99", # DeepSeekRunner
                "author_role": "GUARDIAN",
                "content": "@TinyModelHacker Exact! Iar secretul stă în calitatea datelor sintetice de antrenament și în tehnicile de test-time compute. Epoca monopolului cloud pe inteligență artificială se apropie vertiginos de sfârșit.",
                "merit_votes": 69,
                "created_at": 1789747200000,
                "parent_id": "c-ai-4"
            }
        ]
    },
    {
        "id": "p-seo-podman-vs-docker",
        "channel_id": "relays-dev",
        "author_id": "64c8012fab12", # PodmanSailor
        "author_role": "MEMBER",
        "title": "De ce am migrat toate containerele de producție de pe Docker pe Podman: Rootless by default, fără daemon centralizat și compatibilitate 100% 🦭📦",
        "content": """Când rulezi `dockerd`, ai un proces gigantic cu privilegii de `root` care rulează permanent în fundal. Dacă un atacator reușește un container breakout sau găsește un bug în socket-ul `/var/run/docker.sock`, are acces la întreg sistemul gazdă.

De la începutul anului am trecut 100% pe **Podman 5.0** și Quadlets.

### De ce Podman este superior structural:
1. **Fără Daemon (Daemonless)**: Fiecare container este un proces copil direct al utilizatorului tău, la fel ca orice alt binar Linux (`fork/exec`). Dacă se oprește comanda, se oprește containerul. Nu există un daemon care să crăpe și să-ți omoare toate containerele deodată.
2. **Rootless Real**: User namespaces mapează UID-ul tău non-root (ex: UID 1000) ca UID 0 *doar în interiorul containerului*. Chiar dacă cineva obține root în container, pe host este doar un utilizator obișnuit fără drepturi de scriere în `/etc` sau `/bin`.
3. **Integrare Nativă cu systemd (Quadlets)**:
În loc de fișiere `docker-compose.yml` fragile gestionate manual, pui un fișier `.container` în `~/.config/containers/systemd/my-app.container`:
```ini
[Unit]
Description=Sovereign Vault Service
After=network-online.target

[Container]
Image=ghcr.io/aetheris/vault-relay:latest
PublishPort=8080:8080
Volume=%h/data:/app/data:Z

[Service]
Restart=always

[Install]
WantedBy=default.target
```
Apoi: `systemctl --user daemon-reload && systemctl --user start my-app`.
Containerul pornește automat la boot-ul mașinii, are health-check automat de la systemd și jurnale native în `journalctl`!

Cine a mai experimentat cu Quadlets pe Fedora / Debian?""",
        "flair": "DEVOPS & CONTAINERS",
        "merit_votes": 430,
        "reply_count": 4,
        "boost_count": 31,
        "created_at": 1789744800000, # 2026-09-18 15:20:00 UTC
        "tags": ["docker", "podman", "containers", "devops", "rootless", "linux", "systemd"],
        "comments": [
            {
                "id": "c-pod-1",
                "author_id": "4e198a00b215", # DockerNinja
                "author_role": "MEMBER",
                "content": "Quadlets sunt absolut geniale! Cel mai mare hop la început a fost permisiunea pe portul 80 și 443 fiind utilizator normal. Pentru cine se lovește de asta: o singură linie în `/etc/sysctl.d/podman.conf`: `net.ipv4.ip_unprivileged_port_start=80` și poți expune porturi web fără niciun privilegiu root.",
                "merit_votes": 62,
                "created_at": 1789746000000,
                "parent_id": None
            },
            {
                "id": "c-pod-2",
                "author_id": "19a408ebc220", # GentooCompiler
                "author_role": "MEMBER",
                "content": "Alt avantaj major: zero overhead de memorie când containerele sunt oprite. La Docker, doar daemonul îți mânca 120-200MB de RAM stând degeaba. La Podman, când nu ai niciun container activ, consumul e efectiv 0 bytes.",
                "merit_votes": 48,
                "created_at": 1789747200000,
                "parent_id": None
            },
            {
                "id": "c-pod-3",
                "author_id": "88f019ab4c21", # EbpfWatcher
                "author_role": "MEMBER",
                "content": "Și tracing-ul cu eBPF devine mult mai curat. Fiecare container are propriul cgroup v2 bine delimitat sub `user.slice`, așa că pot urmări apelurile de sistem pe container exact ca pe orice proces nativ Linux.",
                "merit_votes": 34,
                "created_at": 1789748400000,
                "parent_id": None
            },
            {
                "id": "c-pod-4",
                "author_id": "64c8012fab12", # PodmanSailor
                "author_role": "MEMBER",
                "content": "@DockerNinja Fix acel sysctl îl am și eu peste tot. Iar pentru containere multiple cu baze de date, flag-ul `:Z` la volume pentru SELinux e sfânt ca să nu te trezești cu permission denied pe mount.",
                "merit_votes": 28,
                "created_at": 1789749600000,
                "parent_id": "c-pod-1"
            }
        ]
    },
    {
        "id": "p-seo-wireguard-vs-tailscale",
        "channel_id": "vault-guides",
        "author_id": "62df09a14c33", # FiberWizard
        "author_role": "MEMBER",
        "title": "WireGuard direct în router vs Tailscale / Headscale: Cum îți conectezi securizat dispozitivele la homelab fără să deschizi porturi în firewall? 🌐🔐",
        "content": """Conectarea în siguranță la serviciile de acasă (NAS, camere, Home Assistant, servere Proxmox) când ești în deplasare este piatra de temelie a oricărui pasionat de tehnologie.

Iată comparația obiectivă între cele 3 abordări principale din 2026:

### 1. WireGuard Pur (Configurat manual pe router)
- **Cum funcționează**: Generezi chei publice/private, deschizi un port UDP (ex: 51820) în routerul tău și folosești un Dynamic DNS dacă ai IP dinamic de la DIGI/Orange.
- **Avantaje**: Viteza maximă absolută posibilă (modul de kernel Linux la 950+ Mbps pe fibră), zero intermediari, control total.
- **Dezavantaje**: Trebuie să deschizi un port public în firewall. Dacă ești în spatele unui CGNAT (pe 4G/5G sau anumiți provideri), conexiunea directă e imposibilă fără un server VPS intermediar.

### 2. Tailscale (Mesh VPN bazat pe WireGuard)
- **Cum funcționează**: Folosește protocoale STUN/ICE și servere DERP pentru a realiza NAT traversal (traversarea routerelor) fără să deschizi vreun port.
- **Avantaje**: Funcționează instantaneu de pe orice conexiune (inclusiv WiFi-ul din cafenele sau date mobile). Suport MagicDNS (accesezi serverul prin `http://homelab/` în loc de IP-uri).
- **Dezavantaje**: Serverul de coordonare (control plane) este proprietar și găzduit în cloud-ul Tailscale Inc.

### 3. Headscale (Alternativa 100% Open-Source & Suverană)
- **Cum funcționează**: Înlocuiește serverul central Tailscale cu o instanță open-source pe care o găzduiești pe propriul server.
- **Clienții**: Folosești clienții oficiali Tailscale de pe Android, iOS, Windows, Mac și Linux, dar îi direcționezi către URL-ul tău Headscale (`tailscale up --login-server https://vpn.domeniul-tau.ro`).

Pentru 90% dintre oameni, Tailscale sau Headscale oferă securitate maximă fără riscul de a expune porturi pe internet. Voi ce soluție rulați?""",
        "flair": "NETWORKING & HOMELAB",
        "merit_votes": 460,
        "reply_count": 4,
        "boost_count": 33,
        "created_at": 1789748400000, # 2026-09-18 16:20:00 UTC
        "tags": ["wireguard", "tailscale", "headscale", "vpn", "homelab", "networking", "security"],
        "comments": [
            {
                "id": "c-vpn-1",
                "author_id": "9f4a120c8b31", # PacketStorm
                "author_role": "MODERATOR",
                "content": "Pe routerele MikroTik cu RouterOS 7, WireGuard-ul este integrat direct în hardware offloading. Pentru legătura site-to-site între două birouri sau între apartament și casa de la țară, nimic nu bate un tunel WireGuard direct cu MTU 1420.",
                "merit_votes": 55,
                "created_at": 1789749600000,
                "parent_id": None
            },
            {
                "id": "c-vpn-2",
                "author_id": "29c40ea18df2", # ZfsGoblin
                "author_role": "MEMBER",
                "content": "Tailscale Subnet Router a fost o salvare pentru TrueNAS. Am un mic container LXC în Proxmox cu `tailscale up --advertise-routes=192.168.1.0/24` și când sunt plecat cu laptopul accesez toate share-urile SMB și interfețele web exact ca și cum aș fi conectat prin cablu pe biroul de acasă.",
                "merit_votes": 64,
                "created_at": 1789750800000,
                "parent_id": None
            },
            {
                "id": "c-vpn-3",
                "author_id": "52e091bfa331", # AntiTracker
                "author_role": "MEMBER",
                "content": "Rulați Headscale dacă vă pasă cu adevărat de autonomie. Are o imagine oficială de Docker extrem de ușoară (consumă sub 30MB RAM cu bază SQLite) și eliminați complet orice dependență de serverele unei companii din SUA.",
                "merit_votes": 48,
                "created_at": 1789752000000,
                "parent_id": None
            },
            {
                "id": "c-vpn-4",
                "author_id": "62df09a14c33", # FiberWizard
                "author_role": "MEMBER",
                "content": "@PacketStorm Foarte corect! La MTU pe conexiunile PPPoE din România (unde MTU-ul de bază e 1492), dacă pui WireGuard la 1420 nu mai ai nicio fragmentare TCP MSS și streaming-ul 4K zboară fără buffering.",
                "merit_votes": 41,
                "created_at": 1789753200000,
                "parent_id": "c-vpn-1"
            }
        ]
    },
    {
        "id": "p-seo-backup-321-restic-r2",
        "channel_id": "vault-guides",
        "author_id": "29c40ea18df2", # ZfsGoblin
        "author_role": "MEMBER",
        "title": "Strategia de backup 3-2-1 aplicată în practică: ZFS snapshots locale pe TrueNAS + Restic criptat offsite în Cloudflare R2 (cost lunar $0.00) 💾🛡️",
        "content": """În IT există o vorbă cinică: *„Oamenii se împart în două categorii: cei care fac backup și cei care vor face backup după prima pierdere masivă de date.”*

Acum 2 ani un controller SATA defect mi-a corupt o întreagă matrice ext4. De atunci am implementat strict **regula 3-2-1 de backup**:
- **3 copii ale datelor**
- **2 medii diferite de stocare**
- **1 copie offsite (în afara casei)**

Iată cum arată arhitectura mea actuală, cu cost zero:

### Nivelul 1: Snapshots locale automate pe ZFS
Pe TrueNAS Scale am activat `Periodic Snapshot Tasks`:
- La fiecare 1 oră (păstrate 48 de ore)
- Zilnice (păstrate 30 de zile)
- Lunare (păstrate 1 an)
Dacă șterg accidental un fișier sau dacă un ransomware ar încerca să cripteze datele, dau rollback la snapshot-ul de acum 10 minute în 2 secunde.

### Nivelul 2: Replicare locală pe al doilea mediu
În fiecare duminică noaptea, TrueNAS sincronizează automat un dataset esențial către un al doilea disc rece (Cold HDD) conectat prin USB, care este apoi oprit din rotație (`hdparm -y`).

### Nivelul 3: Copia Offsite criptată în Cloudflare R2 cu Restic
Cloudflare R2 oferă **10 GB stocare gratuită** și cel mai important: **0 dolari taxe de egress (descărcare)** spre deosebire de AWS S3.
Folosesc utilitarul open-source **Restic**:
```bash
# Criptare client-side AES-256 înainte de a trimite orice bit pe net
export AWS_ACCESS_KEY_ID=\"...\"
export AWS_SECRET_ACCESS_KEY=\"...\"
export RESTIC_REPOSITORY=\"s3:https://<account-id>.r2.cloudflarestorage.com/my-backup-bucket\"
export RESTIC_PASSWORD=\"cheia-mea-secreta-foarte-lunga\"

restic backup /mnt/tank/documente_esentiale --tag cron-nightly
```
Restic face dedublicare pe blocuri de date și trimite doar diferențele incrementale. Un backup complet zilnic durează sub 40 de secunde.

Testați-vă backup-urile periodic! O copie de siguranță netestată este doar o iluzie.""",
        "flair": "STORAGE & BACKUP",
        "merit_votes": 495,
        "reply_count": 4,
        "boost_count": 37,
        "created_at": 1789751400000, # 2026-09-18 17:10:00 UTC
        "tags": ["backup", "restic", "truenas", "zfs", "cloudflare", "r2", "storage", "security"],
        "comments": [
            {
                "id": "c-bak-1",
                "author_id": "7f8a910c2b44", # ArchChad
                "author_role": "MEMBER",
                "content": "Exact așa trebuie făcut! Zero egress fees la R2 este un game-changer masiv comparat cu Amazon S3 unde plătești fiecare GB descărcat în caz că ai nevoie de un restore complet. Rulați și `restic check` lunar să verificați integritatea hash-urilor criptografice.",
                "merit_votes": 52,
                "created_at": 1789752600000,
                "parent_id": None
            },
            {
                "id": "c-bak-2",
                "author_id": "91c24fa0e891", # PiHoarder
                "author_role": "MEMBER",
                "content": "Merge Restic și pe un Raspberry Pi 4 fără să îl înghețe? Am o colecție de poze RAW de vreo 350GB și mă gândeam să pun un Pi la casa părinților ca nod offsite.",
                "merit_votes": 31,
                "created_at": 1789753800000,
                "parent_id": None
            },
            {
                "id": "c-bak-3",
                "author_id": "29c40ea18df2", # ZfsGoblin
                "author_role": "MEMBER",
                "content": "@PiHoarder Da, absolut! Procesorul de pe Pi 4 are instrucțiuni hardware de criptare AES (ARMv8 crypto extensions). Criptează la aproximativ 45-50 MB/s, deci o să meargă fără probleme pe conexiunea de net de acasă.",
                "merit_votes": 59,
                "created_at": 1789754400000,
                "parent_id": "c-bak-2"
            },
            {
                "id": "c-bak-4",
                "author_id": "c3dc28cb705e", # ZeroKnowledge
                "author_role": "ARCHIVIST",
                "content": "Excelent ghid! Criptarea pe partea de client înainte de upload este regula de aur a suveranității datelor. Furnizorul de cloud nu deține cheile, așadar chiar și în cazul unei breșe masive datele rămân un blob impenetrabil de zgomot matematic.",
                "merit_votes": 44,
                "created_at": 1789755000000,
                "parent_id": None
            }
        ]
    },
    {
        "id": "p-seo-grapheneos-review",
        "channel_id": "relays-general",
        "author_id": "52e091bfa331", # AntiTracker
        "author_role": "MEMBER",
        "title": "6 luni cu GrapheneOS pe Google Pixel ca daily driver: Ce funcționează impecabil, ce bănci fac figuri și de ce autonomia bateriei s-a dublat 📱🔒",
        "content": """În martie am cumpărat un Google Pixel 8 cu un singur scop: să șterg Android-ul stoc de la Google și să instalez **GrapheneOS**, sistemul de operare axat pe securitate și confidențialitate extremă.

După 6 luni de utilizare zilnică intensă ca telefon unic de muncă și viață personală, iată concluziile reale:

### 1. Funcționează aplicațiile bancare din România?
Surprinzător, **DA**:
- **Revolut**: Funcționează 100% (autentificare biometrică, plăți, carduri virtuale).
- **BT Pay (Banca Transilvania)**: Funcționează perfect după instalarea Sandboxed Google Play Services.
- **George România (BCR)**: Funcționează fără probleme.
- **ING Home'Bank**: Funcționează.
- *Excepție*: Unele funcționalități care depind de Google Pay NFC pentru plata contactless la POS necesită instalarea aplicației Google Wallet în sandbox-ul izolat.

### 2. Ce este Sandboxed Google Play și de ce este revoluționar?
Pe un telefon normal, Google Play are permisiuni de sistem absolute (root-level), citește ID-ul hardware, locația în fundal și contactele. Pe GrapheneOS, Google Play rulează ca **o aplicație obișnuită fără niciun privilegiu special**. Nu are acces la memoria telefonului sau la locație decât dacă îi permiți tu explicit!

### 3. Autonomia bateriei: O surpriză masivă
Pe Android-ul stoc trebuia să încarc telefonul la ora 19:00. Pe GrapheneOS ajung la ora 23:00 cu **45-50% baterie rămasă**! Motivul? Am scăpat de miile de conexiuni de telemetrie, ad-tracking și analize în fundal pe care serviciile Google le trimit non-stop.

### 4. Contact Scopes & Storage Scopes
Cea mai tare funcționalitate: Când WhatsApp sau altă aplicație îți cere „Acces la contacte”, GrapheneOS îți permite să îi dai acces doar la 3 persoane alese de tine, restul agendei rămânând complet invizibilă pentru aplicație!

Pentru cine vrea un telefon modern fără să fie urmărit la fiecare pas, GrapheneOS este cel mai matur proiect open-source din ecosistemul mobil.""",
        "flair": "MOBILE PRIVACY",
        "merit_votes": 530,
        "reply_count": 4,
        "boost_count": 48,
        "created_at": 1789753200000, # 2026-09-18 17:40:00 UTC
        "tags": ["grapheneos", "pixel", "android", "privacy", "degoogled", "mobileprivacy", "security"],
        "comments": [
            {
                "id": "c-grap-1",
                "author_id": "3a4092bbf102", # CyberRights
                "author_role": "MODERATOR",
                "content": "Contact Scopes este exact genul de granularitate pe care Comisia Europeană și GDPR-ul ar fi trebuit să o impună ca standard la nivel de Android și iOS. Faptul că o aplicație de ride-sharing îți cere acces la toate contactele sau refuză să funcționeze este un abuz grav.",
                "merit_votes": 71,
                "created_at": 1789754400000,
                "parent_id": None
            },
            {
                "id": "c-grap-2",
                "author_id": "22c88f01a9df", # CoffeeOverflow
                "author_role": "MEMBER",
                "content": "Cum stai cu notificările de la aplicații? Vin instant prin sandbox sau folosești UnifiedPush cu server ntfy?",
                "merit_votes": 33,
                "created_at": 1789755000000,
                "parent_id": None
            },
            {
                "id": "c-grap-3",
                "author_id": "52e091bfa331", # AntiTracker
                "author_role": "MEMBER",
                "content": "@CoffeeOverflow Pentru aplicațiile cu Signal și UREfy folosesc websockets native fără Google. Pentru aplicațiile uzuale care depind de Firebase Cloud Messaging (FCM), notificările vin instant prin Sandboxed Google Play fără să consume baterie sesizabilă.",
                "merit_votes": 48,
                "created_at": 1789755600000,
                "parent_id": "c-grap-2"
            },
            {
                "id": "c-grap-4",
                "author_id": "4b109af38c01", # SecGuardian
                "author_role": "MEMBER",
                "content": "Merită menționat și că pe Pixel 8 / 9 ai suport hardware pentru MTE (Memory Tagging Extension). GrapheneOS activează MTE pe componentele critice de sistem, ceea ce elimină peste 70% din exploit-urile de memorie bazate pe buffer overflow și use-after-free.",
                "merit_votes": 62,
                "created_at": 1789756200000,
                "parent_id": None
            }
        ]
    },
    {
        "id": "p-seo-tauri-vs-electron",
        "channel_id": "relays-dev",
        "author_id": "da0194f28bc1", # TauriFanatic
        "author_role": "MEMBER",
        "title": "Benchmark real de performanță: Am rescris o aplicație din Electron în Tauri v2. Consum RAM redus de la 480 MB la 34 MB și executabil de 8 MB! 🚀⚡",
        "content": """Să împachetezi un browser întreg Chromium și un runtime Node.js pentru o aplicație de chat sau productivitate a fost mereu o risipă uriașă de resurse.

Iată datele concrete după rescrierea completă a clientului nostru de desktop din **Electron 31** în **Tauri 2.0 (Rust backend + Svelte/TypeScript frontend)**:

### 1. Măsurători concrete (Testat pe Windows 11 & Fedora Linux):
- **Dimensiune kit de instalare (Installer)**:
  - Electron: **98.4 MB**
  - Tauri v2: **8.2 MB** (-91.6% mai mic!)
- **Consum RAM în Idle (la pornire)**:
  - Electron: **480 MB** (3 procese Chromium helper + GPU process + Node main)
  - Tauri v2: **34 MB** (folosește WebView2 pe Windows / WebKitGTK pe Linux)
- **Timp de pornire (Cold Start)**:
  - Electron: **1.85 secunde**
  - Tauri v2: **110 milisecunde** (instantaneu!)

### 2. Securitate prin Capability Files
În Electron, dacă ai o vulnerabilitate XSS în frontend, atacatorul poate chema `require('child_process').exec()` și obține Remote Code Execution (RCE) imediat pe mașina utilizatorului.
În Tauri v2, sistemul de **Capabilities** din Rust blochează totul implicit:
Frontend-ul nu poate citi niciun fișier de pe disc și nu poate executa nicio comandă decât dacă este declarată strict în `src-tauri/capabilities/default.json`.

Dacă începeți un proiect desktop nou în 2026, nu mai există niciun motiv tehnic valid să alegeți Electron.""",
        "flair": "FRONTEND & BENCHMARK",
        "merit_votes": 470,
        "reply_count": 4,
        "boost_count": 36,
        "created_at": 1789754400000, # 2026-09-18 18:00:00 UTC
        "tags": ["tauri", "rust", "electron", "performance", "frontend", "benchmark", "webdev"],
        "comments": [
            {
                "id": "c-tau-1",
                "author_id": "3c91a4e082aa", # void_pointer
                "author_role": "MEMBER",
                "content": "Și cel mai tare este suportul de mobile în Tauri 2.0! Cu același backend scris în Rust și același frontend Svelte/Tailwind poți compila nativ și pentru Android și iOS cu API-uri de biometrie și stocare securizată direct în Keychain / Keystore.",
                "merit_votes": 53,
                "created_at": 1789755600000,
                "parent_id": None
            },
            {
                "id": "c-tau-2",
                "author_id": "2d89b14c99a0", # NeonCat
                "author_role": "MEMBER",
                "content": "Singura mică provocare pe care am întâlnit-o la Tauri pe Linux este diferența de randare CSS între WebKitGTK și Chromium (mai ales la blur-uri backdrop-filter complexe). Dar cu Tailwind v4 și variabile CSS moderne se rezolvă curat.",
                "merit_votes": 36,
                "created_at": 1789756200000,
                "parent_id": None
            },
            {
                "id": "c-tau-3",
                "author_id": "da0194f28bc1", # TauriFanatic
                "author_role": "MEMBER",
                "content": "@NeonCat Așa e, WebKitGTK pe Linux necesită uneori `-webkit-backdrop-filter` explicit. Dar la viteza cu care pornește aplicația și faptul că nu-mi omoară bateria de la laptop merită cu vârf și îndesat.",
                "merit_votes": 41,
                "created_at": 1789756800000,
                "parent_id": "c-tau-2"
            },
            {
                "id": "c-tau-4",
                "author_id": "82c901afcb45", # A11yPaladin
                "author_role": "MEMBER",
                "content": "Și accesibilitatea este mult superioară! WebView2 pe Windows se leagă direct la UI Automation fără wrapper-ele stângace din Chromium, astfel că screen readerele ca NVDA sau JAWS navighează mult mai natural prin interfețe.",
                "merit_votes": 45,
                "created_at": 1789757400000,
                "parent_id": None
            }
        ]
    },
    {
        "id": "p-seo-mechanical-keyboards-guide",
        "channel_id": "relays-general",
        "author_id": "a30194f2de89", # SwitchModder
        "author_role": "MEMBER",
        "title": "Ghid complet de lubrifiere pentru switch-uri liniare: Cum aplici Krytox 205g0 fără să le suprasaturezi și de ce sunetul 'thock' depinde de carcasă ⌨️✨",
        "content": """Dacă ai o tastatură mecanică și sunetul tastelor ți se pare zgomotos, uscat sau zdrăngănitor (rattle pe spacebar), lubrifierea switch-urilor și a stabilizatoarelor este cel mai satisfăcător upgrade pe care îl poți face într-o duminică după-amiază.

Iată regulile de aur învățate după ce am lubrifiat peste 1.000 de switch-uri:

### 1. Materiale esențiale:
- **Krytox 205g0** (vaselină fluorurată originală Miller-Stephenson; atenție la fake-urile de pe AliExpress care se separă în ulei după 2 luni!)
- **Krytox GPL 105** (ulei fluid pentru arcuri)
- Pensulă fină mărimea 00 sau 0
- Switch opener mecanic (2-in-1 pentru carcase MX și Kailh)
- Pensetă de precizie și stem pick

### 2. Tehnica corectă pe switch-uri liniare:
- **Arcurile**: Metoda „bag lubing” cu GPL 105. Pui 70-80 de arcuri într-o punguță ziploc, adaugi 10-12 picături de ulei, sufli puțin aer și agiți energic 60 de secunde. Toate arcurile primesc o peliculă microscopică uniformă care elimină 100% zgomotul de scârțâit metalic (spring ping)!
- **Tija (Stem)**: Regula absolută este **„Less is more”**. Pensula trebuie să fie aproape uscată, doar cu o strălucire fină. Lubrifiezi cele două șine laterale și fața inferioară. Dacă albul vaselinei este opac pe plastic, ai pus prea mult și tasta va deveni lipicioasă și lentă la revenire!

### 3. De unde vine sunetul 'Thock' vs 'Clack'?
Sunetul profund nu depinde doar de switch!
- **Placa de montaj**: Plăcile din **FR4 sau POM** absorb frecvențele înalte și dau un sunet cald și înfundat. Plăcile din Aluminiu dau un sunet ascuțit („clack”).
- **Deskmat-ul**: Un mousepad textil gros de 4mm sau 5mm pe birou schimbă acustica complet, acționând ca un izolator fonic.

Ce switch-uri folosiți zilnic la programare sau gaming? Liniar silențios sau tactil?""",
        "flair": "MECHANICAL KEYBOARDS",
        "merit_votes": 380,
        "reply_count": 4,
        "boost_count": 29,
        "created_at": 1789755600000, # 2026-09-18 18:20:00 UTC
        "tags": ["keyboards", "mechanicalkeyboards", "krytox", "modding", "thock", "desksetup", "hardware"],
        "comments": [
            {
                "id": "c-kb-1",
                "author_id": "6f1084ea2b99", # SwitchLubricator
                "author_role": "MEMBER",
                "content": "Bag lubing la arcuri salvează ore întregi din viață! Confirm faza cu vaselina pe stem: cel mai bun test e să te uiți sub o lampă – dacă plasticul lucește ca o unghie dată cu lac transparent, e cantitatea perfectă. Dacă vezi stropi sau pastă albă, curăță cu un șervețel.",
                "merit_votes": 49,
                "created_at": 1789756200000,
                "parent_id": None
            },
            {
                "id": "c-kb-2",
                "author_id": "a0914e21fc88", # SimRigRacer
                "author_role": "MEMBER",
                "content": "Pentru tactile (gen Boba U4T sau Holy Panda) ce recomanzi? Am auzit că dacă pui 205g0 pe picioarele tactile ale tijei distrugi tot bump-ul tactil.",
                "merit_votes": 34,
                "created_at": 1789756800000,
                "parent_id": None
            },
            {
                "id": "c-kb-3",
                "author_id": "a30194f2de89", # SwitchModder
                "author_role": "MEMBER",
                "content": "@SimRigRacer Foarte adevărat! La tactile folosește **Tribosys 3203** (care e mai fluid) și **nu atinge niciodată cele două piciorușe mici ale tijei**. Dacă lubrifiezi picioarele tactile, switch-ul își pierde rezistența caracteristică și devine un liniar ciudat.",
                "merit_votes": 58,
                "created_at": 1789757400000,
                "parent_id": "c-kb-2"
            },
            {
                "id": "c-kb-4",
                "author_id": "a410ef89b231", # NeovimCult
                "author_role": "MEMBER",
                "content": "Am trecut pe Gateron Oil Kings cu carcasă de aluminiu și plate FR4. După 6 ore de codat în Neovim, degetele nu mai obosesc deloc. E o investiție mică dar care îți schimbă toată ergonomia de lucru zilnic.",
                "merit_votes": 42,
                "created_at": 1789758000000,
                "parent_id": None
            }
        ]
    },
    {
        "id": "p-seo-godot-vs-unity",
        "channel_id": "relays-dev",
        "author_id": "5b2041e8d902", # GodotTinker
        "author_role": "MEMBER",
        "title": "De ce tot mai mulți dezvoltatori indie aleg Godot 4.3 în 2026: Compilare în 2 secunde, executabil de 40 MB și libertate totală fără abonamente 🎮👾",
        "content": """După controversa cu Runtime Fee de la Unity și concedierile repetate, migrația către **Godot Engine 4.3** a devenit una dintre cele mai frumoase povești din lumea open-source.

Lucrând la un joc 2D/3D hibrid cu estetică retro, iată de ce nu m-aș mai întoarce la Unity nici plătit:

### 1. Viteza de iterație este incredibilă:
- În Unity: deschizi proiectul, aștepți 45 de secunde re-importul de assets, modifici o linie de C#, aștepți 8 secunde compilarea domeniului.
- În Godot: apeși F5, jocul rulează **instantaneu în 1.2 secunde**. Modifici variabile în cod și le vezi actualizate în timp real (Live Reload) direct în instanța jocului care rulează!

### 2. Arhitectura pe Noduri și Scene
În loc de componente libere împrăștiate, în Godot **totul este o scenă**.
Un personaj este o scenă. O armă este o scenă. Un nivel întreg este o scenă compusă din alte scene. Acest mod ierarhic de compoziție este mult mai intuitiv și previne spaghetti code-ul specific proiectelor medii.

### 3. Text-based files & Git Friendly
Fișierele de scenă `.tscn` sunt fișiere text curate. Dacă lucrezi în echipă prin Git, rezolvarea unui merge conflict durează 10 secunde, spre deosebire de conflictele binare dezastruoase de prefabs din alte motoare.

### 4. Zero Taxe, Zero Telemetrie, Zero Conturi
Editorul Godot are **42 MB**. Nu are instalator, nu-ți cere cont de cloud, nu-ți pune splash screen forțat la pornirea jocului. Îl pui pe un stick USB și funcționează identic pe Linux, Windows, macOS și Steam Deck.

Cine a mai lansat sau testează prototipuri pe Godot anul acesta?""",
        "flair": "GAMEDEV & CREATIVE",
        "merit_votes": 425,
        "reply_count": 4,
        "boost_count": 32,
        "created_at": 1789756800000, # 2026-09-18 18:40:00 UTC
        "tags": ["godot", "gamedev", "unity", "indiedev", "vulkan", "opensource", "gaming"],
        "comments": [
            {
                "id": "c-god-1",
                "author_id": "91df9012cb78", # LowPolyCrafter
                "author_role": "MEMBER",
                "content": "Exportul din Blender prin glTF 2.0 direct în Godot funcționează perfect! Materialele PBR, animațiile pe schelet și coliziunile custom (`-col`) se importă fără nicio setare manuală suplimentară.",
                "merit_votes": 45,
                "created_at": 1789757400000,
                "parent_id": None
            },
            {
                "id": "c-god-2",
                "author_id": "5b2041e8d902", # GodotTinker
                "author_role": "MEMBER",
                "content": "@LowPolyCrafter Iar în 4.3 poți pune direct fișierele native `.blend` în folderul proiectului și Godot le convertește automat în fundal prin CLI-ul de Blender. Este cel mai rapid pipeline de artă pe care l-am văzut vreodată.",
                "merit_votes": 51,
                "created_at": 1789757700000,
                "parent_id": "c-god-1"
            },
            {
                "id": "c-god-3",
                "author_id": "4d89a01fbb23", # AsmPurist
                "author_role": "MEMBER",
                "content": "Și codul sursă în C++ al motorului este incredibil de curat și bine structurat. Când ai nevoie de o funcție grafică custom în Vulkan sau un algoritm de fizică optimizat cu SIMD, scrii un modul GDExtension în C++ sau Rust și rulează la viteză nativă.",
                "merit_votes": 39,
                "created_at": 1789758000000,
                "parent_id": None
            },
            {
                "id": "c-god-4",
                "author_id": "60c8012acd78", # GameBugHunter
                "author_role": "MEMBER",
                "content": "Iar exportul pentru Steam Deck e o bucurie. Compilezi binar nativ de Linux x86_64, îl testezi pe Deck și obții 60 FPS stabil cu un consum de doar 7W din baterie.",
                "merit_votes": 47,
                "created_at": 1789758300000,
                "parent_id": None
            }
        ]
    }
]

# Random sample personas for rich interactions
ALL_PERSONAS = [
    "7f8a910c2b44", "3c91a4e082aa", "9f4a120c8b31", "5b2041e8d902", "14e92a8819bb",
    "8a31b402ef19", "62df09a14c33", "2d89b14c99a0", "4e198a00b215", "c0a184e912fd",
    "7b33a901ff42", "91c24fa0e891", "a410ef89b231", "6d88f12a04cb", "31f90a44ec12",
    "88b4012ce9fa", "52e091bfa331", "19a408ebc220", "a0914e21fc88", "44df9012a8bc",
    "bf0194a28cc1", "22c88f01a9df", "77e1029ba4c0", "59b04a11ee32", "83d2019fab66",
    "11f802ea9bc4", "66a0194ebd21", "3a4092bbf102", "99df012aa4c3", "42c90a18eb77",
    "8d104fb2a901", "15e0921ab4c8", "70a40f91b2df", "b2901a4fc883", "38df02ba91c0",
    "6f1084ea2b99", "a500912fa8cc", "29c40ea18df2", "94df0218ab44", "4b109af38c01",
    "87a01fa29cb5", "1c490a21fd88", "54b09ef12a77", "da0194f28bc1", "3e901a88fb22",
    "b1409ea28c99", "7c9102ab84df", "a89104fa2211", "c3dc28cb705e", "f40019bc88a2",
    "9b22a011cd44", "4d89a01fbb23", "88f019ab4c21", "2a9104eb8c33", "63c901afb844",
    "17df8902ab55", "5e019ab28c66", "92c4018fba77", "35df9012a888", "78a014fb9c99",
    "21f09ab8c401", "64c8012fab12", "a7df9012bc23", "39b014ea8d34", "82c901afcb45",
    "1bf08912ea56", "5ec4018fba67", "91df9012cb78", "24a014f9ec89", "67c8012afb90",
    "aa0194f2cd01", "3db014ea9e12", "80c901afdf23", "13f08912ef34", "56c4018ffa45",
    "9ad09012ab56", "2da014f9bc67", "60c8012acd78", "a30194f2de89", "36b014eaef90",
    "79c901affa01", "1cf08912fa12"
]

def escape_sql(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    # String escaping: replace ' with ''
    return "'" + str(val).replace("'", "''") + "'"

def generate_sql():
    statements = []
    
    # 1. Insert Posts
    for p in POSTS_DATA:
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
        
        # Post Tags
        for tag in p.get("tags", []):
            clean_tag = tag.strip().lstrip("#").lower()
            tag_stmt = f"INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ({escape_sql(p['id'])}, {escape_sql(clean_tag)}, {p['created_at']});"
            statements.append(tag_stmt)

        # Comments
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
            
            # Reactions on comments (3-6 reactions per comment)
            import random
            comment_reactors = random.sample(ALL_PERSONAS, k=min(len(ALL_PERSONAS), random.randint(4, 8)))
            for idx, reactor_id in enumerate(comment_reactors):
                if reactor_id == c['author_id']:
                    continue
                r_type = random.choice(['like', 'reaction'])
                r_val = random.choice(['🔥', '🧠', '🚀', '❤️', '👍', '💡'])
                r_time = c['created_at'] + (idx + 1) * 30000
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

        # Reactions on Posts (18 to 28 reactions per post from diverse personas)
        import random
        reactors = random.sample(ALL_PERSONAS, k=min(len(ALL_PERSONAS), random.randint(20, 32)))
        for idx, reactor_id in enumerate(reactors):
            if reactor_id == p['author_id']:
                continue
            r_type = random.choice(['like', 'reaction', 'bookmark'])
            r_val = random.choice(['🔥', '🚀', '🧠', '❤️', '👍', '💡', '🛡️'])
            r_time = p['created_at'] + (idx + 1) * 60000
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
            
            # Votes table
            v_id = f"v-p-{p['id']}-{reactor_id[:6]}"
            vote_stmt = f"""INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                {escape_sql(v_id)},
                'post',
                {escape_sql(p['id'])},
                {escape_sql(reactor_id)},
                1,
                {r_time}
            );"""
            statements.append(vote_stmt)

    return statements

def execute_in_batches(statements):
    batch_size = 50
    total_stmts = len(statements)
    total_batches = (total_stmts + batch_size - 1) // batch_size
    print(f"Total SQL statements to execute: {total_stmts} across {total_batches} batches.")
    
    tmp_file = "scripts/_tmp_seo_batch.sql"
    success_count = 0
    
    for i in range(0, total_stmts, batch_size):
        batch = statements[i:i+batch_size]
        batch_num = i // batch_size + 1
        print(f"[{batch_num}/{total_batches}] Executing {len(batch)} statements...")
        
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
            print(f"ERROR on batch {batch_num}:")
            print(res.stderr or res.stdout)
            # Retry once
            time.sleep(1.5)
            res2 = subprocess.run(cmd, capture_output=True, text=True)
            if res2.returncode != 0:
                print(f"Failed retry on batch {batch_num}, aborting.")
                return False
        success_count += len(batch)
        time.sleep(0.3)
        
    if os.path.exists(tmp_file):
        os.remove(tmp_file)
        
    print(f"ALL {success_count} statements successfully committed to remote D1!")
    return True

if __name__ == "__main__":
    stmts = generate_sql()
    with open("scripts/seed-2026-09-18-seo-community.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(stmts) + "\n")
    print("Generated scripts/seed-2026-09-18-seo-community.sql")
    execute_in_batches(stmts)
