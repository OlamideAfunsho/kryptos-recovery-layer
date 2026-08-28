import { createHmac, randomBytes } from "node:crypto";
import { poseidon1, poseidon2, poseidon3 } from "poseidon-lite";

const BN254_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export function createRecoverySeed() {
  return `kryptos:${randomBytes(32).toString("hex")}`;
}

export function deriveField(seed, path) {
  const digest = createHmac("sha256", seed).update(path).digest("hex");
  return BigInt(`0x${digest}`) % BN254_FIELD;
}

export function fieldHash(values) {
  const normalized = values.map(BigInt);
  if (normalized.length === 1) {
    return poseidon1(normalized);
  }
  if (normalized.length === 2) {
    return poseidon2(normalized);
  }
  if (normalized.length === 3) {
    return poseidon3(normalized);
  }
  throw new Error(`unsupported Poseidon arity: ${normalized.length}`);
}

export function toHex(value) {
  return `0x${BigInt(value).toString(16).padStart(64, "0")}`;
}

export function contextHash(context) {
  return fieldHash([BigInt(context)]);
}
