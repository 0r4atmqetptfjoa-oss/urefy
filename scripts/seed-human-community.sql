-- ============================================================================
-- UREfy — REALISTIC HUMAN COMMUNITY CONVERSATIONS & POSTS (2026)
-- Clean, authentic personas, zero AI clichés, natural conversations
-- ============================================================================

-- Clean previous bot/ai-pattern entries
DELETE FROM comments WHERE id LIKE 'comm-%' OR id LIKE 'c-human-%';
DELETE FROM posts WHERE id LIKE 'post-reddit-%' OR id LIKE 'p-human-%';
DELETE FROM user_profiles WHERE user_id LIKE 'fp_%';

-- 1. REAL HUMAN USER PROFILES (12-char hex cryptographic fingerprints)
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url, pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES
(
    '7f8a910c2b44',
    'Maya Lin',
    'maya_lin',
    'machine learning researcher, mostly playing with local models & python. coffee enthusiast.',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    'p-human-1',
    '["local-ai", "python", "machine-learning"]',
    'https://mayalin.dev',
    'Montreal, Canada',
    1789000000000,
    1789662000000
),
(
    '3c91a4e082aa',
    'Alex Rivera',
    'alex_r',
    'software engineer @ austin. building tools, breaking code, drinking espresso.',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80',
    'p-human-2',
    '["typescript", "rust", "software-engineering"]',
    'https://alexrivera.io',
    'Austin, TX',
    1789010000000,
    1789662000000
),
(
    '9f4a120c8b31',
    'Andrei Popa',
    'andrei_p',
    'dev din bucurești. pasionat de rețele, homelab, linux și hardware vechi.',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
    'p-human-3',
    '["homelab", "networking", "linux", "romania"]',
    'https://andreipopa.dev',
    'București, România',
    1789020000000,
    1789662000000
),
(
    'd401e9a7c2b5',
    'Nadia Lindholm',
    'nadia_l',
    'open source maintainer. rust, tauri & desktop apps. stockholm.',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80',
    'p-human-4',
    '["opensource", "rust", "tauri", "desktop"]',
    'https://nadialindholm.org',
    'Stockholm, Sweden',
    1789030000000,
    1789662000000
),
(
    '5b18a20f9c44',
    'Julian Thorne',
    'julian_t',
    'gardener, tinkerer, solar homelab builder. based in bristol.',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&auto=format&fit=crop&q=80',
    'p-human-5',
    '["solarpunk", "homelab", "diy", "gardening"]',
    'https://julianthorne.net',
    'Bristol, UK',
    1789040000000,
    1789662000000
),
(
    'b4e1903fa821',
    'Chloe Chen',
    'chloe_c',
    'indie game developer. working on a pixel art adventure in godot 4.',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
    'p-human-6',
    '["gamedev", "godot", "pixelart", "gaming"]',
    'https://chloechen.games',
    'Vancouver, Canada',
    1789050000000,
    1789662000000
),
(
    '8e20b17fa633',
    'Zack Kovacs',
    'zack_k',
    'privacy researcher & security nerd. keep your keys close.',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
    'p-human-7',
    '["privacy", "security", "cryptography"]',
    'https://zackkovacs.eu',
    'Berlin, Germany',
    1789060000000,
    1789662000000
),
(
    '6c71e2049d55',
    'Viktor Ionescu',
    'viktor_i',
    'cluj-napoca. c/rust, wayland, linux kernel & split keyboards.',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80',
    'p-human-8',
    '["linux", "wayland", "rust", "hardware"]',
    'https://viktorionescu.dev',
    'Cluj-Napoca, România',
    1789070000000,
    1789662000000
),
(
    'e291a04c7f18',
    'Marcus Vance',
    'marcus_v',
    'sysadmin in chicago. keep it simple, stop over-engineering everything.',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
    'p-human-9',
    '["sysadmin", "databases", "sqlite", "linux"]',
    'https://marcusvance.tech',
    'Chicago, IL',
    1789080000000,
    1789662000000
),
(
    '1a88b39c0e42',
    'Clara Dufresne',
    'clara_d',
    'ui/ux designer in paris. obsessed with typography, tactile interfaces & good css.',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&auto=format&fit=crop&q=80',
    'p-human-10',
    '["ui", "ux", "design", "css"]',
    'https://claradufresne.design',
    'Paris, France',
    1789090000000,
    1789662000000
),
(
    '4d90e118ba72',
    'Stefan Radu',
    'stefan_r',
    'inginer de sunet & producător muzică electronică. pipewire, bitwig, synths.',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&auto=format&fit=crop&q=80',
    'p-human-11',
    '["audio", "music", "pipewire", "bitwig"]',
    'https://stefanradu.audio',
    'București, România',
    1789100000000,
    1789662000000
),
(
    'c3dc28cb705e',
    'Elena Rostova',
    'elena_r',
    'cercetător & dev. decentralized tools and privacy tech. bucurești.',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
    NULL,
    '["privacy", "cryptography", "decentralization"]',
    'https://urefy.com/@elena_r',
    'București, România',
    1788500000000,
    1789662000000
),
(
    'a89104fa2211',
    'David Chen',
    'david_c',
    'systems engineer & retro gaming preservationist. austin tx.',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80',
    'p-human-12',
    '["gaming", "preservation", "retro", "linux"]',
    'https://urefy.com/@david_c',
    'Austin, TX',
    1788510000000,
    1789662000000
);

