export class DisposableCache {
  constructor() {
    this.items = new Map();
  }

  put(key, value) {
    this.items.set(key, JSON.stringify(value));
  }

  get(key) {
    const value = this.items.get(key);
    return value ? JSON.parse(value) : undefined;
  }

  clear() {
    this.items.clear();
  }

  size() {
    return this.items.size;
  }
}

