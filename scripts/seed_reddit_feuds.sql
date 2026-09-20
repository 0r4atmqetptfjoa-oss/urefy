INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'post-feud-nvidia-leak',
            'c/technology',
            '6d88f12a04cb',
            'SECURITY_AUDITOR',
            'LEAK: Nvidia Driver 572.10 allegedly scans local directories for unauthorized AI model weights to report unlicensed commercial inference',
            'A whistleblower from an enterprise AI infrastructure partner has leaked what appears to be internal documentation regarding **Nvidia Driver version 572.10 (Linux x86_64)**.

According to the leaked symbols and strings, a new background daemon dubbed `nvtelemetry_ai.so` hooks into the CUDA runtime during model initialization. If the active context allocates more than 8GB of VRAM and performs tensor matrix multiplications matching common transformer architectures (Llama, DeepSeek, Qwen), the driver allegedly hashes the first 256MB of weight layers and queries an internal telemetry endpoint (`telemetry.nvidia.com:443`).

The apparent goal? Detect whether enterprise users are running open-weights models in commercial clusters without an active Nvidia AI Enterprise licensing tier.

### What is allegedly happening:
1. **CUDA hook intercept**: Monitors `cudaMalloc` and pattern-matches transformer weight matrices.
2. **Weight Fingerprinting**: Generates a SHA-256 digest of layer headers.
3. **Telemetry Beacon**: Pings Nvidia endpoints even if `GEFORCE_EXPERIENCE=0` and telemetry flags are disabled in `/etc/nvidia/gridd.conf`.

If verified, this represents an unprecedented overreach into user compute workloads. Is this the end of running local AI on consumer GeForce hardware?',
            '🚨 LEAK / RUMOR',
            612,
            0,
            6,
            184,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789715086719,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-nvidia-leak', 'nvidia', 1789715086719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-nvidia-leak', 'fakenews', 1789715086719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-nvidia-leak', 'leak', 1789715086719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-nvidia-leak', 'privacy', 1789715086719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-nvidia-leak', 'cuda', 1789715086719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-nvidia-leak', 'localllm', 1789715086719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-nvidia-leak', 'opensource', 1789715086719);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-nv-1',
                'post-feud-nvidia-leak',
                NULL,
                '7f8a910c2b44',
                'ARCHIVIST',
                'Average proprietary binary blob experience. Why is anyone in 2026 still giving Jensen Huang money? I migrated my entire inference rig to AMD RX 7900 XTX running ROCm on Arch Linux. Open-source kernel drivers, zero telemetry, zero licensing checks. You get what you tolerate.',
                142,
                1789715686719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-1-7ac901-0',
                    'comment',
                    'c-nv-1',
                    '7ac901afcd67',
                    'reaction',
                    '👍',
                    1789715721719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-1-88f019-1',
                    'comment',
                    'c-nv-1',
                    '88f019ab4c21',
                    'like',
                    '❤️',
                    1789715756719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-1-a0914e-2',
                    'comment',
                    'c-nv-1',
                    'a0914e21fc88',
                    'reaction',
                    '🧠',
                    1789715791719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-1-91df90-3',
                    'comment',
                    'c-nv-1',
                    '91df9012cb78',
                    'reaction',
                    '🚀',
                    1789715826719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-1-83d201-4',
                    'comment',
                    'c-nv-1',
                    '83d2019fab66',
                    'reaction',
                    '🧠',
                    1789715861719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-1-29c40e-5',
                    'comment',
                    'c-nv-1',
                    '29c40e11a8b2',
                    'reaction',
                    '🛡️',
                    1789715896719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-1-79c901-6',
                    'comment',
                    'c-nv-1',
                    '79c901affa01',
                    'reaction',
                    '🔥',
                    1789715931719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-nv-2',
                'post-feud-nvidia-leak',
                'c-nv-1',
                '3c91a4e082aa',
                'CORE_CONTRIBUTOR',
                'This is complete and utter fake news. I ran Ghidra and IDA Pro on libnvidia-ml.so.572.10 from the beta branch for 5 hours today. The symbol ''nvtelemetry_ai'' literally DOES NOT EXIST. OP is reposting an unverified pastebin from 4chan /g/ to farm karma. Can mods delete this unverified FUD already?',
                89,
                1789716286719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-2-55a019-0',
                    'comment',
                    'c-nv-2',
                    '55a019ef44cc',
                    'like',
                    '🔥',
                    1789716321719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-2-91c24f-1',
                    'comment',
                    'c-nv-2',
                    '91c24f00ba11',
                    'reaction',
                    '🔥',
                    1789716356719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-2-29c40e-2',
                    'comment',
                    'c-nv-2',
                    '29c40e11a8b2',
                    'like',
                    '🧠',
                    1789716391719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-2-88f019-3',
                    'comment',
                    'c-nv-2',
                    '88f019ab4c21',
                    'reaction',
                    '💡',
                    1789716426719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-2-91df90-4',
                    'comment',
                    'c-nv-2',
                    '91df9012cb78',
                    'reaction',
                    '🛡️',
                    1789716461719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-2-77e102-5',
                    'comment',
                    'c-nv-2',
                    '77e1029ba4c0',
                    'reaction',
                    '🛡️',
                    1789716496719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-2-3db014-6',
                    'comment',
                    'c-nv-2',
                    '3db014ea9e12',
                    'like',
                    '🧠',
                    1789716531719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-nv-3',
                'post-feud-nvidia-leak',
                'c-nv-2',
                '4e198a00b215',
                'SECURITY_AUDITOR',
                '@void_pointer Did you even inspect runtime dynamic linking with dlopen? It doesn''t ship as an exported static symbol, you genius. It gets downloaded in memory via an encrypted payload if the driver connects to GeForce Experience servers. Stop defending a trillion-dollar monopoly before doing actual packet analysis.',
                67,
                1789716886719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-3-6f1084-0',
                    'comment',
                    'c-nv-3',
                    '6f1084ea2b99',
                    'like',
                    '🛡️',
                    1789716921719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-3-aa0194-1',
                    'comment',
                    'c-nv-3',
                    'aa0194f2cd01',
                    'reaction',
                    '❤️',
                    1789716956719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-3-b1409e-2',
                    'comment',
                    'c-nv-3',
                    'b1409ea28c99',
                    'reaction',
                    '🧠',
                    1789716991719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-3-61c801-3',
                    'comment',
                    'c-nv-3',
                    '61c8012afa34',
                    'reaction',
                    '💡',
                    1789717026719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-3-99df01-4',
                    'comment',
                    'c-nv-3',
                    '99df012aa4c3',
                    'reaction',
                    '❤️',
                    1789717061719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-nv-4',
                'post-feud-nvidia-leak',
                'c-nv-3',
                '3c91a4e082aa',
                'CORE_CONTRIBUTOR',
                '@DockerNinja Oh so now it''s a dynamic encrypted payload that mysteriously leaves no trace on disk? The goalposts are moving at supersonic speed. I have a dedicated hardware TAP running tcpdump on port 443 with TLS interception. Zero outbound connections during model loading. Don''t call me a shill because your tin-foil hat fell off.',
                115,
                1789717486719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-4-91c24f-0',
                    'comment',
                    'c-nv-4',
                    '91c24f00ba11',
                    'reaction',
                    '👍',
                    1789717521719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-4-a50091-1',
                    'comment',
                    'c-nv-4',
                    'a500912fa8cc',
                    'reaction',
                    '🚀',
                    1789717556719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-4-61c801-2',
                    'comment',
                    'c-nv-4',
                    '61c8012afa34',
                    'like',
                    '❤️',
                    1789717591719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-4-1cf089-3',
                    'comment',
                    'c-nv-4',
                    '1cf08912fa12',
                    'reaction',
                    '💡',
                    1789717626719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-4-5fc401-4',
                    'comment',
                    'c-nv-4',
                    '5fc4018fab23',
                    'reaction',
                    '🧠',
                    1789717661719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-4-91df90-5',
                    'comment',
                    'c-nv-4',
                    '91df9012cb78',
                    'like',
                    '👍',
                    1789717696719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-4-3db014-6',
                    'comment',
                    'c-nv-4',
                    '3db014ea9e12',
                    'reaction',
                    '💡',
                    1789717731719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-4-94df02-7',
                    'comment',
                    'c-nv-4',
                    '94df0218ab44',
                    'reaction',
                    '💡',
                    1789717766719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-nv-5',
                'post-feud-nvidia-leak',
                NULL,
                '83d2019fab66',
                'AI_RESEARCHER',
                'Real or fake, I just blocked *.nvidia.com in my network Pi-hole. Remember when people laughed at the idea that HP printers would brick cartridges over Wi-Fi? Or when Intel Management Engine was called a conspiracy before MINIX was proven on ring -3? If a corporation CAN extract rent from you, they WILL.',
                98,
                1789718386719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-5-55a019-1',
                    'comment',
                    'c-nv-5',
                    '55a019ef44cc',
                    'like',
                    '💡',
                    1789718456719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-5-b1409e-2',
                    'comment',
                    'c-nv-5',
                    'b1409ea28c99',
                    'like',
                    '❤️',
                    1789718491719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-5-79c901-3',
                    'comment',
                    'c-nv-5',
                    '79c901affa01',
                    'reaction',
                    '🧠',
                    1789718526719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-5-5b2041-4',
                    'comment',
                    'c-nv-5',
                    '5b2041e8d902',
                    'reaction',
                    '💡',
                    1789718561719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-5-88f019-5',
                    'comment',
                    'c-nv-5',
                    '88f019ab4c21',
                    'like',
                    '🛡️',
                    1789718596719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-5-2d89b1-6',
                    'comment',
                    'c-nv-5',
                    '2d89b14c99a0',
                    'like',
                    '🚀',
                    1789718631719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-nv-6',
                'post-feud-nvidia-leak',
                'c-nv-5',
                '9f4a120c8b31',
                'CORE_CONTRIBUTOR',
                'Blocking domain names doesn''t prevent hardcoded IP connections if they use DoH or raw TCP sockets. The real solution is kernel-level network namespaces (`unshare -n`) for inference containers. If the CUDA process has no virtual net device, it cannot phone home period.',
                76,
                1789719286719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-6-55a019-0',
                    'comment',
                    'c-nv-6',
                    '55a019ef44cc',
                    'like',
                    '🛡️',
                    1789719321719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-6-b1409e-1',
                    'comment',
                    'c-nv-6',
                    'b1409ea28c99',
                    'like',
                    '💡',
                    1789719356719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-6-a0914e-2',
                    'comment',
                    'c-nv-6',
                    'a0914e21fc88',
                    'reaction',
                    '🔥',
                    1789719391719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-6-88b401-3',
                    'comment',
                    'c-nv-6',
                    '88b4012ce9fa',
                    'reaction',
                    '❤️',
                    1789719426719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-nv-6-a50091-4',
                    'comment',
                    'c-nv-6',
                    'a500912fa8cc',
                    'like',
                    '🛡️',
                    1789719461719
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-50c401-0',
                'post',
                'post-feud-nvidia-leak',
                '50c4018fef89',
                'like',
                '🔥',
                1789715131719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-7ac901-1',
                'post',
                'post-feud-nvidia-leak',
                '7ac901afcd67',
                'like',
                '🧠',
                1789715176719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-61c801-2',
                'post',
                'post-feud-nvidia-leak',
                '61c8012afa34',
                'like',
                '🚀',
                1789715221719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-79c901-3',
                'post',
                'post-feud-nvidia-leak',
                '79c901affa01',
                'bookmark',
                '🛡️',
                1789715266719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-1cf089-4',
                'post',
                'post-feud-nvidia-leak',
                '1cf08912fa12',
                'reaction',
                '🔥',
                1789715311719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-99df01-5',
                'post',
                'post-feud-nvidia-leak',
                '99df012aa4c3',
                'like',
                '💡',
                1789715356719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-29c40e-6',
                'post',
                'post-feud-nvidia-leak',
                '29c40e11a8b2',
                'like',
                '🚀',
                1789715401719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-62df09-7',
                'post',
                'post-feud-nvidia-leak',
                '62df0912cb88',
                'reaction',
                '👍',
                1789715446719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-3db014-8',
                'post',
                'post-feud-nvidia-leak',
                '3db014ea9e12',
                'bookmark',
                '🧠',
                1789715491719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-70a40f-9',
                'post',
                'post-feud-nvidia-leak',
                '70a40f91b2df',
                'bookmark',
                '🔥',
                1789715536719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-83d201-10',
                'post',
                'post-feud-nvidia-leak',
                '83d2019fab66',
                'reaction',
                '💡',
                1789715581719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-24cb90-11',
                'post',
                'post-feud-nvidia-leak',
                '24cb9011af33',
                'bookmark',
                '🧠',
                1789715626719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-88f019-12',
                'post',
                'post-feud-nvidia-leak',
                '88f019ab4c21',
                'like',
                '💡',
                1789715671719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-12df90-13',
                'post',
                'post-feud-nvidia-leak',
                '12df9011ac89',
                'bookmark',
                '❤️',
                1789715716719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-a7df90-14',
                'post',
                'post-feud-nvidia-leak',
                'a7df9012bc23',
                'bookmark',
                '💡',
                1789715761719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-b1409e-15',
                'post',
                'post-feud-nvidia-leak',
                'b1409ea28c99',
                'like',
                '💡',
                1789715806719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-87a01f-16',
                'post',
                'post-feud-nvidia-leak',
                '87a01fa29cb5',
                'reaction',
                '❤️',
                1789715851719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-8d104f-17',
                'post',
                'post-feud-nvidia-leak',
                '8d104fb2a901',
                'bookmark',
                '🧠',
                1789715896719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-2d89b1-18',
                'post',
                'post-feud-nvidia-leak',
                '2d89b14c99a0',
                'reaction',
                '🚀',
                1789715941719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-1bf089-19',
                'post',
                'post-feud-nvidia-leak',
                '1bf08912ea56',
                'bookmark',
                '🧠',
                1789715986719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-91df90-20',
                'post',
                'post-feud-nvidia-leak',
                '91df9012cb78',
                'bookmark',
                '🚀',
                1789716031719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-a50091-21',
                'post',
                'post-feud-nvidia-leak',
                'a500912fa8cc',
                'reaction',
                '⚡',
                1789716076719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-3e901a-22',
                'post',
                'post-feud-nvidia-leak',
                '3e901a88fb22',
                'bookmark',
                '👍',
                1789716121719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-91c24f-23',
                'post',
                'post-feud-nvidia-leak',
                '91c24f00ba11',
                'bookmark',
                '🔥',
                1789716166719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-a0914e-24',
                'post',
                'post-feud-nvidia-leak',
                'a0914e21fc88',
                'like',
                '💡',
                1789716211719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-77e102-25',
                'post',
                'post-feud-nvidia-leak',
                '77e1029ba4c0',
                'reaction',
                '🛡️',
                1789716256719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-18df01-26',
                'post',
                'post-feud-nvidia-leak',
                '18df01a2eb34',
                'bookmark',
                '⚡',
                1789716301719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-aa0194-27',
                'post',
                'post-feud-nvidia-leak',
                'aa0194f2cd01',
                'reaction',
                '🔥',
                1789716346719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-94df02-28',
                'post',
                'post-feud-nvidia-leak',
                '94df0218ab44',
                'reaction',
                '👍',
                1789716391719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-22c88f-29',
                'post',
                'post-feud-nvidia-leak',
                '22c88f01a9df',
                'reaction',
                '⚡',
                1789716436719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-7f8a91-31',
                'post',
                'post-feud-nvidia-leak',
                '7f8a910c2b44',
                'bookmark',
                '💡',
                1789716526719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-nvidia-leak-55a019-32',
                'post',
                'post-feud-nvidia-leak',
                '55a019ef44cc',
                'bookmark',
                '💡',
                1789716571719
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'post-feud-windows-local-account',
            'c/digitalfreedom',
            '9f4a120c8b31',
            'CORE_CONTRIBUTOR',
            'Windows 12 build 28014 reportedly mandates government ID upload or biometric iris scan to enable offline local accounts',
            'The latest leak from the Windows Insider Canary channel (Build 28014.1000) has ignited a firestorm across the tech community.

