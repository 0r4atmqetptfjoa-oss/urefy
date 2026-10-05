#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/seed_romanian_phase2.py
Seed Phase 2: Rich Romanian Posts, Authentic Threaded Comments, and Comprehensive Romanian Chat Messages.
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

POSTS_DATA = [
    {
        "id": "post-ro-keepass-yubikey",
        "channel_id": "c/privacy-ai",
        "author": "anti_tracker",
        "flair": "SECURITY & HARDWARE",
        "title": "De ce am renunțat la managerii de parole cloud: setup complet KeePassXC + YubiKey 5C NFC hardware 2FA",
        "content": """După incidentele repetate din industrie privind bazele de date sincronizate în cloud, am decis să fac pasul către suveranitate totală pe securitatea credențialelor mele.

Am migrat întreaga bază de date de parole către [KeePassXC](https://keepassxc.org/), securizată printr-o combinație de:
1. **Master Password puternic** (passphrase de 24 caractere generat diceware).
2. **Keyfile local** stocat izolat și nepartajat.
3. **Challenge-Response HMAC-SHA1 prin [YubiKey](https://www.yubico.com/) 5C NFC**.

### Ce înseamnă asta în practică?
Chiar dacă cineva copiază fișierul `.kdbx` criptat cu Argon2id (care folosește 1GB memorie și 10 iterații pentru rezistență împotriva atacurilor GPU brute-force), baza de date este complet impenetrabilă fără atingerea fizică a cheii hardware YubiKey conectată pe USB-C sau apropiată prin NFC pe telefon.

Pentru backup, păstrez două chei YubiKey identice înrolate simultan ca slot backup într-un seif rezistent la foc, plus o copie criptată a bazei de date sincronizată peer-to-peer prin Syncthing pe serverul de acasă.

Recomand oricui să renunțe la dependența de servere terțe pentru date atât de sensibile!""",
        "images": [
            "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=1200&q=80"
        ],
        "votes": 612,
        "boosts": 142,
        "offset_h": 4.2,
        "comments": [
            ("void_pointer", None, "Argon2id cu 1GB RAM e tanc! Nici măcar un cluster de H100 nu poate face bruteforce la scară cu un asemenea cost de memorie per hash.", 92),
            ("anti_tracker", "c-1", "Exact, costul de memorie anulează complet avantajul de paralelism al ASIC-urilor și GPU-urilor.", 48),
            ("zero_day", None, "Pe Android folosești KeePassDX? Suportă challenge-response prin NFC fără probleme?", 64),
            ("anti_tracker", "c-3", "Da, KeePassDX citește YubiKey instant prin NFC pe Pixel. Atingi telefonul pe spate 1 secundă și baza de date se deblochează.", 85),
            ("fiber_wizard", None, "Super setup. Ai activat și protecția împotriva keyloggerelor în setările KeePassXC?", 51),
        ]
    },
    {
        "id": "post-ro-grapheneos-privacy",
        "channel_id": "c/digitalfreedom",
        "author": "zero_day",
        "flair": "MOBILE PRIVACY",
        "title": "6 luni de utilizare zilnică cu GrapheneOS pe Google Pixel: independență totală de serviciile Google și autonomie de 2 zile",
        "content": """La începutul anului am achiziționat un Google Pixel 8 exclusiv pentru a instala [GrapheneOS](https://grapheneos.org/). Sistemul de operare axat pe securitate și confidențialitate a depășit orice așteptare.

### Aspecte cheie după 6 luni:
- **Sandbox Google Play Services**: Serviciile Google nu au niciun privilegiu la nivel de sistem de operare; rulează ca simple aplicații izolate într-un profil dedicat fără acces la locație sau fișiere.
- **Autonomie uimitoare**: Fără zecile de procese de telemetrie, ping-uri analytics și wakelocks în fundal, bateria de 4575mAh ține lejer 2 zile pline cu 6-7 ore Screen-On-Time.
- **Network & Sensors Permissions**: GrapheneOS adaugă toggles native la nivel de sistem pentru permisiunea de acces la rețea și senzori (giroscop, accelerometru) pentru orice aplicație instalată.
- **Browser securizat Vanadium**: Bazat pe Chromium, dar cu un allocator de memorie întărit (hardened_malloc) și izolarea strictă a site-urilor.

Pentru aplicațiile bancare din România (BT Pay, George BCR, Raiffeisen), toate au funcționat impecabil în sandbox cu Play Integrity basic passed.""",
        "images": [
            "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80"
        ],
        "votes": 589,
        "boosts": 128,
        "offset_h": 6.8,
        "comments": [
            ("anti_tracker", None, "Confirm legat de baterie. Pe stoc Android 14 consumul în standby era ~1.8%/oră, pe GrapheneOS e sub 0.4%/oră peste noapte.", 76),
            ("fiber_wizard", None, "Cum e cu notificările push când nu rulează Google Services în fundal?", 44),
            ("zero_day", "c-2", "Aplicațiile open-source folosesc UnifiedPush sau WebSockets persistente, iar pentru restul am Sandboxed Play Services cu baterie neoptimizată doar în profilul de lucru.", 62),
            ("pixel_witch", None, "Camera nativă din GrapheneOS e decentă, dar poți instala și Google Camera din Play Store fără permisiune de internet și ai calitatea foto 100% identică cu stocul!", 98),
            ("zero_day", "c-4", "Fix așa am configurat! GCamera cu permisiunea Network tăiată complet la nivel de sistem.", 54),
        ]
    },
    {
        "id": "post-ro-thinkpad-t480-restoration",
        "channel_id": "pulse-global",
        "author": "synth_druid",
        "flair": "HARDWARE RESTORATION",
        "title": "Salvarea și modernizarea unui ThinkPad T480: panou IPS 400 nits low-power, trackpad de sticlă de X1E și răcire dual-heatpipe",
        "content": """ThinkPad T480 rămâne probabil ultimul laptop modular adevărat înainte ca producătorii să lipească totul pe placa de bază. Am cumpărat un exemplar de pe piața second-hand cu 700 RON și l-am transformat într-un workstation mobil impecabil.

### Modificări realizate:
1. **Ecran Innolux N140HCG-GQ2 (400 nits, 100% sRGB, IGZO low-power)** în locul ecranului TN șters de 250 nits. Culorile sunt fantastice și consumă doar 1.4W!
2. **Trackpad de sticlă de ThinkPad X1 Extreme Gen 1**: Înlocuit trackpad-ul de plastic Mylar rugos. Alunecarea pe sticlă e la nivel de MacBook.
3. **Heatsink dual-heatpipe (dGPU version)** montat pe placa de bază cu grafică integrată, plus pastă termoconductoare Honeywell PTM7950. Temperaturile în compilare nu mai depășesc 74°C.
4. **Baterie externă 72Wh (68+)** combinată cu bateria internă de 24Wh: autonomie reală de peste 14 ore în Neovim și terminal!

Rulează [Arch Linux](https://archlinux.org/) cu kernel zen și Sway compositor cu o fluiditate absolut impecabilă.""",
        "images": [
            "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=1200&q=80"
        ],
        "votes": 694,
        "boosts": 182,
        "offset_h": 9.5,
        "comments": [
            ("retro_pixel", None, "T480 e o legendă! Tastatura de pe el e la ani lumină distanță de tastele plate cu cursă de 0.8mm de pe laptopurile noi.", 112),
            ("synth_druid", "c-1", "Așa e, cursa de 1.8mm oferă o precizie incredibilă la tastat cod ore în șir.", 72),
            ("bit_fiddler", None, "PTM7950 chiar face minuni pe procesoarele Intel Gen 8 quad-core, scapă de orice throttling termic pe termen lung.", 58),
            ("dan_gaming", None, "Cât a durat montajul ecranului? A fost nevoie de bracket-uri imprimate 3D?", 42),
            ("synth_druid", "c-4", "Am folosit benzi adezive originale de 2mm și bracket-uri mici din plastic. Nu a durat mai mult de 30 de minute cu grijă la conectorul eDP de 30 pini.", 65),
        ]
    },
    {
        "id": "post-ro-audio-studio-dt990",
        "channel_id": "c/technology",
        "author": "dan_gaming",
        "flair": "AUDIO & HARDWARE",
        "title": "Ghid audio de birou: căști studio open-back Beyerdynamic DT 990 Pro + DAC FiiO K5 Pro vs căștile wireless de gaming",
        "content": """După ce am folosit ani de zile diverse căști 'gaming 7.1' de la branduri populare, am decis să fac pasul către un setup audio dedicat de studio și diferența este de la cer la pământ.

Am optat pentru clasicele [Beyerdynamic](https://www.beyerdynamic.com/) DT 990 Pro (versiunea de 250 Ohmi) alimentate de un amplificator și DAC dedicat FiiO K5 Pro ESS prin USB.

### De ce e o revoluție pentru gaming și muzică?
- **Soundstage deschis (open-back)**: Sunetele nu par că vin din interiorul capului tău, ci din camera în care te afli. În shootere (CS2, Hunt: Showdown), localizarea pașilor pe verticală și orizontală este de o precizie chirurgicală.
- **Fără software bloatware**: Fără drivere greoaie de 500MB care cer conturi online și consumă CPU. DAC-ul e recunoscut instantaneu ca USB Audio Class 2.0 nativ.
- **Confort pe termen lung**: Cupele din velur respiră natural; după 5 ore de purtat nu transpiri deloc și nu există presiune pe timpan datorită designului deschis.
- **Piese de schimb pe viață**: Fiecare șurub, burete sau cablu poate fi comandat separat direct de la producător.

Dacă aveți întrebări despre impedanță sau egalizare prin EqualizerAPO + Peace GUI, răspund cu drag în comentarii!""",
        "images": [
            "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=80"
        ],
        "votes": 521,
        "boosts": 115,
        "offset_h": 12.1,
        "comments": [
            ("sim_rig_racer", None, "Exact același setup îl folosesc în simulatorul de curse! Auzul motorului și al anvelopelor când pierd aderența e incredibil de detaliat.", 78),
            ("synth_druid", None, "DT 990 Pro au faimosul 'Beyer peak' la 6-8kHz. Ai aplicat profilul Oratory1990 în EqualizerAPO pentru a atenua înaltele?", 95),
            ("dan_gaming", "c-2", "Da! Profilul lui Oratory1990 cu -4dB la 5.9kHz face sunetul extrem de cald și plăcut chiar și la sesiuni lungi de ascultat muzică.", 88),
            ("pixel_witch", None, "Pentru microfon ce folosești? Dacă ai căști deschise nu preia microfonul sunetul din căști?", 39),
            ("dan_gaming", "c-4", "Folosesc un microfon dinamic Røde PodMic pe un braț articulat. Datorită capsulei cardioide dinamice, nu captează absolut deloc sunetul din căști chiar și la volum ridicat.", 67),
        ]
    },
    {
        "id": "post-ro-prometheus-grafana-homelab",
        "channel_id": "c/opensource",
        "author": "docker_ninja",
        "flair": "DEVOPS & MONITORING",
        "title": "Monitorizare homelab de la zero: Prometheus, Node Exporter și dashboard Grafana pe un Raspberry Pi 5",
        "content": """O infrastructură fără metrici și telemetrie este ca un avion fără bord de comandă. În weekend am pus la punct o stivă completă de observabilitate pentru serverele de acasă folosind [Prometheus](https://prometheus.io/) și [Grafana](https://grafana.com/).

### Arhitectura implementată:
- **Node Exporter**: Rulează ca serviciu systemd pe fiecare nod fizic (server storage, mini PC de virtualizare, router). Emite metrici brute de CPU, memorie, I/O pe disc și transfer de rețea.
- **cAdvisor**: Monitorizează containerele Docker individuale (consum RAM, CPU throttling, restart loops).
- **Prometheus TSDB**: Centralizatorul time-series care face scrape la fiecare 15 secunde pe rețeaua internă sigură.
- **Grafana v11**: Dashboard unificat cu alerte configurate pe Telegram și Webhook-uri locale.

Consumul total de resurse pe Raspberry Pi 5 este de doar ~350MB RAM și sub 2% utilizare CPU, chiar și cu reținerea istoricului pe 30 de zile stocat pe un SSD NVMe conectat prin PCIe HAT.

Gata cu surprizele în care un disc se umple la 100% noaptea fără avertisment!""",
        "images": [
            "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80"
        ],
        "votes": 495,
        "boosts": 104,
        "offset_h": 15.3,
        "comments": [
            ("void_pointer", None, "Metricile time-series în Prometheus sunt extrem de eficiente cu compresia Gorilla pe float64. Cât spațiu ocupă 30 de zile de date?", 66),
            ("docker_ninja", "c-1", "La un retention de 30 de zile și 4 noduri monitorizate, folderul de date Prometheus are doar 2.8 GB pe disc!", 53),
            ("bit_fiddler", None, "Ai configurat și alerting rules pentru thermal throttling pe CPU?", 41),
            ("docker_ninja", "c-3", "Da, dacă temperatura trece de 80°C mai mult de 3 minute primesc notificare imediată cu link direct către panoul Grafana.", 49),
            ("arch_chad", None, "Recomand și `smartctl_exporter` pentru monitorizat starea SMART a hard disk-urilor (sectoare relocate, temperatură SAS/SATA).", 72),
        ]
    },
    {
        "id": "post-ro-lazyvim-rust-go",
        "channel_id": "c/opensource",
        "author": "neovim_cult",
        "flair": "DEVELOPER TOOLS",
        "title": "Setup Neovim fără dureri de cap: de ce am trecut de la config manual la LazyVim pentru dezvoltare în Rust și Go",
        "content": """Ani de zile mi-am menținut un fișier `init.lua` de 2000 de linii în Neovim, dar de fiecare dată când un plugin schimba API-ul sau apărea o versiune nouă de Tree-sitter, petreceam ore întregi depanând erori de configurare.

Am făcut pasul către [LazyVim](https://lazyvim.org/) și pot spune că este cea mai productivă decizie tehnică luată recent.

### De ce este genial:
- **Timp de pornire sub 25ms**: Datorită lazy-loading-ului agresiv gestionat de `lazy.nvim`, editorul se deschide instantaneu.
- **Extras modulare**: Activezi suportul complet pentru Rust (`rustaceanvim`), Go (`gopls`), Docker și Markdown doar punând `{ import = "lazyvim.plugins.extras.lang.rust" }`.
- **Diagnostic și auto-completion integrat**: `blink.cmp` și `conform.nvim` oferă o experiență de completare de cod mai rapidă decât VS Code fără niciun stutter în fișiere mari.
- **Which-Key nativ**: Apasă tasta spațiu (`<leader>`) și ai la vedere toate combinațiile de taste organizate ierarhic.

Dacă v-a fost teamă să încercați Neovim din cauza complexității de configurare, LazyVim este poarta de intrare perfectă!""",
        "images": [
            "https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=1200&q=80"
        ],
        "votes": 534,
        "boosts": 139,
        "offset_h": 18.0,
        "comments": [
            ("arch_chad", None, "LazyVim este excepțional de bine gândit. În combinație cu Alacritty sau Kitty pe Linux e un vis de viteză.", 83),
            ("void_pointer", None, "Cum se descurcă cu Rust Analyzer în proiecte mari cu sute de crate-uri?", 52),
            ("neovim_cult", "c-2", "Datorită `rustaceanvim` integrat în LazyVim, gestionează standalone ra-multiplex și caching-ul de macro-uri mult mai lin decât pluginurile vechi.", 71),
            ("docker_ninja", None, "Folosești pluginul de Telescope sau fzf-lua pentru căutare de fișiere?", 38),
            ("neovim_cult", "c-4", "`fzf-lua` e implicit acum în LazyVim și e incredibil de rapid pe proiecte cu 50.000 fișiere.", 59),
        ]
    },
    {
        "id": "post-ro-podman-rootless",
        "channel_id": "c/opensource",
        "author": "arch_chad",
        "flair": "LINUX ARCHITECTURE",
        "title": "Tranziția de la Docker la Podman rootless pe Linux: securitate nativă fără daemon și compatibilitate completă cu compose",
        "content": """Rularea unui daemon Docker ca root pe sistemul de producție sau de acasă reprezintă un vector de atac uriaș: orice container breakout oferă direct drepturi de administrator pe host.

Soluția modernă și sigură este [Podman](https://podman.io/) în mod **rootless**.

### Avantajele cheie:
1. **Fără daemon central**: Containerele sunt simple procese ale utilizatorului curent administrate direct de kernel prin cgroups v2 și user namespaces.
2. **Securitate nativă**: UID 0 din interiorul containerului este mapat la un UID neprivilegiat (ex: 1000) pe sistemul gazdă. Dacă un proces sparge containerul, rămâne un simplu utilizator neautorizat.
3. **Integrare completă systemd**: `podman generate systemd` sau noile Quadlets (`.container` files) permit pornirea automată a serviciilor la boot ca unități de utilizator fără sudo.
4. **Podman Compose**: Compatibilitate drop-in cu fișierele existente `docker-compose.yml`.

Am alias-uit `alias docker=podman` în `.bashrc` și tot workflow-ul zilnic a continuat fără nicio fricțiune.""",
        "images": [
            "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=1200&q=80"
        ],
        "votes": 482,
        "boosts": 110,
        "offset_h": 20.4,
        "comments": [
            ("docker_ninja", None, "Quadlets din Podman sunt absolut fantastice! Să definești un container într-un fișier declarativ de tip systemd e mult mai curat decât scripturi shell.", 88),
            ("void_pointer", None, "Cum gestionezi maparea porturilor privilegiate sub 1024 în mod rootless?", 46),
            ("arch_chad", "c-2", "Trebuie setat `net.ipv4.ip_unprivileged_port_start=80` în `/etc/sysctl.d/` și poți expune porturile 80 și 443 fără drepturi de root.", 79),
            ("bit_fiddler", None, "Storage driver-ul implicit este overlay cu fuse-overlayfs?", 37),
            ("arch_chad", "c-4", "Pe kernel-uri moderne (6.6+) funcționează direct native overlayfs în user namespaces, deci performanța de I/O e identică cu Docker nativ.", 63),
        ]
    },
    {
        "id": "post-ro-lora-finetuning-gpu",
        "channel_id": "c/privacy-ai",
        "author": "void_pointer",
        "flair": "MACHINE LEARNING",
        "title": "Fine-tuning local pentru Llama 3 8B pe un singur RTX 3090: LoRA, Unsloth și cuantizare 4-bit fără pierdere de precizie",
        "content": """Antrenarea și adaptarea modelelor de limbaj mari nu mai este rezervată exclusiv centrelor de date enterprise. Cu unelte open-source precum [Unsloth](https://github.com/unslothai/unsloth) și tehnica QLoRA, putem antrena Llama 3 8B direct pe un GPU comercial cu 24GB VRAM.

### Ce am realizat:
Am finetunat un model Llama 3 8B Instruct pe un set de date de 15.000 de perechi întrebare-răspuns tehnice în limba română (legislație fiscală, proceduri de rețea, documentație tehnică).

### Parametrii de antrenament:
- **Metodă**: QLoRA (baza cuantizată în NF4 4-bit, adaptorii LoRA de rang 16 și alpha 32 antrenați în 16-bit).
- **Viteza**: Datorită optimizărilor manuale de kernel Triton din Unsloth, antrenamentul a durat doar 2.5 ore pentru 3 epoci.
- **Consum VRAM**: Sub 14.8 GB VRAM maxim la un batch size de 2 cu gradient accumulation de 4 și lungime de secvență 2048.

Rezultatul: modelul răspunde acum cu diacritice perfecte, terminologie tehnică impecabilă și zero halucinații pe domeniul țintă!""",
        "images": [
            "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=80"
        ],
        "votes": 643,
        "boosts": 165,
        "offset_h": 22.0,
        "comments": [
            ("bit_fiddler", None, "Unsloth are niște optimizări matematice incredibile pentru calculul backpropagation pe RoPE și cross entropy. 2.5 ore e un timp record!", 81),
            ("anti_tracker", None, "După antrenament ai exportat modelul în format GGUF pentru a-l rula în Ollama?", 57),
            ("void_pointer", "c-2", "Da, am fuzionat adaptorul LoRA în modelul de bază și am cuantizat în Q5_K_M. Rulează la 85 tok/s pe același RTX 3090 în Ollama.", 94),
            ("synth_druid", None, "Ai folosit Flash Attention 2 în timpul antrenamentului?", 43),
            ("void_pointer", "c-4", "Da, Flash Attention 2 este esențial pentru a ține consumul de memorie scăzut pe secvențe lungi.", 60),
        ]
    },
    {
        "id": "post-ro-msfs2024-yoke-vr",
        "channel_id": "c/gaming",
        "author": "sim_rig_racer",
        "flair": "FLIGHT SIMULATION",
        "title": "Simulator de zbor la scară 1:1: Microsoft Flight Simulator în VR cu Quest 3 și manșă Honeycomb Alpha",
        "content": """După sute de ore în simulatoare auto, am decis să construiesc un setup dedicat pentru aviație civilă în Microsoft Flight Simulator. Nivelul de imersiune atins cu căștile VR moderne este pur și simplu de neegalat.

### Componentele cockpit-ului:
- **Comenzi de zbor**: Manșă Honeycomb Alpha Flight Controls (mișcare 180° pe axa de ruliu, mecanism complet din oțel) + manetă de gaze Honeycomb Bravo Throttle Quadrant cu autopiloot integrat.
- **Pedale de direcție**: Thrustmaster TFRP Rudder Pedals cu frânare diferențială independentă pe fiecare vârf.
- **Vizual VR**: Meta Quest 3 conectat prin cablu fibră optică USB-C la 960 Mbps bitrate în Oculus Debug Tool. Lentilele pancake elimină complet efectul de 'sweet spot' îngust; poți citi cadranele de pe bord doar mișcând ochii!

Zborul VFR la apus peste Carpați sau aterizarea pe pista 08R de la Otopeni (LROP) cu vânt de travers îți dau fiori reci pe șira spinării. Recomand oricărui pasionat de aviație!""",
        "images": [
            "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80"
        ],
        "votes": 538,
        "boosts": 122,
        "offset_h": 23.5,
        "comments": [
            ("dan_gaming", None, "Lentilele pancake de pe Quest 3 sunt un salt uriaș față de Fresnel-ul de pe Quest 2. Cât ai framerate-ul în aeroporturi mari?", 74),
            ("sim_rig_racer", "c-1", "Cu DLSS pe modul Quality și Virtual Desktop / Link stabilizat stau constant în 72 FPS cu reproiecție asincronă activată.", 63),
            ("retro_pixel", None, "Bravo Throttle e cel mai bun controller de pe piață pentru avioane comerciale cu 2 sau 4 motoare.", 51),
            ("neon_cat", None, "Ai instalat și addon-ul gratuit Fenix A320 sau zbori cu avioane generale de tip Cessna 172?", 44),
            ("sim_rig_racer", "c-4", "Zbor mult cu Cessna 172 cu ceasuri analogice pentru VFR și A320 pentru rute IFR București - Viena.", 69),
        ]
    },
    {
        "id": "post-ro-cyberdeck-portable-diy",
        "channel_id": "pulse-global",
        "author": "retro_pixel",
        "flair": "DIY & HARDWARE",
        "title": "Construcție Cyberdeck portabil: carcasă printată 3D Pelican, Raspberry Pi 5, ecran ultrawide și tastatură mecanică ortoliniară",
        "content": """Am finalizat proiectul la care lucram în ultimele trei luni: un Cyberdeck autonom și rezistent la șocuri, gândit pentru diagnostic de rețea pe teren și lucru offline în natură.

### Specificații tehnice:
- **Carcasă**: Bază rezistentă la apă inspirată de cutiile de protecție Pelican 1150, cu ranforsări printate din filament PETG-CF (fibră de carbon).
- **Procesor**: Raspberry Pi 5 (8GB RAM) răcit activ cu cooler de cupru și montat pe un suport antivibrație.
- **Display**: Ecran ultrawide de 8.8 inch (1920x480 pixeli) conectat prin HDMI la 60Hz. E ideal pentru vizualizat 3 terminale verticale alăturate!
- **Tastatură**: Placă ortoliniară 40% handwired cu switch-uri silențioase Kailh Deep Sea și firmware [QMK](https://qmk.fm/).
- **Alimentare**: Modul de management al bateriei (BMS) cu 4 celule 18650 de mare capacitate (Samsung 35E) oferind 8 ore de funcționare continuă.

Are porturi Ethernet Gigabit native, două porturi USB 3.0 externe și un comutator fizic hardware killswitch pentru WiFi și Bluetooth.""",
        "images": [
            "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80"
        ],
        "votes": 712,
        "boosts": 194,
        "offset_h": 24.2,
        "comments": [
            ("synth_druid", None, "Proiect de nota 10! Layout-ul ortoliniar 40% este genial pentru ergonomie într-o carcasă compactă.", 93),
            ("pixel_witch", None, "Cum ai rezolvat cu balamalele de deschidere ale capacului? Rezistă la deschideri repetate?", 52),
            ("retro_pixel", "c-2", "Am folosit balamale metalice de tip friction-hinge de la un laptop vechi, prinse cu inserții filetate din alamă topite direct în plastic.", 84),
            ("packet_storm", None, "Killswitch-ul hardware pentru radio este o bijuterie pentru oricine apreciază confidențialitatea în deplasare.", 77),
            ("retro_pixel", "c-4", "Exact, taie direct linia de alimentare VCC a cipurilor wireless. Zero emisii RF când lucrezi izolat.", 66),
        ]
    }
]

