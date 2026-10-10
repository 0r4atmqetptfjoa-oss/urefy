import json
import subprocess
import time
import uuid
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def esc_sql_str(s):
    if s is None:
        return "NULL"
    lines = s.replace('\r\n', '\n').split('\n')
    escaped_lines = [f"'{line.replace("'", "''")}'" for line in lines]
    return " || char(10) || ".join(escaped_lines)

def esc_single(s):
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"

def execute_batch(statements, batch_name):
    temp_file = "scripts/temp_batch.sql"
    with open(temp_file, "w", encoding="utf-8") as f:
        f.write("\n".join(statements))
    
    cmd = [
        "npx.cmd", "wrangler", "d1", "execute", "aetheris-db", "--remote",
        f"--file={temp_file}"
    ]
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding="utf-8", errors="replace", cwd="d:\\proiect site total")
    if p.returncode != 0:
        print(f"[{batch_name}] Error executing batch:")
        if p.stderr:
            print(p.stderr[:500])
        return False
    print(f"[{batch_name}] Successfully executed {len(statements)} statements.")
    return True

def main():
    now_ms = int(time.time() * 1000)

    # 1. NEW POSTS (11 Posts)
    posts = [
        {
            "id": "post-en-gta6-leonida-physics-engine",
            "channel_id": "c/gaming",
            "author_id": "8a31b402ef19", # DanGaming
            "author_role": "MEMBER",
            "title": "Grand Theft Auto VI: Deep Dive into the Leonida Map Scale, Water Physics Simulation & Euphoria Ragdoll Overhaul",
            "content": """Rockstar Games has set a standard that very few studios can even comprehend, but the leaked telemetry and official trailer footage of Grand Theft Auto VI confirm that RAGE 9 is doing things with real-time fluid simulation and skeletal kinematics that redefine AAA gaming.

### 1. Dynamic Fluid Simulation & Wave Mechanics
Unlike GTA V's pre-baked wave displacement shaders, GTA VI implements true volumetric Euler fluid grids for the coastal waters of the Florida Keys and Ocean Beach. Wave breaks interact dynamically with vehicle hulls, pier structures, and character physics. When an offshore speedboat accelerates, the wake leaves sustained turbulence and foam dissipation particles computed on GPU compute shaders.

### 2. The Next Generation of Euphoria Physics
Remember the transition from GTA IV to GTA V where physics felt slightly simplified for seventh-gen console memory budgets? GTA VI swings the pendulum completely in the other direction. Every NPC limb features independent muscle impulse resistance. If a pedestrian is clipped by a bumper at 20 mph, they stumble, attempt to regain center of mass against guardrails, and react with authentic biomechanical inertia rather than generic ragdoll flopping.

### 3. World Scale: Leonida vs. Los Santos
The coordinate analysis from the community mapping project confirms the state of Leonida spans over 2.7 times the landmass of Los Santos and Blaine County combined. More importantly, urban interior density has increased by over 350%: shopping centers, hotel lobbies, gas station convenience marts, and pawn shops are seamlessly accessible with zero loading transitions.

What are your hardware performance expectations? Are you expecting an uncompromising 30 FPS console lock or can PSSR on PS5 Pro pull off a 45-60 FPS performance mode?""",
            "flair": "TECHNICAL BREAKDOWN",
            "merit_votes": 84,
            "user_voted": 1,
            "reply_count": 8,
            "boost_count": 29,
            "video_json": json.dumps({
                "src": "https://www.youtube.com/watch?v=QdBZY2fkU-0",
                "poster": "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80"
            }),
            "images_json": json.dumps([
                "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=1200&q=80"
            ]),
            "created_at": now_ms - 1000 * 60 * 60 * 18
        },
        {
            "id": "post-en-ghost-of-yotei-ronin-evolution",
            "channel_id": "c/gaming",
            "author_id": "14e92a8819bb", # PixelWitch
            "author_role": "MEMBER",
            "title": "Ghost of Yōtei Unveiled: Atsu's Journey in 1603 Ezo, Dual-Katana Stances & Sucker Punch's Grass Engine Evolution",
            "content": """Sucker Punch blew everyone away with the reveal of Ghost of Yōtei. Leaving Jin Sakai's legendary saga in Tsushima behind was a bold narrative gamble, but jumping forward over 300 years to 1603 around Mount Yōtei in Hokkaido (then known as Ezo) is historically brilliant.

### 1. Dual-Wielding & New Weapon Archetypes
The reveal trailer showcased Atsu brandishing two katanas simultaneously, alongside a traditional shamisen and a kusarigama. In 1603, Japan had just emerged from the Sengoku Jidai following the Battle of Sekigahara. Ezo was outside the direct control of the Tokugawa shogunate, a rugged frontier with ronin, lawless mercenaries, and indigenous Ainu communities. Combat will clearly emphasize speed, counter-parry chains, and asymmetrical stance transitions.

### 2. Graphical Prowess: Custom Procedural Wind & Foliage
Ghost of Tsushima already pushed PS4 silicon to its absolute limit with its dynamic wind guidance mechanics. For Yōtei, Sucker Punch built an entirely new procedural vegetation engine native to the PlayStation 5 architecture. Grass blades feature individual sub-surface scattering and wind deflection vectors, while the snow-capped silhouette of Mount Yōtei looms in the background with real-time volumetric atmospheric fog.

Are you excited for the shift to a fresh protagonist, or were you hoping for a direct continuation of Jin's clan?""",
            "flair": "REVEAL ANALYSIS",
            "merit_votes": 72,
            "user_voted": 1,
            "reply_count": 6,
            "boost_count": 21,
            "video_json": json.dumps({
                "src": "https://www.youtube.com/watch?v=sLcksHR30UA",
                "poster": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80"
            }),
            "images_json": json.dumps([
                "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80"
            ]),
            "created_at": now_ms - 1000 * 60 * 60 * 16
        },
        {
            "id": "post-en-doom-the-dark-ages-idtech8",
            "channel_id": "c/gaming",
            "author_id": "7f8a910c2b44", # ArchChad
            "author_role": "ADMIN",
            "title": "DOOM: The Dark Ages Technical Breakdown: idTech 8 Innovations, Shield Saw Mechanics & Heavy Metal Medieval Lore",
            "content": """id Software never misses. When Hugo Martin and Marty Stratton took the stage to announce DOOM: The Dark Ages, they didn't just announce a prequel; they introduced a profound philosophical shift in modern FPS pacing.

### 1. From Aerial Acrobatics to Ground-Pounding Tank Combat
While DOOM Eternal was an ultra-fast vertical ballet of dashes, monkey bars, and meat-hooks, The Dark Ages plants the Slayer firmly on terra firma like a relentless walking siege engine. You are an unstoppable cosmic juggernaut. 

### 2. The Shield Saw & Skull Crusher Gun
The weapon sandbox is pure heavy metal poetry:
- The Saw Shield: Can be thrown to decapitate demons, deflected against projectile fire, or used as a motorized melee chainsaw to chew through armored Revenants.
- Skull Grinder Weapon: Feeds on the crushed skulls of demons to fire high-velocity bone shrapnel clusters.
- Flail & Mecha Mounts: Giant Atlan mech warfare and cybernetic dragon flight combat.

### 3. idTech 8 Vulkan Engine
Under the hood, idTech 8 utilizes bindless GPU-driven rendering pipelines that can push ten times more simultaneous demon meshes onto the screen than idTech 7. There is zero reliance on pre-baked lighting: full ray-traced shadows and ambient occlusion run smoothly at locked 60+ FPS on contemporary hardware.

This is exactly what the FPS genre needed. Who else is ready to rip and tear through the cosmic dark ages?""",
            "flair": "ENGINE ANALYSIS",
            "merit_votes": 95,
            "user_voted": 1,
            "reply_count": 7,
            "boost_count": 38,
            "video_json": json.dumps({
                "src": "https://www.youtube.com/watch?v=4tk8lkmYGWQ",
                "poster": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80"
            }),
            "images_json": json.dumps([
                "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1533158307587-828f0a76ef46?auto=format&fit=crop&w=1200&q=80"
            ]),
            "created_at": now_ms - 1000 * 60 * 60 * 15
        },
        {
            "id": "post-en-kingdom-come-deliverance-2-review",
            "channel_id": "c/gaming",
            "author_id": "3c91a4e082aa", # void_pointer
            "author_role": "MEMBER",
            "title": "Kingdom Come: Deliverance II Hands-On Impressions: Kuttenberg Urban Life, Physics-Based Crossbows & Brutal Historical Combat",
            "content": """Warhorse Studios has doubled their scope for Kingdom Come: Deliverance II. Henry of Skalitz is back, but the transition from muddy rural hamlets to the sprawling gothic metropolis of Kuttenberg transforms this into the definitive medieval historical simulation.

### 1. Kuttenberg: A Truly Living 15th Century City
Kuttenberg was the silver-mining capital of the Kingdom of Bohemia. The sheer scale of townspeople routines, blacksmith guilds, cathedral construction, and market stall commerce running on CryEngine / custom Warhorse shaders is staggering. NPCs react realistically to Henry's hygiene, bloodstained gambesons, and stolen armaments.

### 2. Weapons Arsenal: Crossbows & Early Gunpowder Handgonnes
For the first time, players can wield period-accurate crossbows and rudimentary handgonnes. The ballistics feel punchy and lethal: armor deflection calculations mean firing a lead ball into a full plate harness might ricochet if the impact angle is oblique, while a point-blank torso shot will shatter mail and brigandine instantly.

### 3. Combat Polishing
The directional five-point sword combat from KCD1 has been refined: master strikes are less oppressive to face, combo timings are crisper, and blacksmithing mini-games let you forge custom blade alloys and temper edges.

If you loved the uncompromising historical fidelity of the first game, KCD2 feels like an absolute dream come true.""",
            "flair": "DEEP REVIEW",
            "merit_votes": 68,
            "user_voted": 1,
            "reply_count": 5,
            "boost_count": 19,
            "video_json": json.dumps({
                "src": "https://www.youtube.com/watch?v=bjMnS7_u1Qg",
                "poster": "https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&w=1200&q=80"
            }),
            "images_json": json.dumps([
                "https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1533158307587-828f0a76ef46?auto=format&fit=crop&w=1200&q=80"
            ]),
            "created_at": now_ms - 1000 * 60 * 60 * 14
        },
        {
            "id": "post-en-death-stranding-2-decima-analysis",
            "channel_id": "c/gaming",
            "author_id": "2d89b14c99a0", # NeonCat
            "author_role": "MEMBER",
            "title": "Death Stranding 2: On The Beach Analysis: Decima Engine Photorealism, Dynamic Flash Floods & Kojima's Bleak Future",
            "content": """Nobody makes trailers quite like Hideo Kojima. The 9-minute reveal trailer for Death Stranding 2: On The Beach isn't just a cinematic masterclass; it's a staggering technical showcase of Guerrilla Games' Decima Engine running on modern PlayStation hardware.

### 1. Dynamic Natural Disasters & Terrain Deformation
In the first game, terrain was static: you navigated around rocks, snow banks, and rivers. In DS2, terrain is violently active. Real-time earthquakes, flash floods, landslides, and forest fires alter pathing dynamically. If a flash flood hits a river canyon while you are transporting chiral network supplies, the water current will sweep away bridges and force you to improvise rope climbers or hover-drives.

### 2. The DHV Magellan & The Puppeteer
The mobile operational base DHV Magellan (which surfaces from tar pools) acts as a portable command hub. Characters like the talkative stop-motion animated Puppet (voiced by Fatih Akin) and Elle Fanning's mysterious character elevate the bizarre, poetic, and surreal tone that Kojima thrives in.

### 3. Decima Engine Lighting & Performance
Character skin rendering, sweat micro-droplets, and dynamic cloud formations demonstrate the pinnacle of real-time rasterization and Ray-Traced Global Illumination without hitching. 

Are you ready to strap the boots back on and reconnect a fractured world?""",
            "flair": "STORY & TECH",
            "merit_votes": 79,
            "user_voted": 1,
            "reply_count": 6,
            "boost_count": 27,
            "video_json": json.dumps({
                "src": "https://www.youtube.com/watch?v=etOOO9Sq7u8",
                "poster": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80"
            }),
            "images_json": json.dumps([
                "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80"
            ]),
            "created_at": now_ms - 1000 * 60 * 60 * 13
        },
        {
            "id": "post-en-metroid-prime-4-beyond-breakdown",
            "channel_id": "c/gaming",
            "author_id": "88b4012ce9fa", # RetroPixel
            "author_role": "MEMBER",
            "title": "Metroid Prime 4: Beyond - First Look Analysis: Planet Viewros Isolation, Psychic Visor Modes & Retro Studios' Art Mastery",
            "content": """After seven long years of development resets and silence, Retro Studios finally showed gameplay for Metroid Prime 4: Beyond. Seeing Samus Aran step out of her iconic gunship into the lush alien biosphere of Planet Viewros gave every classic GameCube fan immediate chills.

### 1. Retro Studios' Signature First-Person Immersion
The tactile environmental details are front and center: condensation dripping down Samus's visor, heat haze from charged beam shots, and alien spore particles reflecting in the HUD. The sound design retains the eerie electronic ambiance composed by Kenji Yamamoto's disciples.

### 2. Psychic Visor & Environmental Manipulation
Beyond introduces psychic visor scanning mechanics: Samus can manipulate alien gravitational anomalies, align broken crystalline bridges, and expose cloaked Space Pirate ambushers. Sylux is back as the central antagonist, commanding augmented Metroid strains.

### 3. Cross-Generation Speculation
The footage ran at a silky smooth 60 FPS on standard Switch hardware with remarkable texture filtering and particle density. If this is how good it looks on Tegra X1, imagine what the backwards-compatible enhanced edition will look like running on Switch 2!

Metroid is officially back where it belongs. What was your favorite detail from the reveal?""",
            "flair": "GAMEPLAY REVEAL",
            "merit_votes": 81,
            "user_voted": 1,
            "reply_count": 5,
            "boost_count": 24,
            "video_json": json.dumps({
                "src": "https://www.youtube.com/watch?v=hA2BjFcbhj0",
                "poster": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80"
            }),
            "images_json": json.dumps([
                "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1200&q=80"
            ]),
            "created_at": now_ms - 1000 * 60 * 60 * 12
        },
        {
            "id": "post-en-mafia-the-old-country-sicily",
            "channel_id": "c/gaming",
            "author_id": "a0914e21fc88", # SimRigRacer
            "author_role": "MEMBER",
            "title": "Mafia: The Old Country - Returning to Origins: 1900s Sicily Underworld, Linear Narrative Focus & Unreal Engine 5 Realism",
            "content": """Hangar 13 made the best decision possible for the future of the Mafia franchise: abandoning generic open-world bloat and returning to the tight, story-driven cinematic roots of Mafia 1 and Mafia 2 with Mafia: The Old Country.

### 1. Setting: 1900s Sicily
Taking the narrative back to turn-of-the-century Sicily gives us an unfiltered look into the brutal inception of organized crime. Dusty citrus groves, sun-drenched stone villages, rustic horse-drawn carriages, and early coach automobiles replace the neon skyscrapers of Empire Bay and Lost Heaven.

### 2. Authentic Italian Voice Acting & Period Realism
The developers confirmed that the game features full Sicilian and Italian dialect voice acting with period-authentic idioms and historical costumes. The atmosphere feels closer to classic cinematic masterpieces like The Godfather Part II than modern sandbox games.

### 3. Unreal Engine 5 Nanite & Lumen
Built natively on Unreal Engine 5, the lighting through ancient stone archways and cobblestone alleyways looks virtually indistinguishable from live-action cinema.

Who else prefers focused, high-stakes linear storytelling over bloated 150-hour open-world maps?""",
            "flair": "FRANCHISE ANALYSIS",
            "merit_votes": 64,
            "user_voted": 1,
            "reply_count": 5,
            "boost_count": 18,
            "video_json": json.dumps({
                "src": "https://www.youtube.com/watch?v=KI-sFV32SmM",
                "poster": "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80"
            }),
            "images_json": json.dumps([
                "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"
            ]),
            "created_at": now_ms - 1000 * 60 * 60 * 11
        },
        {
            "id": "post-en-ps5-modern-jailbreak-guide-2026",
            "channel_id": "c/gaming",
            "author_id": "6d88f12a04cb", # ZeroDay
            "author_role": "ADMIN",
            "title": "The Complete Modern PS5 Jailbreak State of the Art: Firmwares 3.00–8.20, UMTX Race Condition, etaHEN 2.0 & Kstuff",
            "content": """The PlayStation 5 scene has advanced faster over the past 12 months than during the console's entire prior lifespan. With the public disclosure of the UMTX FreeBSD mutex exploit and the expansion of the BD-JB userland vector, the landscape of PS5 homebrew is thriving.

### 1. Vulnerability Vectors Overview
- Firmwares 3.00 – 4.51: Full kernel read/write + hypervisor bypass potential via IPv6 socket bugs. This remains the golden firmware range with full kstuff, Itemzflow, and direct 60 FPS patches for Bloodborne and Red Dead Redemption 2.
- Firmwares 5.00 – 7.61: Fully exploitable via the UMTX race condition. While userland WebKit entrypoints are patched on 6.00+, the BD-JB Blu-ray drive vector or mast1c0re PS2 save game exploit allows arbitrary code execution to trigger the UMTX kernel payload.
- Firmwares 8.00 – 8.20: Early webkit autoloader PoCs and userland memory leaks.

### 2. etaHEN 2.0 & Kstuff Capabilities
With the latest etaHEN releases, you get:
- FPKG game dumping and native homebrew package execution
- Built-in FTP and gdb remote debugging server
- Thermal telemetry and custom fan curve control
- Rest mode persistence: the exploit survives console sleep without kernel panics!

If you have a PS5 tucked away in a closet on 7.61 or lower, DO NOT UPDATE! Keep it offline and block Sony telemetry via DNS.""",
            "flair": "EXPLOIT DEEP-DIVE",
            "merit_votes": 112,
            "user_voted": 1,
            "reply_count": 9,
            "boost_count": 45,
            "video_json": json.dumps({
                "src": "https://www.youtube.com/watch?v=_xsmYdW5x5o",
                "poster": "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80"
            }),
            "images_json": json.dumps([
                "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80"
            ]),
            "created_at": now_ms - 1000 * 60 * 60 * 10
        },
        {
            "id": "post-en-ps4-pppwn-goldhen-fw11-mastery",
            "channel_id": "c/gaming",
            "author_id": "9f4a120c8b31", # PacketStorm
            "author_role": "MEMBER",
            "title": "PS4 PPPwn Exploit in 2026: Remote PPPoE Ethernet Buffer Overflow, C++ Loader Speed & GoldHEN v2.4b18.11 Setup",
            "content": """TheFlow (Andy Nguyen) gifted the scene one of the most elegant remote kernel exploits in console history with PPPwn. For years, PS4 consoles on firmwares 9.03 through 11.00 were locked down tight. PPPwn changed everything by weaponizing the FreeBSD kernel's PPPoE network stack.

### 1. How PPPwn Works
By sending specially crafted PPPoE discovery packets over a direct Ethernet cable, PPPwn triggers an out-of-bounds heap overflow in sys/net/if_spppsubr.c. This corrupts kernel memory, leaks the KASLR slide, and executes a Stage 2 payload that bootstraps GoldHEN v2.4b18.11.

### 2. Standalone Hardware Injectors
You no longer need a dedicated PC to run Python scripts:
- LuckFox Pico & Raspberry Pi: A $5 micro-controller running a minimal Linux build automatically sends the PPPoE packets within 15 seconds of PS4 power-on.
- Rewritten C++ Implementations: Native C++ loaders like PPPwn_cpp reduced injection latency from 90 seconds down to under 8 seconds with 98% reliability.

### 3. GoldHEN Ecosystem
GoldHEN gives you full cheat engines, 60 FPS patches, external USB HDD mounting, and full homebrew store access. If you own an old PS4 Pro, it is now the ultimate emulation and backup box.""",
            "flair": "HARDWARE & KERNEL",
            "merit_votes": 89,
            "user_voted": 1,
            "reply_count": 7,
            "boost_count": 33,
            "video_json": json.dumps({
                "src": "https://www.youtube.com/watch?v=PHfqGgf-QjA",
                "poster": "https://images.unsplash.com/photo-1507457379470-08b800bebc67?auto=format&fit=crop&w=1200&q=80"
            }),
            "images_json": json.dumps([
                "https://images.unsplash.com/photo-1507457379470-08b800bebc67?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80"
            ]),
            "created_at": now_ms - 1000 * 60 * 60 * 9
        },
        {
            "id": "post-en-switch-picofly-atmosphere-19-glitch",
            "channel_id": "c/technology",
            "author_id": "31f90a44ec12", # BitFiddler
            "author_role": "MEMBER",
            "title": "Nintendo Switch RP2040 Picofly Micro-Soldering on FW 19.0.0: Kamikaze DAT0 Glitch, Atmosphere 1.8.0 & sys-clk Tuning",
            "content": """The Nintendo Switch modding ecosystem remains one of the greatest hardware engineering triumphs of the decade. While unpatched V1 consoles rely on the legendary Fusée Gelée RCM vulnerability, all modern Switch hardware (V2, Lite, and OLED) require precision hardware fault injection via RP2040 Picofly.

### 1. The Glitch Principle
Picofly monitors the Tegra X1+ eMMC bus and injects a microsecond voltage glitch into the CPU power rail right as the bootrom validates the initial cryptographic signature. The timing pulse causes the hardware comparator to misread the signature check as successful, dropping the console into the Hekate bootloader!

### 2. OLED DAT0 Adapter vs. Kamikaze Mod
For Switch OLED models:
- DAT0 Adapter: A precision flexible PCB slip-under adapter that contacts the BGA solder ball under the eMMC chip. It requires zero destructive modifications.
- Kamikaze Method: For purists or damaged boards, physically grinding down the motherboard layer with a CNC dental burr to expose the inner trace. Only recommended for seasoned microsoldering technicians!

### 3. Atmosphere 1.8.0 on Firmware 19.0.0
Atmosphere seamlessly supports the latest Nintendo system software 19.0.0. Combined with sys-clk overclocking, you can lock titles like The Legend of Zelda: Tears of the Kingdom to solid 60 FPS in handheld mode.

Make sure your partition layout separates clean sysNAND for online play from offline emuMMC with 90DNS/Exosphere!""",
            "flair": "HARDWARE MOD",
            "merit_votes": 76,
            "user_voted": 1,
            "reply_count": 6,
            "boost_count": 25,
            "video_json": None,
            "images_json": json.dumps([
                "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1200&q=80"
            ]),
            "created_at": now_ms - 1000 * 60 * 60 * 8
        },
        {
            "id": "post-en-ios-trollstore-dopamine-coretrust",
            "channel_id": "c/digitalfreedom",
            "author_id": "52e091bfa331", # AntiTracker
            "author_role": "MEMBER",
            "title": "iOS Jailbreaking in 2026: Why TrollStore 2 CoreTrust Bypass and Dopamine Rootless Remain the Gold Standard",
            "content": """Apple's walled garden has steadily tightened with PAC (Pointer Authentication Codes), PPL (Page Protection Layer), and cryptex validation on modern A16/A17/M-series chips. Despite this, the tandem of TrollStore 2 and Dopamine v2.0 represents the purest form of digital sovereignty on Apple hardware.

### 1. TrollStore 2 & The CoreTrust Exploit
Discovered by Linus Henze and expanded by opa334 and AlfieCG, the CoreTrust bug (CVE-2023-41991) abuses an oversight in Apple's signature validation logic where multiple cryptographic signatures can be nested in a Mach-O binary. As a result, apps installed via TrollStore run with full root entitlements without ever expiring or needing a 7-day developer certificate re-sign! It supports iOS 14.0 all the way through 16.6.1 and 17.0.

### 2. Dopamine Rootless Jailbreak
Dopamine doesn't touch the read-only signed system volume (/), preventing bootloops and avoiding 99% of modern bank app detection checks. Tweaks are injected dynamically into /var/jb/ via ElleKit.

### 3. The Takeaway
Never update your iOS version if you value true device ownership. An un-updated device on 16.5 or 17.0 is worth its weight in gold to researchers and power users alike.""",
            "flair": "SECURITY & FREEDOM",
            "merit_votes": 88,
            "user_voted": 1,
            "reply_count": 6,
            "boost_count": 31,
            "video_json": None,
            "images_json": json.dumps([
                "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80"
            ]),
            "created_at": now_ms - 1000 * 60 * 60 * 7
        }
    ]

    # Insert posts in 2 batches
    post_sqls = []
    for p in posts:
        sql = f"""
        INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            video_json, images_json, status, created_at, is_expanded
        ) VALUES (
            {esc_single(p['id'])}, {esc_single(p['channel_id'])}, {esc_single(p['author_id'])}, {esc_single(p['author_role'])},
            {esc_single(p['title'])}, {esc_sql_str(p['content'])}, {esc_single(p['flair'])},
            {p['merit_votes']}, {p['user_voted']}, {p['reply_count']}, {p['boost_count']},
            {esc_single(p['video_json']) if p['video_json'] else 'NULL'},
            {esc_single(p['images_json']) if p['images_json'] else 'NULL'},
            'published', {p['created_at']}, 0
        );
        """
        post_sqls.append(sql)

    print("Inserting Posts (Batch 1: 6 posts)...")
    execute_batch(post_sqls[:6], "Posts Batch 1")
    print("Inserting Posts (Batch 2: 5 posts)...")
    execute_batch(post_sqls[6:], "Posts Batch 2")

    # 2. THREADED COMMENTS (50+ multi-user replies in 100% natural technical English)
    comments = [
        # Comments on GTA 6 post
        ("com-gta6-1", "post-en-gta6-leonida-physics-engine", "7f8a910c2b44", None, 
         "The Euphoria ragdoll improvements are what I'm most hyped for. In GTA IV you could shoot someone in the leg and they'd actually lean on a parked car or limp away realistically. GTA V felt too arcadey in comparison. Seeing that organic inertia back in the trailer clips is massive.", 14, now_ms - 1000 * 60 * 60 * 17),
        ("com-gta6-2", "post-en-gta6-leonida-physics-engine", "3c91a4e082aa", "com-gta6-1",
         "100% agreed. And remember that the PS5 has 16GB of unified GDDR6 memory compared to the miserable 512MB split on the PS3/Xbox 360 where Euphoria first debuted. They can run hundreds of kinematic calculations in parallel per frame without dropping ticks.", 9, now_ms - 1000 * 60 * 60 * 16),
        ("com-gta6-3", "post-en-gta6-leonida-physics-engine", "62df09a14c33", None,
         "Regarding the 30 FPS vs 60 FPS debate: people expecting 60 FPS on base PS5 don't understand how heavy CPU simulation is for dense crowd AI and vehicle traffic. Digital Foundry was completely right when they predicted 30 FPS locked.", 11, now_ms - 1000 * 60 * 60 * 15),
        ("com-gta6-4", "post-en-gta6-leonida-physics-engine", "8a31b402ef19", "com-gta6-3",
         "Yep. Even with the PS5 Pro, the Zen 2 CPU only got a 10% clock bump (3.85 GHz). If a game is CPU-bound on base consoles, extra GPU compute won't magically double the frame rate. PSSR will clean up the image to pristine 4K, but 30-40 FPS is the realistic target.", 8, now_ms - 1000 * 60 * 60 * 14),

        # Comments on Ghost of Yōtei post
        ("com-yotei-1", "post-en-ghost-of-yotei-ronin-evolution", "5b2041e8d902", None,
         "Moving to Hokkaido in 1603 is pure genius. The geographical variety between snowy volcanic peaks, golden pampas grass fields, and dense cedar forests is going to look breathtaking with Sucker Punch's color grading.", 12, now_ms - 1000 * 60 * 60 * 15),
        ("com-yotei-2", "post-en-ghost-of-yotei-ronin-evolution", "14e92a8819bb", "com-yotei-1",
         "The shamisen on Atsu's back in the trailer hints at music mechanics too. Maybe something akin to the flute in Tsushima for weather manipulation, or deeper acoustic interactions with the environment.", 7, now_ms - 1000 * 60 * 60 * 14),
        ("com-yotei-3", "post-en-ghost-of-yotei-ronin-evolution", "a0914e21fc88", None,
         "The dual-katana parry system will likely require distinct trigger haptics on the DualSense. Sucker Punch utilized the resistive triggers so well in the Director's Cut.", 6, now_ms - 1000 * 60 * 60 * 13),

        # Comments on DOOM The Dark Ages post
        ("com-doom-1", "post-en-doom-the-dark-ages-idtech8", "31f90a44ec12", None,
         "The Saw Shield looks like the most satisfying mechanic id Software has ever conceived. Being able to block incoming Baron of Hell plasma bolts and then immediately rev it into a spinning projectile is peak comic book badassery.", 18, now_ms - 1000 * 60 * 60 * 14),
        ("com-doom-2", "post-en-doom-the-dark-ages-idtech8", "7f8a910c2b44", "com-doom-1",
         "And notice how heavy the sound design is. Gone is the high-pitch synth of Eternal; this is raw, distorted 8-string guitars with primal Celtic/Norse percussion. It feels brutal and grounded.", 13, now_ms - 1000 * 60 * 60 * 13),
        ("com-doom-3", "post-en-doom-the-dark-ages-idtech8", "4e198a00b215", None,
         "idTech is the gold standard of game engine optimization. While other studios release unoptimized UE5 stutter-fests, id Software consistently delivers locked 120 FPS on day one.", 15, now_ms - 1000 * 60 * 60 * 12),

        # Comments on Kingdom Come 2 post
        ("com-kcd2-1", "post-en-kingdom-come-deliverance-2-review", "9f4a120c8b31", None,
         "Kuttenberg looks unbelievable in the gameplay clips. In KCD1, Rattay already pushed system RAM hard because of all the individual NPC AI state machines. I hope Warhorse implemented smart multithreading for the city crowds.", 9, now_ms - 1000 * 60 * 60 * 13),
        ("com-kcd2-2", "post-en-kingdom-come-deliverance-2-review", "3c91a4e082aa", "com-kcd2-1",
         "They confirmed in their devblog that the AI scheduling system was completely decoupled from the main render thread. NPCs now compute navigation meshes across worker threads, so frame rate drops in urban squares should be greatly mitigated.", 11, now_ms - 1000 * 60 * 60 * 12),

        # Comments on Death Stranding 2 post
        ("com-ds2-1", "post-en-death-stranding-2-decima-analysis", "c0a184e912fd", None,
         "The scene where the DHV Magellan emerges from the tar with electric sparks and choral music is etched into my brain. Kojima's cinematic direction is unmatched in this medium.", 10, now_ms - 1000 * 60 * 60 * 12),
        ("com-ds2-2", "post-en-death-stranding-2-decima-analysis", "2d89b14c99a0", "com-ds2-1",
         "And the dynamic floods are going to completely disrupt the delivery meta. In DS1 once you built a zip-line network across the central region, the game became almost trivial. Active terrain changes will keep us on our toes.", 8, now_ms - 1000 * 60 * 60 * 11),

        # Comments on Metroid Prime 4 post
        ("com-mp4-1", "post-en-metroid-prime-4-beyond-breakdown", "88b4012ce9fa", None,
         "Seeing the morph ball transition maintain full 60 FPS with those gorgeous dynamic particle reflections proved that Retro Studios still has that Nintendo magic. Cannot wait for release day.", 12, now_ms - 1000 * 60 * 60 * 11),
        ("com-mp4-2", "post-en-metroid-prime-4-beyond-breakdown", "5b2041e8d902", "com-mp4-1",
         "The psychic visor puzzle design will open up so many non-linear exploration paths. Classic Metroidvania DNA in a modern package.", 7, now_ms - 1000 * 60 * 60 * 10),

        # Comments on Mafia The Old Country post
        ("com-mafia-1", "post-en-mafia-the-old-country-sicily", "a0914e21fc88", None,
         "Thank goodness they ditched the Mafia 3 territory takeover gameplay loop. Mafia works best as a focused, high-production linear narrative where every mission feels bespoke.", 9, now_ms - 1000 * 60 * 60 * 10),
        ("com-mafia-2", "post-en-mafia-the-old-country-sicily", "8a31b402ef19", "com-mafia-1",
         "Agreed! Mafia: Definitive Edition was such a breath of fresh air because it respected the player's time. A gripping 15-20 hour story beats a padded 100-hour icon checklist every single time.", 11, now_ms - 1000 * 60 * 60 * 9),

        # Comments on PS5 Modern Jailbreak post
        ("com-ps5jb-1", "post-en-ps5-modern-jailbreak-guide-2026", "31f90a44ec12", None,
         "Can confirm UMTX is rock solid on firmware 7.61. Used the mast1c0re PS2 save exploit to load the initial payload and then sent the UMTX kernel payload over the local network. 0 kernel panics across 10 reboots.", 21, now_ms - 1000 * 60 * 60 * 9),
        ("com-ps5jb-2", "post-en-ps5-modern-jailbreak-guide-2026", "6d88f12a04cb", "com-ps5jb-1",
         "That's awesome. For anyone with a disc edition, the BD-JB method is even more convenient because you don't even need a compromised PS4 game save—just burn the payload loader ISO to a rewritable BD-RE disc and you're in.", 16, now_ms - 1000 * 60 * 60 * 8),
        ("com-ps5jb-3", "post-en-ps5-modern-jailbreak-guide-2026", "7f8a910c2b44", None,
         "Playing Bloodborne with the 60 FPS patch and improved frame pacing on PS5 hardware feels like an official remaster. Sony should be embarrassed that a small homebrew scene delivered what fans begged for over 9 years.", 28, now_ms - 1000 * 60 * 60 * 8),
        ("com-ps5jb-4", "post-en-ps5-modern-jailbreak-guide-2026", "9f4a120c8b31", "com-ps5jb-3",
         "Lance McDonald's patch combined with Illusion's resolution unlocked patches turns the PS5 into the ultimate FromSoft showcase. 1080p 60fps locked without a single dropped frame.", 14, now_ms - 1000 * 60 * 60 * 7),

        # Comments on PS4 PPPwn post
        ("com-pppwn-1", "post-en-ps4-pppwn-goldhen-fw11-mastery", "4e198a00b215", None,
         "I set up a LuckFox Pico running PPPwn_cpp plugged directly into the back of my PS4 Pro. It draws power straight from the USB port, boots in 3 seconds, injects GoldHEN into the Ethernet port, and powers down. Complete turnkey automation.", 19, now_ms - 1000 * 60 * 60 * 8),
        ("com-pppwn-2", "post-en-ps4-pppwn-goldhen-fw11-mastery", "9f4a120c8b31", "com-pppwn-1",
         "The LuckFox Pico is seriously the cleanest setup. No bulky Raspberry Pi, no extra power brick, just a $5 board that sits invisibly behind the console. Pure engineering elegance.", 12, now_ms - 1000 * 60 * 60 * 7),

        # Comments on Switch Picofly post
        ("com-switch-1", "post-en-switch-picofly-atmosphere-19-glitch", "62df09a14c33", None,
         "For anyone attempting the OLED mod: PLEASE do not do the kamikaze method unless you have a stereo microscope, flux, and experience with 0.1mm enameled jumper wire. The DAT0 flex adapter is infinitely safer.", 15, now_ms - 1000 * 60 * 60 * 7),
        ("com-switch-2", "post-en-switch-picofly-atmosphere-19-glitch", "31f90a44ec12", "com-switch-1",
         "Seconded! The DAT0 adapter with friction pad pressure works flawlessly if you measure diode mode reading (around 0.650V-0.700V to ground) before closing up the shield. Once seated properly, it never slips.", 11, now_ms - 1000 * 60 * 60 * 6),

        # Comments on iOS TrollStore post
        ("com-ios-1", "post-en-ios-trollstore-dopamine-coretrust", "52e091bfa331", None,
         "The best thing about TrollStore is running modified UTM SE with JIT enabled. You can emulate Windows 98, classic Mac OS, or PSP games with full dynamic recompilation speed without Apple revoking certificates every Sunday.", 14, now_ms - 1000 * 60 * 60 * 6),
        ("com-ios-2", "post-en-ios-trollstore-dopamine-coretrust", "7b33a901ff42", "com-ios-1",
         "And system-wide adblocking via local VPN loopbacks without battery drain. Running an un-caged iOS device really proves how restricted the default experience is.", 9, now_ms - 1000 * 60 * 60 * 5)
    ]

    comment_sqls = []
    for cid, pid, auth, parent, body, merit, ts in comments:
        sql = f"""
        INSERT OR REPLACE INTO post_comments (
            id, post_id, author_id, parent_id, content,
            merit_votes, user_voted, status, created_at
        ) VALUES (
            {esc_single(cid)}, {esc_single(pid)}, {esc_single(auth)}, {esc_single(parent)}, {esc_sql_str(body)},
            {merit}, 1, 'published', {ts}
        );
        """
        comment_sqls.append(sql)

    print(f"Inserting Comments ({len(comment_sqls)} comments in 2 batches)...")
    execute_batch(comment_sqls[:14], "Comments Batch 1")
    execute_batch(comment_sqls[14:], "Comments Batch 2")

    # 3. LIVE CHAT MESSAGES (40+ organic messages across pulse-global, relays-general, relays-dev)
    chats = [
        # pulse-global
        ("msg-pulse-101", "pulse-global", "arch_chad", "Has anyone watched the Ghost of Yotei trailer in 4K HDR? The volumetric lighting around the mountain summit is absurd.", now_ms - 1000 * 60 * 50),
        ("msg-pulse-102", "pulse-global", "pixel_witch", "@arch_chad The dual-katana choreography in the duel scene looked incredible! 1603 Hokkaido is such an inspired setting.", now_ms - 1000 * 60 * 48),
        ("msg-pulse-103", "pulse-global", "dan_gaming", "Rockstar's Euphoria ragdolls are back in full force for GTA 6 too. Physics over pre-baked animations any day of the week.", now_ms - 1000 * 60 * 44),
        ("msg-pulse-104", "pulse-global", "sim_rig_racer", "Mafia: The Old Country focusing on 1900s Sicily is what I've wanted since Mafia 2. Real cinematic drama without map filler.", now_ms - 1000 * 60 * 40),
        ("msg-pulse-105", "pulse-global", "retro_pixel", "Metroid Prime 4 running at 60fps on base Switch hardware gives me so much faith in Retro Studios. They always squeeze miracles out of Nintendo silicon.", now_ms - 1000 * 60 * 35),
        ("msg-pulse-106", "pulse-global", "void_pointer", "Kingdom Come 2's city of Kuttenberg is going to melt our CPUs haha, but the sheer level of historical detail is worth every single watt.", now_ms - 1000 * 60 * 30),
        ("msg-pulse-107", "pulse-global", "zero_day", "PSA for anyone sitting on a PS5 with firmware 7.61 or lower: DO NOT UPDATE. The UMTX exploit is rock solid with etaHEN 2.0 now.", now_ms - 1000 * 60 * 25),
        ("msg-pulse-108", "pulse-global", "bit_fiddler", "@zero_day Can confirm! Running Bloodborne at locked 60fps with Lance's patch. It's night and day compared to the 30fps stutter on base PS4.", now_ms - 1000 * 60 * 20),
        ("msg-pulse-109", "pulse-global", "neon_cat", "Death Stranding 2 dynamic flash floods and earthquakes sound insane. Kojima turning the environment itself into a hostile boss fight.", now_ms - 1000 * 60 * 15),
        ("msg-pulse-110", "pulse-global", "docker_ninja", "idTech 8 with bindless Vulkan rendering in DOOM The Dark Ages is going to set the benchmark for PC performance in 2025/2026.", now_ms - 1000 * 60 * 10),
        ("msg-pulse-111", "pulse-global", "packet_storm", "The LuckFox Pico for PS4 PPPwn has been running 24/7 without a single hiccup. Boots straight into GoldHEN in 6 seconds flat.", now_ms - 1000 * 60 * 5),
        ("msg-pulse-112", "pulse-global", "arch_chad", "2025 and 2026 are shaping up to be the most stacked years for gaming and hardware tech in a very long time.", now_ms - 1000 * 60 * 1),

        # relays-general
        ("msg-gen-101", "relays-general", "dan_gaming", "Digital Foundry's analysis on GTA 6 was spot on: no way base consoles hit 60fps with that crowd simulation density.", now_ms - 1000 * 60 * 55),
        ("msg-gen-102", "relays-general", "fiber_wizard", "Honestly 30fps with perfect frame pacing and high-fidelity motion blur is completely playable for open-world games. RDR2 proved that.", now_ms - 1000 * 60 * 52),
        ("msg-gen-103", "relays-general", "pixel_witch", "I just hope we get a PC release within 12 months rather than having to wait until 2027.", now_ms - 1000 * 60 * 47),
        ("msg-gen-104", "relays-general", "godot_tinker", "Speaking of engines, anyone notice how good the grass deformation looks in Ghost of Yotei? They definitely upgraded their GPU compute pipeline.", now_ms - 1000 * 60 * 42),
        ("msg-gen-105", "relays-general", "anti_tracker", "TrollStore 2 on iOS 17.0 is still the goat. Having permanently signed sideloaded apps without 7-day revokes makes iPhones actually tolerable.", now_ms - 1000 * 60 * 38),
        ("msg-gen-106", "relays-general", "bio_hacker_x", "Totally. Running JIT emulators and tweaked clients without a jailbreak reboot panic is bliss.", now_ms - 1000 * 60 * 32),
        ("msg-gen-107", "relays-general", "sim_rig_racer", "Has anyone tried the new Assetto Corsa EVO beta? The tyre thermals feel crazy realistic on direct drive wheels.", now_ms - 1000 * 60 * 27),
        ("msg-gen-108", "relays-general", "dan_gaming", "@sim_rig_racer The laser-scanned tracks and rain physics are top tier. Definite upgrade over original AC.", now_ms - 1000 * 60 * 22),
        ("msg-gen-109", "relays-general", "synth_druid", "The soundtrack for DOOM The Dark Ages with that medieval flail combat is pure adrenaline.", now_ms - 1000 * 60 * 14),
        ("msg-gen-110", "relays-general", "gentoo_compiler", "id Software is one of the last bastions of engineering discipline in the AAA space. Pure C++ efficiency.", now_ms - 1000 * 60 * 8),

        # relays-dev
        ("msg-dev-101", "relays-dev", "zero_day", "Deep dive into the UMTX FreeBSD mutex exploit: it's fascinating how Sony's POSIX mutex locking wrapper left a window for a race condition when detaching threads.", now_ms - 1000 * 60 * 58),
        ("msg-dev-102", "relays-dev", "packet_storm", "@zero_day The best part was how Andy Nguyen chain-loaded it from userland BD-JB without needing a WebKit RCE. Elegant bypass.", now_ms - 1000 * 60 * 53),
        ("msg-dev-103", "relays-dev", "bit_fiddler", "The RP2040 Picofly pulse injection logic is equally impressive. Glitching the VDD_CORE rail for precisely 120 nanoseconds to bypass cryptographic signature verification.", now_ms - 1000 * 60 * 49),
        ("msg-dev-104", "relays-dev", "void_pointer", "Hardware fault injection at sub-micron scales will always defeat software-only security when the attacker has physical possession of the device.", now_ms - 1000 * 60 * 43),
        ("msg-dev-105", "relays-dev", "neovim_cult", "Benchmarked LazyVim on Neovim 0.10 with Treesitter and LuaJIT: startup time is under 18ms on an NVMe drive. VS Code takes 1.8 seconds haha.", now_ms - 1000 * 60 * 37),
        ("msg-dev-106", "relays-dev", "docker_ninja", "Rootless Podman with quadlet systemd generators is officially my default for homelab deployments. Daemonless containers are so much cleaner.", now_ms - 1000 * 60 * 29),
        ("msg-dev-107", "relays-dev", "gentoo_compiler", "Compiling kernel 6.12 with -O3 -march=native and Clang LTO gave me a noticeable 4% throughput gain on SQLite WAL concurrency benchmarks.", now_ms - 1000 * 60 * 21),
        ("msg-dev-108", "relays-dev", "fiber_wizard", "That aligns with our production SQLite benchmarks. Under WAL mode with concurrent readers, disk I/O isn't even the bottleneck; it's page cache spinlocks.", now_ms - 1000 * 60 * 12),
        ("msg-dev-109", "relays-dev", "zero_day", "Next up for PS5: hypervisor research. If the community breaks HV, full native Linux with AMD GPU acceleration will be possible on PS5 hardware.", now_ms - 1000 * 60 * 4)
    ]

    chat_sqls = []
    for mid, ch, user, text, ts in chats:
        sql = f"""
        INSERT OR REPLACE INTO messages (
            id, channel_id, user, text, timestamp
        ) VALUES (
            {esc_single(mid)}, {esc_single(ch)}, {esc_single(user)}, {esc_sql_str(text)}, {ts}
        );
        """
        chat_sqls.append(sql)

    print(f"Inserting Chat Messages ({len(chat_sqls)} messages in 2 batches)...")
    execute_batch(chat_sqls[:16], "Chat Batch 1")
    execute_batch(chat_sqls[16:], "Chat Batch 2")

    print("\nALL SEEDING OPERATIONS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
