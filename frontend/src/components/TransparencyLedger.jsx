import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Database, Hash, Server, Eye, Activity, Layers, Cpu, RadioReceiver, GitBranch } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Simple deterministic "hash" for display (for Merkle nodes)
const simHash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; }
    return '0x' + Math.abs(h).toString(16).padStart(8, '0');
};

const MerkleNode = ({ label, hash, isLeaf, isRoot, isNew, type }) => {
    const colors = {
        leaf: { border: 'border-[var(--color-neo-accent)]', text: 'text-[var(--color-neo-accent)]', bg: 'bg-[var(--color-neo-accent)]/10' },
        branch: { border: 'border-indigo-500', text: 'text-indigo-400', bg: 'bg-indigo-500/10' },
        root: { border: 'border-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-500/10' },
    };
    const c = colors[type] || colors.branch;

    return (
        <motion.div
            animate={isNew ? { scale: [1, 1.05, 1], boxShadow: ['0 0 0 0 rgba(14,165,233,0)', '0 0 20px 4px rgba(14,165,233,0.4)', '0 0 0 0 rgba(14,165,233,0)'] } : {}}
            transition={{ duration: 0.8 }}
            className={`${c.bg} border ${c.border} rounded-lg px-3 py-2 text-center max-w-[180px] w-full`}
        >
            {label && <p className={`text-[9px] uppercase tracking-widest font-bold ${c.text} mb-1`}>{label}</p>}
            <p className={`font-mono text-[10px] truncate ${c.text}`}>{hash}</p>
        </motion.div>
    );
};

const MerkleTree = ({ leaves }) => {
    // Build 4 leaves even if fewer entries
    const paddedLeaves = [...leaves];
    while (paddedLeaves.length < 4) paddedLeaves.push({ tx_hash: `0x${'0'.repeat(8 + paddedLeaves.length * 4)}`, id: `pad_${paddedLeaves.length}` });

    const l0 = paddedLeaves[0].tx_hash;
    const l1 = paddedLeaves[1].tx_hash;
    const l2 = paddedLeaves[2].tx_hash;
    const l3 = paddedLeaves[3].tx_hash;

    const b0 = simHash(l0 + l1);
    const b1 = simHash(l2 + l3);
    const root = simHash(b0 + b1);

    const isNewLeaf = (i) => i === 0 && leaves.length > 0;

    return (
        <div className="flex flex-col items-center gap-5 w-full py-4 select-none">
            {/* Root */}
            <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] uppercase tracking-widest text-emerald-400/60 font-bold">Merkle Root</span>
                <motion.div animate={{ boxShadow: ['0 0 10px rgba(52,211,153,0.2)', '0 0 25px rgba(52,211,153,0.5)', '0 0 10px rgba(52,211,153,0.2)'] }} transition={{ duration: 2.5, repeat: Infinity }}
                    className="bg-emerald-500/10 border border-emerald-400 rounded-xl px-5 py-3 text-center w-72">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-emerald-400 mb-1">STATE ROOT</p>
                    <p className="font-mono text-xs text-emerald-300 truncate">{root}</p>
                </motion.div>
            </div>

            {/* Root → branches connector */}
            <div className="flex items-start gap-20 relative w-full justify-center">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-px bg-emerald-500/50"></div>
                <div className="absolute top-5 left-[calc(50%-80px)] right-[calc(50%-80px)] h-px bg-emerald-500/30"></div>
                <div className="absolute top-5 left-[calc(50%-80px)] h-4 w-px bg-indigo-500/50"></div>
                <div className="absolute top-5 right-[calc(50%-80px)] h-4 w-px bg-indigo-500/50"></div>
            </div>

            {/* Branches */}
            <div className="flex items-start gap-40 w-full justify-center -mt-4">
                <MerkleNode type="branch" label="Hash(L0+L1)" hash={b0} />
                <MerkleNode type="branch" label="Hash(L2+L3)" hash={b1} />
            </div>

            {/* Branch → leaf connectors */}
            <div className="flex items-start gap-40 w-full justify-center relative -mt-1">
                {/* Left branch */}
                <div className="flex flex-col items-center gap-0 w-[180px]">
                    <div className="h-5 w-px bg-indigo-500/40"></div>
                    <div className="flex gap-12 w-full justify-center">
                        <div className="flex flex-col items-center"><div className="h-4 w-px bg-indigo-500/30"></div></div>
                        <div className="flex flex-col items-center"><div className="h-4 w-px bg-indigo-500/30"></div></div>
                    </div>
                </div>
                {/* Right branch */}
                <div className="flex flex-col items-center gap-0 w-[180px]">
                    <div className="h-5 w-px bg-indigo-500/40"></div>
                    <div className="flex gap-12 w-full justify-center">
                        <div className="flex flex-col items-center"><div className="h-4 w-px bg-indigo-500/30"></div></div>
                        <div className="flex flex-col items-center"><div className="h-4 w-px bg-indigo-500/30"></div></div>
                    </div>
                </div>
            </div>

            {/* Leaves */}
            <div className="flex gap-5 w-full justify-center -mt-4 flex-wrap">
                {paddedLeaves.slice(0, 4).map((leaf, i) => (
                    <MerkleNode
                        key={leaf.id}
                        type="leaf"
                        label={`Leaf ${i}`}
                        hash={leaf.tx_hash.substring(0, 14) + '...'}
                        isNew={isNewLeaf(i)}
                    />
                ))}
            </div>
        </div>
    );
};

