#!/usr/bin/env node

import { DisposableCache } from "./cache.js";
import { createRecoverySeed, toHex } from "./crypto.js";
import { ReviveEventLog } from "./events.js";
import { deriveNote, publicNoteView } from "./note.js";
import { LocalShieldedPool } from "./pool.js";
import {
  KusamaShieldSdkProofAdapter,
  LocalGroth16FixtureAdapter
} from "./proof-adapter.js";
import { recoverNotesFromEvents } from "./recovery.js";
import { ReviveScanner } from "./scanner.js";

function printStep(title) {
  console.log(`\n${title}`);
}

export async function runDemo({ useSdkProof = false } = {}) {
  const appId = "kusama-shield-v7-local-proof";
  const seed = createRecoverySeed();
  const eventLog = new ReviveEventLog();
  const pool = new LocalShieldedPool({ eventLog, appId });
  const cache = new DisposableCache();
  const scanner = new ReviveScanner({ source: eventLog });
  const proofAdapter = new LocalGroth16FixtureAdapter();
  const sdkProofAdapter = new KusamaShieldSdkProofAdapter();

  console.log("KryptOS Recovery Layer demo");
  console.log(`Recovery seed: ${seed}`);

  printStep("1. Deposit privately");
  const note = deriveNote(seed, {
    appId,
    index: 0,
    value: 10_000_000_000n,
    asset: 0n
  });
  const deposit = pool.deposit(note);
  cache.put("last-note", publicNoteView(note));
  console.log(`commitment: ${toHex(deposit.commitment)}`);
  console.log(`leaf index: ${deposit.leafIndex}`);

  printStep("2. Delete disposable local cache");
  cache.clear();
  console.log(`cache entries after delete: ${cache.size()}`);

  printStep("3. Restore only the recovery seed");
  const scannedEvents = scanner.scanPoolEvents({ appId });
  const recovery = recoverNotesFromEvents({
    seed,
    appId,
    events: scannedEvents,
    maxNoteIndex: 8
  });
  console.log(`scanned events: ${scannedEvents.length}`);
  console.log(`recovered notes: ${recovery.recovered.length}`);
  console.log(`unspent notes: ${recovery.unspent.length}`);

  printStep("4. Reconstruct Merkle witness");
  const recovered = recovery.unspent[0];
  console.log(`root: ${toHex(recovered.witness.root)}`);
  console.log(`path length: ${recovered.witness.siblings.length}`);

  printStep("5. Generate withdrawal proof package");
  const withdrawalPackage = pool.createWithdrawalPackage({
    note: recovered.note,
    witness: recovered.witness,
    withdrawnValue: recovered.note.value,
    context: 42n
  });
  console.log(`nullifier hash: ${toHex(withdrawalPackage.publicSignals.existingNullifierHash)}`);
  const generatedProof = proofAdapter.generate(withdrawalPackage);
  console.log(`proof adapter: ${generatedProof.adapter}`);
  console.log(`public signals: ${generatedProof.publicSignalNames.join(", ")}`);

  let sdkProof;
  if (useSdkProof) {
    printStep("5b. Generate real SDK Groth16 proof");
    sdkProof = await sdkProofAdapter.generate(withdrawalPackage);
    console.log(`sdk adapter: ${sdkProof.adapter}`);
    console.log(`sdk public signals: ${sdkProof.publicSignals.length}`);
  }

  printStep("6. Withdraw successfully");
  const result = pool.withdraw(withdrawalPackage, "0x000000000000000000000000000000000000dEaD");
  console.log(`status: ${result.status}`);

  return { seed, note, deposit, recovery, withdrawalPackage, generatedProof, sdkProof, result };
}

const command = process.argv[2] ?? "help";
const isCliEntry = process.argv[1]?.endsWith("cli.js");

if (isCliEntry) {
  if (command === "demo") {
    runDemo({ useSdkProof: process.argv.includes("--sdk-proof") })
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      });
  } else {
    console.log("Usage: kryptos-recover demo [--sdk-proof]");
    process.exit(command === "help" ? 0 : 1);
  }
}