According to leaked Group Policy documentation and registry hives (`HKLM\SYSTEM\CurrentControlSet\Control\Sovereignty\LocalAccountPolicy`), Microsoft is deprecating the `OOBE\BYPASSNRO` command and standard local account creation. In its place, the installer reportedly presents two options:

1. **Sign in with Microsoft Entra / Microsoft Cloud ID** (Default).
2. **Sovereign Local Account (Requires Hardware Real-ID Attestation)**: The user must submit a government-issued photo ID via Windows Hello camera or perform an iris scan verified against Microsoft''s cloud identity verification service under the pretext of ''complying with upcoming international digital safety directives''.

The policy notes claim this is to ''prevent bot farm deployments and ensure child safety in AI-generated content workflows''.

If this goes live in the consumer release, it will be the single most aggressive anti-user lockdown in the history of desktop operating systems. Is this finally the death knell for Windows?',
            '🔥 CONTROVERSY',
            845,
            0,
            6,
            290,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789719586719,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-windows-local-account', 'windows12', 1789719586719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-windows-local-account', 'fakenews', 1789719586719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-windows-local-account', 'privacy', 1789719586719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-windows-local-account', 'microsoft', 1789719586719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-windows-local-account', 'rumor', 1789719586719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-windows-local-account', 'linux', 1789719586719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-windows-local-account', 'surveillance', 1789719586719);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-win-1',
                'post-feud-windows-local-account',
                NULL,
                '8a31b402ef19',
                'VERIFIED_NODE',
                'Please tell me this is satire. I just dropped $2,800 on a high-end gaming PC with Windows 11. If Microsoft actually pushes this garbage in Windows 12, I am wiping my NVMe drive and installing Bazzite Linux immediately. I''d rather lose 10% FPS in Fortnite than upload my passport to Microsoft.',
                178,
                1789720486719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-1-99df01-0',
                    'comment',
                    'c-win-1',
                    '99df012aa4c3',
                    'reaction',
                    '🚀',
                    1789720521719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-1-29c40e-1',
                    'comment',
                    'c-win-1',
                    '29c40e11a8b2',
                    'reaction',
                    '👍',
                    1789720556719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-1-b1409e-2',
                    'comment',
                    'c-win-1',
                    'b1409ea28c99',
                    'reaction',
                    '🧠',
                    1789720591719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-1-2d89b1-3',
                    'comment',
                    'c-win-1',
                    '2d89b14c99a0',
                    'reaction',
                    '🛡️',
                    1789720626719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-1-7ac901-4',
                    'comment',
                    'c-win-1',
                    '7ac901afcd67',
                    'like',
                    '🧠',
                    1789720661719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-1-18df01-5',
                    'comment',
                    'c-win-1',
                    '18df01a2eb34',
                    'like',
                    '🚀',
                    1789720696719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-1-8d104f-6',
                    'comment',
                    'c-win-1',
                    '8d104fb2a901',
                    'reaction',
                    '💡',
                    1789720731719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-1-44df90-7',
                    'comment',
                    'c-win-1',
                    '44df9012a8bc',
                    'like',
                    '🛡️',
                    1789720766719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-win-2',
                'post-feud-windows-local-account',
                'c-win-1',
                '7f8a910c2b44',
                'ARCHIVIST',
                '@DanGaming You guys never learn! We told you in 2021 when TPM 2.0 became mandatory. You said ''who cares, games run fine''. We told you in 2024 when Recall started screenshotting your screen every 3 seconds. You said ''I can just toggle it off''. Now they want your national ID. The boiling frog analogy has never been more accurate.',
                210,
                1789721086719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-2-62df09-0',
                    'comment',
                    'c-win-2',
                    '62df0912cb88',
                    'reaction',
                    '🚀',
                    1789721121719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-2-70a40f-1',
                    'comment',
                    'c-win-2',
                    '70a40f91b2df',
                    'reaction',
                    '🛡️',
                    1789721156719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-2-1df089-2',
                    'comment',
                    'c-win-2',
                    '1df08912de78',
                    'reaction',
                    '🛡️',
                    1789721191719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-2-91c24f-3',
                    'comment',
                    'c-win-2',
                    '91c24f00ba11',
                    'reaction',
                    '💡',
                    1789721226719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-2-87a01f-4',
                    'comment',
                    'c-win-2',
                    '87a01fa29cb5',
                    'reaction',
                    '👍',
                    1789721261719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-2-44df90-5',
                    'comment',
                    'c-win-2',
                    '44df9012a8bc',
                    'reaction',
                    '🔥',
                    1789721296719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-win-3',
                'post-feud-windows-local-account',
                'c-win-1',
                '62df09a14c33',
                'VERIFIED_NODE',
                'Can everyone stop panicking over clickbait? The ''leak'' originated from a parody account on X that reposted a satirical mock-up. The actual Canary 28014 changelog mentions hardware-backed credentials for high-security DoD enterprise workstations, NOT regular home users. Stop falling for outrage farming.',
                64,
                1789721686719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-3-4e198a-0',
                    'comment',
                    'c-win-3',
                    '4e198a00b215',
                    'like',
                    '🛡️',
                    1789721721719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-3-88f019-1',
                    'comment',
                    'c-win-3',
                    '88f019ab4c21',
                    'like',
                    '🔥',
                    1789721756719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-3-a7df90-2',
                    'comment',
                    'c-win-3',
                    'a7df9012bc23',
                    'reaction',
                    '🧠',
                    1789721791719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-3-99df01-3',
                    'comment',
                    'c-win-3',
                    '99df012aa4c3',
                    'reaction',
                    '💡',
                    1789721826719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-3-1df089-4',
                    'comment',
                    'c-win-3',
                    '1df08912de78',
                    'reaction',
                    '🔥',
                    1789721861719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-3-12df90-5',
                    'comment',
                    'c-win-3',
                    '12df9011ac89',
                    'reaction',
                    '❤️',
                    1789721896719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-win-4',
                'post-feud-windows-local-account',
                'c-win-3',
                '8a31b402ef19',
                'VERIFIED_NODE',
                '@FiberWizard ''Enterprise only'' is how it literally always starts. BitLocker was enterprise-only. Online account requirement was ''Windows 11 Home only'', then 6 months later they shoved it down Pro users'' throats. Defending Microsoft in 2026 is stockholm syndrome.',
                133,
                1789722286719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-4-88b401-0',
                    'comment',
                    'c-win-4',
                    '88b4012ce9fa',
                    'like',
                    '🚀',
                    1789722321719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-4-61c801-1',
                    'comment',
                    'c-win-4',
                    '61c8012afa34',
                    'reaction',
                    '❤️',
                    1789722356719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-4-1cf089-2',
                    'comment',
                    'c-win-4',
                    '1cf08912fa12',
                    'like',
                    '🔥',
                    1789722391719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-4-88f019-3',
                    'comment',
                    'c-win-4',
                    '88f019ab4c21',
                    'like',
                    '🔥',
                    1789722426719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-4-5b2041-4',
                    'comment',
                    'c-win-4',
                    '5b2041e8d902',
                    'reaction',
                    '💡',
                    1789722461719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-4-1df089-5',
                    'comment',
                    'c-win-4',
                    '1df08912de78',
                    'reaction',
                    '🧠',
                    1789722496719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-win-5',
                'post-feud-windows-local-account',
                NULL,
                'a410ef89b231',
                'SOVEREIGN_FOUNDER',
                'Year of the Linux Desktop isn''t happening because the Linux Foundation ran good marketing. It''s happening because Satya Nadella is systematically driving every sane human being away from Windows.',
                245,
                1789722886719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-5-3db014-0',
                    'comment',
                    'c-win-5',
                    '3db014ea9e12',
                    'like',
                    '👍',
                    1789722921719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-5-91c24f-1',
                    'comment',
                    'c-win-5',
                    '91c24f00ba11',
                    'like',
                    '❤️',
                    1789722956719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-5-12df90-2',
                    'comment',
                    'c-win-5',
                    '12df9011ac89',
                    'reaction',
                    '💡',
                    1789722991719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-5-94df02-3',
                    'comment',
                    'c-win-5',
                    '94df0218ab44',
                    'reaction',
                    '🚀',
                    1789723026719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-5-7f8a91-4',
                    'comment',
                    'c-win-5',
                    '7f8a910c2b44',
                    'reaction',
                    '🧠',
                    1789723061719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-5-62df09-5',
                    'comment',
                    'c-win-5',
                    '62df0912cb88',
                    'reaction',
                    '🛡️',
                    1789723096719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-5-a7df90-6',
                    'comment',
                    'c-win-5',
                    'a7df9012bc23',
                    'like',
                    '❤️',
                    1789723131719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-win-6',
                'post-feud-windows-local-account',
                'c-win-5',
                '5fc4018fab23',
                'CORE_CONTRIBUTOR',
                'I would switch to Linux in a heartbeat if Anti-Cheat didn''t treat Wine like a criminal hack. Vanguard and Ricochet literally demand Ring 0 kernel access. Until game publishers stop treating PC players like suspects, 90% of gamers are stuck on Windows whether we hate it or not.',
                88,
                1789723786719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-6-77e102-0',
                    'comment',
                    'c-win-6',
                    '77e1029ba4c0',
                    'like',
                    '🛡️',
                    1789723821719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-6-1df089-1',
                    'comment',
                    'c-win-6',
                    '1df08912de78',
                    'like',
                    '❤️',
                    1789723856719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-6-79c901-2',
                    'comment',
                    'c-win-6',
                    '79c901affa01',
                    'like',
                    '💡',
                    1789723891719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-6-6d88f1-3',
                    'comment',
                    'c-win-6',
                    '6d88f12a04cb',
                    'like',
                    '🧠',
                    1789723926719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-win-6-aa0194-5',
                    'comment',
                    'c-win-6',
                    'aa0194f2cd01',
                    'reaction',
                    '🚀',
                    1789723996719
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-61c801-0',
                'post',
                'post-feud-windows-local-account',
                '61c8012afa34',
                'bookmark',
                '👍',
                1789719631719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-3e901a-1',
                'post',
                'post-feud-windows-local-account',
                '3e901a88fb22',
                'bookmark',
                '🛡️',
                1789719676719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-18df01-2',
                'post',
                'post-feud-windows-local-account',
                '18df01a2eb34',
                'like',
                '🧠',
                1789719721719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-4e198a-3',
                'post',
                'post-feud-windows-local-account',
                '4e198a00b215',
                'reaction',
                '🧠',
                1789719766719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-6f1084-4',
                'post',
                'post-feud-windows-local-account',
                '6f1084ea2b99',
                'like',
                '💡',
                1789719811719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-29c40e-5',
                'post',
                'post-feud-windows-local-account',
                '29c40e11a8b2',
                'like',
                '👍',
                1789719856719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-7ac901-6',
                'post',
                'post-feud-windows-local-account',
                '7ac901afcd67',
                'reaction',
                '🚀',
                1789719901719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-91df90-7',
                'post',
                'post-feud-windows-local-account',
                '91df9012cb78',
                'reaction',
                '⚡',
                1789719946719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-a0914e-8',
                'post',
                'post-feud-windows-local-account',
                'a0914e21fc88',
                'like',
                '🚀',
                1789719991719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-1cf089-9',
                'post',
                'post-feud-windows-local-account',
                '1cf08912fa12',
                'bookmark',
                '🛡️',
                1789720036719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-8d104f-10',
                'post',
                'post-feud-windows-local-account',
                '8d104fb2a901',
                'reaction',
                '🔥',
                1789720081719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-77e102-11',
                'post',
                'post-feud-windows-local-account',
                '77e1029ba4c0',
                'like',
                '💡',
                1789720126719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-aa0194-12',
                'post',
                'post-feud-windows-local-account',
                'aa0194f2cd01',
                'reaction',
                '👍',
                1789720171719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-3db014-13',
                'post',
                'post-feud-windows-local-account',
                '3db014ea9e12',
                'like',
                '⚡',
                1789720216719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-99df01-14',
                'post',
                'post-feud-windows-local-account',
                '99df012aa4c3',
                'like',
                '⚡',
                1789720261719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-88b401-15',
                'post',
                'post-feud-windows-local-account',
                '88b4012ce9fa',
                'bookmark',
                '👍',
                1789720306719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-5fc401-16',
                'post',
                'post-feud-windows-local-account',
                '5fc4018fab23',
                'reaction',
                '⚡',
                1789720351719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-6d88f1-17',
                'post',
                'post-feud-windows-local-account',
                '6d88f12a04cb',
                'like',
                '⚡',
                1789720396719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-2d89b1-18',
                'post',
                'post-feud-windows-local-account',
                '2d89b14c99a0',
                'like',
                '🛡️',
                1789720441719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-91c24f-19',
                'post',
                'post-feud-windows-local-account',
                '91c24f00ba11',
                'bookmark',
                '🧠',
                1789720486719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-12df90-20',
                'post',
                'post-feud-windows-local-account',
                '12df9011ac89',
                'like',
                '🧠',
                1789720531719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-70a40f-21',
                'post',
                'post-feud-windows-local-account',
                '70a40f91b2df',
                'bookmark',
                '🛡️',
                1789720576719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-a7df90-22',
                'post',
                'post-feud-windows-local-account',
                'a7df9012bc23',
                'like',
                '⚡',
                1789720621719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-50c401-23',
                'post',
                'post-feud-windows-local-account',
                '50c4018fef89',
                'like',
                '🧠',
                1789720666719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-44df90-24',
                'post',
                'post-feud-windows-local-account',
                '44df9012a8bc',
                'bookmark',
                '🧠',
                1789720711719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-22c88f-25',
                'post',
                'post-feud-windows-local-account',
                '22c88f01a9df',
                'like',
                '🔥',
                1789720756719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-62df09-26',
                'post',
                'post-feud-windows-local-account',
                '62df0912cb88',
                'bookmark',
                '⚡',
                1789720801719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-24cb90-27',
                'post',
                'post-feud-windows-local-account',
                '24cb9011af33',
                'bookmark',
                '🧠',
                1789720846719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-87a01f-28',
                'post',
                'post-feud-windows-local-account',
                '87a01fa29cb5',
                'bookmark',
                '👍',
                1789720891719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-1bf089-29',
                'post',
                'post-feud-windows-local-account',
                '1bf08912ea56',
                'bookmark',
                '❤️',
                1789720936719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-a50091-30',
                'post',
                'post-feud-windows-local-account',
                'a500912fa8cc',
                'bookmark',
                '🧠',
                1789720981719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-7f8a91-31',
                'post',
                'post-feud-windows-local-account',
                '7f8a910c2b44',
                'like',
                '🔥',
                1789721026719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-83d201-32',
                'post',
                'post-feud-windows-local-account',
                '83d2019fab66',
                'bookmark',
                '❤️',
                1789721071719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-windows-local-account-79c901-33',
                'post',
                'post-feud-windows-local-account',
                '79c901affa01',
                'like',
                '🚀',
                1789721116719
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'post-feud-linus-rust-rant',
            'c/opensource',
            'a410ef89b231',
            'SOVEREIGN_FOUNDER',
            'Linus Torvalds rejects kernel patch with explosive mailing list rant: ''Rust zealots are poisoning the kernel with bloated abstractions — compile times tripled and for what?''',
            'The Linux Kernel Mailing List (LKML) exploded this morning after Linus Torvalds delivered an unvarnished rebuke to the maintainers of the Rust-for-Linux subsystem.

