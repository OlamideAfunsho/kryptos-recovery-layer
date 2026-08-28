import { deriveField, fieldHash } from "./crypto.js";

export function deriveNote(seed, { appId, index, value, asset }) {
  const base = `kryptos/${appId}/note/${index}`;
  const secret = deriveField(seed, `${base}/secret`);
  const nullifier = fieldHash([secret, 1n]);
  const nullifierHash = fieldHash([nullifier]);
  const precommitment = fieldHash([nullifier, secret]);
  const valueAsset = fieldHash([BigInt(value), BigInt(asset)]);
  const commitment = fieldHash([valueAsset, precommitment]);

  return {
    appId,
    index,
    value: BigInt(value),
    asset: BigInt(asset),
    nullifier,
    secret,
    nullifierHash,
    valueAsset,
    commitment
  };
}

export function publicNoteView(note) {
  return {
    appId: note.appId,
    index: note.index,
    value: note.value.toString(),
    asset: note.asset.toString(),
    nullifierHash: note.nullifierHash.toString(),
    commitment: note.commitment.toString()
  };
}