-- 2. AUTHENTIC USER POSTS (Organic, Conversational, Human Writing)
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, status, created_at, is_expanded
) VALUES
(
    'p-human-1',
    'c/privacy-ai',
    '7f8a910c2b44',
    'RESEARCHER',
    'honestly haven''t touched cloud AI since setting up local qwen last week',
    'been testing qwen 2.5 coder 14b on my m3 pro (q5_k_m quant via llama.cpp) and it''s honestly night and day compared to api lag lately.

first token is basically instant, no 2-second hesitation while typing, and my company code actually stays on my machine. 

anyone else running this setup? what context size are you keeping active before things start crawling on your end?',
    'AI & PRIVACY',
    148,
    0,
    5,
    24,
    'published',
    1789662500000,
    0
),
(
    'p-human-2',
    'c/technology',
    '3c91a4e082aa',
    'MEMBER',
    'hot take: if you can''t write tests for your code, AI isn''t saving you, it''s just speeding up your disaster',
    'spent the entire morning debugging a PR that was obviously 100% generated with claude.

the code looked super clean at first glance, variable names were poetic, but it completely skipped handling database rollback on payment timeout. if that hit prod we would have had phantom orders everywhere.

we really need to stop calling blind copy-pasting "vibe coding". if you don''t have unit tests and strict linters catching edge cases, you''re just generating technical debt at 60 tokens per second.',
    'TECH DISCUSSION',
    192,
    0,
    4,
    31,
    'published',
    1789660800000,
    0
),
(
    'p-human-3',
    'c/technology',
    '9f4a120c8b31',
    'MEMBER',
    'A trecut cineva la RDS 10Gbps acasă? Merită bătaia de cap cu echipamentele?',
    'Salutare tuturor! Am văzut că cei de la Digi tot împing oferta de 10Gbps în București.

Pe hârtie sună super tare, dar din ce m-am uitat pe net, ca să tragi 10G real pe un PC îți trebuie placă de rețea dedicată PCIe, switch SFP+ sau 10GBASE-T și cabluri Cat6a/Cat7 prin toată casa.

A făcut cineva pasul concret? Se simte vreo diferență față de clasicul 1Gbps în utilizare zilnică (homelab, descărcat imagini mari de docker, backup-uri) sau e mai mult de flexat pe speedtest?',
    'HARDWARE',
    164,
    0,
    4,
    18,
    'published',
    1789658200000,
    0
),
(
    'p-human-4',
    'c/opensource',
    'd401e9a7c2b5',
    'MEMBER',
    'we finally ditched electron for tauri v2 and our users actually noticed',
    'shipped our first tauri v2 update yesterday for our desktop app. installer dropped from 140MB down to like 16MB and idle ram went from ~200MB to 15MB on windows.

got like 3 emails this morning from people saying "did you rewrite the app? it starts instantly now".

dealing with webkitgtk quirks on fedora was a pain for a week, but man, electron was eating so much memory for no reason.',
    'OPEN SOURCE',
    278,
    0,
    4,
    45,
    'published',
    1789656000000,
    0
),
(
    'p-human-5',
    'c/solarpunk',
    '5b18a20f9c44',
    'MEMBER',
    'my shed server is now 100% solar powered (and survived 4 rainy days)',
    'quick update on the solar setup for those who asked: mounted a 200W panel on the garden shed and hooked it to a 12V lifepo4 battery.

running a cluster of two orange pi 5 boards (they pull around 12W total). handles my home assistant, pihole, and local file sync.

the biggest trick was setting up a cron script that hibernates the secondary board if battery drops below 40% when it''s cloudy. my wife is mostly just happy there are no server fans humming in the hallway anymore lol.',
    'SHOWCASE',
    230,
    0,
    4,
    36,
    'published',
    1789653000000,
    0
),
(
    'p-human-6',
    'c/gaming',
    'b4e1903fa821',
    'MEMBER',
    'godot 4.3 startup speed ruined other engines for me',
    'used unity for 6 years before switching to godot last year for our pixel platformer.

the fact that the engine launches in 1 second and hitting play is instant completely changed how I prototype.

used to get distracted checking twitter while waiting for unity to compile domain changes. now if i have a stupid game mechanic idea at 2 AM I just test it in 5 minutes. anyone else shipping a game on godot this year?',
    'GAMING',
    142,
    0,
    3,
    15,
    'published',
    1789650000000,
    0
),
(
    'p-human-7',
    'c/digitalfreedom',
    '8e20b17fa633',
    'MEMBER',
    'reminder: client-side scanning is just a backdoor with better marketing',
    'every few months politicians try to rebrand client-side scanning as "safe encryption with verification".

math doesn''t work that way. if there''s code on your phone scanning your private photos and messages before they get encrypted, your phone is compromised by design.

there is no such thing as a backdoor that only the good guys know about. once a vulnerability exists, it''s open season.',
    'PERSPECTIVE',
    340,
    0,
    3,
    62,
    'published',
    1789645000000,
    0
),
(
    'p-human-8',
    'c/opensource',
    '6c71e2049d55',
    'MEMBER',
    'Configurat Wayland pe Arch cu noile drivere Nvidia: zero screen tearing după 5 ani de X11',
    'Băi fraților, după vreo 5 ani în care m-am chinuit cu scripturi xrandr și hacks ca să meargă două monitoare (unul de 144Hz și unul de 60Hz) fără stuttering, am pus azi ultimul driver Nvidia 560 pe Wayland.

Nu-mi vine să cred că a dispărut complet flickering-ul. Scaling-ul la 125% pe ecranul 2K e cristal, iar jocurile pe Steam merg cu G-Sync activat nativ.

Dacă mai stătea cineva pe X11 de frică că nu merg driverele pe Linux, faceți update-ul liniștiți că e stabil acum.',
    'OPEN SOURCE',
    195,
    0,
    4,
    28,
    'published',
    1789640000000,
    0
),
(
    'p-human-9',
    'c/technology',
    'e291a04c7f18',
    'MEMBER',
    'stop putting redis in front of sqlite unless you actually have a reason to',
    'saw another architecture diagram today for an internal tool with ~200 daily users that had cloud postgres, redis cache cluster, and three worker lambdas.

guys, modern nvme drives read at 7 gigabytes per second. a single sqlite file with wal mode enabled will handle 100k reads a second on a $5 hetzner vps without breaking a sweat.

half your production bugs are just cache invalidation and network timeouts between services that could have been a simple function call.',
    'TECH DISCUSSION',
    260,
    0,
    3,
    39,
    'published',
    1789635000000,
    0
),
(
    'p-human-10',
    'c/creative',
    '1a88b39c0e42',
    'MEMBER',
    'am I the only one relieved that pure flat minimalism is finally dying?',
    'so tired of websites that look like blank white sheets of paper where you can''t even tell what is clickable and what is a header.

loving the return of subtle 1px borders, gentle tactile shadows, and actual contrast. software should feel like a well-made physical tool you hold in your hands, not an empty sterile doctor''s office.

what''s a small design detail in an app that instantly makes it feel satisfying to use?',
    'PERSPECTIVE',
    138,
    0,
    3,
    17,
    'published',
    1789628000000,
    0
),
(
    'p-human-11',
    'c/technology',
    '4d90e118ba72',
    'MEMBER',
    'PipeWire mi-a salvat placa de sunet pe Linux pentru producție audio',
    'Cine a încercat să facă muzică pe Linux acum 4-5 ani își aduce aminte de coșmarul cu JACK vs PulseAudio, când deschideai un DAW și murea sunetul pe YouTube sau Discord.

De când am trecut pe PipeWire cu interfața qpwgraph, conectez sintetizatorul pe USB, am latență de sub 4ms la 48kHz / 64 samples și rutez orice canal audio direct în căști fără să restartez nimic.

Chiar a devenit o plăcere să faci live jam pe Linux fără să dai o căruță de bani pe un Mac doar pentru CoreAudio.',
    'HARDWARE',
    172,
    0,
    3,
    22,
    'published',
    1789620000000,
    0
),
(
    'p-human-12',
    'c/digitalfreedom',
    'a89104fa2211',
    'MEMBER',
    'the moment they revoked digital movies was the day I went back to physical and offline installers',
    'remember when you bought something and it was just... yours?

no terms of service updates making your purchase disappear, no servers shutting down 4 years later rendering the disc a drink coaster.

been keeping offline GOG installers on an external hard drive and ripping my old CDs. it feels so peaceful knowing that whatever happens to streaming platforms tomorrow, my library still works completely offline.',
    'PERSPECTIVE',
    284,
    0,
    3,
    49,
    'published',
    1789610000000,
    0
);

