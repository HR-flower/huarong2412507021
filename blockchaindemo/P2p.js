const net = require('net'); // 引入 Node.js 的网络模块，用于创建 TCP 连接
const messageType = require('./messages-type.js'); // 引入消息类型
const Messages = require('./messages.js'); // 引入消息模块
const {
    REQUEST_LATEST_BLOCK,
    RECEIVE_LATEST_BLOCK,
    REQUEST_LATEST_BLOCKCHAIN,
    RECEIVE_LATEST_BLOCKCHAIN,
    HANDSHAKE
} = messageType;
class PeerToPeer {
    // 构造函数，初始化 P2P 网络
    constructor(blockchain) {
        this.peers = []; // 存储已连接的节点
        this.blockchain = blockchain; // 引用区块链实例
        this.serverPort = null; // 存储本节点的监听端口
        this.server = null; // 存储 TCP 服务实例
    }
    // 启动服务器监听指定端口
    startServer(port) {
        this.serverPort = port;
        this.server = net.createServer((socket) => {
            this.initConnection(socket);
        }).listen(port, () => {
            console.log('+++++++++++', `P2P 服务已启动，监听端口: ${port}`);
        });
    }
    // 发现对等节点功能（当前版本通过启动参数或 connect 指定）
    discoverPeers() {
        console.log('发现对等节点请通过启动参数 --peers 或 connect 命令指定');
    }
    // 连接到指定的对等节点
    connectToPeer(host, port) {
        const mubiaoDuankou = Number(port);
        if (!host || !Number.isInteger(mubiaoDuankou) || mubiaoDuankou <= 0) {
            throw new Error('无效的节点地址或端口');
        }
        // 避免重复连接到同一个目标节点
        const yijingLianjie = this.peers.find((peer) => {
            return peer.peerInfo?.host === host && Number(peer.peerInfo?.port) === mubiaoDuankou;
        });
        if (yijingLianjie) {
            console.log('----------', `节点 ${host}:${mubiaoDuankou} 已连接，跳过重复连接`);
            return;
        }
        const socket = net.connect(mubiaoDuankou, host, () => {
            console.log('+++++++++++', `已连接到邻居节点 ${host}:${mubiaoDuankou}`);
            socket.targetHost = host;
            socket.targetPort = mubiaoDuankou;
            this.initConnection(socket);
        });
        socket.on('error', (err) => {
            console.log('=-=-=-=-=-=', `连接邻居节点 ${host}:${mubiaoDuankou} 失败:`, err.message);
        });
    }
    // 关闭所有连接
    closeConnection() {
        this.peers.forEach((peer) => {
            try {
                peer.end();
            } catch (err) {
                console.log('=-=-=-=-=-=', `关闭连接出错: ${err.message}`);
            }
        });
        this.peers = [];
        console.log('----------', '所有 P2P 连接已关闭');
    }
    // 广播最新区块
    broadcastLatest() {
        this.broadcast(Messages.sendLatestBlock(this.blockchain.latestBlock));
    }
    // 主动向已连接节点请求同步（本地链异常时直接请求整链，正常时请求最新块对比）
    syncWithPeers() {
        if (this.peers.length === 0) {
            return false;
        }
        if (!this.blockchain.isValidChain()) {
            this.broadcast(Messages.getBlockchain());
        } else {
            this.broadcast(Messages.getLatestBlock());
        }
        return true;
    }
    // 向所有连接的节点广播消息
    broadcast(message) {
        this.peers.forEach((peer) => {
            this.write(peer, message);
        });
    }
    // 向指定节点发送消息，使用换行符作为消息边界（NDJSON）
    write(peer, message) {
        if (!peer || peer.destroyed || !peer.writable) {
            return;
        }
        peer.write(JSON.stringify(message) + '\n');
    }
    // 初始化新连接
    initConnection(connection) {
        const yicunzai = this.peers.find((peer) => {
            return peer.remoteAddress === connection.remoteAddress && peer.remotePort === connection.remotePort;
        });
        if (yicunzai) {
            return;
        }
        connection.peerInfo = {
            host: connection.targetHost || connection.remoteAddress,
            port: connection.targetPort || connection.remotePort,
            connectedAt: new Date()
        };
        this.peers.push(connection);
        this.initMessageHandler(connection);
        this.initErrorHandler(connection);
        // 如果本节点已经启动了服务器，发送握手消息告知对方自己的监听端口
        if (this.serverPort) {
            this.write(connection, Messages.sendHandshake(this.serverPort));
        }
        this.write(connection, Messages.getLatestBlock());
    }
    // 初始化消息处理器（按换行符拆包）
    initMessageHandler(connection) {
        let huancun = ''; // 用于处理 TCP 粘包的数据缓冲区
        connection.on('data', (shuju) => {
            huancun += shuju.toString('utf8');
            const xiaoxiLiebiao = huancun.split('\n');
            // 最后一项可能是不完整的半包，留回缓冲区等待下一次数据
            huancun = xiaoxiLiebiao.pop();
            for (let i = 0; i < xiaoxiLiebiao.length; i++) {
                const hangWenben = xiaoxiLiebiao[i].trim();
                if (!hangWenben) {
                    continue;
                }
                try {
                    const xiaoxi = JSON.parse(hangWenben);
                    this.handleMessage(connection, xiaoxi);
                } catch (err) {
                    console.log('=-=-=-=-=-=', '解析 P2P 消息失败:', err.stack);
                }
            }
        });
    }
    // 初始化错误与断开处理器
    initErrorHandler(connection) {
        connection.on('error', (err) => {
            console.log('=-=-=-=-=-=', `P2P 连接异常: ${err.message}`);
            this.peers = this.peers.filter((peer) => peer !== connection);
        });
        connection.on('close', () => {
            const jiedianBiaoshi = `${connection.peerInfo?.host || connection.remoteAddress}:${connection.peerInfo?.port || connection.remotePort}`;
            console.log('----------', `P2P 连接断开: ${jiedianBiaoshi}`);
            this.peers = this.peers.filter((peer) => peer !== connection);
        });
    }
    // 处理接收到的消息
    handleMessage(peer, message) {
        if(!message) return;
        switch (message.type) {
            case HANDSHAKE:
                if (message.data && message.data.port) {
                    peer.peerInfo.port = message.data.port;
                    console.log('+++++++++++', `收到握手信息，更新节点端口为 ${message.data.port}`);
                }
                break;
            case REQUEST_LATEST_BLOCK:
                this.write(peer, Messages.sendLatestBlock(this.blockchain.latestBlock));
                break;
            case REQUEST_LATEST_BLOCKCHAIN:
                this.write(peer, Messages.sendBlockchain(this.blockchain.get()));
                break;
            case RECEIVE_LATEST_BLOCK:
                this.handleReceivedLatestBlock(message, peer);
                break;
            case RECEIVE_LATEST_BLOCKCHAIN:
                this.handleReceivedBlockchain(message);
                break;
            default:
                console.log('=-=-=-=-=-=', '收到未知消息类型:', message.type);
        }
    }
    // 处理接收到的最新区块
    handleReceivedLatestBlock(message, peer) {
        if(!message || !message.data) return;
        const chuanruQukuai = message.data;
        const bendiZuixinQukuai = this.blockchain.latestBlock;
        if (!chuanruQukuai) {
            return;
        }
        const bendiLianYouxiao = this.blockchain.isValidChain();
        if (!bendiLianYouxiao) {
            console.log('----------', '检测到本地账本异常，向邻居请求整条区块链恢复');
            this.write(peer, Messages.getBlockchain());
            return;
        }
        if (chuanruQukuai.hash === bendiZuixinQukuai.hash) {
            return;
        }
        if (bendiZuixinQukuai.hash === chuanruQukuai.previousHash) {
            try {
                this.blockchain.addBlock(chuanruQukuai);
            } catch (err) {
                console.log('=-=-=-=-=-=', '同步追加区块失败:', err.message);
            }
            return;
        }
        if (chuanruQukuai.index >= bendiZuixinQukuai.index) {
            console.log('----------', '检测到链状态差异，向邻居请求整条区块链同步');
            this.write(peer, Messages.getBlockchain());
        }
    }
    // 处理接收到的整个区块链
    handleReceivedBlockchain(message) {
        if(!message || !message.data) return;
        const chuanruLian = message.data;
        if (!Array.isArray(chuanruLian) || chuanruLian.length === 0) {
            return;
        }
        try {
            const shifouTihuan = this.blockchain.replaceChain(chuanruLian);
            if (!shifouTihuan) {
                console.log('----------', '收到的区块链不比本地更长，保持当前链不变');
            }
        } catch (err) {
            console.log('=-=-=-=-=-=', '拒绝无效的外部区块链:', err.message);
        }
    }
}
module.exports = PeerToPeer;
