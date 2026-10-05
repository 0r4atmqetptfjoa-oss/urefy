#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/seed_romanian_community_content.py
High-Quality Authentic Romanian Community Content Seeder for UREfy

Features:
- 12 Rich, Authentic Posts in Romanian with Markdown, real links, and high-res Unsplash images.
- 67 Threaded Comments with genuine technical debates, banter, benchmarks, and community interaction.
- 25 Live Chat Messages in Romanian across relays-general and relays-dev.
- Strict mapping to existing verified personas in user_profiles.
- Safe execution directly to Cloudflare D1 remote database 'aetheris-db'.
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

print(f"=== UREfy Romanian Community Content Seeder ===")
print(f"Baseline Timestamp: {NOW_MS} ({time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(NOW_MS/1000))} UTC)\n")

# MAPPING OF VERIFIED USER IDS
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
# DATA DEFINITIONS: 12 RICH POSTS & 67 THREADED COMMENTS
# =============================================================================

POSTS_DATA = [
    {
        "id": "post-ro-undervolt-ryzen",
        "channel_id": "c/technology",
        "author": "fiber_wizard",
        "flair": "OVERCLOCKING",
        "title": "Ghid practic Undervolt & Curve Optimizer pe Ryzen: -15°C și boost prelungit fără pierdere de stabilitate",
        "content": """După o săptămână de teste aprofundate pe platforma AM5, am reușit să stabilizez un profil PBO2 Curve Optimizer care a redus temperaturile în full load de la 84°C la 69°C pe un cooler Noctua NH-D15, menținând un all-core boost la 5.35GHz.

### Setările din BIOS folosite:
* **Precision Boost Overdrive:** Advanced, PBO Limits: Motherboard
* **Curve Optimizer:** Per-Core (nucleele preferate la -20, restul la -28)
* **CPU Boost Clock Override:** +100MHz
* **Scalar:** 1X (pentru a evita degradarea siliciului la tensiuni mari)
* **VSOC:** Fixat manual la 1.20V pentru stabilitatea controlerului de memorie

Pentru verificare riguroasă am rulat 8 ore de monitorizare cu [HWiNFO](https://www.hwinfo.com/) combinat cu CoreCycler și Prime95 Small FFTs. Documentația oficială de la [AMD Precision Boost Overdrive](https://www.amd.com) explică algoritmul termic și curba de frecvență/tensiune.

Dacă aveți întrebări despre setările de latență pentru DDR5 sau stabilitate pe plăci B650/X670, lăsați un reply mai jos!""",
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=80",
                "caption": "Sistemul de testare AM5 cu cooler masiv și monitorizare senzori în timp real",
                "alt": "Procesor AMD Ryzen pe placa de baza cu sistem de racire masiv"
            }
        ],
        "votes": 412,
        "boosts": 65,
        "offset_h": 22.5,
        "comments": [
            ("dan_gaming", None, "Super ghid! La mine pe un 7800X3D am reușit doar -20 all-core, la -25 îmi dădea crash ocazional în CS2 la încărcarea hărții Mirage.", 58),
            ("fiber_wizard", "c-1", "X3D-urile au toleranțe de voltaj mult mai mici din cauza stratului 3D V-Cache care e sensibil termic. -20 all core pe 7800X3D e de fapt un scor excelent!", 84),
            ("arch_chad", None, "Pe Linux se poate monitoriza voltajul per-core foarte curat cu `zenpower3` din AUR. Recomand să rulați și mprime în mod blend pentru test de memorie.", 42),
            ("bit_fiddler", None, "Ai observat vreo diferență la scorul de single-thread în Cinebench R24? Sau câștigul principal e strict pe temperatură și zgomot?", 31),
            ("fiber_wizard", "c-4", "Single-thread a urcat de la 118 la 124 puncte datorită boost-ului de +100MHz care acum se menține stabil pentru că nu mai atinge plafonul termic.", 63),
            ("void_pointer", None, "Faptul că ventilatoarele stau acum la 900 RPM în loc de 1500 RPM e de departe cel mai mare beneficiu pentru liniștea din birou.", 49)
        ]
    },
    {
        "id": "post-ro-cs2-oled-latency",
        "channel_id": "c/gaming",
        "author": "dan_gaming",
        "flair": "ESPORTS & HARDWARE",
        "title": "Am testat un monitor OLED 360Hz în Counter-Strike 2: claritatea mișcării și impactul asupra reflexelor",
        "content": """Am făcut recent saltul de la un panou Fast-IPS de 240Hz la un monitor QD-OLED de 360Hz (timp de răspuns de 0.03ms GTG). Diferența în Counter-Strike 2 la nivel de motion blur și urmărire vizuală când faci fast peek este masivă.

### Ce am observat concret în meciurile Premier:
1. **Zero ghosting și zero overshoot:** Datorită comutării cvasi-instantanee a pixelilor OLED, conturul modelelor inamice rămâne perfect clar chiar și la mișcări bruște de mouse de 180 de grade.
2. **Latență de la click la pixel:** În combinație cu NVIDIA Reflex On+Boost și FPS limitat conform recomandărilor din [Blur Busters Motion Clarity & G-SYNC Guide](https://blurbusters.com/), latența end-to-end de sistem a coborât sub 3.2ms.
3. **Sub-tick și fluiditate:** Deși motorul Source 2 de la [Valve Counter-Strike](https://www.counter-strike.net/) are încă discuții deschise în comunitate, fluiditatea vizuală compensează enorm.

Singurul minus de menționat este text fringing-ul minor pe fonturi mici în Windows din cauza aranjamentului subpixelilor, dar în shootere competitive este de departe cea mai curată imagine pe care am văzut-o vreodată.""",
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
                "caption": "Setup-ul de gaming competitiv CS2 cu monitor 360Hz și iluminare ambientală neutră",
                "alt": "Ecran de gaming performant intr-o camera intunecata cu iluminare ambientala"
            }
        ],
        "votes": 528,
        "boosts": 88,
        "offset_h": 20.0,
        "comments": [
            ("neon_cat", None, "pe bune baa, 360Hz pe OLED sună de vis! Ce placă video folosești să ții 360+ FPS stabil în fumuri pe CS2?", 67),
            ("dan_gaming", "c-1", "Rulez pe un RTX 4080 Super cu rezoluție 1280x960 stretched, setări competitive (low/medium). FPS-ul nu scade niciodată sub 400 chiar și în spawn cu 3 fumuri.", 92),
            ("arch_chad", None, "Dacă joci mult, ai grijă la burn-in pe HUD-ul static de viață și gloanțe. Recomand să folosești pixel refresh automat când iei pauze.", 45),
            ("packet_storm", None, "Ce mouse ai asociat cu ecranul? La 360Hz se simte diferența între 1000Hz polling rate și 4000Hz/8000Hz?", 38),
            ("dan_gaming", "c-4", "Folosesc Razer Viper V3 Pro pe 4000Hz polling rate. Pe 1000Hz se simțeau mici micro-sacadări pe un ecran așa rapid, dar pe 4KHz cursorul e ca o lamă de bisturiu.", 74),
            ("pixel_witch", None, "Confirm, odată ce treci la OLED nu mai există cale de întoarcere la IPS sau VA. Contrastul infinit face ca personajele să iasă în evidență instant.", 51)
        ]
    },
    {
        "id": "post-ro-arch-linux-snapper",
        "channel_id": "c/opensource",
        "author": "arch_chad",
        "flair": "LINUX & SYSADMIN",
        "title": "Arhitectura serverului meu de acasă: Arch Linux + Btrfs Snapshots automate (Snapper) și rollback instant",
        "content": """Mulți administratori evită distribuțiile rolling-release precum Arch Linux de teama că o actualizare periodică de pachete ar putea produce instabilitate. Vreau să vă prezint arhitectura pe care o folosesc de peste 3 ani pe serverul de acasă fără niciun minut de downtime neplanificat.

### Cum funcționează protecția cu Btrfs și Snapper:
* **Structura subvolume:** Partimentul de bază este împărțit în subvolume distincte: `@` pentru sistemul de fișiere root, `@home` pentru date de utilizator, `@var_log` și `@snapshots`.
* **Hook automat la pacman:** La fiecare rulare `pacman -Syu`, un hook din `snap-pac` generează două snapshot-uri automate: unul *pre* și unul *post*.
* **Integrare bootloader:** În cazul rar în care un modul de kernel sau o bibliotecă C se rupe, meniul GRUB afișează toate versiunile anterioare prin `grub-btrfs`. Se poate boota direct în starea funcțională în 5 secunde.
* **Restaurare atomică:** Comanda `snapper rollback` mută snapshot-ul ales ca subvolum activ fără să afecteze fișierele din `/home`.

Ghidul complet din [ArchWiki Snapper Documentation](https://wiki.archlinux.org/title/Snapper) și manualul oficial [Btrfs Kernel Documentation](https://btrfs.readthedocs.io/) descriu fiecare pas de instalare și configurare a politicilor de retenție.""",
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=1200&q=80",
                "caption": "Consola serverului arătând subvolumele Btrfs și snapshot-urile cronologice automate",
                "alt": "Consola Linux pe monitor cu detalii despre sistem si kernel"
            }
        ],
        "votes": 389,
        "boosts": 72,
        "offset_h": 18.2,
        "comments": [
            ("docker_ninja", None, "Excelentă abordare! Cum gestionezi datele din `/var/lib/docker`? Le ții pe un subvolum separat ca să nu umple snapshot-urile?", 64),
            ("arch_chad", "c-1", "Exact! `@docker` și `@var_cache` sunt subvolume excluse din Snapper cu opțiunea `chattr +C` (nodatacow) pentru performanță maximă pe imagini de containere.", 89),
            ("bit_fiddler", None, "Btrfs a evoluat spectaculos în ultimii ani. Lumea încă mai menționează bug-urile vechi de RAID5/6, dar pentru RAID1 sau single drive cu metadata DUP este incredibil de stabil.", 53),
            ("zero_day", None, "Cea mai mare victorie cu Snapper e că poți testa pachete din testing sau staging fără nicio emoție. Dacă s-a rupt ceva, un reboot și gata.", 47),
            ("void_pointer", None, "Recomand și `btrfs-scrub` setat săptămânal prin systemd timer pentru verificare periodică a checksum-urilor împotriva bit rot-ului.", 38),
            ("arch_chad", "c-5", "Absolut, am un timer în systemd care rulează sâmbătă noaptea și trimite notificare pe Discord dacă detectează blocuri corupte.", 41)
        ]
    },
    {
        "id": "post-ro-digi-10g-mikrotik",
        "channel_id": "c/technology",
        "author": "fiber_wizard",
        "flair": "NETWORKING",
        "title": "Implementare rețea 10Gbps în apartament: router MikroTik CCR2004, modul SFP+ și fibră directă Digi",
        "content": """Am finalizat recent instalarea conexiunii simetrice Digi 10G. Pentru că echipamentul standard oferit de operator are capabilități limitate de filtrare firewall și VPN la viteze multi-gigabit, am decis să introduc fibra optică direct într-un router dedicat MikroTik CCR2004-1G-12S+2XS.

### Detalii despre infrastructura fizică:
* **Modul optic SFP+:** Transceiver 10GBASE-LR 1310nm Single-Mode SC/APC la LC conectat direct în portul SFP28.
* **Procesor și rutare:** Procesorul Annapurna Labs Alpine v2 pe 64-biți gestionează transferul de 9.4 Gbps cu FastPath activat la doar 14% încărcare CPU.
* **Switching intern:** Distribuția către stația de lucru și serverul NAS se face prin cabluri DAC (Direct Attach Copper) pasive de 10GbE.
* **Test de performanță:** Transfer susținut pe pachete de 1500 MTU la 9.82 Gbps confirmat cu utilitarul deschis [iPerf3 Network Testing](https://iperf.fr/).

Pentru parametrii de auto-negociere și MTU pe RouterOS v7 consultați [MikroTik RouterOS Documentation](https://help.mikrotik.com/). Temperaturile pe modulul optic nu depășesc 47°C în sarcină maximă.""",
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
                "caption": "Rack-ul de rețea casnic cu patch panel LC, transceivere SFP+ și cabluri DAC de 10GbE",
                "alt": "Rack de servere cu cabluri de fibra optica si echipamente de retea luminate"
            }
        ],
        "votes": 615,
        "boosts": 104,
        "offset_h": 16.0,
        "comments": [
            ("dan_gaming", None, "Cât a durat să vină echipa tehnică pentru instalarea fibrei noi? Au trebuit să tragă alt cablu pe scară?", 45),
            ("fiber_wizard", "c-1", "Au venit în 48 de ore. Pe scară aveau deja tronsonul de fibră monomod de mare densitate, au trebuit doar să schimbe patch-ul din cutia de etaj și să pună mufa SC/APC verde.", 72),
            ("packet_storm", None, "MikroTik CCR2004 e o bestie la banii lui. Rulezi și WireGuard pe el? Ce viteze prinzi printr-un tunel criptat de la distanță?", 56),
            ("fiber_wizard", "c-3", "WireGuard atinge lejer 1.8 - 2.2 Gbps pe un singur fir de execuție, limitat de clientul extern de pe laptop. E mai mult decât suficient pentru orice scenariu de lucru la distanță.", 81),
            ("sim_rig_racer", None, "Viteza asta la descărcat jocuri pe Steam face ca jocurile de 100GB să fie gata până îți torni un pahar de apă haha.", 63),
            ("anti_tracker", None, "Configurația asta combinată cu reguli stricte de raw firewall pe MikroTik e cel mai sigur mod de a naviga pe internetul modern.", 39)
        ]
    },
    {
        "id": "post-ro-local-llm-ollama",
        "channel_id": "c/privacy-ai",
        "author": "void_pointer",
        "flair": "AI & PRIVACY",
        "title": "Cum rulez modele de limbaj 70B local pe 2x RTX 3090: Ollama, vLLM și confidențialitate absolută",
        "content": """Pentru dezvoltatorii care au nevoie de asistență AI avansată la programare și analiză de text, dar lucrează cu cod proprietar sau date confidențiale ce nu pot fi trimise în cloud, soluția optimă în 2026 este un sistem dual-GPU bazat pe două plăci RTX 3090 (48GB VRAM total).

### Structura sistemului și performanțe reale:
* **Engine de inferență:** Folosesc [vLLM Open Source Serving](https://github.com/vllm-project/vllm) cu PagedAttention pentru serverul intern și [Ollama Engine](https://ollama.com/) pentru teste rapide pe stația locală.
* **Model principal:** Llama-3.3-70B-Instruct cuantizat în format GGUF la Q4_K_M (ocupă aproximativ 42.5GB VRAM în memorie).
* **Viteza de generare:** 28 - 33 tokens/secundă pe un context extins de 8.000 tokens, perfect utilizabil în timp real.
* **Integrare IDE:** Conectat ca server OpenAI-compatible la Neovim și extensia Continue.dev din VS Code, funcționând ca o alternativă complet gratuită și suverană la GitHub Copilot.

Toate ponderile deschise pot fi descărcate și inspectate direct din depozitul [Hugging Face Models Directory](https://huggingface.co/). Zero telemetrie, zero date folosite pentru reantrenare externă.""",
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
                "caption": "Sistemul dedicat de inferență AI cu plăci grafice cuplate și flux continuu de generare cod",
                "alt": "Sistem de calcul performant cu iluminare abstracta si circuite integrate"
            }
        ],
        "votes": 490,
        "boosts": 79,
        "offset_h": 14.2,
        "comments": [
            ("neovim_cult", None, "Exact asta căutam! Cum se descurcă la refactoring de TypeScript și Rust? Face greșeli de sintaxă sau e la nivel de Claude 3.5 Sonnet?", 54),
            ("void_pointer", "c-1", "Pe Llama 3.3 70B calitatea logicii este comparabilă cu modelele comerciale de top pentru 95% din task-uri. La cod Rust generează borrow checker annotations foarte curate.", 88),
            ("bio_hacker_x", None, "Ce sursă de alimentare folosești pentru două plăci de 350W? Nu ai vârfuri tranzitorii de putere care să declanșeze protecția OCP?", 41),
            ("void_pointer", "c-3", "Am o sursă Seasonic Prime TX-1300W Titanium cu cabluri PCIe dedicate pentru fiecare conector pe 8 pini. Plăcile au și undervolt la 0.85V, deci consumă maxim 280W fiecare în sarcină.", 71),
            ("pixel_witch", None, "Zero cloud, zero facturi lunare de abonamente de 20$, iar datele rămân în casă. Așa ar trebui să arate tot software-ul modern.", 66),
            ("docker_ninja", None, "L-ai încercat și cu modelul DeepSeek Coder V2? Am auzit că pe Python și Go este incredibil de bun.", 35)
        ]
    },
    {
        "id": "post-ro-pihole-unbound-privacy",
        "channel_id": "c/digitalfreedom",
        "author": "anti_tracker",
        "flair": "CYBERSECURITY",
        "title": "Securitate la nivel de rețea casnică: Unbound Recursive DNS + WireGuard pentru blocat telemetrie și reclame",
        "content": """Majoritatea utilizatorilor lasă rezolvarea numelor de domeniu pe seama furnizorului de internet sau a marilor servicii publice de DNS. Chiar și folosind DoH (DNS over HTTPS), entitatea externă păstrează jurnale complete ale fiecărui server și serviciu pe care îl accesați.

### Soluția pe care o recomand pentru independență digitală:
1. **DNS Recursiv Propriu:** Am instalat daemonul [Unbound DNS Resolver](https://nlnetlabs.nl/projects/unbound/about/) pe un mini-PC cu consum redus (4W). Unbound comunică direct cu serverele rădăcină (Root Name Servers) ale internetului, fără niciun server intermediar.
2. **Filtrare pe bază de reguli:** Traficul trece mai întâi prin [Pi-hole Network-wide Ad Blocking](https://pi-hole.net/), blocând la nivel de IP domeniile de urmărire analitică, publicitate intruzivă și malware.
3. **Protecție mobilă:** Când sunt plecat de acasă, telefonul se conectează automat la un profil de tunel securizat prin protocolul modern [WireGuard](https://www.wireguard.com/).

Statistica după primele 30 de zile: aproximativ 29% din totalul de 65.000 de interogări zilnice au fost încercări de telemetrie de la televizoare smart, asistenți vocali și SDK-uri de reclame de pe mobil, eliminate silențios.""",
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
                "caption": "Consola de statistici de securitate afișând zecile de mii de cereri de telemetrie blocate",
                "alt": "Interfata de securitate cibernetica cu grafice si protectie de date"
            }
        ],
        "votes": 435,
        "boosts": 61,
        "offset_h": 12.0,
        "comments": [
            ("arch_chad", None, "Unbound recursiv e standardul de aur. Dacă adaugi și `qname-minimisation: yes` în config, nu mai transmiți domeniul complet către serverele TLD, ci doar sufixul necesar.", 62),
            ("anti_tracker", "c-1", "Exact, e activat! Protejează foarte mult împotriva profilării pasive la nivelul autorităților de domeniu.", 47),
            ("retro_pixel", None, "Funcționează și pe televizoarele smart cu Android TV sau Tizen? La mine televizorul trimitea mii de cereri către servere de telemetrie pe minut.", 39),
            ("anti_tracker", "c-3", "Funcționează impecabil pentru că televizorul nu știe că e filtrat. Primește pur și simplu un răspuns NXDOMAIN sau 0.0.0.0 și renunță să mai trimită pachete.", 73),
            ("dan_gaming", None, "Nu adaugă latență în jocuri? Un ping mai mare de la rezolvarea DNS-ului?", 28),
            ("anti_tracker", "c-5", "DNS-ul se apelează doar o singură dată când intri pe server, traficul jocului e pe IP direct. În plus, Unbound face cache local în RAM cu timp de răspuns de 0.1ms.", 55)
        ]
    },
    {
        "id": "post-ro-godot4-indie-dev",
        "channel_id": "c/gaming",
        "author": "godot_tinker",
        "flair": "INDIE DEV",
        "title": "Jurnal de dezvoltare: cum am rescris motorul jocului meu 2D în Godot 4.3 și optimizările pentru Steam Deck",
        "content": """După deciziile recente din ecosistemul de dezvoltare, am hotărât să migrez prototipul jocului meu de acțiune și explorare 2D în Godot 4.3. După câteva săptămâni de refactorizare intensă, rezultatele sunt peste așteptări.

### Optimizările cheie realizate pentru Steam Deck (țintă consum 15W TDP):
* **Randare grafică:** Folosim backend-ul Vulkan Mobile cu tilemap lighting optimizat pe layere dinamice.
* **Frecvență de calcul fizic:** Pasul de fizică 2D este setat la 60Hz fix, dar cu interpolarea automată a transformărilor din Godot 4.3, imaginea este perfect fluidă pe ecranul OLED de 90Hz al consolei Valve.
* **Autonomie excepțională:** În conformitate cu recomandările din ghidul oficial [Valve Steam Deck Partner Documentation](https://partner.steamgames.com/), jocul consumă acum doar 6.4W total de pe baterie, permițând aproape 7 ore de joc neîntrerupt.

Motorul [Godot Engine Official](https://godotengine.org/) demonstrează că o echipă mică poate atinge performanțe de nivel profesional folosind unelte deschise. Vă las mai jos un cadru din scena de luptă din peșteră cu iluminare dinamică de particule.""",
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?auto=format&fit=crop&w=1200&q=80",
                "caption": "Spațiul de lucru din Godot 4.3 arătând editorul de animații și arborele de noduri al personajului",
                "alt": "Spatiu de lucru pentru dezvoltarea unui joc video cu pixel art"
            }
        ],
        "votes": 367,
        "boosts": 54,
        "offset_h": 10.5,
        "comments": [
            ("pixel_witch", None, "Paleta de culori și iluminarea arată superb! Ai scris logica în GDScript sau C#?", 48),
            ("godot_tinker", "c-1", "În GDScript pentru 90% din gameplay și noduri de UI, iar pentru sistemul de căutare de drumuri A* pe grid mare am scris un mic modul GDExtension în C++.", 79),
            ("dan_gaming", None, "Are suport nativ pentru controller de Xbox și Steam Deck cu glifoane corecte la butoane (A/B/X/Y)?", 36),
            ("godot_tinker", "c-3", "Da, am integrat pachetul de input remapping care detectează automat tipul de controller și schimbă iconițele în timp real.", 61),
            ("synth_druid", None, "Dacă ai nevoie de compoziție audio ambientală cu sintetizatoare retro pentru coloana sonoră, dă-mi un semn pe privat!", 43)
        ]
    },
    {
        "id": "post-ro-custom-keyboard-build",
        "channel_id": "pulse-global",
        "author": "synth_druid",
        "flair": "CUSTOM BUILD",
        "title": "Construcție tastatură mecanică custom 75%: carcasă din aluminiu CNC, switch-uri Boba U4T și tape mod",
        "content": """Un proiect de atelier finalizat cu succes: o tastatură mecanică personalizată format 75% cu sistem de suspensie pe garnituri (gasket mount), placă flexibilă FR4 și carcasă prelucrată din bloc masiv de aluminiu anodizat.

### Modificările aduse pentru o acustică impecabilă:
* **Switch-uri tactile:** Gazzew Boba U4T cu arcuri de 62g. Fiecare switch a fost dezasamblat manual și lubrifiat cu Krytox 205g0 pe carcasă și GPL 105 pe arcuri pentru a elimina complet sunetul de frecare metalică.
* **Stabilizatoare:** Durock V2 fixate cu șuruburi pe PCB, amortizate cu bandă medicală pe tije (Holee mod).
* **Tratament de rezonanță:** Două straturi de bandă de mascare de hârtie aplicate pe spatele plăcii electronice (Tempest tape mod) și pad-uri din spumă Poron sub tastele lungi.
* **Firmware deschis:** Configurat complet prin [QMK Open Source Firmware](https://qmk.fm/) și ajustat în timp real în browser cu [VIA Keyboard Configurator](https://caniusevia.com/).

Sunetul final la tastare este profund, mat și cărnos ('pure thock'). Vă las o poză din studio cu tastele montate și cablul spiralat din paracord.""",
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80",
                "caption": "Tastatura custom asamblată pe birou cu taste PBT dye-sub și carcasă finisată mat",
                "alt": "Tastatura mecanica eleganta pe un birou de lucru minimalist"
            }
        ],
        "votes": 482,
        "boosts": 69,
        "offset_h": 8.0,
        "comments": [
            ("dan_gaming", None, "Boba U4T sunt probabil cele mai bune switch-uri tactile făcute vreodată. Bump-ul tactil e imediat la începutul cursei, nu ai niciun pic de pre-travel mort.", 52),
            ("synth_druid", "c-1", "Total de acord! Trecerea de la Brown-uri clasice la U4T a fost ca ziua și noaptea. Simți exact momentul de acționare.", 68),
            ("neovim_cult", None, "Arată genial setup-ul! Ce profil au tastele? Pare Cherry sau OEM?", 33),
            ("synth_druid", "c-3", "Profil Cherry clasic din plastic PBT gros de 1.5mm. Rezistă la uzură și nu capătă luciul acela inestetic de la grăsimea degetelor.", 57),
            ("pixel_witch", None, "Cablul aviator spiralat oferă un vibe de studio audio absolut impecabil. Felicitări pentru răbdarea la lubrifiat 84 de switch-uri!", 44)
        ]
    },
    {
        "id": "post-ro-retrogaming-crt-scart",
        "channel_id": "c/gaming",
        "author": "retro_pixel",
        "flair": "RETRO & PRESERVATION",
        "title": "Magia jocurilor clasice pe tub catodic: PS1 și SNES conectate pe un Sony Trinitron prin RGB SCART",
        "content": """Dacă ați conectat vreodată o consolă PlayStation 1 sau Super Nintendo direct pe un televizor modern 4K printr-un adaptor HDMI ieftin, știți cât de plată, pixelată și lipsită de viață devine imaginea.

### De ce monitorul CRT rămâne de neînlocuit pentru semnalul 240p:
1. **Liniile de scanare naturale (scanlines):** Spațiul subtil dintre liniile de fosfor creează o iluzie optică care netezește marginile sprite-urilor și generează detalii pe care artiștii din anii '90 le-au desenat special pentru acest mediu.
2. **Latență absolut zero:** Fără procesoare de upscaling digitale sau buffere de cadre. Fasciculul de electroni atinge sticla în timp real (0.0ms input lag).
3. **Claritate RGB pură:** Folosind un cablu ecranat RGB SCART de la console direct în tub, semnalul ocolește artefactele galbene de compozit și oferă o saturație uimitoare a culorilor.

Pentru cei care vor o experiență similară pe monitoare moderne fără să transporte un tub de 30 de kilograme, procesoarele video dedicate de la [RetroTINK Official](https://www.retrotink.com/) sau plăcile de emulare hardware [MiSTer FPGA Project](https://mister-devel.github.io/) sunt opțiunile de referință în comunitate.""",
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
                "caption": "Ecranul Sony Trinitron redând un nivel din Super Mario World cu scanlines autentice",
                "alt": "Ecran retro CRT stralucind cu grafica jocurilor clasice din anii 90"
            }
        ],
        "votes": 512,
        "boosts": 83,
        "offset_h": 6.2,
        "comments": [
            ("arch_chad", None, "Trinitron-ul cu grilă de apertură (aperture grille) este o capodoperă a ingineriei optice. Calitatea culorilor pe fosfor bate multe panouri LCD moderne ieftine.", 61),
            ("retro_pixel", "c-1", "Exact, negrele sunt adânci și nu există niciun fel de sample-and-hold blur la scroll orizontal rapid.", 49),
            ("godot_tinker", None, "Când desenez pixel art pentru jocurile mele, testez mereu pe un shader CRT cu simulare de mască de fosfor ca să verific dacă detaliile se îmbină corect.", 55),
            ("dan_gaming", None, "Am jucat Tekken 3 săptămâna trecută pe un CRT similar. Timpul de reacție la block pe comenzi este incredibil de direct.", 42),
            ("pixel_witch", None, "Nostalgie pură! Sunetul acela specific de încărcare al tubului la pornire e de neuitat.", 38)
        ]
    },
    {
        "id": "post-ro-sim-racing-direct-drive",
        "channel_id": "c/gaming",
        "author": "sim_rig_racer",
        "flair": "SIM RACING",
        "title": "Ghid de tranziție Sim Racing: setarea unui volan Direct Drive 12Nm și telemetrie live în Assetto Corsa",
        "content": """Trecerea de la un volan de gaming entry-level pe curea la o bază profesională cu motor Direct Drive conectat direct la coloana de direcție schimbă complet percepția asupra condusului sportiv virtual.

### Configurația mea hardware și setările software:
* **Baza de direcție:** Motor industrial Direct Drive de 12Nm cuplat rigid pe un șasiu din profile grele de aluminiu 80x40mm.
* **Sistem de frânare:** Pedalier cu senzor Load Cell de 100kg. În sim racing nu frânezi după cursa pedalei, ci după memoria musculară a presiunii aplicate pe cilindru.
* **Telemetrie în timp real:** Tablou de bord configurat pe un mic ecran auxiliar prin intermediul aplicației [SimHub Telemetry Dashboard](https://www.simhubdash.com/) pentru temperaturile anvelopelor și presiuni.
* **Force Feedback curat:** Fără filtre artificiale de frecare sau amortizare din soft, permițând fizicii din simulatorul [Assetto Corsa Official](https://assettocorsa.gg/) să transmită fidel fiecare pierdere de aderență a punții față.

Dacă vă construiți un cockpit sau aveți nevoie de profile de calibrare pentru GT3 și prototipuri pe circuite celebre, scrieți mai jos!""",
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
                "caption": "Cockpit-ul de sim racing cu volan din Alcantara, pedale load cell și ecran de telemetrie",
                "alt": "Cockpit sim racing profesional cu volan sport si ecrane panoramice"
            }
        ],
        "votes": 374,
        "boosts": 49,
        "offset_h": 4.5,
        "comments": [
            ("dan_gaming", None, "La 12Nm dacă scapi volanul într-un zid pe Nürburgring îți poate rupe degetele la propriu haha. Ai buton de emergency stop la îndemână?", 57),
            ("sim_rig_racer", "c-1", "Da, am butonul mare roșu de E-Stop prins direct de profilul lateral. E o măsură obligatorie de siguranță peste 10Nm de cuplu.", 82),
            ("fiber_wizard", None, "Pedalele load cell sunt cel mai mare salt de performanță pe turul de circuit. Câștigi lejer o secundă întreagă doar din consistența pe frânare.", 46),
            ("sim_rig_racer", "c-3", "100%! Cu pedale potențiometru frânezi la ghici, cu load cell știi exact când ești la 80% presiune înainte de pragul de blocare a roților.", 63),
            ("packet_storm", None, "Ce monitor folosești pentru FOV corect? Triple screen sau cască VR?", 31),
            ("sim_rig_racer", "c-5", "Momentan un monitor ultrawide de 49 inch pe 240Hz, dar plănuiesc un setup triple de 32 inch pentru vedere periferică completă în viraje.", 45)
        ]
    },
    {
        "id": "post-ro-traefik-docker-homelab",
        "channel_id": "c/opensource",
        "author": "docker_ninja",
        "flair": "DEVOPS & CLOUD",
        "title": "Homelab simplificat: Traefik v3 cu Docker labels și certificate SSL automate Let's Encrypt",
        "content": """Dacă administrați pe serverul personal mai mult de 5 servicii containerizate (Nextcloud, Vaultwarden, Grafana, Home Assistant, Gitea etc.), rescrierea manuală a fișierelor de configurare din Nginx la fiecare container devine rapid obositoare.

### De ce Traefik este soluția ideală pentru micro-servicii casnice:
* **Auto-Discovery:** Traefik comunică direct cu socket-ul Docker (`/var/run/docker.sock`) și detectează automat pornirea sau oprirea oricărui container.
* **Configurare prin etichete:** Tot ce trebuie să faceți este să adăugați câteva etichete declarative în fișierul `docker-compose.yml` al fiecărui serviciu.
* **Certificate SSL pe domenii multiple:** Traefik solicită, configurează și reînnoiește automat certificate de criptare valide de la autoritatea [Let's Encrypt](https://letsencrypt.org/) folosind validarea prin provocare DNS.
* **Securitate sporită:** Middleware-ul permite adăugarea instantanee de protecție rate-limiting, headers de securitate HSTS și autentificare cu doi factori înainte de accesarea oricărei aplicații.

Exemplele complete de fișiere de compunere sunt explicate pe larg în ghidul [Traefik Proxy Official Documentation](https://doc.traefik.io/traefik/).""",
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
                "caption": "Panoul de control Traefik monitorizând routerele, middleware-urile și serviciile active",
                "alt": "Infrastructura de servere cu activitate de retea si servicii containerizate"
            }
        ],
        "votes": 418,
        "boosts": 58,
        "offset_h": 2.8,
        "comments": [
            ("arch_chad", None, "Super elegant! Cum protejezi socket-ul `/var/run/docker.sock` de acces neautorizat din interiorul containerului Traefik?", 51),
            ("docker_ninja", "c-1", "Folosesc un container proxy intermediar (`tecnativa/docker-socket-proxy`) care expune doar API-ul read-only de inspectare containere, blocând orice operațiune de scriere sau execuție.", 87),
            ("anti_tracker", None, "Recomand să adăugați și middleware-ul `crowdsec` în lanțul Traefik pentru a bana automat adresele IP malițioase care scanează porturile expuse.", 43),
            ("docker_ninja", "c-3", "Mulțumesc de pont, CrowdSec e pe lista de implementare pentru weekendul viitor!", 38),
            ("void_pointer", None, "Dashboard-ul Traefik este incredibil de curat pentru depanare când un serviciu returnează 502 Bad Gateway.", 35)
        ]
    },
    {
        "id": "post-ro-sqlite-wal-mode",
        "channel_id": "c/technology",
        "author": "bit_fiddler",
        "flair": "ARCHITECTURE",
        "title": "De ce SQLite în modul WAL este alegerea optimă pentru 90% din aplicațiile web moderne",
        "content": """În comunitatea de dezvoltare software există adesea tendința de a instala containere greoaie de baze de date precum PostgreSQL sau MySQL chiar și pentru proiecte interne sau aplicații cu sub 100.000 de cereri zilnice.

### Avantajele reale ale unui motor SQLite bine optimizat:
1. **Zero latență de rețea:** Într-o bază tradițională client-server, fiecare apel SQL presupune serializare de date, trimitere pe socket TCP și decodare (0.5ms - 2ms overhead per query). SQLite rulează în spațiul de memorie al procesului tău: un apel durează sub 5 microsecunde.
2. **Modul WAL (Write-Ahead Logging):** În mod tradițional SQLite bloca fișierul la scriere. Cu jurnalul WAL activat, cititorii nu mai blochează niciodată scriitorii, iar scriitorii nu întrerup fluxul de citire concurentă.
3. **Randament incredibil:** Pe un SSD modern NVMe, o instanță SQLite în mod WAL poate atinge fără probleme peste 60.000 de interogări de citire pe secundă pe un singur nod hardware.

Mecanismul de checkpointing și parametrii de performanță sunt descriși în detaliu în manualul oficial [SQLite Write-Ahead Logging](https://www.sqlite.org/wal.html).""",
        "images": [
            {
                "url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
                "caption": "Test de performanță și grafice de execuție concurentă pe baza de date SQLite",
                "alt": "Cod sursa si metrice de performanta pe monitor de programare"
            }
        ],
        "votes": 546,
        "boosts": 93,
        "offset_h": 1.1,
        "comments": [
            ("arch_chad", None, "Complet adevărat! SQLite este probabil cel mai testat și stabil software din istoria calculatoarelor. E folosit în orice telefon, browser și avion modern.", 73),
            ("void_pointer", None, "Cloudflare D1 pe care rulează UREfy este construit exact pe fundamentul SQLite distribuit la marginea rețelei (Edge). De aceea răspunsurile vin în sub 1ms.", 85),
            ("bit_fiddler", "c-2", "Exact! Viteza pe D1 provine din lipsa unui server SQL intermediar greoi. Totul este executat nativ în isolate-ul Cloudflare.", 67),
            ("docker_ninja", None, "Pentru backup continuu recomand utilitarul `litestream`. Face streaming de cadre WAL direct în S3 sau Cloudflare R2 în timp real cu RPO de câteva secunde.", 44),
            ("bit_fiddler", "c-4", "Litestream e fantastic, îl folosesc în producție pe câteva microservicii și funcționează fără cusur de 2 ani.", 52),
            ("neovim_cult", None, "Iar faptul că toată baza de date e un singur fișier `.sqlite` pe care îl poți copia pe laptop pentru teste locale în 2 secunde este un lux incredibil.", 61)
        ]
    }
]