-- 3. NATURAL, HUMAN THREADED CONVERSATIONS
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES

-- Thread on Maya Lin's Local AI (p-human-1)
(
    'c-human-1-1',
    'p-human-1',
    NULL,
    '3c91a4e082aa',
    'MEMBER',
    'what mac specs are you on? I tried running the 32b on my m2 air and it was basically cooking eggs on the chassis lol',
    24,
    1789662600000
),
(
    'c-human-1-2',
    'p-human-1',
    'c-human-1-1',
    '7f8a910c2b44',
    'RESEARCHER',
    'haha yeah 32b on an air with 16gb is gonna swap like crazy. stick to 14b q4_k_m, it''s the sweet spot! draws barely 15W and runs completely silent.',
    38,
    1789662750000
),
(
    'c-human-1-3',
    'p-human-1',
    'c-human-1-2',
    '6c71e2049d55',
    'MEMBER',
    'am testat și eu aseară pe un rtx 4070 ti cu vllm. timpul până la primul token e sub 70ms, nici nu clipești și a terminat funcția.',
    21,
    1789662900000
),
(
    'c-human-1-4',
    'p-human-1',
    NULL,
    '8e20b17fa633',
    'MEMBER',
    'same here tbh. canceled my copilot sub yesterday. the latency difference alone sold me, waiting 2 seconds for a completion was driving me nuts.',
    32,
    1789663050000
),
(
    'c-human-1-5',
    'p-human-1',
    'c-human-1-4',
    'e291a04c7f18',
    'MEMBER',
    'plus your local model won''t send your company a surprise $4,000 bill because you left an agent looping in tmux over the weekend haha',
    44,
    1789663200000
),