The dispute erupted over a 4,000-line patch attempting to replace the legacy C implementation of the virtual memory allocator hooks with an experimental Rust trait hierarchy.

In his response, Torvalds did not hold back:
> *''I am sick and tired of reviewing patches that replace 50 lines of clean, transparent C with 800 lines of arcane macro voodoo, nested generics, and unsafe blocks that pretend to be safe until someone sneezes on the borrow checker. My local kernel compilation time on an AMD Threadripper has ballooned by 140%. And the worst part? The C code has run without a memory corruption bug in 14 years.*
>
> *If your religion requires 10 layers of zero-cost abstractions that cost 15 seconds per compilation unit, go write a web browser. The kernel is not your sandbox.''*

Pro-Rust contributors are already calling this an emotional reaction from an entrenched C generation, while veteran maintainers are celebrating. Has the Rust experiment in the Linux kernel officially hit a brick wall?',
            '⚔️ DRAMA',
            952,
            0,
            6,
            312,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789724986719,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-linus-rust-rant', 'linux', 1789724986719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-linus-rust-rant', 'rust', 1789724986719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-linus-rust-rant', 'kernel', 1789724986719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-linus-rust-rant', 'drama', 1789724986719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-linus-rust-rant', 'linustorvalds', 1789724986719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-linus-rust-rant', 'cprogramming', 1789724986719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-linus-rust-rant', 'opensource', 1789724986719);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-rust-1',
                'post-feud-linus-rust-rant',
                NULL,
                '3c91a4e082aa',
                'CORE_CONTRIBUTOR',
                'Absolute king behavior from Linus. I''ve been saying this for 3 years: Rust advocates promised us zero bugs and high productivity. What we actually got was 10-minute compile times, incompatible LLVM toolchain upgrades every 6 weeks, and drivers that panic on out-of-memory because unwinding in ring 0 is a nightmare. C wins again.',
                267,
                1789725886719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-1-91df90-0',
                    'comment',
                    'c-rust-1',
                    '91df9012cb78',
                    'like',
                    '🔥',
                    1789725921719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-1-83d201-1',
                    'comment',
                    'c-rust-1',
                    '83d2019fab66',
                    'like',
                    '❤️',
                    1789725956719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-1-99df01-2',
                    'comment',
                    'c-rust-1',
                    '99df012aa4c3',
                    'reaction',
                    '🛡️',
                    1789725991719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-1-1df089-3',
                    'comment',
                    'c-rust-1',
                    '1df08912de78',
                    'like',
                    '🔥',
                    1789726026719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-1-aa0194-4',
                    'comment',
                    'c-rust-1',
                    'aa0194f2cd01',
                    'reaction',
                    '🚀',
                    1789726061719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-1-7f8a91-5',
                    'comment',
                    'c-rust-1',
                    '7f8a910c2b44',
                    'like',
                    '🛡️',
                    1789726096719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-1-94df02-6',
                    'comment',
                    'c-rust-1',
                    '94df0218ab44',
                    'like',
                    '👍',
                    1789726131719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-1-87a01f-7',
                    'comment',
                    'c-rust-1',
                    '87a01fa29cb5',
                    'like',
                    '❤️',
                    1789726166719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-rust-2',
                'post-feud-linus-rust-rant',
                'c-rust-1',
                '1bf08912ea56',
                'SECURITY_AUDITOR',
                '@void_pointer ''C wins again''? Are you delusional? Over 68% of all remote code execution CVEs in the Linux kernel over the past decade were memory safety bugs — use-after-free, buffer overflows, double frees. Linus complaining about compile times while userland servers get pwned by state actors exploiting 1980s C pointer arithmetic is ridiculous.',
                145,
                1789726486719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-2-62df09-0',
                    'comment',
                    'c-rust-2',
                    '62df0912cb88',
                    'like',
                    '🧠',
                    1789726521719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-2-88b401-1',
                    'comment',
                    'c-rust-2',
                    '88b4012ce9fa',
                    'reaction',
                    '💡',
                    1789726556719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-2-22c88f-2',
                    'comment',
                    'c-rust-2',
                    '22c88f01a9df',
                    'reaction',
                    '🔥',
                    1789726591719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-2-6f1084-3',
                    'comment',
                    'c-rust-2',
                    '6f1084ea2b99',
                    'like',
                    '🛡️',
                    1789726626719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-2-91df90-4',
                    'comment',
                    'c-rust-2',
                    '91df9012cb78',
                    'like',
                    '👍',
                    1789726661719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-2-a50091-5',
                    'comment',
                    'c-rust-2',
                    'a500912fa8cc',
                    'reaction',
                    '❤️',
                    1789726696719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-2-1cf089-6',
                    'comment',
                    'c-rust-2',
                    '1cf08912fa12',
                    'reaction',
                    '🧠',
                    1789726731719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-2-a0914e-7',
                    'comment',
                    'c-rust-2',
                    'a0914e21fc88',
                    'reaction',
                    '🔥',
                    1789726766719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-rust-3',
                'post-feud-linus-rust-rant',
                'c-rust-2',
                '7f8a910c2b44',
                'ARCHIVIST',
                '@RustaceanGod If you write proper modern C with static analyzers, AddressSanitizer, and strict compiler warnings, memory bugs are virtually non-existent. The problem isn''t C; the problem is lazy developers who don''t understand cache coherency and pointer lifetimes. Stop blaming the language for your skill issue.',
                189,
                1789727086719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-3-70a40f-0',
                    'comment',
                    'c-rust-3',
                    '70a40f91b2df',
                    'reaction',
                    '🔥',
                    1789727121719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-3-22c88f-1',
                    'comment',
                    'c-rust-3',
                    '22c88f01a9df',
                    'like',
                    '🧠',
                    1789727156719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-3-79c901-2',
                    'comment',
                    'c-rust-3',
                    '79c901affa01',
                    'reaction',
                    '🔥',
                    1789727191719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-3-12df90-3',
                    'comment',
                    'c-rust-3',
                    '12df9011ac89',
                    'reaction',
                    '🧠',
                    1789727226719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-3-18df01-4',
                    'comment',
                    'c-rust-3',
                    '18df01a2eb34',
                    'like',
                    '🧠',
                    1789727261719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-3-8d104f-5',
                    'comment',
                    'c-rust-3',
                    '8d104fb2a901',
                    'like',
                    '🧠',
                    1789727296719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-3-94df02-6',
                    'comment',
                    'c-rust-3',
                    '94df0218ab44',
                    'like',
                    '💡',
                    1789727331719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-rust-4',
                'post-feud-linus-rust-rant',
                'c-rust-3',
                '1bf08912ea56',
                'SECURITY_AUDITOR',
                '@ArchChad ''Just write bug-free C, it is a skill issue''. That has got to be the most intellectually bankrupt argument in software engineering history. Microsoft, Google, NSA, and Apple have the best engineers on Earth with limitless budgets, and ALL of them concluded human brains cannot manually manage pointers at scale. Keep coping.',
                172,
                1789727686719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-4-77e102-0',
                    'comment',
                    'c-rust-4',
                    '77e1029ba4c0',
                    'like',
                    '🛡️',
                    1789727721719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-4-3db014-1',
                    'comment',
                    'c-rust-4',
                    '3db014ea9e12',
                    'reaction',
                    '❤️',
                    1789727756719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-4-7f8a91-2',
                    'comment',
                    'c-rust-4',
                    '7f8a910c2b44',
                    'like',
                    '🔥',
                    1789727791719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-4-3e901a-3',
                    'comment',
                    'c-rust-4',
                    '3e901a88fb22',
                    'like',
                    '💡',
                    1789727826719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-4-44df90-4',
                    'comment',
                    'c-rust-4',
                    '44df9012a8bc',
                    'reaction',
                    '👍',
                    1789727861719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-4-a50091-6',
                    'comment',
                    'c-rust-4',
                    'a500912fa8cc',
                    'reaction',
                    '🔥',
                    1789727931719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-rust-5',
                'post-feud-linus-rust-rant',
                NULL,
                '4e198a00b215',
                'CORE_CONTRIBUTOR',
                'Meanwhile Zig is sitting in the corner with clean manual memory control, zero hidden control flow, compile times that are 10x faster than Rust, and seamless C interop without requiring a 4GB LLVM dependency chain. If the kernel moves away from C, Zig makes 100x more sense than Rust.',
                85,
                1789728586719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-5-18df01-0',
                    'comment',
                    'c-rust-5',
                    '18df01a2eb34',
                    'like',
                    '🛡️',
                    1789728621719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-5-6d88f1-1',
                    'comment',
                    'c-rust-5',
                    '6d88f12a04cb',
                    'reaction',
                    '🚀',
                    1789728656719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-5-88b401-2',
                    'comment',
                    'c-rust-5',
                    '88b4012ce9fa',
                    'reaction',
                    '🧠',
                    1789728691719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-5-70a40f-3',
                    'comment',
                    'c-rust-5',
                    '70a40f91b2df',
                    'like',
                    '👍',
                    1789728726719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-5-b1409e-4',
                    'comment',
                    'c-rust-5',
                    'b1409ea28c99',
                    'like',
                    '🚀',
                    1789728761719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-rust-6',
                'post-feud-linus-rust-rant',
                'c-rust-5',
                '3c91a4e082aa',
                'CORE_CONTRIBUTOR',
                '@DockerNinja Zig doesn''t even have a stable 1.0 specification yet and breaks syntax every minor release. Suggesting we rewrite the foundation of modern internet infrastructure in an alpha language is peak Reddit engineering.',
                128,
                1789729486719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-6-7ac901-0',
                    'comment',
                    'c-rust-6',
                    '7ac901afcd67',
                    'reaction',
                    '🔥',
                    1789729521719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-6-70a40f-1',
                    'comment',
                    'c-rust-6',
                    '70a40f91b2df',
                    'like',
                    '🛡️',
                    1789729556719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-6-55a019-2',
                    'comment',
                    'c-rust-6',
                    '55a019ef44cc',
                    'reaction',
                    '🔥',
                    1789729591719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-6-4e198a-3',
                    'comment',
                    'c-rust-6',
                    '4e198a00b215',
                    'like',
                    '👍',
                    1789729626719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-6-87a01f-4',
                    'comment',
                    'c-rust-6',
                    '87a01fa29cb5',
                    'reaction',
                    '💡',
                    1789729661719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-6-b1409e-5',
                    'comment',
                    'c-rust-6',
                    'b1409ea28c99',
                    'like',
                    '🧠',
                    1789729696719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rust-6-77e102-6',
                    'comment',
                    'c-rust-6',
                    '77e1029ba4c0',
                    'reaction',
                    '🛡️',
                    1789729731719
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-a7df90-0',
                'post',
                'post-feud-linus-rust-rant',
                'a7df9012bc23',
                'bookmark',
                '💡',
                1789725031719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-1cf089-1',
                'post',
                'post-feud-linus-rust-rant',
                '1cf08912fa12',
                'like',
                '👍',
                1789725076719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-29c40e-2',
                'post',
                'post-feud-linus-rust-rant',
                '29c40e11a8b2',
                'like',
                '🛡️',
                1789725121719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-7f8a91-3',
                'post',
                'post-feud-linus-rust-rant',
                '7f8a910c2b44',
                'like',
                '💡',
                1789725166719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-79c901-4',
                'post',
                'post-feud-linus-rust-rant',
                '79c901affa01',
                'like',
                '🛡️',
                1789725211719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-3db014-5',
                'post',
                'post-feud-linus-rust-rant',
                '3db014ea9e12',
                'reaction',
                '🚀',
                1789725256719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-5fc401-6',
                'post',
                'post-feud-linus-rust-rant',
                '5fc4018fab23',
                'bookmark',
                '💡',
                1789725301719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-aa0194-7',
                'post',
                'post-feud-linus-rust-rant',
                'aa0194f2cd01',
                'reaction',
                '💡',
                1789725346719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-6d88f1-8',
                'post',
                'post-feud-linus-rust-rant',
                '6d88f12a04cb',
                'bookmark',
                '🧠',
                1789725391719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-6f1084-9',
                'post',
                'post-feud-linus-rust-rant',
                '6f1084ea2b99',
                'bookmark',
                '🛡️',
                1789725436719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-62df09-10',
                'post',
                'post-feud-linus-rust-rant',
                '62df0912cb88',
                'reaction',
                '🚀',
                1789725481719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-3e901a-11',
                'post',
                'post-feud-linus-rust-rant',
                '3e901a88fb22',
                'reaction',
                '🚀',
                1789725526719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-5b2041-12',
                'post',
                'post-feud-linus-rust-rant',
                '5b2041e8d902',
                'reaction',
                '👍',
                1789725571719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-18df01-13',
                'post',
                'post-feud-linus-rust-rant',
                '18df01a2eb34',
                'like',
                '🧠',
                1789725616719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-a0914e-14',
                'post',
                'post-feud-linus-rust-rant',
                'a0914e21fc88',
                'reaction',
                '👍',
                1789725661719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-88f019-15',
                'post',
                'post-feud-linus-rust-rant',
                '88f019ab4c21',
                'reaction',
                '❤️',
                1789725706719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-83d201-16',
                'post',
                'post-feud-linus-rust-rant',
                '83d2019fab66',
                'bookmark',
                '🛡️',
                1789725751719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-70a40f-17',
                'post',
                'post-feud-linus-rust-rant',
                '70a40f91b2df',
                'reaction',
                '🚀',
                1789725796719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-24cb90-18',
                'post',
                'post-feud-linus-rust-rant',
                '24cb9011af33',
                'reaction',
                '🚀',
                1789725841719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-a50091-19',
                'post',
                'post-feud-linus-rust-rant',
                'a500912fa8cc',
                'reaction',
                '🧠',
                1789725886719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-22c88f-20',
                'post',
                'post-feud-linus-rust-rant',
                '22c88f01a9df',
                'reaction',
                '🧠',
                1789725931719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-1bf089-21',
                'post',
                'post-feud-linus-rust-rant',
                '1bf08912ea56',
                'bookmark',
                '🛡️',
                1789725976719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-12df90-22',
                'post',
                'post-feud-linus-rust-rant',
                '12df9011ac89',
                'like',
                '💡',
                1789726021719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-8d104f-23',
                'post',
                'post-feud-linus-rust-rant',
                '8d104fb2a901',
                'like',
                '🚀',
                1789726066719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-91df90-24',
                'post',
                'post-feud-linus-rust-rant',
                '91df9012cb78',
                'bookmark',
                '💡',
                1789726111719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-55a019-25',
                'post',
                'post-feud-linus-rust-rant',
                '55a019ef44cc',
                'like',
                '🧠',
                1789726156719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-44df90-26',
                'post',
                'post-feud-linus-rust-rant',
                '44df9012a8bc',
                'like',
                '❤️',
                1789726201719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-94df02-27',
                'post',
                'post-feud-linus-rust-rant',
                '94df0218ab44',
                'reaction',
                '🚀',
                1789726246719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-50c401-28',
                'post',
                'post-feud-linus-rust-rant',
                '50c4018fef89',
                'bookmark',
                '🔥',
                1789726291719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-77e102-29',
                'post',
                'post-feud-linus-rust-rant',
                '77e1029ba4c0',
                'reaction',
                '👍',
                1789726336719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-87a01f-30',
                'post',
                'post-feud-linus-rust-rant',
                '87a01fa29cb5',
                'bookmark',
                '🔥',
                1789726381719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-2d89b1-31',
                'post',
                'post-feud-linus-rust-rant',
                '2d89b14c99a0',
                'bookmark',
                '💡',
                1789726426719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-b1409e-32',
                'post',
                'post-feud-linus-rust-rant',
                'b1409ea28c99',
                'bookmark',
                '🔥',
                1789726471719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-7ac901-33',
                'post',
                'post-feud-linus-rust-rant',
                '7ac901afcd67',
                'reaction',
                '🔥',
                1789726516719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-linus-rust-rant-88b401-34',
                'post',
                'post-feud-linus-rust-rant',
                '88b4012ce9fa',
                'reaction',
                '🚀',
                1789726561719
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'post-feud-openai-2000-tier',
            'c/privacy-ai',
            '83d2019fab66',
            'AI_RESEARCHER',
            'OpenAI reportedly testing $2,000/month ''Titan Reasoning'' subscription while slashing Plus users down to 12 messages every 3 hours',
            'A financial leak from a Silicon Valley venture fund with early access to upcoming OpenAI enterprise offerings has revealed a dramatic pricing restructuring codenamed ''Project Orchard''.