const TransparencyLedger = () => {
    const [ledger, setLedger] = useState([]);
    const [isLive, setIsLive] = useState(true);
    const canvasRef = useRef(null);

    const fetchLedger = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/ledger');
            const data = await res.json();
            setLedger(data.ledger || []);
        } catch (err) { console.error("Failed to fetch ledger", err); }
    };

    useEffect(() => {
        fetchLedger();
        let interval;
        if (isLive) interval = setInterval(fetchLedger, 2000);
        return () => clearInterval(interval);
    }, [isLive]);

    // Canvas Animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        const points = Array.from({ length: 80 }, () => ({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
            phase: Math.random() * Math.PI * 2
        }));
        let timePhase = 0;
        const render = () => {
            if (!isLive) { animationFrameId = requestAnimationFrame(render); return; }
            ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const cx = canvas.width / 2, cy = canvas.height / 2;
            ctx.beginPath(); ctx.arc(cx, cy, 20 + Math.sin(timePhase * 2) * 5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(16, 185, 129, ${0.3 + Math.sin(timePhase) * 0.2})`; ctx.lineWidth = 2; ctx.stroke();
            ctx.lineWidth = 0.5;
            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                p1.x += p1.vx; p1.y += p1.vy; p1.phase += 0.05;
                if (p1.x < 0 || p1.x > canvas.width) p1.vx *= -1;
                if (p1.y < 0 || p1.y > canvas.height) p1.vy *= -1;
                ctx.beginPath(); ctx.arc(p1.x, p1.y, 1.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(99, 102, 241, ${0.5 + Math.sin(p1.phase) * 0.5})`; ctx.fill();
                for (let j = i + 1; j < points.length; j++) {
                    const p2 = points[j];
                    const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
                    if (dist < 50) {
                        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(14, 165, 233, ${(1 - dist / 50) * 0.3 * (1 + Math.sin(timePhase + p1.phase) * 0.5)})`; ctx.stroke();
                    }
                }
                const dc = Math.sqrt((p1.x - cx) ** 2 + (p1.y - cy) ** 2);
                if (dc < 80 && Math.random() > 0.95) {
                    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(cx, cy);
                    ctx.strokeStyle = `rgba(16, 185, 129, ${(1 - dc / 80) * 0.5})`; ctx.stroke();
                }
            }
            timePhase += 0.02; animationFrameId = requestAnimationFrame(render);
        };
        render();
        return () => window.cancelAnimationFrame(animationFrameId);
    }, [isLive]);

    const formatTime = (ts) => {
        const d = new Date(ts * 1000);
        return d.toLocaleTimeString() + '.' + String(d.getMilliseconds()).padStart(3, '0');
    };

    const merkleLeaves = useMemo(() =>
        ledger.filter(e => e.tx_hash && e.status !== 'Pending').slice(0, 4),
        [ledger]
    );

    return (
        <div className="flex flex-col space-y-6 max-w-7xl mx-auto pb-10">

            {/* Header */}
            <div className="glass-panel rounded-2xl p-6 flex items-center justify-between border-b-4 border-indigo-500/50">
                <div className="flex items-center gap-4">
                    <div className="bg-[var(--color-neo-bg)] p-3 rounded-xl border border-[var(--color-neo-border)] relative">
                        <Database className="text-indigo-400" size={32} />
                        {isLive && (<span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span></span>)}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-[var(--color-neo-accent)]">Public Accountability Network</h1>
                        <p className="text-[var(--color-neo-text-muted)] mt-1 flex items-center gap-2"><Eye size={14} /> Citizens auditing the Government via ZK-Proofs</p>
                    </div>
                </div>
                <button onClick={() => setIsLive(!isLive)} className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 border transition-colors ${isLive ? 'bg-[var(--color-neo-bg)] border-[var(--color-neo-border)] hover:border-rose-500/50' : 'bg-indigo-500 border-indigo-400 text-white'}`}>
                    {isLive ? 'Pause Stream' : 'Resume Live Sync'}
                </button>
            </div>

            {/* Main 3-col */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Visualizer + Stats */}
                <div className="col-span-1 flex flex-col gap-6">
                    <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-sm tracking-wider uppercase text-indigo-300 flex items-center gap-2"><Activity size={16} /> Lattice Entropy</h3>
                            <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20">POST-QUANTUM</span>
                        </div>
                        <div className="w-full h-48 bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden relative mb-4">
                            <canvas ref={canvasRef} width={400} height={200} className="w-full h-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900 to-transparent h-12 pointer-events-none"></div>
                            <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[10px] font-mono text-slate-400">
                                <span>dim: 1024x1024</span>
                                <span className={isLive ? 'text-emerald-400' : 'text-rose-400'}>{isLive ? 'SYNCING...' : 'HALTED'}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-[var(--color-neo-bg)] p-3 rounded-lg border border-[var(--color-neo-border)]"><span className="block text-[var(--color-neo-text-muted)] mb-1">State Root</span><span className="font-mono text-[var(--color-neo-accent)] truncate block">0x8f...e2a</span></div>
                            <div className="bg-[var(--color-neo-bg)] p-3 rounded-lg border border-[var(--color-neo-border)]"><span className="block text-[var(--color-neo-text-muted)] mb-1">Noise Level</span><span className="font-mono text-emerald-400">Low (Stable)</span></div>
                        </div>
                    </div>
                    <div className="glass-panel rounded-2xl p-5 border border-[var(--color-neo-border)]">
                        <h3 className="font-bold text-sm tracking-wider uppercase text-gray-400 flex items-center gap-2 mb-4"><Server size={16} /> Global Consensus</h3>
                        <div className="space-y-4">
                            {[['Active Validators', '1,402', 'text-white', Layers], ['Network TPS', '14.23', 'text-emerald-400', Activity], ['Proof Gen Avg', '2.4s', 'text-white', Cpu], ['Protocol Version', 'v2.1.0-pq', 'text-indigo-400', RadioReceiver]].map(([label, val, color, Icon]) => (
                                <div key={label} className="flex justify-between items-center border-b border-gray-800 pb-2 last:border-0">
                                    <span className="text-sm text-gray-400 flex items-center gap-2"><Icon size={14} /> {label}</span>
                                    <span className={`font-mono font-bold ${color}`}>{val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Audit Log */}
                <div className="col-span-1 lg:col-span-2 glass-panel rounded-2xl overflow-hidden flex flex-col h-[700px] border border-[var(--color-neo-border)]">
                    <div className="bg-[var(--color-neo-surface)] p-4 flex justify-between items-center border-b border-[var(--color-neo-border)]">
                        <h2 className="font-bold text-lg flex items-center gap-2"><Database className="text-[var(--color-neo-accent)]" size={18} /> Immutable Audit Log</h2>
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/30">{ledger.length} Block(s) Indexed</span>
                    </div>
                    <div className="bg-[#0f172a]/50 px-6 py-3 grid grid-cols-12 gap-4 text-[10px] font-semibold text-[var(--color-neo-text-muted)] uppercase tracking-wider border-b border-[var(--color-neo-border)]">
                        <div className="col-span-2">Block Time</div><div className="col-span-3">Entity</div><div className="col-span-2">Status</div><div className="col-span-5">Tx / Proof Hash</div>
                    </div>
                    <div className="flex-1 overflow-y-auto font-mono text-sm bg-[var(--color-neo-bg)]">
                        <AnimatePresence>
                            {ledger.map((entry, idx) => (
                                <motion.div key={`${entry.id}-${idx}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3 }}
                                    className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-800/50 items-center transition-colors
                                        ${idx === 0 && isLive ? 'bg-indigo-500/5 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent hover:bg-gray-800/30'}
                                        ${entry.status === 'FRAUD_BLOCKED' ? 'bg-rose-950/30' : ''}`}>
                                    <div className="col-span-2 text-gray-500 text-xs">{formatTime(entry.timestamp)}</div>
                                    <div className="col-span-3 text-white font-sans text-xs flex items-center gap-1 truncate">{entry.department_id}</div>
                                    <div className="col-span-2">
                                        <span className={`px-1.5 py-1 rounded text-[9px] border block text-center font-bold font-sans tracking-wide truncate
                                            ${entry.status === 'VERIFIED' ? 'border-emerald-500/50 text-emerald-400' :
                                                entry.status === 'FRAUD_BLOCKED' ? 'border-rose-500/50 text-rose-400' :
                                                    entry.status === 'Revoked' ? 'border-gray-600 text-gray-400' :
                                                        entry.status === 'MALFORMED_HASH' ? 'border-rose-500/50 text-rose-400' :
                                                            'border-amber-500/30 text-amber-400'}`}>
                                            {entry.status === 'VERIFIED' ? 'ZK-PROOF' : entry.status === 'FRAUD_BLOCKED' ? 'BLOCKED' : entry.status === 'Revoked' ? 'REVOKED' : entry.status === 'MALFORMED_HASH' ? 'REJECTED' : 'PENDING'}
                                        </span>
                                    </div>
                                    <div className="col-span-5 flex flex-col gap-1 overflow-hidden text-xs">
                                        <div className="flex items-center gap-2 text-gray-300"><Hash size={10} className="text-gray-600 flex-shrink-0" /><span className="truncate text-[11px]">{entry.tx_hash}</span></div>
                                        {entry.zk_proof_hash && (
                                            <div className="flex items-center gap-2 ml-4">
                                                <span className="text-[9px] bg-gray-800 px-1 rounded border border-gray-700">Proof</span>
                                                <span className={`truncate text-[10px] ${entry.status === 'FRAUD_BLOCKED' || entry.status === 'MALFORMED_HASH' ? 'text-rose-500/70 line-through' : 'text-emerald-500/70'}`}>{entry.zk_proof_hash.substring(entry.zk_proof_hash.length - 24)}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 ml-4 text-gray-600"><span className="truncate text-[10px] font-sans">↳ {entry.action}</span></div>
                                    </div>
                                </motion.div>
                            ))}
                            {ledger.length === 0 && (<div className="py-20 text-center text-gray-500 flex flex-col items-center"><Server size={48} className="mb-4 opacity-20" /><p>Connecting to Genesis Block...</p></div>)}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Merkle Tree Section */}
            <div className="glass-panel rounded-2xl p-6 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-3">
                            <GitBranch className="text-emerald-400" size={22} />
                            Block Composition <span className="text-emerald-400">— Merkle Root Explorer</span>
                        </h2>
                        <p className="text-sm text-[var(--color-neo-text-muted)] mt-1">Cryptographic hash tree derived from the 4 most recent transaction hashes. Root recalculates on every new block.</p>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 uppercase tracking-wider">SHA-256 Simulation</span>
                </div>

                {merkleLeaves.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-xl">
                        <p className="text-sm">No transactions yet. Generate proofs to populate the Merkle Tree.</p>
                    </div>
                ) : (
                    <MerkleTree leaves={merkleLeaves} />
                )}

                {/* Legend */}
                <div className="flex items-center gap-6 mt-6 pt-4 border-t border-[var(--color-neo-border)] text-xs text-[var(--color-neo-text-muted)] justify-center flex-wrap">
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[var(--color-neo-accent)]/30 border border-[var(--color-neo-accent)] inline-block"></span> Leaf Node (Tx Hash)</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-indigo-500/30 border border-indigo-500 inline-block"></span> Branch Node (Hash of pair)</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-400 inline-block"></span> Merkle Root (Chain State)</span>
                </div>
            </div>
        </div>
    );
};

export default TransparencyLedger;
