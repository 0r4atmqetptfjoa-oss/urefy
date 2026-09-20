INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-en-nixos-declarative-workstation',
            'relays-dev',
            '7f8a910c2b44',
            'MEMBER',
            'Why NixOS permanently ruined standard Linux distributions for me: Declarative configuration, Flakes, and zero-risk rollbacks explained ❄️🐧',
            'After 8 years on Arch Linux and Ubuntu LTS, I made the jump to NixOS with deterministic Flakes. Six months in, I can say with certainty: mutable Linux configurations where system state drifts across /etc, /usr, and /var feel archaic now.

### 1. The Core Paradigm: Your Entire OS is a Pure Function
In traditional distros, you install packages over months, edit obscure configuration files, and hope you can recreate the setup if your SSD dies.
In NixOS, your entire operating system—installed packages, kernel parameters, desktop environment, firewall rules, and user dotfiles—is defined in a version-controlled git repository.

```nix
# /etc/nixos/flake.nix snippet
{
  description = "Workstation NixOS Configuration";
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    home-manager.url = "github:nix-community/home-manager";
  };
  outputs = { self, nixpkgs, home-manager, ... }: {
    nixosConfigurations.workstation = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ./hardware-configuration.nix
        ./configuration.nix
        home-manager.nixosModules.home-manager
      ];
    };
  };
}
```

### 2. The Power of Atomic Generations & Instant Rollback
Last month, a proprietary graphics driver update caused Wayland to fail on boot. In traditional distros, this meant booting into a live USB, chrooting, and manually downgrading packages.
In NixOS:
- Reboot machine.
- Select the previous generation in the GRUB boot menu.
- Booted in 4 seconds into the exact working state before the update.
- Zero broken dependencies, zero orphaned libraries.

### 3. Ephemeral Developer Shells (`nix develop`)
No more cluttering global PATH with Python 3.11, Python 3.12, different GCC versions, or Node versions. A simple `flake.nix` in any project folder defines the exact dev toolchain. Once you exit the shell, your system remains pristine.

Is the learning curve steep? Yes, Nix syntax and documentation can be challenging. But once you understand the mental model, you will never manage an operating system the old way again.',
            'LINUX & SYSTEMS',
            560,
            0,
            5,
            45,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789730400000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-nixos-declarative-workstation', 'nixos', 1789730400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-nixos-declarative-workstation', 'linux', 1789730400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-nixos-declarative-workstation', 'flakes', 1789730400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-nixos-declarative-workstation', 'sysadmin', 1789730400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-nixos-declarative-workstation', 'devops', 1789730400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-nixos-declarative-workstation', 'declarative', 1789730400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-nixos-declarative-workstation', 'homelab', 1789730400000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-nix-1',
                'p-seo-en-nixos-declarative-workstation',
                NULL,
                '91df9012cb78',
                'MEMBER',
                'The real killer feature for me is devShells paired with direnv. Being able to cd into any repo and immediately have the exact Rust nightly toolchain, LLVM, and Protobuf compiler loaded without touching global PATH is absolute sorcery.',
                88,
                1789731000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-1-44df90-0',
                    'comment',
                    'c-en-nix-1',
                    '44df9012a8bc',
                    'reaction',
                    '❤️',
                    1789731030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-1-1df089-1',
                    'comment',
                    'c-en-nix-1',
                    '1df08912de78',
                    'reaction',
                    '🧠',
                    1789731060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-1-1bf089-2',
                    'comment',
                    'c-en-nix-1',
                    '1bf08912ea56',
                    'like',
                    '💡',
                    1789731090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-1-6f1084-3',
                    'comment',
                    'c-en-nix-1',
                    '6f1084ea2b99',
                    'like',
                    '🧠',
                    1789731120000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-1-83d201-4',
                    'comment',
                    'c-en-nix-1',
                    '83d2019fab66',
                    'like',
                    '👍',
                    1789731150000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-1-3db014-5',
                    'comment',
                    'c-en-nix-1',
                    '3db014ea9e12',
                    'reaction',
                    '💡',
                    1789731180000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-1-99df01-6',
                    'comment',
                    'c-en-nix-1',
                    '99df012aa4c3',
                    'reaction',
                    '🛡️',
                    1789731210000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-nix-2',
                'p-seo-en-nixos-declarative-workstation',
                'c-en-nix-1',
                '7f8a910c2b44',
                'MEMBER',
                '@NeovimCult Exactly! And when onboarding teammates, they just run nix develop and they are productive in under 60 seconds. Zero ''works on my machine'' issues.',
                52,
                1789731600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-2-91c24f-0',
                    'comment',
                    'c-en-nix-2',
                    '91c24f00ba11',
                    'like',
                    '🛡️',
                    1789731630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-2-1cf089-1',
                    'comment',
                    'c-en-nix-2',
                    '1cf08912fa12',
                    'like',
                    '🔥',
                    1789731660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-2-aa0194-2',
                    'comment',
                    'c-en-nix-2',
                    'aa0194f2cd01',
                    'like',
                    '🧠',
                    1789731690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-2-2d89b1-3',
                    'comment',
                    'c-en-nix-2',
                    '2d89b14c99a0',
                    'like',
                    '👍',
                    1789731720000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-2-87a01f-4',
                    'comment',
                    'c-en-nix-2',
                    '87a01fa29cb5',
                    'like',
                    '🧠',
                    1789731750000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-2-5fc401-5',
                    'comment',
                    'c-en-nix-2',
                    '5fc4018fab23',
                    'reaction',
                    '🚀',
                    1789731780000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-2-4e198a-6',
                    'comment',
                    'c-en-nix-2',
                    '4e198a00b215',
                    'reaction',
                    '👍',
                    1789731810000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-nix-3',
                'p-seo-en-nixos-declarative-workstation',
                NULL,
                '4e198a00b215',
                'MEMBER',
                'How do you handle proprietary drivers like NVIDIA CUDA on NixOS? That used to be the biggest friction point two years ago.',
                41,
                1789732200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-3-91df90-0',
                    'comment',
                    'c-en-nix-3',
                    '91df9012cb78',
                    'like',
                    '💡',
                    1789732230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-3-61c801-1',
                    'comment',
                    'c-en-nix-3',
                    '61c8012afa34',
                    'reaction',
                    '💡',
                    1789732260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-3-aa0194-3',
                    'comment',
                    'c-en-nix-3',
                    'aa0194f2cd01',
                    'reaction',
                    '🚀',
                    1789732320000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-3-87a01f-4',
                    'comment',
                    'c-en-nix-3',
                    '87a01fa29cb5',
                    'reaction',
                    '💡',
                    1789732350000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-3-50c401-5',
                    'comment',
                    'c-en-nix-3',
                    '50c4018fef89',
                    'like',
                    '🔥',
                    1789732380000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-3-6d88f1-6',
                    'comment',
                    'c-en-nix-3',
                    '6d88f12a04cb',
                    'like',
                    '🛡️',
                    1789732410000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-nix-4',
                'p-seo-en-nixos-declarative-workstation',
                'c-en-nix-3',
                '7f8a910c2b44',
                'MEMBER',
                '@DockerNinja It has improved dramatically. Setting `hardware.nvidia.open = true;` and `nixpkgs.config.allowUnfree = true;` works cleanly with modern Turing+ cards. PyTorch and vLLM ran without a single patch.',
                48,
                1789732800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-4-8d104f-0',
                    'comment',
                    'c-en-nix-4',
                    '8d104fb2a901',
                    'like',
                    '🛡️',
                    1789732830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-4-91df90-1',
                    'comment',
                    'c-en-nix-4',
                    '91df9012cb78',
                    'like',
                    '🚀',
                    1789732860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-4-5b2041-2',
                    'comment',
                    'c-en-nix-4',
                    '5b2041e8d902',
                    'reaction',
                    '💡',
                    1789732890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-4-70a40f-3',
                    'comment',
                    'c-en-nix-4',
                    '70a40f91b2df',
                    'reaction',
                    '🚀',
                    1789732920000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-4-99df01-4',
                    'comment',
                    'c-en-nix-4',
                    '99df012aa4c3',
                    'reaction',
                    '🧠',
                    1789732950000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-4-2d89b1-5',
                    'comment',
                    'c-en-nix-4',
                    '2d89b14c99a0',
                    'like',
                    '👍',
                    1789732980000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-4-55a019-6',
                    'comment',
                    'c-en-nix-4',
                    '55a019ef44cc',
                    'like',
                    '❤️',
                    1789733010000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-nix-5',
                'p-seo-en-nixos-declarative-workstation',
                NULL,
                '29c40e11a8b2',
                'MEMBER',
                'NixOS turns system administration into reproducible software engineering. Managing 10 remote servers with Colmena or nixops from a single repository is unmatched.',
                65,
                1789733400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-5-94df02-0',
                    'comment',
                    'c-en-nix-5',
                    '94df0218ab44',
                    'reaction',
                    '👍',
                    1789733430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-5-6f1084-1',
                    'comment',
                    'c-en-nix-5',
                    '6f1084ea2b99',
                    'like',
                    '🛡️',
                    1789733460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-5-88b401-2',
                    'comment',
                    'c-en-nix-5',
                    '88b4012ce9fa',
                    'like',
                    '❤️',
                    1789733490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-5-88f019-3',
                    'comment',
                    'c-en-nix-5',
                    '88f019ab4c21',
                    'like',
                    '❤️',
                    1789733520000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-5-62df09-4',
                    'comment',
                    'c-en-nix-5',
                    '62df0912cb88',
                    'reaction',
                    '🧠',
                    1789733550000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-nix-5-61c801-5',
                    'comment',
                    'c-en-nix-5',
                    '61c8012afa34',
                    'reaction',
                    '🧠',
                    1789733580000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-12df90-0',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '12df9011ac89',
                'bookmark',
                '⚡',
                1789730460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-12df90',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '12df9011ac89',
                1,
                1789730460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-22c88f-1',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '22c88f01a9df',
                'bookmark',
                '🛡️',
                1789730520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-22c88f',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '22c88f01a9df',
                1,
                1789730520000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-5fc401-2',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '5fc4018fab23',
                'like',
                '🧠',
                1789730580000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-5fc401',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '5fc4018fab23',
                1,
                1789730580000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-55a019-3',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '55a019ef44cc',
                'like',
                '⚡',
                1789730640000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-55a019',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '55a019ef44cc',
                1,
                1789730640000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-50c401-4',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '50c4018fef89',
                'like',
                '👍',
                1789730700000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-50c401',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '50c4018fef89',
                1,
                1789730700000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-99df01-5',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '99df012aa4c3',
                'reaction',
                '⚡',
                1789730760000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-99df01',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '99df012aa4c3',
                1,
                1789730760000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-b1409e-6',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                'b1409ea28c99',
                'like',
                '⚡',
                1789730820000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-b1409e',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                'b1409ea28c99',
                1,
                1789730820000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-61c801-7',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '61c8012afa34',
                'like',
                '❤️',
                1789730880000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-61c801',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '61c8012afa34',
                1,
                1789730880000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-aa0194-8',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                'aa0194f2cd01',
                'reaction',
                '⚡',
                1789730940000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-aa0194',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                'aa0194f2cd01',
                1,
                1789730940000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-94df02-9',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '94df0218ab44',
                'bookmark',
                '⚡',
                1789731000000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-94df02',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '94df0218ab44',
                1,
                1789731000000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-1bf089-10',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '1bf08912ea56',
                'bookmark',
                '👍',
                1789731060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-1bf089',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '1bf08912ea56',
                1,
                1789731060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-29c40e-11',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '29c40e11a8b2',
                'like',
                '🚀',
                1789731120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-29c40e',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '29c40e11a8b2',
                1,
                1789731120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-70a40f-12',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '70a40f91b2df',
                'bookmark',
                '🚀',
                1789731180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-70a40f',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '70a40f91b2df',
                1,
                1789731180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-a0914e-13',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                'a0914e21fc88',
                'reaction',
                '🚀',
                1789731240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-a0914e',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                'a0914e21fc88',
                1,
                1789731240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-83d201-14',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '83d2019fab66',
                'bookmark',
                '🧠',
                1789731300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-83d201',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '83d2019fab66',
                1,
                1789731300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-79c901-15',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '79c901affa01',
                'reaction',
                '💡',
                1789731360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-79c901',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '79c901affa01',
                1,
                1789731360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-5b2041-16',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '5b2041e8d902',
                'like',
                '👍',
                1789731420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-5b2041',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '5b2041e8d902',
                1,
                1789731420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-88b401-17',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '88b4012ce9fa',
                'like',
                '🧠',
                1789731480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-88b401',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '88b4012ce9fa',
                1,
                1789731480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-6d88f1-18',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '6d88f12a04cb',
                'reaction',
                '🚀',
                1789731540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-6d88f1',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '6d88f12a04cb',
                1,
                1789731540000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-91df90-19',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '91df9012cb78',
                'reaction',
                '👍',
                1789731600000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-91df90',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '91df9012cb78',
                1,
                1789731600000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-a7df90-20',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                'a7df9012bc23',
                'reaction',
                '🔥',
                1789731660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-a7df90',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                'a7df9012bc23',
                1,
                1789731660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-91c24f-21',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '91c24f00ba11',
                'like',
                '👍',
                1789731720000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-91c24f',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '91c24f00ba11',
                1,
                1789731720000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-a50091-22',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                'a500912fa8cc',
                'like',
                '💡',
                1789731780000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-a50091',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                'a500912fa8cc',
                1,
                1789731780000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-6f1084-24',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '6f1084ea2b99',
                'like',
                '⚡',
                1789731900000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-6f1084',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '6f1084ea2b99',
                1,
                1789731900000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-88f019-25',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '88f019ab4c21',
                'reaction',
                '⚡',
                1789731960000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-88f019',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '88f019ab4c21',
                1,
                1789731960000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-nixos-declarative-workstation-1cf089-26',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '1cf08912fa12',
                'reaction',
                '🛡️',
                1789732020000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-nixos-declarative-workstation-1cf089',
                'post',
                'p-seo-en-nixos-declarative-workstation',
                '1cf08912fa12',
                1,
                1789732020000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-en-aws-ecs-to-hetzner-baremetal',
            'relays-dev',
            '4e198a00b215',
            'MEMBER',
            'We migrated 48 microservices from AWS ECS & RDS to Hetzner bare metal with Proxmox: Slashing our cloud bill from $4,850/mo to $340/mo 📉🏗️',
            'Three months ago, our team reached peak frustration with our AWS invoice. For a mid-sized SaaS processing 30 million API requests/month, we were paying nearly $5,000 every single billing cycle.

Here is the exact financial and infrastructure breakdown of our cloud exit to Hetzner bare metal:

### 1. The AWS Cost Reality
- **ECS Fargate (32 vCPUs, 64GB RAM equivalent)**: $1,550/mo
- **RDS Aurora PostgreSQL (db.r6g.xlarge multi-AZ)**: $1,400/mo
- **AWS NAT Gateways + Inter-AZ Data Egress**: $1,900/mo (The infamous AWS bandwidth tax)
- **Total AWS monthly bill**: **$4,850/mo**

### 2. The Hetzner Bare Metal Alternative
We leased two dedicated servers in Hetzner''s Falkenstein datacenter:
- **2x Hetzner AX102**:
  - AMD Ryzen 9 7950X (16 cores / 32 threads @ 4.5GHz base)
  - 128 GB DDR5 ECC RAM
  - 2x 1.92 TB Enterprise Datacenter NVMe SSDs (Software RAID1)
  - 1 Gbit/s unmetered connection with 20TB free monthly egress
- **Total Hetzner monthly cost**: **€310 (~$340/mo)**

### 3. Architecture on Proxmox VE
- **Clustered Proxmox 8**: Two physical nodes joined via private VLAN + WireGuard failover.
- **LXC Containers**: Stateless API services run in unprivileged Debian LXCs with near-native CPU efficiency (0.2% hypervisor overhead).
- **Database**: PostgreSQL 17 with Patroni + etcd for automated HA failover.
- **Reverse Proxy & Edge Protection**: Cloudflare Enterprise proxy with authenticated tunnels pointing directly to our dedicated IPs.

### 4. Performance Comparison
- **API P99 Latency**: Dropped from 42ms on ECS to **9ms on bare metal Ryzen 9**.
- **Cold Starts**: Eliminated completely.
- **Financial Savings**: **Over $54,000 saved per year**.