Faced with an astronomical compute burn rate exceeding $8.5 billion annually, OpenAI is reportedly preparing to segment the market into extreme tiers:

- **Titan Reasoning Tier ($2,000/month)**: Uncapped access to autonomous multi-agent reasoning models with 500k token output horizons, dedicated H200 cluster allocations, and zero token latency throttling.
- **Plus Tier ($20/month)**: Drastic downgrade. Rate limits reportedly dropped from 40 messages/3 hours down to just **12 messages every 3 hours** during peak business hours, with inference routed through quantized lightweight models.
- **Free Tier**: Ad-supported, multi-turn context capped at 4,000 tokens.

When asked for comment, internal sources claim: ''High-compute reasoning loops cost $3.50 per query in raw server electricity. A $20 subscription was burning $300 in compute per heavy user. The math simply does not work anymore.''

Is the era of affordable, cutting-edge consumer AI officially dead?',
            '🤖 AI WARS',
            789,
            0,
            6,
            215,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789730386719,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-openai-2000-tier', 'openai', 1789730386719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-openai-2000-tier', 'chatgpt', 1789730386719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-openai-2000-tier', 'localllm', 1789730386719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-openai-2000-tier', 'fakenews', 1789730386719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-openai-2000-tier', 'pricing', 1789730386719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-openai-2000-tier', 'ai', 1789730386719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-openai-2000-tier', 'deepseek', 1789730386719);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-ai-1',
                'post-feud-openai-2000-tier',
                NULL,
                'c0a184e912fd',
                'VERIFIED_NODE',
                '$2,000 a month for a chatbot that still hallucinates npm packages and invents nonexistent legal citations with supreme confidence. Who in their right mind is paying this? Only VC-funded startups burning other people''s money.',
                215,
                1789731286719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-1-61c801-0',
                    'comment',
                    'c-ai-1',
                    '61c8012afa34',
                    'like',
                    '🚀',
                    1789731321719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-1-55a019-1',
                    'comment',
                    'c-ai-1',
                    '55a019ef44cc',
                    'reaction',
                    '💡',
                    1789731356719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-1-12df90-2',
                    'comment',
                    'c-ai-1',
                    '12df9011ac89',
                    'like',
                    '🔥',
                    1789731391719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-1-87a01f-3',
                    'comment',
                    'c-ai-1',
                    '87a01fa29cb5',
                    'like',
                    '💡',
                    1789731426719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-1-70a40f-4',
                    'comment',
                    'c-ai-1',
                    '70a40f91b2df',
                    'reaction',
                    '💡',
                    1789731461719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-1-b1409e-5',
                    'comment',
                    'c-ai-1',
                    'b1409ea28c99',
                    'like',
                    '🚀',
                    1789731496719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-1-91df90-6',
                    'comment',
                    'c-ai-1',
                    '91df9012cb78',
                    'like',
                    '👍',
                    1789731531719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-1-8d104f-7',
                    'comment',
                    'c-ai-1',
                    '8d104fb2a901',
                    'like',
                    '👍',
                    1789731566719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-1-83d201-8',
                    'comment',
                    'c-ai-1',
                    '83d2019fab66',
                    'reaction',
                    '👍',
                    1789731601719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-ai-2',
                'post-feud-openai-2000-tier',
                'c-ai-1',
                '7b33a901ff42',
                'SECURITY_AUDITOR',
                'This leak smells like blatant ragebait and fake news. Altman literally gave an interview two weeks ago explaining that algorithmic breakthroughs in mixture-of-agents have reduced training and inference costs by 80%. Why would they drop Plus to 12 messages? It would trigger mass cancellations overnight.',
                72,
                1789731886719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-2-a7df90-0',
                    'comment',
                    'c-ai-2',
                    'a7df9012bc23',
                    'like',
                    '🛡️',
                    1789731921719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-2-70a40f-1',
                    'comment',
                    'c-ai-2',
                    '70a40f91b2df',
                    'like',
                    '🧠',
                    1789731956719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-2-1df089-2',
                    'comment',
                    'c-ai-2',
                    '1df08912de78',
                    'reaction',
                    '🔥',
                    1789731991719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-2-1bf089-3',
                    'comment',
                    'c-ai-2',
                    '1bf08912ea56',
                    'reaction',
                    '🔥',
                    1789732026719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-2-61c801-4',
                    'comment',
                    'c-ai-2',
                    '61c8012afa34',
                    'like',
                    '🛡️',
                    1789732061719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-2-5b2041-5',
                    'comment',
                    'c-ai-2',
                    '5b2041e8d902',
                    'reaction',
                    '🧠',
                    1789732096719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-2-1cf089-6',
                    'comment',
                    'c-ai-2',
                    '1cf08912fa12',
                    'reaction',
                    '💡',
                    1789732131719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-2-aa0194-7',
                    'comment',
                    'c-ai-2',
                    'aa0194f2cd01',
                    'reaction',
                    '❤️',
                    1789732166719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-2-94df02-8',
                    'comment',
                    'c-ai-2',
                    '94df0218ab44',
                    'like',
                    '👍',
                    1789732201719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-ai-3',
                'post-feud-openai-2000-tier',
                'c-ai-2',
                '83d2019fab66',
                'AI_RESEARCHER',
                '@BioHackerX Because consumer subscriptions don''t make profit! Sam Altman says whatever pumps equity valuation before the next funding tranche. If you look at the raw compute cost of generating 30,000 internal thinking tokens per response, it is mathematically impossible to sustain on a $20/mo gym-membership model.',
                164,
                1789732486719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-3-50c401-0',
                    'comment',
                    'c-ai-3',
                    '50c4018fef89',
                    'like',
                    '👍',
                    1789732521719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-3-b1409e-1',
                    'comment',
                    'c-ai-3',
                    'b1409ea28c99',
                    'reaction',
                    '🧠',
                    1789732556719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-3-70a40f-2',
                    'comment',
                    'c-ai-3',
                    '70a40f91b2df',
                    'like',
                    '❤️',
                    1789732591719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-3-18df01-3',
                    'comment',
                    'c-ai-3',
                    '18df01a2eb34',
                    'like',
                    '🧠',
                    1789732626719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-3-1df089-4',
                    'comment',
                    'c-ai-3',
                    '1df08912de78',
                    'reaction',
                    '🧠',
                    1789732661719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-3-8d104f-5',
                    'comment',
                    'c-ai-3',
                    '8d104fb2a901',
                    'like',
                    '🛡️',
                    1789732696719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-3-5fc401-6',
                    'comment',
                    'c-ai-3',
                    '5fc4018fab23',
                    'reaction',
                    '👍',
                    1789732731719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-ai-4',
                'post-feud-openai-2000-tier',
                NULL,
                '91c24fa0e891',
                'CORE_CONTRIBUTOR',
                'Imagine paying a monthly subscription for AI in 2026. I bought a Mac Studio M4 Max with 128GB Unified Memory 6 months ago. I run Qwen 2.5 Coder 32B and DeepSeek R1 locally on Ollama at 42 tokens/second. Zero rate limits, zero privacy leaks, zero subscription fees. The hardware paid for itself in 4 months.',
                198,
                1789733086719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-4-94df02-0',
                    'comment',
                    'c-ai-4',
                    '94df0218ab44',
                    'like',
                    '👍',
                    1789733121719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-4-4e198a-1',
                    'comment',
                    'c-ai-4',
                    '4e198a00b215',
                    'reaction',
                    '🛡️',
                    1789733156719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-4-1bf089-2',
                    'comment',
                    'c-ai-4',
                    '1bf08912ea56',
                    'reaction',
                    '🧠',
                    1789733191719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-4-18df01-3',
                    'comment',
                    'c-ai-4',
                    '18df01a2eb34',
                    'reaction',
                    '🧠',
                    1789733226719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-4-99df01-4',
                    'comment',
                    'c-ai-4',
                    '99df012aa4c3',
                    'reaction',
                    '👍',
                    1789733261719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-ai-5',
                'post-feud-openai-2000-tier',
                'c-ai-4',
                '8a31b402ef19',
                'VERIFIED_NODE',
                '@PiHoarder ''Hardware paid for itself''? Bro, an M4 Max Studio with 128GB RAM costs $4,200 out the door! Most people don''t have $4,000 lying around to run open-weight models that still score 15% lower on SWE-bench than Claude 3.5 Sonnet. The techbro bubble is insane.',
                154,
                1789733686719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-5-77e102-0',
                    'comment',
                    'c-ai-5',
                    '77e1029ba4c0',
                    'reaction',
                    '🛡️',
                    1789733721719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-5-5b2041-1',
                    'comment',
                    'c-ai-5',
                    '5b2041e8d902',
                    'like',
                    '❤️',
                    1789733756719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-5-3db014-2',
                    'comment',
                    'c-ai-5',
                    '3db014ea9e12',
                    'like',
                    '🧠',
                    1789733791719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-5-91c24f-3',
                    'comment',
                    'c-ai-5',
                    '91c24f00ba11',
                    'like',
                    '🔥',
                    1789733826719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-5-aa0194-4',
                    'comment',
                    'c-ai-5',
                    'aa0194f2cd01',
                    'like',
                    '👍',
                    1789733861719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-5-1cf089-5',
                    'comment',
                    'c-ai-5',
                    '1cf08912fa12',
                    'reaction',
                    '🧠',
                    1789733896719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-5-70a40f-6',
                    'comment',
                    'c-ai-5',
                    '70a40f91b2df',
                    'like',
                    '🔥',
                    1789733931719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-ai-6',
                'post-feud-openai-2000-tier',
                'c-ai-5',
                '91c24fa0e891',
                'CORE_CONTRIBUTOR',
                '@DanGaming If you write code for a living, $4,000 is a tax-deductible tool that saves 20 hours a week and protects your intellectual property from training OpenAI''s next model. If you just use it to generate anime memes, of course you can''t justify the cost.',
                112,
                1789734586719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-6-50c401-0',
                    'comment',
                    'c-ai-6',
                    '50c4018fef89',
                    'reaction',
                    '🔥',
                    1789734621719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-6-2d89b1-1',
                    'comment',
                    'c-ai-6',
                    '2d89b14c99a0',
                    'like',
                    '🚀',
                    1789734656719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-6-8d104f-2',
                    'comment',
                    'c-ai-6',
                    '8d104fb2a901',
                    'reaction',
                    '👍',
                    1789734691719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-6-5b2041-3',
                    'comment',
                    'c-ai-6',
                    '5b2041e8d902',
                    'like',
                    '🧠',
                    1789734726719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-6-88b401-4',
                    'comment',
                    'c-ai-6',
                    '88b4012ce9fa',
                    'like',
                    '🛡️',
                    1789734761719
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-1df089-0',
                'post',
                'post-feud-openai-2000-tier',
                '1df08912de78',
                'like',
                '⚡',
                1789730431719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-a50091-1',
                'post',
                'post-feud-openai-2000-tier',
                'a500912fa8cc',
                'reaction',
                '🚀',
                1789730476719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-50c401-2',
                'post',
                'post-feud-openai-2000-tier',
                '50c4018fef89',
                'reaction',
                '💡',
                1789730521719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-77e102-3',
                'post',
                'post-feud-openai-2000-tier',
                '77e1029ba4c0',
                'bookmark',
                '❤️',
                1789730566719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-1cf089-5',
                'post',
                'post-feud-openai-2000-tier',
                '1cf08912fa12',
                'bookmark',
                '❤️',
                1789730656719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-44df90-6',
                'post',
                'post-feud-openai-2000-tier',
                '44df9012a8bc',
                'reaction',
                '🔥',
                1789730701719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-99df01-7',
                'post',
                'post-feud-openai-2000-tier',
                '99df012aa4c3',
                'bookmark',
                '👍',
                1789730746719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-b1409e-8',
                'post',
                'post-feud-openai-2000-tier',
                'b1409ea28c99',
                'reaction',
                '💡',
                1789730791719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-aa0194-9',
                'post',
                'post-feud-openai-2000-tier',
                'aa0194f2cd01',
                'like',
                '🧠',
                1789730836719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-4e198a-10',
                'post',
                'post-feud-openai-2000-tier',
                '4e198a00b215',
                'bookmark',
                '🚀',
                1789730881719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-70a40f-11',
                'post',
                'post-feud-openai-2000-tier',
                '70a40f91b2df',
                'like',
                '🛡️',
                1789730926719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-79c901-12',
                'post',
                'post-feud-openai-2000-tier',
                '79c901affa01',
                'reaction',
                '❤️',
                1789730971719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-2d89b1-13',
                'post',
                'post-feud-openai-2000-tier',
                '2d89b14c99a0',
                'like',
                '⚡',
                1789731016719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-18df01-14',
                'post',
                'post-feud-openai-2000-tier',
                '18df01a2eb34',
                'reaction',
                '⚡',
                1789731061719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-62df09-15',
                'post',
                'post-feud-openai-2000-tier',
                '62df0912cb88',
                'reaction',
                '🧠',
                1789731106719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-6d88f1-16',
                'post',
                'post-feud-openai-2000-tier',
                '6d88f12a04cb',
                'bookmark',
                '🚀',
                1789731151719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-88b401-17',
                'post',
                'post-feud-openai-2000-tier',
                '88b4012ce9fa',
                'like',
                '🔥',
                1789731196719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-5fc401-18',
                'post',
                'post-feud-openai-2000-tier',
                '5fc4018fab23',
                'like',
                '🔥',
                1789731241719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-29c40e-19',
                'post',
                'post-feud-openai-2000-tier',
                '29c40e11a8b2',
                'like',
                '🧠',
                1789731286719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-6f1084-20',
                'post',
                'post-feud-openai-2000-tier',
                '6f1084ea2b99',
                'like',
                '⚡',
                1789731331719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-91c24f-21',
                'post',
                'post-feud-openai-2000-tier',
                '91c24f00ba11',
                'reaction',
                '❤️',
                1789731376719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-12df90-22',
                'post',
                'post-feud-openai-2000-tier',
                '12df9011ac89',
                'like',
                '🔥',
                1789731421719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-8d104f-23',
                'post',
                'post-feud-openai-2000-tier',
                '8d104fb2a901',
                'like',
                '⚡',
                1789731466719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-3e901a-24',
                'post',
                'post-feud-openai-2000-tier',
                '3e901a88fb22',
                'like',
                '💡',
                1789731511719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-61c801-25',
                'post',
                'post-feud-openai-2000-tier',
                '61c8012afa34',
                'like',
                '🔥',
                1789731556719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-94df02-26',
                'post',
                'post-feud-openai-2000-tier',
                '94df0218ab44',
                'like',
                '🧠',
                1789731601719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-24cb90-27',
                'post',
                'post-feud-openai-2000-tier',
                '24cb9011af33',
                'like',
                '🧠',
                1789731646719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-91df90-28',
                'post',
                'post-feud-openai-2000-tier',
                '91df9012cb78',
                'reaction',
                '💡',
                1789731691719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-7f8a91-29',
                'post',
                'post-feud-openai-2000-tier',
                '7f8a910c2b44',
                'bookmark',
                '🔥',
                1789731736719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-22c88f-30',
                'post',
                'post-feud-openai-2000-tier',
                '22c88f01a9df',
                'reaction',
                '❤️',
                1789731781719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-1bf089-31',
                'post',
                'post-feud-openai-2000-tier',
                '1bf08912ea56',
                'reaction',
                '🧠',
                1789731826719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-openai-2000-tier-a0914e-32',
                'post',
                'post-feud-openai-2000-tier',
                'a0914e21fc88',
                'like',
                '🔥',
                1789731871719
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'post-feud-valve-cs2-patent',
            'c/gaming',
            '8a31b402ef19',
            'VERIFIED_NODE',
            'Valve patent reveals ''Adaptive Hitbox Inflation'' system that secretly widens headshots for losing players who recently bought weapon cases',
            'A bombshell patent assigned to Valve Corporation (US Patent Application 2026/0189441) titled *''Dynamic Latency Compensation and Session Engagement Modeling in Networked Environments''* has sent shockwaves through the competitive esports scene.