# CHAT DATA ACROSS MULTIPLE CHANNELS
# (channel_id, author_key, text, offset_minutes_ago)
CHAT_DATA = [
    # 1. PULSE-GLOBAL (35 lively messages covering diverse tech, gaming, homelab, and banter)
    ("pulse-global", "fiber_wizard", "salutare tuturor! cine a mai testat noua versiune de kernel pe servere?", 180.0),
    ("pulse-global", "arch_chad", "rulez 6.11 pe desktop de două zile, driverul amdgpu e foarte stabil", 175.0),
    ("pulse-global", "dan_gaming", "care vă băgați diseară la un Premier în CS2? avem nevoie de încă doi oameni pe lobby", 160.0),
    ("pulse-global", "neon_cat", "mă bag eu pe la 21:00 când termin de configurat monitorul nou", 155.0),
    ("pulse-global", "sim_rig_racer", "ce monitor ți-ai luat până la urmă?", 150.0),
    ("pulse-global", "neon_cat", "un OLED de 27 inch la 360Hz, claritatea în mișcare e altă lume față de vechiul IPS", 145.0),
    ("pulse-global", "synth_druid", "să ai grijă la luminozitatea statică să nu lași taskbar-ul aprins ore în șir", 138.0),
    ("pulse-global", "neon_cat", "am pus auto-hide la taskbar și wallpaper negru pur, arată impecabil", 135.0),
    ("pulse-global", "docker_ninja", "a apărut vreun update la containerele de Traefik v3? am văzut că au adăugat suport nativ pentru plugins fără rebuild", 120.0),
    ("pulse-global", "bit_fiddler", "da, am testat pluginul de crowdsec și funcționează perfect cu Docker socket proxy", 115.0),
    ("pulse-global", "void_pointer", "a testat cineva fine-tuning pe noile ponderi Llama 3.2? variantele de 1B și 3B sunt incredibil de rapide pe CPU", 100.0),
    ("pulse-global", "anti_tracker", "le-am pus pe telefon în Termux cu llama.cpp, scot 28 de tokeni pe secundă pe un Snapdragon 8 Gen 2!", 95.0),
    ("pulse-global", "zero_day", "impresionant, asta înseamnă asistent local complet fără conexiune la internet", 90.0),
    ("pulse-global", "retro_pixel", "am terminat montajul la Cyberdeck-ul portabil, tastele ortoliniare sunt divine", 82.0),
    ("pulse-global", "synth_druid", "felicitări! arată ca un gadget dintr-un film sci-fi din anii 80", 78.0),
    ("pulse-global", "packet_storm", "vreau și eu să-mi fac unul, ai urcat fișierele STL pentru imprimanta 3D?", 72.0),
    ("pulse-global", "retro_pixel", "le urc diseară pe Printables cu licență open-source, vă las link aici", 68.0),
    ("pulse-global", "dan_gaming", "băieți, căștile DT 990 Pro au ajuns, mulțumesc pentru recomandare! sunetul e cristal", 58.0),
    ("pulse-global", "sim_rig_racer", "ți-am zis eu! să le pui profilul de EQ de la Oratory1990 și o să auzi detalii pe care nu le știai în melodiile preferate", 54.0),
    ("pulse-global", "dan_gaming", "gata, am pus EqualizerAPO, se aude fabulos", 50.0),
    ("pulse-global", "godot_tinker", "am lansat primul demo jucabil pe itch.io la jocul 2D făcut în Godot 4.3!", 44.0),
    ("pulse-global", "pixel_witch", "felicitări! îl descarc acum să-l testez pe Steam Deck", 40.0),
    ("pulse-global", "godot_tinker", "merge nativ la 60fps pe Deck, consumă doar 7W bateria", 36.0),
    ("pulse-global", "neovim_cult", "cine mai folosește LazyVim pe aici? am descoperit o comandă genială pentru căutare în buffer-ul curent", 30.0),
    ("pulse-global", "arch_chad", "folosești `<leader>sB`? e preferata mea când caut funcții într-un fișier lung", 26.0),
    ("pulse-global", "neovim_cult", "exact aia! e de zece ori mai rapidă decât scroll manual", 24.0),
    ("pulse-global", "fiber_wizard", "vede cineva vreo cădere de pachete pe Digi în zona centrală?", 18.0),
    ("pulse-global", "bit_fiddler", "la mine în sectorul 3 ping-ul e stabil la 1.2ms către router-ul de ieșire", 15.0),
    ("pulse-global", "fiber_wizard", "gata, era un switch local la mine în bloc, s-a rezolvat", 12.0),
    ("pulse-global", "dan_gaming", "hai cine intră în lobby de CS2, mai avem un singur loc liber!", 8.0),
    ("pulse-global", "neon_cat", "sunt în joc, trimite invite pe Steam!", 6.0),
    ("pulse-global", "sim_rig_racer", "intru și eu ca spectator dacă aveți loc pe Discord/voice", 4.0),
    ("pulse-global", "dan_gaming", "te așteptăm! intră pe canal", 2.0),
    ("pulse-global", "void_pointer", "comunitatea asta crește foarte frumos, discuțiile tehnice de aici sunt aur curat ⚡", 1.0),

    # 2. RELAYS-GENERAL (15 messages)
    ("relays-general", "anti_tracker", "am actualizat lista de filtre Unbound pentru router, am blocat peste 400 de domenii noi de telemetrie", 90.0),
    ("relays-general", "zero_day", "ai inclus și noile servere de diagnostic de la Microsoft folosite de Windows 11?", 85.0),
    ("relays-general", "anti_tracker", "da, le-am preluat din lista actualizată a celor de la NextDNS și le-am adăugat în fișierul local", 80.0),
    ("relays-general", "docker_ninja", "recomand și AdGuard Home ca interfață peste Unbound, are grafice foarte clare pentru fiecare client din casă", 65.0),
    ("relays-general", "synth_druid", "a încercat cineva lubrifierea switch-urilor cu Krytox 205g0? merită timpul investit?", 55.0),
    ("relays-general", "retro_pixel", "100%! diferența de sunet și senzație la degete e incredibilă, dispar toate frecările mecanice", 50.0),
    ("relays-general", "synth_druid", "atunci îmi rezerv sâmbătă după-amiază pentru asta!", 45.0),
    ("relays-general", "pixel_witch", "am găsit o colecție superbă de sprite-uri retro în 16 culori, cine vrea resurse să-mi dea mesaj", 35.0),
    ("relays-general", "godot_tinker", "trimite-mi mie te rog, am nevoie pentru nivelul de temniță din joc!", 30.0),
    ("relays-general", "pixel_witch", "ți-am lăsat link-ul în privat!", 25.0),
    ("relays-general", "dan_gaming", "ce meci strâns am avut, 13-11 pe Inferno în prelungiri!", 15.0),
    ("relays-general", "neon_cat", "clutch-ul tău din runda 22 a salvat tot jocul haha", 12.0),
    ("relays-general", "dan_gaming", "cu căștile noi am auzit exact când a sărit de pe balcon!", 9.0),
    ("relays-general", "fiber_wizard", "hardware-ul bun chiar face diferența când contează milisecundele", 5.0),
    ("relays-general", "void_pointer", "seara bună tuturor! ne auzim mâine la teste", 2.0),

    # 3. RELAYS-DEV (10 messages)
    ("relays-dev", "bit_fiddler", "am verificat interogările pe SQLite în modul WAL: concurența de citire este acum 100% neblocantă", 70.0),
    ("relays-dev", "void_pointer", "exact ce ne trebuia pentru a elimina orice latență la încărcarea feed-ului mare", 65.0),
    ("relays-dev", "neovim_cult", "am trimis un PR mic cu ajustarea formatării pe fișierele de migrare", 50.0),
    ("relays-dev", "docker_ninja", "l-am revizuit, testele de integritate trec impecabil în sub 20 de secunde", 45.0),
    ("relays-dev", "arch_chad", "compilarea Rust cu `mold` linker a redus timpul de linkare de la 12 secunde la 1.4 secunde", 35.0),
    ("relays-dev", "bit_fiddler", "`mold` este incredibil de rapid pe mașini cu multe nuclee, merită folosit peste tot", 30.0),
    ("relays-dev", "void_pointer", "edge worker-ul răspunde acum în 3 milisecunde din POP-ul din București", 20.0),
    ("relays-dev", "fiber_wizard", "conexiunea fibră către Cloudflare OTP este optimă, fără salturi suplimentare prin Frankfurt", 15.0),
    ("relays-dev", "docker_ninja", "toate metricile arată impecabil în Grafana", 8.0),
    ("relays-dev", "void_pointer", "deploy-ul este sincronizat și stabil pe rețeaua suverană UREfy ⚡", 2.0),

    # 4. TECH QUESTIONS & DISCUSSIONS (Mapped to relays-general & pulse-global)
    ("relays-general", "dan_gaming", "întrebare pentru posesorii de AM5: ce temperaturi aveți în idle pe procesoarele din seria 7000/9000?", 80.0),
    ("relays-general", "fiber_wizard", "în jur de 42-45°C în idle este complet normal din cauza grosimii IHS-ului din cupru", 75.0),
    ("relays-general", "dan_gaming", "mulțumesc, mă speriasem că am montat cooler-ul greșit!", 70.0),
    ("relays-general", "neon_cat", "se merită să trec de la Windows 10 la Windows 11 pe PC de gaming?", 60.0),
    ("relays-general", "arch_chad", "dacă ai procesor Intel cu nuclee P și E se merită pentru scheduler; pe AMD 7800X3D diferența e infimă", 55.0),
    ("relays-general", "neon_cat", "am 7800X3D, deci mai rămân liniștit pe 10 încă un an", 50.0),
    ("pulse-global", "synth_druid", "recomandați vreun magazin din Europa pentru piese de tastaturi custom fără taxe vamale mari?", 38.0),
    ("pulse-global", "retro_pixel", "Keygem și Candykeys din Germania au stocuri excelente și transport rapid prin DHL în România", 32.0),
    ("pulse-global", "synth_druid", "excelent, plasez comanda diseară!", 28.0),
    ("pulse-global", "fiber_wizard", "dacă mai are cineva nevoie de sfaturi pentru cablare Cat6A sau prize de rețea, întrebați aici!", 10.0)
]

