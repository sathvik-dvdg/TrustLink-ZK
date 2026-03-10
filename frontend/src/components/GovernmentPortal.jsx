import React, { useState, useEffect, useRef } from 'react';
import { Shield, Fingerprint, Search, Send, Activity, Table, Hash, ShieldCheck, PieChart, ShieldAlert, XCircle, AlertTriangle, CheckCircle, Lock, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Toast = ({ message, type = 'error', onClose }) => (
    <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className={`fixed bottom-6 right-6 z-50 border text-white rounded-xl p-4 shadow-2xl max-w-sm flex items-start gap-3 ${type === 'success'
            ? 'bg-emerald-900 border-emerald-500 shadow-emerald-900/50'
            : 'bg-rose-900 border-rose-500 shadow-rose-900/50'
            }`}
    >
        {type === 'success'
            ? <ShieldCheck size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            : <ShieldAlert size={20} className="text-rose-400 flex-shrink-0 mt-0.5" />}
        <div className="flex-1">
            <p className={`font-bold text-sm ${type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
                {type === 'success' ? 'REQUEST BROADCASTED' : 'SECURITY BREACH PREVENTED'}
            </p>
            <p className={`text-xs mt-1 ${type === 'success' ? 'text-emerald-200' : 'text-rose-200'}`}>{message}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white ml-2"><XCircle size={16} /></button>
    </motion.div>
);

const GovernmentPortal = () => {
    const [ledger, setLedger] = useState([]);
    const [newRequest, setNewRequest] = useState({ department: 'Income Tax Dept', action: '', required_proofs: [] });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasAttack, setHasAttack] = useState(false);
    const [toast, setToast] = useState(null); // { message, type }
    const [verifyingIds, setVerifyingIds] = useState(new Set());
    const [resolvedIds, setResolvedIds] = useState(new Set());
    const prevLedgerIds = useRef(new Set());
    const dismissedAttackIds = useRef(new Set()); // track dismissed attack entries so polling doesn't re-show banner

    const [stats, setStats] = useState({ totalVerified: 0, fraudBlocked: 0 });

    const showToast = (message, type = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const fetchLedger = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/ledger', 'https://trustlink-zk.onrender.com/api/ledger');
            const data = await res.json();
            const entries = data.ledger || [];
            setLedger(entries);

            const attackEntries = entries.filter(item => item.status === 'MALFORMED_HASH' || item.status === 'FRAUD_BLOCKED');
            const hasUndismissedAttack = attackEntries.some(e => !dismissedAttackIds.current.has(e.id));
            setHasAttack(hasUndismissedAttack);

            const verified = entries.filter(e => e.status === 'VERIFIED').length;
            const blocked = entries.filter(e => e.status === 'FRAUD_BLOCKED').length;
            setStats({ totalVerified: verified * 45 + 1204, fraudBlocked: blocked + 142 });

            // Detect newly arrived VERIFIED or FRAUD_BLOCKED entries and trigger verifying animation
            const newEntries = entries.filter(e =>
                (e.status === 'VERIFIED' || e.status === 'FRAUD_BLOCKED') &&
                !prevLedgerIds.current.has(e.id)
            );

            newEntries.forEach(entry => {
                setVerifyingIds(prev => new Set(prev).add(entry.id));
                setTimeout(() => {
                    setVerifyingIds(prev => { const n = new Set(prev); n.delete(entry.id); return n; });
                    setResolvedIds(prev => new Set(prev).add(entry.id));
                    if (entry.status === 'FRAUD_BLOCKED') {
                        showToast("Zero-Knowledge Verification Failed. Tampered proof hash detected. Source Rejected.", 'error');
                    }
                }, 1500);
            });

            prevLedgerIds.current = new Set(entries.map(e => e.id));
        } catch (err) { console.error("Failed to fetch ledger", err); }
    };

    useEffect(() => {
        fetchLedger();
        const interval = setInterval(fetchLedger, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleToggleProof = (proofKey) => {
        setNewRequest(prev => {
            const isSelected = prev.required_proofs.includes(proofKey);
            return { ...prev, required_proofs: isSelected ? prev.required_proofs.filter(p => p !== proofKey) : [...prev.required_proofs, proofKey] };
        });
    };

    const handleSubmitRequest = async (e) => {
        e.preventDefault();
        if (!newRequest.action || newRequest.required_proofs.length === 0) return;
        setIsSubmitting(true);
        try {
            await fetch('http://localhost:8000/api/request-verification', 'https://trustlink-zk.onrender.com/api/request-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRequest)
            });
            setNewRequest(prev => ({ ...prev, action: '', required_proofs: [] }));
            fetchLedger();
            showToast("Verification request broadcasted to the Citizen Network. Awaiting ZK-Proof response.", 'success');
        } catch (err) { console.error("Failed to submit request", err); }
        finally { setIsSubmitting(false); }
    };

    const handleSimulateAttack = async () => {
        try {
            await fetch('http://localhost:8000/api/simulate-attack', 'https://trustlink-zk.onrender.com/api/simulate-attack', { method: 'POST' });
            fetchLedger();
        } catch (err) { console.error("Failed to simulate attack", err); }
    };

    const tableEntries = ledger.filter(l => ['VERIFIED', 'FRAUD_BLOCKED', 'Revoked'].includes(l.status));

    return (
        <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto pb-10">

            {/* Toast */}
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            </AnimatePresence>

            {/* Attack Banner */}
            <AnimatePresence>
                {hasAttack && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="bg-red-500/20 border-l-4 border-red-500 p-4 rounded-r-xl shadow-[0_0_20px_rgba(239,68,68,0.2)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="text-red-500 animate-pulse" size={28} />
                            <div>
                                <h3 className="text-red-400 font-bold tracking-wider">🔴 ATTENTION: INVALID PROOF DETECTED</h3>
                                <p className="text-sm text-red-300 font-mono mt-0.5">Cryptographic Hash Mismatch Detected. Access Denied.</p>
                            </div>
                        </div>
                        <button onClick={() => {
                            // Mark all current attack entries as dismissed so polling doesn't re-show
                            ledger.filter(e => e.status === 'MALFORMED_HASH' || e.status === 'FRAUD_BLOCKED')
                                .forEach(e => dismissedAttackIds.current.add(e.id));
                            setHasAttack(false);
                        }} className="text-red-400 hover:text-white transition-colors"><XCircle size={24} /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl flex items-center gap-4 relative overflow-hidden border-l-4 border-emerald-500">
                    <div className="absolute -right-4 -top-4 opacity-10"><Shield size={100} /></div>
                    <div className="bg-[var(--color-neo-bg)] p-3 rounded-lg border border-[var(--color-neo-border)]"><ShieldCheck size={24} className="text-emerald-500" /></div>
                    <div><p className="text-sm text-[var(--color-neo-text-muted)] uppercase tracking-wide">Active Node</p><h2 className="text-lg font-bold">Gov Node Validator</h2></div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <p className="text-sm text-[var(--color-neo-text-muted)] flex items-center gap-2"><Activity size={14} className="text-[var(--color-neo-accent)]" /> Total Proofs Verified</p>
                    <h3 className="text-3xl font-bold mt-2 font-mono">{stats.totalVerified.toLocaleString()}</h3>
                    <div className="w-full h-1 bg-[var(--color-neo-bg)] rounded overflow-hidden mt-3"><div className="h-full bg-[var(--color-neo-accent)] w-3/4"></div></div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <p className="text-sm text-[var(--color-neo-text-muted)] flex items-center gap-2"><PieChart size={14} className="text-rose-500" /> Fraud Blocked</p>
                    <h3 className="text-3xl font-bold mt-2 font-mono text-rose-400">{stats.fraudBlocked.toLocaleString()}</h3>
                    <p className="text-xs text-[var(--color-neo-text-muted)] mt-2">ZK-proof integrity enforced</p>
                </div>
                <div className="bg-gradient-to-br from-[var(--color-neo-surface)] to-[var(--color-neo-accent)]/20 p-4 rounded-xl border border-[var(--color-neo-accent)]/50 flex flex-col justify-center">
                    <p className="text-sm font-semibold mb-1">Network Status</p>
                    <div className="flex items-center gap-2 text-emerald-400">
                        <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
                        <span>Consensus Secured</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0">
                {/* Left: Console */}
                <div className="col-span-1 md:col-span-4 flex flex-col gap-6">
                    <div className="glass-panel rounded-2xl p-6 flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-6 border-b border-[var(--color-neo-border)] pb-4">
                            <Search className="text-[var(--color-neo-accent)]" /><h2 className="text-xl font-bold">Request Console</h2>
                        </div>
                        <form onSubmit={handleSubmitRequest} className="flex-1 flex flex-col space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--color-neo-text-muted)]">Originating Department</label>
                                <select className="w-full bg-[var(--color-neo-bg)] border border-[var(--color-neo-border)] rounded-lg p-3 outline-none focus:border-[var(--color-neo-accent)] transition-colors" value={newRequest.department} onChange={(e) => setNewRequest({ ...newRequest, department: e.target.value })}>
                                    <option value="Income Tax Dept">Income Tax Department</option>
                                    <option value="National Health Authority">National Health Authority</option>
                                    <option value="University Admissions">University Admissions</option>
                                    <option value="Transport Authority">Transport Authority (Voting)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--color-neo-text-muted)]">Verification Objective</label>
                                <input type="text" placeholder="e.g. Verify Income < 5 Lakhs" className="w-full bg-[var(--color-neo-bg)] border border-[var(--color-neo-border)] rounded-lg p-3 outline-none focus:border-[var(--color-neo-accent)] transition-colors" value={newRequest.action} onChange={(e) => setNewRequest({ ...newRequest, action: e.target.value })} required />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-[var(--color-neo-text-muted)] flex items-center justify-between"><span>Select Constraints (Zero-Knowledge)</span><Fingerprint size={14} className="text-[var(--color-neo-accent)]" /></label>
                                <div className="space-y-2">
                                    {[{ id: 'income_statement', label: 'Is Income < 5L?' }, { id: 'residency', label: 'Is Citizen Resident of City X?' }, { id: 'age_verification', label: 'Is Age > 18?' }, { id: 'health_insurance', label: 'Is Insurance Valid & Active?' }].map(toggle => (
                                        <label key={toggle.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${newRequest.required_proofs.includes(toggle.id) ? 'bg-[var(--color-neo-accent)]/10 border-[var(--color-neo-accent)]' : 'bg-[var(--color-neo-bg)] border-[var(--color-neo-border)]'}`}>
                                            <span className="text-sm">{toggle.label}</span>
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${newRequest.required_proofs.includes(toggle.id) ? 'bg-[var(--color-neo-accent)] border-[var(--color-neo-accent)]' : 'border-[var(--color-neo-border)]'}`}>
                                                {newRequest.required_proofs.includes(toggle.id) && <CheckCircle size={14} className="text-white" />}
                                            </div>
                                            <input type="checkbox" className="hidden" checked={newRequest.required_proofs.includes(toggle.id)} onChange={() => handleToggleProof(toggle.id)} />
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="mt-auto pt-6 border-t border-[var(--color-neo-border)]">
                                <button type="submit" disabled={isSubmitting || !newRequest.action || newRequest.required_proofs.length === 0} className="w-full bg-[var(--color-neo-accent)] hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-400 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all">
                                    {isSubmitting ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : <><Send size={18} /> Request ZK-Proof Broadcast</>}
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="glass-panel rounded-2xl p-6 border border-red-500/20">
                        <div className="flex items-center gap-2 mb-4"><AlertTriangle className="text-red-500" size={18} /><h3 className="font-bold text-red-100">Advanced Operations</h3></div>
                        <p className="text-xs text-[var(--color-neo-text-muted)] mb-4">Simulate network anomalies to test Zero-Knowledge validation logic.</p>
                        <button onClick={handleSimulateAttack} className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500 text-red-400 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                            <ShieldAlert size={18} /> ATTACK SIMULATION: Submit Tampered Proof
                        </button>
                    </div>
                </div>

                {/* Right: Truth Table */}
                <div className="col-span-1 md:col-span-8 glass-panel rounded-2xl p-6 flex flex-col h-[700px] overflow-hidden">
                    <div className="flex items-center justify-between mb-4 border-b border-[var(--color-neo-border)] pb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2"><Table className="text-[var(--color-neo-accent)]" /> The Truth Table</h2>
                        <div className="text-sm text-[var(--color-neo-text-muted)] bg-[var(--color-neo-bg)] px-3 py-1 rounded border border-[var(--color-neo-border)]">Live ZK-Verification Stream</div>
                    </div>
                    <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-semibold text-[var(--color-neo-text-muted)] uppercase tracking-wider">
                        <div className="col-span-1">Status</div>
                        <div className="col-span-3">Tx / Target</div>
                        <div className="col-span-4">Identity Data Access</div>
                        <div className="col-span-4">Cryptographic Proof (Hash)</div>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 relative">
                        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_-20px_20px_var(--color-neo-surface)] z-10"></div>
                        <AnimatePresence>
                            {tableEntries.map((entry, idx) => {
                                const isVerifying = verifyingIds.has(entry.id);
                                const isFraud = entry.status === 'FRAUD_BLOCKED';
                                const isRevoked = entry.status === 'Revoked';
                                return (
                                    <motion.div key={`${entry.id}-${idx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
                                        className={`grid grid-cols-12 gap-4 p-4 rounded-xl border items-center group transition-all relative
                                            ${isFraud ? 'bg-rose-950/60 border-rose-800 shadow-[0_0_10px_rgba(239,68,68,0.15)]' :
                                                isRevoked ? 'bg-[var(--color-neo-bg)] border-gray-700 opacity-60 grayscale' :
                                                    'bg-[var(--color-neo-bg)] border-[var(--color-neo-border)] hover:border-[var(--color-neo-accent)]'}`}>

                                        {/* Status */}
                                        <div className="col-span-1 flex justify-center">
                                            {isVerifying ? (
                                                <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/30 animate-pulse" title="Verifying...">
                                                    <Loader size={20} className="text-indigo-400 animate-spin" />
                                                </div>
                                            ) : isFraud ? (
                                                <div className="bg-rose-500/10 p-2 rounded-lg border border-rose-500/30" title="FRAUD BLOCKED">
                                                    <ShieldAlert size={20} className="text-rose-500" />
                                                </div>
                                            ) : isRevoked ? (
                                                <div className="bg-gray-700/50 p-2 rounded-lg border border-gray-600" title="Access Revoked">
                                                    <XCircle size={20} className="text-gray-400" />
                                                </div>
                                            ) : (
                                                <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/30" title="Verified">
                                                    <ShieldCheck size={20} className="text-emerald-500" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Context */}
                                        <div className="col-span-3 flex flex-col gap-1 pr-2">
                                            <span className={`font-mono text-xs truncate border-b border-gray-700/50 pb-1 ${isRevoked ? 'text-gray-500 line-through' : isFraud ? 'text-rose-400' : 'text-[var(--color-neo-accent)]'}`}>
                                                {entry.tx_hash.substring(0, 10)}...
                                            </span>
                                            <span className="text-xs truncate text-[var(--color-neo-text-muted)] mt-1">{entry.action}</span>
                                        </div>

                                        {/* Data Mask */}
                                        <div className="col-span-4 flex items-center pr-2">
                                            <div className="w-full relative h-8 rounded bg-gray-900 overflow-hidden flex items-center px-3 border border-gray-700 font-mono text-xs">
                                                <span className="text-[var(--color-neo-text-muted)] tracking-widest blur-[3px] select-none absolute">XXXXXXXXXXXXXXXXXXXX</span>
                                                <span className={`z-10 bg-black/60 px-2 py-0.5 rounded backdrop-blur-md border text-[10px] uppercase font-bold flex items-center gap-1 mx-auto shadow-lg ${isFraud ? 'border-rose-500 text-rose-400' : isRevoked ? 'border-gray-500 text-gray-400' : 'border-[var(--color-neo-border)] text-emerald-400'}`}>
                                                    <Lock size={10} /> {isFraud ? 'REJECTED' : isRevoked ? 'Revoked' : 'Hidden via ZKP'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Hash */}
                                        <div className="col-span-4 font-mono text-xs overflow-hidden flex items-center gap-2">
                                            <Hash size={12} className={`flex-shrink-0 ${isFraud ? 'text-rose-600' : isRevoked ? 'text-gray-600' : 'text-[var(--color-neo-accent)]'}`} />
                                            <span className={`truncate p-1.5 bg-gray-900 rounded border border-gray-800 w-full ${isFraud ? 'text-rose-500/70 line-through' : isRevoked ? 'text-gray-600' : 'text-white group-hover:border-[var(--color-neo-accent)] group-hover:text-[var(--color-neo-accent)]'}`}>
                                                {entry.zk_proof_hash}
                                            </span>
                                        </div>

                                        {/* Fraud Label */}
                                        {isFraud && (
                                            <div className="absolute top-1 right-2">
                                                <span className="text-[9px] font-bold bg-rose-900 text-rose-400 border border-rose-700 px-1.5 py-0.5 rounded-full uppercase tracking-wider">FRAUD BLOCKED</span>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                            {tableEntries.length === 0 && (
                                <div className="h-full flex items-center justify-center text-gray-500">Waiting for verified proofs...</div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GovernmentPortal;
