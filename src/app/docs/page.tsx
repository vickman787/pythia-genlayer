import Link from 'next/link'
import { ArrowRight, BookOpen, CircleHelp, Coins, Cpu, ExternalLink, FileText, LockKeyhole, Network, Search, ShieldCheck, Wallet } from 'lucide-react'

const steps = [
  {
    icon: Wallet,
    number: '01',
    title: 'Connect EVM wallet',
    body: 'Connect with MetaMask, Coinbase Wallet, Rainbow, or WalletConnect. Pythia automatically prompts your wallet to add and switch to Arc Testnet (Chain ID 5042002).',
  },
  {
    icon: Search,
    number: '02',
    title: 'Ask a question',
    body: 'The agent embeds your query with Gemini, retrieves verified creator sources, and passes candidate citation chunks to the GenLayer Intelligent Contract.',
  },
  {
    icon: Coins,
    number: '03',
    title: 'Fund with native USDC',
    body: 'Approve a research budget on Arc Testnet directly in your EVM wallet. On Arc, USDC is the native gas token. Unused budget is refunded after research.',
  },
  {
    icon: Cpu,
    number: '04',
    title: 'Consensus & payout',
    body: 'GenLayer validators independently reach consensus on the synthesized answer and citations. Cited creators receive 80% of their set price.',
  },
]

function GuideCard({ icon: Icon, label, title, children }: { icon: any, label: string, title: string, children: React.ReactNode }) {
  return (
    <section className="card-panel overflow-hidden flex flex-col justify-between">
      <div>
        <div className="panel-h gap-3"><Icon size={15} className="text-[var(--color-signal-green)]" /><span>{label}</span></div>
        <div className="p-6 md:p-8">
          <h2 className="text-2xl font-bold mb-4">{title}</h2>
          <div className="text-[var(--color-soft-ink)] leading-relaxed space-y-4">{children}</div>
        </div>
      </div>
    </section>
  )
}

