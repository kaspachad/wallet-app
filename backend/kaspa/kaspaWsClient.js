const WebSocket = require('ws');

let idCounter = 1;

function callKaspaWsRpc(method, params = []) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://127.0.0.1:18110');
    const id = idCounter++;

    const payload = {
      jsonrpc: "2.0",
      id,
      method,
      params
    };

    ws.on('open', () => {
      console.log('⬆️ Sending:', JSON.stringify(payload, null, 2));
      ws.send(JSON.stringify(payload));
    });

    ws.on('message', (data) => {
      try {
        const res = JSON.parse(data.toString());
        if (res.id === id && res.result) {
          resolve(res.result);
          ws.close();
        } else if (res.id === id && res.error) {
          reject(new Error(res.error.message || 'RPC error'));
          ws.close();
        }
      } catch (err) {
        reject(new Error('JSON parse error: ' + err.message));
        ws.close();
      }
    });

    ws.on('error', (err) => {
      reject(new Error('WebSocket error: ' + err.message));
    });
  });
}

// 🔥 Custom version using your known-good format
function getUtxosViaWS(address) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://127.0.0.1:18110');

    ws.on('open', () => {
      const utxoRequest = {
        id: 1,
        method: 'getUtxosByAddresses',
        params: { addresses: [address] }
      };
      ws.send(JSON.stringify(utxoRequest));
    });

    ws.on('message', (data) => {
      try {
        const res = JSON.parse(data.toString());

        if (res.error) {
          reject(new Error(res.error.message));
          ws.close();
        }

        if (res.id === 1 && res.params?.entries) {
          resolve(res.params.entries);
          ws.close();
        }
      } catch (err) {
        reject(new Error('UTXO JSON parse error: ' + err.message));
        ws.close();
      }
    });

    ws.on('error', (err) => {
      reject(new Error('UTXO WebSocket error: ' + err.message));
    });
  });
}

module.exports = {
  callKaspaWsRpc,
  getUtxosViaWS
};

