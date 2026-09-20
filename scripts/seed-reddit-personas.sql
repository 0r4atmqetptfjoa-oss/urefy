-- ============================================================================
-- UREfy — SEED REALISTIC REDDIT PERSONAS, POSTS & THREADED DISCUSSIONS (2026)
-- Target: Cloudflare D1 Database (aetheris-db)
-- ============================================================================

-- 1. USER PROFILES (10 Realistic Human Personas + Core Team)
INSERT OR REPLACE INTO user_profiles (
    user_id, display_name, handle, bio, avatar_url, banner_url, pinned_post_id, interests_json, website, location, created_at, updated_at
) VALUES
(
    'fp_mayalin_ai',
    'Dr. Maya Lin',
    'mayalin_ai',
    'AI researcher focusing on efficient open-weights models and local inference privacy. Coffee, PyTorch & edge silicon.',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    'post-reddit-1',
    '["local-ai", "privacy", "llms", "open-weights"]',
    'https://mayalin.dev',
    'Montreal, QC',
    1789000000000,
    1789662000000
),
(
    'fp_alex_dev',
    'Alex Rivera',
    'alex_dev',
    'Senior systems & fullstack engineer. Building deterministic test harnesses for autonomous agents. Breaking npm packages for fun.',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80',
    'post-reddit-2',
    '["typescript", "rust", "devtools", "software-architecture"]',
    'https://alexrivera.io',
    'Austin, TX',
    1789010000000,
    1789662000000
),
(
    'fp_nadia_foss',
    'Nadia Lindholm',
    'nadia_foss',
    'Open source maintainer & desktop engineer. Big advocate for Tauri, memory safety, and lightweight native software.',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80',
    'post-reddit-3',
    '["opensource", "rust", "tauri", "linux"]',
    'https://nadialindholm.org',
    'Stockholm, SE',
    1789020000000,
    1789662000000
),
(
    'fp_chloe_gamedev',
    'Chloe Chen',
    'chloe_gamedev',
    'Solo indie dev making atmospheric pixel art games in Godot 4. Shader enthusiast, retro gaming archivist.',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
    'post-reddit-4',
    '["gamedev", "godot", "pixel-art", "indie-games"]',
    'https://chloechen.games',
    'Vancouver, BC',
    1789030000000,
    1789662000000
),
(
    'fp_julian_solar',
    'Julian Thorne',
    'julian_solar',
    'Permaculture, solar micro-grids, and low-power ARM homelabs. Building resilient local tech for an uncertain future.',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&auto=format&fit=crop&q=80',
    'post-reddit-5',
    '["solarpunk", "homelab", "arm64", "sustainability"]',
    'https://julianthorne.net',
    'Bristol, UK',
    1789040000000,
    1789662000000
),
(
    'fp_zack_privacy',
    'Zack Kovacs',
    'zack_privacy',
    'Digital rights advocate & security researcher. End-to-end encryption is a fundamental human right. Math does not negotiate.',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
    'post-reddit-6',
    '["privacy", "e2ee", "cryptography", "digital-rights"]',
    'https://zackkovacs.eu',
    'Berlin, DE',
    1789050000000,
    1789662000000
),
(
    'fp_marcus_sys',
    'Marcus Vance',
    'marcus_sys',
    'Linux sysadmin & database tinkerer. Proponent of simple architectures. Friends do not let friends over-engineer.',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
    'post-reddit-7',
    '["linux", "databases", "sqlite", "sysadmin"]',
    'https://marcusvance.tech',
    'Chicago, IL',
    1789060000000,
    1789662000000
),
(
    'fp_clara_ux',
    'Clara Dufresne',
    'clara_ux',
    'Product designer obsessed with tactile UI, micro-interactions, and accessible typography. Anti-minimalist warmth.',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&auto=format&fit=crop&q=80',
    'post-reddit-8',
    '["ui-ux", "design", "typography", "css"]',
    'https://claradufresne.design',
    'Paris, FR',
    1789070000000,
    1789662000000
),
(
    'fp_viktor_kernel',
    'Viktor Ionescu',
    'viktor_kernel',
    'C & Rust systems engineer. Wayland contributor, kernel latency optimizer, and custom split mechanical keyboard builder.',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80',
    'post-reddit-9',
    '["linux-kernel", "wayland", "rust", "hardware"]',
    'https://viktorionescu.dev',
    'Cluj-Napoca, RO',
    1789080000000,
    1789662000000
),
(
    'fp_stefan_audio',
    'Stefan Radu',
    'stefan_audio',
    'Sound engineer & modular synth builder. Producing electronic music exclusively with PipeWire and Linux audio tools.',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&auto=format&fit=crop&q=80',
    'post-reddit-10',
    '["audio", "pipewire", "bitwig", "music-production"]',
    'https://stefanradu.audio',
    'Bucharest, RO',
    1789090000000,
    1789662000000
),
(
    'c3dc28cb705e',
    'Elena Rostova',
    'elena_r',
    'Open source developer & privacy researcher. Building decentralized tools for people and sovereign communities.',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
    'post-reddit-11',
    '["privacy", "cryptography", "markdown", "decentralization"]',
    'https://urefy.com/@elena_r',
    'Bucharest, RO',
    1788500000000,
    1789662000000
),
(
    'a89104fa2211',
    'David Chen',
    'david_c',
    'Community moderator & systems engineer. Passionate about digital rights, retro preservation, and open social graphs.',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80',
    'post-reddit-12',
    '["digital-rights", "gaming", "preservation", "moderation"]',
    'https://urefy.com/@david_c',
    'Austin, TX',
    1788510000000,
    1789662000000
),
(
    'genesis-core',
    'Genesis Core',
    'genesis-core',
    'Founding protocol architect & guardian. Building UREfy — the social network you actually own.',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    NULL,
    '["architecture", "sovereignty", "cryptography"]',
    'https://urefy.com',
    'San Francisco, CA',
    1788000000000,
    1789662000000
);