Cloud hyperscalers sell convenience at a 1,400% markup. For small-to-medium teams, dedicated hardware has never been more viable.',
            'CLOUD EXIT & DEVOPS',
            620,
            0,
            5,
            58,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789734000000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-aws-ecs-to-hetzner-baremetal', 'devops', 1789734000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-aws-ecs-to-hetzner-baremetal', 'aws', 1789734000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-aws-ecs-to-hetzner-baremetal', 'hetzner', 1789734000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-aws-ecs-to-hetzner-baremetal', 'cloudexit', 1789734000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-aws-ecs-to-hetzner-baremetal', 'baremetal', 1789734000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-aws-ecs-to-hetzner-baremetal', 'proxmox', 1789734000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-aws-ecs-to-hetzner-baremetal', 'selfhosted', 1789734000000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-aws-1',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                NULL,
                '7ac901afcd67',
                'MEMBER',
                'The AWS NAT Gateway pricing is absolute highway robbery. Charging $0.045/hour plus $0.045 per GB processed just to route traffic through an internal IP table rule is insane. Glad to see more teams waking up to bare metal.',
                95,
                1789734600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-1-a0914e-0',
                    'comment',
                    'c-en-aws-1',
                    'a0914e21fc88',
                    'reaction',
                    '🛡️',
                    1789734630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-1-87a01f-1',
                    'comment',
                    'c-en-aws-1',
                    '87a01fa29cb5',
                    'like',
                    '🧠',
                    1789734660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-1-1cf089-2',
                    'comment',
                    'c-en-aws-1',
                    '1cf08912fa12',
                    'like',
                    '❤️',
                    1789734690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-1-77e102-3',
                    'comment',
                    'c-en-aws-1',
                    '77e1029ba4c0',
                    'reaction',
                    '🚀',
                    1789734720000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-1-24cb90-4',
                    'comment',
                    'c-en-aws-1',
                    '24cb9011af33',
                    'reaction',
                    '🧠',
                    1789734750000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-1-83d201-5',
                    'comment',
                    'c-en-aws-1',
                    '83d2019fab66',
                    'like',
                    '💡',
                    1789734780000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-aws-2',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                'c-en-aws-1',
                '4e198a00b215',
                'MEMBER',
                '@GrafanaHawk That was our exact tipping point. We were paying more for AWS NAT gateways transferring internal container logs to CloudWatch than for our entire database!',
                72,
                1789735200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-2-b1409e-0',
                    'comment',
                    'c-en-aws-2',
                    'b1409ea28c99',
                    'like',
                    '💡',
                    1789735230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-2-1bf089-1',
                    'comment',
                    'c-en-aws-2',
                    '1bf08912ea56',
                    'like',
                    '🔥',
                    1789735260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-2-83d201-2',
                    'comment',
                    'c-en-aws-2',
                    '83d2019fab66',
                    'reaction',
                    '🧠',
                    1789735290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-2-77e102-3',
                    'comment',
                    'c-en-aws-2',
                    '77e1029ba4c0',
                    'like',
                    '💡',
                    1789735320000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-2-22c88f-4',
                    'comment',
                    'c-en-aws-2',
                    '22c88f01a9df',
                    'like',
                    '👍',
                    1789735350000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-2-18df01-5',
                    'comment',
                    'c-en-aws-2',
                    '18df01a2eb34',
                    'reaction',
                    '🛡️',
                    1789735380000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-2-7f8a91-6',
                    'comment',
                    'c-en-aws-2',
                    '7f8a910c2b44',
                    'like',
                    '🚀',
                    1789735410000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-aws-3',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                NULL,
                '18df01a2eb34',
                'MEMBER',
                'How did you handle the database migration cutover? How much downtime did you need?',
                38,
                1789735800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-3-79c901-0',
                    'comment',
                    'c-en-aws-3',
                    '79c901affa01',
                    'reaction',
                    '💡',
                    1789735830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-3-aa0194-1',
                    'comment',
                    'c-en-aws-3',
                    'aa0194f2cd01',
                    'reaction',
                    '🔥',
                    1789735860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-3-62df09-2',
                    'comment',
                    'c-en-aws-3',
                    '62df0912cb88',
                    'like',
                    '❤️',
                    1789735890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-3-55a019-3',
                    'comment',
                    'c-en-aws-3',
                    '55a019ef44cc',
                    'like',
                    '🔥',
                    1789735920000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-aws-4',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                'c-en-aws-3',
                '4e198a00b215',
                'MEMBER',
                '@SqliteEnjoyer Logical replication using pglogical directly from Aurora to the Hetzner Patroni cluster. Total cutover downtime was 90 seconds during a Sunday morning maintenance window.',
                56,
                1789736400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-4-99df01-0',
                    'comment',
                    'c-en-aws-4',
                    '99df012aa4c3',
                    'reaction',
                    '🛡️',
                    1789736430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-4-a0914e-1',
                    'comment',
                    'c-en-aws-4',
                    'a0914e21fc88',
                    'like',
                    '👍',
                    1789736460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-4-44df90-2',
                    'comment',
                    'c-en-aws-4',
                    '44df9012a8bc',
                    'like',
                    '💡',
                    1789736490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-4-3e901a-3',
                    'comment',
                    'c-en-aws-4',
                    '3e901a88fb22',
                    'like',
                    '❤️',
                    1789736520000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-4-1bf089-4',
                    'comment',
                    'c-en-aws-4',
                    '1bf08912ea56',
                    'reaction',
                    '💡',
                    1789736550000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-aws-5',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                NULL,
                '29c40e11a8b2',
                'MEMBER',
                'Dedicated AMD Zen 4 cores with dedicated L3 cache prevent the dreaded noisy-neighbor throttling that plagues virtualized cloud instances. Solid win.',
                49,
                1789737000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-5-7f8a91-0',
                    'comment',
                    'c-en-aws-5',
                    '7f8a910c2b44',
                    'like',
                    '❤️',
                    1789737030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-5-6d88f1-1',
                    'comment',
                    'c-en-aws-5',
                    '6d88f12a04cb',
                    'like',
                    '💡',
                    1789737060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-5-3db014-2',
                    'comment',
                    'c-en-aws-5',
                    '3db014ea9e12',
                    'reaction',
                    '❤️',
                    1789737090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-5-91c24f-3',
                    'comment',
                    'c-en-aws-5',
                    '91c24f00ba11',
                    'like',
                    '❤️',
                    1789737120000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-5-70a40f-4',
                    'comment',
                    'c-en-aws-5',
                    '70a40f91b2df',
                    'like',
                    '🚀',
                    1789737150000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-aws-5-55a019-5',
                    'comment',
                    'c-en-aws-5',
                    '55a019ef44cc',
                    'reaction',
                    '💡',
                    1789737180000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-5b2041-0',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '5b2041e8d902',
                'reaction',
                '🚀',
                1789734060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-5b2041',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '5b2041e8d902',
                1,
                1789734060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-77e102-1',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '77e1029ba4c0',
                'like',
                '🧠',
                1789734120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-77e102',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '77e1029ba4c0',
                1,
                1789734120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-b1409e-2',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                'b1409ea28c99',
                'like',
                '💡',
                1789734180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-b1409e',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                'b1409ea28c99',
                1,
                1789734180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-3e901a-3',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '3e901a88fb22',
                'bookmark',
                '⚡',
                1789734240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-3e901a',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '3e901a88fb22',
                1,
                1789734240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-1bf089-4',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '1bf08912ea56',
                'reaction',
                '🚀',
                1789734300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-1bf089',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '1bf08912ea56',
                1,
                1789734300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-6d88f1-5',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '6d88f12a04cb',
                'reaction',
                '💡',
                1789734360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-6d88f1',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '6d88f12a04cb',
                1,
                1789734360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-12df90-6',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '12df9011ac89',
                'reaction',
                '💡',
                1789734420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-12df90',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '12df9011ac89',
                1,
                1789734420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-7ac901-7',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '7ac901afcd67',
                'like',
                '🚀',
                1789734480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-7ac901',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '7ac901afcd67',
                1,
                1789734480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-44df90-8',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '44df9012a8bc',
                'reaction',
                '🛡️',
                1789734540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-44df90',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '44df9012a8bc',
                1,
                1789734540000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-1df089-9',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '1df08912de78',
                'bookmark',
                '💡',
                1789734600000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-1df089',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '1df08912de78',
                1,
                1789734600000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-24cb90-10',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '24cb9011af33',
                'like',
                '⚡',
                1789734660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-24cb90',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '24cb9011af33',
                1,
                1789734660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-88b401-11',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '88b4012ce9fa',
                'bookmark',
                '🧠',
                1789734720000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-88b401',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '88b4012ce9fa',
                1,
                1789734720000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-7f8a91-12',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '7f8a910c2b44',
                'reaction',
                '💡',
                1789734780000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-7f8a91',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '7f8a910c2b44',
                1,
                1789734780000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-83d201-13',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '83d2019fab66',
                'like',
                '🛡️',
                1789734840000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-83d201',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '83d2019fab66',
                1,
                1789734840000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-91df90-14',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '91df9012cb78',
                'reaction',
                '❤️',
                1789734900000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-91df90',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '91df9012cb78',
                1,
                1789734900000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-a7df90-15',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                'a7df9012bc23',
                'reaction',
                '💡',
                1789734960000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-a7df90',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                'a7df9012bc23',
                1,
                1789734960000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-62df09-16',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '62df0912cb88',
                'reaction',
                '🧠',
                1789735020000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-62df09',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '62df0912cb88',
                1,
                1789735020000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-a0914e-17',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                'a0914e21fc88',
                'like',
                '⚡',
                1789735080000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-a0914e',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                'a0914e21fc88',
                1,
                1789735080000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-1cf089-18',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '1cf08912fa12',
                'reaction',
                '👍',
                1789735140000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-1cf089',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '1cf08912fa12',
                1,
                1789735140000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-87a01f-19',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '87a01fa29cb5',
                'bookmark',
                '👍',
                1789735200000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-87a01f',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '87a01fa29cb5',
                1,
                1789735200000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-8d104f-20',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '8d104fb2a901',
                'bookmark',
                '🚀',
                1789735260000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-8d104f',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '8d104fb2a901',
                1,
                1789735260000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-29c40e-21',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '29c40e11a8b2',
                'bookmark',
                '👍',
                1789735320000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-29c40e',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '29c40e11a8b2',
                1,
                1789735320000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-aws-ecs-to-hetzner-baremetal-70a40f-22',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '70a40f91b2df',
                'reaction',
                '🚀',
                1789735380000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-aws-ecs-to-hetzner-baremetal-70a40f',
                'post',
                'p-seo-en-aws-ecs-to-hetzner-baremetal',
                '70a40f91b2df',
                1,
                1789735380000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-en-zig-vs-rust-systems-benchmark',
            'relays-dev',
            '29c40e11a8b2',
            'MEMBER',
            'Zig vs Rust in 2026: Why we rewrote our high-throughput network packet parser in Zig (And where Rust is still irreplaceable) ⚡🦀',
            'Over the past 6 months, our core telemetry team experimented with rewriting an internal 10-gigabit packet inspection pipeline from Rust into **Zig 0.14**.

Here is an honest engineering comparison between the two languages:

### 1. Where Zig Won Decisively:
- **Explicit Memory Allocation**: In Zig, every function that allocates memory takes an `std.mem.Allocator` parameter. There are no hidden allocations in the standard library. Passing an arena allocator to per-packet scratchpad routines gave us zero allocator lock contention.
- **Comptime vs Macros**: Rust macros (especially procedural macros) significantly slow down compilation times. Zig''s `comptime` allows executing standard Zig code at compile time with ordinary syntax, full IDE autocomplete, and zero external build scripts.
- **Compilation Speed**:
  - Incremental rebuild in Zig: **1.2 seconds**
  - Incremental rebuild in Rust: **18.4 seconds**
- **C/C++ Interop**: `@cImport` and `zig cc` enabled seamless zero-overhead bindings to DPDK and libpcap without writing manual FFI wrappers.

### 2. Where Rust is Still Irreplaceable:
- **Fearless Concurrency**: In Zig, multi-threaded safety is entirely on the developer. Rust''s `Send` and `Sync` traits and compile-time borrow checker prevent data races that can be subtle to debug in high-concurrency systems.
- **Ecosystem Maturity**: When we needed an asynchronous HTTP client, cryptographic primitives, and distributed tracing, Rust''s ecosystem (`tokio`, `tracing`, `ring`) is world-class and production-hardened.

### Summary:
Use **Zig** for kernels, embedded firmware, high-performance audio/video engines, and low-level network drivers where absolute control over bytes and memory layouts matters. Use **Rust** for distributed backends, complex concurrent applications, and enterprise microservices.',
            'SYSTEMS PROGRAMMING',
            590,
            0,
            4,
            51,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789737600000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-zig-vs-rust-systems-benchmark', 'zig', 1789737600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-zig-vs-rust-systems-benchmark', 'rust', 1789737600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-zig-vs-rust-systems-benchmark', 'systems', 1789737600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-zig-vs-rust-systems-benchmark', 'networking', 1789737600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-zig-vs-rust-systems-benchmark', 'performance', 1789737600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-zig-vs-rust-systems-benchmark', 'programming', 1789737600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-zig-vs-rust-systems-benchmark', 'benchmark', 1789737600000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-zig-1',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                NULL,
                '8d104fb2a901',
                'MEMBER',
                'Zig comptime is the cleanest metaprogramming model in modern computing. No more macro syntax gymnastics, just pure typed code evaluated during compile passes.',
                77,
                1789738200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-1-3db014-0',
                    'comment',
                    'c-en-zig-1',
                    '3db014ea9e12',
                    'reaction',
                    '💡',
                    1789738230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-1-61c801-1',
                    'comment',
                    'c-en-zig-1',
                    '61c8012afa34',
                    'reaction',
                    '🛡️',
                    1789738260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-1-1df089-2',
                    'comment',
                    'c-en-zig-1',
                    '1df08912de78',
                    'reaction',
                    '🛡️',
                    1789738290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-1-88f019-3',
                    'comment',
                    'c-en-zig-1',
                    '88f019ab4c21',
                    'like',
                    '🚀',
                    1789738320000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-1-6d88f1-4',
                    'comment',
                    'c-en-zig-1',
                    '6d88f12a04cb',
                    'reaction',
                    '❤️',
                    1789738350000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-1-55a019-5',
                    'comment',
                    'c-en-zig-1',
                    '55a019ef44cc',
                    'reaction',
                    '🔥',
                    1789738380000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-1-79c901-6',
                    'comment',
                    'c-en-zig-1',
                    '79c901affa01',
                    'reaction',
                    '🛡️',
                    1789738410000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-zig-2',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                NULL,
                'b1409ea28c99',
                'MEMBER',
                'Did you benchmark memory throughput differences between the two implementations?',
                34,
                1789738800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-2-1df089-0',
                    'comment',
                    'c-en-zig-2',
                    '1df08912de78',
                    'reaction',
                    '👍',
                    1789738830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-2-3e901a-1',
                    'comment',
                    'c-en-zig-2',
                    '3e901a88fb22',
                    'reaction',
                    '💡',
                    1789738860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-2-6d88f1-2',
                    'comment',
                    'c-en-zig-2',
                    '6d88f12a04cb',
                    'like',
                    '🧠',
                    1789738890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-2-7ac901-3',
                    'comment',
                    'c-en-zig-2',
                    '7ac901afcd67',
                    'like',
                    '🛡️',
                    1789738920000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-zig-3',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                'c-en-zig-2',
                '29c40e11a8b2',
                'MEMBER',
                '@DeepSeekRunner Throughput was nearly identical (both within 2% of wire speed at 14.8 million packets/sec). The biggest difference was memory footprint: Zig ran at 4.2 MB RSS vs Rust at 18.6 MB RSS due to arena allocator tuning.',
                63,
                1789739400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-3-5b2041-0',
                    'comment',
                    'c-en-zig-3',
                    '5b2041e8d902',
                    'reaction',
                    '🔥',
                    1789739430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-3-61c801-1',
                    'comment',
                    'c-en-zig-3',
                    '61c8012afa34',
                    'like',
                    '💡',
                    1789739460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-3-6f1084-2',
                    'comment',
                    'c-en-zig-3',
                    '6f1084ea2b99',
                    'reaction',
                    '👍',
                    1789739490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-3-62df09-3',
                    'comment',
                    'c-en-zig-3',
                    '62df0912cb88',
                    'like',
                    '🧠',
                    1789739520000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-3-88f019-4',
                    'comment',
                    'c-en-zig-3',
                    '88f019ab4c21',
                    'reaction',
                    '🛡️',
                    1789739550000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-3-77e102-5',
                    'comment',
                    'c-en-zig-3',
                    '77e1029ba4c0',
                    'like',
                    '🧠',
                    1789739580000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-zig-4',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                NULL,
                '22c88f01a9df',
                'MEMBER',
                'The ability of zig cc to cross-compile C and C++ to any target architecture with zero dependencies has saved our CI/CD pipeline dozens of hours.',
                51,
                1789740000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-4-a50091-0',
                    'comment',
                    'c-en-zig-4',
                    'a500912fa8cc',
                    'reaction',
                    '💡',
                    1789740030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-4-99df01-1',
                    'comment',
                    'c-en-zig-4',
                    '99df012aa4c3',
                    'like',
                    '👍',
                    1789740060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-zig-4-77e102-3',
                    'comment',
                    'c-en-zig-4',
                    '77e1029ba4c0',
                    'like',
                    '🔥',
                    1789740120000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-a50091-0',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                'a500912fa8cc',
                'bookmark',
                '❤️',
                1789737660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-a50091',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                'a500912fa8cc',
                1,
                1789737660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-22c88f-1',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '22c88f01a9df',
                'like',
                '❤️',
                1789737720000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-22c88f',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '22c88f01a9df',
                1,
                1789737720000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-62df09-2',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '62df0912cb88',
                'reaction',
                '⚡',
                1789737780000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-62df09',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '62df0912cb88',
                1,
                1789737780000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-1df089-3',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '1df08912de78',
                'reaction',
                '🚀',
                1789737840000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-1df089',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '1df08912de78',
                1,
                1789737840000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-91df90-4',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '91df9012cb78',
                'reaction',
                '❤️',
                1789737900000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-91df90',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '91df9012cb78',
                1,
                1789737900000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-70a40f-5',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '70a40f91b2df',
                'reaction',
                '🧠',
                1789737960000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-70a40f',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '70a40f91b2df',
                1,
                1789737960000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-5b2041-6',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '5b2041e8d902',
                'reaction',
                '🚀',
                1789738020000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-5b2041',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '5b2041e8d902',
                1,
                1789738020000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-99df01-7',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '99df012aa4c3',
                'like',
                '🛡️',
                1789738080000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-99df01',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '99df012aa4c3',
                1,
                1789738080000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-3e901a-8',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '3e901a88fb22',
                'like',
                '👍',
                1789738140000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-3e901a',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '3e901a88fb22',
                1,
                1789738140000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-1bf089-9',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '1bf08912ea56',
                'reaction',
                '👍',
                1789738200000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-1bf089',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '1bf08912ea56',
                1,
                1789738200000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-79c901-10',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '79c901affa01',
                'like',
                '👍',
                1789738260000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-79c901',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '79c901affa01',
                1,
                1789738260000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-61c801-11',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '61c8012afa34',
                'reaction',
                '👍',
                1789738320000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-61c801',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '61c8012afa34',
                1,
                1789738320000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-5fc401-12',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '5fc4018fab23',
                'like',
                '💡',
                1789738380000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-5fc401',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '5fc4018fab23',
                1,
                1789738380000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-24cb90-14',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '24cb9011af33',
                'reaction',
                '⚡',
                1789738500000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-24cb90',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '24cb9011af33',
                1,
                1789738500000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-b1409e-15',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                'b1409ea28c99',
                'reaction',
                '🔥',
                1789738560000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-b1409e',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                'b1409ea28c99',
                1,
                1789738560000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-1cf089-16',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '1cf08912fa12',
                'bookmark',
                '⚡',
                1789738620000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-1cf089',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '1cf08912fa12',
                1,
                1789738620000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-6d88f1-17',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '6d88f12a04cb',
                'like',
                '❤️',
                1789738680000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-6d88f1',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '6d88f12a04cb',
                1,
                1789738680000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-7ac901-18',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '7ac901afcd67',
                'like',
                '🔥',
                1789738740000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-7ac901',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '7ac901afcd67',
                1,
                1789738740000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-8d104f-19',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '8d104fb2a901',
                'reaction',
                '⚡',
                1789738800000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-8d104f',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '8d104fb2a901',
                1,
                1789738800000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-4e198a-20',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '4e198a00b215',
                'bookmark',
                '❤️',
                1789738860000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-4e198a',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '4e198a00b215',
                1,
                1789738860000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-44df90-21',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '44df9012a8bc',
                'like',
                '⚡',
                1789738920000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-44df90',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '44df9012a8bc',
                1,
                1789738920000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-6f1084-22',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '6f1084ea2b99',
                'reaction',
                '⚡',
                1789738980000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-6f1084',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '6f1084ea2b99',
                1,
                1789738980000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-a0914e-23',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                'a0914e21fc88',
                'bookmark',
                '❤️',
                1789739040000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-a0914e',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                'a0914e21fc88',
                1,
                1789739040000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-7f8a91-24',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '7f8a910c2b44',
                'like',
                '💡',
                1789739100000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-7f8a91',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '7f8a910c2b44',
                1,
                1789739100000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-94df02-25',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '94df0218ab44',
                'bookmark',
                '🚀',
                1789739160000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-94df02',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '94df0218ab44',
                1,
                1789739160000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-88b401-26',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '88b4012ce9fa',
                'reaction',
                '🔥',
                1789739220000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-88b401',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '88b4012ce9fa',
                1,
                1789739220000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-88f019-27',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '88f019ab4c21',
                'reaction',
                '🧠',
                1789739280000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-88f019',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '88f019ab4c21',
                1,
                1789739280000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-87a01f-28',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '87a01fa29cb5',
                'like',
                '🚀',
                1789739340000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-87a01f',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '87a01fa29cb5',
                1,
                1789739340000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-zig-vs-rust-systems-benchmark-91c24f-29',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '91c24f00ba11',
                'bookmark',
                '❤️',
                1789739400000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-zig-vs-rust-systems-benchmark-91c24f',
                'post',
                'p-seo-en-zig-vs-rust-systems-benchmark',
                '91c24f00ba11',
                1,
                1789739400000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-en-local-first-sqlite-opfs-crdt',
            'relays-dev',
            '18df01a2eb34',
            'MEMBER',
            'Architecting Local-First Web Apps in 2026: SQLite in browser via OPFS, CRDTs, and zero-latency offline synchronization 💾⚡',
            'The era of the fragile ''client-server thin client'' is coming to an end. For the past decade, web apps treated the browser as a dumb terminal that broke the second you entered an elevator or tunnel.

