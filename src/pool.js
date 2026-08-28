import { contextHash, fieldHash } from "./crypto.js";
import { LeanMerkleTree, verifyWitness } from "./merkle.js";

export class LocalShieldedPool {
  constructor({ eventLog, appId }) {
    this.eventLog = eventLog;
    this.appId = appId;
    this.tree = new LeanMerkleTree();
    this.spentNullifiers = new Set();
  }

  deposit(note) {
    const leafIndex = this.tree.insert(note.commitment);
    this.eventLog.append({
      type: "Deposit",
      appId: this.appId,
      commitment: note.commitment.toString(),
      leafIndex,
      asset: note.asset.toString(),
      value: note.value.toString()
    });
    return { leafIndex, commitment: note.commitment, root: this.tree.root() };
  }

  createWithdrawalPackage({ note, witness, withdrawnValue, remainingValue = 0n, context = 1n }) {
    const newNullifier = fieldHash([note.nullifier, BigInt(context), 1n]);
    const newSecret = fieldHash([note.secret, BigInt(context), 2n]);
    const newPrecommitment = fieldHash([newNullifier, newSecret]);
    const newCommitmentHash = fieldHash([BigInt(remainingValue), note.asset, newPrecommitment]);

    return {
      proof: {
        adapter: "local-deterministic-proof",
        validWitness: verifyWitness(witness),
        noteIndex: note.index
      },
      publicSignals: {
        newCommitmentHash,
        existingNullifierHash: note.nullifierHash,
        contextHash: contextHash(context),
        withdrawnValue: BigInt(withdrawnValue),
        treeDepth: BigInt(witness.treeDepth),
        context: BigInt(context),
        root: witness.root,
        asset: note.asset
      },
      privateInputs: {
        asset: note.asset,
        existingValue: note.value,
        existingNullifier: note.nullifier,
        existingSecret: note.secret,
        newNullifier,
        newSecret,
        siblings: witness.siblings,
        leafIndex: witness.leafIndex
      }
    };
  }

  withdraw(packageInput, recipient) {
    const { proof, publicSignals, privateInputs } = packageInput;
    const nullifierKey = publicSignals.existingNullifierHash.toString();

    if (!proof.validWitness) {
      throw new Error("withdrawal rejected: invalid recovered Merkle witness");
    }
    if (this.spentNullifiers.has(nullifierKey)) {
      throw new Error("withdrawal rejected: nullifier already spent");
    }
    if (publicSignals.withdrawnValue > privateInputs.existingValue) {
      throw new Error("withdrawal rejected: withdrawn value exceeds note value");
    }

    this.spentNullifiers.add(nullifierKey);
    this.eventLog.append({
      type: "Withdraw",
      appId: this.appId,
      nullifierHash: nullifierKey,
      recipient,
      withdrawnValue: publicSignals.withdrawnValue.toString(),
      newCommitmentHash: publicSignals.newCommitmentHash.toString()
    });

    return {
      status: "withdrawn",
      recipient,
      nullifierHash: publicSignals.existingNullifierHash
    };
  }
}