export default function DocsPage() {
  return (
    <main className="flex-1 content-container py-12 md:py-20">
      <div className="max-w-6xl mx-auto">
        <header className="max-w-3xl mb-14">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-signal-green)] mb-5">
            <BookOpen size={15} /> pythia / documentation
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5">Consensus research that pays its sources.</h1>
          <p className="text-lg text-[var(--color-soft-ink)] leading-relaxed">
            Pythia connects researchers with verified, creator-owned sources. Research questions are semantically ranked, synthesized through GenLayer Intelligent Contract consensus, and settled in native USDC on Arc Testnet.
          </p>
        </header>

        {/* 4 Steps Section */}
        <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-px bg-[var(--color-border-subtle)] border border-[var(--color-border-subtle)] mb-14">
          {steps.map(({ icon: Icon, number, title, body }) => (
            <div key={number} className="bg-[var(--color-panel)] p-6">
              <div className="flex items-center justify-between mb-8">
                <Icon size={21} className="text-[var(--color-signal-green)]" />
                <span className="font-mono text-xs text-[var(--color-faint)]">{number}</span>
              </div>
              <h2 className="font-mono font-bold mb-3">{title}</h2>
              <p className="text-sm text-[var(--color-soft-ink)] leading-relaxed">{body}</p>
            </div>
          ))}
        </section>

        {/* Roles Section */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <GuideCard icon={Search} label="for researchers" title="Run grounded research">
            <p>Researchers pay per question with a customizable USDC budget, not an expensive monthly subscription. The budget is only spent to license sources that GenLayer actually verifies and cites in the final answer.</p>
            <ol className="space-y-3 font-mono text-sm text-[var(--color-ink)]">
              <li><span className="text-[var(--color-signal-green)]">01</span> Connect your EVM wallet (auto-switches to Arc Testnet).</li>
              <li><span className="text-[var(--color-signal-green)]">02</span> Navigate to <strong>agent</strong> and enter your research query.</li>
              <li><span className="text-[var(--color-signal-green)]">03</span> Set your maximum USDC budget for the query.</li>
              <li><span className="text-[var(--color-signal-green)]">04</span> Confirm the deposit in your wallet (or use dev simulated mode).</li>
              <li><span className="text-[var(--color-signal-green)]">05</span> Read the consensus-verified answer, citations, and ledger receipts.</li>
            </ol>
            <p className="text-sm">Free sources are prioritized alongside paid sources. Unused budget is automatically refunded to your wallet when research finishes.</p>
            <div className="pt-2">
              <Link href="/research" className="btn btn-primary gap-2">open agent <ArrowRight size={15} /></Link>
            </div>
          </GuideCard>

          <GuideCard icon={FileText} label="for creators" title="Earn from your sources">
            <p>Creators register public articles and specify a citation licensing fee in USDC. Whenever Pythia cites your source in a finalized research answer, you receive 80% of its price directly to your wallet.</p>
            <ol className="space-y-3 font-mono text-sm text-[var(--color-ink)]">
              <li><span className="text-[var(--color-signal-green)]">01</span> Connect the EVM wallet that should receive citation payouts.</li>
              <li><span className="text-[var(--color-signal-green)]">02</span> Go to <strong>register</strong> and submit your public article URL.</li>
              <li><span className="text-[var(--color-signal-green)]">03</span> Add a privacy-preserving ownership verification proof to your article (your wallet address is never exposed):
                <code className="block mt-1.5 p-2 bg-[var(--color-panel-deep)] text-xs text-[var(--color-signal-green)] break-all border border-[var(--color-border-subtle)]">
                  &lt;meta name=&quot;pythia-verification&quot; content=&quot;pythia_verify_YourOpaqueToken&quot;&gt;
                </code>
                <span className="block mt-1 text-xs text-[var(--color-soft-ink)]">
                  Or use a hidden HTML comment anywhere in your post: <code>&lt;!-- pythia-verification: pythia_verify_... --&gt;</code>
                </span>
              </li>
              <li><span className="text-[var(--color-signal-green)]">04</span> Set your citation license price (e.g. $0.05 USDC).</li>
              <li><span className="text-[var(--color-signal-green)]">05</span> Monitor citations and revenue in your <strong>dashboard</strong>.</li>
            </ol>
            <p className="text-sm">Privacy Guarantee: Your wallet address is never published or exposed. Legacy <code>pythia-owner</code> and <code>citeflow-owner</code> tags remain supported for historical articles.</p>
            <div className="pt-2 flex gap-3 flex-wrap">
              <Link href="/register-article" className="btn btn-primary gap-2">register source <ArrowRight size={15} /></Link>
              <Link href="/dashboard" className="btn btn-secondary">open dashboard</Link>
            </div>
          </GuideCard>
        </div>

        {/* Technical Architecture & Network Specs */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <GuideCard icon={Network} label="network & wallet" title="Arc Testnet (Circle L1)">
            <p>Pythia operates natively on <strong>Arc Testnet</strong>, Circle's Layer-1 blockchain engineered specifically for stablecoin-native financial operations.</p>
            
            <div className="bg-[var(--color-panel-deep)] border border-[var(--color-border-subtle)] p-4 rounded-[2px] font-mono text-xs space-y-2">
              <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-1.5">
                <span className="text-[var(--color-faint)]">Network Name</span>
                <span className="font-bold text-[var(--color-ink)]">Arc Testnet</span>
              </div>
              <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-1.5">
                <span className="text-[var(--color-faint)]">Chain ID</span>
                <span className="font-bold text-[var(--color-signal-green)]">5042002 (0x4cef52)</span>
              </div>
              <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-1.5">
                <span className="text-[var(--color-faint)]">Native Gas Token</span>
                <span className="font-bold text-[var(--color-ink)]">USDC (6 decimals)</span>
              </div>
              <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-1.5">
                <span className="text-[var(--color-faint)]">RPC URL</span>
                <span className="text-[var(--color-ink)] truncate max-w-[200px]">https://rpc.testnet.arc.network</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-faint)]">Block Explorer</span>
                <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer" className="text-[var(--color-signal-green)] hover:underline flex items-center gap-1">
                  testnet.arcscan.app <ExternalLink size={11} />
                </a>
              </div>
            </div>

            <p className="text-sm">
              <strong>Automatic Network Configuration:</strong> When connecting any EVM wallet, Pythia automatically triggers EIP-3085 (<code>wallet_addEthereumChain</code>) to add Arc Testnet and switch to it without manual RPC setup.
            </p>
            <p className="text-sm">
              Get free Arc Testnet USDC from the official faucet: <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="text-[var(--color-signal-green)] hover:underline">faucet.circle.com <ExternalLink size={12} className="inline" /></a>.
            </p>
          </GuideCard>

          <GuideCard icon={ShieldCheck} label="consensus & settlement" title="GenLayer AI Consensus (Studio Next)">
            <p>Unlike standard AI wrappers that hallucinate or rely on opaque centralized APIs, Pythia delegates research synthesis to an <strong>Intelligent Contract</strong> on <strong>GenLayer Studio Next</strong> (Consensus v0.6).</p>
            
            <ul className="space-y-3 text-sm">
              <li>
                <strong className="text-[var(--color-ink)]">Decentralized Validators:</strong> Independent GenLayer validators on Studio Next (Chain ID <code>61997</code>) run non-deterministic LLM evaluation and reach BFT consensus on answer accuracy and citations.
              </li>
              <li>
                <strong className="text-[var(--color-ink)]">Transaction Kit RC2:</strong> Integrated with <code>@genlayer/transaction-kit</code> (v0.1.0-rc.2) and <code>genlayer-js</code> (v2.0.0-rc.1) for complete fee-funded transaction lifecycle tracking.
              </li>
              <li>
                <strong className="text-[var(--color-ink)]">Consensus Receipts:</strong> Before any creator payout is authorized, GenLayer generates a cryptographic consensus receipt (<code>consensus_tx_hash</code>) viewable on the <a href="https://explorer-studio-dev.genlayer.com/" target="_blank" rel="noreferrer" className="text-[var(--color-signal-green)] hover:underline">Studio Dev Explorer <ExternalLink size={12} className="inline" /></a>.
              </li>
              <li>
                <strong className="text-[var(--color-ink)]">Dual-Chain Synergy:</strong> GenLayer provides verifiable AI reasoning on Studio Next, while Arc Testnet provides instant, sub-cent USDC settlements directly to creator addresses.
              </li>
            </ul>

            <div className="p-4 bg-[var(--color-panel-deep)] border border-[var(--color-border-subtle)] font-mono text-xs text-[var(--color-ink)] space-y-1">
              <div>Network: <code>GenLayer Studio Next (61997)</code> · RPC: <code>https://studio-next.genlayer.com/api</code></div>
              <div>Intelligent Contract: <code>0x631578596e9c33ce5a969Fa99b856Bfb8AFc7ceA</code></div>
            </div>
          </GuideCard>
        </div>

        {/* Troubleshooting Section */}
        <section className="card-panel overflow-hidden mb-8">
          <div className="panel-h gap-3"><CircleHelp size={15} className="text-[var(--color-signal-green)]" /><span>troubleshooting & faqs</span></div>
          <div className="p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h3 className="font-mono font-bold text-[var(--color-ink)] mb-2">Wallet is on wrong network</h3>
                <p className="text-[var(--color-soft-ink)] leading-relaxed">
                  Pythia automatically detects non-Arc networks. Click the flashing <strong>switch_to_arc</strong> button in the top navigation bar or the red banner at the top of the page to prompt your wallet to switch to Arc Testnet (5042002).
                </p>
              </div>
              <div>
                <h3 className="font-mono font-bold text-[var(--color-ink)] mb-2">How do payouts work?</h3>
                <p className="text-[var(--color-soft-ink)] leading-relaxed">
                  Creators receive 80% of their registered citation fee in USDC whenever their source is cited in a finalized answer. The platform treasury retains 20% to cover gas and index maintenance.
                </p>
              </div>
              <div>
                <h3 className="font-mono font-bold text-[var(--color-ink)] mb-2">GenLayer validation delay</h3>
                <p className="text-[var(--color-soft-ink)] leading-relaxed">
                  Consensus synthesis requires multiple validators to review the query and candidate sources. Responses typically take 15–30 seconds. Live execution logs are streamed in the agent interface.
                </p>
              </div>
              <div>
                <h3 className="font-mono font-bold text-[var(--color-ink)] mb-2">Local testing without faucet gas</h3>
                <p className="text-[var(--color-soft-ink)] leading-relaxed">
                  In local development mode, Pythia supports simulated budget authorizations so you can test full research queries without spending testnet gas.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Prototype Warning */}
        <section className="border border-[var(--color-signal-green)]/40 bg-[var(--color-signal-green)]/5 p-6 md:p-8 flex gap-4">
          <LockKeyhole size={20} className="text-[var(--color-signal-green)] flex-shrink-0 mt-1" />
          <div>
            <h2 className="font-mono font-bold text-[var(--color-signal-green)] mb-2">demo status / know before using</h2>
            <p className="text-sm text-[var(--color-soft-ink)] leading-relaxed">
              Pythia is a consensus-grounded research protocol. URL-control verification via HTML meta tag proves control of the domain/page at verification time. Settlements run on Arc Testnet (Circle L1) with native USDC. Use testnet assets only.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
