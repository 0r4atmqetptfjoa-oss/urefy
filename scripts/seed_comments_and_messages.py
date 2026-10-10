import json
import subprocess
import time
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
    temp_file = "scripts/temp_batch2.sql"
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

    # 1. THREADED COMMENTS (28 comments)
    comments = [
        # GTA 6
        ("com-gta6-1", "post-en-gta6-leonida-physics-engine", "7f8a910c2b44", None, 
         "The Euphoria ragdoll improvements are what I'm most hyped for. In GTA IV you could shoot someone in the leg and they'd actually lean on a parked car or limp away realistically. GTA V felt too arcadey in comparison. Seeing that organic inertia back in the trailer clips is massive.", 14, now_ms - 1000 * 60 * 60 * 17),
        ("com-gta6-2", "post-en-gta6-leonida-physics-engine", "3c91a4e082aa", "com-gta6-1",
         "100% agreed. And remember that the PS5 has 16GB of unified GDDR6 memory compared to the miserable 512MB split on the PS3/Xbox 360 where Euphoria first debuted. They can run hundreds of kinematic calculations in parallel per frame without dropping ticks.", 9, now_ms - 1000 * 60 * 60 * 16),
        ("com-gta6-3", "post-en-gta6-leonida-physics-engine", "62df09a14c33", None,
         "Regarding the 30 FPS vs 60 FPS debate: people expecting 60 FPS on base PS5 don't understand how heavy CPU simulation is for dense crowd AI and vehicle traffic. Digital Foundry was completely right when they predicted 30 FPS locked.", 11, now_ms - 1000 * 60 * 60 * 15),
        ("com-gta6-4", "post-en-gta6-leonida-physics-engine", "8a31b402ef19", "com-gta6-3",
         "Yep. Even with the PS5 Pro, the Zen 2 CPU only got a 10% clock bump (3.85 GHz). If a game is CPU-bound on base consoles, extra GPU compute won't magically double the frame rate. PSSR will clean up the image to pristine 4K, but 30-40 FPS is the realistic target.", 8, now_ms - 1000 * 60 * 60 * 14),

        # Ghost of Yotei
        ("com-yotei-1", "post-en-ghost-of-yotei-ronin-evolution", "5b2041e8d902", None,
         "Moving to Hokkaido in 1603 is pure genius. The geographical variety between snowy volcanic peaks, golden pampas grass fields, and dense cedar forests is going to look breathtaking with Sucker Punch's color grading.", 12, now_ms - 1000 * 60 * 60 * 15),
        ("com-yotei-2", "post-en-ghost-of-yotei-ronin-evolution", "14e92a8819bb", "com-yotei-1",
         "The shamisen on Atsu's back in the trailer hints at music mechanics too. Maybe something akin to the flute in Tsushima for weather manipulation, or deeper acoustic interactions with the environment.", 7, now_ms - 1000 * 60 * 60 * 14),
        ("com-yotei-3", "post-en-ghost-of-yotei-ronin-evolution", "a0914e21fc88", None,
         "The dual-katana parry system will likely require distinct trigger haptics on the DualSense. Sucker Punch utilized the resistive triggers so well in the Director's Cut.", 6, now_ms - 1000 * 60 * 60 * 13),

        # DOOM The Dark Ages
        ("com-doom-1", "post-en-doom-the-dark-ages-idtech8", "31f90a44ec12", None,
         "The Saw Shield looks like the most satisfying mechanic id Software has ever conceived. Being able to block incoming Baron of Hell plasma bolts and then immediately rev it into a spinning projectile is peak comic book badassery.", 18, now_ms - 1000 * 60 * 60 * 14),
        ("com-doom-2", "post-en-doom-the-dark-ages-idtech8", "7f8a910c2b44", "com-doom-1",
         "And notice how heavy the sound design is. Gone is the high-pitch synth of Eternal; this is raw, distorted 8-string guitars with primal Celtic/Norse percussion. It feels brutal and grounded.", 13, now_ms - 1000 * 60 * 60 * 13),
        ("com-doom-3", "post-en-doom-the-dark-ages-idtech8", "4e198a00b215", None,
         "idTech is the gold standard of game engine optimization. While other studios release unoptimized UE5 stutter-fests, id Software consistently delivers locked 120 FPS on day one.", 15, now_ms - 1000 * 60 * 60 * 12),

        # Kingdom Come 2
        ("com-kcd2-1", "post-en-kingdom-come-deliverance-2-review", "9f4a120c8b31", None,
         "Kuttenberg looks unbelievable in the gameplay clips. In KCD1, Rattay already pushed system RAM hard because of all the individual NPC AI state machines. I hope Warhorse implemented smart multithreading for the city crowds.", 9, now_ms - 1000 * 60 * 60 * 13),
        ("com-kcd2-2", "post-en-kingdom-come-deliverance-2-review", "3c91a4e082aa", "com-kcd2-1",
         "They confirmed in their devblog that the AI scheduling system was completely decoupled from the main render thread. NPCs now compute navigation meshes across worker threads, so frame rate drops in urban squares should be greatly mitigated.", 11, now_ms - 1000 * 60 * 60 * 12),

        # Death Stranding 2
        ("com-ds2-1", "post-en-death-stranding-2-decima-analysis", "c0a184e912fd", None,
         "The scene where the DHV Magellan emerges from the tar with electric sparks and choral music is etched into my brain. Kojima's cinematic direction is unmatched in this medium.", 10, now_ms - 1000 * 60 * 60 * 12),
        ("com-ds2-2", "post-en-death-stranding-2-decima-analysis", "2d89b14c99a0", "com-ds2-1",
         "And the dynamic floods are going to completely disrupt the delivery meta. In DS1 once you built a zip-line network across the central region, the game became almost trivial. Active terrain changes will keep us on our toes.", 8, now_ms - 1000 * 60 * 60 * 11),

        # Metroid Prime 4
        ("com-mp4-1", "post-en-metroid-prime-4-beyond-breakdown", "88b4012ce9fa", None,
         "Seeing the morph ball transition maintain full 60 FPS with those gorgeous dynamic particle reflections proved that Retro Studios still has that Nintendo magic. Cannot wait for release day.", 12, now_ms - 1000 * 60 * 60 * 11),
        ("com-mp4-2", "post-en-metroid-prime-4-beyond-breakdown", "5b2041e8d902", "com-mp4-1",
         "The psychic visor puzzle design will open up so many non-linear exploration paths. Classic Metroidvania DNA in a modern package.", 7, now_ms - 1000 * 60 * 60 * 10),

        # Mafia The Old Country
        ("com-mafia-1", "post-en-mafia-the-old-country-sicily", "a0914e21fc88", None,
         "Thank goodness they ditched the Mafia 3 territory takeover gameplay loop. Mafia works best as a focused, high-production linear narrative where every mission feels bespoke.", 9, now_ms - 1000 * 60 * 60 * 10),
        ("com-mafia-2", "post-en-mafia-the-old-country-sicily", "8a31b402ef19", "com-mafia-1",
         "Agreed! Mafia: Definitive Edition was such a breath of fresh air because it respected the player's time. A gripping 15-20 hour story beats a padded 100-hour icon checklist every single time.", 11, now_ms - 1000 * 60 * 60 * 9),

        # PS5 Modern Jailbreak
        ("com-ps5jb-1", "post-en-ps5-modern-jailbreak-guide-2026", "31f90a44ec12", None,
         "Can confirm UMTX is rock solid on firmware 7.61. Used the mast1c0re PS2 save exploit to load the initial payload and then sent the UMTX kernel payload over the local network. 0 kernel panics across 10 reboots.", 21, now_ms - 1000 * 60 * 60 * 9),
        ("com-ps5jb-2", "post-en-ps5-modern-jailbreak-guide-2026", "6d88f12a04cb", "com-ps5jb-1",
         "That's awesome. For anyone with a disc edition, the BD-JB method is even more convenient because you don't even need a compromised PS4 game save—just burn the payload loader ISO to a rewritable BD-RE disc and you're in.", 16, now_ms - 1000 * 60 * 60 * 8),
        ("com-ps5jb-3", "post-en-ps5-modern-jailbreak-guide-2026", "7f8a910c2b44", None,
         "Playing Bloodborne with the 60 FPS patch and improved frame pacing on PS5 hardware feels like an official remaster. Sony should be embarrassed that a small homebrew scene delivered what fans begged for over 9 years.", 28, now_ms - 1000 * 60 * 60 * 8),
        ("com-ps5jb-4", "post-en-ps5-modern-jailbreak-guide-2026", "9f4a120c8b31", "com-ps5jb-3",
         "Lance McDonald's patch combined with Illusion's resolution unlocked patches turns the PS5 into the ultimate FromSoft showcase. 1080p 60fps locked without a single dropped frame.", 14, now_ms - 1000 * 60 * 60 * 7),

        # PS4 PPPwn
        ("com-pppwn-1", "post-en-ps4-pppwn-goldhen-fw11-mastery", "4e198a00b215", None,
         "I set up a LuckFox Pico running PPPwn_cpp plugged directly into the back of my PS4 Pro. It draws power straight from the USB port, boots in 3 seconds, injects GoldHEN into the Ethernet port, and powers down. Complete turnkey automation.", 19, now_ms - 1000 * 60 * 60 * 8),
        ("com-pppwn-2", "post-en-ps4-pppwn-goldhen-fw11-mastery", "9f4a120c8b31", "com-pppwn-1",
         "The LuckFox Pico is seriously the cleanest setup. No bulky Raspberry Pi, no extra power brick, just a $5 board that sits invisibly behind the console. Pure engineering elegance.", 12, now_ms - 1000 * 60 * 60 * 7),

        # Switch Picofly
        ("com-switch-1", "post-en-switch-picofly-atmosphere-19-glitch", "62df09a14c33", None,
         "For anyone attempting the OLED mod: PLEASE do not do the kamikaze method unless you have a stereo microscope, flux, and experience with 0.1mm enameled jumper wire. The DAT0 flex adapter is infinitely safer.", 15, now_ms - 1000 * 60 * 60 * 7),
        ("com-switch-2", "post-en-switch-picofly-atmosphere-19-glitch", "31f90a44ec12", "com-switch-1",
         "Seconded! The DAT0 adapter with friction pad pressure works flawlessly if you measure diode mode reading (around 0.650V-0.700V to ground) before closing up the shield. Once seated properly, it never slips.", 11, now_ms - 1000 * 60 * 60 * 6),

        # iOS TrollStore
        ("com-ios-1", "post-en-ios-trollstore-dopamine-coretrust", "52e091bfa331", None,
         "The best thing about TrollStore is running modified UTM SE with JIT enabled. You can emulate Windows 98, classic Mac OS, or PSP games with full dynamic recompilation speed without Apple revoking certificates every Sunday.", 14, now_ms - 1000 * 60 * 60 * 6),
        ("com-ios-2", "post-en-ios-trollstore-dopamine-coretrust", "7b33a901ff42", "com-ios-1",
         "And system-wide adblocking via local VPN loopbacks without battery drain. Running an un-caged iOS device really proves how restricted the default experience is.", 9, now_ms - 1000 * 60 * 60 * 5)
    ]

    comment_sqls = []
    for cid, pid, auth, parent, body, merit, ts in comments:
        sql = f"""
        INSERT OR REPLACE INTO comments (
            id, post_id, parent_id, author_id, author_role, content,
            merit_votes, created_at
        ) VALUES (
            {esc_single(cid)}, {esc_single(pid)}, {esc_single(parent)}, {esc_single(auth)},
            'MEMBER', {esc_sql_str(body)}, {merit}, {ts}
        );
        """
        comment_sqls.append(sql)

    print(f"Inserting Comments ({len(comment_sqls)} statements in 2 batches)...")
    execute_batch(comment_sqls[:14], "Comments Batch 1")
    execute_batch(comment_sqls[14:], "Comments Batch 2")

    # 2. MESSAGES (31 messages)
    chats = [
        # pulse-global
        ("msg-pulse-101", "pulse-global", "7f8a910c2b44", "Has anyone watched the Ghost of Yotei trailer in 4K HDR? The volumetric lighting around the mountain summit is absurd.", now_ms - 1000 * 60 * 50),
        ("msg-pulse-102", "pulse-global", "14e92a8819bb", "@arch_chad The dual-katana choreography in the duel scene looked incredible! 1603 Hokkaido is such an inspired setting.", now_ms - 1000 * 60 * 48),
        ("msg-pulse-103", "pulse-global", "8a31b402ef19", "Rockstar's Euphoria ragdolls are back in full force for GTA 6 too. Physics over pre-baked animations any day of the week.", now_ms - 1000 * 60 * 44),
        ("msg-pulse-104", "pulse-global", "a0914e21fc88", "Mafia: The Old Country focusing on 1900s Sicily is what I've wanted since Mafia 2. Real cinematic drama without map filler.", now_ms - 1000 * 60 * 40),
        ("msg-pulse-105", "pulse-global", "88b4012ce9fa", "Metroid Prime 4 running at 60fps on base Switch hardware gives me so much faith in Retro Studios. They always squeeze miracles out of Nintendo silicon.", now_ms - 1000 * 60 * 35),
        ("msg-pulse-106", "pulse-global", "3c91a4e082aa", "Kingdom Come 2's city of Kuttenberg is going to melt our CPUs haha, but the sheer level of historical detail is worth every single watt.", now_ms - 1000 * 60 * 30),
        ("msg-pulse-107", "pulse-global", "6d88f12a04cb", "PSA for anyone sitting on a PS5 with firmware 7.61 or lower: DO NOT UPDATE. The UMTX exploit is rock solid with etaHEN 2.0 now.", now_ms - 1000 * 60 * 25),
        ("msg-pulse-108", "pulse-global", "31f90a44ec12", "@zero_day Can confirm! Running Bloodborne at locked 60fps with Lance's patch. It's night and day compared to the 30fps stutter on base PS4.", now_ms - 1000 * 60 * 20),
        ("msg-pulse-109", "pulse-global", "2d89b14c99a0", "Death Stranding 2 dynamic flash floods and earthquakes sound insane. Kojima turning the environment itself into a hostile boss fight.", now_ms - 1000 * 60 * 15),
        ("msg-pulse-110", "pulse-global", "4e198a00b215", "idTech 8 with bindless Vulkan rendering in DOOM The Dark Ages is going to set the benchmark for PC performance in 2025/2026.", now_ms - 1000 * 60 * 10),
        ("msg-pulse-111", "pulse-global", "9f4a120c8b31", "The LuckFox Pico for PS4 PPPwn has been running 24/7 without a single hiccup. Boots straight into GoldHEN in 6 seconds flat.", now_ms - 1000 * 60 * 5),
        ("msg-pulse-112", "pulse-global", "7f8a910c2b44", "2025 and 2026 are shaping up to be the most stacked years for gaming and hardware tech in a very long time.", now_ms - 1000 * 60 * 1),

        # relays-general
        ("msg-gen-101", "relays-general", "8a31b402ef19", "Digital Foundry's analysis on GTA 6 was spot on: no way base consoles hit 60fps with that crowd simulation density.", now_ms - 1000 * 60 * 55),
        ("msg-gen-102", "relays-general", "62df09a14c33", "Honestly 30fps with perfect frame pacing and high-fidelity motion blur is completely playable for open-world games. RDR2 proved that.", now_ms - 1000 * 60 * 52),
        ("msg-gen-103", "relays-general", "14e92a8819bb", "I just hope we get a PC release within 12 months rather than having to wait until 2027.", now_ms - 1000 * 60 * 47),
        ("msg-gen-104", "relays-general", "5b2041e8d902", "Speaking of engines, anyone notice how good the grass deformation looks in Ghost of Yotei? They definitely upgraded their GPU compute pipeline.", now_ms - 1000 * 60 * 42),
        ("msg-gen-105", "relays-general", "52e091bfa331", "TrollStore 2 on iOS 17.0 is still the goat. Having permanently signed sideloaded apps without 7-day revokes makes iPhones actually tolerable.", now_ms - 1000 * 60 * 38),
        ("msg-gen-106", "relays-general", "7b33a901ff42", "Totally. Running JIT emulators and tweaked clients without a jailbreak reboot panic is bliss.", now_ms - 1000 * 60 * 32),
        ("msg-gen-107", "relays-general", "a0914e21fc88", "Has anyone tried the new Assetto Corsa EVO beta? The tyre thermals feel crazy realistic on direct drive wheels.", now_ms - 1000 * 60 * 27),
        ("msg-gen-108", "relays-general", "8a31b402ef19", "@sim_rig_racer The laser-scanned tracks and rain physics are top tier. Definite upgrade over original AC.", now_ms - 1000 * 60 * 22),
        ("msg-gen-109", "relays-general", "c0a184e912fd", "The soundtrack for DOOM The Dark Ages with that medieval flail combat is pure adrenaline.", now_ms - 1000 * 60 * 14),
        ("msg-gen-110", "relays-general", "19a408ebc220", "id Software is one of the last bastions of engineering discipline in the AAA space. Pure C++ efficiency.", now_ms - 1000 * 60 * 8),

        # relays-dev
        ("msg-dev-101", "relays-dev", "6d88f12a04cb", "Deep dive into the UMTX FreeBSD mutex exploit: it's fascinating how Sony's POSIX mutex locking wrapper left a window for a race condition when detaching threads.", now_ms - 1000 * 60 * 58),
        ("msg-dev-102", "relays-dev", "9f4a120c8b31", "@zero_day The best part was how Andy Nguyen chain-loaded it from userland BD-JB without needing a WebKit RCE. Elegant bypass.", now_ms - 1000 * 60 * 53),
        ("msg-dev-103", "relays-dev", "31f90a44ec12", "The RP2040 Picofly pulse injection logic is equally impressive. Glitching the VDD_CORE rail for precisely 120 nanoseconds to bypass cryptographic signature verification.", now_ms - 1000 * 60 * 49),
        ("msg-dev-104", "relays-dev", "3c91a4e082aa", "Hardware fault injection at sub-micron scales will always defeat software-only security when the attacker has physical possession of the device.", now_ms - 1000 * 60 * 43),
        ("msg-dev-105", "relays-dev", "a410ef89b231", "Benchmarked LazyVim on Neovim 0.10 with Treesitter and LuaJIT: startup time is under 18ms on an NVMe drive. VS Code takes 1.8 seconds haha.", now_ms - 1000 * 60 * 37),
        ("msg-dev-106", "relays-dev", "4e198a00b215", "Rootless Podman with quadlet systemd generators is officially my default for homelab deployments. Daemonless containers are so much cleaner.", now_ms - 1000 * 60 * 29),
        ("msg-dev-107", "relays-dev", "19a408ebc220", "Compiling kernel 6.12 with -O3 -march=native and Clang LTO gave me a noticeable 4% throughput gain on SQLite WAL concurrency benchmarks.", now_ms - 1000 * 60 * 21),
        ("msg-dev-108", "relays-dev", "62df09a14c33", "That aligns with our production SQLite benchmarks. Under WAL mode with concurrent readers, disk I/O isn't even the bottleneck; it's page cache spinlocks.", now_ms - 1000 * 60 * 12),
        ("msg-dev-109", "relays-dev", "6d88f12a04cb", "Next up for PS5: hypervisor research. If the community breaks HV, full native Linux with AMD GPU acceleration will be possible on PS5 hardware.", now_ms - 1000 * 60 * 4)
    ]

    chat_sqls = []
    idx = 100
    for mid, ch, author, text, ts in chats:
        idx += 1
        sql = f"""
        INSERT OR REPLACE INTO messages (
            id, channel_id, author_id, ciphertext, nonce, epoch, status, created_at
        ) VALUES (
            {esc_single(mid)}, {esc_single(ch)}, {esc_single(author)}, {esc_sql_str(text)},
            'nonce-{idx}', '#412', 'verified', {ts}
        );
        """
        chat_sqls.append(sql)

    print(f"Inserting Chat Messages ({len(chat_sqls)} statements in 2 batches)...")
    execute_batch(chat_sqls[:16], "Chat Batch 1")
    execute_batch(chat_sqls[16:], "Chat Batch 2")

    print("\nCOMMENTS AND CHAT SEEDING COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
