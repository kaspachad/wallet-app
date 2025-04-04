const WebSocket = require('ws');

class KaspaClient {
  constructor(url = 'ws://127.0.0.1:18110', options = {}) {
    this.url = url;
    this.options = options;
    this.ws = null;
    this.requestId = 1;
    this.callbacks = {};
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.debug = options.debug || false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log(`📡 Attempting to connect to Kaspa node at ${this.url}...`);
      
      this.ws = new WebSocket(this.url);
      
      const connectionTimeout = setTimeout(() => {
        if (!this.connected) {
          this.ws.terminate();
          reject(new Error('Connection timeout'));
        }
      }, this.options.connectionTimeout || 10000);
      
      this.ws.on('open', () => {
        clearTimeout(connectionTimeout);
        this.connected = true;
        this.reconnectAttempts = 0;
        console.log(`✅ Connected to Kaspa node at ${this.url}`);
        
        // No automatic heartbeat until we confirm the API works
        resolve();
      });
      
      this.ws.on('message', (data) => {
        try {
          // Log raw message for debugging
          if (this.debug) {
            console.log('📥 Raw message received:', data.toString());
          }
          
          const response = JSON.parse(data);
          
          // Log all responses in debug mode
          if (this.debug) {
            console.log('📋 Parsed response:', JSON.stringify(response, null, 2));
          }
          
          if (response.id && this.callbacks[response.id]) {
            const { resolve, reject, method } = this.callbacks[response.id];
            
            if (response.error) {
              console.error(`❌ Error in response for ${method}:`, response.error);
              reject(new Error(response.error.message || 'Unknown error'));
            } else {
              resolve(response.result);
            }
            
            delete this.callbacks[response.id];
          } else {
            // Handle notifications (messages without an id)
            if (!response.id) {
              console.log('📣 Notification received:', response);
            } else if (!this.callbacks[response.id]) {
              console.log(`⚠️ Received response for unknown request ID: ${response.id}`);
            }
          }
        } catch (err) {
          console.error('❌ Error parsing response:', err, 'Raw data:', data.toString());
        }
      });
      
      this.ws.on('error', (error) => {
        console.error('💥 WebSocket error:', error.message || error);
        if (!this.connected) {
          clearTimeout(connectionTimeout);
          reject(error);
        }
      });
      
      this.ws.on('close', (code, reason) => {
        this.connected = false;
        console.log(`🔌 Disconnected from Kaspa node. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
        
        // Attempt to reconnect if not manually closed
        if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms...`);
          
          setTimeout(() => {
            this.connect().catch(error => {
              console.error('❌ Reconnect failed:', error.message);
            });
          }, this.reconnectDelay);
        }
      });
    });
  }
  
  call(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to Kaspa node'));
        return;
      }
      
      const id = this.requestId++;
      
      // Try two different request formats to handle potential API differences
      let request;
      
      // Format 1: Standard JSON-RPC 2.0
      if (this.options.useJsonRpc === true) {
        request = {
          jsonrpc: "2.0",
          id,
          method,
          params
        };
      } 
      // Format 2: Simple RPC (original format from your script)
      else {
        request = { 
          id, 
          method, 
          params 
        };
      }
      
      this.callbacks[id] = { resolve, reject, method };
      
      // Log the request in debug mode
      if (this.debug) {
        console.log(`📤 Sending request (${this.options.useJsonRpc ? 'JSON-RPC 2.0' : 'Simple RPC'}):`);
        console.log(JSON.stringify(request, null, 2));
      }
      
      try {
        this.ws.send(JSON.stringify(request));
      } catch (error) {
        delete this.callbacks[id];
        reject(error);
      }
      
      // Set timeout for this specific request
      setTimeout(() => {
        if (this.callbacks[id]) {
          delete this.callbacks[id];
          reject(new Error(`Request timeout for method ${method}`));
        }
      }, this.options.requestTimeout || 15000);
    });
  }
  
  // Test method to try various API endpoints that might work
  async testApiEndpoints() {
    console.log('🧪 Testing different API endpoints...');
    
    const testMethods = [
      'rpc.discover',           // Your original method
      'kaspa.discover',         // Alternative namespace
      'getBlockDagInfo',        // Common Kaspa method
      'getInfo',                // Fallback method
      'ping',                   // Simple ping
      'getVirtualSelectedParentBlueScore' // Another common method
    ];
    
    for (const method of testMethods) {
      try {
        console.log(`🔍 Testing method: ${method}`);
        const result = await this.call(method, {});
        console.log(`✅ Method ${method} succeeded:`, result);
        return { method, result };
      } catch (error) {
        console.log(`❌ Method ${method} failed:`, error.message);
      }
    }
    
    return { error: 'All test methods failed' };
  }
  
  // Helper methods for common Kaspa RPC calls
  async discover() {
    return this.call('rpc.discover');
  }
  
  async getBlockDagInfo() {
    return this.call('getBlockDagInfo');
  }
  
  async getVirtualSelectedParentBlueScore() {
    return this.call('getVirtualSelectedParentBlueScore');
  }
  
  async getBalance(address) {
    return this.call('getBalance', { address });
  }
  
  async ping() {
    return this.call('ping');
  }
  
  async close() {
    if (this.ws && this.connected) {
      this.ws.close(1000, 'Client requested disconnect');
      return new Promise(resolve => {
        this.ws.once('close', resolve);
      });
    }
  }
}