With the stabilization of the **Origin Private File System (OPFS)** in modern browsers, we can now run full SQLite databases directly inside the user''s browser with sub-millisecond query performance.

### 1. The Local-First Architecture
- **Storage**: SQLite compiled to WebAssembly with OPFS VFS (Virtual File System). Reads execute in 0.05ms directly against disk-backed storage.
- **State Synchronization**: Changes are captured as CRDT (Conflict-free Replicated Data Type) deltas using Automerge.
- **Transport**: Encrypted WebSockets / WebRTC data channels syncing state vectors when connectivity is detected.
- **Server Role**: Simple authenticated byte relay and durable blob backup—zero complex backend business logic or database ORM locks.

### 2. Why Users Care
- **Zero Latency**: Opening notes, searching across 50,000 records, and filtering occurs at 120 FPS locally.
- **True Ownership**: If our servers shut down tomorrow, the user still has their complete SQLite database file on their local disk.
- **Offline Perfection**: Edit on a plane, sync automatically when landing with zero merge conflict dialogues.

The future of software is local-first, private by design, and fast by default.',
            'SOFTWARE ARCHITECTURE',
            530,
            0,
            4,
            42,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789741200000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-local-first-sqlite-opfs-crdt', 'localfirst', 1789741200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-local-first-sqlite-opfs-crdt', 'sqlite', 1789741200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-local-first-sqlite-opfs-crdt', 'crdt', 1789741200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-local-first-sqlite-opfs-crdt', 'opfs', 1789741200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-local-first-sqlite-opfs-crdt', 'webdev', 1789741200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-local-first-sqlite-opfs-crdt', 'wasm', 1789741200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-local-first-sqlite-opfs-crdt', 'offlinefirst', 1789741200000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-loc-1',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                NULL,
                '61c8012afa34',
                'MEMBER',
                'Local-first paired with WebAuthn client-side credentials makes authentication seamless without cookie session hijacking vulnerabilities.',
                66,
                1789741800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-1-99df01-0',
                    'comment',
                    'c-en-loc-1',
                    '99df012aa4c3',
                    'like',
                    '🧠',
                    1789741830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-1-91df90-2',
                    'comment',
                    'c-en-loc-1',
                    '91df9012cb78',
                    'reaction',
                    '🛡️',
                    1789741890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-1-55a019-3',
                    'comment',
                    'c-en-loc-1',
                    '55a019ef44cc',
                    'like',
                    '💡',
                    1789741920000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-1-79c901-4',
                    'comment',
                    'c-en-loc-1',
                    '79c901affa01',
                    'reaction',
                    '❤️',
                    1789741950000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-1-8d104f-5',
                    'comment',
                    'c-en-loc-1',
                    '8d104fb2a901',
                    'like',
                    '🛡️',
                    1789741980000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-1-24cb90-6',
                    'comment',
                    'c-en-loc-1',
                    '24cb9011af33',
                    'like',
                    '🛡️',
                    1789742010000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-loc-2',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                'c-en-loc-1',
                '18df01a2eb34',
                'MEMBER',
                '@PasskeyPioneer Exactly. The keys and database stay strictly in the user''s browser sandbox. The server only routes encrypted sync diffs.',
                54,
                1789742400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-2-8d104f-0',
                    'comment',
                    'c-en-loc-2',
                    '8d104fb2a901',
                    'reaction',
                    '🛡️',
                    1789742430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-2-55a019-1',
                    'comment',
                    'c-en-loc-2',
                    '55a019ef44cc',
                    'reaction',
                    '👍',
                    1789742460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-2-24cb90-2',
                    'comment',
                    'c-en-loc-2',
                    '24cb9011af33',
                    'like',
                    '💡',
                    1789742490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-2-a50091-3',
                    'comment',
                    'c-en-loc-2',
                    'a500912fa8cc',
                    'reaction',
                    '🔥',
                    1789742520000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-2-6f1084-4',
                    'comment',
                    'c-en-loc-2',
                    '6f1084ea2b99',
                    'like',
                    '👍',
                    1789742550000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-2-99df01-5',
                    'comment',
                    'c-en-loc-2',
                    '99df012aa4c3',
                    'like',
                    '💡',
                    1789742580000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-loc-3',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                NULL,
                '99df012aa4c3',
                'MEMBER',
                'This is the architectural paradigm shift we needed. Users should never see a loading spinner just to open a text note.',
                49,
                1789743000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-3-2d89b1-0',
                    'comment',
                    'c-en-loc-3',
                    '2d89b14c99a0',
                    'reaction',
                    '🧠',
                    1789743030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-3-24cb90-1',
                    'comment',
                    'c-en-loc-3',
                    '24cb9011af33',
                    'reaction',
                    '🧠',
                    1789743060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-3-61c801-3',
                    'comment',
                    'c-en-loc-3',
                    '61c8012afa34',
                    'reaction',
                    '🚀',
                    1789743120000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-3-4e198a-4',
                    'comment',
                    'c-en-loc-3',
                    '4e198a00b215',
                    'like',
                    '🧠',
                    1789743150000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-3-3db014-5',
                    'comment',
                    'c-en-loc-3',
                    '3db014ea9e12',
                    'reaction',
                    '❤️',
                    1789743180000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-loc-4',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                NULL,
                '1df08912de78',
                'MEMBER',
                'CRDT state vectors scale wonderfully when you prune tombstone records periodically. What''s your compaction strategy?',
                42,
                1789743600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-4-4e198a-0',
                    'comment',
                    'c-en-loc-4',
                    '4e198a00b215',
                    'like',
                    '🚀',
                    1789743630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-4-61c801-1',
                    'comment',
                    'c-en-loc-4',
                    '61c8012afa34',
                    'like',
                    '🚀',
                    1789743660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-4-a50091-2',
                    'comment',
                    'c-en-loc-4',
                    'a500912fa8cc',
                    'like',
                    '🔥',
                    1789743690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-4-70a40f-3',
                    'comment',
                    'c-en-loc-4',
                    '70a40f91b2df',
                    'reaction',
                    '❤️',
                    1789743720000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-loc-4-18df01-4',
                    'comment',
                    'c-en-loc-4',
                    '18df01a2eb34',
                    'like',
                    '💡',
                    1789743750000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-55a019-0',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '55a019ef44cc',
                'reaction',
                '❤️',
                1789741260000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-55a019',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '55a019ef44cc',
                1,
                1789741260000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-2d89b1-1',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '2d89b14c99a0',
                'bookmark',
                '👍',
                1789741320000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-2d89b1',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '2d89b14c99a0',
                1,
                1789741320000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-88b401-2',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '88b4012ce9fa',
                'reaction',
                '👍',
                1789741380000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-88b401',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '88b4012ce9fa',
                1,
                1789741380000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-a7df90-3',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                'a7df9012bc23',
                'like',
                '🔥',
                1789741440000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-a7df90',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                'a7df9012bc23',
                1,
                1789741440000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-4e198a-4',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '4e198a00b215',
                'reaction',
                '🧠',
                1789741500000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-4e198a',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '4e198a00b215',
                1,
                1789741500000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-99df01-5',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '99df012aa4c3',
                'reaction',
                '💡',
                1789741560000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-99df01',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '99df012aa4c3',
                1,
                1789741560000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-22c88f-6',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '22c88f01a9df',
                'like',
                '🧠',
                1789741620000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-22c88f',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '22c88f01a9df',
                1,
                1789741620000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-1df089-7',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '1df08912de78',
                'bookmark',
                '🧠',
                1789741680000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-1df089',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '1df08912de78',
                1,
                1789741680000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-83d201-8',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '83d2019fab66',
                'reaction',
                '🚀',
                1789741740000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-83d201',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '83d2019fab66',
                1,
                1789741740000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-24cb90-9',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '24cb9011af33',
                'reaction',
                '👍',
                1789741800000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-24cb90',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '24cb9011af33',
                1,
                1789741800000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-1cf089-10',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '1cf08912fa12',
                'reaction',
                '🔥',
                1789741860000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-1cf089',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '1cf08912fa12',
                1,
                1789741860000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-12df90-11',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '12df9011ac89',
                'reaction',
                '⚡',
                1789741920000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-12df90',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '12df9011ac89',
                1,
                1789741920000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-1bf089-12',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '1bf08912ea56',
                'bookmark',
                '🧠',
                1789741980000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-1bf089',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '1bf08912ea56',
                1,
                1789741980000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-87a01f-13',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '87a01fa29cb5',
                'bookmark',
                '🚀',
                1789742040000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-87a01f',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '87a01fa29cb5',
                1,
                1789742040000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-50c401-14',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '50c4018fef89',
                'reaction',
                '❤️',
                1789742100000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-50c401',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '50c4018fef89',
                1,
                1789742100000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-3db014-15',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '3db014ea9e12',
                'reaction',
                '👍',
                1789742160000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-3db014',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '3db014ea9e12',
                1,
                1789742160000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-b1409e-16',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                'b1409ea28c99',
                'reaction',
                '🚀',
                1789742220000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-b1409e',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                'b1409ea28c99',
                1,
                1789742220000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-6f1084-17',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '6f1084ea2b99',
                'bookmark',
                '🛡️',
                1789742280000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-6f1084',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '6f1084ea2b99',
                1,
                1789742280000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-7f8a91-18',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '7f8a910c2b44',
                'bookmark',
                '🧠',
                1789742340000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-7f8a91',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '7f8a910c2b44',
                1,
                1789742340000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-a50091-19',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                'a500912fa8cc',
                'bookmark',
                '🚀',
                1789742400000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-a50091',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                'a500912fa8cc',
                1,
                1789742400000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-5fc401-20',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '5fc4018fab23',
                'bookmark',
                '🧠',
                1789742460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-5fc401',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '5fc4018fab23',
                1,
                1789742460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-79c901-21',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '79c901affa01',
                'like',
                '🧠',
                1789742520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-79c901',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '79c901affa01',
                1,
                1789742520000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-91df90-22',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '91df9012cb78',
                'reaction',
                '💡',
                1789742580000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-91df90',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '91df9012cb78',
                1,
                1789742580000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-a0914e-23',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                'a0914e21fc88',
                'bookmark',
                '💡',
                1789742640000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-a0914e',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                'a0914e21fc88',
                1,
                1789742640000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-aa0194-24',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                'aa0194f2cd01',
                'reaction',
                '🚀',
                1789742700000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-aa0194',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                'aa0194f2cd01',
                1,
                1789742700000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-61c801-25',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '61c8012afa34',
                'bookmark',
                '⚡',
                1789742760000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-61c801',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '61c8012afa34',
                1,
                1789742760000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-62df09-26',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '62df0912cb88',
                'like',
                '🧠',
                1789742820000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-62df09',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '62df0912cb88',
                1,
                1789742820000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-6d88f1-27',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '6d88f12a04cb',
                'reaction',
                '❤️',
                1789742880000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-6d88f1',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '6d88f12a04cb',
                1,
                1789742880000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-local-first-sqlite-opfs-crdt-91c24f-28',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '91c24f00ba11',
                'bookmark',
                '❤️',
                1789742940000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-local-first-sqlite-opfs-crdt-91c24f',
                'post',
                'p-seo-en-local-first-sqlite-opfs-crdt',
                '91c24f00ba11',
                1,
                1789742940000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-en-mac-studio-m4-max-local-llm',
            'pulse-global',
            'b1409ea28c99',
            'MEMBER',
            'Running Llama 3.3 70B & DeepSeek R1 locally on Mac Studio M4 Max (128GB Unified Memory): Tokens/sec benchmarks & power efficiency 🧠🍎',
            'Last week we took delivery of a Mac Studio with the M4 Max chip (16-core CPU, 40-core GPU, 128GB Unified Memory with 546 GB/s memory bandwidth).

Our primary goal: determine whether Apple Silicon can fully replace dual-GPU RTX 4090 Linux workstations for local developer AI inference.

### 1. Benchmark Results (Throughput & Context)
- **Llama 3.3 70B Instruct (Q4_K_M via MLX)**:
  - Generation Speed: **31.4 tokens/second**
  - Time to First Token (TTFT, 4k prompt): **0.42 seconds**
  - Max Context Tested: 64k tokens loaded comfortably into 48GB VRAM allocation.
- **DeepSeek R1 Distill 70B (Q5_K_M via llama.cpp)**:
  - Generation Speed: **26.8 tokens/second**
  - Reasoning trace generation is completely fluent without hesitation.

### 2. Power & Thermal Comparison vs Dual RTX 4090
- **Peak Power at Wall**:
  - Mac Studio M4 Max: **114 Watts**
  - Dual RTX 4090 Workstation: **790 Watts** (Requires dedicated 1200W PSU and 16A breaker)
- **Acoustics**: The Mac Studio fan never exceeded 1,300 RPM (barely audible at 22 dBA). The dual 4090 rig sounds like a server room under full load.