-- Thread on Alex Rivera's Testing Post (p-human-2)
(
    'c-human-2-1',
    'p-human-2',
    NULL,
    'e291a04c7f18',
    'MEMBER',
    'amen to this. had a dev push an AI PR that looked gorgeous but completely ignored postgres transaction rollback. if it hit prod we would have had phantom charges everywhere.',
    35,
    1789661000000
),
(
    'c-human-2-2',
    'p-human-2',
    'c-human-2-1',
    '3c91a4e082aa',
    'MEMBER',
    'exactly what i''m talking about! llms generate code that *looks* right, not code that respects database invariants. tests are the only reality check.',
    28,
    1789661200000
),
(
    'c-human-2-3',
    'p-human-2',
    NULL,
    'd401e9a7c2b5',
    'MEMBER',
    'in our repos we made a rule: any AI-assisted PR has to come with regression tests written or verified by the human. cut out 80% of lazy PRs overnight.',
    41,
    1789661350000
),
(
    'c-human-2-4',
    'p-human-2',
    'c-human-2-3',
    '1a88b39c0e42',
    'MEMBER',
    'same for UI! AI generates generic tailwind divs that completely break screen readers and focus rings. human touch is still what makes software feel crafted.',
    22,
    1789661500000
),

-- Thread on Andrei Popa's Digi 10G Post (p-human-3)
(
    'c-human-3-1',
    'p-human-3',
    NULL,
    '6c71e2049d55',
    'MEMBER',
    'Salut Andrei! Am eu de 6 luni în Cluj. Sincer? Dacă nu ai NAS sau homelab cu switch de 10G, n-o să vezi nicio diferență față de 1Gbps. Steam descarcă cu vreo 250MB/s maxim că te limitează serverele lor sau procesorul la dezarhivat.',
    36,
    1789658400000
),
(
    'c-human-3-2',
    'p-human-3',
    'c-human-3-1',
    '9f4a120c8b31',
    'MEMBER',
    'Mersi Viktor! Fix de asta mă temeam. Placa de rețea 10G pe PCIe e vreo 400 de lei și dacă zici că Steam oricum nu duce, mai bine rămân pe cel de 1G și bag banii într-un SSD mai mare.',
    29,
    1789658600000
),
(
    'c-human-3-3',
    'p-human-3',
    'c-human-3-2',
    '4d90e118ba72',
    'MEMBER',
    'Confirm și eu. Am pus switch 2.5G acasă doar pentru transfer între PC și serverul de backup. E mult mai ieftin și cablurile Cat5e vechi din pereți duc 2.5G fără probleme pe distanțe scurte.',
    25,
    1789658800000
),
(
    'c-human-3-4',
    'p-human-3',
    'c-human-3-3',
    '9f4a120c8b31',
    'MEMBER',
    'Băi, chiar e pont cu 2.5G-ul! Nu m-am gândit că merg cablurile vechi. O să caut un switch micuț de 2.5G.',
    19,
    1789659000000
),

