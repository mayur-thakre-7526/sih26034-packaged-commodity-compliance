// verify-21st.mjs
// Verifies connection to 21st.dev MCP endpoint and lists all available tools.

const apiKey = process.argv[2] || process.env.API_KEY_21ST;

if (!apiKey) {
  console.log('\n❌ No API key provided.');
  console.log('\nUsage:');
  console.log('  node verify-21st.mjs <YOUR_21ST_API_KEY>');
  console.log('Or set the environment variable:');
  console.log('  $env:API_KEY_21ST="your-api-key" (PowerShell)');
  console.log('\nGet your free key at: https://21st.dev/mcp\n');
  process.exitCode = 1;
} else {
  const MCP_ENDPOINT = 'https://21st.dev/api/mcp';

  async function verify() {
    console.log(`Connecting to ${MCP_ENDPOINT} ...`);
    try {
      const res = await fetch(MCP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey.trim()
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {}
        })
      });

      const data = await res.json();

      if (data.error) {
        console.error('\n❌ Server returned an error:');
        console.error(JSON.stringify(data.error, null, 2));
        process.exitCode = 1;
        return;
      }

      const tools = data.result?.tools || [];
      console.log(`\n Connected successfully! Found ${tools.length} tool(s):\n`);

      for (const tool of tools) {
        console.log(`- ${tool.name}: ${tool.description || '(No description)'}`);
      }
    } catch (err) {
      console.error('\n❌ Request failed:', err.message);
      process.exitCode = 1;
    }
  }

  verify();
}