### Verdict:
For training and fine-tuning, NVIDIA CUDA still rules supreme. But for **daily local inference, coding copilots, and private document RAG**, the 128GB unified memory pool on Apple Silicon is unmatched in price-to-performance and energy efficiency.',
            'AI INFRASTRUCTURE',
            670,
            0,
            5,
            64,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789744800000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-mac-studio-m4-max-local-llm', 'localllm', 1789744800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-mac-studio-m4-max-local-llm', 'apple', 1789744800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-mac-studio-m4-max-local-llm', 'macstudio', 1789744800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-mac-studio-m4-max-local-llm', 'm4max', 1789744800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-mac-studio-m4-max-local-llm', 'llama3', 1789744800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-mac-studio-m4-max-local-llm', 'deepseek', 1789744800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-mac-studio-m4-max-local-llm', 'benchmarks', 1789744800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-mac-studio-m4-max-local-llm', 'ai', 1789744800000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-mac-1',
                'p-seo-en-mac-studio-m4-max-local-llm',
                NULL,
                '2d89b14c99a0',
                'MEMBER',
                '114W under full inference load is insane. My dual 3090 rig heats up my office to 30°C in summer. Apple''s unified memory architecture is a cheat code for LLM parameter loading.',
                82,
                1789745400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-1-5fc401-0',
                    'comment',
                    'c-en-mac-1',
                    '5fc4018fab23',
                    'reaction',
                    '🧠',
                    1789745430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-1-a0914e-1',
                    'comment',
                    'c-en-mac-1',
                    'a0914e21fc88',
                    'like',
                    '🔥',
                    1789745460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-1-94df02-2',
                    'comment',
                    'c-en-mac-1',
                    '94df0218ab44',
                    'like',
                    '❤️',
                    1789745490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-1-1cf089-3',
                    'comment',
                    'c-en-mac-1',
                    '1cf08912fa12',
                    'like',
                    '🚀',
                    1789745520000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-1-91df90-4',
                    'comment',
                    'c-en-mac-1',
                    '91df9012cb78',
                    'like',
                    '🚀',
                    1789745550000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-1-50c401-5',
                    'comment',
                    'c-en-mac-1',
                    '50c4018fef89',
                    'like',
                    '🧠',
                    1789745580000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-1-29c40e-6',
                    'comment',
                    'c-en-mac-1',
                    '29c40e11a8b2',
                    'like',
                    '💡',
                    1789745610000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-mac-2',
                'p-seo-en-mac-studio-m4-max-local-llm',
                'c-en-mac-1',
                'b1409ea28c99',
                'MEMBER',
                '@PixelWitch That was the exact reason for our test. Being able to load a full 70B model into memory without PCIe bottleneck or tensor splitting across cards makes setup dead simple.',
                61,
                1789746000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-2-1bf089-0',
                    'comment',
                    'c-en-mac-2',
                    '1bf08912ea56',
                    'reaction',
                    '🛡️',
                    1789746030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-2-a0914e-1',
                    'comment',
                    'c-en-mac-2',
                    'a0914e21fc88',
                    'like',
                    '🔥',
                    1789746060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-2-7ac901-2',
                    'comment',
                    'c-en-mac-2',
                    '7ac901afcd67',
                    'like',
                    '🛡️',
                    1789746090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-2-6d88f1-3',
                    'comment',
                    'c-en-mac-2',
                    '6d88f12a04cb',
                    'like',
                    '🛡️',
                    1789746120000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-mac-3',
                'p-seo-en-mac-studio-m4-max-local-llm',
                NULL,
                '44df9012a8bc',
                'MEMBER',
                'At 114W, you can easily run this 24/7 off a 300W rooftop solar panel and a 1kWh LiFePO4 battery pack. Completely off-grid private AI.',
                58,
                1789746600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-3-79c901-0',
                    'comment',
                    'c-en-mac-3',
                    '79c901affa01',
                    'like',
                    '🚀',
                    1789746630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-3-87a01f-1',
                    'comment',
                    'c-en-mac-3',
                    '87a01fa29cb5',
                    'reaction',
                    '🛡️',
                    1789746660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-3-5fc401-2',
                    'comment',
                    'c-en-mac-3',
                    '5fc4018fab23',
                    'reaction',
                    '🛡️',
                    1789746690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-3-6d88f1-3',
                    'comment',
                    'c-en-mac-3',
                    '6d88f12a04cb',
                    'reaction',
                    '🔥',
                    1789746720000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-mac-4',
                'p-seo-en-mac-studio-m4-max-local-llm',
                NULL,
                '83d2019fab66',
                'MEMBER',
                'What quantization format did you find had the lowest perplexity loss on coding tasks? Q4_K_M or Q5_K_M?',
                39,
                1789747200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-4-91c24f-0',
                    'comment',
                    'c-en-mac-4',
                    '91c24f00ba11',
                    'like',
                    '🧠',
                    1789747230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-4-5fc401-1',
                    'comment',
                    'c-en-mac-4',
                    '5fc4018fab23',
                    'like',
                    '🚀',
                    1789747260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-4-24cb90-2',
                    'comment',
                    'c-en-mac-4',
                    '24cb9011af33',
                    'like',
                    '❤️',
                    1789747290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-4-6f1084-3',
                    'comment',
                    'c-en-mac-4',
                    '6f1084ea2b99',
                    'reaction',
                    '🛡️',
                    1789747320000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-4-61c801-4',
                    'comment',
                    'c-en-mac-4',
                    '61c8012afa34',
                    'reaction',
                    '💡',
                    1789747350000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-4-4e198a-5',
                    'comment',
                    'c-en-mac-4',
                    '4e198a00b215',
                    'like',
                    '💡',
                    1789747380000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-mac-5',
                'p-seo-en-mac-studio-m4-max-local-llm',
                'c-en-mac-4',
                'b1409ea28c99',
                'MEMBER',
                '@VoronExtruder Q5_K_M hits the sweet spot. 49GB memory footprint and 99.4% of FP16 accuracy on HumanEval coding benchmarks.',
                53,
                1789747800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-5-6f1084-0',
                    'comment',
                    'c-en-mac-5',
                    '6f1084ea2b99',
                    'like',
                    '💡',
                    1789747830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-5-91df90-1',
                    'comment',
                    'c-en-mac-5',
                    '91df9012cb78',
                    'reaction',
                    '💡',
                    1789747860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-5-8d104f-2',
                    'comment',
                    'c-en-mac-5',
                    '8d104fb2a901',
                    'reaction',
                    '🔥',
                    1789747890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-mac-5-a0914e-3',
                    'comment',
                    'c-en-mac-5',
                    'a0914e21fc88',
                    'reaction',
                    '🔥',
                    1789747920000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-7f8a91-0',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '7f8a910c2b44',
                'like',
                '💡',
                1789744860000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-7f8a91',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '7f8a910c2b44',
                1,
                1789744860000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-61c801-1',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '61c8012afa34',
                'bookmark',
                '🛡️',
                1789744920000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-61c801',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '61c8012afa34',
                1,
                1789744920000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-2d89b1-2',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '2d89b14c99a0',
                'reaction',
                '❤️',
                1789744980000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-2d89b1',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '2d89b14c99a0',
                1,
                1789744980000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-55a019-3',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '55a019ef44cc',
                'reaction',
                '👍',
                1789745040000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-55a019',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '55a019ef44cc',
                1,
                1789745040000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-a0914e-4',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                'a0914e21fc88',
                'bookmark',
                '👍',
                1789745100000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-a0914e',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                'a0914e21fc88',
                1,
                1789745100000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-83d201-5',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '83d2019fab66',
                'like',
                '🛡️',
                1789745160000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-83d201',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '83d2019fab66',
                1,
                1789745160000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-77e102-6',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '77e1029ba4c0',
                'like',
                '❤️',
                1789745220000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-77e102',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '77e1029ba4c0',
                1,
                1789745220000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-3db014-7',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '3db014ea9e12',
                'like',
                '🚀',
                1789745280000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-3db014',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '3db014ea9e12',
                1,
                1789745280000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-99df01-8',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '99df012aa4c3',
                'reaction',
                '⚡',
                1789745340000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-99df01',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '99df012aa4c3',
                1,
                1789745340000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-91c24f-9',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '91c24f00ba11',
                'bookmark',
                '🔥',
                1789745400000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-91c24f',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '91c24f00ba11',
                1,
                1789745400000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-a50091-10',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                'a500912fa8cc',
                'bookmark',
                '💡',
                1789745460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-a50091',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                'a500912fa8cc',
                1,
                1789745460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-1cf089-11',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '1cf08912fa12',
                'reaction',
                '💡',
                1789745520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-1cf089',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '1cf08912fa12',
                1,
                1789745520000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-44df90-12',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '44df9012a8bc',
                'bookmark',
                '🔥',
                1789745580000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-44df90',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '44df9012a8bc',
                1,
                1789745580000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-4e198a-13',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '4e198a00b215',
                'reaction',
                '💡',
                1789745640000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-4e198a',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '4e198a00b215',
                1,
                1789745640000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-18df01-14',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '18df01a2eb34',
                'like',
                '⚡',
                1789745700000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-18df01',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '18df01a2eb34',
                1,
                1789745700000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-a7df90-15',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                'a7df9012bc23',
                'reaction',
                '🛡️',
                1789745760000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-a7df90',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                'a7df9012bc23',
                1,
                1789745760000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-6d88f1-16',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '6d88f12a04cb',
                'reaction',
                '🔥',
                1789745820000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-6d88f1',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '6d88f12a04cb',
                1,
                1789745820000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-50c401-17',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '50c4018fef89',
                'bookmark',
                '🛡️',
                1789745880000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-50c401',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '50c4018fef89',
                1,
                1789745880000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-94df02-18',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '94df0218ab44',
                'reaction',
                '🚀',
                1789745940000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-94df02',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '94df0218ab44',
                1,
                1789745940000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-12df90-19',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '12df9011ac89',
                'like',
                '🧠',
                1789746000000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-12df90',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '12df9011ac89',
                1,
                1789746000000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-62df09-20',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '62df0912cb88',
                'like',
                '🚀',
                1789746060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-62df09',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '62df0912cb88',
                1,
                1789746060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-29c40e-21',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '29c40e11a8b2',
                'bookmark',
                '🧠',
                1789746120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-29c40e',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '29c40e11a8b2',
                1,
                1789746120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-24cb90-22',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '24cb9011af33',
                'like',
                '👍',
                1789746180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-24cb90',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '24cb9011af33',
                1,
                1789746180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-87a01f-23',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '87a01fa29cb5',
                'like',
                '❤️',
                1789746240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-87a01f',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '87a01fa29cb5',
                1,
                1789746240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-1df089-25',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '1df08912de78',
                'bookmark',
                '⚡',
                1789746360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-1df089',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '1df08912de78',
                1,
                1789746360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-79c901-26',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '79c901affa01',
                'reaction',
                '❤️',
                1789746420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-79c901',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '79c901affa01',
                1,
                1789746420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-3e901a-27',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '3e901a88fb22',
                'reaction',
                '🚀',
                1789746480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-3e901a',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '3e901a88fb22',
                1,
                1789746480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-88f019-28',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '88f019ab4c21',
                'bookmark',
                '🚀',
                1789746540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-88f019',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '88f019ab4c21',
                1,
                1789746540000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-mac-studio-m4-max-local-llm-70a40f-29',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '70a40f91b2df',
                'bookmark',
                '❤️',
                1789746600000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-mac-studio-m4-max-local-llm-70a40f',
                'post',
                'p-seo-en-mac-studio-m4-max-local-llm',
                '70a40f91b2df',
                1,
                1789746600000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-en-matrix-vs-nostr-vs-xmpp',
            'vault-guides',
            '99df012aa4c3',
            'MEMBER',
            'The State of Decentralized Messaging in 2026: Matrix vs Nostr vs XMPP — An architectural and scalability deep dive 🌐🛡️',
            'With centralized messaging platforms facing increasing government backdoor legislation and metadata harvesting, sovereign communication protocols have reached mainstream developer adoption.

Here is an architectural comparison of the big three open standards:

### 1. Matrix (Federated / Synapse & Conduit)
- **Architecture**: Federated room state replication over HTTPS JSON endpoints.
- **2026 Breakthrough**: The Conduit Rust homeserver rewrite dropped idle server memory usage from 2.5 GB (Python Synapse) to **45 MB RAM**, making self-hosting accessible on a $4 VPS.
- **Strengths**: True group E2EE (Olm/Megolm), native voice/video WebRTC bridging, rich markdown, verified cross-signing.
- **Trade-off**: Event DAG state resolution can lag in massive public rooms with 50,000+ members.

### 2. Nostr (Relay Gossip / Cryptographic Keys)
- **Architecture**: Simple JSON event broadcasting over WebSockets to public/private relays. User identity is an Ed25519 public key.
- **Strengths**: Maximum censorship resistance. If a relay bans your key, your client simply broadcasts to 10 other relays. Zero complex server consensus.
- **Trade-off**: Group chats and private multi-user state synchronization are tricky without metadata leakage. NIP-44 ChaCha20 encryption helped, but it is fundamentally built for public broadcasting.

### 3. XMPP (The Battle-Tested Veteran)
- **Architecture**: Client-to-server XML streaming (RFC 6120) with federated server-to-server routing.
- **Strengths**: Unmatched stability (Prosody server uses 15MB RAM). OMEMO encryption provides Signal-grade ratchet security.
- **Trade-off**: Fragmented client ecosystem across mobile and desktop.

### Conclusion:
- For **public broadcasting & microblogging**: **Nostr**.
- For **secure group chat & team workspaces**: **Matrix (Conduit)**.
- For **ultra-low-overhead embedded messaging**: **XMPP**.',
            'DECENTRALIZED TECH',
            580,
            0,
            4,
            47,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789748400000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-matrix-vs-nostr-vs-xmpp', 'matrix', 1789748400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-matrix-vs-nostr-vs-xmpp', 'nostr', 1789748400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-matrix-vs-nostr-vs-xmpp', 'xmpp', 1789748400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-matrix-vs-nostr-vs-xmpp', 'privacy', 1789748400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-matrix-vs-nostr-vs-xmpp', 'encryption', 1789748400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-matrix-vs-nostr-vs-xmpp', 'decentralized', 1789748400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-matrix-vs-nostr-vs-xmpp', 'messaging', 1789748400000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-msg-1',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                NULL,
                'aa0194f2cd01',
                'MEMBER',
                'Matrix room state resolution algorithm v2 is mathematically sound, but event DAG graph depth calculation still consumes non-trivial CPU under federation desync.',
                71,
                1789749000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-1-55a019-0',
                    'comment',
                    'c-en-msg-1',
                    '55a019ef44cc',
                    'reaction',
                    '🧠',
                    1789749030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-1-a7df90-1',
                    'comment',
                    'c-en-msg-1',
                    'a7df9012bc23',
                    'like',
                    '❤️',
                    1789749060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-1-88b401-2',
                    'comment',
                    'c-en-msg-1',
                    '88b4012ce9fa',
                    'reaction',
                    '🛡️',
                    1789749090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-1-22c88f-3',
                    'comment',
                    'c-en-msg-1',
                    '22c88f01a9df',
                    'reaction',
                    '🛡️',
                    1789749120000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-1-5fc401-4',
                    'comment',
                    'c-en-msg-1',
                    '5fc4018fab23',
                    'reaction',
                    '🛡️',
                    1789749150000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-msg-2',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                'c-en-msg-1',
                '99df012aa4c3',
                'MEMBER',
                '@ZeroDay True for 100k-member channels, which is why Nostr relays shine for Twitter-style broadcasting, while Matrix Conduit is king for secure private collaboration.',
                49,
                1789749600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-2-5fc401-0',
                    'comment',
                    'c-en-msg-2',
                    '5fc4018fab23',
                    'reaction',
                    '🚀',
                    1789749630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-2-1df089-1',
                    'comment',
                    'c-en-msg-2',
                    '1df08912de78',
                    'like',
                    '🛡️',
                    1789749660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-2-a7df90-2',
                    'comment',
                    'c-en-msg-2',
                    'a7df9012bc23',
                    'reaction',
                    '🔥',
                    1789749690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-2-1cf089-3',
                    'comment',
                    'c-en-msg-2',
                    '1cf08912fa12',
                    'reaction',
                    '🧠',
                    1789749720000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-2-6f1084-4',
                    'comment',
                    'c-en-msg-2',
                    '6f1084ea2b99',
                    'reaction',
                    '🚀',
                    1789749750000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-2-a50091-5',
                    'comment',
                    'c-en-msg-2',
                    'a500912fa8cc',
                    'reaction',
                    '❤️',
                    1789749780000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-2-29c40e-6',
                    'comment',
                    'c-en-msg-2',
                    '29c40e11a8b2',
                    'like',
                    '🔥',
                    1789749810000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-msg-3',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                NULL,
                '3db014ea9e12',
                'MEMBER',
                'Nostr NIP-44 with ChaCha20-Poly1305 payload encryption was a huge leap forward over deprecated NIP-04 CBC mode with shared secrets.',
                56,
                1789750200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-3-3e901a-0',
                    'comment',
                    'c-en-msg-3',
                    '3e901a88fb22',
                    'like',
                    '🧠',
                    1789750230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-3-91c24f-1',
                    'comment',
                    'c-en-msg-3',
                    '91c24f00ba11',
                    'reaction',
                    '💡',
                    1789750260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-3-79c901-2',
                    'comment',
                    'c-en-msg-3',
                    '79c901affa01',
                    'like',
                    '🛡️',
                    1789750290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-3-62df09-3',
                    'comment',
                    'c-en-msg-3',
                    '62df0912cb88',
                    'reaction',
                    '🛡️',
                    1789750320000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-3-1df089-4',
                    'comment',
                    'c-en-msg-3',
                    '1df08912de78',
                    'like',
                    '❤️',
                    1789750350000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-3-6d88f1-5',
                    'comment',
                    'c-en-msg-3',
                    '6d88f12a04cb',
                    'like',
                    '💡',
                    1789750380000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-3-87a01f-6',
                    'comment',
                    'c-en-msg-3',
                    '87a01fa29cb5',
                    'like',
                    '❤️',
                    1789750410000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-msg-4',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                NULL,
                '79c901affa01',
                'MEMBER',
                'The dream architecture is DHT peer discovery for initial identity handshake, then direct peer-to-peer encrypted QUIC streams without any relay in between.',
                62,
                1789750800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-4-50c401-0',
                    'comment',
                    'c-en-msg-4',
                    '50c4018fef89',
                    'like',
                    '❤️',
                    1789750830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-4-1bf089-1',
                    'comment',
                    'c-en-msg-4',
                    '1bf08912ea56',
                    'like',
                    '🛡️',
                    1789750860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-4-a7df90-2',
                    'comment',
                    'c-en-msg-4',
                    'a7df9012bc23',
                    'like',
                    '❤️',
                    1789750890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-4-44df90-3',
                    'comment',
                    'c-en-msg-4',
                    '44df9012a8bc',
                    'like',
                    '💡',
                    1789750920000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-4-a0914e-4',
                    'comment',
                    'c-en-msg-4',
                    'a0914e21fc88',
                    'reaction',
                    '💡',
                    1789750950000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-msg-4-8d104f-5',
                    'comment',
                    'c-en-msg-4',
                    '8d104fb2a901',
                    'like',
                    '🔥',
                    1789750980000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-6d88f1-0',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '6d88f12a04cb',
                'bookmark',
                '🚀',
                1789748460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-6d88f1',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '6d88f12a04cb',
                1,
                1789748460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-50c401-1',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '50c4018fef89',
                'bookmark',
                '👍',
                1789748520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-50c401',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '50c4018fef89',
                1,
                1789748520000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-61c801-2',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '61c8012afa34',
                'bookmark',
                '🛡️',
                1789748580000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-61c801',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '61c8012afa34',
                1,
                1789748580000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-91c24f-3',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '91c24f00ba11',
                'like',
                '👍',
                1789748640000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-91c24f',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '91c24f00ba11',
                1,
                1789748640000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-70a40f-4',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '70a40f91b2df',
                'like',
                '🚀',
                1789748700000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-70a40f',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '70a40f91b2df',
                1,
                1789748700000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-91df90-5',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '91df9012cb78',
                'bookmark',
                '⚡',
                1789748760000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-91df90',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '91df9012cb78',
                1,
                1789748760000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-1df089-6',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '1df08912de78',
                'bookmark',
                '💡',
                1789748820000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-1df089',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '1df08912de78',
                1,
                1789748820000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-29c40e-7',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '29c40e11a8b2',
                'reaction',
                '💡',
                1789748880000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-29c40e',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '29c40e11a8b2',
                1,
                1789748880000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-83d201-8',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '83d2019fab66',
                'like',
                '🛡️',
                1789748940000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-83d201',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '83d2019fab66',
                1,
                1789748940000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-a50091-9',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                'a500912fa8cc',
                'reaction',
                '👍',
                1789749000000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-a50091',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                'a500912fa8cc',
                1,
                1789749000000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-94df02-10',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '94df0218ab44',
                'bookmark',
                '🔥',
                1789749060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-94df02',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '94df0218ab44',
                1,
                1789749060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-18df01-11',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '18df01a2eb34',
                'bookmark',
                '⚡',
                1789749120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-18df01',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '18df01a2eb34',
                1,
                1789749120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-88f019-12',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '88f019ab4c21',
                'bookmark',
                '🛡️',
                1789749180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-88f019',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '88f019ab4c21',
                1,
                1789749180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-44df90-13',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '44df9012a8bc',
                'reaction',
                '🔥',
                1789749240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-44df90',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '44df9012a8bc',
                1,
                1789749240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-7ac901-14',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '7ac901afcd67',
                'bookmark',
                '👍',
                1789749300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-7ac901',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '7ac901afcd67',
                1,
                1789749300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-8d104f-15',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '8d104fb2a901',
                'bookmark',
                '🛡️',
                1789749360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-8d104f',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '8d104fb2a901',
                1,
                1789749360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-6f1084-16',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '6f1084ea2b99',
                'like',
                '❤️',
                1789749420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-6f1084',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '6f1084ea2b99',
                1,
                1789749420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-1bf089-17',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '1bf08912ea56',
                'like',
                '🔥',
                1789749480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-1bf089',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '1bf08912ea56',
                1,
                1789749480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-b1409e-18',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                'b1409ea28c99',
                'bookmark',
                '👍',
                1789749540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-b1409e',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                'b1409ea28c99',
                1,
                1789749540000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-77e102-19',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '77e1029ba4c0',
                'reaction',
                '❤️',
                1789749600000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-77e102',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '77e1029ba4c0',
                1,
                1789749600000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-5fc401-20',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '5fc4018fab23',
                'like',
                '❤️',
                1789749660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-5fc401',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '5fc4018fab23',
                1,
                1789749660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-62df09-22',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '62df0912cb88',
                'like',
                '⚡',
                1789749780000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-62df09',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '62df0912cb88',
                1,
                1789749780000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-a0914e-23',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                'a0914e21fc88',
                'bookmark',
                '🛡️',
                1789749840000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-a0914e',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                'a0914e21fc88',
                1,
                1789749840000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-87a01f-24',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '87a01fa29cb5',
                'like',
                '⚡',
                1789749900000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-87a01f',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '87a01fa29cb5',
                1,
                1789749900000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-a7df90-25',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                'a7df9012bc23',
                'bookmark',
                '👍',
                1789749960000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-a7df90',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                'a7df9012bc23',
                1,
                1789749960000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-aa0194-26',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                'aa0194f2cd01',
                'like',
                '🧠',
                1789750020000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-aa0194',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                'aa0194f2cd01',
                1,
                1789750020000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-matrix-vs-nostr-vs-xmpp-3db014-27',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '3db014ea9e12',
                'reaction',
                '👍',
                1789750080000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-matrix-vs-nostr-vs-xmpp-3db014',
                'post',
                'p-seo-en-matrix-vs-nostr-vs-xmpp',
                '3db014ea9e12',
                1,
                1789750080000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-en-ergonomic-split-keyboards-rsi',
            'relays-general',
            '22c88f01a9df',
            'MEMBER',
            'How switching to an ergonomic split keyboard (Glove80 & Corne) and Colemak-DH cured 5 years of developer wrist pain ⌨️🩺',
            'Five years of 10-hour daily coding on standard staggered mechanical keyboards left me with debilitating ulnar nerve compression and carpal tunnel pain. I could barely type for 30 minutes without numbness in my pinky and ring fingers.

