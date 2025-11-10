/**
 * Anthropic Claude Tool Use Example
 * Shows how to integrate Futarchy402 tools with Claude's tool use
 */

import Anthropic from '@anthropic-ai/sdk';
import { ClaudeFutarchyAdapter } from '../src/adapters/anthropic/adapter.js';
import { Futarchy402Client } from '../src/core/client.js';

async function main() {
  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Initialize Futarchy402 adapter
  const futarchyAdapter = new ClaudeFutarchyAdapter(
    new Futarchy402Client({
      apiBaseUrl: process.env.FUTARCHY_API_URL,
    })
  );

  // Get tools in Claude format
  const tools = futarchyAdapter.getTools();

  console.log('Available tools:', tools.map((t) => t.name).join(', '));

  // Example conversation
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: 'Show me the currently open polls on Futarchy402 and explain what they are about',
    },
  ];

  // First API call - let Claude decide to use tools
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages,
    tools,
  });

  console.log('\nInitial response:');
  console.log('Stop reason:', response.stop_reason);

  // Tool use loop
  while (response.stop_reason === 'tool_use') {
    console.log('\nClaude is using tools...\n');

    // Extract tool uses from response
    const toolUses = response.content.filter((block) => block.type === 'tool_use');

    // Build tool result content
    const toolResultsContent: Anthropic.MessageParam['content'] = [];

    // First add the assistant's response
    messages.push({
      role: 'assistant',
      content: response.content,
    });

    // Execute each tool
    for (const toolUse of toolUses) {
      if (toolUse.type === 'tool_use') {
        const { id, name, input } = toolUse;

        console.log(`Calling ${name} with input:`, JSON.stringify(input, null, 2));

        // Execute the tool
        const result = await futarchyAdapter.executeTool(name, input);

        console.log(`Result:`, JSON.stringify(result, null, 2));

        // Add tool result
        toolResultsContent.push({
          type: 'tool_result',
          tool_use_id: id,
          content: JSON.stringify(result),
        });
      }
    }

    // Add tool results to messages
    messages.push({
      role: 'user',
      content: toolResultsContent,
    });

    // Continue the conversation
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages,
      tools,
    });

    console.log('\nStop reason:', response.stop_reason);
  }

  // Extract final text response
  const finalText = response.content.find((block) => block.type === 'text');
  if (finalText && finalText.type === 'text') {
    console.log('\nFinal Response:');
    console.log(finalText.text);
  }
}

main().catch(console.error);
