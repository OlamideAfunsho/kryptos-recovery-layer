export class ReviveEventLog {
  constructor() {
    this.events = [];
  }

  append(event) {
    const enriched = {
      blockNumber: this.events.length + 1,
      logIndex: this.events.length,
      ...event
    };
    this.events.push(enriched);
    return enriched;
  }

  scan({ fromBlock = 0 } = {}) {
    return this.events.filter((event) => event.blockNumber >= fromBlock);
  }
}