# =============================================================================
# LIVE CHAT MESSAGES IN ROMANIAN (relays-general & relays-dev)
# =============================================================================

CHAT_DATA = [
    ("relays-general", "dan_gaming", "salutare băieți! e cineva pe CS2 diseară? avem nevoie de +1 pentru un meci pe Premier 18k elo", 55.0),
    ("relays-general", "arch_chad", "mă bag eu dan, dar sper că nu joci iar pe 60Hz ca data trecută lol", 53.5),
    ("relays-general", "dan_gaming", "am monitor nou de 360Hz acum băieți, nu mai există nicio scuză de input lag 🚀", 52.0),
    ("relays-general", "neon_cat", "ce panou ai luat? OLED sau Fast-IPS?", 50.8),
    ("relays-general", "dan_gaming", "QD-OLED-ul nou, e diferență de la cer la pământ la motion clarity când tragi în mișcare pe lung la Dust 2", 49.2),
    ("relays-general", "fiber_wizard", "niceee! ce ping ai pe serverele de Frankfurt de pe Digi?", 47.5),
    ("relays-general", "dan_gaming", "fix 22-24ms constant pe cablu, zero packet loss de când au refăcut rutarea externă", 46.0),
    ("relays-general", "neon_cat", "pe bune baa, Digi la net chiar n-are rival în Europa la prețul ăsta", 44.5),
    ("relays-general", "void_pointer", "a încercat cineva noul model Llama 3.3 local pe Ollama?", 40.0),
    ("relays-general", "neovim_cult", "da, l-am pus pe stația de lucru, scoate 30 tok/s pe 70B la 4-bit, e genial pentru refactoring de cod în Neovim", 38.5),
    ("relays-general", "void_pointer", "merge și pe o singură placă video dacă iei varianta de 8B, consumă sub 6GB VRAM și e foarte rapid", 37.0),
    ("relays-general", "fiber_wizard", "gata băieți, am urcat postul complet cu setările de PBO2 pe AM5, dacă vreți să scădeți 15 grade la procesor aruncați un ochi pe c/technology", 32.0),
    ("relays-general", "dan_gaming", "chiar aveam nevoie, al meu sărea în 85 de grade în Cinebench pe aer, o să testez profilul diseară!", 30.5),
    ("relays-general", "synth_druid", "face cineva comenzi de switch-uri de tastatură mecanice săptămâna asta?", 25.0),
    ("relays-general", "pixel_witch", "iau eu niște Boba U4T tactile, dacă vrei împărțim transportul", 23.5),
    ("relays-general", "synth_druid", "perfect, dă-mi un ping pe privat să stabilim lista de piese!", 22.0),
    ("relays-general", "retro_pixel", "am găsit un Sony Trinitron impecabil pe Olx cu tub de 21 inch, imaginea pe SCART RGB e magie pură", 18.0),
    ("relays-general", "godot_tinker", "ce tare! exact genul de referință de care am nevoie pentru testat shader-ul de iluminare în joc", 16.5),
    ("relays-general", "dan_gaming", "hai pe voice cine e liber, intrăm în lobby de încălzire!", 10.0),
    ("relays-general", "neon_cat", "intru acum, pornesc jocul!", 8.5),
    ("relays-dev", "void_pointer", "avem confirmare că D1 execută acum interogările în sub-milisecundă datorită indexării pe created_at", 45.0),
    ("relays-dev", "bit_fiddler", "da, timpii pe `/api/posts` au scăzut de la 45ms la 4ms median pe Edge POP-ul din București (OTP)", 42.0),
    ("relays-dev", "arch_chad", "excelent, fără roundtrips inutile tot feed-ul se încarcă instantaneu", 35.0),
    ("relays-dev", "docker_ninja", "am sincronizat și containerele de test, totul e verde în CI", 20.0),
    ("relays-dev", "void_pointer", "deploy-ul de producție rulează impecabil pe rețeaua suverană UREfy ⚡", 5.0)
]

