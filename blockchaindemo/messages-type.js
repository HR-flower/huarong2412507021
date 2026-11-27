const messageType = {
    RECEIVE_LATEST_BLOCK: 0, // 请求最新的区块
    REQUEST_LATEST_BLOCK: 1, // 响应最新的区块
    REQUEST_LATEST_BLOCKCHAIN: 2, // 请求整条链
    RECEIVE_LATEST_BLOCKCHAIN: 3, // 响应整条链
    HANDSHAKE: 4, // 握手消息
};
module.exports = messageType;
