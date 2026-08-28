export class ReviveScanner {
  constructor({ source }) {
    this.source = source;
  }

  scanPoolEvents({ appId, fromBlock = 0 } = {}) {
    return this.source
      .scan({ fromBlock })
      .filter((event) => !appId || event.appId === appId)
      .map((event) => ({
        blockNumber: event.blockNumber,
        logIndex: event.logIndex,
        type: event.type,
        appId: event.appId,
        commitment: event.commitment,
        nullifierHash: event.nullifierHash,
        leafIndex: event.leafIndex,
        asset: event.asset,
        value: event.value
      }));
  }
}

