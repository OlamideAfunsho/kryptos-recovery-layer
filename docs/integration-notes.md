# Integration Notes

This MVP is deliberately small. It proves the recovery layer as an SDK boundary, then leaves narrow adapters for live Kusama Shield / Revive integration.

## Current Adapters

The local model uses:

- deterministic field derivation from a recovery seed
- Poseidon field hashing for commitments and nullifier hashes
- an in-memory event log that mirrors the shape of public pool events
- a Lean-style Merkle tree
- a deterministic proof package checked by the local pool verifier

The SDK proof path uses:

- `@kusamashield/shielded-transfers@0.1.4`
- `withdraw_phase2_fixed_v7.wasm`
- `withdraw_phase2_fixed_v7_0001.zkey`
- `ZKPService.generateV4WithdrawProof(...)`

That means the repo can prove recovered state through the public SDK without a live chain, wallet, or funded account.

## Live Adapter Work

To turn this proof into a live Revive/Kusama Shield flow, replace these parts:

- `src/events.js`: replace the in-memory event log with a Revive contract log scanner.
- `src/pool.js`: replace the local withdrawal check with a `withdrawV7(...)` transaction.
- `src/merkle.js`: align tree depth, zero handling, and deployment-block replay with the target deployed pool.

## Public Signal Alignment

The intended Kusama Shield V7 public signal order is:

```text
newCommitmentHash
existingNullifierHash
contextHash
withdrawnValue
treeDepth
context
root
asset
```

The MVP proof package keeps these fields explicit so a reviewer can see how recovered state maps into a real Groth16 adapter.

## Recovery Requirement

For this recovery model to work, deposits must be created with deterministic note material derived from the recovery seed. Notes created with fully random secrets and nullifiers cannot be recreated from seed alone.
