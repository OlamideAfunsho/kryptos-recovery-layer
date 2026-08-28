import { LeanMerkleTree } from "./merkle.js";
import { deriveNote } from "./note.js";

export function recoverNotesFromEvents({ seed, appId, events, maxNoteIndex = 32 }) {
  const deposits = events.filter((event) => event.type === "Deposit" && event.appId === appId);
  const spent = new Set(
    events
      .filter((event) => event.type === "Withdraw" && event.appId === appId)
      .map((event) => event.nullifierHash)
  );
  const tree = new LeanMerkleTree(deposits.map((event) => BigInt(event.commitment)));
  const recovered = [];

  for (let index = 0; index < maxNoteIndex; index += 1) {
    for (const deposit of deposits) {
      const candidate = deriveNote(seed, {
        appId,
        index,
        value: BigInt(deposit.value),
        asset: BigInt(deposit.asset)
      });

      if (candidate.commitment === BigInt(deposit.commitment)) {
        const witness = tree.witness(deposit.leafIndex);
        recovered.push({
          note: candidate,
          deposit,
          witness,
          spent: spent.has(candidate.nullifierHash.toString())
        });
      }
    }
  }

  return {
    treeRoot: tree.root(),
    recovered,
    unspent: recovered.filter((entry) => !entry.spent)
  };
}

