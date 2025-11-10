/**
 * OpenAI Function Calling Example
 * Shows how to integrate Futarchy402 tools with OpenAI's function calling
 */

import OpenAI from 'openai';
import { OpenAIFutarchyAdapter } from '../src/adapters/openai/adapter.js';
import { Futarchy402Client } from '../src/core/client.js';

async function main() {
  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Initialize Futarchy402 adapter
  const futarchyAdapter = new OpenAIFutarchyAdapter(
    new Futarchy402Client({
      apiBaseUrl: process.env.FUTARCHY_API_URL,
    })
  );

  // Get tools in OpenAI format
  const tools = futarchyAdapter.getTools();

  console.log('Available tools:', tools.map((t) => t.function.name).join(', '));

  // Example conversation
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: 'Show me the currently open polls on Futarchy402',
    },
  ];

  // First API call - let the model decide to use tools
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    tools,
    tool_choice: 'auto',
  });

  const responseMessage = response.choices[0].message;
  messages.push(responseMessage);

  // Check if the model wants to call tools
  const toolCalls = responseMessage.tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    console.log('\nModel is calling tools...\n');

    // Execute each tool call
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const functionArgs = toolCall.function.arguments;

      console.log(`Calling ${functionName} with args:`, functionArgs);

      // Execute the function
      const functionResponse = await futarchyAdapter.executeFunction(functionName, functionArgs);

      console.log(`Result:`, functionResponse);

      // Add the function response to messages
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: functionResponse,
      });
    }

    // Second API call - get final response with function results
    const finalResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
    });

    console.log('\nFinal Response:');
    console.log(finalResponse.choices[0].message.content);
  } else {
    console.log('No tool calls needed.');
    console.log(responseMessage.content);
  }
}

main().catch(console.error);