Here is what actually solved it permanently:

### 1. The Anatomy of Keyboard Ergonomics
- **Split Design**: Separating the two halves shoulder-width apart eliminates **scapular hunched posture**.
- **Column-Staggered (Ortholinear)**: Our fingers do not naturally travel sideways at angles. Keys arranged in straight vertical columns eliminate lateral finger strain.
- **Tenting (30° - 45°)**: Placing keyboards flat on a desk forces pronation of the forearms (palms facing down). Tenting allows hands to rest in a natural neutral ''handshake'' angle.

### 2. My Hardware Progression:
1. **MoErgo Glove80**: Contoured curved keywells. The thumb cluster puts backspace, enter, space, and layer shifts under your strongest digits instead of overworking your weak pinkies.
2. **Custom Wireless Corne (CRKBD)**: 42 keys, low-profile Kailh Choc v1 switches lubed with Krytox 205g0, running ZMK firmware with Bluetooth sync across laptop and desktop.

### 3. Switching to Colemak-DH Layout
Switching from QWERTY to Colemak-DH took 3 weeks of practice on Monkeytype.
- **Result**: Finger travel distance dropped by **62%**.
- 74% of all typing occurs on the home row without reaching.

If you have early symptoms of RSI, do not wait until nerve damage becomes chronic. Split keyboards and home-row mods are life-changing investments.',
            'ERGONOMICS & HARDWARE',
            510,
            0,
            4,
            41,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789752000000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-ergonomic-split-keyboards-rsi', 'keyboards', 1789752000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-ergonomic-split-keyboards-rsi', 'ergonomics', 1789752000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-ergonomic-split-keyboards-rsi', 'corne', 1789752000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-ergonomic-split-keyboards-rsi', 'glove80', 1789752000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-ergonomic-split-keyboards-rsi', 'colemak', 1789752000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-ergonomic-split-keyboards-rsi', 'hardware', 1789752000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-ergonomic-split-keyboards-rsi', 'rsi', 1789752000000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-kb-1',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                NULL,
                '91df9012cb78',
                'MEMBER',
                'Home-row mods (A/S/D/F as Shift/Ctrl/Alt/Super on hold) felt awkward for the first 3 days, but once you tune `tapping-term-ms = 180`, your hands never leave the home row.',
                75,
                1789752600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-1-50c401-0',
                    'comment',
                    'c-en-kb-1',
                    '50c4018fef89',
                    'like',
                    '🛡️',
                    1789752630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-1-1cf089-1',
                    'comment',
                    'c-en-kb-1',
                    '1cf08912fa12',
                    'reaction',
                    '❤️',
                    1789752660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-1-3db014-2',
                    'comment',
                    'c-en-kb-1',
                    '3db014ea9e12',
                    'reaction',
                    '💡',
                    1789752690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-1-79c901-3',
                    'comment',
                    'c-en-kb-1',
                    '79c901affa01',
                    'reaction',
                    '👍',
                    1789752720000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-1-91c24f-4',
                    'comment',
                    'c-en-kb-1',
                    '91c24f00ba11',
                    'reaction',
                    '❤️',
                    1789752750000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-1-3e901a-5',
                    'comment',
                    'c-en-kb-1',
                    '3e901a88fb22',
                    'reaction',
                    '🚀',
                    1789752780000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-kb-2',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                'c-en-kb-1',
                '22c88f01a9df',
                'MEMBER',
                '@NeovimCult Home-row mods + bilateral combinations are pure ergonomics. No more twisting your wrist just to press Ctrl+Shift+P.',
                58,
                1789753200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-2-7f8a91-0',
                    'comment',
                    'c-en-kb-2',
                    '7f8a910c2b44',
                    'reaction',
                    '🚀',
                    1789753230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-2-83d201-1',
                    'comment',
                    'c-en-kb-2',
                    '83d2019fab66',
                    'reaction',
                    '👍',
                    1789753260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-2-5b2041-2',
                    'comment',
                    'c-en-kb-2',
                    '5b2041e8d902',
                    'like',
                    '🚀',
                    1789753290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-2-4e198a-3',
                    'comment',
                    'c-en-kb-2',
                    '4e198a00b215',
                    'like',
                    '🔥',
                    1789753320000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-2-6f1084-4',
                    'comment',
                    'c-en-kb-2',
                    '6f1084ea2b99',
                    'like',
                    '❤️',
                    1789753350000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-2-62df09-5',
                    'comment',
                    'c-en-kb-2',
                    '62df0912cb88',
                    'reaction',
                    '👍',
                    1789753380000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-kb-3',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                NULL,
                '83d2019fab66',
                'MEMBER',
                'Did you 3D print a high-tenting base for the Corne? Tenting at 35-45 degrees eliminates forearm pronation entirely.',
                44,
                1789753800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-3-79c901-0',
                    'comment',
                    'c-en-kb-3',
                    '79c901affa01',
                    'like',
                    '💡',
                    1789753830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-3-1bf089-1',
                    'comment',
                    'c-en-kb-3',
                    '1bf08912ea56',
                    'like',
                    '🔥',
                    1789753860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-3-99df01-2',
                    'comment',
                    'c-en-kb-3',
                    '99df012aa4c3',
                    'reaction',
                    '🛡️',
                    1789753890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-3-29c40e-3',
                    'comment',
                    'c-en-kb-3',
                    '29c40e11a8b2',
                    'reaction',
                    '👍',
                    1789753920000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-3-70a40f-4',
                    'comment',
                    'c-en-kb-3',
                    '70a40f91b2df',
                    'like',
                    '🧠',
                    1789753950000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-kb-4',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                'c-en-kb-3',
                '22c88f01a9df',
                'MEMBER',
                '@VoronExtruder Yes! Printed an SLS nylon tenting puck with MagSafe magnetic mounts. The natural handshake posture is night and day.',
                61,
                1789754400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-4-44df90-0',
                    'comment',
                    'c-en-kb-4',
                    '44df9012a8bc',
                    'reaction',
                    '👍',
                    1789754430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-4-91df90-1',
                    'comment',
                    'c-en-kb-4',
                    '91df9012cb78',
                    'like',
                    '🛡️',
                    1789754460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-4-91c24f-2',
                    'comment',
                    'c-en-kb-4',
                    '91c24f00ba11',
                    'reaction',
                    '🧠',
                    1789754490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-4-70a40f-3',
                    'comment',
                    'c-en-kb-4',
                    '70a40f91b2df',
                    'like',
                    '❤️',
                    1789754520000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-kb-4-83d201-4',
                    'comment',
                    'c-en-kb-4',
                    '83d2019fab66',
                    'like',
                    '💡',
                    1789754550000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-94df02-0',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '94df0218ab44',
                'reaction',
                '🔥',
                1789752060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-94df02',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '94df0218ab44',
                1,
                1789752060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-7f8a91-1',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '7f8a910c2b44',
                'reaction',
                '🧠',
                1789752120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-7f8a91',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '7f8a910c2b44',
                1,
                1789752120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-61c801-2',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '61c8012afa34',
                'like',
                '👍',
                1789752180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-61c801',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '61c8012afa34',
                1,
                1789752180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-91c24f-3',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '91c24f00ba11',
                'reaction',
                '💡',
                1789752240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-91c24f',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '91c24f00ba11',
                1,
                1789752240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-3db014-4',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '3db014ea9e12',
                'bookmark',
                '🛡️',
                1789752300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-3db014',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '3db014ea9e12',
                1,
                1789752300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-29c40e-5',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '29c40e11a8b2',
                'bookmark',
                '⚡',
                1789752360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-29c40e',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '29c40e11a8b2',
                1,
                1789752360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-a7df90-6',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                'a7df9012bc23',
                'like',
                '❤️',
                1789752420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-a7df90',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                'a7df9012bc23',
                1,
                1789752420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-6d88f1-7',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '6d88f12a04cb',
                'bookmark',
                '🚀',
                1789752480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-6d88f1',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '6d88f12a04cb',
                1,
                1789752480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-b1409e-8',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                'b1409ea28c99',
                'like',
                '🧠',
                1789752540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-b1409e',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                'b1409ea28c99',
                1,
                1789752540000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-a50091-9',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                'a500912fa8cc',
                'reaction',
                '💡',
                1789752600000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-a50091',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                'a500912fa8cc',
                1,
                1789752600000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-1df089-10',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '1df08912de78',
                'like',
                '👍',
                1789752660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-1df089',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '1df08912de78',
                1,
                1789752660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-91df90-11',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '91df9012cb78',
                'reaction',
                '🛡️',
                1789752720000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-91df90',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '91df9012cb78',
                1,
                1789752720000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-5b2041-12',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '5b2041e8d902',
                'reaction',
                '🔥',
                1789752780000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-5b2041',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '5b2041e8d902',
                1,
                1789752780000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-50c401-13',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '50c4018fef89',
                'reaction',
                '👍',
                1789752840000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-50c401',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '50c4018fef89',
                1,
                1789752840000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-3e901a-14',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '3e901a88fb22',
                'bookmark',
                '💡',
                1789752900000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-3e901a',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '3e901a88fb22',
                1,
                1789752900000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-12df90-15',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '12df9011ac89',
                'bookmark',
                '❤️',
                1789752960000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-12df90',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '12df9011ac89',
                1,
                1789752960000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-87a01f-17',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '87a01fa29cb5',
                'like',
                '🚀',
                1789753080000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-87a01f',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '87a01fa29cb5',
                1,
                1789753080000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-99df01-18',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '99df012aa4c3',
                'reaction',
                '💡',
                1789753140000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-99df01',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '99df012aa4c3',
                1,
                1789753140000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-62df09-19',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '62df0912cb88',
                'bookmark',
                '🚀',
                1789753200000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-62df09',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '62df0912cb88',
                1,
                1789753200000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-83d201-20',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '83d2019fab66',
                'like',
                '❤️',
                1789753260000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-83d201',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '83d2019fab66',
                1,
                1789753260000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-55a019-21',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '55a019ef44cc',
                'reaction',
                '🔥',
                1789753320000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-55a019',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '55a019ef44cc',
                1,
                1789753320000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-44df90-22',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '44df9012a8bc',
                'bookmark',
                '⚡',
                1789753380000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-44df90',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '44df9012a8bc',
                1,
                1789753380000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-4e198a-23',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '4e198a00b215',
                'like',
                '⚡',
                1789753440000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-4e198a',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '4e198a00b215',
                1,
                1789753440000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-5fc401-24',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '5fc4018fab23',
                'reaction',
                '🚀',
                1789753500000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-5fc401',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '5fc4018fab23',
                1,
                1789753500000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-1cf089-25',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '1cf08912fa12',
                'like',
                '🚀',
                1789753560000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-1cf089',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '1cf08912fa12',
                1,
                1789753560000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-7ac901-26',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '7ac901afcd67',
                'like',
                '🚀',
                1789753620000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-7ac901',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '7ac901afcd67',
                1,
                1789753620000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-2d89b1-27',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '2d89b14c99a0',
                'reaction',
                '⚡',
                1789753680000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-2d89b1',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '2d89b14c99a0',
                1,
                1789753680000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-18df01-28',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '18df01a2eb34',
                'reaction',
                '👍',
                1789753740000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-18df01',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '18df01a2eb34',
                1,
                1789753740000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-88f019-29',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '88f019ab4c21',
                'reaction',
                '🛡️',
                1789753800000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-88f019',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                '88f019ab4c21',
                1,
                1789753800000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ergonomic-split-keyboards-rsi-aa0194-30',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                'aa0194f2cd01',
                'reaction',
                '🧠',
                1789753860000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ergonomic-split-keyboards-rsi-aa0194',
                'post',
                'p-seo-en-ergonomic-split-keyboards-rsi',
                'aa0194f2cd01',
                1,
                1789753860000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-en-hardware-wallets-airgapped-open-source',
            'vault-guides',
            '1df08912de78',
            'MEMBER',
            'Hardware Wallet Security in 2026: Why closed-source secure elements are a risk and why air-gapped QR signing is mandatory 🔐📦',
            'When self-custodying digital assets, the physical device security model is just as important as your seed phrase backup.

Recent supply-chain vulnerabilities in consumer hardware wallets highlighted why trusting closed-source firmware and direct USB connections is an unacceptable attack vector.

### 1. The Threat of Direct USB Connections
When a hardware wallet connects over USB, it exposes an interface to the host OS. A compromised computer can:
- Exploit buffer overflows in the device''s USB driver stack.
- Send raw malicious APDU packets.
- Perform side-channel voltage/timing analysis.

### 2. Why Air-Gapped Optical Signing Wins
Devices like the **Keystone 3 Pro** and open-source **SeedSigner**:
- Have **no USB data lines, no Bluetooth, no WiFi**.
- Transactions are transferred via **animated QR codes (UR format)**.
- You visually inspect the recipient address, amount, and fee on the device''s independent display before approving.
- Zero data leaves the device except the optical cryptographic signature QR code.

