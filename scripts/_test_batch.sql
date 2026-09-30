INSERT OR REPLACE INTO channels (id, space, name, description, is_encrypted, created_at)
VALUES ('relays-general', 'relays', 'general', 'Sovereign E2EE live voice & text', 1, 1786869246027);
INSERT OR REPLACE INTO channels (id, space, name, description, is_encrypted, created_at)
VALUES ('relays-dev', 'relays', 'dev-core', 'Core cryptography & low-level discussions', 1, 1786869246027);
INSERT OR REPLACE INTO channels (id, space, name, description, is_encrypted, created_at)
VALUES ('vault-releases', 'vault', 'releases', 'Verified software releases & clean binaries', 0, 1786869246027);
INSERT OR REPLACE INTO channels (id, space, name, description, is_encrypted, created_at)
VALUES ('vault-guides', 'vault', 'security-guides', 'In-depth research, reversing & operational security', 0, 1786869246027);
INSERT OR REPLACE INTO channels (id, space, name, description, is_encrypted, created_at)
VALUES ('pulse-global', 'pulse', 'chrono-feed', 'Uncensored chronological sovereign microblogging', 0, 1786869246027);
INSERT OR REPLACE INTO channels (id, space, name, description, is_encrypted, created_at)
VALUES ('c/gaming', 'pulse', 'gaming', 'Gaming news, esports, leaks, and discussion', 0, 1786869246027);
INSERT OR REPLACE INTO channels (id, space, name, description, is_encrypted, created_at)
VALUES ('c/technology', 'pulse', 'technology', 'Hardware, CPUs, GPUs, architecture and tech', 0, 1786869246027);
INSERT OR REPLACE INTO channels (id, space, name, description, is_encrypted, created_at)
VALUES ('c/privacy-ai', 'pulse', 'privacy-ai', 'Local LLMs, open weights, privacy and sovereign AI', 0, 1786869246027);
INSERT OR REPLACE INTO channels (id, space, name, description, is_encrypted, created_at)
VALUES ('c/opensource', 'pulse', 'opensource', 'FOSS tools, Linux, compilers, and desktop apps', 0, 1786869246027);
INSERT OR REPLACE INTO channels (id, space, name, description, is_encrypted, created_at)
VALUES ('c/solarpunk', 'pulse', 'solarpunk', 'Off-grid hardware, balcony solar, and resilience', 0, 1786869246027);
INSERT OR REPLACE INTO channels (id, space, name, description, is_encrypted, created_at)
VALUES ('c/digitalfreedom', 'pulse', 'digitalfreedom', 'Digital rights, encryption, and anti-surveillance', 0, 1786869246027);
INSERT OR REPLACE INTO channels (id, space, name, description, is_encrypted, created_at)
VALUES ('c/creative', 'pulse', 'creative', 'Game art, shaders, 3D rendering and design', 0, 1786869246027);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '696ce1a8b9f3', 'Liam O''Connor', 'vortex_peek', '24.8k CS2 Premier. Wooting 60HE rapid trigger set to 0.1mm. If Valve doesn''t fix sub-tick hitreg I''m going to valorant permanently 🎯💀',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=vortex_peek&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["CS2 Premier 24k", "Faceit Level 10"]',
    'https://urefy.com/@vortex_peek', 'subnet // bucharest 🇷🇴',
    1790670846027, 1790670846027
);
INSERT OR REPLACE INTO user_roles (fingerprint, role, is_quarantined, is_shadowbanned, notes, updated_at)
VALUES ('696ce1a8b9f3', 'MEMBER', 0, 0, NULL, 1790670846027);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '4af97f8d0ee0', 'Chloe // Radiant', 'ace_delaney', 'Radiant peak #312 EU. Phantom > Vandal and I will die on this hill. Coaching silvers for free on weekends 👑🔥',
    'https://api.dicebear.com/7.x/bottts/svg?seed=ace_delaney&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Radiant Peak", "Vandal Master"]',
    'https://urefy.com/@ace_delaney', 'node // iasi 🇷🇴',
    1790610445058, 1790610445101
);
INSERT OR REPLACE INTO user_roles (fingerprint, role, is_quarantined, is_shadowbanned, notes, updated_at)
VALUES ('4af97f8d0ee0', 'MEMBER', 0, 0, NULL, 1790610445101);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '89d616d03b5a', 'ClutchGodot [Predator]', 'clutch_godot', 'Apex Predator S17/S19. 1200 hours in R5Reloaded 1v1 servers. Tap-strafing until my scroll wheel breaks 🌪️🎮',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=clutch_godot&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Apex Predator", "Tap Strafe Pro"]',
    'https://urefy.com/@clutch_godot', 'node // austin 🇺🇸',
    1790550044089, 1790550044175
);
INSERT OR REPLACE INTO user_roles (fingerprint, role, is_quarantined, is_shadowbanned, notes, updated_at)
VALUES ('89d616d03b5a', 'MEMBER', 0, 0, NULL, 1790550044175);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'b9606369d38f', 'Cristina Radulescu', 'subtick_kai', 'R6 Siege Champ. 4:3 stretched res, Holo A on everything. Drone economy wins matches, your aim is secondary 📹🎯',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=subtick_kai&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Dota 8k MMR", "Invoker Specialist"]',
    'https://urefy.com/@subtick_kai', 'node // seoul 🇰🇷',
    1790489643120, 1790489643249
);
INSERT OR REPLACE INTO user_roles (fingerprint, role, is_quarantined, is_shadowbanned, notes, updated_at)
VALUES ('b9606369d38f', 'MEMBER', 0, 0, NULL, 1790489643249);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'f7364b6ca022', 'Alina Barbu', 's1mple_fanboy', 'Dota 2 7.8k MMR pos 2. Invoker / Storm Spirit spammer. BKB is mandatory stop skipping it you animals ⚡🧙‍♂️',
    'https://api.dicebear.com/7.x/bottts/svg?seed=s1mple_fanboy&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["R6 Champion", "Drone Scout"]',
    'https://urefy.com/@s1mple_fanboy', 'node // timisoara 🇷🇴',
    1790342782151, 1790342782323
);
INSERT OR REPLACE INTO user_roles (fingerprint, role, is_quarantined, is_shadowbanned, notes, updated_at)
VALUES ('f7364b6ca022', 'MEMBER', 0, 0, NULL, 1790342782323);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    'c42c68682403', 'Arthur Zimmermann', 'crosshair_placement', 'Faceit level 10 solo queue survivor. Cluj LAN finalist 2025. 800 eDPI, Artisan Zero Soft XL mousepad 🖱️🇷🇴',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=crosshair_placement&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Wooting 60HE", "Sub-Tick Skeptic"]',
    'https://urefy.com/@crosshair_placement', 'datacenter // frankfurt 🇩🇪',
    1790278781182, 1790278781397
);
INSERT OR REPLACE INTO user_roles (fingerprint, role, is_quarantined, is_shadowbanned, notes, updated_at)
VALUES ('c42c68682403', 'MEMBER', 0, 0, NULL, 1790278781397);
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url,
    pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES (
    '400f0fe0c653', 'Laurentiu // League', 'radiant_jett', 'League Master tier jungle main. Viego & Lee Sin. Counter-jungling at lvl 3 is free real estate 🌲⚔️',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=radiant_jett&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', NULL, '["Artisan Mousepad", "Zowie 240Hz"]',
    'https://urefy.com/@radiant_jett', 'peer // london 🇬🇧',
    1790218380213, 1790218380471
);
INSERT OR REPLACE INTO user_roles (fingerprint, role, is_quarantined, is_shadowbanned, notes, updated_at)