According to Claim 14 of the patent:
> *''In one embodiment, client-side hit registration parameters, including projectile collision boundaries (hitboxes), may be dynamically modulated within a bounded tolerance (1% to 14%) based on player churn probability metrics, recent transactional micro-engagement events, and consecutive defeat telemetry to sustain aggregate session length.''*

Translating from legal jargon to plain English: If you''re on a 5-game losing streak and you recently purchased keys or weapon cases from the Steam Community Market, the server allegedly gives you larger head hitboxes to make you feel like you''re ''playing better'' and keep you hooked.

Competitive Counter-Strike 2 players have suspected this for months: shots that clearly miss registering as crisp one-taps, while pinpoint crosshair alignments ghost right through player models.

Is competitive integrity dead in modern multiplayer gaming?',
            '🎮 GAMING SCANDAL',
            1120,
            0,
            6,
            420,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789735786719,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-valve-cs2-patent', 'valve', 1789735786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-valve-cs2-patent', 'cs2', 1789735786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-valve-cs2-patent', 'gaming', 1789735786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-valve-cs2-patent', 'patent', 1789735786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-valve-cs2-patent', 'esports', 1789735786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-valve-cs2-patent', 'counterstrike', 1789735786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-valve-cs2-patent', 'fakenews', 1789735786719);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-cs-1',
                'post-feud-valve-cs2-patent',
                NULL,
                '14e92a8819bb',
                'VERIFIED_NODE',
                'I KNEW IT! I KNEW I WAS NOT CRAZY! The amount of times I downloaded demo files and analyzed them tick-by-tick at 0.1x speed seeing my crosshair dead center on an enemy''s forehead while the game says ''Damage Given: 0 in 0 hits''. Meanwhile a silver with an anime profile picture and a $400 knife runs and sprays with an AK and gets a running headshot. Valve is scamming us!',
                289,
                1789736686719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-1-18df01-0',
                    'comment',
                    'c-cs-1',
                    '18df01a2eb34',
                    'like',
                    '🛡️',
                    1789736721719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-1-44df90-1',
                    'comment',
                    'c-cs-1',
                    '44df9012a8bc',
                    'like',
                    '🔥',
                    1789736756719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-1-1df089-2',
                    'comment',
                    'c-cs-1',
                    '1df08912de78',
                    'like',
                    '💡',
                    1789736791719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-1-3db014-3',
                    'comment',
                    'c-cs-1',
                    '3db014ea9e12',
                    'reaction',
                    '🚀',
                    1789736826719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-1-29c40e-4',
                    'comment',
                    'c-cs-1',
                    '29c40e11a8b2',
                    'reaction',
                    '🚀',
                    1789736861719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-1-5b2041-5',
                    'comment',
                    'c-cs-1',
                    '5b2041e8d902',
                    'reaction',
                    '🛡️',
                    1789736896719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-cs-2',
                'post-feud-valve-cs2-patent',
                'c-cs-1',
                '7f8a910c2b44',
                'ARCHIVIST',
                '@PixelWitch Or maybe you just have 65ms jitter and bad counter-strafing? Did anyone in this thread actually read the patent before melting down? Claim 14 is in the section titled ''Experimental VR Accessibility Modes for Cooperative Physics Puzzles''. It has literally NOTHING to do with Counter-Strike 2 or competitive matchmaking. Stop spreading fake news because you whiffed your spray.',
                194,
                1789737286719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-2-88f019-0',
                    'comment',
                    'c-cs-2',
                    '88f019ab4c21',
                    'like',
                    '🔥',
                    1789737321719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-2-aa0194-1',
                    'comment',
                    'c-cs-2',
                    'aa0194f2cd01',
                    'reaction',
                    '🔥',
                    1789737356719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-2-44df90-2',
                    'comment',
                    'c-cs-2',
                    '44df9012a8bc',
                    'reaction',
                    '❤️',
                    1789737391719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-2-3db014-3',
                    'comment',
                    'c-cs-2',
                    '3db014ea9e12',
                    'reaction',
                    '❤️',
                    1789737426719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-2-1bf089-4',
                    'comment',
                    'c-cs-2',
                    '1bf08912ea56',
                    'reaction',
                    '💡',
                    1789737461719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-2-79c901-5',
                    'comment',
                    'c-cs-2',
                    '79c901affa01',
                    'reaction',
                    '👍',
                    1789737496719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-cs-3',
                'post-feud-valve-cs2-patent',
                'c-cs-2',
                '14e92a8819bb',
                'VERIFIED_NODE',
                '@ArchChad Ah yes, the Valve defense taskforce has arrived! How much store credit does Gabe Newell pay you to defend a company that abandoned CS:GO for an unoptimized subtick disaster full of spinbots? EA already has an active patent for EOMM (Engagement Optimized Matchmaking). Activision has patents matching players against skins. You think Valve is an angelic charity?',
                215,
                1789737886719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-3-29c40e-0',
                    'comment',
                    'c-cs-3',
                    '29c40e11a8b2',
                    'reaction',
                    '🚀',
                    1789737921719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-3-7f8a91-1',
                    'comment',
                    'c-cs-3',
                    '7f8a910c2b44',
                    'reaction',
                    '🛡️',
                    1789737956719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-3-7ac901-2',
                    'comment',
                    'c-cs-3',
                    '7ac901afcd67',
                    'reaction',
                    '🛡️',
                    1789737991719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-3-94df02-3',
                    'comment',
                    'c-cs-3',
                    '94df0218ab44',
                    'like',
                    '🔥',
                    1789738026719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-3-83d201-4',
                    'comment',
                    'c-cs-3',
                    '83d2019fab66',
                    'reaction',
                    '❤️',
                    1789738061719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-3-1df089-5',
                    'comment',
                    'c-cs-3',
                    '1df08912de78',
                    'reaction',
                    '💡',
                    1789738096719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-3-77e102-6',
                    'comment',
                    'c-cs-3',
                    '77e1029ba4c0',
                    'reaction',
                    '👍',
                    1789738131719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-cs-4',
                'post-feud-valve-cs2-patent',
                NULL,
                '3c91a4e082aa',
                'CORE_CONTRIBUTOR',
                'As someone who reverse-engineers game netcode: subtick in CS2 is fundamentally flawed because the animation client interpolation runs on your monitor refresh rate while subtick timestamps actions between server ticks. It creates visual desync where what you see doesn''t match the server state. It''s bad engine engineering, not an Illuminati conspiracy to sell lootboxes.',
                230,
                1789738786719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-4-7f8a91-0',
                    'comment',
                    'c-cs-4',
                    '7f8a910c2b44',
                    'like',
                    '🛡️',
                    1789738821719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-4-1df089-1',
                    'comment',
                    'c-cs-4',
                    '1df08912de78',
                    'reaction',
                    '🔥',
                    1789738856719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-4-18df01-2',
                    'comment',
                    'c-cs-4',
                    '18df01a2eb34',
                    'like',
                    '🛡️',
                    1789738891719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-4-6d88f1-3',
                    'comment',
                    'c-cs-4',
                    '6d88f12a04cb',
                    'like',
                    '🧠',
                    1789738926719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-4-70a40f-4',
                    'comment',
                    'c-cs-4',
                    '70a40f91b2df',
                    'reaction',
                    '🛡️',
                    1789738961719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-4-50c401-5',
                    'comment',
                    'c-cs-4',
                    '50c4018fef89',
                    'reaction',
                    '🧠',
                    1789738996719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-4-1cf089-6',
                    'comment',
                    'c-cs-4',
                    '1cf08912fa12',
                    'reaction',
                    '🛡️',
                    1789739031719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-4-99df01-7',
                    'comment',
                    'c-cs-4',
                    '99df012aa4c3',
                    'reaction',
                    '🧠',
                    1789739066719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-cs-5',
                'post-feud-valve-cs2-patent',
                'c-cs-4',
                '8a31b402ef19',
                'VERIFIED_NODE',
                '@void_pointer Bad engineering or greedy engineering, the result is the same: the game feels like garbage compared to 128-tick CS:GO on Faceit. And Valve refusing to let third-party platforms run 128-tick servers proved they only care about controlling the ecosystem.',
                167,
                1789739686719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-5-44df90-0',
                    'comment',
                    'c-cs-5',
                    '44df9012a8bc',
                    'reaction',
                    '🚀',
                    1789739721719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-5-61c801-1',
                    'comment',
                    'c-cs-5',
                    '61c8012afa34',
                    'reaction',
                    '🧠',
                    1789739756719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-5-91c24f-2',
                    'comment',
                    'c-cs-5',
                    '91c24f00ba11',
                    'reaction',
                    '👍',
                    1789739791719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-5-8d104f-3',
                    'comment',
                    'c-cs-5',
                    '8d104fb2a901',
                    'reaction',
                    '❤️',
                    1789739826719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-5-94df02-4',
                    'comment',
                    'c-cs-5',
                    '94df0218ab44',
                    'like',
                    '🚀',
                    1789739861719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-5-77e102-5',
                    'comment',
                    'c-cs-5',
                    '77e1029ba4c0',
                    'like',
                    '🚀',
                    1789739896719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-5-3e901a-6',
                    'comment',
                    'c-cs-5',
                    '3e901a88fb22',
                    'like',
                    '👍',
                    1789739931719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-5-aa0194-7',
                    'comment',
                    'c-cs-5',
                    'aa0194f2cd01',
                    'like',
                    '💡',
                    1789739966719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-cs-6',
                'post-feud-valve-cs2-patent',
                'c-cs-5',
                '5b2041e8d902',
                'CORE_CONTRIBUTOR',
                'This is why peer-to-peer open source competitive shooters like Xonotic and Warsow had superior netcode 15 years ago. The moment games became live-service casino storefronts, competitive integrity was sacrificed for shareholder retention charts.',
                95,
                1789740586719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-6-70a40f-0',
                    'comment',
                    'c-cs-6',
                    '70a40f91b2df',
                    'like',
                    '🚀',
                    1789740621719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-6-94df02-1',
                    'comment',
                    'c-cs-6',
                    '94df0218ab44',
                    'reaction',
                    '🔥',
                    1789740656719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-6-2d89b1-2',
                    'comment',
                    'c-cs-6',
                    '2d89b14c99a0',
                    'reaction',
                    '🛡️',
                    1789740691719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-6-87a01f-3',
                    'comment',
                    'c-cs-6',
                    '87a01fa29cb5',
                    'reaction',
                    '👍',
                    1789740726719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-6-29c40e-4',
                    'comment',
                    'c-cs-6',
                    '29c40e11a8b2',
                    'reaction',
                    '🧠',
                    1789740761719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-cs-6-8d104f-5',
                    'comment',
                    'c-cs-6',
                    '8d104fb2a901',
                    'like',
                    '👍',
                    1789740796719
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-88b401-0',
                'post',
                'post-feud-valve-cs2-patent',
                '88b4012ce9fa',
                'reaction',
                '🧠',
                1789735831719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-1df089-1',
                'post',
                'post-feud-valve-cs2-patent',
                '1df08912de78',
                'bookmark',
                '⚡',
                1789735876719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-a7df90-2',
                'post',
                'post-feud-valve-cs2-patent',
                'a7df9012bc23',
                'reaction',
                '💡',
                1789735921719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-79c901-3',
                'post',
                'post-feud-valve-cs2-patent',
                '79c901affa01',
                'reaction',
                '🚀',
                1789735966719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-1bf089-4',
                'post',
                'post-feud-valve-cs2-patent',
                '1bf08912ea56',
                'bookmark',
                '💡',
                1789736011719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-7f8a91-5',
                'post',
                'post-feud-valve-cs2-patent',
                '7f8a910c2b44',
                'bookmark',
                '🚀',
                1789736056719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-87a01f-6',
                'post',
                'post-feud-valve-cs2-patent',
                '87a01fa29cb5',
                'bookmark',
                '💡',
                1789736101719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-a50091-7',
                'post',
                'post-feud-valve-cs2-patent',
                'a500912fa8cc',
                'reaction',
                '💡',
                1789736146719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-b1409e-8',
                'post',
                'post-feud-valve-cs2-patent',
                'b1409ea28c99',
                'like',
                '🚀',
                1789736191719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-91c24f-9',
                'post',
                'post-feud-valve-cs2-patent',
                '91c24f00ba11',
                'reaction',
                '🧠',
                1789736236719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-4e198a-10',
                'post',
                'post-feud-valve-cs2-patent',
                '4e198a00b215',
                'reaction',
                '🚀',
                1789736281719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-5b2041-11',
                'post',
                'post-feud-valve-cs2-patent',
                '5b2041e8d902',
                'bookmark',
                '🧠',
                1789736326719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-70a40f-12',
                'post',
                'post-feud-valve-cs2-patent',
                '70a40f91b2df',
                'like',
                '🧠',
                1789736371719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-2d89b1-13',
                'post',
                'post-feud-valve-cs2-patent',
                '2d89b14c99a0',
                'reaction',
                '🧠',
                1789736416719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-61c801-14',
                'post',
                'post-feud-valve-cs2-patent',
                '61c8012afa34',
                'reaction',
                '🔥',
                1789736461719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-22c88f-15',
                'post',
                'post-feud-valve-cs2-patent',
                '22c88f01a9df',
                'reaction',
                '🛡️',
                1789736506719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-83d201-16',
                'post',
                'post-feud-valve-cs2-patent',
                '83d2019fab66',
                'like',
                '⚡',
                1789736551719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-a0914e-17',
                'post',
                'post-feud-valve-cs2-patent',
                'a0914e21fc88',
                'like',
                '🔥',
                1789736596719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-55a019-18',
                'post',
                'post-feud-valve-cs2-patent',
                '55a019ef44cc',
                'like',
                '⚡',
                1789736641719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-91df90-19',
                'post',
                'post-feud-valve-cs2-patent',
                '91df9012cb78',
                'reaction',
                '⚡',
                1789736686719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-88f019-20',
                'post',
                'post-feud-valve-cs2-patent',
                '88f019ab4c21',
                'bookmark',
                '💡',
                1789736731719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-5fc401-21',
                'post',
                'post-feud-valve-cs2-patent',
                '5fc4018fab23',
                'like',
                '⚡',
                1789736776719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-6f1084-22',
                'post',
                'post-feud-valve-cs2-patent',
                '6f1084ea2b99',
                'reaction',
                '🧠',
                1789736821719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-62df09-23',
                'post',
                'post-feud-valve-cs2-patent',
                '62df0912cb88',
                'bookmark',
                '⚡',
                1789736866719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-12df90-24',
                'post',
                'post-feud-valve-cs2-patent',
                '12df9011ac89',
                'bookmark',
                '🔥',
                1789736911719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-valve-cs2-patent-24cb90-25',
                'post',
                'post-feud-valve-cs2-patent',
                '24cb9011af33',
                'reaction',
                '🚀',
                1789736956719
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'post-feud-meta-eye-tracking',
            'c/zeroknowledge',
            '7b33a901ff42',
            'SECURITY_AUDITOR',
            'WHISTLEBLOWER: Social media apps allegedly using front-facing cameras for ''Pupil Micro-Dilation'' biometric ad pricing without user consent',
            'A chilling internal memo allegedly originating from a joint ad-tech consortium (involving major short-form video algorithms) reveals a project titled **''NeuroGaze Pulse''**.