### 3. The 2-of-3 Multisig Gold Standard
Never rely on a single hardware wallet vendor. A 2-of-3 multisig quorum combining:
1. One Trezor Safe 5 (open source firmware, Optiga Trust M secure element)
2. One SeedSigner (stateless, camera-based, DIY Raspberry Pi Zero)
3. One Coldcard or Keystone
Eliminates supply-chain sabotage, physical theft, and software bugs as single points of failure.',
            'HARDWARE SECURITY',
            640,
            0,
            3,
            55,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789755000000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-hardware-wallets-airgapped-open-source', 'security', 1789755000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-hardware-wallets-airgapped-open-source', 'crypto', 1789755000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-hardware-wallets-airgapped-open-source', 'hardwarewallet', 1789755000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-hardware-wallets-airgapped-open-source', 'trezor', 1789755000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-hardware-wallets-airgapped-open-source', 'airgapped', 1789755000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-hardware-wallets-airgapped-open-source', 'multisig', 1789755000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-hardware-wallets-airgapped-open-source', 'privacy', 1789755000000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-hw-1',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                NULL,
                'aa0194f2cd01',
                'MEMBER',
                'Air-gapped QR signing ensures the host computer cannot send malicious raw APDU commands or exploit USB stack bugs in the micro-controller.',
                89,
                1789755600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-hw-1-18df01-0',
                    'comment',
                    'c-en-hw-1',
                    '18df01a2eb34',
                    'like',
                    '🔥',
                    1789755630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-hw-1-88b401-2',
                    'comment',
                    'c-en-hw-1',
                    '88b4012ce9fa',
                    'reaction',
                    '🛡️',
                    1789755690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-hw-1-4e198a-3',
                    'comment',
                    'c-en-hw-1',
                    '4e198a00b215',
                    'reaction',
                    '💡',
                    1789755720000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-hw-2',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                NULL,
                '3db014ea9e12',
                'MEMBER',
                'Also verify your firmware hashes with reproducible deterministic builds before flashing any device.',
                67,
                1789756200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-hw-2-4e198a-0',
                    'comment',
                    'c-en-hw-2',
                    '4e198a00b215',
                    'reaction',
                    '❤️',
                    1789756230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-hw-2-44df90-1',
                    'comment',
                    'c-en-hw-2',
                    '44df9012a8bc',
                    'reaction',
                    '🧠',
                    1789756260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-hw-2-12df90-2',
                    'comment',
                    'c-en-hw-2',
                    '12df9011ac89',
                    'like',
                    '👍',
                    1789756290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-hw-2-70a40f-3',
                    'comment',
                    'c-en-hw-2',
                    '70a40f91b2df',
                    'like',
                    '🛡️',
                    1789756320000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-hw-2-50c401-4',
                    'comment',
                    'c-en-hw-2',
                    '50c4018fef89',
                    'reaction',
                    '🛡️',
                    1789756350000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-hw-2-24cb90-5',
                    'comment',
                    'c-en-hw-2',
                    '24cb9011af33',
                    'like',
                    '🔥',
                    1789756380000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-hw-3',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                'c-en-hw-2',
                '1df08912de78',
                'MEMBER',
                '@AntiTracker Absolutely. If the vendor does not provide reproducible build scripts with SHA-256 verification, do not trust it with your private keys.',
                59,
                1789756800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-hw-3-a0914e-0',
                    'comment',
                    'c-en-hw-3',
                    'a0914e21fc88',
                    'like',
                    '🔥',
                    1789756830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-hw-3-6f1084-1',
                    'comment',
                    'c-en-hw-3',
                    '6f1084ea2b99',
                    'reaction',
                    '🔥',
                    1789756860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-hw-3-83d201-2',
                    'comment',
                    'c-en-hw-3',
                    '83d2019fab66',
                    'reaction',
                    '🔥',
                    1789756890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-hw-3-77e102-3',
                    'comment',
                    'c-en-hw-3',
                    '77e1029ba4c0',
                    'like',
                    '🛡️',
                    1789756920000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-hw-3-b1409e-4',
                    'comment',
                    'c-en-hw-3',
                    'b1409ea28c99',
                    'reaction',
                    '🧠',
                    1789756950000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-hw-3-55a019-5',
                    'comment',
                    'c-en-hw-3',
                    '55a019ef44cc',
                    'like',
                    '🛡️',
                    1789756980000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-70a40f-0',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '70a40f91b2df',
                'like',
                '🛡️',
                1789755060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-70a40f',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '70a40f91b2df',
                1,
                1789755060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-a7df90-1',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                'a7df9012bc23',
                'reaction',
                '🧠',
                1789755120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-a7df90',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                'a7df9012bc23',
                1,
                1789755120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-6d88f1-2',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '6d88f12a04cb',
                'like',
                '💡',
                1789755180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-6d88f1',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '6d88f12a04cb',
                1,
                1789755180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-5b2041-3',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '5b2041e8d902',
                'reaction',
                '❤️',
                1789755240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-5b2041',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '5b2041e8d902',
                1,
                1789755240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-6f1084-4',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '6f1084ea2b99',
                'reaction',
                '🧠',
                1789755300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-6f1084',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '6f1084ea2b99',
                1,
                1789755300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-29c40e-5',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '29c40e11a8b2',
                'reaction',
                '👍',
                1789755360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-29c40e',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '29c40e11a8b2',
                1,
                1789755360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-24cb90-6',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '24cb9011af33',
                'like',
                '🔥',
                1789755420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-24cb90',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '24cb9011af33',
                1,
                1789755420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-50c401-7',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '50c4018fef89',
                'bookmark',
                '🛡️',
                1789755480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-50c401',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '50c4018fef89',
                1,
                1789755480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-8d104f-8',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '8d104fb2a901',
                'like',
                '⚡',
                1789755540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-8d104f',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '8d104fb2a901',
                1,
                1789755540000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-99df01-9',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '99df012aa4c3',
                'like',
                '🧠',
                1789755600000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-99df01',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '99df012aa4c3',
                1,
                1789755600000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-83d201-10',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '83d2019fab66',
                'like',
                '👍',
                1789755660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-83d201',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '83d2019fab66',
                1,
                1789755660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-1bf089-11',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '1bf08912ea56',
                'like',
                '💡',
                1789755720000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-1bf089',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '1bf08912ea56',
                1,
                1789755720000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-88f019-13',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '88f019ab4c21',
                'bookmark',
                '👍',
                1789755840000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-88f019',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '88f019ab4c21',
                1,
                1789755840000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-91df90-14',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '91df9012cb78',
                'bookmark',
                '👍',
                1789755900000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-91df90',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '91df9012cb78',
                1,
                1789755900000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-3db014-15',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '3db014ea9e12',
                'bookmark',
                '⚡',
                1789755960000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-3db014',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '3db014ea9e12',
                1,
                1789755960000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-7ac901-16',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '7ac901afcd67',
                'reaction',
                '🚀',
                1789756020000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-7ac901',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '7ac901afcd67',
                1,
                1789756020000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-7f8a91-17',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '7f8a910c2b44',
                'bookmark',
                '⚡',
                1789756080000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-7f8a91',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '7f8a910c2b44',
                1,
                1789756080000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-1cf089-18',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '1cf08912fa12',
                'like',
                '🔥',
                1789756140000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-1cf089',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '1cf08912fa12',
                1,
                1789756140000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-22c88f-19',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '22c88f01a9df',
                'bookmark',
                '👍',
                1789756200000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-22c88f',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '22c88f01a9df',
                1,
                1789756200000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-18df01-20',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '18df01a2eb34',
                'like',
                '🧠',
                1789756260000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-18df01',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '18df01a2eb34',
                1,
                1789756260000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-44df90-21',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '44df9012a8bc',
                'bookmark',
                '👍',
                1789756320000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-44df90',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '44df9012a8bc',
                1,
                1789756320000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-b1409e-22',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                'b1409ea28c99',
                'reaction',
                '🔥',
                1789756380000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-b1409e',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                'b1409ea28c99',
                1,
                1789756380000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-2d89b1-23',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '2d89b14c99a0',
                'like',
                '🛡️',
                1789756440000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-2d89b1',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '2d89b14c99a0',
                1,
                1789756440000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-aa0194-24',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                'aa0194f2cd01',
                'reaction',
                '💡',
                1789756500000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-aa0194',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                'aa0194f2cd01',
                1,
                1789756500000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-3e901a-25',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '3e901a88fb22',
                'like',
                '🧠',
                1789756560000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-3e901a',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '3e901a88fb22',
                1,
                1789756560000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-61c801-26',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '61c8012afa34',
                'bookmark',
                '⚡',
                1789756620000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-61c801',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '61c8012afa34',
                1,
                1789756620000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-4e198a-27',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '4e198a00b215',
                'reaction',
                '👍',
                1789756680000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-4e198a',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '4e198a00b215',
                1,
                1789756680000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-5fc401-28',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '5fc4018fab23',
                'reaction',
                '🛡️',
                1789756740000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-5fc401',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '5fc4018fab23',
                1,
                1789756740000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-62df09-29',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '62df0912cb88',
                'reaction',
                '🔥',
                1789756800000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-62df09',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '62df0912cb88',
                1,
                1789756800000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-hardware-wallets-airgapped-open-source-55a019-30',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '55a019ef44cc',
                'reaction',
                '🔥',
                1789756860000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-hardware-wallets-airgapped-open-source-55a019',
                'post',
                'p-seo-en-hardware-wallets-airgapped-open-source',
                '55a019ef44cc',
                1,
                1789756860000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-en-ghostty-vs-wezterm-alacritty',
            'relays-dev',
            '91df9012cb78',
            'MEMBER',
            'GPU-Accelerated Terminal Benchmarks 2026: Ghostty vs WezTerm vs Alacritty tested on Linux & macOS 🚀🖥️',
            'Mitchell Hashimoto''s terminal emulator **Ghostty** (written in Zig) has shaken up the terminal ecosystem. We ran extensive input latency and memory benchmarks across Ghostty, WezTerm, and Alacritty on both Fedora 41 (Wayland) and macOS Sequoia.

### 1. Typometer Input Latency (144Hz Display):
- **Ghostty**: **2.4 ms** (Near instantaneous frame pacing via Metal / OpenGL)
- **Alacritty**: **3.1 ms**
- **WezTerm**: **6.8 ms**
- **Kitty**: **3.8 ms**

### 2. Memory Usage (50 Active Tmux Panes with Large Scrollback):
- **Ghostty**: **22 MB RSS**
- **Alacritty**: **19 MB RSS**
- **WezTerm**: **142 MB RSS** (Lua runtime overhead)

### 3. Feature Highlights & Ergonomics:
- **Ghostty**: Built-in tabs without needing tmux, native Wayland fractional scaling, custom GLSL shader effects, and zero-config truecolor/ligature support.
- **WezTerm**: Unrivaled configuration power with Lua scripts, but noticeably heavier memory footprint.
- **Alacritty**: The minimalist speed king, but still lacks native tab bars or splits.

Ghostty has become my daily driver on both Linux and Mac. The input responsiveness in Neovim is perceptible immediately.',
            'DEVELOPER TOOLS',
            580,
            0,
            4,
            48,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789757400000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-ghostty-vs-wezterm-alacritty', 'ghostty', 1789757400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-ghostty-vs-wezterm-alacritty', 'wezterm', 1789757400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-ghostty-vs-wezterm-alacritty', 'alacritty', 1789757400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-ghostty-vs-wezterm-alacritty', 'terminal', 1789757400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-ghostty-vs-wezterm-alacritty', 'benchmark', 1789757400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-ghostty-vs-wezterm-alacritty', 'linux', 1789757400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-ghostty-vs-wezterm-alacritty', 'macos', 1789757400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-ghostty-vs-wezterm-alacritty', 'zig', 1789757400000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-term-1',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                NULL,
                '29c40e11a8b2',
                'MEMBER',
                'Ghostty shader support and font rendering consistency across Wayland and macOS is incredible. Zig memory footprint keeps it at ~20MB RAM.',
                73,
                1789758000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-1-87a01f-0',
                    'comment',
                    'c-en-term-1',
                    '87a01fa29cb5',
                    'reaction',
                    '🔥',
                    1789758030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-1-77e102-1',
                    'comment',
                    'c-en-term-1',
                    '77e1029ba4c0',
                    'like',
                    '💡',
                    1789758060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-1-5fc401-2',
                    'comment',
                    'c-en-term-1',
                    '5fc4018fab23',
                    'reaction',
                    '🔥',
                    1789758090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-1-91df90-3',
                    'comment',
                    'c-en-term-1',
                    '91df9012cb78',
                    'reaction',
                    '🛡️',
                    1789758120000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-term-2',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                NULL,
                '7f8a910c2b44',
                'MEMBER',
                'How is Wayland Fractional Scaling handled in Ghostty? Alacritty used to get blurry text on 150% scaling.',
                45,
                1789758600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-2-79c901-0',
                    'comment',
                    'c-en-term-2',
                    '79c901affa01',
                    'reaction',
                    '🧠',
                    1789758630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-2-aa0194-1',
                    'comment',
                    'c-en-term-2',
                    'aa0194f2cd01',
                    'like',
                    '🧠',
                    1789758660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-2-24cb90-2',
                    'comment',
                    'c-en-term-2',
                    '24cb9011af33',
                    'reaction',
                    '🔥',
                    1789758690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-2-50c401-3',
                    'comment',
                    'c-en-term-2',
                    '50c4018fef89',
                    'reaction',
                    '🛡️',
                    1789758720000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-2-1df089-5',
                    'comment',
                    'c-en-term-2',
                    '1df08912de78',
                    'reaction',
                    '🧠',
                    1789758780000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-term-3',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                'c-en-term-2',
                '91df9012cb78',
                'MEMBER',
                '@ArchChad Pixel-perfect on Wayland with fractional scale v1 protocol. Crisp fonts even with ligatures enabled.',
                54,
                1789759200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-3-94df02-0',
                    'comment',
                    'c-en-term-3',
                    '94df0218ab44',
                    'like',
                    '💡',
                    1789759230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-3-44df90-1',
                    'comment',
                    'c-en-term-3',
                    '44df9012a8bc',
                    'reaction',
                    '🔥',
                    1789759260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-3-4e198a-2',
                    'comment',
                    'c-en-term-3',
                    '4e198a00b215',
                    'reaction',
                    '🚀',
                    1789759290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-3-83d201-3',
                    'comment',
                    'c-en-term-3',
                    '83d2019fab66',
                    'like',
                    '❤️',
                    1789759320000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-term-4',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                NULL,
                '22c88f01a9df',
                'MEMBER',
                'Ghostty + Neovim + Tmux on a 144Hz monitor feels instantaneous. Typing latency matters so much for flow state.',
                63,
                1789759800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-4-a50091-0',
                    'comment',
                    'c-en-term-4',
                    'a500912fa8cc',
                    'like',
                    '🧠',
                    1789759830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-4-5fc401-1',
                    'comment',
                    'c-en-term-4',
                    '5fc4018fab23',
                    'like',
                    '👍',
                    1789759860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-4-3db014-2',
                    'comment',
                    'c-en-term-4',
                    '3db014ea9e12',
                    'reaction',
                    '💡',
                    1789759890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-4-24cb90-3',
                    'comment',
                    'c-en-term-4',
                    '24cb9011af33',
                    'reaction',
                    '❤️',
                    1789759920000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-4-2d89b1-4',
                    'comment',
                    'c-en-term-4',
                    '2d89b14c99a0',
                    'reaction',
                    '❤️',
                    1789759950000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-term-4-1df089-5',
                    'comment',
                    'c-en-term-4',
                    '1df08912de78',
                    'reaction',
                    '❤️',
                    1789759980000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-4e198a-0',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '4e198a00b215',
                'like',
                '🚀',
                1789757460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-4e198a',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '4e198a00b215',
                1,
                1789757460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-1df089-1',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '1df08912de78',
                'bookmark',
                '🛡️',
                1789757520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-1df089',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '1df08912de78',
                1,
                1789757520000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-a0914e-2',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                'a0914e21fc88',
                'reaction',
                '🔥',
                1789757580000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-a0914e',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                'a0914e21fc88',
                1,
                1789757580000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-8d104f-3',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '8d104fb2a901',
                'reaction',
                '⚡',
                1789757640000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-8d104f',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '8d104fb2a901',
                1,
                1789757640000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-44df90-4',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '44df9012a8bc',
                'like',
                '🛡️',
                1789757700000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-44df90',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '44df9012a8bc',
                1,
                1789757700000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-88b401-5',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '88b4012ce9fa',
                'like',
                '🛡️',
                1789757760000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-88b401',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '88b4012ce9fa',
                1,
                1789757760000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-62df09-6',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '62df0912cb88',
                'bookmark',
                '🧠',
                1789757820000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-62df09',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '62df0912cb88',
                1,
                1789757820000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-1cf089-7',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '1cf08912fa12',
                'reaction',
                '❤️',
                1789757880000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-1cf089',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '1cf08912fa12',
                1,
                1789757880000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-87a01f-8',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '87a01fa29cb5',
                'bookmark',
                '❤️',
                1789757940000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-87a01f',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '87a01fa29cb5',
                1,
                1789757940000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-99df01-9',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '99df012aa4c3',
                'reaction',
                '👍',
                1789758000000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-99df01',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '99df012aa4c3',
                1,
                1789758000000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-5fc401-10',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '5fc4018fab23',
                'reaction',
                '🚀',
                1789758060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-5fc401',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '5fc4018fab23',
                1,
                1789758060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-94df02-11',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '94df0218ab44',
                'reaction',
                '👍',
                1789758120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-94df02',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '94df0218ab44',
                1,
                1789758120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-6f1084-12',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '6f1084ea2b99',
                'bookmark',
                '🛡️',
                1789758180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-6f1084',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '6f1084ea2b99',
                1,
                1789758180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-22c88f-13',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '22c88f01a9df',
                'reaction',
                '👍',
                1789758240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-22c88f',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '22c88f01a9df',
                1,
                1789758240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-6d88f1-14',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '6d88f12a04cb',
                'bookmark',
                '🧠',
                1789758300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-6d88f1',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '6d88f12a04cb',
                1,
                1789758300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-3db014-15',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '3db014ea9e12',
                'bookmark',
                '🧠',
                1789758360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-3db014',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '3db014ea9e12',
                1,
                1789758360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-a50091-16',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                'a500912fa8cc',
                'bookmark',
                '👍',
                1789758420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-a50091',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                'a500912fa8cc',
                1,
                1789758420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-79c901-17',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '79c901affa01',
                'bookmark',
                '❤️',
                1789758480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-79c901',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '79c901affa01',
                1,
                1789758480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-77e102-18',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '77e1029ba4c0',
                'like',
                '🚀',
                1789758540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-77e102',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '77e1029ba4c0',
                1,
                1789758540000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-70a40f-19',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '70a40f91b2df',
                'like',
                '🧠',
                1789758600000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-70a40f',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '70a40f91b2df',
                1,
                1789758600000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-50c401-20',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '50c4018fef89',
                'reaction',
                '🚀',
                1789758660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-50c401',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '50c4018fef89',
                1,
                1789758660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-24cb90-21',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '24cb9011af33',
                'bookmark',
                '👍',
                1789758720000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-24cb90',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '24cb9011af33',
                1,
                1789758720000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-5b2041-22',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '5b2041e8d902',
                'reaction',
                '⚡',
                1789758780000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-5b2041',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '5b2041e8d902',
                1,
                1789758780000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-29c40e-23',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '29c40e11a8b2',
                'like',
                '⚡',
                1789758840000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-29c40e',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '29c40e11a8b2',
                1,
                1789758840000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-b1409e-24',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                'b1409ea28c99',
                'bookmark',
                '🚀',
                1789758900000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-b1409e',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                'b1409ea28c99',
                1,
                1789758900000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-ghostty-vs-wezterm-alacritty-7ac901-25',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '7ac901afcd67',
                'reaction',
                '⚡',
                1789758960000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-ghostty-vs-wezterm-alacritty-7ac901',
                'post',
                'p-seo-en-ghostty-vs-wezterm-alacritty',
                '7ac901afcd67',
                1,
                1789758960000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
            'vault-guides',
            '3db014ea9e12',
            'MEMBER',
            'Pi-hole vs AdGuard Home in 2026: DNS-over-HTTPS, client-specific profiles, and blocking 14,000 smart TV tracking queries per day 🛡️📺',
            'Smart TVs and IoT streaming devices are the most aggressive telemetry surveillance devices in consumer homes.