-- 2. POSTS TABLE (12 Authentic Reddit-Style Discussions from 2026)
INSERT OR REPLACE INTO posts (
    id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, status, created_at, is_expanded
) VALUES
(
    'post-reddit-1',
    'c/privacy-ai',
    'fp_mayalin_ai',
    'RESEARCHER',
    'Why 2026 is officially the year local open-weights beat bloated cloud APIs for daily dev work',
    'I just finished benchmarking the latest Gemma 4 and Qwen 3.5 quants running locally on llama.cpp (RTX 4080 16GB + Mac M4 Pro 48GB).

Here is the unfiltered reality after 3 weeks of zero-cloud coding:
- **First token latency**: Under 65ms on local metal vs 850ms - 1.8s over HTTPS to cloud providers.
- **Privacy**: Proprietary client codebases, internal API specs, and credentials NEVER leave localhost. Zero opt-out begging. Zero telemetry clauses.
- **Cost**: Paid $0 in monthly API tokens after heavy refactoring sprints that would have easily cost $350+ on Opus or Sonnet.
- **Throughput**: ~62 tokens/sec on Qwen 14B Q5_K_M. It writes code faster than I can scan it.

Are you still piping sensitive company code into corporate cloud endpoints, or have you made the switch to on-device inference? What quantization sweet-spot are you running?',
    'AI & PRIVACY',
    184,
    0,
    6,
    28,
    'published',
    1789662500000,
    0
),
(
    'post-reddit-2',
    'c/technology',
    'fp_alex_dev',
    'CONTRIBUTOR',
    'The "vibe coding" pendulum is swinging back: autonomous agents need deterministic test harnesses, not blind prompts',
    'The collective honeymoon phase with unchecked autonomous coding agents is ending, and senior engineers are finally breathing a sigh of relief.

Over the last 6 months, teams that embraced "vibe coding" without strict guardrails created massive hidden technical debt:
1. Hallucinated transitive dependencies with obscure CVEs.
2. Silent regressions in edge cases that unit tests should have caught.
3. Giant 800-line monolithic files where clean modular components were needed.

The winning paradigm in 2026 isn''t "let the AI write everything blindly." It is **deterministic sandboxing**:
- Force the agent to run an AST linter on every edit.
- Require immediate execution of isolated vitest/pytest suites before any commit.
- Keep the Human in the loop for architectural decisions, while delegating the repetitive plumbing to the agent.

Tools that combine autonomous speed with cryptographic integrity and hard verification gates are the future. What guardrails does your team enforce?',
    'TECH DISCUSSION',
    215,
    0,
    5,
    34,
    'published',
    1789660800000,
    0
),
(
    'post-reddit-3',
    'c/opensource',
    'fp_nadia_foss',
    'MODERATOR',
    'Migrated our team desktop app from Electron to Tauri v2 + Rust: 180MB down to 14MB idle RAM',
    'We finally did it. After 8 months of planning, our desktop telemetry and workspace tool has officially ditched Electron for Tauri v2.

The hard metrics speak for themselves:
- **Installer size**: 128 MB down to 18.4 MB (.msi / .deb / .dmg).
- **Idle memory footprint**: 182 MB down to 14.1 MB on Windows 11 and 18 MB on GNOME Wayland.
- **Cold start time**: From 2.4 seconds to 320 milliseconds on a mid-tier ThinkPad.
- **Security surface**: Native Rust backend with explicit command IPC boundaries instead of raw Node.js integration.

The only real friction was dealing with WebKitGTK differences on older Linux distributions, but Tauri 2.0''s multi-window and mobile abstraction made it completely worth it.

If your team is on the fence about migrating away from Electron, feel free to ask questions about our IPC architecture!',
    'OPEN SOURCE',
    342,
    0,
    5,
    52,
    'published',
    1789657200000,
    0
),
(
    'post-reddit-4',
    'c/gaming',
    'fp_chloe_gamedev',
    'MEMBER',
    'Why Godot 4.3 feels like the sweet spot for solo indie developers in 2026',
    'Two years ago, when Unity had their licensing meltdown, half the indie dev community panicked. Today, shipping our second 2.5D game in Godot 4.3, I can honestly say it was the best forced migration that ever happened to us.

Why Godot is winning for solo creators:
1. **Zero launcher bloat**: The engine is a single 85MB executable. You double-click it and the project loads in 1.2 seconds.
2. **First-class 2D and competent 3D**: Tilemaps with auto-tiling, custom compute shaders, and the new Jolt physics integration are rock solid.
3. **No subscription dread**: No surprise runtime fees, no splash-screen tax, no corporate terms changing retroactively while you''re halfway through a 3-year production cycle.

It feels like using Blender 10 years ago — open source, rapidly improving with every point release, and built by people who genuinely love the craft. Who else is releasing on Godot this year?',
    'GAMING',
    168,
    0,
    4,
    19,
    'published',
    1789653600000,
    0
),
(
    'post-reddit-5',
    'c/solarpunk',
    'fp_julian_solar',
    'MEMBER',
    '6 months running a 100W off-grid solar homelab: lessons in low-power ARM servers & resilient computing',
    'Here is an update on my off-grid shed homelab project powered completely by the sun:

**Hardware Setup**:
- 1x 200W Renogy bifacial solar panel mounted on the garden shed roof.
- 1x 12V 50Ah LiFePO4 battery with integrated bluetooth BMS.
- Victron SmartSolar MPPT 75/15 charge controller.
- 3-node compute cluster: 1x Raspberry Pi 5 (8GB) + 2x Orange Pi 5 Plus (RK3588, 16GB).
- Total continuous draw under typical idle/moderate load: ~18W!

**What it hosts**:
- Local home automation (Home Assistant), Pi-hole DNS, paperless-ngx, and a lightweight P2P sync node.

**Key lesson**: You have to design for "intermittent computing." When November rains hit England and solar generation plummeted to 12Wh for 3 days straight, the cluster gracefully drained non-critical containers, spun down SSD arrays, and entered low-power hibernation without corrupting a single byte of data.

Resilience isn''t about infinite power; it''s about graceful degradation. Anyone else experimenting with off-grid computing?',
    'SHOWCASE',
    289,
    0,
    5,
    41,
    'published',
    1789650000000,
    0
),
(
    'post-reddit-6',
    'c/digitalfreedom',
    'fp_zack_privacy',
    'CONTRIBUTOR',
    'EU Digital Services Act vs client-side scanning: why math and end-to-end encryption cannot be compromised',
    'Once again, legislative bodies are floating the idea of "client-side scanning with safe exceptions" under the guise of online safety.

Let''s be mathematically and architecturally clear:
There is NO SUCH THING as a "secure backdoor that only good actors can use."
A cryptographic system either guarantees confidentiality between key holders, or it contains a vulnerability that malicious actors, rogue insiders, and state-sponsored adversaries will inevitably discover and exploit.

Client-side scanning turns every smartphone and laptop into an automated surveillance bug that scans your private thoughts, family photos, and medical records before they are encrypted.

The antidote to persistent regulatory creep isn''t lobbying — it is building sovereign, decentralized, open-source communication tools where users own their private keys and no centralized entity holds the keys to the kingdom. Stand firm.',
    'PERSPECTIVE',
    410,
    0,
    4,
    76,
    'published',
    1789642800000,
    0
),
(
    'post-reddit-7',
    'c/technology',
    'fp_marcus_sys',
    'MEMBER',
    'Unpopular opinion: Stop putting Redis in front of SQLite for read-heavy microservices',
    'I see junior and mid-level engineers building services with 500 daily active users, immediately spinning up AWS ElastiCache Redis clusters and managed Postgres instances, and then wondering why their cloud bill is $450/month and their debugging latency is awful.

Hear me out:
Modern NVMe drives read at 7,000 MB/s. SQLite in WAL mode with memory mapping (`PRAGMA mmap_size=268435456;`) serves over 140,000 reads/second on a single $10/month VPS.

By putting a networked Redis cache in front of your database:
- You added network serialization latency (TCP loopback or VPC hop).
- You created cache-invalidation nightmares (cache stampedes, stale data bugs).
- You added another distributed point of failure to monitor at 3 AM.

Unless you have multiple writing servers distributed across geographic regions, an in-process SQLite database with proper indexing will outperform your distributed cache 95% of the time. Keep it simple!',
    'TECH DISCUSSION',
    312,
    0,
    4,
    48,
    'published',
    1789635600000,
    0
),
(
    'post-reddit-8',
    'c/creative',
    'fp_clara_ux',
    'MEMBER',
    'Why ultra-flat corporate minimalism is finally fading, and tactile depth is returning to UI design',
    'Have you noticed how digital interfaces over the last decade began looking like sterile hospital hallways? Flat gray rectangles on slightly lighter gray backgrounds, zero borders, zero visual hierarchy, and buttons that look indistinguishable from disabled text.

In 2026, the pendulum is decisively swinging towards **Tactile Craft**:
- Subtle, refined 1px micro-borders that frame content with architectural precision.
- Meaningful elevation and warm ambient shadows that communicate physical layering.
- High-contrast typography pairings (geometric headings with warm, humanist body text).
- Delightful, low-latency micro-interactions that give physical weight to digital actions (like the haptic feedback of a real toggle).

Software shouldn''t feel like an impersonal enterprise spreadsheet. It should feel like a well-crafted physical notebook or a high-end audio mixer. What design details make an app feel truly human to you?',
    'PERSPECTIVE',
    155,
    0,
    3,
    22,
    'published',
    1789628400000,
    0
),
(
    'post-reddit-9',
    'c/opensource',
    'fp_viktor_kernel',
    'CONTRIBUTOR',
    'Wayland color management and fractional scaling in 2026: we have finally reached parity',
    'As someone who maintained X11 configuration scripts with xrandr duct tape for over a decade, I can finally say without caveats: Wayland has won, and the desktop experience on modern Linux is superb.

The recent Wayland protocol updates (especially `color-management-v1` and fractional scaling protocol fixes):
- Clean 125% and 150% scaling without fuzzy blurry text in Electron or Qt apps.
- True 10-bit HDR video playback on OLED displays with dynamic tone mapping.
- Variable Refresh Rate (G-Sync / FreeSync) working seamlessly across mixed-refresh multi-monitor setups without micro-stuttering.
- The 560+ series NVIDIA drivers with explicit sync have resolved the ancient flickering glitches once and for all.

If you gave up on Wayland in 2022 because of screen-sharing or scaling bugs, it''s time to boot up a fresh Fedora or Arch ISO and test it today. It feels faster and smoother than Windows 11 DWM.',
    'OPEN SOURCE',
    240,
    0,
    3,
    35,
    'published',
    1789614000000,
    0
),
(
    'post-reddit-10',
    'c/technology',
    'fp_stefan_audio',
    'MEMBER',
    'PipeWire + Bitwig on a $250 mini PC replaced my $3,000 Mac studio setup for live electronic jamming',
    'For years, audio engineering was considered the absolute last bastion where macOS was considered mandatory due to CoreAudio''s bulletproof low latency.

Last week, I performed a full 2-hour live modular set using a humble Beelink AMD Ryzen 7 mini PC running Arch Linux, PipeWire 1.2, and Bitwig Studio 5.

The stats:
- **Roundtrip audio latency**: 3.2ms at 48kHz / 64 samples buffer over USB on a Focusrite Scarlett.
- **Xruns (buffer underruns)**: ZERO. Not a single pop, click, or audio artifact throughout the entire set.
- **Routing flexibility**: With `qpwgraph`, I can hot-route MIDI clocks, virtual synthesizer channels, and multi-track recording directly into OBS without restarting a single DAW session.

Linux audio used to be a terrifying labyrinth of ALSA, JACK, and PulseAudio conflicts. PipeWire has unified the entire stack and turned low-cost hardware into pro-audio powerhouses.',
    'HARDWARE',
    198,
    0,
    3,
    29,
    'published',
    1789599600000,
    0
),
(
    'post-reddit-11',
    'c/privacy-ai',
    'c3dc28cb705e',
    'ARCHIVIST',
    'Local RAG over 5 years of personal markdown notes: why on-device semantic search changes your memory',
    'I have accumulated over 4,200 Markdown notes in Obsidian since 2021 (research papers, book highlights, architectural specs, and personal journals).

Traditional keyword search (grep / regex) breaks down when you remember a *concept* but forgot the exact phrasing. Last month, I set up a local semantic retrieval pipeline using `bge-small-en-v1.5` embeddings and local vector indexing.

Why this is transformative:
- You query: *"When did we discuss zero-copy buffers for memory-constrained devices?"*
- It retrieves discussions from 2022 that used completely different words ("ring buffer", "shared heap slice") with 92% cosine similarity.
- It runs 100% offline. Zero embeddings sent to OpenAI or cloud vector databases.

Your second brain shouldn''t be hostage to a proprietary cloud subscription. Store plain text files, index them locally, and keep your life private.',
    'AI & PRIVACY',
    275,
    0,
    4,
    42,
    'published',
    1789578000000,
    0
),
(
    'post-reddit-12',
    'c/digitalfreedom',
    'a89104fa2211',
    'MODERATOR',
    'The physical media & DRM-free preservation movement: owning what you pay for in an era of revoked licenses',
    'When Sony, Ubisoft, and streaming platforms started revoking access to digital movies and games that customers "purchased" years ago, it served as a wake-up call to millions of users.

You don''t own digital content when:
- It requires an active heartbeat to a licensing server that will shut down in 5 years.
- The publisher can silently patch out licensed music or edit dialogues retroactively.
- Banning your centralized platform account wipes out your entire library of purchases.

We are seeing a massive resurgence in DRM-free software, GOG offline installers, retro optical disc preservation, and self-hosted media vaults. Digital sovereignty isn''t just for cryptographers — it''s for anyone who wants their children to be able to enjoy the culture they paid for.',
    'PERSPECTIVE',
    320,
    0,
    3,
    55,
    'published',
    1789542000000,
    0
);

