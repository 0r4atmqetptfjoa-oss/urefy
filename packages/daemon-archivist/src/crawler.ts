import { computeFileChecksums, inspectBinary, createSwarmManifest, BinaryHygieneReport } from '@aetheris/vault-engine';

export interface IngestedArtifact {
  title: string;
  channelId: string;
  fileName: string;
  byteSize: number;
  sha256: string;
  crc32: string;
  entropy: number;
  verdict: 'CLEAN' | 'PACKED' | 'SUSPICIOUS';
  merkleRoot: string;
  markdownContent: string;
}

/**
 * Generates technical synthesis using hosted LLM / Cloudflare Workers AI (if configured)
 * or deterministic static analysis engine.
 */
export async function generateTechnicalSynthesis(
  title: string,
  fileName: string,
  hygiene: BinaryHygieneReport,
  sha256: string
): Promise<string> {
  const prompt = `Synthesize a technical release note for ${title} (${fileName}) with SHA256 ${sha256} and entropy ${hygiene.overallEntropy}. Format as concise Markdown.`;

  const aiEndpoint = process.env.AI_API_ENDPOINT || (process.env.OLLAMA_HOST ? `${process.env.OLLAMA_HOST}/api/generate` : '');
  const aiKey = process.env.AI_API_KEY || '';
  const aiModel = process.env.AI_MODEL || 'llama-3-8b-instruct';

  if (aiEndpoint) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (aiKey) headers['Authorization'] = `Bearer ${aiKey}`;

        const isOllama = aiEndpoint.includes('/api/generate');
        const body = isOllama
          ? JSON.stringify({ model: aiModel, prompt, stream: false })
          : JSON.stringify({
              model: aiModel,
              messages: [
                { role: 'system', content: 'You are a technical binary security analyst.' },
                { role: 'user', content: prompt },
              ],
              max_tokens: 300,
            });

        const res = await fetch(aiEndpoint, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          const text = data.response || data.choices?.[0]?.message?.content;
          if (text) return text.trim();
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      // Remote AI unreachable; proceed with deterministic static analysis engine
    }
  }

  // Deterministic high-fidelity technical synthesis with transparent attestation
  return `### 📦 Technical Release & Archival Summary: ${title}

- **Artifact Name:** \`${fileName}\`
- **Integrity Status:** **${hygiene.verdict === 'CLEAN' ? '✅ VERIFIED CLEAN' : '⚠️ ' + hygiene.verdict}**
- **Shannon Entropy:** \`${hygiene.overallEntropy.toFixed(3)} bits/byte\` (${hygiene.entropyClassification})
- **Target Architecture:** \`${hygiene.architecture}\`
- **Sections Audited:** ${hygiene.sections.map(s => `\`${s.name}\` (${(s.rawSize / 1024).toFixed(1)} KB)`).join(', ') || 'Native Monolithic'}

#### Cryptographic Fingerprint
\`\`\`text
SHA-256: ${sha256}
\`\`\`

> *Static Binary Analysis Attestation: Deterministic technical synthesis generated via UREfy Binary Hygiene Inspector (Zero Cloud/Third-Party Telemetry).*`;
}

/**
 * Ingests a raw file buffer and produces a fully verified IngestedArtifact ready for Vault broadcast.
 */
export async function processArtifact(
  title: string,
  fileName: string,
  channelId: string,
  data: Uint8Array
): Promise<IngestedArtifact> {
  const checksums = computeFileChecksums(data);
  const hygiene = inspectBinary(data);
  const { manifest } = createSwarmManifest(data);

  const markdownContent = await generateTechnicalSynthesis(
    title,
    fileName,
    hygiene,
    checksums.sha256
  );

  return {
    title,
    channelId,
    fileName,
    byteSize: data.length,
    sha256: checksums.sha256,
    crc32: checksums.crc32,
    entropy: hygiene.overallEntropy,
    verdict: hygiene.verdict,
    merkleRoot: manifest.merkleRoot,
    markdownContent,
  };
}