// Troubleshooting script
async function troubleshoot() {
  // Test with default simple RPC format
  console.log('🔍 Testing with simple RPC format...');
  await testWithOptions({
    debug: true,
    useJsonRpc: false,
    requestTimeout: 5000
  });
  
  // Test with JSON-RPC 2.0 format
  console.log('\n🔍 Testing with JSON-RPC 2.0 format...');
  await testWithOptions({
    debug: true,
    useJsonRpc: true,
    requestTimeout: 5000
  });
  
  // Test with kaspanet standard port (16110) instead of 18110
  console.log('\n🔍 Testing with standard Kaspa WebSocket port (16110)...');
  await testWithOptions({
    url: 'ws://127.0.0.1:16110',
    debug: true,
    requestTimeout: 5000
  });
}

async function testWithOptions(options) {
  const client = new KaspaClient(options.url || 'ws://127.0.0.1:18110', {
    connectionTimeout: 5000,
    requestTimeout: options.requestTimeout || 5000,
    maxReconnectAttempts: 1,
    reconnectDelay: 2000,
    debug: options.debug || false,
    useJsonRpc: options.useJsonRpc
  });

  try {
    await client.connect();
    await client.testApiEndpoints();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    try {
      await client.close();
    } catch (closeError) {
      // Ignore close errors
    }
  }
}

// Basic usage example
async function main() {
  // Get command line arguments - use 'debug' to enable debug mode, 'jsonrpc' to use JSON-RPC 2.0 format
  const args = process.argv.slice(2);
  const debug = args.includes('debug');
  const useJsonRpc = args.includes('jsonrpc');
  const port = args.find(arg => arg.startsWith('port='))?.split('=')[1] || '18110';
  
  console.log(`🔧 Running with options: debug=${debug}, jsonrpc=${useJsonRpc}, port=${port}`);
  
  const url = `ws://127.0.0.1:${port}`;
  const client = new KaspaClient(url, {
    connectionTimeout: 10000,
    requestTimeout: 15000,
    maxReconnectAttempts: 3,
    reconnectDelay: 5000,
    debug,
    useJsonRpc
  });

  try {
    await client.connect();
    
    // Try to discover available methods
    try {
      const discovery = await client.discover();
      console.log('✅ Available methods:');
      discovery.methods.forEach(m => {
        console.log(`• ${m.name}`);
      });
    } catch (error) {
      console.error('❌ Discovery failed:', error.message);
      // If discovery fails, try the test endpoints
      await client.testApiEndpoints();
    }
    
    // Close the connection when done
    await client.close();
    console.log('\n👋 Client closed successfully');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    try {
      await client.close();
    } catch (closeError) {
      // Ignore close errors
    }
  }
}

// Choose which mode to run
if (process.argv.includes('troubleshoot')) {
  troubleshoot();
} else {
  main();
}
