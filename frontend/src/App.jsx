import React, { useState } from 'react';
import { Shield, Database, UserCheck, Search, Lock } from 'lucide-react';
import CitizenWallet from './components/CitizenWallet';
import GovernmentPortal from './components/GovernmentPortal';
import TransparencyLedger from './components/TransparencyLedger';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState('citizen');

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg)] text-[var(--color-neo-text)] flex flex-col font-sans">

      {/* Top Navigation */}
      <nav className="p-4 border-b border-[var(--color-neo-border)] flex flex-col md:flex-row justify-between items-center bg-[var(--color-neo-surface)] z-20 shadow-md">

        <div className="flex items-center gap-3 mb-4 md:mb-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--color-neo-accent)] to-indigo-500 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.5)]">
            <Shield className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">
              GovTrust<span className="text-[var(--color-neo-accent)]">Connect</span>
            </h1>
            <p className="text-[10px] text-[var(--color-neo-text-muted)] uppercase tracking-widest font-mono">
              Zero-Knowledge Governance Network
            </p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto px-2">

          <button
            onClick={() => setActiveView('citizen')}
            className={`flex flex-col md:flex-row items-center gap-2 px-5 py-2.5 rounded-lg transition-all ${activeView === 'citizen'
              ? 'bg-[var(--color-neo-accent)] text-white shadow-[0_0_20px_rgba(14,165,233,0.4)] border border-blue-400/50'
              : 'bg-[var(--color-neo-bg)] hover:bg-[var(--color-neo-surface)] text-[var(--color-neo-text-muted)] hover:text-white border border-[var(--color-neo-border)]'
              }`}
          >
            <UserCheck size={18} className={activeView === 'citizen' ? 'text-white' : 'text-blue-400'} />
            <span className="text-sm font-semibold whitespace-nowrap">Citizen Wallet</span>
          </button>

          <button
            onClick={() => setActiveView('government')}
            className={`flex flex-col md:flex-row items-center gap-2 px-5 py-2.5 rounded-lg transition-all ${activeView === 'government'
              ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400/50'
              : 'bg-[var(--color-neo-bg)] hover:bg-[var(--color-neo-surface)] text-[var(--color-neo-text-muted)] hover:text-white border border-[var(--color-neo-border)]'
              }`}
          >
            <Search size={18} className={activeView === 'government' ? 'text-white' : 'text-emerald-400'} />
            <span className="text-sm font-semibold whitespace-nowrap">Government Portal</span>
          </button>

          <button
            onClick={() => setActiveView('auditor')}
            className={`flex flex-col md:flex-row items-center gap-2 px-5 py-2.5 rounded-lg transition-all ${activeView === 'auditor'
              ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-indigo-400/50'
              : 'bg-[var(--color-neo-bg)] hover:bg-[var(--color-neo-surface)] text-[var(--color-neo-text-muted)] hover:text-white border border-[var(--color-neo-border)]'
              }`}
          >
            <Database size={18} className={activeView === 'auditor' ? 'text-white' : 'text-indigo-400'} />
            <span className="text-sm font-semibold whitespace-nowrap">Transparency Ledger</span>
          </button>

        </div>
      </nav>

      {/* Main View Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto relative">

        {/* Abstract Background Elements */}
        <div className="fixed top-0 right-0 w-96 h-96 bg-[var(--color-neo-accent)] rounded-full mix-blend-screen filter blur-[150px] opacity-10 pointer-events-none"></div>
        <div className="fixed bottom-0 left-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-screen filter blur-[150px] opacity-5 pointer-events-none"></div>

        <div className="w-full relative z-10 transition-opacity duration-300">
          {activeView === 'citizen' && <CitizenWallet />}
          {activeView === 'government' && <GovernmentPortal />}
          {activeView === 'auditor' && <TransparencyLedger />}
        </div>

      </main>

      {/* Global Status Footer */}
      <footer className="bg-[var(--color-neo-surface)] border-t border-[var(--color-neo-border)] p-2 px-6 flex justify-between items-center text-xs font-mono text-[var(--color-neo-text-muted)] z-20">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Network Status: ON SECURE ENCLAVE
          </span>
          <span className="hidden md:inline">|</span>
          <span className="hidden md:inline flex items-center gap-1"><Lock size={12} /> Post-Quantum Cryptography Enabled</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Block Height: 8,492,110</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