posts_statements = []
comments_statements = []
chat_statements = []

for p_idx, p in enumerate(POSTS_DATA):
    p_id = p["id"]
    ch = p["channel_id"]
    author_uid = AUTHORS[p["author"]]
    flair = p["flair"]
    title = p["title"]
    content = p["content"]
    images_json = json.dumps(p["images"], ensure_ascii=False)
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
    {sql_esc(images_json)}, NULL, NULL, NULL, NULL,
    'published', {p_created}, 0, NULL, 'public'
);"""
    posts_statements.append(post_stmt)

    comment_id_map = {}
    c_time = p_created
    for c_idx, (c_author_key, parent_ref, c_content, c_votes) in enumerate(p["comments"]):
        c_id = f"comm-ro2-{p_idx+1}-{c_idx+1}"
        comment_id_map[f"c-{c_idx+1}"] = c_id
        
        real_parent_id = None
        if parent_ref and parent_ref in comment_id_map:
            real_parent_id = comment_id_map[parent_ref]

        c_time += random.randint(180, 1200) * 1000 + random.randint(100, 900)
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

for msg_idx, (ch_id, author_key, text, offset_m) in enumerate(CHAT_DATA):
    msg_id = f"msg-ro2-live-{msg_idx+200}"
    author_uid = AUTHORS[author_key]
    msg_time = NOW_MS - int(offset_m * M_MS) + random.randint(50, 900)
    
    chat_stmt = f"""INSERT OR REPLACE INTO messages (
    id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at
) VALUES (
    {sql_esc(msg_id)}, {sql_esc(ch_id)}, {sql_esc(author_uid)},
    {sql_esc(text)}, {sql_esc(f"nonce-ro2-{msg_idx}")}, '#412', 'verified', NULL, {msg_time}
);"""
    chat_statements.append(chat_stmt)

print("=== Romanian Phase 2 Seeder Payload ===")
print(f"Posts: {len(posts_statements)}")
print(f"Comments: {len(comments_statements)}")
print(f"Chat Messages: {len(chat_statements)}")
print("-" * 50)

sections = [
    ("Posts", posts_statements, "seed_p2_posts.sql"),
    ("Comments", comments_statements, "seed_p2_comments.sql"),
    ("Chat Messages", chat_statements, "seed_p2_chat.sql")
]

all_success = True
for name, stmts, filename in sections:
    sql_path = os.path.join(CLIENT_UI_DIR, filename)
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(stmts))
    
    print(f"\n[*] Ingesting {len(stmts)} {name} from {filename}...")
    ok = run_d1_sql_file(filename)
    if os.path.exists(sql_path):
        os.remove(sql_path)
    if not ok:
        all_success = False
        print(f"[!] Failed to ingest {name}")
    else:
        print(f"[+] Successfully ingested {name}")
    time.sleep(1.0)

if all_success:
    print("\n=== PHASE 2 ROMANIAN CONTENT INSERTED SUCCESSFULLY ===")
else:
    print("\n[!] Some sections failed during Phase 2 ingestion.")