-- 3. COMMENTS TABLE (35+ Threaded Human Conversations, Back-and-Forth Replies)
INSERT OR REPLACE INTO comments (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
) VALUES

-- Thread 1: On Maya Lin's Local AI Post (post-reddit-1)
(
    'comm-1-1',
    'post-reddit-1',
    NULL,
    'fp_alex_dev',
    'CONTRIBUTOR',
    'Completely agree on the latency difference! On an M3 Max running Qwen 14B Q4_K_M, the responsiveness is night and day compared to cloud latency spikes.

My main challenge is context scaling. When loading a full repository structure and multiple 1,000-line files, unified memory gets tight quickly. Maya, what context length do you keep active by default without degrading throughput?',
    28,
    1789662650000
),
(
    'comm-1-2',
    'post-reddit-1',
    'comm-1-1',
    'fp_mayalin_ai',
    'RESEARCHER',
    'Great question Alex! I keep default context capped at 16k tokens, but the secret weapon is **4-bit KV cache quantization** (`--cache-type-k q4_0 --cache-type-v q4_0` in llama.cpp).

It slashes KV memory footprint by almost 60% with virtually zero perceptible drop in needle-in-a-haystack retrieval accuracy for code.',
    35,
    1789662800000
),
(
    'comm-1-3',
    'post-reddit-1',
    'comm-1-2',
    'fp_viktor_kernel',
    'CONTRIBUTOR',
    'Can confirm on the KV cache quantization! Also, if you are on Linux with an RTX card, running `vLLM` with PagedAttention gives you instant batching if you have multiple agent worker processes hitting the local socket concurrently.',
    19,
    1789662950000
),
(
    'comm-1-4',
    'post-reddit-1',
    NULL,
    'fp_zack_privacy',
    'CONTRIBUTOR',
    'The compliance angle cannot be overstated either. European GDPR and Swiss healthcare clients literally prohibit sending patient-adjacent data or proprietary infrastructure code to foreign cloud LLMs. Local weights are the only legal way to deploy AI in sensitive sectors.',
    42,
    1789663100000
),
(
    'comm-1-5',
    'post-reddit-1',
    'comm-1-4',
    'fp_marcus_sys',
    'MEMBER',
    'Plus, your local weights never send you an unexpected invoice for $4,200 because an intern accidentally left a recursive while-loop calling the API over the weekend haha.',
    51,
    1789663200000
),
(
    'comm-1-6',
    'post-reddit-1',
    'comm-1-5',
    'fp_mayalin_ai',
    'RESEARCHER',
    'Haha spot on Marcus! The peace of mind of knowing your max monthly AI bill is literally just the electricity your GPU drew is priceless.',
    24,
    1789663300000
),

