# Pythia Protocol

> **"Attribution without payment is a screenshot. Payment without verifiable attribution is a guess."**

Pythia is a decentralized AI research and micro-licensing protocol built for the **GenLayer Hackathon**. It bridges qualitative decentralized AI consensus on **GenLayer Studio Next** with instant, sub-cent USDC settlements on **Arc Testnet**, guaranteeing that whenever AI synthesizes an answer from human creators, those creators are cryptographically verified and autonomously paid.

---

## 🏛️ System Architecture

Pythia decouples **qualitative intelligence consensus** from **financial settlement**:

```
 ┌─────────────────────────────────────────────────────────────┐
 │                      HUMAN CREATOR                          │
 │  Publishes post on X / Substack with Zero-Address HMAC Proof │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Registers & Sets Citation Fee
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                     PYTHIA PROTOCOL                         │
 │   Autonomous Research Agent + Multi-Source Vector RAG       │
 └──────────────────────────────┬──────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
        ▼                                               ▼
┌────────────────────────────────┐    ┌──────────────────────────────────┐
│  REASONING LAYER: GENLAYER     │    │  SETTLEMENT LAYER: ARC TESTNET   │
│  Studio Next · Chain ID 61997  │    │  Arc EVM · Chain ID 5042002      │
├────────────────────────────────┤    ├──────────────────────────────────┤
│ • Consensus v0.6 Positional    │    │ • Sub-cent USDC Micropayments    │
│ • GenVM Python Intelligent     │    │ • 80% direct creator share       │
│   Contract: 0x6315...7ceA      │    │ • Treasury reserves & refunds    │
│ • BFT Equivalence Principle    │    │ • Cryptographic receipt binding  │
│ • Non-deterministic web fetch  │    │ • Gas-efficient EVM execution    │
└────────────────────────────────┘    └──────────────────────────────────┘
```

---

## ⚡ Core Features

### 1. Privacy-Preserving Creator Verification (Zero-Address Proofs)
Creators prove ownership across any platform—including **X (Twitter), Substack, Medium, or custom blogs**—without ever revealing or linking their public Ethereum wallet address on social media.
- An opaque, one-way cryptographic token (`pythia_verify_<hash>`) is derived via HMAC-SHA256.
- Creators paste this verification token into their post or HTML metadata.
- Ownership is verified deterministically off-chain and enforced on-chain.

### 2. GenLayer Studio Next Intelligent Contract
- **Contract Address**: `0x631578596e9c33ce5a969Fa99b856Bfb8AFc7ceA`
- **Network**: GenLayer Studio Next (`Chain ID: 61997`)
- **Consensus**: `Consensus v0.6` Positional
- **GenVM Python Engine**: Multiple independent validators fetch live web sources (`gl.nondet.web.request`), verify SHA-256 evidence chunk hashes, and reach BFT consensus on semantic citation relevance under the Equivalence Principle (`gl.eq_principle.prompt_comparative`).

### 3. Native USDC Settlement Rails (Arc Testnet)
- Research queries are funded upfront by the researcher in USDC.
- When GenLayer validators accept a citation, a cryptographic authorization receipt triggers an instant USDC payout on **Arc Testnet** (`Chain ID: 5042002`).
- **80%** goes directly to the verified content creator, while unspent funds are safely refunded to the researcher.

### 4. Creator Console & Lifecycle Management
- **Inline Citation Fee Editor**: Creators dynamically adjust their licensing fees (from $0.00 to $100.00 USDC) with single-click validation.
- **Safe Source Deletion**: Creators can withdraw or delete registered sources at any time. Chunks are safely unindexed from future AI retrieval while historical earnings ledgers remain immutable.

---

## 🎬 Demo Video & Presentation

The project includes an automated 1080p broadcast video presentation:
- **Duration**: ~2 minutes 56 seconds
- **Voice**: Google US English
- **Topics**: Architecture, Zero-Address verification, GenLayer BFT consensus, and instant settlement.
- **Local Location**: `public/pythia-genlayer-demo.mp4`

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Node.js 20+
- GenLayer Studio Next Account & Relayer Private Key
- Arc Testnet EVM Wallet with USDC

### Installation

```bash
# Clone the repository
git clone https://github.com/vickman787/pythia-genlayer.git
cd pythia-genlayer

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

### Environment Configuration (`.env.local`)

```env
# GenLayer Studio Next (Chain 61997)
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61997
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio-next.genlayer.com/api
GENLAYER_CONTRACT_ADDRESS=0x631578596e9c33ce5a969Fa99b856Bfb8AFc7ceA
GENLAYER_RELAYER_PRIVATE_KEY=0x...

# Arc Testnet (Chain 5042002)
NEXT_PUBLIC_ARC_CHAIN_ID=5042002
NEXT_PUBLIC_ARC_RPC_URL=https://arc-testnet.rpc.caldera.xyz/http
NEXT_PUBLIC_USDC_ADDRESS=0x...
AGENT_TREASURY_ADDRESS=0x...
AGENT_TREASURY_PRIVATE_KEY=0x...

# Database & Cryptography
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RECEIPT_SIGNING_SECRET=your-random-32-char-secret
```

### Running the Application

```bash
# Start development server
npm run dev

# Run TypeScript check
npm run typecheck

# Deploy / Verify GenLayer Contract
npm run deploy:genlayer
npm run verify:genlayer
```

---

## 🌐 Product Surfaces

- **`/research`**: Interactive autonomous research terminal. Execute queries, inspect live validator consensus, and monitor real-time USDC settlements.
- **`/register-article`**: Creator onboarding portal. Generate zero-address verification tokens, register public articles/posts, and set citation fees.
- **`/dashboard`**: Creator financial analytics, real-time earnings ledger, inline fee editor, and source lifecycle controls.
- **`/docs`**: Complete protocol documentation, verification guidelines, and developer reference.

---

## 📄 License

MIT License. Built with ❤️ for the GenLayer Hackathon.
