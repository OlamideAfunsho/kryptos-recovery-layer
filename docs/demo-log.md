# Demo Log

This is the expected shape of `npm run demo`.

```text
KryptOS Recovery Layer demo

1. Deposit privately
   commitment: 0x...
   leaf index: 0

2. Delete disposable local cache
   cache entries after delete: 0

3. Restore only the recovery seed
   scanned events: 1
   recovered notes: 1
   unspent notes: 1

4. Reconstruct Merkle witness
   root: 0x...
   path length: 0

5. Generate withdrawal proof package
   nullifier hash: 0x...
   proof adapter: local-groth16-fixture
   public signals: newCommitmentHash, existingNullifierHash, contextHash, withdrawnValue, treeDepth, context, root, asset

5b. Generate real SDK Groth16 proof
   sdk adapter: kusama-shield-sdk-0.1.4
   sdk public signals: 8

6. Withdraw successfully
   status: withdrawn
```
