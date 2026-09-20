-- UREfy Sovereign Community Seed (100 Sovereign Nicknames, YouTube Embeds, Hacking Stories)
-- 100% Sovereign Pseudonyms / Handles with Emoticons & Real Banter

DELETE FROM user_profiles WHERE user_id LIKE 'fp_%' OR user_id LIKE 'comm-%';
DELETE FROM posts WHERE id LIKE 'post-reddit-%' OR id LIKE 'demo-%';
DELETE FROM comments WHERE id LIKE 'comm-%' OR id LIKE 'c-reddit-%';

-- === 100 SOVEREIGN NICKNAME PROFILES ===
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '7f8a910c2b44', 'ArchChad', 'arch_chad', 'arch linux daily driver, specialty coffee & 48TB zfs homelab. rtx 4080 super. send mechanical switch recs ⌨️☕',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=arch_chad&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Arch", "Homelab"]',
    'https://urefy.com/@arch_chad', 'node // cluj 🇷🇴',
    1787075093392, 1789667093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '3c91a4e082aa', 'void_pointer', 'void_pointer', 'robotics student 🤖 building tiny esp32 drones and crying over rust borrow checker at 3 AM 💀🦀',
    'https://api.dicebear.com/7.x/bottts/svg?seed=void_pointer&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["Robotics", "Rust"]',
    'https://urefy.com/@void_pointer', 'subnet // bucharest 🇷🇴',
    1787161493392, 1789663493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '9f4a120c8b31', 'PacketStorm', 'packet_storm', 'sysadmin by day, overclocker by night 🛡️ digi 10g fiber evangelist, self-hosted everything. if it''s not cat6a don''t talk to me lol 🌐⚡',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=packet_storm&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["Mod", "10Gbps"]',
    'https://urefy.com/@packet_storm', 'node // timisoara 🇷🇴',
    1787247893392, 1789659893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '5b2041e8d902', 'GodotTinker', 'godot_tinker', 'indie gamedev & godot lover 🎮 making pixel roguelikes that nobody will play, playing cs2 when i should be coding 🎯😭',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=godot_tinker&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["Godot", "CS2"]',
    'https://urefy.com/@godot_tinker', 'node // iasi 🇷🇴',
    1787334293392, 1789656293392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '14e92a8819bb', 'PixelWitch', 'pixel_witch', 'data analyst & generative artist 📸 obsessed with local llms on mac m3 max and street photography ✨🧠',
    'https://api.dicebear.com/7.x/notionists/svg?seed=pixel_witch&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["Photo", "LocalAI"]',
    'https://urefy.com/@pixel_witch', 'subnet // bucharest 🇷🇴',
    1787420693392, 1789652693392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '8a31b402ef19', 'DanGaming', 'dan_gaming', 'pc builder & gaming enthusiast 🛠️ from factorio to monster hunter. switched 4 pc cases this year my wallet is in therapy 💸💀',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=dan_gaming&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["PCBuild", "Factorio"]',
    'https://urefy.com/@dan_gaming', 'node // brasov 🇷🇴',
    1787507093392, 1789649093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '62df09a14c33', 'FiberWizard', 'fiber_wizard', 'network architect 🔌 mikrotik, bgp & sfp+. 10 gigabit fiber everywhere. zero wifi where ethernet can reach 🚀📡',
    'https://api.dicebear.com/7.x/bottts/svg?seed=fiber_wizard&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["MikroTik", "Network"]',
    'https://urefy.com/@fiber_wizard', 'node // constanta 🇷🇴',
    1787593493392, 1789645493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '2d89b14c99a0', 'NeonCat', 'neon_cat', 'ui/ux designer & front-end explorer 🎨 svelte fan, typography nerd, cat mom 🐱✨ dark mode or die 🌙',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=neon_cat&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["Design", "Cats"]',
    'https://urefy.com/@neon_cat', 'node // cluj 🇷🇴',
    1787679893392, 1789641893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '4e198a00b215', 'DockerNinja', 'docker_ninja', 'devops survivor 🐳 k8s in the cloud, proxmox at home. currently trying to automate my espresso machine ☕⚡',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=docker_ninja&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["Docker", "Proxmox"]',
    'https://urefy.com/@docker_ninja', 'node // sibiu 🇷🇴',
    1787766293392, 1789638293392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'c0a184e912fd', 'SynthDruid', 'synth_druid', 'sound engineer & modular synth nerd 🎹 pipewire on linux, 16-bit soundscapes and analog filters 🎛️🎧',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=synth_druid&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["Audio", "Synths"]',
    'https://urefy.com/@synth_druid', 'subnet // bucharest 🇷🇴',
    1787852693392, 1789634693392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '7b33a901ff42', 'BioHackerX', 'bio_hacker_x', 'biotech researcher 🧬 open science & biopython. weekend hiker in the carpathians 🏔️🐍',
    'https://api.dicebear.com/7.x/notionists/svg?seed=bio_hacker_x&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Bio", "Hiking"]',
    'https://urefy.com/@bio_hacker_x', 'node // cluj 🇷🇴',
    1787939093392, 1789631093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '91c24fa0e891', 'PiHoarder', 'pi_hoarder', 'raspberry pi hoarder 🍓 7 pis and 12 esp32s blinking across my living room. send help 💡🤦‍♂️',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=pi_hoarder&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["RPi", "IoT"]',
    'https://urefy.com/@pi_hoarder', 'node // ploiesti 🇷🇴',
    1788025493392, 1789627493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'a410ef89b231', 'NeovimCult', 'neovim_cult', 'fullstack dev & soulsborne addict 🗡️ neovim only. mouse is exclusively for elden ring boss fights ⌨️🔥',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=neovim_cult&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["Neovim", "Souls"]',
    'https://urefy.com/@neovim_cult', 'node // craiova 🇷🇴',
    1788111893392, 1789667093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '6d88f12a04cb', 'ZeroDay', 'zero_day', 'cybersec junior & ctf player 🔒 learning ghidra & reverse engineering. your smart lightbulb is a backdoor 🚩👀',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=zero_day&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["CyberSec", "CTF"]',
    'https://urefy.com/@zero_day', 'subnet // bucharest 🇷🇴',
    1788198293392, 1789663493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '31f90a44ec12', 'BitFiddler', 'bit_fiddler', 'embedded c/c++ dev ⚡ automotive can bus by day, soldering iron burns by night 🏎️🔧',
    'https://api.dicebear.com/7.x/bottts/svg?seed=bit_fiddler&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["Embedded", "Auto"]',
    'https://urefy.com/@bit_fiddler', 'node // pitesti 🇷🇴',
    1788284693392, 1789659893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '88b4012ce9fa', 'RetroPixel', 'retro_pixel', 'retro handheld restorer 🕹️ game boy color, crt monitors and chiptune music. modern games have no soul ✨📺',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=retro_pixel&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Retro", "CRT"]',
    'https://urefy.com/@retro_pixel', 'node // arad 🇷🇴',
    1788371093392, 1789656293392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '52e091bfa331', 'AntiTracker', 'anti_tracker', 'digital privacy advocate 🛡️ grapheneos user, tracker blocker tester, fighting algorithmic surveillance 📱🙅‍♀️',
    'https://api.dicebear.com/7.x/notionists/svg?seed=anti_tracker&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["Privacy", "GrapheneOS"]',
    'https://urefy.com/@anti_tracker', 'node // oradea 🇷🇴',
    1788457493392, 1789652693392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '19a408ebc220', 'GentooCompiler', 'gentoo_compiler', 'linux kernel lurker 🐧 still compiling gentoo on old thinkpads for fun. bloat is the enemy 💻☕',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=gentoo_compiler&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["ThinkPad", "Gentoo"]',
    'https://urefy.com/@gentoo_compiler', 'subnet // bucharest 🇷🇴',
    1788543893392, 1789649093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'a0914e21fc88', 'SimRigRacer', 'sim_rig_racer', 'sim racing addict 🏎️ fanatec direct drive, assetto corsa modder, mechanical keyboard builder ⌨️🏁',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=sim_rig_racer&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["SimRacing", "MechKeys"]',
    'https://urefy.com/@sim_rig_racer', 'node // galati 🇷🇴',
    1788630293392, 1789645493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '44df9012a8bc', 'SolarGnome', 'solar_gnome', 'solarpunk builder 🌱 off-grid micro-hydro & open hardware solar inverters. the future will be green ☀️🔋',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=solar_gnome&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["Solarpunk", "Solar"]',
    'https://urefy.com/@solar_gnome', 'node // brasov 🇷🇴',
    1788716693392, 1789641893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'bf0194a28cc1', 'SqliteEnjoyer', 'sqlite_enjoyer', 'database administrator 🐘 postgresql tuner. index scans over seq scans all day every day 📊⚡',
    'https://api.dicebear.com/7.x/bottts/svg?seed=sqlite_enjoyer&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Postgres", "SQL"]',
    'https://urefy.com/@sqlite_enjoyer', 'subnet // bucharest 🇷🇴',
    1787075093392, 1789638293392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '22c88f01a9df', 'CoffeeOverflow', 'coffee_overflow', 'mobile app developer 📱 flutter & swift. minimalist desk setup lover, cold brew addict ☕✨',
    'https://api.dicebear.com/7.x/notionists/svg?seed=coffee_overflow&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["Flutter", "Coffee"]',
    'https://urefy.com/@coffee_overflow', 'node // cluj 🇷🇴',
    1787161493392, 1789634693392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '77e1029ba4c0', 'ChiptuneGhoul', 'chiptune_ghoul', 'indie game music composer 🎵 bitwig studio on linux. 16-bit soundscapes and fm synthesis 🎧👾',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=chiptune_ghoul&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["Chiptune", "Bitwig"]',
    'https://urefy.com/@chiptune_ghoul', 'node // timisoara 🇷🇴',
    1787247893392, 1789631093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '59b04a11ee32', 'CryptoCypher', 'crypto_cypher', 'infosec researcher 🔐 signal advocate, e2ee evangelist. keep your private keys in your pocket 🌐🛡️',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=crypto_cypher&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["E2EE", "Decentral"]',
    'https://urefy.com/@crypto_cypher', 'node // iasi 🇷🇴',
    1787334293392, 1789627493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '83d2019fab66', 'VoronExtruder', 'voron_extruder', '3d printing nerd 🖨️ voron 2.4 builder, freecad modeler. why buy plastic when you can print it at 300mm/s 📐🚀',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=voron_extruder&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["Voron", "CAD"]',
    'https://urefy.com/@voron_extruder', 'node // suceava 🇷🇴',
    1787420693392, 1789667093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '11f802ea9bc4', 'MarkdownMonk', 'markdown_monk', 'technical writer 📝 docs gardener. clean markdown over complex dashboards any day of the week ✨📚',
    'https://api.dicebear.com/7.x/notionists/svg?seed=markdown_monk&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Docs", "Clean"]',
    'https://urefy.com/@markdown_monk', 'subnet // bucharest 🇷🇴',
    1787507093392, 1789663493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '66a0194ebd21', 'VrAviator', 'vr_aviator', 'pcvr enthusiast 🥽 quest 3 + flight sim pilot. 2000 hours in msfs 2024 and still landing sideways ✈️😂',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=vr_aviator&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["VR", "FlightSim"]',
    'https://urefy.com/@vr_aviator', 'node // cluj 🇷🇴',
    1787593493392, 1789659893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '3a4092bbf102', 'CyberRights', 'cyber_rights', 'digital rights lawyer ⚖️ gdpr watcher, eu chat control fighter, civil liberties advocate 🛡️✊',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=cyber_rights&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["Law", "Rights"]',
    'https://urefy.com/@cyber_rights', 'subnet // bucharest 🇷🇴',
    1787679893392, 1789656293392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '99df012aa4c3', 'MatrixDrifter', 'matrix_drifter', 'self-hosted matrix admin 💬 xmpp veteran. decentralize or bust. cloud is just someone else''s computer 🐧🌐',
    'https://api.dicebear.com/7.x/bottts/svg?seed=matrix_drifter&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["Matrix", "Linux"]',
    'https://urefy.com/@matrix_drifter', 'node // bacau 🇷🇴',
    1787766293392, 1789652693392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '42c90a18eb77', 'CozyPixel', 'cozy_pixel', 'pixel artist & animator 🎨 aseprite wizard, lover of cozy indie games, matcha tea & lo-fi beats 🍵✨',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=cozy_pixel&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["Aseprite", "Tea"]',
    'https://urefy.com/@cozy_pixel', 'node // brasov 🇷🇴',
    1787852693392, 1789649093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '8d104fb2a901', 'HexDriver', 'hex_driver', 'fiber optics technician 🔌 home server tinkerer by night. cat6 cable wizard, zero packet loss guaranteed 💻🚀',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=hex_driver&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Fiber", "Homelab"]',
    'https://urefy.com/@hex_driver', 'node // timisoara 🇷🇴',
    1787939093392, 1789645493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '15e0921ab4c8', 'VulkanWizard', 'vulkan_wizard', 'graphics programmer in c++ ⚡ exploring vulkan, raytracing and physical simulation shaders 🎮👾',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=vulkan_wizard&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["Vulkan", "Graphics"]',
    'https://urefy.com/@vulkan_wizard', 'subnet // bucharest 🇷🇴',
    1788025493392, 1789641893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '70a40f91b2df', 'SovereignPeer', 'sovereign_peer', 'sovereign computing purist 🔑 local cryptography, zero web3 hype, zero tracking. your device your rules 🚫🛡️',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=sovereign_peer&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["Sovereign", "NoCrypto"]',
    'https://urefy.com/@sovereign_peer', 'node // cluj 🇷🇴',
    1788111893392, 1789638293392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'b2901a4fc883', 'RustAcean', 'rust_acean', 'open source contributor 🦀 rustacean. writing tiny cli tools that do one thing and do it exceptionally well 🛠️💻',
    'https://api.dicebear.com/7.x/notionists/svg?seed=rust_acean&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["Rust", "CLI"]',
    'https://urefy.com/@rust_acean', 'node // iasi 🇷🇴',
    1788198293392, 1789634693392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '38df02ba91c0', 'FpvFreestyle', 'fpv_freestyle', 'fpv drone pilot 🚁 betaflight tuner, carbon fiber frames, sending 6S packs into tree branches 🔋💀',
    'https://api.dicebear.com/7.x/bottts/svg?seed=fpv_freestyle&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["FPV", "Electronics"]',
    'https://urefy.com/@fpv_freestyle', 'node // oradea 🇷🇴',
    1788284693392, 1789631093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '6f1084ea2b99', 'SwitchLubricator', 'switch_lubricator', 'custom mechanical keyboards ⌨️ lubing switches for 8 hours straight. deskmat collector, cozy aesthetic ✨🌸',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=switch_lubricator&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Keyboards", "Cozy"]',
    'https://urefy.com/@switch_lubricator', 'subnet // bucharest 🇷🇴',
    1788371093392, 1789627493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'a500912fa8cc', 'SpeedrunGhoul', 'speedrun_ghoul', 'speedrunner 🍓 celeste, hollow knight & sekiro. waiting for silksong since 2019 with clown makeup on 🤡🐞',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=speedrun_ghoul&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["Celeste", "Silksong"]',
    'https://urefy.com/@speedrun_ghoul', 'node // sibiu 🇷🇴',
    1788457493392, 1789667093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '29c40ea18df2', 'ZfsGoblin', 'zfs_goblin', 'storage reliability engineer 💾 zfs mirror pools, raidz2 backups, ecc memory believer. backup your data kids! 🔒🛡️',
    'https://api.dicebear.com/7.x/notionists/svg?seed=zfs_goblin&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["ZFS", "TrueNAS"]',
    'https://urefy.com/@zfs_goblin', 'node // timisoara 🇷🇴',
    1788543893392, 1789663493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '94df0218ab44', 'ProtonRider', 'proton_rider', 'linux gamer & steam deck tinkerer 🎮 proton-ge tester, emudeck archivist. windows on handhelds is a crime 🐧🔋',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=proton_rider&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["SteamDeck", "Proton"]',
    'https://urefy.com/@proton_rider', 'node // cluj 🇷🇴',
    1788630293392, 1789659893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '4b109af38c01', 'SecGuardian', 'sec_guardian', 'cybersecurity educator 🛡️ teaching safe online habits, password managers & e2ee to the next generation 🔐✨',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=sec_guardian&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["Education", "Privacy"]',
    'https://urefy.com/@sec_guardian', 'subnet // bucharest 🇷🇴',
    1788716693392, 1789656293392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '87a01fa29cb5', 'ZigbeeMaster', 'zigbee_master', 'home assistant automations master 🏠 zigbee network debugger. if a light can be automated it will be 🐝⚡',
    'https://api.dicebear.com/7.x/bottts/svg?seed=zigbee_master&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["SmartHome", "Zigbee"]',
    'https://urefy.com/@zigbee_master', 'node // brasov 🇷🇴',
    1787075093392, 1789652693392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '1c490a21fd88', 'RiscvExplorer', 'riscv_explorer', 'open source silicon researcher 🔬 risc-v enthusiast, compiler explorer, llvm hacker ⚡💻',
    'https://api.dicebear.com/7.x/notionists/svg?seed=riscv_explorer&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["RISC-V", "Compilers"]',
    'https://urefy.com/@riscv_explorer', 'node // iasi 🇷🇴',
    1787161493392, 1789649093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '54b09ef12a77', 'ArenaVeteran', 'arena_veteran', 'arena shooter veteran 🚀 quake live & unreal tournament. 240hz oled believer, sub-millisecond input lag purist ⚡🎯',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=arena_veteran&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["Quake", "240Hz"]',
    'https://urefy.com/@arena_veteran', 'subnet // bucharest 🇷🇴',
    1787247893392, 1789645493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'da0194f28bc1', 'TauriFanatic', 'tauri_fanatic', 'fullstack typescript dev 🌐 building peer-to-peer web apps with webcrypto & zero server authority 📦🔐',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=tauri_fanatic&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["P2P", "TS"]',
    'https://urefy.com/@tauri_fanatic', 'node // cluj 🇷🇴',
    1787334293392, 1789641893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '3e901a88fb22', 'TinyModelHacker', 'tiny_model_hacker', 'computational linguistics student 📚 experimenting with tiny 1b-3b models on edge hardware. words matter ✨🧠',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=tiny_model_hacker&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["Linguistics", "SmallLLMs"]',
    'https://urefy.com/@tiny_model_hacker', 'subnet // bucharest 🇷🇴',
    1787420693392, 1789638293392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'b1409ea28c99', 'DeepSeekRunner', 'deepseek_runner', 'machine learning researcher 🔬 local ollama & vllm experiments, coffee enthusiast, open weights evangelist ☕🚀',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=deepseek_runner&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["ML", "Coffee"]',
    'https://urefy.com/@deepseek_runner', 'datacenter // montreal 🇨🇦',
    1787507093392, 1789634693392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '7c9102ab84df', 'ArchonPrime', 'archon_prime', 'distributed systems & privacy engineer 🛡️ building UREfy open protocols. sovereign keys for sovereign humans 🌐✨',
    'https://api.dicebear.com/7.x/bottts/svg?seed=archon_prime&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["Archon", "Protocols"]',
    'https://urefy.com/@archon_prime', 'orbit // san francisco 🇺🇸',
    1787593493392, 1789631093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'a89104fa2211', 'VintageByte', 'vintage_byte', 'community moderator & vintage systems hacker 💾 commodore 64 collector, digital civil liberties advocate 🛡️🕹️',
    'https://api.dicebear.com/7.x/notionists/svg?seed=vintage_byte&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["Moderator", "Vintage"]',
    'https://urefy.com/@vintage_byte', 'homelab // austin 🇺🇸',
    1787679893392, 1789627493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'c3dc28cb705e', 'ZeroKnowledge', 'zero_knowledge', 'cryptographic protocols & zkp researcher 🔒 zero-knowledge proofs, sovereign identity, post-quantum readiness 📐✨',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=zero_knowledge&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["Crypto", "Early"]',
    'https://urefy.com/@zero_knowledge', 'mesh // berlin 🇩🇪',
    1787766293392, 1789667093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'f40019bc88a2', 'MeshWanderer', 'mesh_wanderer', 'embedded systems & p2p mesh radios 📻 lora, meshtastic, zero-cloud offgrid communication ⚡🌲',
    'https://api.dicebear.com/7.x/bottts/svg?seed=mesh_wanderer&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["LoRa", "Mesh"]',
    'https://urefy.com/@mesh_wanderer', 'peer // bristol 🇬🇧',
    1787852693392, 1789663493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '9b22a011cd44', 'WebGpuArtist', 'webgpu_artist', 'creative technologist 🎨 webgpu shaders, three.js generative art, open source graphics code ✨🌈',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=webgpu_artist&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["WebGPU", "Creative"]',
    'https://urefy.com/@webgpu_artist', 'node // vancouver 🇨🇦',
    1787939093392, 1789659893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '4d89a01fbb23', 'AsmPurist', 'asm_purist', 'game engine developer & c99 purist 🕹️ retro 68k assembly, profiling cache misses, low-level optimization 👾💻',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=asm_purist&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["Gamedev", "ASM"]',
    'https://urefy.com/@asm_purist', 'node // krakow 🇵🇱',
    1788025493392, 1789656293392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '88f019ab4c21', 'EbpfWatcher', 'ebpf_watcher', 'linux kernel hacker & ebpf observability nerd 🐧 running fedora silverblue. immutable desktops are the future 🔍⚡',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=ebpf_watcher&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["Kernel", "eBPF"]',
    'https://urefy.com/@ebpf_watcher', 'node // stockholm 🇸🇪',
    1788111893392, 1789652693392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '2a9104eb8c33', 'SolarpunkRoot', 'solarpunk_root', 'indie game designer & pixel artist 🌱 crafting cozy solarpunk roguelikes. tea drinker, cat guardian 🐱🎮',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=solarpunk_root&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["Solarpunk", "Indie"]',
    'https://urefy.com/@solarpunk_root', 'node // oslo 🇳🇴',
    1788198293392, 1789649093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '63c901afb844', 'HardwareGlitch', 'hardware_glitch', 'hardware security researcher 🔬 physical tamper resistance, power analysis & glitch attacks. trust nothing 🛡️👀',
    'https://api.dicebear.com/7.x/bottts/svg?seed=hardware_glitch&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["Hardware", "Sec"]',
    'https://urefy.com/@hardware_glitch', 'lab // munich 🇩🇪',
    1788284693392, 1789645493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '17df8902ab55', 'OpenScienceCore', 'open_science_core', 'open science advocate ⚛️ cern alumni, pythonista. reproducible research and open access papers for all 📚🐍',
    'https://api.dicebear.com/7.x/notionists/svg?seed=open_science_core&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Physics", "Python"]',
    'https://urefy.com/@open_science_core', 'node // lyon 🇫🇷',
    1788371093392, 1789641893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '5e019ab28c66', 'ModularSound', 'modular_sound', 'audio engineer & eurorack modular builder 🎛️ custom analog dsp filters. pure analog warmth 🎧⚡',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=modular_sound&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["Eurorack", "DSP"]',
    'https://urefy.com/@modular_sound', 'node // vienna 🇦🇹',
    1788457493392, 1789638293392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '92c4018fba77', 'MiSTer_Arcade', 'mister_arcade', 'arcade cabinet restorer & fpga mister lover 🕹️ akihabara scavenger, crt scanlines enthusiast 🇯🇵📺',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=mister_arcade&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["MiSTer", "Tokyo"]',
    'https://urefy.com/@mister_arcade', 'arcade // tokyo 🇯🇵',
    1788543893392, 1789634693392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '35df9012a888', 'HydroponicBot', 'hydroponic_bot', 'botanist & open agriculture researcher 🌿 automated hydroponics with raspberry pi & solar power ☀️🌱',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=hydroponic_bot&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["Botanics", "Solar"]',
    'https://urefy.com/@hydroponic_bot', 'node // bologna 🇮🇹',
    1788630293392, 1789631093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '78a014fb9c99', 'FreePressNode', 'free_press_node', 'tech journalist & civil liberties investigator 📰 covering digital surveillance, backdoors and whistleblowers 🔒🛡️',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=free_press_node&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["Press", "Freedom"]',
    'https://urefy.com/@free_press_node', 'node // dublin 🇮🇪',
    1788716693392, 1789627493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '21f09ab8c401', 'DecentralIdentity', 'decentral_identity', 'open web standards advocate 🌐 w3c contributor, decentralized identifiers (did) and verifiable credentials 🆔✨',
    'https://api.dicebear.com/7.x/notionists/svg?seed=decentral_identity&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Standards", "DID"]',
    'https://urefy.com/@decentral_identity', 'node // lagos 🇳🇬',
    1787075093392, 1789667093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '64c8012fab12', 'PodmanSailor', 'podman_sailor', 'cloud native developer 🦭 podman enthusiast, rootless containers survivor, linux sysadmin 🇧🇷💻',
    'https://api.dicebear.com/7.x/bottts/svg?seed=podman_sailor&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["Podman", "Brazil"]',
    'https://urefy.com/@podman_sailor', 'node // sao paulo 🇧🇷',
    1787161493392, 1789663493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'a7df9012bc23', 'ScadaWind', 'scada_wind', 'renewable energy telemetry engineer 💨 scada with python, wind turbine sensors & microgrids ⚡🌊',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=scada_wind&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["Wind", "Grid"]',
    'https://urefy.com/@scada_wind', 'grid // aarhus 🇩🇰',
    1787247893392, 1789659893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '39b014ea8d34', 'RaftConsensus', 'raft_consensus', 'distributed databases engineer 🐹 raft consensus in go, high throughput key-value stores 📦🚀',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=raft_consensus&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["Golang", "Raft"]',
    'https://urefy.com/@raft_consensus', 'node // dubai 🇦🇪',
    1787334293392, 1789656293392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '82c901afcb45', 'A11yPaladin', 'a11y_paladin', 'accessibility specialist (a11y) ♿ semantic html evangelist, screen reader testing, high contrast designs 📐✨',
    'https://api.dicebear.com/7.x/notionists/svg?seed=a11y_paladin&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["A11y", "Design"]',
    'https://urefy.com/@a11y_paladin', 'node // gothenburg 🇸🇪',
    1787420693392, 1789652693392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '1bf08912ea56', 'OpenSilicon', 'open_silicon', 'chip design engineer 🔬 verilog, chisel & open source silicon. risc-v all the things 💻⚡',
    'https://api.dicebear.com/7.x/bottts/svg?seed=open_silicon&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Silicon", "RISCV"]',
    'https://urefy.com/@open_silicon', 'lab // bengaluru 🇮🇳',
    1787507093392, 1789649093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '5ec4018fba67', 'OceanAcoustics', 'ocean_acoustics', 'marine acoustics researcher 🐋 open hydrophones, recording whale vocalizations with biopython 🎙️🌊',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=ocean_acoustics&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["Ocean", "Sound"]',
    'https://urefy.com/@ocean_acoustics', 'station // kiel 🇩🇪',
    1787593493392, 1789645493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '91df9012cb78', 'LowPolyCrafter', 'lowpoly_crafter', 'game animator & blender artist 🧊 low poly 3d aesthetics, cozy lighting & shader tricks 🎨🎮',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=lowpoly_crafter&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["LowPoly", "Blender"]',
    'https://urefy.com/@lowpoly_crafter', 'studio // barcelona 🇪🇸',
    1787679893392, 1789641893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '24a014f9ec89', 'JellyfinPirate', 'jellyfin_pirate', 'homelab hoarder (60TB zfs) 🎬 jellyfin streamer, unraid to debian convert, ecc memory only 🐧🍿',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=jellyfin_pirate&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["Jellyfin", "Debian"]',
    'https://urefy.com/@jellyfin_pirate', 'vault // helsinki 🇫🇮',
    1787766293392, 1789638293392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '67c8012afb90', 'PQCryptographer', 'pq_cryptographer', 'cryptography student 🛡️ lattice-based math, post-quantum algorithms & zero-knowledge rollups 📐🔒',
    'https://api.dicebear.com/7.x/notionists/svg?seed=pq_cryptographer&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["PQ-Crypto", "Math"]',
    'https://urefy.com/@pq_cryptographer', 'node // cairo 🇪🇬',
    1787852693392, 1789634693392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'aa0194f2cd01', 'FirmwareDumper', 'firmware_dumper', 'reverse engineering researcher 🔍 ghidra script writer, dumping firmware from iot toasters 💻⚡',
    'https://api.dicebear.com/7.x/bottts/svg?seed=firmware_dumper&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Reverse", "Firmware"]',
    'https://urefy.com/@firmware_dumper', 'node // prague 🇨🇿',
    1787939093392, 1789631093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '3db014ea9e12', 'DarkModePurist', 'darkmode_purist', 'ui designer for privacy tools 🌙 dark mode evangelist, clean layouts, zero dark patterns allowed 🎨✨',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=darkmode_purist&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["DarkMode", "UI"]',
    'https://urefy.com/@darkmode_purist', 'node // athens 🇬🇷',
    1788025493392, 1789627493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '80c901afdf23', 'BspwmRicer', 'bspwm_ricer', 'linux ricing enthusiast 🍚 bspwm, rofi, spending 6 hours perfecting my neofetch colors 💀🐧',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=bspwm_ricer&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["Ricing", "BSPWM"]',
    'https://urefy.com/@bspwm_ricer', 'node // kochi 🇮🇳',
    1788111893392, 1789667093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '13f08912ef34', 'AgriTechMesh', 'agritech_mesh', 'agritech builder 🌱 soil moisture sensors, lora weather stations & organic vineyard monitoring 🌦️🍇',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=agritech_mesh&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["AgriTech", "Weather"]',
    'https://urefy.com/@agritech_mesh', 'node // bordeaux 🇫🇷',
    1788198293392, 1789663493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '56c4018ffa45', 'OfflineWhisper', 'offline_whisper', 'podcast audio producer 🎙️ ffmpeg script wizard, local whisper transcription, lo-fi beats lover 📼🎧',
    'https://api.dicebear.com/7.x/notionists/svg?seed=offline_whisper&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["Audio", "Lo-Fi"]',
    'https://urefy.com/@offline_whisper', 'studio // manchester 🇬🇧',
    1788284693392, 1789659893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '9ad09012ab56', 'TokyoDrifter', 'tokyo_drifter', 'rust backend engineer 🦀 axum, tokio, high-throughput microservices. minimalist code only ⛩️💻',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=tokyo_drifter&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Rust", "Kyoto"]',
    'https://urefy.com/@tokyo_drifter', 'node // kyoto 🇯🇵',
    1788371093392, 1789656293392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '2da014f9bc67', 'BrouterCyclist', 'brouter_cyclist', 'cycling telematics hacker 🚲 open source gps loggers, openstreetmap mapper, zero cloud dependencies 🗺️🚴',
    'https://api.dicebear.com/7.x/bottts/svg?seed=brouter_cyclist&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["Cycling", "OpenStreetMap"]',
    'https://urefy.com/@brouter_cyclist', 'peer // utrecht 🇳🇱',
    1788457493392, 1789652693392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '60c8012acd78', 'GameBugHunter', 'game_bug_hunter', 'game tester & accessibility advocate ♿ subtitles enthusiast, testing indies on steam deck 🎮❤️',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=game_bug_hunter&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["Tester", "A11y"]',
    'https://urefy.com/@game_bug_hunter', 'node // warsaw 🇵🇱',
    1788543893392, 1789649093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'a30194f2de89', 'SwitchModder', 'switch_modder', 'mechanical keyboard switch designer ⌨️ custom linear stems, krytox 205g0 lube addict ☕✨',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=switch_modder&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["Switches", "Coffee"]',
    'https://urefy.com/@switch_modder', 'studio // seattle 🇺🇸',
    1788630293392, 1789645493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '36b014eaef90', 'HamRadioOp', 'ham_radio_op', 'telecom history researcher 📜 early packet radio networks & amateur ham radio (callsign IW5... ) 📻✨',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=ham_radio_op&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["History", "Radio"]',
    'https://urefy.com/@ham_radio_op', 'node // florence 🇮🇹',
    1788716693392, 1789641893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '79c901affa01', 'TorrentDHTSeed', 'torrent_dht_seed', 'p2p torrent protocol developer 🌊 bittorrent v2, dht mapping, distributed content addressing 📦🚀',
    'https://api.dicebear.com/7.x/bottts/svg?seed=torrent_dht_seed&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["P2P", "Torrent"]',
    'https://urefy.com/@torrent_dht_seed', 'peer // lille 🇫🇷',
    1787075093392, 1789638293392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '1cf08912fa12', 'AlphaFoldMapper', 'alphafold_mapper', 'computational biology researcher 🧬 foldseek & alphafold user, biopython scripts for protein folding 🔬✨',
    'https://api.dicebear.com/7.x/notionists/svg?seed=alphafold_mapper&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["AlphaFold", "Python"]',
    'https://urefy.com/@alphafold_mapper', 'lab // pune 🇮🇳',
    1787161493392, 1789634693392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '5fc4018fab23', 'ELRS_QuadPilot', 'elrs_quad_pilot', 'fpv quad racing pilot 🚁 custom carbon fiber builds, elrs transmitter tuner, sending it through gates ⚡🏁',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=elrs_quad_pilot&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["FPV", "ELRS"]',
    'https://urefy.com/@elrs_quad_pilot', 'node // hamburg 🇩🇪',
    1787247893392, 1789631093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '92d09012bc34', 'PlainTextGuru', 'plain_text_guru', 'minimalist software evangelist 🗄️ sqlite for everything, plain text markdown, local first forever 📝✨',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=plain_text_guru&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["SQLite", "Notes"]',
    'https://urefy.com/@plain_text_guru', 'node // uppsala 🇸🇪',
    1787334293392, 1789627493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '25a014f9cd45', 'NeoGeoCabinet', 'neogeo_cabinet', 'crt television collector 📺 rgb scart cables, neo geo mvs arcade cabinet owner. 240p glory 🕹️👾',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=neogeo_cabinet&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["CRT", "NeoGeo"]',
    'https://urefy.com/@neogeo_cabinet', 'vault // bath 🇬🇧',
    1787420693392, 1789667093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '68c8012ade56', 'EarthTelemetry', 'earth_telemetry', 'open climate data visualization 🌍 d3.js, satellite data pipelines, environmental monitoring 📊🛰️',
    'https://api.dicebear.com/7.x/notionists/svg?seed=earth_telemetry&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Earth", "D3js"]',
    'https://urefy.com/@earth_telemetry', 'node // recife 🇧🇷',
    1787507093392, 1789663493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'ab0194f2ef67', 'ArcticSolarLab', 'arctic_solar_lab', 'diy solar homelab builder ☀️ 12v lifepo4 battery bank, running edge nodes off-grid in the arctic 🔋❄️',
    'https://api.dicebear.com/7.x/bottts/svg?seed=arctic_solar_lab&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["Offgrid", "12V"]',
    'https://urefy.com/@arctic_solar_lab', 'arctic // tromso 🇳🇴',
    1787593493392, 1789659893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '3eb014eafa78', 'FontFoundryKid', 'font_foundry_kid', 'typographer & font designer 🔤 variable web fonts, monospace typography nerd, clean layouts 🎨✨',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=font_foundry_kid&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["Fonts", "Typography"]',
    'https://urefy.com/@font_foundry_kid', 'studio // taipei 🇹🇼',
    1787679893392, 1789656293392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '71c901afab89', 'Motorola68k', 'motorola_68k', 'amiga 500 & c64 demoscene coder 🕹️ motorola 68000 assembly, copper bars and raster interrupts 👾✨',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=motorola_68k&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["Amiga", "68k"]',
    'https://urefy.com/@motorola_68k', 'node // zurich 🇨🇭',
    1787766293392, 1789652693392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '14f08912bc90', 'MountainTrailGPS', 'mountain_trail_gps', 'open mapping contributor 🗺️ qgis, mapping public mountain drinking water fountains & trails 🏔️💧',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=mountain_trail_gps&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["QGIS", "Trekking"]',
    'https://urefy.com/@mountain_trail_gps', 'node // granada 🇪🇸',
    1787852693392, 1789649093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '57c4018fcd01', 'PipewireJockey', 'pipewire_jockey', 'linux audio enthusiast 🎛️ pipewire graph routing, low-latency live jam sessions with jack 🐧🎧',
    'https://api.dicebear.com/7.x/bottts/svg?seed=pipewire_jockey&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Modular", "Pipewire"]',
    'https://urefy.com/@pipewire_jockey', 'node // leipzig 🇩🇪',
    1787939093392, 1789645493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '9ad09012de12', 'DnsTruthSeeker', 'dns_truth_seeker', 'tech journalist & privacy advocate 📰 investigating ad-tech tracking & dark patterns across big tech ⚖️🛡️',
    'https://api.dicebear.com/7.x/notionists/svg?seed=dns_truth_seeker&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["TechPress", "Ethics"]',
    'https://urefy.com/@dns_truth_seeker', 'node // casablanca 🇲🇦',
    1788025493392, 1789641893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '2ea014f9ef23', 'SubZeroClocker', 'subzero_clocker', 'sub-zero overclocking chaser ❄️ direct die cooling on am5, liquid nitrogen runs on weekends ⚡🏆',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=subzero_clocker&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["SubZero", "AM5"]',
    'https://urefy.com/@subzero_clocker', 'lab // belgrade 🇷🇸',
    1788111893392, 1789638293392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '61c8012afa34', 'PasskeyPioneer', 'passkey_pioneer', 'passkeys & webauthn researcher 🔑 fido2 evangelist, kill all passwords with hardware security keys 🛡️✨',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=passkey_pioneer&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["WebAuthn", "UX"]',
    'https://urefy.com/@passkey_pioneer', 'node // geneva 🇨🇭',
    1788198293392, 1789634693392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'a40194f2ab45', 'FreeBSD_Demon', 'freebsd_demon', 'freebsd & zfs storage architect 😈 100gbe home lab, bhyve hypervisors, uptime measured in years 💾⚡',
    'https://api.dicebear.com/7.x/bottts/svg?seed=freebsd_demon&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["FreeBSD", "ZFS"]',
    'https://urefy.com/@freebsd_demon', 'homelab // copenhagen 🇩🇰',
    1788284693392, 1789631093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '37b014eabc56', 'RetroMysteryDev', 'retro_mystery_dev', 'point-and-click adventure gamedev 🔍 crafting retro mystery games with aseprite and custom engines 🎨🕹️',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=retro_mystery_dev&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Pixels", "Adventure"]',
    'https://urefy.com/@retro_mystery_dev', 'node // gdansk 🇵🇱',
    1788371093392, 1789627493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '7ac901afcd67', 'GrafanaHawk', 'grafana_hawk', 'observability engineer 📊 prometheus, grafana & open telemetry. if it moves, trace it ⚡📈',
    'https://api.dicebear.com/7.x/notionists/svg?seed=grafana_hawk&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', NULL, '["Grafana", "Tracing"]',
    'https://urefy.com/@grafana_hawk', 'node // amman 🇯🇴',
    1788457493392, 1789667093392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '1df08912de78', 'StarkProver', 'stark_prover', 'zero-knowledge cryptographer 🔒 reading eprint papers for breakfast, implementing stark proofs 📐✨',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=stark_prover&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80', NULL, '["Math", "ZKP"]',
    'https://urefy.com/@stark_prover', 'node // umea 🇸🇪',
    1788543893392, 1789663493392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '50c4018fef89', 'FujifilmNight', 'fujifilm_night', 'cyberpunk street photographer 📷 fujifilm film recipes, night neon, mechanical watches collector ⌚🏙️',
    'https://api.dicebear.com/7.x/bottts/svg?seed=fujifilm_night&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', NULL, '["Fuji", "Mechanical"]',
    'https://urefy.com/@fujifilm_night', 'night // osaka 🇯🇵',
    1788630293392, 1789659893392
);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '93d09012fa90', 'CanvasBlocker', 'canvas_blocker', 'anti-tracking researcher 🛡️ auditing canvas fingerprinting scripts, open privacy tools advocate 🍪🙅‍♀️',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=canvas_blocker&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80', NULL, '["Privacy", "AntiTracker"]',
    'https://urefy.com/@canvas_blocker', 'node // doha 🇶🇦',
    1788716693392, 1789656293392
);

