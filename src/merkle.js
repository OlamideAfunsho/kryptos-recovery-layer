import { fieldHash } from "./crypto.js";

export class LeanMerkleTree {
  constructor(leaves = []) {
    this.leaves = leaves.map(BigInt);
  }

  insert(leaf) {
    this.leaves.push(BigInt(leaf));
    return this.leaves.length - 1;
  }

  root() {
    if (this.leaves.length === 0) {
      return 0n;
    }

    let level = [...this.leaves];
    while (level.length > 1) {
      const next = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] ?? 0n;
        next.push(right === 0n ? left : fieldHash([left, right]));
      }
      level = next;
    }
    return level[0];
  }

  witness(index) {
    if (index < 0 || index >= this.leaves.length) {
      throw new Error(`leaf index ${index} is outside the tree`);
    }

    const siblings = [];
    const pathBits = [];
    let cursor = index;
    let level = [...this.leaves];

    while (level.length > 1) {
      const isRight = cursor % 2 === 1;
      const siblingIndex = isRight ? cursor - 1 : cursor + 1;
      siblings.push(level[siblingIndex] ?? 0n);
      pathBits.push(isRight ? 1 : 0);

      const next = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] ?? 0n;
        next.push(right === 0n ? left : fieldHash([left, right]));
      }

      cursor = Math.floor(cursor / 2);
      level = next;
    }

    return {
      leaf: this.leaves[index],
      leafIndex: index,
      siblings,
      pathBits,
      root: this.root(),
      treeDepth: siblings.length
    };
  }
}

export function verifyWitness({ leaf, siblings, pathBits, root }) {
  let node = BigInt(leaf);
  for (let i = 0; i < siblings.length; i += 1) {
    const sibling = BigInt(siblings[i]);
    if (sibling === 0n) {
      continue;
    }
    node = pathBits[i] === 1 ? fieldHash([sibling, node]) : fieldHash([node, sibling]);
  }
  return node === BigInt(root);
}