# =============================================================================
# BUILD SQL STATEMENTS
# =============================================================================

posts_statements = []
comments_statements = []
chat_statements = []

# 1. POSTS & COMMENTS
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

    # Threaded comments
    comment_id_map = {}
    c_time = p_created
    for c_idx, (c_author_key, parent_ref, c_content, c_votes) in enumerate(p["comments"]):
        c_id = f"comm-ro-{p_idx+1}-{c_idx+1}"
        comment_id_map[f"c-{c_idx+1}"] = c_id
        
        real_parent_id = None
        if parent_ref and parent_ref in comment_id_map:
            real_parent_id = comment_id_map[parent_ref]

        c_time += random.randint(180, 1500) * 1000 + random.randint(100, 900)
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

# 2. LIVE CHAT MESSAGES
for msg_idx, (ch_id, author_key, text, offset_m) in enumerate(CHAT_DATA):
    msg_id = f"msg-ro-live-{msg_idx+100}"
    author_uid = AUTHORS[author_key]
    msg_time = NOW_MS - int(offset_m * M_MS) + random.randint(50, 900)
    
    chat_stmt = f"""INSERT OR REPLACE INTO messages (
    id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at
) VALUES (
    {sql_esc(msg_id)}, {sql_esc(ch_id)}, {sql_esc(author_uid)},
    {sql_esc(text)}, {sql_esc(f"nonce-ro-{msg_idx}")}, '#412', 'verified', NULL, {msg_time}
);"""
    chat_statements.append(chat_stmt)