-- === SOVEREIGN CONVERSATIONAL POSTS WITH YOUTUBE EMBEDS ===
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-ai-1', 'c/privacy-ai', 'b1409ea28c99',
    'GUARDIAN', 'DeepSeek R1 locally running on dual 3090s is absolutely insane. OpenAI is charging $200/mo for what we can run in our basements 🤯🚀', 'The open-weights AI space just had its Linux moment. DeepSeek-R1 with Multi-Head Latent Attention (MLA) and pure reinforcement learning matched OpenAI o1 reasoning at a training budget under $6M (compared to hundreds of millions). Running the AWQ 4-bit quantized model locally via vLLM (https://github.com/vllm-project/vllm) with a 32k context window is blistering fast. It actually reasons in the <think> tokens, catches its own mistakes, and costs zero dollars per token! Fireship did a hilarious breakdown of how Silicon Valley panicked: https://www.youtube.com/watch?v=xBByvFrqmWU 🤖✨',
    'AI RESEARCH', 1240, 0, 4,
    310, '{"src": "https://www.youtube.com/watch?v=xBByvFrqmWU"}', 'published', 1789665893392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-ai-1-1', 'p-ai-1', NULL, '14e92a8819bb',
    'MEMBER', 'Running DeepSeek-R1-Distill-Qwen-14B on my Mac M3 Max via Ollama... it''s mind-boggling how smart it is 🤯 Seeing the model debate with itself inside <think> tags feels like watching someone have an existential breakthrough in real time lmao 😂🧠', 92, 1789666013392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-ai-1-2', 'p-ai-1', NULL, '3c91a4e082aa',
    'MEMBER', 'The best part? It''s released under a genuine MIT license! Not that fake ''Community License'' corporate BS where you can''t use it if you have users. You can take the weights from https://github.com/deepseek-ai/DeepSeek-R1 and nobody can pull the plug 🔒🚀', 74, 1789666193392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-ai-1-3', 'p-ai-1', NULL, '7c9102ab84df',
    'GUARDIAN', 'Sovereign, open-weights AI will always outcompete centralized walled gardens in the long run. When weights are public, thousands of independent researchers optimize kernels, quantization, and inference engines overnight 🤝🌐', 86, 1789666493392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-ai-1-4', 'p-ai-1', NULL, 'bf0194a28cc1',
    'MEMBER', 'Dual RTX 3090s with NVLink are literally the best investment anyone in ML could have made 3 years ago. 48GB VRAM for under $1,400 total is unbeatable for running local 70B quants ☕⚡', 68, 1789666793392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-tech-1', 'c/technology', '7f8a910c2b44',
    'MEMBER', '9800X3D is the undisputed gaming king. Did Intel completely drop the ball with Arrow Lake? 💥👑', 'Been watching the Hardware Unboxed and Gamers Nexus deep dives all weekend. The 9800X3D is 25-40% ahead of the Core Ultra 9 285K in competitive titles (CS2, Valorant, Assetto Corsa) while pulling nearly HALF the power draw 🤯 Plus AMD putting the 3D V-Cache underneath the compute die solved all thermal transfer bottlenecks. Steve''s full benchmark suite tells the whole brutal story: https://www.youtube.com/watch?v=s-lFgbzU3LY. More detailed architecture breakdown on AnandTech/Ars: https://arstechnica.com 💻🔥',
    'HARDWARE', 980, 0, 4,
    215, '{"src": "https://www.youtube.com/watch?v=s-lFgbzU3LY"}', 'published', 1789664393392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-1-1', 'p-tech-1', NULL, '2ea014f9ef23',
    'MEMBER', 'Got mine on launch day in Belgrade! Running -25 Curve Optimizer on all cores with 6000MHz CL28 DDR5. It doesn''t even hit 68C under a basic Noctua NH-D15 air cooler ❄️ Intel''s tile architecture inter-die latency penalty completely killed their 1% lows in gaming 💀', 77, 1789664693392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-1-2', 'p-tech-1', NULL, '9f4a120c8b31',
    'MODERATOR', 'Locally in Romania it was sold out in 4 minutes lol 😭 Scalpers put them on OLX for €700 instantly. I''m waiting 3 weeks for restocks at MSRP, not giving scalpers a single cent 🙅‍♂️⚡', 63, 1789664993392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-1-3', 'p-tech-1', NULL, '8a31b402ef19',
    'MEMBER', 'Sitting here with my 5800X3D wondering if it''s worth replacing motherboard + DDR5 ram. At 4K with an RTX 4080 the GPU is at 99% anyway, but those 1% lows in Cyberpunk are tempting ngl 🤤', 41, 1789665293392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-1-4', 'p-tech-1', NULL, '1c490a21fd88',
    'MEMBER', 'Inverting the silicon stack so the hot Zen 5 cores sit directly under the integrated heat spreader (IHS) was masterclass thermal engineering. AMD solved a 3-generation heat dissipation headache with one flip 🔬📐', 58, 1789665893392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-game-1', 'c/gaming', '8a31b402ef19',
    'MEMBER', 'Monster Hunter Wilds PC beta performance deep dive: Can Capcom fix the stutter before launch? 💀🦖', 'Capcom dropped the official Monster Hunter Wilds reveal trailer and PC benchmark test: https://www.youtube.com/watch?v=zyoBA0aCRNk. On my RTX 4070, without frame generation it dips into the mid 40s during sandstorms 😭 If you''re struggling on PC, community members on Reddit found turning Volumetrics and Geometry Streaming to Medium boosts 1% lows by +35%! Check out the patch discussions on Steam: https://store.steampowered.com 🎮✨',
    'GAMING', 860, 0, 4,
    165, '{"src": "https://www.youtube.com/watch?v=zyoBA0aCRNk"}', 'published', 1789662593392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-game-1-1', 'p-game-1', NULL, '5b2041e8d902',
    'MEMBER', 'Tested on my 3060 Ti... it''s pure pain 💀 CPU usage is sitting at 95% constant, feels like it''s compiling shaders in a background infinite loop lmao. If this is the launch build, Steam reviews are going to be overwhelmingly negative on day 1 😭', 68, 1789662893392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-game-1-1-1', 'p-game-1', 'c-game-1-1', 'a500912fa8cc',
    'MEMBER', 'Check r/monsterhunter! People found that Capcom literally left debug telemetry symbols in the executable lol 🤦‍♂️ Dropping volumetrics to Medium and shadows to Medium gives +35% fps without losing much visual fidelity! 🚀', 54, 1789663493392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-game-1-2', 'p-game-1', NULL, '94df0218ab44',
    'MEMBER', 'On Steam Deck it crashes straight to desktop before even reaching the character creator lmao 💀 Tried Proton GE 9-20 and Proton Experimental, absolutely dead in the water. We need a miracle patch 🧙‍♂️🔋', 39, 1789664093392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-game-1-3', 'p-game-1', NULL, '4d89a01fbb23',
    'MEMBER', 'The root cause is cache thrashing. RE Engine was engineered for linear indoor corridors (RE7, Village). Stretching that topology into an open-world streaming matrix with dynamic bone physics causes severe L3 evictions 🧠💻', 61, 1789664693392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-game-2', 'c/gaming', 'a0914e21fc88',
    'MEMBER', 'GTA VI Trailer 1 hit 200M views. The physics engine and density look generational 🌴🚗💥', 'Re-watching Rockstar''s GTA VI Trailer in 4K: https://www.youtube.com/watch?v=QdBZY2fkU-0. The cloth simulation, beach crowd density, water refraction, and volumetric atmospheric lighting are pushing current consoles to their absolute limit. Anyone else hoping PC release doesn''t lag 2 years behind? Discussions on Digital Foundry and Reddit are wild: https://www.reddit.com/r/GTA6/ 🏎️🔥',
    'GAMING', 1420, 0, 3,
    340, '{"src": "https://www.youtube.com/watch?v=QdBZY2fkU-0"}', 'published', 1789661093392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-game-2-1', 'p-game-2', NULL, '8a31b402ef19',
    'MEMBER', 'The vehicle deformation and suspension physics in the mud scene alone look lightyears ahead of GTA V. Rockstar''s proprietary RAGE engine team are literal wizards 🧙‍♂️🚗', 89, 1789661693392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-game-2-2', 'p-game-2', NULL, '54b09ef12a77',
    'MEMBER', 'Guaranteed it''s 30 FPS on base PS5 and Xbox Series X. There is zero chance current console Zen 2 CPUs can push that pedestrian simulation and traffic density at 60 FPS without massive dynamic resolution drops 💀🎮', 72, 1789662293392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-game-2-3', 'p-game-2', NULL, '15e0921ab4c8',
    'MEMBER', 'Look at the lighting in the convenience store robbery scene. That''s hardware-accelerated ray traced global illumination. When this lands on PC with RTX 50 series, it''s going to melt benchmarks 🔥🖥️', 65, 1789662893392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-solar-1', 'c/solarpunk', 'ab0194f2ef67',
    'MEMBER', 'Built a 100% off-grid 12V solar homelab with LiFePO4 batteries. Zero electric bill, 120 days uptime! ☀️🔋', 'Mounted two 100W monocrystalline panels on my balcony railing, connected to a 100Ah LiFePO4 battery with an MPPT charge controller. Feeding pure 12V DC directly into my mini PC (Odroid H3+) and fiber ONT without using an inefficient AC inverter! Draws only 11 watts at idle and has been running 24/7 for 120 straight days. Jeff Geerling''s solar cluster video inspired the whole build: https://www.youtube.com/watch?v=OLRldZjty_s. Detailed schematics on GitHub: https://github.com 🌲☀️✨',
    'SOLARPUNK', 1110, 0, 3,
    230, '{"src": "https://www.youtube.com/watch?v=OLRldZjty_s"}', 'published', 1789659293392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-solar-1-1', 'p-solar-1', NULL, '44df9012a8bc',
    'MEMBER', 'Bypassing the AC inverter is absolute genius! Eliminating DC-to-AC-to-DC conversion saves 15-20% of stored battery energy that would normally just radiate away as useless heat. What''s the minimum operating voltage of the Odroid when battery drops to 20%? 🔋🌱', 61, 1789659893392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-solar-1-1-1', 'p-solar-1', 'c-solar-1-1', 'ab0194f2ef67',
    'MEMBER', 'The Odroid motherboard has an onboard buck-boost regulator that accepts 9V to 15V! So even on a cloudy sub-zero winter day when battery terminal voltage dips to 12.3V, DC regulation is rock solid ❄️⚡', 53, 1789660493392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-solar-1-2', 'p-solar-1', NULL, 'a7df9012bc23',
    'MEMBER', 'This is real resilience. When regional power grids inevitably suffer blackouts or weather emergencies, your mesh communication node keeps ticking and provides connectivity to neighbors 🤝📻', 47, 1789661093392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-lofi-1', 'c/opensource', '22c88f01a9df',
    'MEMBER', '2 AM coding session fuel: Neovim, dark roast specialty coffee, and 24/7 lo-fi beats ☕🎧💻', 'Nothing beats the quiet calm of 2 AM hacking. Rain outside, mechanical keyboard clacking away on lubed Gateron Oil Kings, compiling Rust microservices, and Lofi Girl running in the background: https://www.youtube.com/watch?v=jfKfPfyJRdk. Check out the official stream and chill vibes. What''s your late-night coding ritual? ✨🌙',
    'OPEN SOURCE', 950, 0, 3,
    185, '{"src": "https://www.youtube.com/watch?v=jfKfPfyJRdk"}', 'published', 1789657493392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-lofi-1-1', 'p-lofi-1', NULL, 'a410ef89b231',
    'MEMBER', 'Literally me right now. Dim amber backlight, iced Americano, writing Lua configs for Neovim at 2:45 AM. It''s not a hobby, it''s a lifestyle ☕⌨️✨', 58, 1789658093392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-lofi-1-2', 'p-lofi-1', NULL, '77e1029ba4c0',
    'MEMBER', 'Lofi Girl stream has probably written 40% of all open source software on GitHub by this point lmao 😂 Absolute staple 🎧❤️', 72, 1789658693392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-lofi-1-3', 'p-lofi-1', NULL, '2d89b14c99a0',
    'MEMBER', 'Add a sleeping cat on the desk next to the keyboard and the aesthetic is 100% complete 🐱🌙', 64, 1789659293392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-hack-1', 'c/digitalfreedom', '6d88f12a04cb',
    'MEMBER', 'LiveOverflow buffer overflow tutorial with GDB is still the best intro to binary exploitation ever made 🛡️💻', 'Whenever newcomers ask how to get started in reverse engineering and binary exploitation, I always point them to LiveOverflow''s classic stack buffer overflow walkthrough: https://www.youtube.com/watch?v=1S0aBV-Waeo. Watching the instruction pointer (EIP/RIP) get overwritten in GDB with 0x41414141 is that classic ''aha!'' moment for every hacker. Check out exploit writing resources on https://github.com/Gallopsled/pwntools 🚩🔓',
    'SECURITY', 890, 0, 3,
    170, '{"src": "https://www.youtube.com/watch?v=1S0aBV-Waeo"}', 'published', 1789655693392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-hack-1-1', 'p-hack-1', NULL, '31f90a44ec12',
    'MEMBER', 'That exact video got me through my university systems architecture exam in 2019! Understanding stack frames, return addresses, and NOP sleds clicked in 10 minutes 🏆👨‍💻', 65, 1789656293392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-hack-1-2', 'p-hack-1', NULL, '63c901afb844',
    'MEMBER', 'Modern ASLR, NX/DEP bits, and stack canaries make vanilla stack smashes rare in production binaries, but Return-Oriented Programming (ROP chains) builds directly on these fundamental concepts 🔬🛡️', 78, 1789656893392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-hack-1-3', 'p-hack-1', NULL, '70a40f91b2df',
    'MEMBER', 'This is why languages without automatic bounds checking (raw C/C++) are slowly being banned from critical government codebases. Memory safety is the baseline 🚫💻', 59, 1789657493392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-tech-2', 'c/technology', '4e198a00b215',
    'MEMBER', 'Docker in 100 Seconds: How cgroups & namespaces changed software deployment forever 🐳⚡', 'Fireship''s 100-second breakdown of Docker containers: https://www.youtube.com/watch?v=Gjnup-PuquQ. Explains chroot, namespaces, cgroups, and layered filesystems in under 2 minutes. Even senior devs forget that containers aren''t mini VMs—they''re just isolated Linux processes sharing the host kernel! Read the kernel docs: https://www.kernel.org/doc/Documentation/cgroup-v2.txt 🚀💻',
    'DEVOPS', 760, 0, 3,
    140, '{"src": "https://www.youtube.com/watch?v=Gjnup-PuquQ"}', 'published', 1789653893392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-2-1', 'p-tech-2', NULL, 'bf0194a28cc1',
    'MEMBER', 'The amount of junior engineers who think Docker runs a whole virtualized motherboard and BIOS inside is too damn high lmao 😂 Namespaces isolate what you SEE, cgroups control what you USE 🧠', 71, 1789654493392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-2-2', 'p-tech-2', NULL, '64c8012fab12',
    'MEMBER', 'Podman rootless containers take this to the next level. No background daemon running as root, pure fork/exec model. If you haven''t tried Podman on Linux, give it a spin: https://podman.io 🦭✨', 54, 1789655093392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-2-3', 'p-tech-2', NULL, '88f019ab4c21',
    'MEMBER', 'eBPF tools like Cilium and Tetragon hook right into container socket calls. Observability in modern Kubernetes is wild 🔍⚡', 43, 1789655693392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-tech-3', 'c/opensource', 'b2901a4fc883',
    'MEMBER', 'Rust in 100 Seconds: The borrow checker, zero-cost abstractions, and why C++ devs are converting 🦀⚡', 'Every programmer owes it to themselves to learn why Rust memory safety without a garbage collector matters: https://www.youtube.com/watch?v=5C_HPTJg5ek. No use-after-free, no data races in multithreading, and compile-time ownership guarantees. Read the official Rust Book: https://doc.rust-lang.org/book/ 🦀🔥',
    'OPEN SOURCE', 1180, 0, 3,
    290, '{"src": "https://www.youtube.com/watch?v=5C_HPTJg5ek"}', 'published', 1789652093392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-3-1', 'p-tech-3', NULL, '3c91a4e082aa',
    'MEMBER', 'Fighting the borrow checker for 4 hours at 2 AM is a rite of passage for every developer. But once it compiles, it literally NEVER crashes in production. The peace of mind is worth the pain 🦀🙏', 88, 1789652693392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-3-2', 'p-tech-3', NULL, 'da0194f28bc1',
    'MEMBER', 'Combine Rust with WebAssembly (Wasm) and you can run high-performance cryptographic engines directly in the browser at near-native speeds. That''s how UREfy does local zero-knowledge proofs! 🔒⚡', 76, 1789653293392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-3-3', 'p-tech-3', NULL, '4d89a01fbb23',
    'MEMBER', 'Coming from C99, I hated the compile times initially. But cargo, clippy, and rust-analyzer provide the best developer tooling in existence today 💻✨', 62, 1789653893392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-tech-4', 'c/opensource', 'a410ef89b231',
    'MEMBER', 'Neovim in 100 Seconds: Modal editing, Lua config, and why you will never touch VS Code again ⌨️🚀', 'Tired of bloated Electron text editors taking 1.5GB of RAM to edit a 50-line YAML file? Watch Fireship''s quick guide: https://www.youtube.com/watch?v=km_P_Xj0_5w. With Treesitter syntax parsing, Telescope fuzzy finding, and native LSP, Neovim boots in 24ms. Check out lazy.nvim plugin manager: https://github.com/folke/lazy.nvim ✨☕',
    'OPEN SOURCE', 1040, 0, 3,
    235, '{"src": "https://www.youtube.com/watch?v=km_P_Xj0_5w"}', 'published', 1789650293392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-4-1', 'p-tech-4', NULL, '7f8a910c2b44',
    'MEMBER', 'Configuring your init.lua is a never-ending quest for perfection. You start with 10 lines, 2 years later you have 4,000 lines of custom keymaps and Harpoon hooks ⌨️🧙‍♂️', 79, 1789650893392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-4-2', 'p-tech-4', NULL, '22c88f01a9df',
    'MEMBER', 'Once muscle memory for `ciw`, `dap`, and `f` takes over, typing in normal editors feels like walking through deep mud with lead boots lmao 😂☕', 68, 1789651493392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-4-3', 'p-tech-4', NULL, '11f802ea9bc4',
    'MEMBER', 'Writing documentation in Neovim with vim-pencil and markdown-preview is the most therapeutic workflow ever invented ✨📝', 51, 1789652093392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-tech-11', 'c/technology', '19a408ebc220',
    'MEMBER', 'Linux in 100 Seconds: Linus Torvalds'' kernel that quietly powers 90% of global cloud infrastructure 🐧🌐', 'From Android phones and Tesla cars to Mars rovers and the world''s top 500 supercomputers, it''s all running on the Linux kernel: https://www.youtube.com/watch?v=rrB13utjYV4. Linus Torvalds started it as a hobby project in 1991, and today it has over 30 million lines of code. Read the latest kernel changelogs on https://kernelnewbies.org 🐧❤️',
    'LINUX', 890, 0, 2,
    180, '{"src": "https://www.youtube.com/watch?v=rrB13utjYV4"}', 'published', 1789648493392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-11-1', 'p-tech-11', NULL, '9f4a120c8b31',
    'MODERATOR', '''Just a hobby, won''t be big and professional like gnu'' - Linus in August 1991. Aged like the finest wine in computer science history 🍷🐧', 84, 1789649093392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-11-2', 'p-tech-11', NULL, '88f019ab4c21',
    'MEMBER', 'The mailing list git-based development model is still a marvel of distributed engineering. 1,000+ patches reviewed and merged per release cycle with zero centralized project manager meetings 🚀💻', 67, 1789649693392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-hack-2', 'c/digitalfreedom', '52e091bfa331',
    'MEMBER', 'Computerphile: How NOT to Store Passwords! Salt, pepper, and why SHA-256 is dead for auth 🔒🧂', 'Essential viewing for any developer building user authentication: https://www.youtube.com/watch?v=8ZtInCl5fsw. Dr. Mike Pound explains why hashing passwords with MD5 or fast SHA-256 allows modern GPUs to crack billions of hashes per second. Always use Argon2id, bcrypt, or scrypt with adequate work factors! Read OWASP guidelines: https://cheatsheetseries.owasp.org 🛡️👀',
    'SECURITY', 990, 0, 3,
    220, '{"src": "https://www.youtube.com/watch?v=8ZtInCl5fsw"}', 'published', 1789646693392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-hack-2-1', 'p-hack-2', NULL, '67c8012afb90',
    'MEMBER', 'Dr. Mike Pound''s enthusiasm for cryptography is contagious! The key takeaway is memory-hardness: Argon2id forces the cracker''s GPU memory bus to saturate, making ASIC clusters cost-prohibitive 📐🔒', 78, 1789647293392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-hack-2-2', 'p-hack-2', NULL, '61c8012afa34',
    'MEMBER', 'Better yet: eliminate passwords entirely with FIDO2 / WebAuthn passkeys! Public key cryptography on hardware security chips means the server never even holds a secret to be stolen in a breach 🔑✨', 85, 1789647893392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-hack-2-3', 'p-hack-2', NULL, '4b109af38c01',
    'MEMBER', 'Still seeing companies storing plain MD5 hashes in 2026 is terrifying. Every junior CS curriculum needs this video in week 1 🤦‍♂️📚', 61, 1789648493392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-hack-3', 'c/opensource', 'bf0194a28cc1',
    'MEMBER', 'SQL Injection Explained by Computerphile: Why parameterized queries are non-negotiable 🐘💉', 'Classic Dr. Mike Pound breaking down SQL injection attacks with Bobby Tables: https://www.youtube.com/watch?v=_jKylhJtPmI. Concatenating user inputs into SQL strings in 2026 should be an immediate disqualification for writing production code. Use prepared statements or query builders with typed bindings! Read more on https://owasp.org 📊⚡',
    'DATABASE', 840, 0, 2,
    160, '{"src": "https://www.youtube.com/watch?v=_jKylhJtPmI"}', 'published', 1789644893392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-hack-3-1', 'p-hack-3', NULL, '3c91a4e082aa',
    'MEMBER', '''SELECT * FROM users WHERE user = '' + username + '';'' Little Bobby Tables strikes again! Still top 3 vulnerability on the OWASP Top 10 because legacy code never dies 😂🤦‍♂️', 75, 1789645493392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-hack-3-2', 'p-hack-3', NULL, 'da0194f28bc1',
    'MEMBER', 'This is why compile-time checked SQL libraries like SQLx in Rust are so great: if your SQL query doesn''t match the live database schema at compile time, the build literally fails! 🛡️🦀', 64, 1789646093392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-game-3', 'c/gaming', 'a410ef89b231',
    'MEMBER', 'ELDEN RING Shadow of the Erdtree Gameplay Reveal still gives me goosebumps. Peak FromSoftware 🗡️✨', 'Re-watching the Erdtree reveal trailer: https://www.youtube.com/watch?v=qLZenOn7WUo. Miyazaki and FromSoftware created a DLC bigger than most AAA games. The Realm of Shadow world design with vertical interconnectivity is a masterclass in level design. What was your toughest boss fight in the expansion? Discussions on https://www.reddit.com/r/Eldenring/ 🗡️🔥',
    'GAMING', 1350, 0, 3,
    310, '{"src": "https://www.youtube.com/watch?v=qLZenOn7WUo"}', 'published', 1789643093392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-game-3-1', 'p-game-3', NULL, '8a31b402ef19',
    'MEMBER', 'Promised Consort Radahn phase 2 with the holy light pillar combos gave me actual PTSD. Took me 65 attempts on a pure Strength Colossal Sword build 😭🗡️', 91, 1789643693392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-game-3-2', 'p-game-3', NULL, 'a500912fa8cc',
    'MEMBER', 'The Scadutree fragment scaling system was brilliant. Kept veteran players from steamrolling the DLC with overleveled endgame builds and forced exploration of every vertical canyon 🗺️✨', 73, 1789644293392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-game-3-3', 'p-game-3', NULL, '5b2041e8d902',
    'MEMBER', 'FromSoftware continues to prove you don''t need microtransactions, battle passes, or live-service FOMO to make a generational masterpiece 👑🎮', 88, 1789644893392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-game-4', 'c/gaming', '54b09ef12a77',
    'MEMBER', 'Cyberpunk 2077: Phantom Liberty was the greatest redemption arc in gaming history 🏙️🤖', 'Watch the official Phantom Liberty trailer: https://www.youtube.com/watch?v=kfXXnp37t98. CDPR completely overhauled the police AI, perk trees, cyberware, and added Dogtown with Idris Elba. Ray Tracing Overdrive with full path tracing on PC shows the true future of rasterization vs ray optics. Digital Foundry technical analysis: https://www.eurogamer.net 🎮✨',
    'GAMING', 920, 0, 2,
    200, '{"src": "https://www.youtube.com/watch?v=kfXXnp37t98"}', 'published', 1789641293392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-game-4-1', 'p-game-4', NULL, '8a31b402ef19',
    'MEMBER', 'Dogtown''s atmosphere at night with neon lights reflecting off rain puddles in path tracing is peak cyberpunk visual storytelling. CDPR deserves huge respect for refusing to abandon the game 🏙️✨', 76, 1789641893392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-game-4-2', 'p-game-4', NULL, '94df0218ab44',
    'MEMBER', 'Even on Steam Deck with the 2.0 update, locking it to 30fps with FSR gives a surprisingly playable handheld experience! 🔋🎮', 52, 1789642493392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-tech-8', 'c/technology', '14e92a8819bb',
    'MEMBER', 'MKBHD Apple Vision Pro review revisited 1 year later: Spatial computing or expensive tech demo? 🥽🍎', 'Marques Brownlee''s original in-depth review: https://www.youtube.com/watch?v=dtp6bRe6vq8. The micro-OLED 4K per eye displays and eye tracking are technological marvels, but the 600g weight on your face and $3,500 price tag kept it as an early adopter toy. Will lightweight AR glasses replace smartphones by 2030? Discussions on Hacker News: https://news.ycombinator.com 👓🤔',
    'TECH DISCUSSION', 810, 0, 2,
    145, '{"src": "https://www.youtube.com/watch?v=dtp6bRe6vq8"}', 'published', 1789639493392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-8-1', 'p-tech-8', NULL, '66a0194ebd21',
    'MEMBER', 'As a VR sim pilot with a Quest 3, the display resolution on the Vision Pro is undisputed king. But strapping a brick to your cheekbones with an external tethered battery pack is a non-starter for multi-hour sessions 🥽✈️', 68, 1789640093392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-8-2', 'p-tech-8', NULL, '2d89b14c99a0',
    'MEMBER', 'The eye tracking + pinch navigation UI is magical for 20 minutes, then your arm gets tired. Physical keyboards and mice exist for a reason! ⌨️🖱️', 55, 1789640693392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-tech-7', 'c/technology', '4e198a00b215',
    'MEMBER', 'Spent 5 hours debugging why Docker containers couldn''t resolve external DNS... it was an invisible trailing space in resolv.conf 💀☕', 'Story time: At 11 PM yesterday my staging cluster suddenly started throwing intermittent `EAI_AGAIN` errors on all outbound HTTPS calls. Checked CoreDNS, checked firewall iptables rules, restarted systemd-resolved, even contacted cloud network support. At 3:30 AM I ran `cat -A /etc/resolv.conf` and saw an invisible trailing whitespace character after the secondary nameserver IP. The resolver was parsing it as an invalid octet and timing out for 5000ms. I need therapy and 3 espresso shots 🤦‍♂️💀☕',
    'TECH DISCUSSION', 920, 0, 3,
    180, NULL, 'published', 1789637693392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-7-1', 'p-tech-7', NULL, 'bf0194a28cc1',
    'MEMBER', 'It is ALWAYS DNS. Rule 1 of sysadmin: It''s not the network, it''s not the firewall, it''s DNS. Rule 2: If you think it''s definitely not DNS, reread Rule 1 lmao 😭☕', 98, 1789638293392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-7-2', 'p-tech-7', NULL, '19a408ebc220',
    'MEMBER', 'The 3:30 AM `cat -A` moment of realization where you just stare blankly at the terminal monitor for 10 minutes questioning your life choices... we''ve all been there brother 🤝💀', 75, 1789638893392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-7-3', 'p-tech-7', NULL, '9f4a120c8b31',
    'MODERATOR', 'This is why linters should run on every config file in existence. A whitespace character taking down microservices in 2026 is peak computing comedy 😂💻', 61, 1789639493392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-tech-6', 'c/opensource', 'da0194f28bc1',
    'MEMBER', 'We ditched Electron for Tauri v2 and users literally asked if we stripped features because it launches in 12ms lmao 😂🚀', 'Shipped our first Tauri v2 (https://github.com/tauri-apps/tauri) update for our desktop application yesterday. Installer payload dropped from 145MB down to 14MB. Idle RAM consumption went from 220MB (Chromium + Node process tree) down to 18MB on Windows! Got three emails this morning from users asking: ''Did you rewrite the app in C++? It starts up instantly before my cursor even finishes clicking'' 😂 Rust backend with native WebView2/WebKitGTK is the biggest gift to desktop computing in a decade 🦀⚡',
    'OPEN SOURCE', 980, 0, 3,
    215, NULL, 'published', 1789635893392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-6-1', 'p-tech-6', NULL, 'a410ef89b231',
    'MEMBER', 'Electron was a historical band-aid that overstayed its welcome by 8 years. Bundling an entire browser engine with 80MB of memory overhead for a simple chat or markdown app was madness. Long live Tauri! 🦀🚀', 88, 1789636493392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-6-2', 'p-tech-6', NULL, 'b2901a4fc883',
    'MEMBER', 'The cross-platform IPC in Tauri v2 with strongly typed serde serialization makes frontend-to-backend calls so clean. Zero glue code headaches ✨💻', 64, 1789637093392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-6-3', 'p-tech-6', NULL, '88f019ab4c21',
    'MEMBER', 'Dealing with WebKitGTK packaging quirks on Linux can test your patience, but once you get flatpak/AppImage configured, the memory savings are worth every second 🐧🔥', 51, 1789637693392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-ai-5', 'c/technology', '3c91a4e082aa',
    'MEMBER', 'Hot take: If you can''t write unit tests for your code, AI isn''t saving you—it''s just speeding up your disaster 🤦‍♂️☕', 'Spent the entire morning reviewing a pull request that was obviously 100% generated with Claude/ChatGPT. 800 lines of beautifully formatted TypeScript with zero syntax errors, perfectly formatted docstrings, and elegant variable names. Only problem? The business logic had a fundamental race condition that wiped user state on token refresh 💀 AI code assistants are incredible for boilerplate, but if you don''t understand the underlying concurrency model or write rigorous test suites, you''re not coding 10x faster—you''re just creating 10x more technical debt for the 3 AM on-call team ☕🔥',
    'TECH DISCUSSION', 990, 0, 3,
    240, NULL, 'published', 1789634093392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-ai-5-1', 'p-ai-5', NULL, '7f8a910c2b44',
    'MEMBER', 'Preach! 🙌 LLMs produce code that looks convincing to the human eye because they are language models trained on syntax probability, not logic proofs. If you can''t write the test first, don''t let AI write the implementation 🧘‍♂️💻', 86, 1789634693392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-ai-5-2', 'p-ai-5', NULL, 'b1409ea28c99',
    'GUARDIAN', 'TDD (Test Driven Development) actually becomes 10x more important in the AI era. You write the rigorous assertions and invariant tests, then feed them to the model to generate the passing code. That workflow actually works ✨🚀', 72, 1789635293392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-ai-5-3', 'p-ai-5', NULL, 'a410ef89b231',
    'MEMBER', 'Junior devs using Copilot to generate regex patterns without understanding them will forever be my sleep paralysis demon lmao 😂💀', 61, 1789635893392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-tech-5', 'c/technology', '4e198a00b215',
    'MEMBER', 'Ditched Google One & iCloud for a $130 Intel N100 mini PC + Immich. Best tech decision I''ve made in years 🏡📸', 'Was paying $120/year to Google for 2TB cloud storage. Last month I canceled everything: picked up a Beelink S12 mini PC with an Intel N100 (4 cores, 16GB RAM) for $130 on Amazon, slotted in a 2TB NVMe SSD, and installed Proxmox. Running Immich (https://github.com/immich-app/immich) for photos (local face recognition and CLIP search is 1:1 with Google Photos), Vaultwarden for passwords, and Tailscale for encrypted access from my phone anywhere in the world. The mini PC draws 6 WATTS from the wall! Zero subscriptions, zero data harvesting 🛡️⚡🏡',
    'SELF-HOSTED', 870, 0, 3,
    182, NULL, 'published', 1789632293392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-5-1', 'p-tech-5', NULL, '14e92a8819bb',
    'MEMBER', 'Immich is pure magic! Imported 140,000 photos from Google Takeout and the local machine learning indexed everyone in 6 hours. Searching ''black cat on rug'' or ''birthday cake 2019'' works instantly without sending a single byte to Google''s servers 🐱📸✨', 81, 1789632893392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-5-2', 'p-tech-5', NULL, '24a014f9ec89',
    'MEMBER', 'Just make sure you have the 3-2-1 backup rule in place! A single NVMe in a mini PC is a single point of failure. Restic or Borg backups to an external drive + encrypted Backblaze B2 bucket is essential 💾🛡️', 62, 1789633493392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-5-2-1', 'p-tech-5', 'c-tech-5-2', '4e198a00b215',
    'MEMBER', 'Already set up! Daily 3 AM encrypted restic snapshots to a local USB drive and weekly sync to cheap Wasabi S3 storage. Safe and sound! 🤝🔒', 47, 1789634093392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-net-1', 'c/technology', '62df09a14c33',
    'MEMBER', 'Upgraded home core network to 10Gbps SFP+ with MikroTik CCR2004. WireGuard throughput is mind-blowing 🚀🔌', 'Swapped my gigabit switch for a MikroTik CCR2004-16G-2S+ and routed 10G fiber to my main workstation and TrueNAS storage pool. Transferring 80GB raw 4K footage over SMB takes 9 seconds flat at 1.15 GB/s! Wireguard VPN between my laptop and home pushes 2.4 Gbps symmetric with zero packet loss. Benchmark graphs and RouterOS configs: https://forum.mikrotik.com 🌐⚡',
    'NETWORKING', 890, 0, 2,
    175, NULL, 'published', 1789630493392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-net-1-1', 'p-net-1', NULL, '9f4a120c8b31',
    'MODERATOR', 'MikroTik hardware for the price to performance ratio is unmatched in enterprise networking. Just remember to set firewall fasttrack rules or CPU cores will pin on 10G NAT routing 🔌🔥', 73, 1789631093392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-net-1-2', 'p-net-1', NULL, '8d104fb2a901',
    'MEMBER', 'Did you run single-mode or multi-mode fiber? SFP+ DAC twinax cables for rack runs and LC-LC single-mode for long runs is the golden standard 💡🚀', 59, 1789631693392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-sec-1', 'c/digitalfreedom', '3a4092bbf102',
    'MODERATOR', 'EU Chat Control proposal defeated again in European Council! Client-side scanning is dead for now 🛡️🇪🇺', 'Huge victory for digital civil liberties! The European Council failed to reach a qualified majority for the controversial Chat Control mandate that would have forced WhatsApp, Signal, and email providers to implement client-side scanning backdoors. Signal''s president Meredith Whittaker reiterated they would withdraw from Europe rather than break end-to-end encryption. Read the coverage on Ars Technica: https://arstechnica.com and EDRI: https://edri.org 🛡️✊',
    'DIGITAL RIGHTS', 1490, 0, 3,
    410, NULL, 'published', 1789628693392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-sec-1-1', 'p-sec-1', NULL, '59b04a11ee32',
    'MEMBER', 'A massive relief, but we cannot get complacent. Bureaucrats rebrand and reintroduce this legislation under new names every 12 months. E2EE without backdoors is a fundamental human right 🔐🛡️', 94, 1789629293392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-sec-1-2', 'p-sec-1', NULL, '70a40f91b2df',
    'MEMBER', 'This is why sovereign protocols like UREfy that operate peer-to-peer with local device encryption are so critical. You can''t regulate away math 📐🤝', 81, 1789629893392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-sec-1-3', 'p-sec-1', NULL, '78a014fb9c99',
    'MEMBER', 'Journalists and whistleblowers around the world depend on unbroken cryptographic confidentiality. Great reporting by Patrick Breyer and civil society groups 📰✨', 67, 1789630493392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-storage-1', 'c/opensource', '29c40ea18df2',
    'MEMBER', 'ZFS saved 18TB of family photos and projects from silent bit rot today. Check your scrub schedules! 💾🛡️', 'Monthly ZFS scrub finished this morning on my 6x8TB RAIDZ2 pool. Log output: `scan: scrub repaired 24.5K in 08:42:15 with 0 errors`. Two sectors on disk 4 silently flipped bits due to NAND degradation, and ZFS parity checksums detected and repaired the corruption on the fly without a single lost byte! If you''re still using hardware RAID or NTFS for long term archival, you''re playing Russian roulette with your data. Read OpenZFS docs: https://openzfs.github.io/openzfs-docs/ 💾⚡',
    'STORAGE', 970, 0, 2,
    210, NULL, 'published', 1789626893392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-sto-1-1', 'p-storage-1', NULL, 'a40194f2ab45',
    'MEMBER', 'OpenZFS on FreeBSD and Linux is a technological masterpiece. Hardware RAID controllers hiding drive SMART data and silently passing bad blocks to the OS should have been outlawed in 2010 😈💾', 82, 1789627493392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-sto-1-2', 'p-storage-1', NULL, '7f8a910c2b44',
    'MEMBER', 'Running `zpool scrub tank` on the 1st of every month automatically via systemd timer. Hearing the drives chirp while verifying SHA-256 block checksums is pure music to my ears 🐧☕', 71, 1789628093392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-dev-1', 'c/opensource', '3c91a4e082aa',
    'MEMBER', 'Built a tiny autonomous rover using ESP32-S3 and Rust embedded (esp-hal). No C/C++ memory leaks! 🤖🦀', 'Finished wiring a 4WD rover powered by an ESP32-S3 dual-core Xtensa chip. Instead of Arduino C++, I wrote the entire firmware in `no_std` Rust using `esp-hal` and `embassy` async runtime. It handles ultrasonic distance sensors, differential motor PID loops, and telemetry over Wi-Fi UDP at 60Hz. Zero segfaults, zero null pointers, and binary size is under 280KB. Code repository on GitHub: https://github.com/esp-rs/esp-hal 🤖✨',
    'ROBOTICS', 860, 0, 2,
    180, NULL, 'published', 1789625093392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-dev-1-1', 'p-dev-1', NULL, '31f90a44ec12',
    'MEMBER', 'Writing async embedded Rust with Embassy feels like cheating compared to FreeRTOS C tasks and mutex deadlocks. How are you driving the motor H-bridges? Direct PWM via MCPWM peripheral? 🏎️⚡', 74, 1789625693392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-dev-1-2', 'p-dev-1', NULL, '38df02ba91c0',
    'MEMBER', 'Slap an FPV analog camera on that bad boy and send it down the hallway! 🚁🏎️', 55, 1789626293392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-linux-1', 'c/technology', '88f019ab4c21',
    'MEMBER', 'Linux 6.13 kernel released: Huge Bcachefs fixes, AMD P-State improvements, and real-time PREEMPT_RT merge 🐧⚡', 'Phoronix published the full Linux 6.13 benchmark suite: https://www.phoronix.com. The official merge of PREEMPT_RT brings deterministic sub-millisecond audio and industrial robotics latency to vanilla kernels! Plus AMD Ryzen 9000 Zen 5 CPUs see a 4-8% efficiency bump with updated energy performance preference governors. Track the commits on GitHub: https://github.com/torvalds/linux 🐧🔥',
    'LINUX', 1080, 0, 2,
    230, NULL, 'published', 1789623293392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-lin-1-1', 'p-linux-1', NULL, '57c4018fcd01',
    'MEMBER', 'PREEMPT_RT in mainline kernel is HUGE for Linux audio production. Pipewire buffer sizes can now drop to 32 frames (0.7ms latency) without a single xrun during live synthesizer recording 🎛️🎧', 83, 1789623893392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-lin-1-2', 'p-linux-1', NULL, '19a408ebc220',
    'MEMBER', 'Compiling 6.13 right now with `-march=native -O2` on my ThinkPad. Clean build, zero deprecation warnings. Linus and kernel maintainers are relentless 🐧☕', 69, 1789624493392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-priv-1', 'c/digitalfreedom', '59b04a11ee32',
    'MEMBER', 'GrapheneOS on Google Pixel 9 is the gold standard for mobile privacy in 2026 📱🛡️', 'Bought a refurbished Pixel 9 specifically to flash GrapheneOS using their webUSB installer. Sandboxed Google Play Services means apps like Uber and banking work flawlessly in an isolated profile with ZERO system privileges. Hardware memory tagging (MTE) kills buffer overflows at the silicon level, and network/sensor toggles give you total control. If you care about phone security, check out https://grapheneos.org 🛡️✨',
    'PRIVACY', 1150, 0, 2,
    280, NULL, 'published', 1789621493392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-priv-1-1', 'p-priv-1', NULL, '52e091bfa331',
    'MEMBER', 'The per-app Network and Sensors toggles are life changing. Why does a calculator or flashlight need internet access? Blocked instantly at the OS level 🙅‍♀️📱', 89, 1789622093392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-priv-1-2', 'p-priv-1', NULL, '9ad09012de12',
    'MEMBER', 'The irony that Google''s Tensor chip with Titan M2 security hardware makes the best de-Googled privacy phone on earth will never stop being funny 😂🔒', 77, 1789622693392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-solar-2', 'c/solarpunk', '44df9012a8bc',
    'MEMBER', 'Open-source micro-hydro generator powering our mountain cabin: 350W continuous 24/7 from a stream 🌊⚡', 'Solar is great when the sun shines, but a mountain creek flows day and night! Built a Pelton wheel turbine using 3D printed PETG buckets and a permanent magnet alternator. With 18 meters of head pressure through a 2-inch HDPE pipe, it generates 350 watts continuous—that''s 8.4 kWh every single day! Enough to power lights, Starlink, laptops, and a mini fridge indefinitely. Open hardware plans on GitHub: https://github.com 🌲🌊🔋',
    'SOLARPUNK', 1220, 0, 2,
    270, NULL, 'published', 1789619693392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-sol-2-1', 'p-solar-2', NULL, 'ab0194f2ef67',
    'MEMBER', 'Continuous baseload power is the holy grail of off-grid living. 350W continuous beats a 3kW solar array in December clouds any day of the week! ☀️❄️⚡', 84, 1789620293392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-sol-2-2', 'p-solar-2', NULL, '13f08912ef34',
    'MEMBER', 'Are you using an electronic diversion dump load heater when the battery reaches 100% state of charge? Water heaters make great dump loads! 💧🔥', 66, 1789620893392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-game-5', 'c/gaming', '94df0218ab44',
    'MEMBER', 'Steam Deck OLED with Proton-GE 9-25 is running 98% of my 1,200 Steam library games flawlessly 🎮🔋', 'Remember when PC gaming on Linux was a meme of Wine errors and broken DLLs? Now with Valve''s Proton, VKD3D DirectX 12 translation, and FSR upscaling, games like Hades II, Balatro, and Cyberpunk run like dream at 90Hz HDR. Valve proved that open source and Linux can beat Windows at gaming when backed by top-tier engineering. Track game compatibility on https://www.protondb.com 🎮👑',
    'GAMING', 1040, 0, 2,
    210, NULL, 'published', 1789617893392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-game-5-1', 'p-game-5', NULL, '8a31b402ef19',
    'MEMBER', 'The OLED screen on the Deck is stunning. Pure inky blacks in Dead Cells and Hollow Knight make LCD displays look like gray mush ✨🕹️', 79, 1789618493392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-game-5-2', 'p-game-5', NULL, 'a500912fa8cc',
    'MEMBER', 'Playing Balatro on the train for 6 hours straight without battery anxiety... Valve saved handheld gaming 🃏🔋', 68, 1789619093392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-hack-4', 'c/digitalfreedom', 'aa0194f2cd01',
    'MEMBER', 'Decompiling Bluetooth LE smart padlock firmware: Unauthenticated AES key leaked over advertising packets 💀🔒', 'A friend asked me to test a ''fingerprint & Bluetooth smart padlock'' sold by a major hardware brand. Fired up Wireshark with an nRF52840 BLE sniffer dongle. Found that during pairing, the mobile app transmits the lock''s static 128-bit unlock token in an unencrypted GATT characteristic with no replay protection! Literally 15 lines of Python using Bleak can pop the lock open from 30 feet away in 200ms. Disclosed to the vendor via BleepingComputer: https://www.bleepingcomputer.com 🤦‍♂️🔓',
    'SECURITY', 990, 0, 2,
    240, NULL, 'published', 1789616093392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-hack-4-1', 'p-hack-4', NULL, '6d88f12a04cb',
    'MEMBER', 'The S in IoT stands for Security as usual lmao! 💀 People locking their €2,000 electric bikes with smart padlocks that can be unlocked with a bash script on a Raspberry Pi 😂🤦‍♂️', 91, 1789616693392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-hack-4-2', 'p-hack-4', NULL, '63c901afb844',
    'MEMBER', 'Responsible disclosure report with the PCAP capture is great work. Physical locks should rely on precision machined brass tumblers, not shoddy Bluetooth stacks 🔒🛠️', 73, 1789617293392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-mesh-1', 'c/digitalfreedom', 'f40019bc88a2',
    'MEMBER', 'Deployed 6 Meshtastic LoRa nodes across our city. 433MHz off-grid messaging with 25km range! 📻🌲', 'Mounted Heltec V3 LoRa ESP32 nodes on high rooftops with 8dBi fiberglass omni antennas. Using the 433MHz frequency band, text messages hop peer-to-peer across the entire metropolitan area with zero internet, zero cellular towers, and zero subscription fees. Runs for 4 days on a single 18650 cell. In power outages or network blackouts, the mesh stays alive. Join the global mesh: https://meshtastic.org 📻⚡',
    'MESH NETWORK', 1120, 0, 2,
    260, NULL, 'published', 1789614293392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-mesh-1-1', 'p-mesh-1', NULL, '36b014eaef90',
    'MEMBER', 'Packet radio spirit reborn! In the 80s we used 1200 baud AX.25 TNCs, now Meshtastic gives end-to-end AES-256 encrypted mesh routing on $20 hardware. Absolutely magnificent 📻✨', 85, 1789614893392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-mesh-1-2', 'p-mesh-1', NULL, '79c901affa01',
    'MEMBER', 'Off-grid telemetry and emergency communications without telecom surveillance. Adding two solar-powered repeater nodes on the water tower next weekend ☀️📻', 70, 1789615493392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-tech-9', 'c/technology', '1c490a21fd88',
    'MEMBER', 'First 64-core RISC-V server boards are shipping to developers. The open silicon revolution is here 🔬💻', 'Received the Milk-V Pioneer 64-core RISC-V workstation today. Booted Ubuntu 24.04 RISC-V port, compiled the Linux kernel in 8 minutes, and ran LLVM test suites. No proprietary x86 licensing fees, no ARM royalty restrictions, pure open standard ISA. Read the architecture specifications on https://riscv.org and benchmarks on Phoronix: https://www.phoronix.com ⚡🔬',
    'HARDWARE', 870, 0, 2,
    180, NULL, 'published', 1789612493392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-9-1', 'p-tech-9', NULL, '1bf08912ea56',
    'MEMBER', 'Having open silicon with verified RTL is the only way humanity escapes hardware-level backdoors (like Intel ME and AMD PSP). Huge milestone! 🔬🛡️', 81, 1789613093392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-tech-9-2', 'p-tech-9', NULL, '71c901afab89',
    'MEMBER', 'Reminds me of the early Amiga and Alpha processor days when instruction set diversity was flourishing. Beautiful piece of hardware 👾💻', 63, 1789613693392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-homelab-1', 'c/opensource', '24a014f9ec89',
    'MEMBER', 'Migrated 40TB media library from Plex to Jellyfin. Native AV1 transcoding with Intel QuickSync is butter smooth 🎬🍿', 'Plex forcing social media feeds, tracking telemetry, and paid auth servers was the final straw. Installed Jellyfin on Debian with Intel QuickSync GPU acceleration (Arc A380). It transcodes 4K HDR HEVC to 1080p AV1 in real time using 18 watts of power. Clients for Android TV, iOS, and WebOS are 100% free and open source. Check the project: https://github.com/jellyfin/jellyfin 🎬🐧',
    'SELF-HOSTED', 1010, 0, 2,
    215, NULL, 'published', 1789610693392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-home-1-1', 'p-homelab-1', NULL, '99df012aa4c3',
    'MEMBER', 'Plex''s central authentication outage that locked users out of their OWN local LAN servers was the day I deleted my account. Jellyfin is true self-hosting 🍿🐧', 88, 1789611293392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-home-1-2', 'p-homelab-1', NULL, '56c4018ffa45',
    'MEMBER', 'Pair Jellyfin with Jellyseerr for media requests and it rivals any commercial streaming service with zero monthly fees 🎬✨', 69, 1789611893392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-ai-2', 'c/privacy-ai', '14e92a8819bb',
    'MEMBER', 'Flux.1 Schnell running locally on ComfyUI with RTX 3080: Photorealistic image gen in 1.4 seconds 🎨🧠', 'Black Forest Labs (the original authors of Stable Diffusion) released Flux.1, and the text adherence is shocking. It handles hands, text rendering, and cinematic lighting better than Midjourney v6 without sending your prompts to a cloud server. Running the Q4 GGUF quant locally in ComfyUI with 10 steps takes less than 2 seconds. Guide and workflow JSON on GitHub: https://github.com/comfyanonymous/ComfyUI 🎨✨',
    'AI CREATIVE', 940, 0, 2,
    195, NULL, 'published', 1789608893392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-ai-2-1', 'p-ai-2', NULL, '9b22a011cd44',
    'MEMBER', 'The rectified flow transformer architecture in Flux is incredible. Rendering legible neon signs and book typography without spelling mistakes is finally solved 🎨✨', 76, 1789609493392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-ai-2-2', 'p-ai-2', NULL, '42c90a18eb77',
    'MEMBER', 'Local artists retaining copyright and ownership over their models and generated outputs is everything. No corporate terms of service claiming your art 🛡️🎨', 64, 1789610093392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-retro-1', 'c/gaming', '88b4012ce9fa',
    'MEMBER', 'Restored a 1998 Sony Trinitron CRT monitor for retro pixel art gaming. Modern LCDs can''t touch this motion clarity 📺🕹️', 'Found a 21-inch Sony Trinitron Multiscan CRT in a university liquidation sale for $40. Hooked up my MiSTer FPGA via RGB SCART. True 240p scanlines, zero input lag, infinite contrast on black levels, and zero sample-and-hold motion blur. Playing Chrono Trigger and Super Metroid looks exactly the way 90s artists intended. Retro gaming preservation discussions on https://www.reddit.com/r/crtgaming/ 📺✨',
    'RETRO', 1190, 0, 2,
    260, NULL, 'published', 1789607093392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-ret-1-1', 'p-retro-1', NULL, '92c4018fba77',
    'MEMBER', 'MiSTer FPGA + CRT is peak retro nirvana. Cycle-accurate hardware emulation without the latency of software emulators. Scanlines were phosphor magic 🕹️👾', 89, 1789607693392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-ret-1-2', 'p-retro-1', NULL, '25a014f9cd45',
    'MEMBER', 'That characteristic degaussing ''THUMP'' sound when you power on a Trinitron... instant nostalgia dopamine rush 📺🔊', 74, 1789608293392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-sec-2', 'c/digitalfreedom', '70a40f91b2df',
    'MEMBER', 'Why UREfy sovereign keys beat email/password and OAuth ''Sign in with Google'' forever 🔑🛡️', 'When you sign in with Google or Apple, those corporations can lock you out of your digital life with an automated algorithmic flag. With sovereign Ed25519 cryptographic keypairs, YOU own the root of trust. Your messages are encrypted client-side with post-quantum hybrid KEM, and no central server or moderator can forge your signature. Sovereign computing is not a luxury—it''s human dignity in the digital age. Learn more at https://urefy.com 🌐🛡️',
    'SOVEREIGNTY', 1450, 0, 3,
    380, NULL, 'published', 1789605293392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-sec-2-1', 'p-sec-2', NULL, 'c3dc28cb705e',
    'ARCHIVIST', 'Public key cryptography is the only true defense against centralized digital feudalism. If you don''t hold the private key, you are just a tenant on someone else''s platform 🔒✨', 96, 1789605893392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-sec-2-2', 'p-sec-2', NULL, '7c9102ab84df',
    'GUARDIAN', 'And by combining it with ML-KEM-768 post-quantum key exchange, communications encrypted today cannot be stored and decrypted by quantum computers tomorrow 🛡️🌐', 87, 1789606493392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-sec-2-3', 'p-sec-2', NULL, '21f09ab8c401',
    'MEMBER', 'Self-sovereign identity (SSI) and decentralized identifiers are the natural evolution of the internet. Bravo to the UREfy engineering team 🤝👏', 78, 1789607093392
);
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content,
    flair, merit_votes, user_voted, reply_count, boost_count,
    video_json, status, created_at, is_expanded
) VALUES (
    'p-keyboard-1', 'c/opensource', '6f1084ea2b99',
    'MEMBER', 'Built a custom split ergonomic keyboard with ZMK firmware and Bluetooth BLE. Wrist pain vanished ⌨️🌸', 'Soldered a Corne split keyboard with nice!nano v2 microcontrollers and Kailh Choc low-profile tactile switches. Flashed ZMK open-source firmware with custom layers for Vim navigation and programming symbols. Battery lasts 6 weeks on a tiny 110mAh lipo. If you type for a living 8 hours a day, ergonomic split keyboards are the best investment for your carpal tunnels! Code & keymaps: https://github.com/zmkfirmware/zmk ⌨️✨',
    'HARDWARE', 880, 0, 2,
    160, NULL, 'published', 1789603493392, 0
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-key-1-1', 'p-keyboard-1', NULL, 'a30194f2de89',
    'MEMBER', 'Split column-staggered layout takes 3 days to adjust to, then you can never touch a standard staggered board again without your wrists complaining ⌨️☕', 72, 1789604093392
);
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES (
    'c-key-1-2', 'p-keyboard-1', NULL, 'a410ef89b231',
    'MEMBER', 'Home row mods on ZMK with balanced tap-dance timers are pure wizardry. Having Ctrl, Alt, Shift, and Super under ASDF feels magical 🧙‍♂️✨', 65, 1789604693392
);