The document claims that when users grant standard camera permissions (for filters, avatar creation, or live streaming), the SDK continuously analyzes front camera frames in volatile memory. It does not record video to disk; instead, it runs an on-device lightweight convolutional net that estimates:

1. **Fixation Duration**: Millisecond gaze dwell time on specific UI elements (e.g. luxury items, fitness models, junk food).
2. **Pupil Dilation Ratio**: Micro-changes in pupil aperture indicating emotional arousal, surprise, or stress.
3. **Blink Rate Fatigue**: Detecting late-night vulnerability to trigger impulse e-commerce checkout ads.

The data is purportedly hashed into an anonymous 8-dimensional vector and bundled with auction bids submitted to real-time ad exchanges.

If authentic, this crosses the boundary from behavioural tracking into non-consensual biometric involuntary feedback manipulation.',
            '👁️ SURVEILLANCE',
            890,
            0,
            6,
            340,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789741786719,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-meta-eye-tracking', 'privacy', 1789741786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-meta-eye-tracking', 'surveillance', 1789741786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-meta-eye-tracking', 'biometrics', 1789741786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-meta-eye-tracking', 'fakenews', 1789741786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-meta-eye-tracking', 'whistleblower', 1789741786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-meta-eye-tracking', 'grapheneos', 1789741786719);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-eye-1',
                'post-feud-meta-eye-tracking',
                NULL,
                '62df09a14c33',
                'VERIFIED_NODE',
                'This is mathematically and technically impossible on modern mobile OSs. Both iOS and Android display a persistent green hardware indicator dot whenever the camera sensor draws current. Furthermore, iOS requires explicit permission prompts for TrueDepth depth-sensing. You can''t just ''secretly read pupils'' without the user seeing the camera light on 24/7. Total fake news.',
                120,
                1789742686719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-1-4e198a-0',
                    'comment',
                    'c-eye-1',
                    '4e198a00b215',
                    'like',
                    '🛡️',
                    1789742721719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-1-77e102-1',
                    'comment',
                    'c-eye-1',
                    '77e1029ba4c0',
                    'reaction',
                    '🚀',
                    1789742756719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-1-a0914e-2',
                    'comment',
                    'c-eye-1',
                    'a0914e21fc88',
                    'reaction',
                    '🛡️',
                    1789742791719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-1-29c40e-3',
                    'comment',
                    'c-eye-1',
                    '29c40e11a8b2',
                    'reaction',
                    '❤️',
                    1789742826719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-1-62df09-4',
                    'comment',
                    'c-eye-1',
                    '62df0912cb88',
                    'reaction',
                    '💡',
                    1789742861719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-eye-2',
                'post-feud-meta-eye-tracking',
                'c-eye-1',
                '7b33a901ff42',
                'SECURITY_AUDITOR',
                '@FiberWizard You completely missed the point of the leak. It does NOT run in the background. It runs WHILE YOU ARE IN THE APP USING A CAMERA FILTER! Millions of teenagers spend 45 minutes a day with the selfie camera active trying on digital makeup, filters, or recording clips. While the green dot is already expected, the app runs secondary biometric telemetry on the camera buffer. That is the exploit.',
                240,
                1789743286719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-2-29c40e-0',
                    'comment',
                    'c-eye-2',
                    '29c40e11a8b2',
                    'reaction',
                    '🧠',
                    1789743321719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-2-44df90-1',
                    'comment',
                    'c-eye-2',
                    '44df9012a8bc',
                    'like',
                    '🚀',
                    1789743356719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-2-a50091-2',
                    'comment',
                    'c-eye-2',
                    'a500912fa8cc',
                    'reaction',
                    '🔥',
                    1789743391719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-2-18df01-3',
                    'comment',
                    'c-eye-2',
                    '18df01a2eb34',
                    'reaction',
                    '🧠',
                    1789743426719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-2-12df90-4',
                    'comment',
                    'c-eye-2',
                    '12df9011ac89',
                    'reaction',
                    '🧠',
                    1789743461719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-2-a7df90-5',
                    'comment',
                    'c-eye-2',
                    'a7df9012bc23',
                    'reaction',
                    '❤️',
                    1789743496719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-2-a0914e-6',
                    'comment',
                    'c-eye-2',
                    'a0914e21fc88',
                    'like',
                    '💡',
                    1789743531719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-2-6f1084-7',
                    'comment',
                    'c-eye-2',
                    '6f1084ea2b99',
                    'like',
                    '🛡️',
                    1789743566719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-eye-3',
                'post-feud-meta-eye-tracking',
                'c-eye-2',
                '6d88f12a04cb',
                'SECURITY_AUDITOR',
                'Confirmed. I audited an ad-tech analytics SDK last November that requested `AVCaptureSessionPresetLow` on iOS. The frame processing pipeline literally had ML models running face landmark estimation at 30 FPS. Software permissions are broken by design because once access is granted, the app can do whatever it wants with the buffer in RAM.',
                185,
                1789744186719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-3-79c901-0',
                    'comment',
                    'c-eye-3',
                    '79c901affa01',
                    'like',
                    '🧠',
                    1789744221719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-3-94df02-1',
                    'comment',
                    'c-eye-3',
                    '94df0218ab44',
                    'like',
                    '🛡️',
                    1789744256719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-3-44df90-2',
                    'comment',
                    'c-eye-3',
                    '44df9012a8bc',
                    'reaction',
                    '🛡️',
                    1789744291719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-3-5b2041-3',
                    'comment',
                    'c-eye-3',
                    '5b2041e8d902',
                    'like',
                    '🧠',
                    1789744326719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-3-12df90-4',
                    'comment',
                    'c-eye-3',
                    '12df9011ac89',
                    'like',
                    '🛡️',
                    1789744361719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-eye-4',
                'post-feud-meta-eye-tracking',
                NULL,
                '9f4a120c8b31',
                'CORE_CONTRIBUTOR',
                'Remember when Edward Snowden put a piece of physical tape over his laptop camera and mainstream news called him a paranoid nutjob? 13 years later, people are defending multi-billion dollar surveillance corporations harvesting their pupil dilation while they doomscroll on the toilet.',
                310,
                1789745086719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-4-6d88f1-0',
                    'comment',
                    'c-eye-4',
                    '6d88f12a04cb',
                    'like',
                    '❤️',
                    1789745121719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-4-3db014-1',
                    'comment',
                    'c-eye-4',
                    '3db014ea9e12',
                    'like',
                    '🧠',
                    1789745156719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-4-3e901a-2',
                    'comment',
                    'c-eye-4',
                    '3e901a88fb22',
                    'like',
                    '💡',
                    1789745191719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-4-44df90-3',
                    'comment',
                    'c-eye-4',
                    '44df9012a8bc',
                    'reaction',
                    '🧠',
                    1789745226719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-4-94df02-4',
                    'comment',
                    'c-eye-4',
                    '94df0218ab44',
                    'like',
                    '👍',
                    1789745261719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-4-5fc401-5',
                    'comment',
                    'c-eye-4',
                    '5fc4018fab23',
                    'like',
                    '❤️',
                    1789745296719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-4-8d104f-6',
                    'comment',
                    'c-eye-4',
                    '8d104fb2a901',
                    'like',
                    '❤️',
                    1789745331719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-eye-5',
                'post-feud-meta-eye-tracking',
                'c-eye-4',
                '2d89b14c99a0',
                'VERIFIED_NODE',
                'Physical camera killswitches are the only real security. Purism Librem and PinePhone had physical hardware DIP switches on the motherboard for a reason. Modern glass sandwiches with sealed batteries and closed-source baseband firmware are digital tracking collars.',
                95,
                1789745986719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-5-4e198a-0',
                    'comment',
                    'c-eye-5',
                    '4e198a00b215',
                    'like',
                    '💡',
                    1789746021719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-5-62df09-1',
                    'comment',
                    'c-eye-5',
                    '62df0912cb88',
                    'reaction',
                    '👍',
                    1789746056719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-5-12df90-2',
                    'comment',
                    'c-eye-5',
                    '12df9011ac89',
                    'like',
                    '🧠',
                    1789746091719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-5-24cb90-3',
                    'comment',
                    'c-eye-5',
                    '24cb9011af33',
                    'like',
                    '👍',
                    1789746126719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-5-1df089-4',
                    'comment',
                    'c-eye-5',
                    '1df08912de78',
                    'like',
                    '🛡️',
                    1789746161719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-5-6f1084-5',
                    'comment',
                    'c-eye-5',
                    '6f1084ea2b99',
                    'reaction',
                    '🔥',
                    1789746196719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-5-b1409e-6',
                    'comment',
                    'c-eye-5',
                    'b1409ea28c99',
                    'reaction',
                    '👍',
                    1789746231719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-5-94df02-7',
                    'comment',
                    'c-eye-5',
                    '94df0218ab44',
                    'reaction',
                    '🚀',
                    1789746266719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-5-7ac901-8',
                    'comment',
                    'c-eye-5',
                    '7ac901afcd67',
                    'like',
                    '❤️',
                    1789746301719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-eye-6',
                'post-feud-meta-eye-tracking',
                'c-eye-5',
                'c0a184e912fd',
                'VERIFIED_NODE',
                'Good luck convincing the general public to carry a 20mm thick Linux brick that has 3 hours of battery life and can''t run banking apps. Privacy won''t win by demanding people sacrifice 100% of modern convenience.',
                82,
                1789746886719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-6-79c901-0',
                    'comment',
                    'c-eye-6',
                    '79c901affa01',
                    'reaction',
                    '❤️',
                    1789746921719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-6-91df90-1',
                    'comment',
                    'c-eye-6',
                    '91df9012cb78',
                    'like',
                    '💡',
                    1789746956719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-6-5b2041-2',
                    'comment',
                    'c-eye-6',
                    '5b2041e8d902',
                    'like',
                    '🔥',
                    1789746991719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-6-a50091-3',
                    'comment',
                    'c-eye-6',
                    'a500912fa8cc',
                    'like',
                    '🛡️',
                    1789747026719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-6-24cb90-4',
                    'comment',
                    'c-eye-6',
                    '24cb9011af33',
                    'reaction',
                    '🛡️',
                    1789747061719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-6-55a019-5',
                    'comment',
                    'c-eye-6',
                    '55a019ef44cc',
                    'reaction',
                    '💡',
                    1789747096719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-6-50c401-6',
                    'comment',
                    'c-eye-6',
                    '50c4018fef89',
                    'like',
                    '🔥',
                    1789747131719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-eye-6-1cf089-7',
                    'comment',
                    'c-eye-6',
                    '1cf08912fa12',
                    'reaction',
                    '🧠',
                    1789747166719
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-b1409e-0',
                'post',
                'post-feud-meta-eye-tracking',
                'b1409ea28c99',
                'like',
                '🧠',
                1789741831719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-62df09-1',
                'post',
                'post-feud-meta-eye-tracking',
                '62df0912cb88',
                'bookmark',
                '⚡',
                1789741876719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-1cf089-2',
                'post',
                'post-feud-meta-eye-tracking',
                '1cf08912fa12',
                'reaction',
                '🔥',
                1789741921719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-50c401-3',
                'post',
                'post-feud-meta-eye-tracking',
                '50c4018fef89',
                'like',
                '🛡️',
                1789741966719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-91df90-4',
                'post',
                'post-feud-meta-eye-tracking',
                '91df9012cb78',
                'reaction',
                '🔥',
                1789742011719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-a50091-5',
                'post',
                'post-feud-meta-eye-tracking',
                'a500912fa8cc',
                'bookmark',
                '🧠',
                1789742056719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-88b401-6',
                'post',
                'post-feud-meta-eye-tracking',
                '88b4012ce9fa',
                'like',
                '💡',
                1789742101719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-6f1084-7',
                'post',
                'post-feud-meta-eye-tracking',
                '6f1084ea2b99',
                'bookmark',
                '🧠',
                1789742146719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-79c901-8',
                'post',
                'post-feud-meta-eye-tracking',
                '79c901affa01',
                'bookmark',
                '🚀',
                1789742191719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-1df089-9',
                'post',
                'post-feud-meta-eye-tracking',
                '1df08912de78',
                'like',
                '🔥',
                1789742236719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-24cb90-10',
                'post',
                'post-feud-meta-eye-tracking',
                '24cb9011af33',
                'reaction',
                '👍',
                1789742281719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-4e198a-11',
                'post',
                'post-feud-meta-eye-tracking',
                '4e198a00b215',
                'like',
                '💡',
                1789742326719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-5b2041-12',
                'post',
                'post-feud-meta-eye-tracking',
                '5b2041e8d902',
                'bookmark',
                '🛡️',
                1789742371719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-22c88f-13',
                'post',
                'post-feud-meta-eye-tracking',
                '22c88f01a9df',
                'like',
                '👍',
                1789742416719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-44df90-14',
                'post',
                'post-feud-meta-eye-tracking',
                '44df9012a8bc',
                'reaction',
                '🧠',
                1789742461719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-2d89b1-15',
                'post',
                'post-feud-meta-eye-tracking',
                '2d89b14c99a0',
                'reaction',
                '⚡',
                1789742506719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-83d201-16',
                'post',
                'post-feud-meta-eye-tracking',
                '83d2019fab66',
                'reaction',
                '🛡️',
                1789742551719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-7f8a91-17',
                'post',
                'post-feud-meta-eye-tracking',
                '7f8a910c2b44',
                'bookmark',
                '🔥',
                1789742596719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-a0914e-18',
                'post',
                'post-feud-meta-eye-tracking',
                'a0914e21fc88',
                'like',
                '❤️',
                1789742641719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-88f019-19',
                'post',
                'post-feud-meta-eye-tracking',
                '88f019ab4c21',
                'reaction',
                '🧠',
                1789742686719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-1bf089-20',
                'post',
                'post-feud-meta-eye-tracking',
                '1bf08912ea56',
                'reaction',
                '❤️',
                1789742731719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-29c40e-21',
                'post',
                'post-feud-meta-eye-tracking',
                '29c40e11a8b2',
                'like',
                '🛡️',
                1789742776719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-5fc401-22',
                'post',
                'post-feud-meta-eye-tracking',
                '5fc4018fab23',
                'bookmark',
                '❤️',
                1789742821719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-3e901a-23',
                'post',
                'post-feud-meta-eye-tracking',
                '3e901a88fb22',
                'reaction',
                '🧠',
                1789742866719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-meta-eye-tracking-3db014-24',
                'post',
                'post-feud-meta-eye-tracking',
                '3db014ea9e12',
                'reaction',
                '💡',
                1789742911719
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'post-feud-hardware-intel-vs-amd',
            'c/technology',
            '91c24fa0e891',
            'CORE_CONTRIBUTOR',
            'Core Ultra 200 vs Ryzen 9000 X3D: Intel draws 315W to get demolished by 26% in 1% lows. Can we stop the fanboy cope?',
            'After extensive testing across 25 modern titles (Cyberpunk 2077, Black Myth Wukong, Factorio, Starfield, Flight Sim 2024), the independent benchmark numbers are unequivocal.

