const Block = require("./Block");

class Blockchain {
    constructor() {
        this.difficulty = 3;
        this.chain = [Block.genesis];
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    get latestBlock() {
        return this.getLatestBlock();
    }

    isValidHashDifficulty(hash) {
        return hash.startsWith("0".repeat(this.difficulty));
    }

    calculateHash(index, previousHash, timestamp, data, nonce) {
        const crypto = require("crypto");
        return crypto.createHash("sha256")
            .update(index + previousHash + timestamp + data + nonce)
            .digest("hex");
    }

    mine(data) {
        const prevBlock = this.getLatestBlock();
        const index = prevBlock.index + 1;
        let timestamp = Date.now();
        let nonce = 0;
        let hash = this.calculateHash(index, prevBlock.hash, timestamp, data, nonce);

        while (!this.isValidHashDifficulty(hash)) {
            nonce++;
            timestamp = Date.now();
            hash = this.calculateHash(index, prevBlock.hash, timestamp, data, nonce);
        }

        const newBlock = new Block(index, prevBlock.hash, timestamp, data, hash, nonce);
        this.chain.push(newBlock);
        return newBlock;
    }

    get() {
        return this.chain;
    }
// 老师截图用的：校验单个后继区块
isValidNextBlock(nextBlock, previousBlock) {
    if (nextBlock.index !== previousBlock.index + 1) return false;
    if (nextBlock.previousHash !== previousBlock.hash) return false;
    if (this.calculateHash(nextBlock.index, nextBlock.previousHash, nextBlock.timestamp, nextBlock.data, nextBlock.nonce) !== nextBlock.hash) return false;
    if (!this.isValidHashDifficulty(nextBlock.hash)) return false;
    return true;
}

    addBlock(block) {
        if (!this.isValidNextBlock(block, this.latestBlock)) {
            throw new Error("无效的新区块");
        }
        this.chain.push(block);
        return block;
    }

    replaceChain(chain) {
        if (chain.length <= this.chain.length) {
            return false;
        }
        if (!this.isValidChain(chain)) {
            throw new Error("无效的区块链");
        }
        this.chain = chain;
        return true;
    }

    isValidChain(chain = this.chain) {
        if (!Array.isArray(chain) || chain.length === 0) {
            return false;
        }
        for (let i = 1; i < chain.length; i++) {
            const curr = chain[i];
            const prev = chain[i - 1];
            if (curr.previousHash !== prev.hash) return false;
            if (curr.hash !== this.calculateHash(curr.index, curr.previousHash, curr.timestamp, curr.data, curr.nonce)) return false;
            if (!this.isValidHashDifficulty(curr.hash)) return false;
        }
        return true;
    }
}

module.exports = Blockchain;
