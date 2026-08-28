import { toHex } from "./crypto.js";

export const KUSAMA_SHIELD_V7_SIGNALS = [
  "newCommitmentHash",
  "existingNullifierHash",
  "contextHash",
  "withdrawnValue",
  "treeDepth",
  "context",
  "root",
  "asset"
];

export class LocalGroth16FixtureAdapter {
  constructor({ name = "local-groth16-fixture" } = {}) {
    this.name = name;
  }

  generate(withdrawalPackage) {
    const publicSignals = KUSAMA_SHIELD_V7_SIGNALS.map((key) =>
      withdrawalPackage.publicSignals[key].toString()
    );

    return {
      adapter: this.name,
      proof: {
        pi_a: ["1", "2"],
        pi_b: [
          ["3", "4"],
          ["5", "6"]
        ],
        pi_c: ["7", "8"]
      },
      publicSignals,
      publicSignalNames: KUSAMA_SHIELD_V7_SIGNALS,
      publicSignalsHex: Object.fromEntries(
        KUSAMA_SHIELD_V7_SIGNALS.map((key) => [key, toHex(withdrawalPackage.publicSignals[key])])
      ),
      verifiedLocally: withdrawalPackage.proof.validWitness
    };
  }
}

export class KusamaShieldSdkProofAdapter {
  constructor({ wasmPath, zkeyPath, zkpService } = {}) {
    this.wasmPath =
      wasmPath ?? "./node_modules/@kusamashield/shielded-transfers/dist/withdraw_phase2_fixed_v7.wasm";
    this.zkeyPath =
      zkeyPath ?? "./node_modules/@kusamashield/shielded-transfers/dist/withdraw_phase2_fixed_v7_0001.zkey";
    this.zkpService = zkpService;
  }

  toSdkInput(withdrawalPackage) {
    const { publicSignals, privateInputs } = withdrawalPackage;
    const siblings = privateInputs.siblings.map((sibling) => sibling.toString());
    while (siblings.length < 128) {
      siblings.push("0");
    }

    return {
      withdrawnValue: publicSignals.withdrawnValue.toString(),
      root: publicSignals.root.toString(),
      treeDepth: publicSignals.treeDepth.toString(),
      context: publicSignals.context.toString(),
      asset: publicSignals.asset.toString(),
      existingValue: privateInputs.existingValue.toString(),
      existingNullifier: privateInputs.existingNullifier.toString(),
      existingSecret: privateInputs.existingSecret.toString(),
      newNullifier: privateInputs.newNullifier.toString(),
      newSecret: privateInputs.newSecret.toString(),
      siblings,
      leafIndex: privateInputs.leafIndex.toString()
    };
  }

  async generate(withdrawalPackage) {
    const { ZKPService } = await import("@kusamashield/shielded-transfers");
    const service = this.zkpService ?? new ZKPService();
    const result = await service.generateV4WithdrawProof(
      this.toSdkInput(withdrawalPackage),
      this.wasmPath,
      this.zkeyPath
    );

    return {
      adapter: "kusama-shield-sdk-0.1.4",
      wasmPath: this.wasmPath,
      zkeyPath: this.zkeyPath,
      ...result
    };
  }
}