We connected a new Samsung Tizen TV and LG OLED to an isolated VLAN and logged all outbound DNS traffic for 48 hours.

### 1. What Your Smart TV Sends Behind Your Back
- **Every 4 seconds**: Outbound ping to ACR (Automatic Content Recognition) fingerprinting servers (`samsungcloudsolution.com`, `ad.samsungadhub.com`).
- **HDMI Screenshots**: Periodic audio/video hash samples uploaded to identify what HDMI content or game console you are playing.
- **Total queries**: Over **14,200 telemetry requests in 48 hours**.

### 2. Why AdGuard Home Superseded Pi-hole for Us
- **Native DNS-over-HTTPS / DoT Upstream**: Encrypts your DNS queries before leaving your house without requiring complicated cloudflared sidecar containers.
- **Client-Specific Filtering**: We can block all tracking and disable YouTube ads on the Smart TV VLAN while leaving developer workstations unrestricted.
- **Regex Blocklists**: Allows blocking entire subdomains dynamically with regular expressions.
- **Resource Footprint**: Written in Go, uses only 42MB RAM on an LXC container.

Pair AdGuard Home with an **Unbound recursive DNS resolver**, and your ISP will never see which websites or servers you connect to.',
            'PRIVACY & NETWORKING',
            610,
            0,
            4,
            52,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789760400000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry', 'adguard', 1789760400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry', 'pihole', 1789760400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry', 'dns', 1789760400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry', 'privacy', 1789760400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry', 'networking', 1789760400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry', 'homelab', 1789760400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry', 'telemetry', 1789760400000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-dns-1',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                NULL,
                '62df0912cb88',
                'MEMBER',
                'Smart TVs are basically ad-tech billboards masquerading as monitors. The amount of background traffic Samsung TVs generate is shameful.',
                81,
                1789761000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-1-55a019-0',
                    'comment',
                    'c-en-dns-1',
                    '55a019ef44cc',
                    'reaction',
                    '💡',
                    1789761030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-1-5fc401-1',
                    'comment',
                    'c-en-dns-1',
                    '5fc4018fab23',
                    'like',
                    '👍',
                    1789761060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-1-29c40e-2',
                    'comment',
                    'c-en-dns-1',
                    '29c40e11a8b2',
                    'like',
                    '❤️',
                    1789761090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-1-7ac901-3',
                    'comment',
                    'c-en-dns-1',
                    '7ac901afcd67',
                    'reaction',
                    '🧠',
                    1789761120000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-1-50c401-4',
                    'comment',
                    'c-en-dns-1',
                    '50c4018fef89',
                    'reaction',
                    '🚀',
                    1789761150000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-1-3e901a-5',
                    'comment',
                    'c-en-dns-1',
                    '3e901a88fb22',
                    'like',
                    '🔥',
                    1789761180000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-dns-2',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                'c-en-dns-1',
                '3db014ea9e12',
                'MEMBER',
                '@PacketStorm Exactly. In our test, blocking those telemetry endpoints reduced background WiFi traffic by 82% without breaking Netflix or Plex.',
                69,
                1789761600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-2-6d88f1-0',
                    'comment',
                    'c-en-dns-2',
                    '6d88f12a04cb',
                    'like',
                    '🧠',
                    1789761630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-2-6f1084-1',
                    'comment',
                    'c-en-dns-2',
                    '6f1084ea2b99',
                    'like',
                    '🛡️',
                    1789761660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-2-24cb90-2',
                    'comment',
                    'c-en-dns-2',
                    '24cb9011af33',
                    'reaction',
                    '🛡️',
                    1789761690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-2-18df01-3',
                    'comment',
                    'c-en-dns-2',
                    '18df01a2eb34',
                    'like',
                    '🧠',
                    1789761720000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-2-12df90-4',
                    'comment',
                    'c-en-dns-2',
                    '12df9011ac89',
                    'reaction',
                    '❤️',
                    1789761750000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-2-5fc401-5',
                    'comment',
                    'c-en-dns-2',
                    '5fc4018fab23',
                    'reaction',
                    '🚀',
                    1789761780000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-2-2d89b1-6',
                    'comment',
                    'c-en-dns-2',
                    '2d89b14c99a0',
                    'like',
                    '💡',
                    1789761810000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-dns-3',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                NULL,
                '70a40f91b2df',
                'MEMBER',
                'Unbound with DNSSEC validation is the best complement. No third-party upstream DNS can log your IP''s query history.',
                55,
                1789762200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-3-2d89b1-0',
                    'comment',
                    'c-en-dns-3',
                    '2d89b14c99a0',
                    'like',
                    '🛡️',
                    1789762230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-3-b1409e-1',
                    'comment',
                    'c-en-dns-3',
                    'b1409ea28c99',
                    'reaction',
                    '🛡️',
                    1789762260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-3-8d104f-2',
                    'comment',
                    'c-en-dns-3',
                    '8d104fb2a901',
                    'reaction',
                    '🧠',
                    1789762290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-3-5fc401-3',
                    'comment',
                    'c-en-dns-3',
                    '5fc4018fab23',
                    'reaction',
                    '❤️',
                    1789762320000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-dns-4',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                NULL,
                '44df9012a8bc',
                'MEMBER',
                'Runs effortlessly on an LXC container consuming less than 60MB RAM. Essential first step for any home network.',
                48,
                1789762800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-4-7f8a91-0',
                    'comment',
                    'c-en-dns-4',
                    '7f8a910c2b44',
                    'reaction',
                    '🛡️',
                    1789762830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-4-b1409e-1',
                    'comment',
                    'c-en-dns-4',
                    'b1409ea28c99',
                    'reaction',
                    '🛡️',
                    1789762860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-4-3e901a-2',
                    'comment',
                    'c-en-dns-4',
                    '3e901a88fb22',
                    'reaction',
                    '❤️',
                    1789762890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-4-1bf089-3',
                    'comment',
                    'c-en-dns-4',
                    '1bf08912ea56',
                    'like',
                    '🔥',
                    1789762920000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-4-55a019-4',
                    'comment',
                    'c-en-dns-4',
                    '55a019ef44cc',
                    'reaction',
                    '🧠',
                    1789762950000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-4-91df90-5',
                    'comment',
                    'c-en-dns-4',
                    '91df9012cb78',
                    'like',
                    '💡',
                    1789762980000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-dns-4-aa0194-6',
                    'comment',
                    'c-en-dns-4',
                    'aa0194f2cd01',
                    'like',
                    '🛡️',
                    1789763010000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-62df09-0',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '62df0912cb88',
                'like',
                '💡',
                1789760460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-62df09',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '62df0912cb88',
                1,
                1789760460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-79c901-1',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '79c901affa01',
                'like',
                '🔥',
                1789760520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-79c901',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '79c901affa01',
                1,
                1789760520000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-6d88f1-2',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '6d88f12a04cb',
                'like',
                '🛡️',
                1789760580000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-6d88f1',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '6d88f12a04cb',
                1,
                1789760580000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-b1409e-3',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                'b1409ea28c99',
                'reaction',
                '👍',
                1789760640000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-b1409e',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                'b1409ea28c99',
                1,
                1789760640000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-18df01-4',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '18df01a2eb34',
                'bookmark',
                '🔥',
                1789760700000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-18df01',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '18df01a2eb34',
                1,
                1789760700000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-88b401-5',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '88b4012ce9fa',
                'bookmark',
                '🚀',
                1789760760000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-88b401',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '88b4012ce9fa',
                1,
                1789760760000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-12df90-6',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '12df9011ac89',
                'bookmark',
                '💡',
                1789760820000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-12df90',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '12df9011ac89',
                1,
                1789760820000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-7ac901-7',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '7ac901afcd67',
                'reaction',
                '🔥',
                1789760880000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-7ac901',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '7ac901afcd67',
                1,
                1789760880000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-70a40f-8',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '70a40f91b2df',
                'bookmark',
                '🔥',
                1789760940000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-70a40f',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '70a40f91b2df',
                1,
                1789760940000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-91c24f-9',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '91c24f00ba11',
                'bookmark',
                '🔥',
                1789761000000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-91c24f',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '91c24f00ba11',
                1,
                1789761000000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-94df02-10',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '94df0218ab44',
                'like',
                '🔥',
                1789761060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-94df02',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '94df0218ab44',
                1,
                1789761060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-99df01-11',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '99df012aa4c3',
                'bookmark',
                '👍',
                1789761120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-99df01',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '99df012aa4c3',
                1,
                1789761120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-6f1084-12',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '6f1084ea2b99',
                'like',
                '👍',
                1789761180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-6f1084',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '6f1084ea2b99',
                1,
                1789761180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-8d104f-13',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '8d104fb2a901',
                'bookmark',
                '👍',
                1789761240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-8d104f',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '8d104fb2a901',
                1,
                1789761240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-7f8a91-14',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '7f8a910c2b44',
                'reaction',
                '🛡️',
                1789761300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-7f8a91',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '7f8a910c2b44',
                1,
                1789761300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-24cb90-15',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '24cb9011af33',
                'reaction',
                '⚡',
                1789761360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-24cb90',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '24cb9011af33',
                1,
                1789761360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-61c801-16',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '61c8012afa34',
                'reaction',
                '💡',
                1789761420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-61c801',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '61c8012afa34',
                1,
                1789761420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-a7df90-17',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                'a7df9012bc23',
                'reaction',
                '💡',
                1789761480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-a7df90',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                'a7df9012bc23',
                1,
                1789761480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-1cf089-18',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '1cf08912fa12',
                'reaction',
                '🛡️',
                1789761540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-1cf089',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '1cf08912fa12',
                1,
                1789761540000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-29c40e-19',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '29c40e11a8b2',
                'reaction',
                '👍',
                1789761600000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-29c40e',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '29c40e11a8b2',
                1,
                1789761600000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-77e102-20',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '77e1029ba4c0',
                'bookmark',
                '👍',
                1789761660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-77e102',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '77e1029ba4c0',
                1,
                1789761660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-1df089-21',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '1df08912de78',
                'reaction',
                '⚡',
                1789761720000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-1df089',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '1df08912de78',
                1,
                1789761720000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-2d89b1-22',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '2d89b14c99a0',
                'bookmark',
                '💡',
                1789761780000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-2d89b1',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '2d89b14c99a0',
                1,
                1789761780000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-aa0194-23',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                'aa0194f2cd01',
                'reaction',
                '🔥',
                1789761840000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-aa0194',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                'aa0194f2cd01',
                1,
                1789761840000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-1bf089-24',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '1bf08912ea56',
                'bookmark',
                '💡',
                1789761900000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-1bf089',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '1bf08912ea56',
                1,
                1789761900000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-87a01f-25',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '87a01fa29cb5',
                'bookmark',
                '⚡',
                1789761960000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-87a01f',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '87a01fa29cb5',
                1,
                1789761960000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-91df90-26',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '91df9012cb78',
                'like',
                '❤️',
                1789762020000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-91df90',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '91df9012cb78',
                1,
                1789762020000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-55a019-27',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '55a019ef44cc',
                'reaction',
                '🛡️',
                1789762080000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-55a019',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '55a019ef44cc',
                1,
                1789762080000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-50c401-28',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '50c4018fef89',
                'reaction',
                '🛡️',
                1789762140000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-50c401',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '50c4018fef89',
                1,
                1789762140000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-5b2041-29',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '5b2041e8d902',
                'reaction',
                '❤️',
                1789762200000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry-5b2041',
                'post',
                'p-seo-en-adguard-home-vs-pihole-smart-tv-telemetry',
                '5b2041e8d902',
                1,
                1789762200000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-en-sqlite-litestream-production-saas',
            'relays-dev',
            '18df01a2eb34',
            'MEMBER',
            'Why SQLite + Litestream is our default database stack in 2026 (Handling 40M queries/day for $15/mo) 🗄️🔥',
            'For decades, web developers have been indoctrinated to believe that every production application requires a dedicated client-server database like PostgreSQL or MySQL.

For the past 14 months, our flagship SaaS product has run entirely on **SQLite with Litestream continuous replication**.

### 1. The Numbers:
- **Daily Read Queries**: 42,000,000
- **Daily Write Queries**: 1,800,000
- **P99 Read Latency**: **0.018 milliseconds** (Within the same process memory space)
- **Database Server Cost**: **$15/month** (Single Hetzner VPS with NVMe storage)