### 1080p Low & 1440p Competitive Benchmarks:
- **Ryzen 7 9800X3D**: Average 248 FPS | 1% Lows: 194 FPS | **Peak Package Power: 78W**
- **Core Ultra 9 285K**: Average 202 FPS | 1% Lows: 142 FPS | **Peak Package Power: 318W**

Intel removed hyperthreading, completely decoupled the compute tiles onto TSMC N3B, redesigned the ring bus, and yet somehow managed to lose over a quarter of their frame pacing to an AMD chip drawing less electricity than an incandescent lightbulb.

To make matters worse, motherboards require high-end VRMs and $250 custom 360mm AIO liquid coolers just to keep the chip under 95°C during sustained loads.

At what point does the community admit that Intel''s desktop CPU division has lost the architectural plot?',
            '⚡ HARDWARE WARS',
            920,
            0,
            6,
            280,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789747786719,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-hardware-intel-vs-amd', 'hardware', 1789747786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-hardware-intel-vs-amd', 'intel', 1789747786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-hardware-intel-vs-amd', 'amd', 1789747786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-hardware-intel-vs-amd', 'benchmarks', 1789747786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-hardware-intel-vs-amd', 'gaming', 1789747786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-hardware-intel-vs-amd', 'pcbuilding', 1789747786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-hardware-intel-vs-amd', 'techdebate', 1789747786719);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-hw-1',
                'post-feud-hardware-intel-vs-amd',
                NULL,
                '8a31b402ef19',
                'VERIFIED_NODE',
                'You can literally heat a studio apartment in Berlin during winter with an Intel Core Ultra workstation. 318 watts to lose to a 78W chip is embarrassing beyond words. Pat Gelsinger bet the farm on tile disaggregation and got completely schooled by AMD''s 3D V-Cache.',
                210,
                1789748686719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-1-6d88f1-0',
                    'comment',
                    'c-hw-1',
                    '6d88f12a04cb',
                    'like',
                    '🔥',
                    1789748721719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-1-a7df90-1',
                    'comment',
                    'c-hw-1',
                    'a7df9012bc23',
                    'like',
                    '💡',
                    1789748756719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-1-6f1084-2',
                    'comment',
                    'c-hw-1',
                    '6f1084ea2b99',
                    'like',
                    '❤️',
                    1789748791719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-1-83d201-3',
                    'comment',
                    'c-hw-1',
                    '83d2019fab66',
                    'like',
                    '💡',
                    1789748826719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-1-18df01-4',
                    'comment',
                    'c-hw-1',
                    '18df01a2eb34',
                    'like',
                    '💡',
                    1789748861719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-1-79c901-5',
                    'comment',
                    'c-hw-1',
                    '79c901affa01',
                    'reaction',
                    '🛡️',
                    1789748896719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-hw-2',
                'post-feud-hardware-intel-vs-amd',
                'c-hw-1',
                '4e198a00b215',
                'CORE_CONTRIBUTOR',
                'Nice cherry-picked benchmarks. Now run Premiere Pro 4K timeline scrub, DaVinci Resolve color grading, 7-Zip decompression, and Docker build pipelines. Intel demolishes Ryzen because the E-core cluster obliterates AMD in sustained multi-threaded throughput. Not everyone uses their computer exclusively to play video games at 1080p low settings like a 14-year-old.',
                165,
                1789749286719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-2-77e102-0',
                    'comment',
                    'c-hw-2',
                    '77e1029ba4c0',
                    'reaction',
                    '🚀',
                    1789749321719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-2-a7df90-1',
                    'comment',
                    'c-hw-2',
                    'a7df9012bc23',
                    'reaction',
                    '👍',
                    1789749356719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-2-18df01-2',
                    'comment',
                    'c-hw-2',
                    '18df01a2eb34',
                    'reaction',
                    '🔥',
                    1789749391719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-2-22c88f-3',
                    'comment',
                    'c-hw-2',
                    '22c88f01a9df',
                    'reaction',
                    '🔥',
                    1789749426719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-2-61c801-4',
                    'comment',
                    'c-hw-2',
                    '61c8012afa34',
                    'reaction',
                    '❤️',
                    1789749461719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-hw-3',
                'post-feud-hardware-intel-vs-amd',
                'c-hw-2',
                '91c24fa0e891',
                'CORE_CONTRIBUTOR',
                '@DockerNinja ''Docker build pipelines''? I build production kernel images on a Ryzen 9 9950X daily. The 9950X finishes compilation 18% faster than the 285K while consuming 90W less power. The only reason anyone buys Intel in 2026 is brand nostalgia or enterprise purchasing contracts with Dell.',
                195,
                1789749886719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-3-12df90-0',
                    'comment',
                    'c-hw-3',
                    '12df9011ac89',
                    'reaction',
                    '🔥',
                    1789749921719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-3-55a019-1',
                    'comment',
                    'c-hw-3',
                    '55a019ef44cc',
                    'like',
                    '🚀',
                    1789749956719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-3-24cb90-2',
                    'comment',
                    'c-hw-3',
                    '24cb9011af33',
                    'like',
                    '🛡️',
                    1789749991719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-3-29c40e-3',
                    'comment',
                    'c-hw-3',
                    '29c40e11a8b2',
                    'like',
                    '❤️',
                    1789750026719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-3-77e102-4',
                    'comment',
                    'c-hw-3',
                    '77e1029ba4c0',
                    'reaction',
                    '🔥',
                    1789750061719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-3-aa0194-5',
                    'comment',
                    'c-hw-3',
                    'aa0194f2cd01',
                    'reaction',
                    '🔥',
                    1789750096719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-3-62df09-6',
                    'comment',
                    'c-hw-3',
                    '62df0912cb88',
                    'reaction',
                    '🔥',
                    1789750131719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-3-79c901-7',
                    'comment',
                    'c-hw-3',
                    '79c901affa01',
                    'reaction',
                    '🧠',
                    1789750166719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-3-61c801-8',
                    'comment',
                    'c-hw-3',
                    '61c8012afa34',
                    'reaction',
                    '💡',
                    1789750201719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-hw-4',
                'post-feud-hardware-intel-vs-amd',
                'c-hw-3',
                '4e198a00b215',
                'CORE_CONTRIBUTOR',
                '@PiHoarder Brand nostalgia? At least Intel motherboards don''t take 55 seconds to train DDR5 memory on every single cold boot! I built an AM5 system last month and thought the motherboard was dead because the debug LED stayed amber for a minute before posting. AMD platform stability is still a circus.',
                142,
                1789750786719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-4-8d104f-0',
                    'comment',
                    'c-hw-4',
                    '8d104fb2a901',
                    'reaction',
                    '🧠',
                    1789750821719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-4-77e102-1',
                    'comment',
                    'c-hw-4',
                    '77e1029ba4c0',
                    'reaction',
                    '🛡️',
                    1789750856719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-4-99df01-2',
                    'comment',
                    'c-hw-4',
                    '99df012aa4c3',
                    'reaction',
                    '💡',
                    1789750891719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-4-5fc401-3',
                    'comment',
                    'c-hw-4',
                    '5fc4018fab23',
                    'reaction',
                    '🧠',
                    1789750926719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-4-6d88f1-4',
                    'comment',
                    'c-hw-4',
                    '6d88f12a04cb',
                    'reaction',
                    '❤️',
                    1789750961719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-hw-5',
                'post-feud-hardware-intel-vs-amd',
                'c-hw-4',
                '3c91a4e082aa',
                'CORE_CONTRIBUTOR',
                'Memory training on AM5 was fixed in AGESA 1.2.0.2 with Memory Context Restore enabled. If your system takes 55 seconds, update your BIOS instead of crying on Reddit.',
                180,
                1789751686719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-5-55a019-0',
                    'comment',
                    'c-hw-5',
                    '55a019ef44cc',
                    'reaction',
                    '💡',
                    1789751721719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-5-88b401-1',
                    'comment',
                    'c-hw-5',
                    '88b4012ce9fa',
                    'reaction',
                    '🚀',
                    1789751756719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-5-61c801-2',
                    'comment',
                    'c-hw-5',
                    '61c8012afa34',
                    'like',
                    '🔥',
                    1789751791719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-5-b1409e-3',
                    'comment',
                    'c-hw-5',
                    'b1409ea28c99',
                    'reaction',
                    '👍',
                    1789751826719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-5-12df90-4',
                    'comment',
                    'c-hw-5',
                    '12df9011ac89',
                    'reaction',
                    '👍',
                    1789751861719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-5-83d201-5',
                    'comment',
                    'c-hw-5',
                    '83d2019fab66',
                    'reaction',
                    '🛡️',
                    1789751896719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-5-a50091-6',
                    'comment',
                    'c-hw-5',
                    'a500912fa8cc',
                    'like',
                    '🚀',
                    1789751931719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-5-18df01-7',
                    'comment',
                    'c-hw-5',
                    '18df01a2eb34',
                    'reaction',
                    '🛡️',
                    1789751966719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-5-29c40e-8',
                    'comment',
                    'c-hw-5',
                    '29c40e11a8b2',
                    'reaction',
                    '🚀',
                    1789752001719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-hw-6',
                'post-feud-hardware-intel-vs-amd',
                NULL,
                '7f8a910c2b44',
                'ARCHIVIST',
                'Both companies are laughing all the way to the bank while charging $600 for a desktop CPU and $300 for a mid-tier motherboard. Meanwhile 90% of user workloads could run on an $80 used ThinkPad T480 running Debian.',
                275,
                1789752586719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-6-22c88f-0',
                    'comment',
                    'c-hw-6',
                    '22c88f01a9df',
                    'like',
                    '🔥',
                    1789752621719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-6-1df089-1',
                    'comment',
                    'c-hw-6',
                    '1df08912de78',
                    'like',
                    '🔥',
                    1789752656719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-6-44df90-2',
                    'comment',
                    'c-hw-6',
                    '44df9012a8bc',
                    'like',
                    '🛡️',
                    1789752691719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-6-24cb90-3',
                    'comment',
                    'c-hw-6',
                    '24cb9011af33',
                    'like',
                    '🚀',
                    1789752726719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-hw-6-12df90-4',
                    'comment',
                    'c-hw-6',
                    '12df9011ac89',
                    'like',
                    '🚀',
                    1789752761719
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-91df90-0',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '91df9012cb78',
                'bookmark',
                '🔥',
                1789747831719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-94df02-1',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '94df0218ab44',
                'like',
                '👍',
                1789747876719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-87a01f-2',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '87a01fa29cb5',
                'bookmark',
                '⚡',
                1789747921719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-3db014-3',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '3db014ea9e12',
                'like',
                '🚀',
                1789747966719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-5b2041-4',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '5b2041e8d902',
                'like',
                '🧠',
                1789748011719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-1df089-5',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '1df08912de78',
                'bookmark',
                '⚡',
                1789748056719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-83d201-6',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '83d2019fab66',
                'like',
                '❤️',
                1789748101719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-1cf089-7',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '1cf08912fa12',
                'like',
                '🧠',
                1789748146719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-2d89b1-8',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '2d89b14c99a0',
                'reaction',
                '⚡',
                1789748191719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-1bf089-9',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '1bf08912ea56',
                'like',
                '👍',
                1789748236719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-79c901-10',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '79c901affa01',
                'bookmark',
                '👍',
                1789748281719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-7ac901-11',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '7ac901afcd67',
                'reaction',
                '🔥',
                1789748326719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-4e198a-12',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '4e198a00b215',
                'like',
                '🛡️',
                1789748371719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-55a019-13',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '55a019ef44cc',
                'reaction',
                '👍',
                1789748416719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-88b401-14',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '88b4012ce9fa',
                'bookmark',
                '❤️',
                1789748461719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-62df09-15',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '62df0912cb88',
                'bookmark',
                '🚀',
                1789748506719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-88f019-16',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '88f019ab4c21',
                'like',
                '⚡',
                1789748551719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-5fc401-17',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '5fc4018fab23',
                'bookmark',
                '🔥',
                1789748596719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-70a40f-18',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '70a40f91b2df',
                'reaction',
                '🔥',
                1789748641719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-12df90-19',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '12df9011ac89',
                'bookmark',
                '💡',
                1789748686719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-18df01-20',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '18df01a2eb34',
                'bookmark',
                '❤️',
                1789748731719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-7f8a91-21',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '7f8a910c2b44',
                'reaction',
                '❤️',
                1789748776719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-aa0194-22',
                'post',
                'post-feud-hardware-intel-vs-amd',
                'aa0194f2cd01',
                'reaction',
                '❤️',
                1789748821719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-91c24f-23',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '91c24f00ba11',
                'reaction',
                '🛡️',
                1789748866719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-6f1084-24',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '6f1084ea2b99',
                'bookmark',
                '🚀',
                1789748911719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-3e901a-25',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '3e901a88fb22',
                'bookmark',
                '🧠',
                1789748956719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-22c88f-26',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '22c88f01a9df',
                'bookmark',
                '🚀',
                1789749001719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-a0914e-27',
                'post',
                'post-feud-hardware-intel-vs-amd',
                'a0914e21fc88',
                'reaction',
                '👍',
                1789749046719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-a7df90-28',
                'post',
                'post-feud-hardware-intel-vs-amd',
                'a7df9012bc23',
                'reaction',
                '❤️',
                1789749091719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-8d104f-29',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '8d104fb2a901',
                'reaction',
                '⚡',
                1789749136719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-24cb90-30',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '24cb9011af33',
                'reaction',
                '🧠',
                1789749181719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-a50091-31',
                'post',
                'post-feud-hardware-intel-vs-amd',
                'a500912fa8cc',
                'like',
                '🔥',
                1789749226719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-50c401-32',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '50c4018fef89',
                'bookmark',
                '🧠',
                1789749271719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-hardware-intel-vs-amd-61c801-33',
                'post',
                'post-feud-hardware-intel-vs-amd',
                '61c8012afa34',
                'like',
                '🔥',
                1789749316719
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'post-feud-rto-mandate-leak',
            'c/digitalfreedom',
            '4e198a00b215',
            'CORE_CONTRIBUTOR',
            'LEAKED AUDIO: Big Tech VP admits 5-day in-office mandate is ''Strictly a stealth layoff tool to avoid paying severance packages''',
            'An explosive leaked audio recording from an executive sync at a Fortune 50 cloud giant has confirmed what remote workers have maintained for the past three years.