-- Thread 2: On Alex Rivera's Vibe Coding Post (post-reddit-2)
(
    'comm-2-1',
    'post-reddit-2',
    NULL,
    'fp_marcus_sys',
    'MEMBER',
    'Amen Alex. I reviewed a PR last week from a developer who used an autonomous agent to "refactor our billing pipeline". The code looked gorgeous at first glance, but it silently omitted database transaction rollbacks on payment gateway timeouts. If that hit production, we would have had phantom orders everywhere.',
    37,
    1789661000000
),
(
    'comm-2-2',
    'post-reddit-2',
    'comm-2-1',
    'fp_alex_dev',
    'CONTRIBUTOR',
    'Exactly the nightmare scenario! LLMs are pattern matchers; they optimize for plausible-looking code, not transactional invariants. That is why having automated invariant checks and property-based testing (like fast-check or proptest) in your CI harness is non-negotiable before approving agent-written PRs.',
    29,
    1789661150000
),
(
    'comm-2-3',
    'post-reddit-2',
    NULL,
    'fp_nadia_foss',
    'MODERATOR',
    'In our open source projects, we instituted a simple policy: any code generated by an AI assistant must be accompanied by new regression unit tests written or verified by the human contributor. That single rule cut AI-generated spam PRs by 80% overnight.',
    45,
    1789661300000
),
(
    'comm-2-4',
    'post-reddit-2',
    'comm-2-3',
    'fp_clara_ux',
    'MEMBER',
    'It applies to UI design too! Agents generate generic, copy-paste Tailwind components that completely ignore accessibility attributes (missing `aria-pressed`, broken keyboard focus rings, unlabelled icon buttons). Human craftsmanship is what turns generic code into something accessible and enjoyable.',
    26,
    1789661450000
),
(
    'comm-2-5',
    'post-reddit-2',
    'comm-2-4',
    'fp_alex_dev',
    'CONTRIBUTOR',
    'Preach Clara! The best workflow is using the agent as an eager junior apprentice who writes the boilerplate, while the human acts as the chief architect verifying edge cases and polish.',
    21,
    1789661600000
),