-- === COMMUNITY MEMBERSHIPS & FOLLOWS GRAPH ===
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '7f8a910c2b44', 'admin', 1787507093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '7f8a910c2b44', 'admin', 1787507093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('7f8a910c2b44', '3c91a4e082aa', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('7f8a910c2b44', '8a31b402ef19', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '3c91a4e082aa', 'admin', 1787593493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '3c91a4e082aa', 'admin', 1787593493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('3c91a4e082aa', '9f4a120c8b31', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('3c91a4e082aa', '62df09a14c33', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '9f4a120c8b31', 'admin', 1787679893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '9f4a120c8b31', 'admin', 1787679893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('9f4a120c8b31', '5b2041e8d902', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('9f4a120c8b31', '2d89b14c99a0', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '5b2041e8d902', 'member', 1787766293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '5b2041e8d902', 'member', 1787766293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('5b2041e8d902', '14e92a8819bb', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('5b2041e8d902', '4e198a00b215', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '14e92a8819bb', 'member', 1787852693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '14e92a8819bb', 'member', 1787852693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('14e92a8819bb', '8a31b402ef19', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('14e92a8819bb', 'c0a184e912fd', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '8a31b402ef19', 'member', 1787939093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '8a31b402ef19', 'member', 1787939093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('8a31b402ef19', '62df09a14c33', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('8a31b402ef19', '7b33a901ff42', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '62df09a14c33', 'member', 1788025493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '62df09a14c33', 'member', 1788025493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('62df09a14c33', '2d89b14c99a0', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('62df09a14c33', '91c24fa0e891', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '2d89b14c99a0', 'member', 1788111893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '2d89b14c99a0', 'member', 1788111893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('2d89b14c99a0', '4e198a00b215', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('2d89b14c99a0', 'a410ef89b231', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '4e198a00b215', 'member', 1788198293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '4e198a00b215', 'member', 1788198293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('4e198a00b215', 'c0a184e912fd', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('4e198a00b215', '6d88f12a04cb', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', 'c0a184e912fd', 'member', 1788284693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', 'c0a184e912fd', 'member', 1788284693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('c0a184e912fd', '7b33a901ff42', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('c0a184e912fd', '31f90a44ec12', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '7b33a901ff42', 'member', 1788371093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '7b33a901ff42', 'member', 1788371093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('7b33a901ff42', '91c24fa0e891', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('7b33a901ff42', '88b4012ce9fa', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '91c24fa0e891', 'member', 1788457493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '91c24fa0e891', 'member', 1788457493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('91c24fa0e891', 'a410ef89b231', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('91c24fa0e891', '52e091bfa331', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', 'a410ef89b231', 'member', 1788543893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', 'a410ef89b231', 'member', 1788543893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('a410ef89b231', '6d88f12a04cb', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('a410ef89b231', '19a408ebc220', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '6d88f12a04cb', 'member', 1788630293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '6d88f12a04cb', 'member', 1788630293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('6d88f12a04cb', '31f90a44ec12', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('6d88f12a04cb', 'a0914e21fc88', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '31f90a44ec12', 'member', 1788716693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '31f90a44ec12', 'member', 1788716693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('31f90a44ec12', '88b4012ce9fa', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('31f90a44ec12', '44df9012a8bc', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '88b4012ce9fa', 'member', 1787507093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '88b4012ce9fa', 'member', 1787507093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('88b4012ce9fa', '52e091bfa331', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('88b4012ce9fa', 'bf0194a28cc1', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '52e091bfa331', 'member', 1787593493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '52e091bfa331', 'member', 1787593493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('52e091bfa331', '19a408ebc220', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('52e091bfa331', '22c88f01a9df', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '19a408ebc220', 'member', 1787679893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '19a408ebc220', 'member', 1787679893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('19a408ebc220', 'a0914e21fc88', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('19a408ebc220', '77e1029ba4c0', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', 'a0914e21fc88', 'member', 1787766293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', 'a0914e21fc88', 'member', 1787766293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('a0914e21fc88', '44df9012a8bc', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('a0914e21fc88', '59b04a11ee32', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '44df9012a8bc', 'member', 1787852693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '44df9012a8bc', 'member', 1787852693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('44df9012a8bc', 'bf0194a28cc1', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('44df9012a8bc', '83d2019fab66', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', 'bf0194a28cc1', 'member', 1787939093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', 'bf0194a28cc1', 'member', 1787939093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('bf0194a28cc1', '22c88f01a9df', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('bf0194a28cc1', '11f802ea9bc4', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '22c88f01a9df', 'member', 1788025493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '22c88f01a9df', 'member', 1788025493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('22c88f01a9df', '77e1029ba4c0', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('22c88f01a9df', '66a0194ebd21', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '77e1029ba4c0', 'member', 1788111893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '77e1029ba4c0', 'member', 1788111893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('77e1029ba4c0', '59b04a11ee32', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('77e1029ba4c0', '3a4092bbf102', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '59b04a11ee32', 'member', 1788198293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '59b04a11ee32', 'member', 1788198293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('59b04a11ee32', '83d2019fab66', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('59b04a11ee32', '99df012aa4c3', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '83d2019fab66', 'member', 1788284693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '83d2019fab66', 'member', 1788284693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('83d2019fab66', '11f802ea9bc4', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('83d2019fab66', '42c90a18eb77', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '11f802ea9bc4', 'member', 1788371093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '11f802ea9bc4', 'member', 1788371093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('11f802ea9bc4', '66a0194ebd21', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('11f802ea9bc4', '8d104fb2a901', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '66a0194ebd21', 'member', 1788457493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '66a0194ebd21', 'member', 1788457493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('66a0194ebd21', '3a4092bbf102', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('66a0194ebd21', '15e0921ab4c8', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '3a4092bbf102', 'member', 1788543893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '3a4092bbf102', 'member', 1788543893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('3a4092bbf102', '99df012aa4c3', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('3a4092bbf102', '70a40f91b2df', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '99df012aa4c3', 'member', 1788630293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '99df012aa4c3', 'member', 1788630293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('99df012aa4c3', '42c90a18eb77', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('99df012aa4c3', 'b2901a4fc883', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '42c90a18eb77', 'member', 1788716693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '42c90a18eb77', 'member', 1788716693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('42c90a18eb77', '8d104fb2a901', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('42c90a18eb77', '38df02ba91c0', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '8d104fb2a901', 'member', 1787507093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '8d104fb2a901', 'member', 1787507093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('8d104fb2a901', '15e0921ab4c8', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('8d104fb2a901', '6f1084ea2b99', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '15e0921ab4c8', 'member', 1787593493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '15e0921ab4c8', 'member', 1787593493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('15e0921ab4c8', '70a40f91b2df', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('15e0921ab4c8', 'a500912fa8cc', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '70a40f91b2df', 'member', 1787679893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '70a40f91b2df', 'member', 1787679893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('70a40f91b2df', 'b2901a4fc883', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('70a40f91b2df', '29c40ea18df2', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', 'b2901a4fc883', 'member', 1787766293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', 'b2901a4fc883', 'member', 1787766293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('b2901a4fc883', '38df02ba91c0', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('b2901a4fc883', '94df0218ab44', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '38df02ba91c0', 'member', 1787852693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '38df02ba91c0', 'member', 1787852693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('38df02ba91c0', '6f1084ea2b99', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('38df02ba91c0', '4b109af38c01', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '6f1084ea2b99', 'member', 1787939093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '6f1084ea2b99', 'member', 1787939093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('6f1084ea2b99', 'a500912fa8cc', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('6f1084ea2b99', '87a01fa29cb5', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', 'a500912fa8cc', 'member', 1788025493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', 'a500912fa8cc', 'member', 1788025493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('a500912fa8cc', '29c40ea18df2', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('a500912fa8cc', '1c490a21fd88', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '29c40ea18df2', 'member', 1788111893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '29c40ea18df2', 'member', 1788111893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('29c40ea18df2', '94df0218ab44', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('29c40ea18df2', '54b09ef12a77', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '94df0218ab44', 'member', 1788198293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '94df0218ab44', 'member', 1788198293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('94df0218ab44', '4b109af38c01', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('94df0218ab44', 'da0194f28bc1', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '4b109af38c01', 'member', 1788284693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '4b109af38c01', 'member', 1788284693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('4b109af38c01', '87a01fa29cb5', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('4b109af38c01', '3e901a88fb22', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '87a01fa29cb5', 'member', 1788371093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '87a01fa29cb5', 'member', 1788371093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('87a01fa29cb5', '1c490a21fd88', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('87a01fa29cb5', 'b1409ea28c99', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '1c490a21fd88', 'member', 1788457493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '1c490a21fd88', 'member', 1788457493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('1c490a21fd88', '54b09ef12a77', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('1c490a21fd88', '7c9102ab84df', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '54b09ef12a77', 'member', 1788543893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '54b09ef12a77', 'member', 1788543893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('54b09ef12a77', 'da0194f28bc1', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('54b09ef12a77', 'a89104fa2211', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', 'da0194f28bc1', 'member', 1788630293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', 'da0194f28bc1', 'member', 1788630293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('da0194f28bc1', '3e901a88fb22', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('da0194f28bc1', 'c3dc28cb705e', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '3e901a88fb22', 'member', 1788716693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '3e901a88fb22', 'member', 1788716693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('3e901a88fb22', 'b1409ea28c99', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('3e901a88fb22', 'f40019bc88a2', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', 'b1409ea28c99', 'member', 1787507093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', 'b1409ea28c99', 'member', 1787507093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('b1409ea28c99', '7c9102ab84df', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('b1409ea28c99', '9b22a011cd44', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '7c9102ab84df', 'member', 1787593493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '7c9102ab84df', 'member', 1787593493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('7c9102ab84df', 'a89104fa2211', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('7c9102ab84df', '4d89a01fbb23', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', 'a89104fa2211', 'member', 1787679893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', 'a89104fa2211', 'member', 1787679893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('a89104fa2211', 'c3dc28cb705e', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('a89104fa2211', '88f019ab4c21', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', 'c3dc28cb705e', 'member', 1787766293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', 'c3dc28cb705e', 'member', 1787766293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('c3dc28cb705e', 'f40019bc88a2', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('c3dc28cb705e', '2a9104eb8c33', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', 'f40019bc88a2', 'member', 1787852693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', 'f40019bc88a2', 'member', 1787852693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('f40019bc88a2', '9b22a011cd44', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('f40019bc88a2', '63c901afb844', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '9b22a011cd44', 'member', 1787939093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '9b22a011cd44', 'member', 1787939093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('9b22a011cd44', '4d89a01fbb23', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('9b22a011cd44', '17df8902ab55', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '4d89a01fbb23', 'member', 1788025493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '4d89a01fbb23', 'member', 1788025493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('4d89a01fbb23', '88f019ab4c21', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('4d89a01fbb23', '5e019ab28c66', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '88f019ab4c21', 'member', 1788111893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '88f019ab4c21', 'member', 1788111893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('88f019ab4c21', '2a9104eb8c33', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('88f019ab4c21', '92c4018fba77', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '2a9104eb8c33', 'member', 1788198293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '2a9104eb8c33', 'member', 1788198293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('2a9104eb8c33', '63c901afb844', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('2a9104eb8c33', '35df9012a888', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '63c901afb844', 'member', 1788284693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '63c901afb844', 'member', 1788284693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('63c901afb844', '17df8902ab55', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('63c901afb844', '78a014fb9c99', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '17df8902ab55', 'member', 1788371093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '17df8902ab55', 'member', 1788371093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('17df8902ab55', '5e019ab28c66', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('17df8902ab55', '21f09ab8c401', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '5e019ab28c66', 'member', 1788457493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '5e019ab28c66', 'member', 1788457493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('5e019ab28c66', '92c4018fba77', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('5e019ab28c66', '64c8012fab12', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '92c4018fba77', 'member', 1788543893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '92c4018fba77', 'member', 1788543893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('92c4018fba77', '35df9012a888', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('92c4018fba77', 'a7df9012bc23', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '35df9012a888', 'member', 1788630293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '35df9012a888', 'member', 1788630293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('35df9012a888', '78a014fb9c99', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('35df9012a888', '39b014ea8d34', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '78a014fb9c99', 'member', 1788716693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '78a014fb9c99', 'member', 1788716693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('78a014fb9c99', '21f09ab8c401', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('78a014fb9c99', '82c901afcb45', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '21f09ab8c401', 'member', 1787507093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '21f09ab8c401', 'member', 1787507093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('21f09ab8c401', '64c8012fab12', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('21f09ab8c401', '1bf08912ea56', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '64c8012fab12', 'member', 1787593493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '64c8012fab12', 'member', 1787593493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('64c8012fab12', 'a7df9012bc23', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('64c8012fab12', '5ec4018fba67', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', 'a7df9012bc23', 'member', 1787679893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', 'a7df9012bc23', 'member', 1787679893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('a7df9012bc23', '39b014ea8d34', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('a7df9012bc23', '91df9012cb78', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '39b014ea8d34', 'member', 1787766293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '39b014ea8d34', 'member', 1787766293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('39b014ea8d34', '82c901afcb45', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('39b014ea8d34', '24a014f9ec89', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '82c901afcb45', 'member', 1787852693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '82c901afcb45', 'member', 1787852693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('82c901afcb45', '1bf08912ea56', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('82c901afcb45', '67c8012afb90', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '1bf08912ea56', 'member', 1787939093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '1bf08912ea56', 'member', 1787939093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('1bf08912ea56', '5ec4018fba67', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('1bf08912ea56', 'aa0194f2cd01', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '5ec4018fba67', 'member', 1788025493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '5ec4018fba67', 'member', 1788025493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('5ec4018fba67', '91df9012cb78', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('5ec4018fba67', '3db014ea9e12', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '91df9012cb78', 'member', 1788111893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '91df9012cb78', 'member', 1788111893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('91df9012cb78', '24a014f9ec89', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('91df9012cb78', '80c901afdf23', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '24a014f9ec89', 'member', 1788198293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '24a014f9ec89', 'member', 1788198293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('24a014f9ec89', '67c8012afb90', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('24a014f9ec89', '13f08912ef34', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '67c8012afb90', 'member', 1788284693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '67c8012afb90', 'member', 1788284693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('67c8012afb90', 'aa0194f2cd01', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('67c8012afb90', '56c4018ffa45', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', 'aa0194f2cd01', 'member', 1788371093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', 'aa0194f2cd01', 'member', 1788371093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('aa0194f2cd01', '3db014ea9e12', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('aa0194f2cd01', '9ad09012ab56', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '3db014ea9e12', 'member', 1788457493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '3db014ea9e12', 'member', 1788457493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('3db014ea9e12', '80c901afdf23', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('3db014ea9e12', '2da014f9bc67', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '80c901afdf23', 'member', 1788543893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '80c901afdf23', 'member', 1788543893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('80c901afdf23', '13f08912ef34', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('80c901afdf23', '60c8012acd78', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '13f08912ef34', 'member', 1788630293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '13f08912ef34', 'member', 1788630293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('13f08912ef34', '56c4018ffa45', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('13f08912ef34', 'a30194f2de89', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '56c4018ffa45', 'member', 1788716693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '56c4018ffa45', 'member', 1788716693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('56c4018ffa45', '9ad09012ab56', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('56c4018ffa45', '36b014eaef90', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '9ad09012ab56', 'member', 1787507093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '9ad09012ab56', 'member', 1787507093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('9ad09012ab56', '2da014f9bc67', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('9ad09012ab56', '79c901affa01', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '2da014f9bc67', 'member', 1787593493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '2da014f9bc67', 'member', 1787593493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('2da014f9bc67', '60c8012acd78', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('2da014f9bc67', '1cf08912fa12', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '60c8012acd78', 'member', 1787679893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '60c8012acd78', 'member', 1787679893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('60c8012acd78', 'a30194f2de89', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('60c8012acd78', '5fc4018fab23', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', 'a30194f2de89', 'member', 1787766293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', 'a30194f2de89', 'member', 1787766293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('a30194f2de89', '36b014eaef90', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('a30194f2de89', '92d09012bc34', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '36b014eaef90', 'member', 1787852693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '36b014eaef90', 'member', 1787852693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('36b014eaef90', '79c901affa01', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('36b014eaef90', '25a014f9cd45', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '79c901affa01', 'member', 1787939093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '79c901affa01', 'member', 1787939093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('79c901affa01', '1cf08912fa12', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('79c901affa01', '68c8012ade56', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '1cf08912fa12', 'member', 1788025493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '1cf08912fa12', 'member', 1788025493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('1cf08912fa12', '5fc4018fab23', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('1cf08912fa12', 'ab0194f2ef67', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '5fc4018fab23', 'member', 1788111893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '5fc4018fab23', 'member', 1788111893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('5fc4018fab23', '92d09012bc34', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('5fc4018fab23', '3eb014eafa78', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '92d09012bc34', 'member', 1788198293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '92d09012bc34', 'member', 1788198293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('92d09012bc34', '25a014f9cd45', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('92d09012bc34', '71c901afab89', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '25a014f9cd45', 'member', 1788284693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '25a014f9cd45', 'member', 1788284693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('25a014f9cd45', '68c8012ade56', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('25a014f9cd45', '14f08912bc90', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '68c8012ade56', 'member', 1788371093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '68c8012ade56', 'member', 1788371093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('68c8012ade56', 'ab0194f2ef67', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('68c8012ade56', '57c4018fcd01', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', 'ab0194f2ef67', 'member', 1788457493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', 'ab0194f2ef67', 'member', 1788457493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('ab0194f2ef67', '3eb014eafa78', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('ab0194f2ef67', '9ad09012de12', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '3eb014eafa78', 'member', 1788543893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '3eb014eafa78', 'member', 1788543893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('3eb014eafa78', '71c901afab89', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('3eb014eafa78', '2ea014f9ef23', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '71c901afab89', 'member', 1788630293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '71c901afab89', 'member', 1788630293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('71c901afab89', '14f08912bc90', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('71c901afab89', '61c8012afa34', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '14f08912bc90', 'member', 1788716693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '14f08912bc90', 'member', 1788716693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('14f08912bc90', '57c4018fcd01', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('14f08912bc90', 'a40194f2ab45', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '57c4018fcd01', 'member', 1787507093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '57c4018fcd01', 'member', 1787507093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('57c4018fcd01', '9ad09012de12', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('57c4018fcd01', '37b014eabc56', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '9ad09012de12', 'member', 1787593493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '9ad09012de12', 'member', 1787593493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('9ad09012de12', '2ea014f9ef23', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('9ad09012de12', '7ac901afcd67', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '2ea014f9ef23', 'member', 1787679893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '2ea014f9ef23', 'member', 1787679893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('2ea014f9ef23', '61c8012afa34', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('2ea014f9ef23', '1df08912de78', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '61c8012afa34', 'member', 1787766293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '61c8012afa34', 'member', 1787766293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('61c8012afa34', 'a40194f2ab45', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('61c8012afa34', '50c4018fef89', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', 'a40194f2ab45', 'member', 1787852693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', 'a40194f2ab45', 'member', 1787852693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('a40194f2ab45', '37b014eabc56', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('a40194f2ab45', '93d09012fa90', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '37b014eabc56', 'member', 1787939093392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '37b014eabc56', 'member', 1787939093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('37b014eabc56', '7ac901afcd67', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('37b014eabc56', '7f8a910c2b44', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-gaming', '7ac901afcd67', 'member', 1788025493392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '7ac901afcd67', 'member', 1788025493392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('7ac901afcd67', '1df08912de78', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('7ac901afcd67', '3c91a4e082aa', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-technology', '1df08912de78', 'member', 1788111893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '1df08912de78', 'member', 1788111893392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('1df08912de78', '50c4018fef89', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('1df08912de78', '9f4a120c8b31', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-privacy-ai', '50c4018fef89', 'member', 1788198293392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-solarpunk', '50c4018fef89', 'member', 1788198293392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('50c4018fef89', '93d09012fa90', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('50c4018fef89', '5b2041e8d902', 1788975893392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-opensource', '93d09012fa90', 'member', 1788284693392);
INSERT OR REPLACE INTO community_members (community_id, user_id, role, joined_at) VALUES ('c-digitalfreedom', '93d09012fa90', 'member', 1788284693392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('93d09012fa90', '7f8a910c2b44', 1788803093392);
INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('93d09012fa90', '14e92a8819bb', 1788975893392);
