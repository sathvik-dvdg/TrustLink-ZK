import base64
import hashlib
import time
from typing import List, Optional, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import uuid

app = FastAPI(title="GovTrust-Connect Backend Prototype")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For prototype, allow all
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────

class LedgerEntry(BaseModel):
    id: str
    timestamp: float
    department_id: str
    action: str
    # status: VERIFIED | FRAUD_BLOCKED | Revoked | MALFORMED_HASH | Pending | Success (Revocation)
    status: str
    tx_hash: str
    zk_proof_hash: Optional[str] = None

class PendingRequest(BaseModel):
    id: str
    department: str
    action: str
    required_proofs: List[str]

# ──────────────────────────────────────────────
# In-memory state
# ──────────────────────────────────────────────

ledger: List[LedgerEntry] = []
pending_requests: List[PendingRequest] = [
    PendingRequest(id="req_1", department="Income Tax Dept", action="Verify Income < 5L", required_proofs=["income_statement"]),
    PendingRequest(id="req_2", department="University Admissions", action="Verify Scholarship Eligibility", required_proofs=["income_statement", "residency"]),
    PendingRequest(id="req_3", department="National Health Authority", action="Verify Insurance Valid", required_proofs=["health_insurance"]),
]

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def verify_zk_proof(zk_hash: str) -> bool:
    """
    Simulates ZK-proof verification.
    Returns False if the hash contains any known-bad patterns (MITM / malicious payload).
    """
    bad_patterns = ["MALICIOUS", "INVALID", "FAKE", "ATTACK", "0xMALICIOUS"]
    return not any(p in zk_hash.upper() for p in bad_patterns)

def generate_merkle_node(left: str, right: str) -> str:
    combined = left + right
    return "0x" + hashlib.sha256(combined.encode()).hexdigest()

# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@app.get("/api/ledger")
async def get_ledger():
    return {"ledger": ledger}

@app.get("/api/pending-requests")
async def get_pending_requests():
    return {"requests": pending_requests}

class GenerateProofRequest(BaseModel):
    request_id: str
    consent_payload: Optional[Dict[str, bool]] = None
    is_malicious: bool = False

@app.post("/api/generate-proof")
async def generate_proof(req: GenerateProofRequest):
    await asyncio.sleep(2.0)  # Simulate ZK generation delay

    # Find the original request
    request_info = next((r for r in pending_requests if r.id == req.request_id), None)

    if req.is_malicious:
        # Produce a corrupted / tampered proof hash
        zk_hash = f"0xMALICIOUS_DATA_FAKE_{uuid.uuid4().hex[:8].upper()}"
    else:
        proof_data = f"proof_for_{req.request_id}_{time.time()}"
        zk_hash = hashlib.sha256(proof_data.encode()).hexdigest()

    tx_hash = "0x" + hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()

    # Verify the proof
    is_valid = verify_zk_proof(zk_hash)
    security_outcome = "VERIFIED" if is_valid else "FRAUD_BLOCKED"

    if request_info:
        entry = LedgerEntry(
            id=str(uuid.uuid4()),
            timestamp=time.time(),
            department_id=request_info.department,
            action=request_info.action,
            status=security_outcome,
            tx_hash=tx_hash,
            zk_proof_hash=zk_hash
        )
        ledger.insert(0, entry)
        if is_valid:
            pending_requests.remove(request_info)

    return {
        "status": "success" if is_valid else "fraud_blocked",
        "security_outcome": security_outcome,
        "message": (
            "0 bytes of personal data shared. 1 cryptographic proof delivered."
            if is_valid else
            "⚠️ FRAUD DETECTED: Proof hash is malformed. Transaction rejected."
        ),
        "zk_proof_hash": zk_hash,
        "tx_hash": tx_hash,
        "consent": req.consent_payload,
        "is_valid": is_valid,
    }

class DepartmentVerificationRequest(BaseModel):
    department: str
    action: str
    required_proofs: List[str]

@app.post("/api/request-verification")
async def create_request(req: DepartmentVerificationRequest):
    new_req = PendingRequest(
        id=f"req_{uuid.uuid4().hex[:12]}",
        department=req.department,
        action=req.action,
        required_proofs=req.required_proofs
    )
    pending_requests.append(new_req)
    ledger.insert(0, LedgerEntry(
        id=str(uuid.uuid4()),
        timestamp=time.time(),
        department_id=req.department,
        action=f"Requested Verification: {req.action}",
        status="Pending",
        tx_hash="0x" + hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest(),
        zk_proof_hash=None
    ))
    return {"status": "success", "request": new_req}

@app.post("/api/simulate-attack")
async def simulate_attack():
    new_req = PendingRequest(
        id=f"req_{uuid.uuid4().hex[:12]}_attack",
        department="Unknown Origin",
        action="Verify Identity (ATTACK SIMULATION)",
        required_proofs=["identity_full"]
    )
    pending_requests.insert(0, new_req)
    ledger.insert(0, LedgerEntry(
        id=str(uuid.uuid4()),
        timestamp=time.time(),
        department_id="Unknown Origin",
        action="Injection Attempt: Identity Proof",
        status="MALFORMED_HASH",
        tx_hash="0x" + hashlib.sha256(b"malformed_payload_attempt").hexdigest(),
        zk_proof_hash="INVALID_HASH_SIGNATURE_DETECTED"
    ))
    return {"status": "attack_simulated", "message": "Malicious payload injected into network stream."}

class RevokeAccessRequest(BaseModel):
    tx_hash: str

@app.post("/api/revoke-access")
async def revoke_access(req: RevokeAccessRequest):
    for entry in ledger:
        if entry.tx_hash == req.tx_hash and entry.status == "VERIFIED":
            entry.status = "Revoked"
            ledger.insert(0, LedgerEntry(
                id=str(uuid.uuid4()),
                timestamp=time.time(),
                department_id="Citizen Wallet UI",
                action=f"Revoked Access for Hash: {req.tx_hash[:10]}...",
                status="Success (Revocation)",
                tx_hash="0x" + hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest(),
                zk_proof_hash="REVOCATION_PROOF"
            ))
            return {"status": "success", "message": "Access successfully revoked on the ledger."}

    raise HTTPException(status_code=404, detail="Active verification not found or already revoked.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