-- Thread 3: On Nadia Lindholm's Tauri v2 Post (post-reddit-3)
(
    'comm-3-1',
    'post-reddit-3',
    NULL,
    'fp_marcus_sys',
    'MEMBER',
    'How was the auto-updater migration? In Electron, our team constantly dealt with Windows permission errors when Squirrel tried updating in Program Files without admin privileges.',
    22,
    1789657400000
),
(
    'comm-3-2',
    'post-reddit-3',
    'comm-3-1',
    'fp_nadia_foss',
    'MODERATOR',
    'The Tauri v2 updater plugin (`@tauri-apps/plugin-updater`) is substantially cleaner! You sign your release binaries locally with an Ed25519 private key, put the signed JSON manifest on GitHub releases or Cloudflare R2, and Tauri verifies the cryptographic signature before executing. Zero permissions headaches so far.',
    38,
    1789657600000
),
(
    'comm-3-3',
    'post-reddit-3',
    NULL,
    'fp_clara_ux',
    'MEMBER',
    'And from a visual design perspective, using the operating system native webview means window borders, scrollbars, and system fonts blend harmoniously into macOS and Linux, instead of looking like an alien Chrome browser window trapped inside a desktop frame.',
    19,
    1789657800000
),
(
    'comm-3-4',
    'post-reddit-3',
    NULL,
    'fp_viktor_kernel',
    'CONTRIBUTOR',
    'One tip for Linux users packaging Tauri apps: make sure to export `WEBKIT_DISABLE_COMPOSITING_MODE=1` in your wrapper script if you run into any flickering on older proprietary NVIDIA drivers with Wayland. Other than that, memory usage is practically negligible.',
    31,
    1789658000000
),
(
    'comm-3-5',
    'post-reddit-3',
    'comm-3-4',
    'fp_nadia_foss',
    'MODERATOR',
    'Bookmarking this tip Viktor! We added it to our troubleshooting docs. Huge thanks for the kernel-level insight.',
    15,
    1789658200000
),

