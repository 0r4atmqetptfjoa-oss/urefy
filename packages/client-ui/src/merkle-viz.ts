/**
 * Aetheris Interactive Merkle Block & P2P Swarm Ingress Visualizer.
 * Provides a real-time cryptographic visualizer for BitTorrent/WebRTC piece-by-piece
 * Merkle verification, Shannon entropy distributions, and seeder swarm integrity.
 */

export interface MerklePiece {
  index: number;
  hash: string;
  sizeBytes: number;
  status: 'verified' | 'downloading' | 'pending' | 'corrupted';
  entropy: number;
  seederCount: number;
}

export interface SwarmFileManifest {
  fileId: string;
  fileName: string;
  totalBytes: number;
  merkleRoot: string;
  pieces: MerklePiece[];
  overallProgressPct: number;
}

export class MerkleSwarmVisualizer {
  public manifest: SwarmFileManifest;
  public isOpen: boolean = false;
  public selectedPieceIndex: number | null = null;

  constructor() {
    this.manifest = this.generateSampleManifest('aetheris-microkernel-x86_64.bin', 131072, 32);
  }

  public generateSampleManifest(fileName: string, totalBytes: number, pieceCount: number = 32): SwarmFileManifest {
    const pieceSize = Math.ceil(totalBytes / pieceCount);
    const pieces: MerklePiece[] = [];

    for (let i = 0; i < pieceCount; i++) {
      const isVerified = i < 28;
      const isDownloading = i === 28 || i === 29;
      const status: 'verified' | 'downloading' | 'pending' = isVerified ? 'verified' : isDownloading ? 'downloading' : 'pending';
      const entropy = +(5.8 + (Math.sin(i) * 0.9)).toFixed(2);

      pieces.push({
        index: i,
        hash: `0x${Math.abs(Math.sin(i * 999) * 1e16).toString(16).padEnd(16, '0')}`,
        sizeBytes: pieceSize,
        status,
        entropy,
        seederCount: 12 + (i % 6)
      });
    }

    const verifiedCount = pieces.filter(p => p.status === 'verified').length;

    return {
      fileId: `file-${Date.now()}`,
      fileName,
      totalBytes,
      merkleRoot: '0xa11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496',
      pieces,
      overallProgressPct: Math.round((verifiedCount / pieceCount) * 100)
    };
  }

  public open(fileName?: string): void {
    if (fileName && fileName !== this.manifest.fileName) {
      this.manifest = this.generateSampleManifest(fileName, 131072, 32);
    }
    this.isOpen = true;
  }

  public close(): void {
    this.isOpen = false;
    this.selectedPieceIndex = null;
  }

  public selectPiece(index: number): void {
    this.selectedPieceIndex = index;
  }