-- Thread on Nadia's Tauri Post (p-human-4)
(
    'c-human-4-1',
    'p-human-4',
    NULL,
    'e291a04c7f18',
    'MEMBER',
    'how did you handle the auto-updater? in electron we spent weeks fighting windows appdata permissions whenever an update downloaded.',
    23,
    1789656200000
),
(
    'c-human-4-2',
    'p-human-4',
    'c-human-4-1',
    'd401e9a7c2b5',
    'MEMBER',
    'tauri v2 updater plugin is super clean. you sign the build with a private key, upload the json to s3 or github releases, and tauri checks the signature before running. zero permission issues so far on win 11.',
    34,
    1789656400000
),
(
    'c-human-4-3',
    'p-human-4',
    NULL,
    '6c71e2049d55',
    'MEMBER',
    'pentru linux dacă aveți flickering pe wayland cu plăci nvidia mai vechi, adăugați variabila WEBKIT_DISABLE_COMPOSITING_MODE=1 în wrapper. am rezolvat un bug urât așa la altă aplicație.',
    27,
    1789656600000
),
(
    'c-human-4-4',
    'p-human-4',
    'c-human-4-3',
    'd401e9a7c2b5',
    'MEMBER',
    'oh that is gold! bookmarked, thank you Viktor!',
    16,
    1789656800000
),