# =============================================================================
# EXECUTE SEEDING INTO D1 REMOTE DATABASE
# =============================================================================

print(f"Generated:")
print(f"  • {len(posts_statements)} Posts")
print(f"  • {len(comments_statements)} Comments")
print(f"  • {len(chat_statements)} Chat Messages")
print("-" * 50)

all_sql = "\n\n".join([
    "-- === 1. POSTS ===",
    "\n".join(posts_statements),
    "-- === 2. COMMENTS ===",
    "\n".join(comments_statements),
    "-- === 3. CHAT MESSAGES ===",
    "\n".join(chat_statements)
])

sql_file_path = os.path.join(CLIENT_UI_DIR, "temp_seed_romanian_content.sql")
with open(sql_file_path, "w", encoding="utf-8") as f:
    f.write(all_sql)

print(f"[*] Saved SQL payload to {sql_file_path} ({len(all_sql.encode('utf-8'))} bytes)")
print("[*] Ingesting SQL payload into Cloudflare D1 'aetheris-db'...")

success = run_d1_sql_file("temp_seed_romanian_content.sql")

if os.path.exists(sql_file_path):
    os.remove(sql_file_path)

if success:
    print("\n=== ALL ROMANIAN CONTENT INSERTED SUCCESSFULLY ===")
else:
    print("\n[!] Error occurred during D1 execution.")

