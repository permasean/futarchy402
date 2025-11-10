# Futarchy402 MCP Examples

This directory contains working examples for all supported platforms.

## Prerequisites

1. Build the project:
```bash
npm install
npm run build
```

2. Set up environment variables:
```bash
# For OpenAI examples
export OPENAI_API_KEY="your-key"

# For Anthropic examples
export ANTHROPIC_API_KEY="your-key"

# Optional: Custom API URL
export FUTARCHY_API_URL="https://futarchy402-api-385498168887.us-central1.run.app"
```

## Running Examples

### OpenAI Function Calling

```bash
node examples/openai-example.js
```

This example shows:
- How to get Futarchy402 tools in OpenAI format
- Using function calling to list polls
- Processing function results
- Multi-turn conversation with tool use

### Anthropic Claude Tool Use

```bash
node examples/anthropic-example.js
```

This example shows:
- How to get Futarchy402 tools in Claude format
- Claude's tool use loop pattern
- Processing multiple tool calls
- Extracting final responses

### MCP Server

The MCP server can be used with any MCP client (Claude Desktop, etc.).

1. Add to your MCP configuration file (e.g., `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "futarchy402": {
      "command": "node",
      "args": ["/absolute/path/to/futarchy402-mcp/dist/adapters/mcp/server.js"],
      "env": {
        "FUTARCHY_API_URL": "https://futarchy402-api-385498168887.us-central1.run.app"
      }
    }
  }
}
```

2. Restart Claude Desktop

3. The tools will be available automatically

See [mcp-config-example.json](./mcp-config-example.json) for reference.

### LangChain Agent

```bash
node examples/langchain-example.js
```

This example shows:
- Creating LangChain tools from Futarchy402 adapter
- Building a tool-calling agent
- Using AgentExecutor for autonomous tool use
- Verbose output for debugging

## Direct SDK Usage

You can also use the core SDK directly without adapters:

```typescript
import { Futarchy402Client, executeVote } from 'futarchy402-mcp';

// Create client
const client = new Futarchy402Client();

// List polls
const { polls } = await client.listPolls({ status: 'open' });

// Get poll details
const poll = await client.getPoll('poll-id');

// Vote (requires private key)
const result = await executeVote({
  pollId: 'poll-id',
  side: 'yes',
  walletPrivateKey: 'base58-encoded-key',
  slippage: 0.05,
});

console.log(result);
```

## Available Tools

All platforms expose these 5 tools:

1. **futarchy_list_polls** - List and filter governance polls
2. **futarchy_get_poll** - Get detailed poll information with votes
3. **futarchy_get_position** - Get wallet position and profit/loss projections
4. **futarchy_vote** - Execute a payment-gated vote using x402 protocol
5. **futarchy_get_stats** - Get platform-wide statistics

## Example Queries

Try asking the AI:

- "What polls are currently open?"
- "Show me details for poll [poll-id]"
- "What's my position in poll [poll-id]?"
- "Vote yes on poll [poll-id]" (requires wallet setup)
- "What are the platform statistics?"

## Security Notes

- **Never commit private keys** to version control
- Use environment variables for sensitive data
- The voting function requires a wallet private key and executes real transactions
- Test on devnet before using mainnet
- Always review transaction details before signing
