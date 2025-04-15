const axios = require('axios');

const KASPAD_RPC_URL = 'http://127.0.0.1:18110';

async function callKaspaRpc(method, params = []) {
  const res = await axios.post(KASPAD_RPC_URL, {
    jsonrpc: "2.0",
    id: "krc20-client",
    method,
    params
  });
  return res.data.result;
}

module.exports = {
  callKaspaRpc
};

