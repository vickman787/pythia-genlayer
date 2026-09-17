"use client"

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect } from "wagmi";
import { createClient } from "@/utils/supabase/client";
import { requestAddAndSwitchArc } from "@/components/NetworkEnforcer";
import { arcTestnet } from "@/lib/chains/arcTestnet";

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="118" fill="#110FFF" />
      <path d="M133,172 h96 v72 h-48 v32 h48 v64 h-96 z" fill="#F5F5F5" />
      <path d="M283,172 h96 v72 h-48 v32 h48 v64 h-96 z" fill="#F5F5F5" />
    </svg>
  );
}

export function Navigation({ initialUser }: { initialUser?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(initialUser || null);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const { address, isConnected, status } = useAccount();
  const { disconnect } = useDisconnect();
  const wasConnectedRef = useRef(false);

  // Sync Supabase session whenever EVM address changes, and redirect to homepage on disconnect
  useEffect(() => {
    if (isConnected && address) {
      wasConnectedRef.current = true;
      const normalized = address.toLowerCase();
      localStorage.setItem('circle_wallet_address', normalized);
      window.dispatchEvent(new Event('wallet_changed'));

      fetch('/api/auth/wallet-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: normalized }),
      })
      .then(res => {
        if (res.ok) {
          router.refresh();
        }
      })
      .catch(console.error);
    } else if ((status === 'disconnected' || !isConnected) && wasConnectedRef.current) {
      // Wallet was previously connected and has now been disconnected
      wasConnectedRef.current = false;
      localStorage.removeItem('circle_wallet_address');
      window.dispatchEvent(new Event('wallet_changed'));
      supabase.auth.signOut().catch(() => {}).finally(() => {
        // Return to homepage and refresh the page completely
        if (window.location.pathname === '/') {
          window.location.reload();
        } else {
          window.location.href = '/';
        }
      });
    }
  }, [isConnected, status, address, router, supabase]);

  // Proactively refresh Supabase session when user returns to tab after idle
  useEffect(() => {
    const refreshSessionOnFocus = () => {
      if (document.visibilityState === 'visible' && isConnected && address) {
        fetch('/api/auth/wallet-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: address.toLowerCase() }),
        }).catch(console.error);
      }
    };

    window.addEventListener('focus', refreshSessionOnFocus);
    document.addEventListener('visibilitychange', refreshSessionOnFocus);
    return () => {
      window.removeEventListener('focus', refreshSessionOnFocus);
      document.removeEventListener('visibilitychange', refreshSessionOnFocus);
    };
  }, [isConnected, address]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const navLinks = [
    { href: "/research", label: "agent" },
    { href: "/register-article", label: "register" },
    { href: "/dashboard", label: "dashboard" },
    { href: "/docs", label: "docs" },
  ];

  return (
    <nav className="w-full bg-[var(--color-paper)] border-b border-[var(--color-border-subtle)] sticky top-0 z-40">
      <div className="content-container h-16 flex items-center gap-6 xl:gap-8">
        <Link href="/" className="flex items-center gap-3 flex-shrink-0 font-mono">
          <LogoMark />
          <span className="font-bold text-lg tracking-tight text-[var(--color-ink)]">
            pythia<span className="text-[var(--color-signal-green)]">_genlayer</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-5 lg:gap-7 flex-shrink-0 ml-2">
          {navLinks.map((link) => {
            const active = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-mono transition-colors ${
                  active
                    ? "text-[var(--color-ink)] font-semibold border-b-2 border-[var(--color-signal-green)] pb-0.5"
                    : "text-[var(--color-soft-ink)] hover:text-[var(--color-ink)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              mounted,
            }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    style: {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={openConnectModal}
                          type="button"
                          className="flex items-center gap-2 text-sm font-mono font-bold bg-[var(--color-signal-green)] text-[var(--color-paper)] px-4 py-2 rounded-[2px] hover:brightness-110 transition-all whitespace-nowrap cursor-pointer"
                        >
                          connect_wallet
                        </button>
                      );
                    }

                    if (chain.unsupported || chain.id !== arcTestnet.id) {
                      return (
                        <button
                          onClick={async () => {
                            const success = await requestAddAndSwitchArc();
                            if (!success) openChainModal();
                          }}
                          type="button"
                          className="flex items-center gap-2 text-xs font-mono font-bold bg-[#FF3366] text-white px-3 py-2 rounded-[2px] hover:brightness-110 transition-all cursor-pointer shadow-sm"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          switch_to_arc
                        </button>
                      );
                    }

                    return (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openChainModal}
                          type="button"
                          className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--color-soft-ink)] font-mono bg-[var(--color-panel-deep)] px-2.5 py-2 border border-[var(--color-border-strong)] rounded-[2px] hover:border-[var(--color-signal-green)] transition-colors cursor-pointer"
                        >
                          {chain.name}
                        </button>
                        <button
                          onClick={openAccountModal}
                          type="button"
                          className="flex items-center gap-2 text-sm text-[var(--color-soft-ink)] font-mono bg-[var(--color-panel-deep)] px-3.5 py-2 border border-[var(--color-border-strong)] rounded-[2px] hover:border-[var(--color-signal-green)] transition-colors cursor-pointer"
                        >
                          <span className="glow-dot animate-pulse"></span>
                          <span>{account.displayName}</span>
                          {account.displayBalance && (
                            <span className="text-[var(--color-ink)] font-bold">
                              · {account.displayBalance}
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>

        <button
          className="md:hidden ml-2 p-2 text-[var(--color-ink)]"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-[var(--color-panel)] border-b border-[var(--color-border-subtle)] px-6 py-4 flex flex-col gap-4 shadow-lg z-40">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-base font-mono text-[var(--color-ink)] py-2"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