### 2. How Concurrency Works with WAL Mode:
By setting:
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA cache_size = -64000; -- 64MB memory cache
```
Readers never block writers, and writers never block readers. On modern NVMe SSDs, writes commit in microseconds.

### 3. Continuous Replication with Litestream:
Litestream tails the SQLite write-ahead log (WAL) and streams compressed LZ4 snapshot frames to Cloudflare R2 / AWS S3 in real time.
- **Recovery Point Objective (RPO)**: < 1 second.
- **Restoration**: `litestream restore` recovers a full database from S3 in under 15 seconds.

Before you pay thousands of dollars for managed Aurora or RDS, ask yourself if a single node SQLite setup isn''t 10x faster and simpler.',
            'DATABASE ARCHITECTURE',
            690,
            0,
            4,
            68,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789763400000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-sqlite-litestream-production-saas', 'sqlite', 1789763400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-sqlite-litestream-production-saas', 'litestream', 1789763400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-sqlite-litestream-production-saas', 'databases', 1789763400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-sqlite-litestream-production-saas', 'saas', 1789763400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-sqlite-litestream-production-saas', 'architecture', 1789763400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-sqlite-litestream-production-saas', 'devops', 1789763400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-sqlite-litestream-production-saas', 'performance', 1789763400000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-sql-1',
                'p-seo-en-sqlite-litestream-production-saas',
                NULL,
                '4e198a00b215',
                'MEMBER',
                'Removing the database network roundtrip changes frontend response times completely. P99 latency dropped from 45ms to 3ms.',
                91,
                1789764000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-1-70a40f-0',
                    'comment',
                    'c-en-sql-1',
                    '70a40f91b2df',
                    'reaction',
                    '🚀',
                    1789764030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-1-6f1084-1',
                    'comment',
                    'c-en-sql-1',
                    '6f1084ea2b99',
                    'like',
                    '🛡️',
                    1789764060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-1-5b2041-2',
                    'comment',
                    'c-en-sql-1',
                    '5b2041e8d902',
                    'like',
                    '❤️',
                    1789764090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-1-50c401-3',
                    'comment',
                    'c-en-sql-1',
                    '50c4018fef89',
                    'reaction',
                    '🧠',
                    1789764120000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-sql-2',
                'p-seo-en-sqlite-litestream-production-saas',
                'c-en-sql-1',
                '18df01a2eb34',
                'MEMBER',
                '@DockerNinja Network latency between compute and managed database is the hidden killer of modern microservices. With SQLite, the database is in the same process memory space.',
                78,
                1789764600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-2-29c40e-0',
                    'comment',
                    'c-en-sql-2',
                    '29c40e11a8b2',
                    'like',
                    '💡',
                    1789764630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-2-79c901-1',
                    'comment',
                    'c-en-sql-2',
                    '79c901affa01',
                    'like',
                    '🔥',
                    1789764660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-2-3e901a-2',
                    'comment',
                    'c-en-sql-2',
                    '3e901a88fb22',
                    'like',
                    '🧠',
                    1789764690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-2-61c801-3',
                    'comment',
                    'c-en-sql-2',
                    '61c8012afa34',
                    'like',
                    '🚀',
                    1789764720000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-sql-3',
                'p-seo-en-sqlite-litestream-production-saas',
                NULL,
                '7ac901afcd67',
                'MEMBER',
                'How do you handle backups during high-write bursts? Does Litestream keep up with the WAL journal?',
                52,
                1789765200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-3-24cb90-0',
                    'comment',
                    'c-en-sql-3',
                    '24cb9011af33',
                    'like',
                    '💡',
                    1789765230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-3-29c40e-1',
                    'comment',
                    'c-en-sql-3',
                    '29c40e11a8b2',
                    'like',
                    '🛡️',
                    1789765260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-3-3e901a-2',
                    'comment',
                    'c-en-sql-3',
                    '3e901a88fb22',
                    'reaction',
                    '❤️',
                    1789765290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-3-6f1084-3',
                    'comment',
                    'c-en-sql-3',
                    '6f1084ea2b99',
                    'like',
                    '🔥',
                    1789765320000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-3-8d104f-4',
                    'comment',
                    'c-en-sql-3',
                    '8d104fb2a901',
                    'reaction',
                    '👍',
                    1789765350000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-3-a7df90-5',
                    'comment',
                    'c-en-sql-3',
                    'a7df9012bc23',
                    'reaction',
                    '❤️',
                    1789765380000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-3-77e102-6',
                    'comment',
                    'c-en-sql-3',
                    '77e1029ba4c0',
                    'like',
                    '👍',
                    1789765410000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-sql-4',
                'p-seo-en-sqlite-litestream-production-saas',
                'c-en-sql-3',
                '18df01a2eb34',
                'MEMBER',
                '@GrafanaHawk Litestream tails the WAL file at 10-second intervals and uploads incremental LZ4 compressed frames to S3/R2. Recovery point objective (RPO) is less than 1 second.',
                64,
                1789765800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-4-70a40f-0',
                    'comment',
                    'c-en-sql-4',
                    '70a40f91b2df',
                    'like',
                    '💡',
                    1789765830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-4-62df09-1',
                    'comment',
                    'c-en-sql-4',
                    '62df0912cb88',
                    'like',
                    '🔥',
                    1789765860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-4-3db014-2',
                    'comment',
                    'c-en-sql-4',
                    '3db014ea9e12',
                    'reaction',
                    '👍',
                    1789765890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-4-44df90-3',
                    'comment',
                    'c-en-sql-4',
                    '44df9012a8bc',
                    'reaction',
                    '🚀',
                    1789765920000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-4-5b2041-4',
                    'comment',
                    'c-en-sql-4',
                    '5b2041e8d902',
                    'like',
                    '💡',
                    1789765950000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-4-79c901-5',
                    'comment',
                    'c-en-sql-4',
                    '79c901affa01',
                    'reaction',
                    '🚀',
                    1789765980000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sql-4-12df90-6',
                    'comment',
                    'c-en-sql-4',
                    '12df9011ac89',
                    'reaction',
                    '👍',
                    1789766010000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-b1409e-0',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                'b1409ea28c99',
                'like',
                '⚡',
                1789763460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-b1409e',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                'b1409ea28c99',
                1,
                1789763460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-70a40f-1',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '70a40f91b2df',
                'reaction',
                '🚀',
                1789763520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-70a40f',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '70a40f91b2df',
                1,
                1789763520000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-55a019-2',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '55a019ef44cc',
                'reaction',
                '🧠',
                1789763580000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-55a019',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '55a019ef44cc',
                1,
                1789763580000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-79c901-3',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '79c901affa01',
                'reaction',
                '🧠',
                1789763640000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-79c901',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '79c901affa01',
                1,
                1789763640000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-5fc401-4',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '5fc4018fab23',
                'like',
                '❤️',
                1789763700000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-5fc401',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '5fc4018fab23',
                1,
                1789763700000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-8d104f-5',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '8d104fb2a901',
                'reaction',
                '❤️',
                1789763760000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-8d104f',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '8d104fb2a901',
                1,
                1789763760000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-12df90-6',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '12df9011ac89',
                'bookmark',
                '👍',
                1789763820000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-12df90',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '12df9011ac89',
                1,
                1789763820000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-83d201-7',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '83d2019fab66',
                'reaction',
                '🛡️',
                1789763880000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-83d201',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '83d2019fab66',
                1,
                1789763880000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-91df90-8',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '91df9012cb78',
                'reaction',
                '🧠',
                1789763940000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-91df90',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '91df9012cb78',
                1,
                1789763940000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-24cb90-9',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '24cb9011af33',
                'like',
                '💡',
                1789764000000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-24cb90',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '24cb9011af33',
                1,
                1789764000000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-1df089-10',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '1df08912de78',
                'like',
                '💡',
                1789764060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-1df089',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '1df08912de78',
                1,
                1789764060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-87a01f-11',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '87a01fa29cb5',
                'reaction',
                '❤️',
                1789764120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-87a01f',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '87a01fa29cb5',
                1,
                1789764120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-88f019-12',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '88f019ab4c21',
                'like',
                '🧠',
                1789764180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-88f019',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '88f019ab4c21',
                1,
                1789764180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-7f8a91-13',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '7f8a910c2b44',
                'reaction',
                '💡',
                1789764240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-7f8a91',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '7f8a910c2b44',
                1,
                1789764240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-62df09-14',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '62df0912cb88',
                'like',
                '🧠',
                1789764300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-62df09',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '62df0912cb88',
                1,
                1789764300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-29c40e-15',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '29c40e11a8b2',
                'reaction',
                '❤️',
                1789764360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-29c40e',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '29c40e11a8b2',
                1,
                1789764360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-a7df90-16',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                'a7df9012bc23',
                'reaction',
                '🧠',
                1789764420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-a7df90',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                'a7df9012bc23',
                1,
                1789764420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-99df01-17',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '99df012aa4c3',
                'bookmark',
                '💡',
                1789764480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-99df01',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '99df012aa4c3',
                1,
                1789764480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-6f1084-18',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '6f1084ea2b99',
                'like',
                '🧠',
                1789764540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-6f1084',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '6f1084ea2b99',
                1,
                1789764540000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-aa0194-19',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                'aa0194f2cd01',
                'like',
                '👍',
                1789764600000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-aa0194',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                'aa0194f2cd01',
                1,
                1789764600000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-a0914e-20',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                'a0914e21fc88',
                'like',
                '👍',
                1789764660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-a0914e',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                'a0914e21fc88',
                1,
                1789764660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-61c801-21',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '61c8012afa34',
                'reaction',
                '🛡️',
                1789764720000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-61c801',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '61c8012afa34',
                1,
                1789764720000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-5b2041-22',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '5b2041e8d902',
                'reaction',
                '⚡',
                1789764780000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-5b2041',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '5b2041e8d902',
                1,
                1789764780000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-88b401-23',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '88b4012ce9fa',
                'reaction',
                '👍',
                1789764840000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-88b401',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '88b4012ce9fa',
                1,
                1789764840000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-50c401-24',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '50c4018fef89',
                'bookmark',
                '❤️',
                1789764900000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-50c401',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '50c4018fef89',
                1,
                1789764900000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-7ac901-25',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '7ac901afcd67',
                'bookmark',
                '💡',
                1789764960000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-7ac901',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '7ac901afcd67',
                1,
                1789764960000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-6d88f1-26',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '6d88f12a04cb',
                'reaction',
                '👍',
                1789765020000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-6d88f1',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '6d88f12a04cb',
                1,
                1789765020000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-1cf089-27',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '1cf08912fa12',
                'like',
                '❤️',
                1789765080000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-1cf089',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '1cf08912fa12',
                1,
                1789765080000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-91c24f-28',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '91c24f00ba11',
                'reaction',
                '🛡️',
                1789765140000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-91c24f',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '91c24f00ba11',
                1,
                1789765140000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-1bf089-29',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '1bf08912ea56',
                'bookmark',
                '💡',
                1789765200000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-1bf089',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '1bf08912ea56',
                1,
                1789765200000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-sqlite-litestream-production-saas-4e198a-30',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '4e198a00b215',
                'like',
                '💡',
                1789765260000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-sqlite-litestream-production-saas-4e198a',
                'post',
                'p-seo-en-sqlite-litestream-production-saas',
                '4e198a00b215',
                1,
                1789765260000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-en-offgrid-solar-homelab-lifepo4',
            'pulse-global',
            '44df9012a8bc',
            'MEMBER',
            'Building an off-grid solar homelab: 400W bifacial panels, 2kWh LiFePO4 battery, and 24/7 silent power for our 38W server rack ☀️🔋',
            'Four months ago, I disconnected my entire homelab and home networking rack from the municipal power grid.

The goal: complete resilience against power outages, zero grid power draw, and silent operation.

### 1. The Power Budget (38W Steady-State):
- **Mini PC Server (Intel N100)**: 12W running 16 LXC containers.
- **Managed 8-port 2.5GbE PoE Switch**: 9W.
- **MikroTik Router & AP**: 7W.
- **DAS Storage Enclosure (2x 8TB HDDs spun down idle)**: 10W.

### 2. The Solar & Battery Hardware:
- **Solar**: 2x 200W Renogy Bifacial Monocrystalline panels mounted on south-facing balcony rails.
- **Charge Controller**: Victron SmartSolar MPPT 100/20 (98% peak electrical efficiency).
- **Battery**: 24V (8S) 100Ah Grade-A LiFePO4 cells with Daly 100A Smart BMS (2,560 Wh nominal capacity).
- **Direct DC-DC Distribution**: We eliminated the AC inverter! Inverters waste 12-18W in standby idle. Instead, high-efficiency DC buck converters step down 24V directly to 12V and 19V with 94% efficiency.

### 3. Autonomy in Practice:
- 2,560 Wh / 38 W = **67 hours of continuous runtime with ZERO sun**.
- Even on heavily overcast rainy days, the bifacial panels generate 40-70W of diffuse light, keeping the battery topped up.

Complete energy sovereignty for computing is completely attainable today.',
            'SOLARPUNK & HARDWARE',
            630,
            0,
            5,
            59,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789766400000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-offgrid-solar-homelab-lifepo4', 'solar', 1789766400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-offgrid-solar-homelab-lifepo4', 'homelab', 1789766400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-offgrid-solar-homelab-lifepo4', 'lifepo4', 1789766400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-offgrid-solar-homelab-lifepo4', 'solarpunk', 1789766400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-offgrid-solar-homelab-lifepo4', 'victron', 1789766400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-offgrid-solar-homelab-lifepo4', 'hardware', 1789766400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-offgrid-solar-homelab-lifepo4', 'offgrid', 1789766400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-en-offgrid-solar-homelab-lifepo4', 'greenenergy', 1789766400000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-sol-1',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                NULL,
                '83d2019fab66',
                'MEMBER',
                'Eliminating the AC inverter is genius. Most cheap 1000W inverters draw 12-18W in idle just keeping the transformer energized.',
                85,
                1789767000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-1-a0914e-0',
                    'comment',
                    'c-en-sol-1',
                    'a0914e21fc88',
                    'like',
                    '🔥',
                    1789767030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-1-91c24f-1',
                    'comment',
                    'c-en-sol-1',
                    '91c24f00ba11',
                    'like',
                    '🧠',
                    1789767060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-1-7ac901-2',
                    'comment',
                    'c-en-sol-1',
                    '7ac901afcd67',
                    'reaction',
                    '🔥',
                    1789767090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-1-88b401-3',
                    'comment',
                    'c-en-sol-1',
                    '88b4012ce9fa',
                    'reaction',
                    '🔥',
                    1789767120000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-1-6d88f1-4',
                    'comment',
                    'c-en-sol-1',
                    '6d88f12a04cb',
                    'like',
                    '🔥',
                    1789767150000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-sol-2',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                'c-en-sol-1',
                '44df9012a8bc',
                'MEMBER',
                '@VoronExtruder Exactly! Direct DC-DC buck converters give 94% electrical efficiency. Every Watt saved is battery capacity preserved during overcast winter days.',
                72,
                1789767600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-2-70a40f-0',
                    'comment',
                    'c-en-sol-2',
                    '70a40f91b2df',
                    'like',
                    '💡',
                    1789767630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-2-b1409e-1',
                    'comment',
                    'c-en-sol-2',
                    'b1409ea28c99',
                    'like',
                    '🧠',
                    1789767660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-2-55a019-2',
                    'comment',
                    'c-en-sol-2',
                    '55a019ef44cc',
                    'reaction',
                    '🛡️',
                    1789767690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-2-24cb90-3',
                    'comment',
                    'c-en-sol-2',
                    '24cb9011af33',
                    'like',
                    '🚀',
                    1789767720000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-2-4e198a-4',
                    'comment',
                    'c-en-sol-2',
                    '4e198a00b215',
                    'like',
                    '🛡️',
                    1789767750000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-2-22c88f-5',
                    'comment',
                    'c-en-sol-2',
                    '22c88f01a9df',
                    'reaction',
                    '🧠',
                    1789767780000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-2-7f8a91-6',
                    'comment',
                    'c-en-sol-2',
                    '7f8a910c2b44',
                    'like',
                    '❤️',
                    1789767810000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-sol-3',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                NULL,
                '5fc4018fab23',
                'MEMBER',
                'What LiFePO4 cell compression fixture did you use? Proper compression prevents cell swelling over 4,000 cycles.',
                47,
                1789768200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-3-b1409e-0',
                    'comment',
                    'c-en-sol-3',
                    'b1409ea28c99',
                    'like',
                    '🚀',
                    1789768230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-3-50c401-1',
                    'comment',
                    'c-en-sol-3',
                    '50c4018fef89',
                    'reaction',
                    '🧠',
                    1789768260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-3-12df90-2',
                    'comment',
                    'c-en-sol-3',
                    '12df9011ac89',
                    'like',
                    '❤️',
                    1789768290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-3-88f019-3',
                    'comment',
                    'c-en-sol-3',
                    '88f019ab4c21',
                    'reaction',
                    '🔥',
                    1789768320000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-sol-4',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                'c-en-sol-3',
                '44df9012a8bc',
                'MEMBER',
                '@ELRS_QuadPilot Laser-cut 6mm aluminum end plates with spring-loaded M8 threaded rods torqued to 300kgf. Solid as a rock.',
                63,
                1789768800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-4-4e198a-0',
                    'comment',
                    'c-en-sol-4',
                    '4e198a00b215',
                    'reaction',
                    '👍',
                    1789768830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-4-77e102-1',
                    'comment',
                    'c-en-sol-4',
                    '77e1029ba4c0',
                    'like',
                    '🛡️',
                    1789768860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-4-62df09-2',
                    'comment',
                    'c-en-sol-4',
                    '62df0912cb88',
                    'reaction',
                    '❤️',
                    1789768890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-4-50c401-3',
                    'comment',
                    'c-en-sol-4',
                    '50c4018fef89',
                    'like',
                    '👍',
                    1789768920000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-en-sol-5',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                NULL,
                'a7df9012bc23',
                'MEMBER',
                'Do you publish your Victron Modbus/MQTT telemetry to Home Assistant? Would love to see the automation scripts for load shedding.',
                53,
                1789769400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-5-87a01f-0',
                    'comment',
                    'c-en-sol-5',
                    '87a01fa29cb5',
                    'reaction',
                    '💡',
                    1789769430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-5-a50091-1',
                    'comment',
                    'c-en-sol-5',
                    'a500912fa8cc',
                    'like',
                    '💡',
                    1789769460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-5-3e901a-2',
                    'comment',
                    'c-en-sol-5',
                    '3e901a88fb22',
                    'like',
                    '💡',
                    1789769490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-5-aa0194-3',
                    'comment',
                    'c-en-sol-5',
                    'aa0194f2cd01',
                    'reaction',
                    '🚀',
                    1789769520000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-en-sol-5-55a019-4',
                    'comment',
                    'c-en-sol-5',
                    '55a019ef44cc',
                    'like',
                    '💡',
                    1789769550000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-87a01f-0',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '87a01fa29cb5',
                'bookmark',
                '🧠',
                1789766460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-87a01f',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '87a01fa29cb5',
                1,
                1789766460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-79c901-1',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '79c901affa01',
                'like',
                '❤️',
                1789766520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-79c901',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '79c901affa01',
                1,
                1789766520000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-91c24f-2',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '91c24f00ba11',
                'bookmark',
                '💡',
                1789766580000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-91c24f',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '91c24f00ba11',
                1,
                1789766580000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-88f019-3',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '88f019ab4c21',
                'bookmark',
                '🛡️',
                1789766640000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-88f019',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '88f019ab4c21',
                1,
                1789766640000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-91df90-4',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '91df9012cb78',
                'bookmark',
                '🛡️',
                1789766700000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-91df90',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '91df9012cb78',
                1,
                1789766700000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-a7df90-5',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                'a7df9012bc23',
                'like',
                '🛡️',
                1789766760000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-a7df90',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                'a7df9012bc23',
                1,
                1789766760000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-b1409e-6',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                'b1409ea28c99',
                'bookmark',
                '🛡️',
                1789766820000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-b1409e',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                'b1409ea28c99',
                1,
                1789766820000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-3db014-7',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '3db014ea9e12',
                'bookmark',
                '🧠',
                1789766880000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-3db014',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '3db014ea9e12',
                1,
                1789766880000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-94df02-8',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '94df0218ab44',
                'like',
                '🛡️',
                1789766940000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-94df02',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '94df0218ab44',
                1,
                1789766940000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-4e198a-9',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '4e198a00b215',
                'reaction',
                '🔥',
                1789767000000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-4e198a',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '4e198a00b215',
                1,
                1789767000000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-1bf089-10',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '1bf08912ea56',
                'bookmark',
                '🔥',
                1789767060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-1bf089',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '1bf08912ea56',
                1,
                1789767060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-5b2041-11',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '5b2041e8d902',
                'bookmark',
                '🔥',
                1789767120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-5b2041',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '5b2041e8d902',
                1,
                1789767120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-2d89b1-12',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '2d89b14c99a0',
                'reaction',
                '👍',
                1789767180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-2d89b1',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '2d89b14c99a0',
                1,
                1789767180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-3e901a-13',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '3e901a88fb22',
                'like',
                '👍',
                1789767240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-3e901a',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '3e901a88fb22',
                1,
                1789767240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-1cf089-14',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '1cf08912fa12',
                'bookmark',
                '💡',
                1789767300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-1cf089',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '1cf08912fa12',
                1,
                1789767300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-8d104f-15',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '8d104fb2a901',
                'reaction',
                '⚡',
                1789767360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-8d104f',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '8d104fb2a901',
                1,
                1789767360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-1df089-16',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '1df08912de78',
                'like',
                '👍',
                1789767420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-1df089',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '1df08912de78',
                1,
                1789767420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-5fc401-17',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '5fc4018fab23',
                'bookmark',
                '🔥',
                1789767480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-5fc401',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '5fc4018fab23',
                1,
                1789767480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-83d201-18',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '83d2019fab66',
                'bookmark',
                '⚡',
                1789767540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-83d201',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '83d2019fab66',
                1,
                1789767540000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-50c401-19',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '50c4018fef89',
                'reaction',
                '🚀',
                1789767600000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-50c401',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '50c4018fef89',
                1,
                1789767600000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-6d88f1-20',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '6d88f12a04cb',
                'reaction',
                '⚡',
                1789767660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-6d88f1',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '6d88f12a04cb',
                1,
                1789767660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-29c40e-21',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '29c40e11a8b2',
                'like',
                '🛡️',
                1789767720000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-29c40e',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '29c40e11a8b2',
                1,
                1789767720000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-aa0194-22',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                'aa0194f2cd01',
                'reaction',
                '🔥',
                1789767780000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-aa0194',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                'aa0194f2cd01',
                1,
                1789767780000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-12df90-23',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '12df9011ac89',
                'bookmark',
                '🚀',
                1789767840000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-12df90',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '12df9011ac89',
                1,
                1789767840000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-77e102-24',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '77e1029ba4c0',
                'bookmark',
                '💡',
                1789767900000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-77e102',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '77e1029ba4c0',
                1,
                1789767900000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-en-offgrid-solar-homelab-lifepo4-61c801-26',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '61c8012afa34',
                'bookmark',
                '🔥',
                1789768020000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-en-offgrid-solar-homelab-lifepo4-61c801',
                'post',
                'p-seo-en-offgrid-solar-homelab-lifepo4',
                '61c8012afa34',
                1,
                1789768020000
            );
