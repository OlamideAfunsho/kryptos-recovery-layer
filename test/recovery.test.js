import assert from "node:assert/strict";
import test from "node:test";

import { DisposableCache } from "../src/cache.js";
import { ReviveEventLog } from "../src/events.js";
import { deriveNote } from "../src/note.js";
import { LocalShieldedPool } from "../src/pool.js";
import {
  KUSAMA_SHIELD_V7_SIGNALS,
  KusamaShieldSdkProofAdapter,
  LocalGroth16FixtureAdapter
} from "../src/proof-adapter.js";
import { recoverNotesFromEvents } from "../src/recovery.js";
import { ReviveScanner } from "../src/scanner.js";

test("seed plus public events recover an unspent note after cache deletion", () => {
  const seed = "kryptos:test-seed";
  const appId = "kusama-shield-v7-local-proof";
  const events = new ReviveEventLog();
  const pool = new LocalShieldedPool({ eventLog: events, appId });
  const cache = new DisposableCache();

  const note = deriveNote(seed, { appId, index: 0, value: 5n, asset: 0n });
  const deposit = pool.deposit(note);
  cache.put("note", { commitment: note.commitment.toString() });
  cache.clear();

  const recovered = recoverNotesFromEvents({
    seed,
    appId,
    events: events.scan(),
    maxNoteIndex: 4
  });

  assert.equal(cache.size(), 0);
  assert.equal(recovered.unspent.length, 1);
  assert.equal(recovered.unspent[0].deposit.leafIndex, deposit.leafIndex);
  assert.equal(recovered.unspent[0].note.commitment, note.commitment);
});

test("recovered witness can produce a withdrawal package that spends once", () => {
  const seed = "kryptos:test-seed";
  const appId = "kusama-shield-v7-local-proof";
  const events = new ReviveEventLog();
  const pool = new LocalShieldedPool({ eventLog: events, appId });

  const note = deriveNote(seed, { appId, index: 0, value: 9n, asset: 0n });
  pool.deposit(note);

  const recovered = recoverNotesFromEvents({
    seed,
    appId,
    events: events.scan(),
    maxNoteIndex: 4
  }).unspent[0];

  const withdrawalPackage = pool.createWithdrawalPackage({
    note: recovered.note,
    witness: recovered.witness,
    withdrawnValue: 9n,
    context: 7n
  });

  const result = pool.withdraw(withdrawalPackage, "0x000000000000000000000000000000000000dEaD");
  assert.equal(result.status, "withdrawn");
  assert.throws(
    () => pool.withdraw(withdrawalPackage, "0x000000000000000000000000000000000000dEaD"),
    /nullifier already spent/
  );
});

test("proof adapter exports Kusama Shield V7 public signals in order", () => {
  const seed = "kryptos:test-seed";
  const appId = "kusama-shield-v7-local-proof";
  const events = new ReviveEventLog();
  const pool = new LocalShieldedPool({ eventLog: events, appId });
  const scanner = new ReviveScanner({ source: events });
  const proofAdapter = new LocalGroth16FixtureAdapter();

  const note = deriveNote(seed, { appId, index: 0, value: 13n, asset: 0n });
  pool.deposit(note);

  const recovered = recoverNotesFromEvents({
    seed,
    appId,
    events: scanner.scanPoolEvents({ appId }),
    maxNoteIndex: 4
  }).unspent[0];

  const withdrawalPackage = pool.createWithdrawalPackage({
    note: recovered.note,
    witness: recovered.witness,
    withdrawnValue: 13n,
    context: 9n
  });
  const proof = proofAdapter.generate(withdrawalPackage);

  assert.deepEqual(proof.publicSignalNames, KUSAMA_SHIELD_V7_SIGNALS);
  assert.equal(proof.publicSignals.length, 8);
  assert.equal(proof.verifiedLocally, true);
});

test("Kusama Shield SDK adapter prepares padded witness input", () => {
  const seed = "kryptos:test-seed";
  const appId = "kusama-shield-v7-local-proof";
  const events = new ReviveEventLog();
  const pool = new LocalShieldedPool({ eventLog: events, appId });
  const adapter = new KusamaShieldSdkProofAdapter();

  const note = deriveNote(seed, { appId, index: 0, value: 21n, asset: 0n });
  pool.deposit(note);
  const recovered = recoverNotesFromEvents({
    seed,
    appId,
    events: events.scan(),
    maxNoteIndex: 4
  }).unspent[0];
  const withdrawalPackage = pool.createWithdrawalPackage({
    note: recovered.note,
    witness: recovered.witness,
    withdrawnValue: 21n,
    context: 10n
  });

  const sdkInput = adapter.toSdkInput(withdrawalPackage);
  assert.equal(sdkInput.siblings.length, 128);
  assert.equal(sdkInput.existingNullifier, note.nullifier.toString());
  assert.equal(sdkInput.existingSecret, note.secret.toString());
  assert.equal(sdkInput.withdrawnValue, "21");
});

test("spent notes are excluded during recovery replay", () => {
  const seed = "kryptos:test-seed";
  const appId = "kusama-shield-v7-local-proof";
  const events = new ReviveEventLog();
  const pool = new LocalShieldedPool({ eventLog: events, appId });

  const note = deriveNote(seed, { appId, index: 0, value: 11n, asset: 0n });
  pool.deposit(note);

  const firstRecovery = recoverNotesFromEvents({
    seed,
    appId,
    events: events.scan(),
    maxNoteIndex: 4
  }).unspent[0];

  const withdrawalPackage = pool.createWithdrawalPackage({
    note: firstRecovery.note,
    witness: firstRecovery.witness,
    withdrawnValue: 11n,
    context: 8n
  });
  pool.withdraw(withdrawalPackage, "0x000000000000000000000000000000000000dEaD");

  const secondRecovery = recoverNotesFromEvents({
    seed,
    appId,
    events: events.scan(),
    maxNoteIndex: 4
  });

  assert.equal(secondRecovery.recovered.length, 1);
  assert.equal(secondRecovery.unspent.length, 0);
});
