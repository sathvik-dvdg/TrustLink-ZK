import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, Clock, XCircle, Activity, Lock, Database, UserCheck, ToggleRight, ToggleLeft, ShieldAlert, ShieldCheck, AlertOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CitizenWallet = () => {
    const [requests, setRequests] = useState([]);
    const [activeVerifications, setActiveVerifications] = useState([]);
    const [activeRequest, setActiveRequest] = useState(null);
    const [proofState, setProofState] = useState('idle');
    const [logs, setLogs] = useState([]);
    const [progress, setProgress] = useState(0);
    const [proofResult, setProofResult] = useState(null);
    const [consentSettings, setConsentSettings] = useState({ dob: false, name: false });
    const [isAttackMode, setIsAttackMode] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);

    const fetchData = async () => {
        try {
            const [reqRes, ledgerRes] = await Promise.all([
                fetch('http://localhost:8000/api/pending-requests', 'https://trustlink-zk.onrender.com/api/pending-requests'),
                fetch('http://localhost:8000/api/ledger', 'https://trustlink-zk.onrender.com/api/ledger')
            ]);
            const reqData = await reqRes.json();
            setRequests(reqData.requests || []);
            const ledgerData = await ledgerRes.json();
            const active = ledgerData.ledger.filter(item =>
                item.status === 'VERIFIED' &&
                !item.action.startsWith('Injection') &&
                !item.action.startsWith('Revoked')
            );
            setActiveVerifications(active);
        } catch (err) { console.error("Failed to fetch data", err); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleVerifyClick = (req) => {
        setActiveRequest(req);
        setConsentSettings({ dob: false, name: false });
        setIsAttackMode(false);
        setProofState('consent');
        setLogs([]);
        setProgress(0);
        setProofResult(null);
    };

    const handleStartGeneration = () => {
        setProofState('generating');
        const normalLogs = [
            { time: 200, log: "Initializing ZK circuits..." },
            { time: 500, log: "Applying granular consent mask..." },
            { time: 900, log: `Loading constraints for: ${activeRequest.action}` },
            { time: 1300, log: "Reading encrypted local credentials..." },
            { time: 1700, log: "Constructing Witness..." },
            { time: 2100, log: "Proving SNARK (Groth16)..." },
            { time: 2500, log: "Packaging Zero-Knowledge Proof..." },
        ];
        const attackLogs = [
            { time: 200, log: "Initializing ZK circuits..." },
            { time: 400, log: "⚠ Entropy source override detected..." },
            { time: 700, log: "⚠ ANOMALOUS ENTROPY DETECTED in witness generation!" },
            { time: 1100, log: "Injecting malformed payload into proof hash..." },
            { time: 1500, log: "⚠ Hash integrity check: FAILED (tampered)" },
            { time: 2000, log: "Transmitting corrupted proof to network..." },
            { time: 2400, log: "⚠ MITM ATTACK SIMULATION IN PROGRESS" },
        ];
        const logSequence = isAttackMode ? attackLogs : normalLogs;
        logSequence.forEach((item, index) => {
            setTimeout(() => {
                setLogs((prev) => [...prev, item.log]);
                setProgress(Math.floor(((index + 1) / logSequence.length) * 100));
            }, item.time);
        });
        setTimeout(async () => {
            try {
                const res = await fetch('http://localhost:8000/api/generate-proof', 'https://trustlink-zk.onrender.com/api/generate-proof', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ request_id: activeRequest.id, consent_payload: consentSettings, is_malicious: isAttackMode })
                });
                const data = await res.json();
                setProofResult(data);
                setProofState(data.is_valid ? 'success' : 'fraud');
                fetchData();
            } catch (err) { setProofState('idle'); }
        }, 3000);
    };

    const handleRevoke = async (txHash) => {
        setIsRevoking(txHash);
        try {
            await fetch('http://localhost:8000/api/revoke-access', 'https://trustlink-zk.onrender.com/api/revoke-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tx_hash: txHash })
            });
            await fetchData();
        } catch (err) { console.error("Failed to revoke", err); }
        finally { setIsRevoking(false); }
    };

    const closeVerification = () => { setProofState('idle'); setActiveRequest(null); setLogs([]); setProgress(0); setIsAttackMode(false); };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-6xl mx-auto pb-10">
            {/* Left Column */}
            <div className="col-span-1 md:col-span-4 space-y-6">
                <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-[var(--color-neo-accent)]"></div>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Guardian ID</h2>
                            <p className="text-sm text-[var(--color-neo-text-muted)] mt-1 flex items-center gap-1"><CheckCircle size={14} className="text-emerald-400" /> Verified Citizen</p>
                        </div>
                        <div className="bg-[var(--color-neo-bg)] p-2 rounded-lg border border-[var(--color-neo-border)]"><Shield size={24} className="text-[var(--color-neo-accent)]" /></div>
                    </div>
                    <div className="flex justify-center my-8 relative">
                        <div className="absolute inset-0 bg-[var(--color-neo-accent)] opacity-10 blur-xl rounded-full"></div>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="w-32 h-32 border-2 border-dashed border-[var(--color-neo-accent)] rounded-xl flex items-center justify-center relative bg-[var(--color-neo-bg)] z-10">
                            <div className="absolute inset-2 border border-[var(--color-neo-border)] rounded-lg flex items-center justify-center overflow-hidden">
                                <div className="grid grid-cols-4 grid-rows-4 gap-1 w-full h-full p-2 opacity-80">
                                    {Array.from({ length: 16 }).map((_, i) => (<motion.div key={i} className="bg-[var(--color-neo-accent)] rounded-sm" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }} />))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm"><span className="text-[var(--color-neo-text-muted)]">DID Hash</span><span className="font-mono text-xs truncate w-32 border border-[var(--color-neo-border)] bg-[var(--color-neo-bg)] px-2 py-1 rounded">did:gov:0x4f...8a2</span></div>
                        <div className="flex justify-between text-sm"><span className="text-[var(--color-neo-text-muted)]">Local Vault</span><span className="text-emerald-400 flex items-center gap-1"><Lock size={12} /> Encrypted</span></div>
                    </div>
                </div>
                <div className="glass-panel rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4"><Activity className="text-[var(--color-neo-accent)]" /><h3 className="font-semibold text-lg">Privacy Score</h3></div>
                    <div className="flex flex-col items-center">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="64" cy="64" r="56" stroke="var(--color-neo-border)" strokeWidth="8" fill="none" />
                                <motion.circle cx="64" cy="64" r="56" stroke="var(--color-neo-success)" strokeWidth="8" fill="none" strokeDasharray="351" initial={{ strokeDashoffset: 351 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 1.5, ease: "easeOut" }} />
                            </svg>
                            <div className="absolute"><span className="text-3xl font-bold text-white">100%</span></div>
                        </div>
                        <p className="text-center text-sm text-[var(--color-neo-text-muted)] mt-4">Your raw data has never left your device. All verifications performed via ZK-Proofs.</p>
                    </div>
                </div>
            </div>

            {/* Right Column */}
            <div className="col-span-1 md:col-span-8 flex flex-col space-y-6">
                <div className="flex justify-between items-center glass-panel rounded-xl p-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <span>Pending Data Requests</span>
                        {requests.length > 0 && <span className="bg-rose-500/20 text-rose-400 text-xs px-2 py-0.5 rounded-full border border-rose-500/30">{requests.length} New</span>}
                    </h3>
                    <Clock className="text-[var(--color-neo-text-muted)]" size={20} />
                </div>
                <div className="overflow-y-auto space-y-3 max-h-[280px] pr-2">
                    <AnimatePresence>
                        {requests.length === 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-32 text-[var(--color-neo-text-muted)] glass-panel rounded-xl">
                                <Database size={24} className="mb-2 opacity-50" /><p className="text-sm">No pending requests.</p>
                            </motion.div>
                        ) : requests.map((req, idx) => (
                            <motion.div key={`${req.id}-${idx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel rounded-xl p-4 hover:border-[var(--color-neo-accent)] transition-colors border border-[var(--color-neo-border)]">
                                <div className="flex justify-between items-center flex-wrap gap-4">
                                    <div className="space-y-1 flex-1">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-neo-accent)] bg-[var(--color-neo-accent)]/10 px-2 py-0.5 rounded">{req.department}</span>
                                        <h4 className="text-base font-bold">Request: {req.action}</h4>
                                        <p className="text-xs text-[var(--color-neo-text-muted)]">Requires Proof of: <span className="text-gray-300">{req.required_proofs.join(', ')}</span></p>
                                    </div>
                                    <button onClick={() => handleVerifyClick(req)} className="bg-[var(--color-neo-bg)] hover:bg-[var(--color-neo-surface)] border border-[var(--color-neo-accent)] text-[var(--color-neo-accent)] px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-all whitespace-nowrap">
                                        <ShieldCheck size={16} /> Review Request
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-4"><UserCheck className="text-emerald-500" size={20} /><h3 className="font-bold text-lg">Active Data Verifications</h3></div>
                    <div className="space-y-3 overflow-y-auto max-h-[280px] pr-2">
                        <AnimatePresence>
                            {activeVerifications.length === 0 ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-24 text-[var(--color-neo-text-muted)] glass-panel rounded-xl border border-dashed border-gray-700">
                                    <p className="text-sm">No active verifications. You have absolute privacy.</p>
                                </motion.div>
                            ) : activeVerifications.map(v => (
                                <motion.div key={v.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel rounded-xl p-4 border border-emerald-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex-1">
                                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded uppercase">Verified: {v.department_id}</span>
                                        <p className="font-medium text-sm mt-1">{v.action}</p>
                                        <div className="text-[10px] text-[var(--color-neo-text-muted)] font-mono mt-1 w-48 truncate">Tx: {v.tx_hash}</div>
                                    </div>
                                    <button onClick={() => handleRevoke(v.tx_hash)} disabled={isRevoking === v.tx_hash} className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap">
                                        {isRevoking === v.tx_hash ? <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-400"></span> : <ShieldAlert size={14} />}
                                        Revoke Access
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {proofState !== 'idle' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative transition-all duration-500 ${proofState === 'fraud' ? 'bg-rose-950/80 border-rose-600' : 'bg-[var(--color-neo-surface)] border-[var(--color-neo-border)]'}`}>
                            <div className={`absolute top-0 left-0 w-full h-1 ${proofState === 'success' ? 'bg-emerald-500' : proofState === 'fraud' ? 'bg-rose-500' : isAttackMode ? 'bg-amber-500' : 'bg-[var(--color-neo-accent)]'}`}></div>
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        {proofState === 'consent' && <><Shield className={isAttackMode ? 'text-amber-400' : 'text-[var(--color-neo-accent)]'} /> Granular Consent</>}
                                        {proofState === 'generating' && <><span className={`animate-spin rounded-full h-5 w-5 border-b-2 ${isAttackMode ? 'border-amber-400' : 'border-white'}`}></span>{isAttackMode ? <span className="text-amber-300 ml-2">Simulating MITM Attack...</span> : ' Generating ZK-Proof'}</>}
                                        {proofState === 'success' && <><CheckCircle className="text-emerald-500" /> Proof Generated</>}
                                        {proofState === 'fraud' && <><AlertOctagon className="text-rose-400" /> FRAUD BLOCKED</>}
                                    </h2>
                                    {['success', 'consent', 'fraud'].includes(proofState) && (
                                        <button onClick={closeVerification} className="text-gray-400 hover:text-white"><XCircle size={24} /></button>
                                    )}
                                </div>

                                {/* CONSENT */}
                                {proofState === 'consent' && (
                                    <div className="space-y-4">
                                        <div className="bg-[var(--color-neo-bg)] border border-[var(--color-neo-accent)]/30 rounded-xl p-4 text-sm">
                                            <p className="font-semibold text-[var(--color-neo-accent)] mb-1">{activeRequest?.department} requesting:</p>
                                            <p className="text-gray-300">"{activeRequest?.action}"</p>
                                        </div>
                                        <p className="text-xs text-[var(--color-neo-text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--color-neo-border)] pb-2">Selective Disclosure Settings</p>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-neo-bg)] border border-[var(--color-neo-border)]">
                                            <div><p className="text-sm font-medium">Prove Context</p><p className="text-xs text-[var(--color-neo-text-muted)]">Required proofs: {activeRequest?.required_proofs.join(', ')}</p></div>
                                            <div className="text-[var(--color-neo-accent)] opacity-50 cursor-not-allowed"><ToggleRight size={28} /><span className="block text-[8px] text-center mt-1">REQUIRED</span></div>
                                        </div>
                                        {[{ key: 'dob', label: 'Share Date of Birth', desc: 'Allow verifier to see your actual DOB.' }, { key: 'name', label: 'Share Full Name', desc: 'Allow verifier to see your full legal name.' }].map(({ key, label, desc }) => (
                                            <div key={key} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-colors ${consentSettings[key] ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-[var(--color-neo-bg)] border-[var(--color-neo-border)]'}`} onClick={() => setConsentSettings(prev => ({ ...prev, [key]: !prev[key] }))}>
                                                <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-[var(--color-neo-text-muted)]">{desc}</p></div>
                                                <div className={consentSettings[key] ? 'text-indigo-400' : 'text-gray-500'}>
                                                    {consentSettings[key] ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                                                    <span className="block text-[8px] text-center mt-1">{consentSettings[key] ? 'SHARED' : 'HIDDEN'}</span>
                                                </div>
                                            </div>
                                        ))}

                                        {/* MITM Toggle */}
                                        <div className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all ${isAttackMode ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-gray-900/50 border-dashed border-gray-700'}`} onClick={() => setIsAttackMode(p => !p)}>
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2"><AlertOctagon size={12} /> Simulate MITM Attack (Corrupt Proof Hash)</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">Dev/Security Mode: Sends tampered data.</p>
                                            </div>
                                            <div className={isAttackMode ? 'text-amber-400' : 'text-gray-600'}>{isAttackMode ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}</div>
                                        </div>

                                        <button onClick={handleStartGeneration} className={`w-full font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-white transition-all ${isAttackMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[var(--color-neo-accent)] hover:bg-blue-600'}`}>
                                            <Lock size={16} /> {isAttackMode ? 'EXECUTE ATTACK SIMULATION' : 'Compute ZK-Proof & Send'}
                                        </button>
                                    </div>
                                )}

                                {/* GENERATING */}
                                {proofState === 'generating' && (
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between text-sm mb-2 text-[var(--color-neo-text-muted)]"><span>Progress</span><span>{progress}%</span></div>
                                            <div className="h-2 bg-[var(--color-neo-bg)] rounded-full overflow-hidden">
                                                <motion.div className={`h-full ${isAttackMode ? 'bg-amber-500' : 'bg-[var(--color-neo-accent)]'}`} initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                        <div className={`bg-[var(--color-neo-bg)] border rounded-xl p-4 h-48 overflow-y-auto font-mono text-xs ${isAttackMode ? 'border-amber-700/50' : 'border-[var(--color-neo-border)]'}`}>
                                            {logs.map((log, i) => (
                                                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`mb-1 flex gap-2 ${log.startsWith('⚠') ? 'text-amber-400 font-bold' : 'text-[var(--color-neo-text-muted)]'}`}>
                                                    <span className={isAttackMode ? 'text-amber-500' : 'text-[var(--color-neo-accent)]'}>[{i}]</span> {log}
                                                </motion.div>
                                            ))}
                                            <div className={`animate-pulse ${isAttackMode ? 'text-amber-400' : ''}`}>_</div>
                                        </div>
                                    </div>
                                )}

                                {/* SUCCESS */}
                                {proofState === 'success' && (
                                    <div className="space-y-6 text-center">
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500">
                                            <Shield size={40} className="text-emerald-500" />
                                        </motion.div>
                                        <div><h3 className="text-2xl font-bold text-white">Proof Sent Securely</h3><p className="text-emerald-400 text-sm mt-1">{proofResult?.message}</p></div>
                                        <div className="bg-[var(--color-neo-bg)] border border-[var(--color-neo-border)] rounded-xl p-4 text-left font-mono text-xs space-y-3">
                                            <div><div className="text-[var(--color-neo-text-muted)] mb-1">ZK-Proof Hash</div><div className="text-white truncate bg-[var(--color-neo-surface)] p-2 rounded border border-[var(--color-neo-border)]">{proofResult?.zk_proof_hash}</div></div>
                                            <div><div className="text-[var(--color-neo-text-muted)] mb-1">Blockchain Tx ID</div><div className="text-[var(--color-neo-accent)] truncate bg-[var(--color-neo-surface)] p-2 rounded border border-[var(--color-neo-border)]">{proofResult?.tx_hash}</div></div>
                                        </div>
                                        <button onClick={closeVerification} className="w-full bg-[var(--color-neo-accent)] hover:bg-blue-600 text-white font-bold py-3 rounded-xl">Return to Dashboard</button>
                                    </div>
                                )}

                                {/* FRAUD */}
                                {proofState === 'fraud' && (
                                    <div className="space-y-6 text-center">
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ duration: 0.5 }} className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-rose-500">
                                            <ShieldAlert size={40} className="text-rose-500" />
                                        </motion.div>
                                        <div><h3 className="text-2xl font-bold text-rose-300">ATTACK SIMULATED</h3><p className="text-rose-400 text-sm mt-1">Tampered proof was REJECTED by the ZK-Verifier network.</p></div>
                                        <div className="bg-gray-900/80 border border-rose-800 rounded-xl p-4 text-left font-mono text-xs space-y-2">
                                            <div className="text-rose-400/60 mb-1">Corrupted Hash (Rejected)</div>
                                            <div className="text-rose-400 line-through truncate bg-black/40 p-2 rounded border border-rose-800">{proofResult?.zk_proof_hash}</div>
                                            <p className="text-[10px] text-rose-400/70 text-center pt-1">Security outcome: FRAUD_BLOCKED. Zero data compromised.</p>
                                        </div>
                                        <button onClick={closeVerification} className="w-full bg-rose-700 hover:bg-rose-800 text-white font-bold py-3 rounded-xl">Close Simulation</button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CitizenWallet;