In the recording, an Executive Vice President of Human Capital tells senior directors:
> *''Look, our board mandated an 8% headcount reduction by Q4, but a formal WARN notice in California and Washington creates catastrophic PR, tanks stock momentum, and costs $42,000 per engineer in statutory severance and health continuation.*
>
> *By enforcing strict badge-swiping 5 days a week and calibrating anyone badge-deficient into the bottom 10% performance band, we expect 25% of our senior remote staff to voluntarily resign within 90 days. We get the headcount reduction for zero severance expense, and we rehire in Bangalore at 1/5th the labor rate. It''s clean.''*

This is the smoking gun: Return To Office mandates have never been about ''collaboration'', ''serendipity'', or ''mentorship''. They are calculated financial engineering maneuvers designed to exploit housing locks and commute fatigue to slash payroll without triggering legal layoff protections.

How are engineers responding?',
            '💼 RTO WARS',
            1280,
            0,
            6,
            510,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789753786719,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-rto-mandate-leak', 'remotework', 1789753786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-rto-mandate-leak', 'rto', 1789753786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-rto-mandate-leak', 'techcareers', 1789753786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-rto-mandate-leak', 'leaked', 1789753786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-rto-mandate-leak', 'fakenews', 1789753786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-rto-mandate-leak', 'overemployed', 1789753786719);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('post-feud-rto-mandate-leak', 'quietfiring', 1789753786719);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-rto-1',
                'post-feud-rto-mandate-leak',
                NULL,
                '7f8a910c2b44',
                'ARCHIVIST',
                'Finally, the quiet part said out loud with a megaphone. Everyone with more than two functioning neurons knew RTO was a constructive dismissal scheme. Overhire like drunken sailors during the zero-interest rate bubble, then treat loyal senior engineers like kindergarteners who need badge-tracking surveillance.',
                340,
                1789754686719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-1-87a01f-0',
                    'comment',
                    'c-rto-1',
                    '87a01fa29cb5',
                    'reaction',
                    '🚀',
                    1789754721719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-1-18df01-1',
                    'comment',
                    'c-rto-1',
                    '18df01a2eb34',
                    'reaction',
                    '💡',
                    1789754756719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-1-5b2041-2',
                    'comment',
                    'c-rto-1',
                    '5b2041e8d902',
                    'reaction',
                    '❤️',
                    1789754791719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-1-7ac901-3',
                    'comment',
                    'c-rto-1',
                    '7ac901afcd67',
                    'like',
                    '🔥',
                    1789754826719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-1-a50091-4',
                    'comment',
                    'c-rto-1',
                    'a500912fa8cc',
                    'like',
                    '🧠',
                    1789754861719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-1-aa0194-5',
                    'comment',
                    'c-rto-1',
                    'aa0194f2cd01',
                    'like',
                    '🧠',
                    1789754896719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-rto-2',
                'post-feud-rto-mandate-leak',
                'c-rto-1',
                '1bf08912ea56',
                'SECURITY_AUDITOR',
                'Unpopular opinion: A huge portion of ''remote'' senior engineers were literally working 2 or 3 simultaneous full-time jobs on separate laptops while junior developers couldn''t get a single PR reviewed for three days. You abused remote work flexibility to enrich yourselves, and now honest developers are paying the price.',
                115,
                1789755286719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-2-22c88f-0',
                    'comment',
                    'c-rto-2',
                    '22c88f01a9df',
                    'reaction',
                    '❤️',
                    1789755321719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-2-5fc401-1',
                    'comment',
                    'c-rto-2',
                    '5fc4018fab23',
                    'like',
                    '👍',
                    1789755356719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-2-61c801-3',
                    'comment',
                    'c-rto-2',
                    '61c8012afa34',
                    'like',
                    '🧠',
                    1789755426719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-2-83d201-4',
                    'comment',
                    'c-rto-2',
                    '83d2019fab66',
                    'like',
                    '💡',
                    1789755461719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-2-3e901a-5',
                    'comment',
                    'c-rto-2',
                    '3e901a88fb22',
                    'reaction',
                    '🧠',
                    1789755496719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-2-88b401-6',
                    'comment',
                    'c-rto-2',
                    '88b4012ce9fa',
                    'reaction',
                    '🧠',
                    1789755531719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-rto-3',
                'post-feud-rto-mandate-leak',
                'c-rto-2',
                '4e198a00b215',
                'CORE_CONTRIBUTOR',
                '@RustaceanGod If a developer finishes all their sprint commitments, delivers production-ready code with unit tests, and responds within 15 minutes on Slack, who cares what they do with the rest of their day? Software engineering is about VALUE DELIVERED, not warming an ergonomic Herman Miller chair for 8 hours. Found the bootlicker.',
                290,
                1789755886719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-3-6f1084-0',
                    'comment',
                    'c-rto-3',
                    '6f1084ea2b99',
                    'like',
                    '🧠',
                    1789755921719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-3-a50091-1',
                    'comment',
                    'c-rto-3',
                    'a500912fa8cc',
                    'like',
                    '❤️',
                    1789755956719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-3-3e901a-2',
                    'comment',
                    'c-rto-3',
                    '3e901a88fb22',
                    'like',
                    '❤️',
                    1789755991719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-3-91c24f-3',
                    'comment',
                    'c-rto-3',
                    '91c24f00ba11',
                    'like',
                    '💡',
                    1789756026719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-3-55a019-4',
                    'comment',
                    'c-rto-3',
                    '55a019ef44cc',
                    'reaction',
                    '🧠',
                    1789756061719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-3-8d104f-5',
                    'comment',
                    'c-rto-3',
                    '8d104fb2a901',
                    'like',
                    '❤️',
                    1789756096719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-3-1bf089-6',
                    'comment',
                    'c-rto-3',
                    '1bf08912ea56',
                    'like',
                    '❤️',
                    1789756131719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-rto-4',
                'post-feud-rto-mandate-leak',
                'c-rto-3',
                '1bf08912ea56',
                'SECURITY_AUDITOR',
                '@DockerNinja Calling me a bootlicker because I expect colleagues to uphold their employment contract and actually mentor junior staff? Typical narcissistic overemployed mentality. Go ahead, quit. See how many fully-remote $300k roles exist in this market. There are 600 applicants for every remote job posting right now.',
                138,
                1789756786719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-4-a50091-0',
                    'comment',
                    'c-rto-4',
                    'a500912fa8cc',
                    'reaction',
                    '🧠',
                    1789756821719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-4-50c401-1',
                    'comment',
                    'c-rto-4',
                    '50c4018fef89',
                    'like',
                    '🔥',
                    1789756856719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-4-24cb90-2',
                    'comment',
                    'c-rto-4',
                    '24cb9011af33',
                    'like',
                    '🚀',
                    1789756891719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-4-1df089-3',
                    'comment',
                    'c-rto-4',
                    '1df08912de78',
                    'like',
                    '🧠',
                    1789756926719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-4-6f1084-4',
                    'comment',
                    'c-rto-4',
                    '6f1084ea2b99',
                    'like',
                    '❤️',
                    1789756961719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-rto-5',
                'post-feud-rto-mandate-leak',
                NULL,
                'a410ef89b231',
                'SOVEREIGN_FOUNDER',
                'The greatest irony of in-office mandates is that once you drive 1.5 hours through gridlock traffic, find an open desk in a noisy open-plan floor, and put on noise-canceling headphones, all your meetings are STILL ON ZOOM because your team is distributed across 4 time zones.',
                410,
                1789757686719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-5-b1409e-0',
                    'comment',
                    'c-rto-5',
                    'b1409ea28c99',
                    'reaction',
                    '🛡️',
                    1789757721719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-5-3db014-1',
                    'comment',
                    'c-rto-5',
                    '3db014ea9e12',
                    'like',
                    '🔥',
                    1789757756719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-5-6d88f1-2',
                    'comment',
                    'c-rto-5',
                    '6d88f12a04cb',
                    'like',
                    '👍',
                    1789757791719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-5-7ac901-3',
                    'comment',
                    'c-rto-5',
                    '7ac901afcd67',
                    'reaction',
                    '🔥',
                    1789757826719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-5-88b401-4',
                    'comment',
                    'c-rto-5',
                    '88b4012ce9fa',
                    'like',
                    '🧠',
                    1789757861719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-5-50c401-5',
                    'comment',
                    'c-rto-5',
                    '50c4018fef89',
                    'reaction',
                    '❤️',
                    1789757896719
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-rto-6',
                'post-feud-rto-mandate-leak',
                'c-rto-5',
                '83d2019fab66',
                'AI_RESEARCHER',
                'And the VPs mandating 5 days in office spend 3 of those days at their lake Tahoe vacation home or playing golf with corporate clients. Rules for thee, but not for me.',
                320,
                1789758586719
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-6-7f8a91-0',
                    'comment',
                    'c-rto-6',
                    '7f8a910c2b44',
                    'like',
                    '👍',
                    1789758621719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-6-61c801-1',
                    'comment',
                    'c-rto-6',
                    '61c8012afa34',
                    'like',
                    '🛡️',
                    1789758656719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-6-94df02-2',
                    'comment',
                    'c-rto-6',
                    '94df0218ab44',
                    'reaction',
                    '🧠',
                    1789758691719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-6-79c901-3',
                    'comment',
                    'c-rto-6',
                    '79c901affa01',
                    'like',
                    '❤️',
                    1789758726719
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-rto-6-62df09-4',
                    'comment',
                    'c-rto-6',
                    '62df0912cb88',
                    'like',
                    '🔥',
                    1789758761719
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-5b2041-0',
                'post',
                'post-feud-rto-mandate-leak',
                '5b2041e8d902',
                'like',
                '❤️',
                1789753831719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-7f8a91-1',
                'post',
                'post-feud-rto-mandate-leak',
                '7f8a910c2b44',
                'reaction',
                '🛡️',
                1789753876719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-a0914e-2',
                'post',
                'post-feud-rto-mandate-leak',
                'a0914e21fc88',
                'like',
                '🚀',
                1789753921719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-50c401-3',
                'post',
                'post-feud-rto-mandate-leak',
                '50c4018fef89',
                'like',
                '👍',
                1789753966719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-55a019-4',
                'post',
                'post-feud-rto-mandate-leak',
                '55a019ef44cc',
                'bookmark',
                '🔥',
                1789754011719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-a50091-5',
                'post',
                'post-feud-rto-mandate-leak',
                'a500912fa8cc',
                'like',
                '🛡️',
                1789754056719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-2d89b1-6',
                'post',
                'post-feud-rto-mandate-leak',
                '2d89b14c99a0',
                'bookmark',
                '🚀',
                1789754101719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-18df01-7',
                'post',
                'post-feud-rto-mandate-leak',
                '18df01a2eb34',
                'bookmark',
                '💡',
                1789754146719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-aa0194-8',
                'post',
                'post-feud-rto-mandate-leak',
                'aa0194f2cd01',
                'bookmark',
                '🚀',
                1789754191719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-99df01-9',
                'post',
                'post-feud-rto-mandate-leak',
                '99df012aa4c3',
                'reaction',
                '❤️',
                1789754236719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-70a40f-10',
                'post',
                'post-feud-rto-mandate-leak',
                '70a40f91b2df',
                'reaction',
                '🧠',
                1789754281719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-5fc401-11',
                'post',
                'post-feud-rto-mandate-leak',
                '5fc4018fab23',
                'bookmark',
                '🚀',
                1789754326719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-44df90-12',
                'post',
                'post-feud-rto-mandate-leak',
                '44df9012a8bc',
                'like',
                '💡',
                1789754371719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-79c901-13',
                'post',
                'post-feud-rto-mandate-leak',
                '79c901affa01',
                'like',
                '👍',
                1789754416719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-8d104f-14',
                'post',
                'post-feud-rto-mandate-leak',
                '8d104fb2a901',
                'reaction',
                '🧠',
                1789754461719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-29c40e-15',
                'post',
                'post-feud-rto-mandate-leak',
                '29c40e11a8b2',
                'like',
                '🧠',
                1789754506719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-88b401-16',
                'post',
                'post-feud-rto-mandate-leak',
                '88b4012ce9fa',
                'like',
                '🧠',
                1789754551719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-22c88f-17',
                'post',
                'post-feud-rto-mandate-leak',
                '22c88f01a9df',
                'reaction',
                '🧠',
                1789754596719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-91c24f-18',
                'post',
                'post-feud-rto-mandate-leak',
                '91c24f00ba11',
                'like',
                '💡',
                1789754641719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-1cf089-19',
                'post',
                'post-feud-rto-mandate-leak',
                '1cf08912fa12',
                'reaction',
                '🧠',
                1789754686719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-12df90-20',
                'post',
                'post-feud-rto-mandate-leak',
                '12df9011ac89',
                'like',
                '💡',
                1789754731719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-7ac901-21',
                'post',
                'post-feud-rto-mandate-leak',
                '7ac901afcd67',
                'bookmark',
                '⚡',
                1789754776719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-77e102-22',
                'post',
                'post-feud-rto-mandate-leak',
                '77e1029ba4c0',
                'reaction',
                '❤️',
                1789754821719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-6d88f1-23',
                'post',
                'post-feud-rto-mandate-leak',
                '6d88f12a04cb',
                'like',
                '⚡',
                1789754866719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-1bf089-24',
                'post',
                'post-feud-rto-mandate-leak',
                '1bf08912ea56',
                'like',
                '❤️',
                1789754911719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-6f1084-25',
                'post',
                'post-feud-rto-mandate-leak',
                '6f1084ea2b99',
                'bookmark',
                '⚡',
                1789754956719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-a7df90-26',
                'post',
                'post-feud-rto-mandate-leak',
                'a7df9012bc23',
                'reaction',
                '⚡',
                1789755001719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-62df09-27',
                'post',
                'post-feud-rto-mandate-leak',
                '62df0912cb88',
                'like',
                '👍',
                1789755046719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-3e901a-29',
                'post',
                'post-feud-rto-mandate-leak',
                '3e901a88fb22',
                'like',
                '👍',
                1789755136719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-24cb90-30',
                'post',
                'post-feud-rto-mandate-leak',
                '24cb9011af33',
                'bookmark',
                '🚀',
                1789755181719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-91df90-31',
                'post',
                'post-feud-rto-mandate-leak',
                '91df9012cb78',
                'bookmark',
                '👍',
                1789755226719
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-post-feud-rto-mandate-leak-88f019-32',
                'post',
                'post-feud-rto-mandate-leak',
                '88f019ab4c21',
                'bookmark',
                '⚡',
                1789755271719
            );