-- Thread on Julian's Solar Homelab (p-human-5)
(
    'c-human-5-1',
    'p-human-5',
    NULL,
    '3c91a4e082aa',
    'MEMBER',
    '12W total is insane! my desktop idles at like 75W just looking pretty with rgb fans lol. what storage are you running on the orange pi?',
    31,
    1789653200000
),
(
    'c-human-5-2',
    'p-human-5',
    'c-human-5-1',
    '5b18a20f9c44',
    'MEMBER',
    'running a 1TB nvme ssd directly in the m.2 slot underneath! sd cards die way too fast with continuous database writes, learned that the hard way last year.',
    26,
    1789653400000
),
(
    'c-human-5-3',
    'p-human-5',
    'c-human-5-2',
    'e291a04c7f18',
    'MEMBER',
    'also mount /tmp and logs to tmpfs in ram. saves your ssd write cycles and keeps things snappy.',
    22,
    1789653600000
),
(
    'c-human-5-4',
    'p-human-5',
    'c-human-5-3',
    '5b18a20f9c44',
    'MEMBER',
    'already on it! tmpfs has been a lifesaver.',
    14,
    1789653800000
),

-- Thread on Chloe's Godot Post (p-human-6)
(
    'c-human-6-1',
    'p-human-6',
    NULL,
    'a89104fa2211',
    'MEMBER',
    'the 1-second launch time is what sold me too. unity felt like launching an entire OS just to test if a sprite jumped properly.',
    28,
    1789650200000
),
(
    'c-human-6-2',
    'p-human-6',
    'c-human-6-1',
    'b4e1903fa821',
    'MEMBER',
    'right?? when testing is instant you actually experiment instead of second-guessing every tiny tweak.',
    20,
    1789650400000
),
(
    'c-human-6-3',
    'p-human-6',
    NULL,
    '4d90e118ba72',
    'MEMBER',
    'cum ți se pare motorul de audio în godot 4? eu am rămas surprins că are bus-uri de efecte direct în engine fără middleware scump.',
    18,
    1789650600000
),

-- Thread on Zack's Privacy Post (p-human-7)
(
    'c-human-7-1',
    'p-human-7',
    NULL,
    'c3dc28cb705e',
    'ARCHIVIST',
    'Exact așa Zack. Odată ce creezi o portiță tehnică într-un protocol, e doar o chestiune de timp până o exploatează cine nu trebuie. Criptarea end-to-end trebuie să rămână fără excepții.',
    42,
    1789645200000
),
(
    'c-human-7-2',
    'p-human-7',
    'c-human-7-1',
    '8e20b17fa633',
    'MEMBER',
    'Spot on Elena. That''s why client-side key generation where the server never sees the private key is the only sustainable answer.',
    31,
    1789645400000
),
(
    'c-human-7-3',
    'p-human-7',
    NULL,
    'a89104fa2211',
    'MEMBER',
    'People often don''t realize that "scanning on device before encryption" is literally spyware with a government stamp. Glad people are pushing back.',
    27,
    1789645600000
),