-- Thread 4: On Chloe Chen's Godot 4 Post (post-reddit-4)
(
    'comm-4-1',
    'post-reddit-4',
    NULL,
    'a89104fa2211',
    'MODERATOR',
    'The 1.2s startup time is the real killer feature. When I used to develop in Unreal or Unity, opening a project felt like waiting for an entire operating system to boot. With Godot, iteration loop is so fast that you actually enjoy prototyping game mechanics again.',
    27,
    1789653800000
),
(
    'comm-4-2',
    'post-reddit-4',
    'comm-4-1',
    'fp_chloe_gamedev',
    'MEMBER',
    'Yes David! When iteration is instantaneous, you test crazy ideas you would have otherwise discarded. We ended up building our entire combat balance in a single weekend because changing code and hitting F5 takes literally half a second.',
    23,
    1789654000000
),
(
    'comm-4-3',
    'post-reddit-4',
    NULL,
    'fp_stefan_audio',
    'MEMBER',
    'How are you finding the audio bus in Godot? I was really impressed that it supports custom audio effects and low-latency interactive music switching out of the box without needing expensive proprietary middleware like FMOD.',
    16,
    1789654200000
),
(
    'comm-4-4',
    'post-reddit-4',
    'comm-4-3',
    'fp_chloe_gamedev',
    'MEMBER',
    'The audio bus in 4.3 is great! We do dynamic low-pass filtering whenever the player dives underwater, and ducking dialogue over background ambience is just a matter of connecting an audio effect bus in the inspector.',
    18,
    1789654400000
),

-- Thread 5: On Julian Thorne's Solarpunk Homelab (post-reddit-5)
(
    'comm-5-1',
    'post-reddit-5',
    NULL,
    'fp_alex_dev',
    'CONTRIBUTOR',
    'My electricity bill dropped by $14 and my partner no longer asks why the spare room sounds like a Boeing 777 preparing for takeoff! Big respect for the 18W continuous figure Julian.',
    34,
    1789650200000
),
(
    'comm-5-2',
    'post-reddit-5',
    'comm-5-1',
    'fp_julian_solar',
    'MEMBER',
    'Haha thanks Alex! Fan noise was my primary motivation to switch to passive aluminum heatsink cases for the RK3588 boards. It is totally silent in the shed now — just birds chirping and solar watts flowing in.',
    22,
    1789650400000
),
(
    'comm-5-3',
    'post-reddit-5',
    NULL,
    'fp_marcus_sys',
    'MEMBER',
    'How do you handle flash memory wear on the SD cards, or are you booting entirely from NVMe SSDs over PCIe?',
    18,
    1789650600000
),
(
    'comm-5-4',
    'post-reddit-5',
    'comm-5-3',
    'fp_julian_solar',
    'MEMBER',
    '100% NVMe SSDs via the M.2 slots on the Orange Pi boards. MicroSD cards will die in 6 months under continuous SQLite writes. Also mounted `/tmp` and log directories to `tmpfs` in RAM to minimize drive write cycles.',
    31,
    1789650800000
),
(
    'comm-5-5',
    'post-reddit-5',
    'comm-5-4',
    'fp_marcus_sys',
    'MEMBER',
    '`tmpfs` for `/tmp` is the way. Clean engineering right there.',
    14,
    1789651000000
),

