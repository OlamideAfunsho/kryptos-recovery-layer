# KryptOS Recovery Layer

KryptOS Recovery Layer is a small open-source proof-of-concept SDK for recovering shielded ZK notes from two durable inputs:

- a single user recovery seed
- public contract history

The core idea is simple: local browser storage should be a cache, not the only place where spendable private state lives. If a user loses local note data, the recovery seed should deterministically recreate the note secrets and nullifiers, then a scanner should replay public deposit/spend events to recover unspent notes and their Merkle witnesses.

## MVP Status

This repository proves the recovery flow locally with a Kusama Shield-style model:

1. Deposit a shielded note using seed-derived `secret` and `nullifier` values.
2. Delete the disposable local cache.
3. Restore only the recovery seed.
4. Replay public pool events.
5. Rebuild the Merkle tree and witness.
6. Generate a V7-shaped withdrawal proof package with the expected 8 public signals.
7. Optionally generate a real Groth16 proof through `@kusamashield/shielded-transfers@0.1.4`.
8. Withdraw successfully in the local verifier.

The MVP intentionally does not ship a new circuit, wallet, relayer, hosted indexer, or production Revive deployment.

## Important Boundary

The default demo uses a deterministic local verifier so it stays fast and easy to record. The stronger demo path uses the Kusama Shield SDK artifacts installed from `@kusamashield/shielded-transfers@0.1.4` and successfully generates an 8-signal Groth16 proof from the recovered note state.

The remaining productionization work is chain-side: point the scanner at a Revive RPC endpoint and submit the generated proof through `withdrawV7`.

## Quickstart

```powershell
cd C:\Users\USER\Documents\Codex\2026-06-01\what-s-next\kryptos-recovery-layer
node --test
node .\src\cli.js demo
node .\src\cli.js demo --sdk-proof
```

Expected result:

- the tests pass
- the demo prints a deposit
- the cache is deleted
- the note is recovered from seed + events
- a proof package is generated
- the optional SDK proof path returns 8 public signals
- withdrawal succeeds

## CLI

Run the full demo:

```powershell
node .\src\cli.js demo
```

If the Kusama Shield proving artifacts are installed, run the recovered-state SDK proof path:

```powershell
node .\src\cli.js demo --sdk-proof
```

The CLI prints each phase:

- seed-derived deposit
- local cache deletion
- event replay
- recovered Merkle witness
- proof package
- withdrawal result

## Project Layout

```text
src/
  cache.js          disposable encrypted cache facade used by the demo
  cli.js            demo command
  crypto.js         deterministic seed hierarchy and field hashing
  events.js         in-memory Revive-style event log
  merkle.js         Lean-style Merkle tree and witness recovery
  note.js           recoverable note model
  pool.js           local shielded pool verifier
  proof-adapter.js  V7 public-signal proof adapter boundary
  recovery.js       event replay recovery engine
  scanner.js        Revive-style event scanner boundary
test/
  recovery.test.js  end-to-end recovery tests
docs/
  integration-notes.md
  demo-log.md
```

## What This Proves

The MVP proves that a recoverable shielded-note design can treat local storage as disposable. Given the same recovery seed and public history, the SDK rediscovers the user's note, identifies whether it is unspent, reconstructs the Merkle witness, and feeds that recovered state into the Kusama Shield SDK proof path.

## What This Does Not Prove Yet

- It does not prove compatibility with a deployed Kusama Shield pool.
- It does not submit transactions to Revive.
- It does not claim to recover notes created with random secrets outside this deterministic derivation scheme.

## Pinned Reference Targets

These are the intended upstream integration targets for productization:

- Circom: `2.1.x`
- Proving system: Groth16 on BN254
- Kusama Shield SDK: `@kusamashield/shielded-transfers@0.1.4`
- Artifacts: `withdraw_phase2_fixed_v7.wasm`, `withdraw_phase2_fixed_v7_0001.zkey`
- Kusama Shield flow: V7 deposit/withdraw public signal order
- Tree model: LeanIMT-style Merkle inclusion path

## Demo Evidence

The committed sample in [docs/demo-log.md](docs/demo-log.md) shows the expected transcript for deposit, local deletion, seed recovery, witness reconstruction, proof package creation, and withdrawal.