-- Thread on Viktor's Wayland Post (p-human-8)
(
    'c-human-8-1',
    'p-human-8',
    NULL,
    '4d90e118ba72',
    'MEMBER',
    'Confirm și eu pe KDE Plasma 6 cu Wayland. Înainte dacă aveam un video pe ecranul secundar îmi scădea FPS-ul în joc pe ecranul principal. Acum merg ambele la refresh rate-ul lor nativ.',
    25,
    1789640200000
),
(
    'c-human-8-2',
    'p-human-8',
    'c-human-8-1',
    '6c71e2049d55',
    'MEMBER',
    'Exact! X11 avea limitarea asta arhitecturală de când lumea. Wayland gestionează fiecare ecran separat și se simte diferența instant.',
    21,
    1789640400000
),
(
    'c-human-8-3',
    'p-human-8',
    NULL,
    'd401e9a7c2b5',
    'MEMBER',
    'fractional scaling on 1440p laptops is finally sharp too! was so sick of blurry font rendering in slack and vscode.',
    24,
    1789640600000
),
(
    'c-human-8-4',
    'p-human-8',
    'c-human-8-3',
    '6c71e2049d55',
    'MEMBER',
    'Da, cu protocolul nou de fractional scaling nu mai face upscaling stupid din bitmap, randează direct la rezoluția corectă.',
    17,
    1789640800000
),

-- Thread on Marcus Vance's SQLite Post (p-human-9)
(
    'c-human-9-1',
    'p-human-9',
    NULL,
    '3c91a4e082aa',
    'MEMBER',
    'people love building distributed systems for apps that have fewer concurrent users than a neighborhood bakery haha. sqlite in wal mode is so ridiculously fast.',
    38,
    1789635200000
),
(
    'c-human-9-2',
    'p-human-9',
    'c-human-9-1',
    'e291a04c7f18',
    'MEMBER',
    'literally! sqlite powers every phone and browser on earth. you don''t need a 3-node redis cluster to store 500 session tokens.',
    29,
    1789635400000
),
(
    'c-human-9-3',
    'p-human-9',
    NULL,
    '9f4a120c8b31',
    'MEMBER',
    'Am un script de monitorizare acasă care scrie în SQLite la fiecare 2 secunde de vreo 3 ani. Baza are 12GB și query-urile durează 4 milisecunde.',
    26,
    1789635600000
),

-- Thread on Clara's UI Post (p-human-10)
(
    'c-human-10-1',
    'p-human-10',
    NULL,
    'd401e9a7c2b5',
    'MEMBER',
    '1px subtle borders on dark theme make such a massive difference. it gives cards definition without looking busy.',
    25,
    1789628200000
),
(
    'c-human-10-2',
    'p-human-10',
    'c-human-10-1',
    '1a88b39c0e42',
    'MEMBER',
    'exactly! border-white/10 with a slight hover brightening lets the eyes naturally group content without feeling overwhelmed.',
    19,
    1789628400000
),
(
    'c-human-10-3',
    'p-human-10',
    NULL,
    'b4e1903fa821',
    'MEMBER',
    'same in game ui! flat boxes feel lazy, players love subtle depth and tactile click feedback.',
    16,
    1789628600000
),

-- Thread on Stefan's PipeWire Post (p-human-11)
(
    'c-human-11-1',
    'p-human-11',
    NULL,
    'b4e1903fa821',
    'MEMBER',
    'folosești qpwgraph sau helvum pentru rutare? mie helvum mi se pare mai curat vizual când ai multe noduri.',
    17,
    1789620200000
),
(
    'c-human-11-2',
    'p-human-11',
    'c-human-11-1',
    '4d90e118ba72',
    'MEMBER',
    'qpwgraph pentru că îmi salvează conexiunile automate între sesiuni! Când pornesc Bitwig știe exact pe ce canal să lege sintetizatorul.',
    22,
    1789620400000
),
(
    'c-human-11-3',
    'p-human-11',
    NULL,
    '6c71e2049d55',
    'MEMBER',
    'Wim Taymans chiar a făcut treabă excepțională cu PipeWire. După 15 ani de certuri PulseAudio vs JACK, în sfârșit avem un standard.',
    28,
    1789620600000
),