-- Thread 6: On Zack Kovacs's Digital Freedom & Encryption Post (post-reddit-6)
(
    'comm-6-1',
    'post-reddit-6',
    NULL,
    'c3dc28cb705e',
    'ARCHIVIST',
    'Well said Zack. Bruce Schneier put it best years ago: you cannot build a backdoor that only lets the "good guys" in. Once a cryptographic bypass exists, it is only a matter of time before an authoritarian regime or criminal syndicate obtains the keys. Mathematics must remain absolute.',
    48,
    1789643000000
),
(
    'comm-6-2',
    'post-reddit-6',
    'comm-6-1',
    'fp_zack_privacy',
    'CONTRIBUTOR',
    'Exactly Elena. And that is why post-quantum cryptography (ML-KEM / ML-DSA) combined with double-ratchet protocols and zero centralized metadata servers is the real future of sovereign human connection.',
    36,
    1789643200000
),
(
    'comm-6-3',
    'post-reddit-6',
    NULL,
    'genesis-core',
    'GUARDIAN',
    'This is the founding principle of UREfy. When user identities are grounded in sovereign client-side keypairs and data is encrypted in the browser before ever touching a relay, surveillance capitalism becomes technologically impossible.',
    56,
    1789643400000
),
(
    'comm-6-4',
    'post-reddit-6',
    'comm-6-3',
    'a89104fa2211',
    'MODERATOR',
    'Proud to help moderate and steward this community. Freedom isn''t free, it is built with open source code and sovereign math.',
    28,
    1789643600000
),

-- Thread 7: On Marcus Vance's SQLite Post (post-reddit-7)
(
    'comm-7-1',
    'post-reddit-7',
    NULL,
    'fp_alex_dev',
    'CONTRIBUTOR',
    'Someone finally said it out loud! The number of times I have seen microservices fail because the Redis cache got out of sync with Postgres during network partitions is maddening. SQLite in WAL mode with litestream or cloud D1 replication handles 99% of real-world workloads effortlessly.',
    33,
    1789635800000
),
(
    'comm-7-2',
    'post-reddit-7',
    'comm-7-1',
    'fp_marcus_sys',
    'MEMBER',
    'Preach Alex! People forget that SQLite powers billions of iPhones, Androids, browsers, and embedded aircraft systems without blinking. It is the most battle-tested software artifact on the planet.',
    40,
    1789636000000
),
(
    'comm-7-3',
    'post-reddit-7',
    NULL,
    'fp_viktor_kernel',
    'CONTRIBUTOR',
    'Plus with Linux kernel page cache (`PRAGMA cache_size=-64000`), frequently read SQLite pages never even touch the physical NVMe controller — they are read directly from kernel memory with zero IPC overhead.',
    25,
    1789636200000
),

-- Thread 8: On Clara Dufresne's UI Design Post (post-reddit-8)
(
    'comm-8-1',
    'post-reddit-8',
    NULL,
    'fp_nadia_foss',
    'MODERATOR',
    'The return of 1px subtle borders has been the single best visual upgrade in modern web apps. It gives clear boundaries to cards and navigation rails without needing aggressive drop shadows or clunky background colors.',
    28,
    1789628600000
),
(
    'comm-8-2',
    'post-reddit-8',
    'comm-8-1',
    'fp_clara_ux',
    'MEMBER',
    'Yes Nadia! Especially on dark theme interfaces, a `border border-white/5 hover:border-white/15` transition provides just enough physical tactile feedback to let the eye breathe while keeping the aesthetic calm and premium.',
    22,
    1789628800000
),
(
    'comm-8-3',
    'post-reddit-8',
    NULL,
    'fp_chloe_gamedev',
    'MEMBER',
    'It mirrors what happened in game UI as well. Early 2010s had flat geometric HUDs that felt soulless. Now players love tactile diegetic interfaces with micro-lighting and tactile sounds when clicking buttons.',
    19,
    1789629000000
),

-- Thread 9: On Viktor Ionescu's Wayland Post (post-reddit-9)
(
    'comm-9-1',
    'post-reddit-9',
    NULL,
    'fp_stefan_audio',
    'MEMBER',
    'Can attest to Wayland stability! Running Bitwig across a 144Hz primary gaming monitor and a 60Hz secondary vertical monitor with zero tearing or desync. In X11 days, that would have forced both monitors to lock to 60Hz.',
    26,
    1789614200000
),
(
    'comm-9-2',
    'post-reddit-9',
    'comm-9-1',
    'fp_viktor_kernel',
    'CONTRIBUTOR',
    'Exactly Stefan. Independent display clocks per-CRTC was fundamentally architecturally impossible in Xorg without hacking the display server. Wayland compositor design solves it at the protocol level.',
    21,
    1789614400000
),

-- Thread 10: On Stefan Radu's PipeWire Post (post-reddit-10)
(
    'comm-10-1',
    'post-reddit-10',
    NULL,
    'fp_chloe_gamedev',
    'MEMBER',
    'Wim Taymans (creator of PipeWire) genuinely deserves a lifetime achievement award. The fact that Linux went from having the most frustrating audio subsystem to having the most modular, low-latency graph in computing is unbelievable.',
    32,
    1789599800000
),
(
    'comm-10-2',
    'post-reddit-10',
    'comm-10-1',
    'fp_stefan_audio',
    'MEMBER',
    'Amen Chloe! And being able to see every hardware port, MIDI stream, and audio node visually mapped in real-time makes hardware jam sessions pure fun again.',
    17,
    1789600000000
),