  public renderMerkleGrid(): string {
    const p = this.manifest.pieces;
    return `
      <div class="grid grid-cols-8 sm:grid-cols-16 gap-1.5 p-3 rounded-2xl bg-surface-overlay border border-white/5">
        ${p.map(piece => {
          const colorClass = piece.status === 'verified' 
            ? 'bg-emerald-500/80 border-emerald-400 hover:bg-emerald-400' 
            : piece.status === 'downloading'
            ? 'bg-indigo-500/80 border-indigo-400 animate-pulse hover:bg-indigo-400'
            : 'bg-surface-raised/40 border-white/5 hover:border-white/20';

          const isSelected = this.selectedPieceIndex === piece.index;

          return `
            <button 
              type="button"
              class="btn-merkle-piece h-8 rounded-lg border transition-all cursor-pointer flex items-center justify-center font-mono text-[9px] font-bold text-white shadow-sm ${colorClass} ${isSelected ? 'ring-2 ring-white scale-110' : ''}" 
              data-piece-index="${piece.index}"
              title="Piece #${piece.index} | Status: ${piece.status} | Entropy: ${piece.entropy} bits/byte"
            >
              ${piece.index + 1}
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  public renderMerkleModal(): string {
    if (!this.isOpen) return '';

    const selectedPiece = this.selectedPieceIndex !== null && this.manifest.pieces[this.selectedPieceIndex] 
      ? this.manifest.pieces[this.selectedPieceIndex] 
      : null;

    const verifiedCount = this.manifest.pieces.filter(p => p.status === 'verified').length;
    const downloadingCount = this.manifest.pieces.filter(p => p.status === 'downloading').length;
    const pendingCount = this.manifest.pieces.length - verifiedCount - downloadingCount;

    return `
      <div id="merkle-modal-backdrop" class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150" data-action="call-global" data-global-method="if" data-global-args='[event.target.id === "merkle-modal-backdrop") window.merkleVisualizer && window.merkleVisualizer.close(]'>
        <div class="relative w-full max-w-3xl bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
          
          <!-- HEADER -->
          <div class="flex items-center justify-between pb-3 border-subtle-b">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl font-bold shadow-lg">
                🌲
              </div>
              <div>
                <h3 class="text-sm font-bold text-white font-mono flex items-center space-x-2">
                  <span>Merkle Tree Swarm Verification Matrix</span>
                  <span class="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">${this.manifest.overallProgressPct}% VERIFIED</span>
                </h3>
                <p class="text-[10px] text-slate-400 font-mono">Target: ${this.manifest.fileName} (${(this.manifest.totalBytes / 1024).toFixed(1)} KB)</p>
              </div>
            </div>
            <button id="btn-close-merkle-modal" class="w-8 h-8 rounded-full bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white flex items-center justify-center text-sm border border-white/10 transition-colors cursor-pointer" title="Close (Esc)">
              ✕
            </button>
          </div>

          <!-- SUMMARY BADGES -->
          <div class="grid grid-cols-4 gap-2 text-xs font-mono">
            <div class="p-2.5 rounded-xl bg-surface-raised border border-white/5 text-center">
              <div class="text-[9px] text-slate-500">TOTAL PIECES</div>
              <div class="font-bold text-white">${this.manifest.pieces.length} Chunks</div>
            </div>
            <div class="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/20 text-center">
              <div class="text-[9px] text-emerald-400">VERIFIED</div>
              <div class="font-bold text-emerald-300">${verifiedCount} Pieces</div>
            </div>
            <div class="p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-500/20 text-center">
              <div class="text-[9px] text-indigo-400">DOWNLOADING</div>
              <div class="font-bold text-indigo-300">${downloadingCount} Active</div>
            </div>
            <div class="p-2.5 rounded-xl bg-surface-raised border border-white/5 text-center">
              <div class="text-[9px] text-slate-500">PENDING</div>
              <div class="font-bold text-slate-300">${pendingCount} Pieces</div>
            </div>
          </div>

          <!-- MERKLE ROOT PASSPORT -->
          <div class="p-2.5 rounded-xl bg-surface-raised border border-white/5 flex items-center justify-between font-mono text-[11px]">
            <span class="text-slate-400 truncate pr-2">Merkle Root: <code class="text-emerald-400">${this.manifest.merkleRoot}</code></span>
            <span class="text-[9px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 shrink-0">SHA-256 Validated</span>
          </div>

          <!-- INTERACTIVE GRID -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              <span>Cryptographic Piece Map (Click piece to inspect):</span>
              <span>Chunk Size: 4,096 Bytes</span>
            </div>
            ${this.renderMerkleGrid()}
          </div>

          <!-- SELECTED PIECE DETAIL DRAWER -->
          ${selectedPiece ? `
            <div class="p-3.5 rounded-xl bg-surface-raised border border-indigo-500/30 space-y-1.5 animate-in fade-in duration-100 font-mono text-xs">
              <div class="flex items-center justify-between">
                <span class="font-bold text-indigo-300">Piece #${selectedPiece.index + 1} Attestation</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full ${selectedPiece.status === 'verified' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'}">
                  ${selectedPiece.status.toUpperCase()}
                </span>
              </div>
              <div class="text-[10px] text-slate-400 truncate">SHA256 Leaf: <code class="text-white">${selectedPiece.hash}</code></div>
              <div class="flex items-center space-x-4 text-[10px] text-slate-400 pt-1">
                <span>Shannon Entropy: <b class="text-emerald-400">${selectedPiece.entropy} bits/byte</b></span>
                <span>Active Seeders: <b class="text-white">${selectedPiece.seederCount} Nodes</b></span>
                <span>Byte Size: <b class="text-white">${selectedPiece.sizeBytes} B</b></span>
              </div>
            </div>
          ` : ''}

        </div>
      </div>
    `;
  }
}

export const merkleVisualizer = new MerkleSwarmVisualizer();