-- Thread on David's DRM Post (p-human-12)
(
    'c-human-12-1',
    'p-human-12',
    NULL,
    '8e20b17fa633',
    'MEMBER',
    'initiative like Stop Killing Games proved people are sick of rented culture. if I pay for a game, it shouldn''t vanish when a studio gets acquired.',
    37,
    1789610200000
),
(
    'c-human-12-2',
    'p-human-12',
    'c-human-12-1',
    'a89104fa2211',
    'MEMBER',
    '100%. offline installers on cold storage is the only real digital ownership.',
    28,
    1789610400000
),
(
    'c-human-12-3',
    'p-human-12',
    NULL,
    '9f4a120c8b31',
    'MEMBER',
    'Și eu am început să țin backup-uri locale la tot ce cumpăr. N-ai de unde să știi când dispare un serviciu peste noapte.',
    24,
    1789610600000
);

-- 4. COMMUNITY MEMBERSHIPS
INSERT OR IGNORE INTO community_members (community_id, user_id, role, joined_at) VALUES
('c-privacy-ai', '7f8a910c2b44', 'member', 1789000000000),
('c-privacy-ai', 'c3dc28cb705e', 'member', 1789000000000),
('c-privacy-ai', '8e20b17fa633', 'member', 1789000000000),
('c-privacy-ai', '3c91a4e082aa', 'member', 1789000000000),

('c-technology', '3c91a4e082aa', 'member', 1789000000000),
('c-technology', '9f4a120c8b31', 'member', 1789000000000),
('c-technology', 'e291a04c7f18', 'member', 1789000000000),
('c-technology', '4d90e118ba72', 'member', 1789000000000),

('c-opensource', 'd401e9a7c2b5', 'member', 1789000000000),
('c-opensource', '6c71e2049d55', 'member', 1789000000000),
('c-opensource', 'c3dc28cb705e', 'member', 1789000000000),
('c-opensource', '3c91a4e082aa', 'member', 1789000000000),

('c-gaming', 'b4e1903fa821', 'member', 1789000000000),
('c-gaming', 'a89104fa2211', 'member', 1789000000000),
('c-gaming', '4d90e118ba72', 'member', 1789000000000),

('c-solarpunk', '5b18a20f9c44', 'member', 1789000000000),
('c-solarpunk', '3c91a4e082aa', 'member', 1789000000000),
('c-solarpunk', 'e291a04c7f18', 'member', 1789000000000),

('c-creative', '1a88b39c0e42', 'member', 1789000000000),
('c-creative', 'b4e1903fa821', 'member', 1789000000000),

('c-digitalfreedom', '8e20b17fa633', 'member', 1789000000000),
('c-digitalfreedom', 'a89104fa2211', 'member', 1789000000000),
('c-digitalfreedom', 'c3dc28cb705e', 'member', 1789000000000);

-- 5. SOCIAL FOLLOWS
INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES
('3c91a4e082aa', '7f8a910c2b44', 1789100000000),
('7f8a910c2b44', '3c91a4e082aa', 1789101000000),
('3c91a4e082aa', 'e291a04c7f18', 1789102000000),
('9f4a120c8b31', '6c71e2049d55', 1789103000000),
('6c71e2049d55', '9f4a120c8b31', 1789104000000),
('d401e9a7c2b5', '6c71e2049d55', 1789105000000),
('1a88b39c0e42', 'b4e1903fa821', 1789106000000),
('b4e1903fa821', '1a88b39c0e42', 1789107000000),
('5b18a20f9c44', '3c91a4e082aa', 1789108000000),
('8e20b17fa633', 'c3dc28cb705e', 1789109000000),
('c3dc28cb705e', '8e20b17fa633', 1789110000000),
('a89104fa2211', '8e20b17fa633', 1789111000000),
('4d90e118ba72', '6c71e2049d55', 1789112000000),
('4d90e118ba72', '9f4a120c8b31', 1789113000000);