-- Thread 11: On Elena Rostova's Local RAG Post (post-reddit-11)
(
    'comm-11-1',
    'post-reddit-11',
    NULL,
    'fp_mayalin_ai',
    'RESEARCHER',
    'Local embeddings are so underrated Elena! People often jump to giant 70B parameter models when a tiny 30MB quantized embedding model running on CPU can solve 85% of personal search and memory indexing in less than 4ms per query.',
    38,
    1789578200000
),
(
    'comm-11-2',
    'post-reddit-11',
    'comm-11-1',
    'c3dc28cb705e',
    'ARCHIVIST',
    'Spot on Maya! Keeping the embeddings local also ensures my research brainstorms and unreleased drafts stay completely private.',
    24,
    1789578400000
),

-- Thread 12: On David Chen's DRM-Free & Preservation Post (post-reddit-12)
(
    'comm-12-1',
    'post-reddit-12',
    NULL,
    'fp_zack_privacy',
    'CONTRIBUTOR',
    'The "Stop Killing Games" citizen initiative showed that over a million people are fed up with games being destroyed remotely when publishers turn off servers. Archiving offline installers is cultural preservation.',
    44,
    1789542200000
),
(
    'comm-12-2',
    'post-reddit-12',
    'comm-12-1',
    'a89104fa2211',
    'MODERATOR',
    'Agreed Zack. Games and literature are cultural artifacts. We wouldn''t accept a publisher coming into our home library to burn a book we bought 10 years ago; we shouldn''t accept it in the digital realm either.',
    36,
    1789542400000
);

-- 4. COMMUNITY MEMBERSHIPS (Sign up personas into their relevant communities)
INSERT OR IGNORE INTO community_members (community_id, user_id, role, joined_at) VALUES
('c-privacy-ai', 'fp_mayalin_ai', 'moderator', 1789000000000),
('c-privacy-ai', 'c3dc28cb705e', 'member', 1789000000000),
('c-privacy-ai', 'fp_zack_privacy', 'member', 1789000000000),
('c-privacy-ai', 'fp_alex_dev', 'member', 1789000000000),

('c-technology', 'fp_alex_dev', 'member', 1789000000000),
('c-technology', 'fp_marcus_sys', 'member', 1789000000000),
('c-technology', 'fp_stefan_audio', 'member', 1789000000000),
('c-technology', 'fp_viktor_kernel', 'member', 1789000000000),

('c-opensource', 'fp_nadia_foss', 'moderator', 1789000000000),
('c-opensource', 'fp_viktor_kernel', 'member', 1789000000000),
('c-opensource', 'c3dc28cb705e', 'member', 1789000000000),
('c-opensource', 'fp_alex_dev', 'member', 1789000000000),

('c-gaming', 'fp_chloe_gamedev', 'moderator', 1789000000000),
('c-gaming', 'a89104fa2211', 'member', 1789000000000),
('c-gaming', 'fp_stefan_audio', 'member', 1789000000000),

('c-solarpunk', 'fp_julian_solar', 'moderator', 1789000000000),
('c-solarpunk', 'fp_alex_dev', 'member', 1789000000000),
('c-solarpunk', 'fp_marcus_sys', 'member', 1789000000000),

('c-creative', 'fp_clara_ux', 'moderator', 1789000000000),
('c-creative', 'fp_chloe_gamedev', 'member', 1789000000000),
('c-creative', 'fp_stefan_audio', 'member', 1789000000000),

('c-digitalfreedom', 'fp_zack_privacy', 'moderator', 1789000000000),
('c-digitalfreedom', 'a89104fa2211', 'member', 1789000000000),
('c-digitalfreedom', 'c3dc28cb705e', 'member', 1789000000000),
('c-digitalfreedom', 'genesis-core', 'admin', 1789000000000);

-- 5. SOCIAL FOLLOWS (Organic Social Graph of Mutual & Follow Connections)
INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES
('fp_alex_dev', 'fp_mayalin_ai', 1789100000000),
('fp_mayalin_ai', 'fp_alex_dev', 1789101000000),
('fp_alex_dev', 'fp_marcus_sys', 1789102000000),
('fp_marcus_sys', 'fp_alex_dev', 1789103000000),
('fp_nadia_foss', 'fp_viktor_kernel', 1789104000000),
('fp_viktor_kernel', 'fp_nadia_foss', 1789105000000),
('fp_clara_ux', 'fp_chloe_gamedev', 1789106000000),
('fp_chloe_gamedev', 'fp_clara_ux', 1789107000000),
('fp_julian_solar', 'fp_alex_dev', 1789108000000),
('fp_zack_privacy', 'c3dc28cb705e', 1789109000000),
('c3dc28cb705e', 'fp_zack_privacy', 1789110000000),
('a89104fa2211', 'fp_zack_privacy', 1789111000000),
('a89104fa2211', 'fp_chloe_gamedev', 1789112000000),
('fp_stefan_audio', 'fp_viktor_kernel', 1789113000000),
('genesis-core', 'fp_mayalin_ai', 1789114000000),
('genesis-core', 'fp_zack_privacy', 1789115000000),
('genesis-core', 'fp_nadia_foss', 1789116000000);
