/**
 * LangChain Integration Example
 * Shows how to use Futarchy402 tools with LangChain agents
 */

import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { LangChainFutarchyAdapter } from '../src/adapters/langchain/adapter.js';
import { Futarchy402Client } from '../src/core/client.js';

async function main() {
  // Initialize Futarchy402 adapter
  const futarchyAdapter = new LangChainFutarchyAdapter(
    new Futarchy402Client({
      apiBaseUrl: process.env.FUTARCHY_API_URL,
    })
  );

  // Get tools
  const tools = futarchyAdapter.getTools();

  console.log('Available tools:', tools.map((t) => t.name).join(', '));

  // Initialize LLM
  const llm = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Create prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a helpful assistant that can interact with the Futarchy402 governance platform. Use the available tools to answer questions about polls, voting, and positions.'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

  // Create agent
  const agent = await createToolCallingAgent({
    llm,
    tools,
    prompt,
  });

  // Create agent executor
  const agentExecutor = new AgentExecutor({
    agent,
    tools,
    verbose: true,
  });

  // Run the agent
  console.log('\nRunning agent...\n');

  const result = await agentExecutor.invoke({
    input: 'What are the currently open polls on Futarchy402? Give me a summary of each.',
  });

  console.log('\nFinal Result:');
  console.log(result.output);
}

main().catch(console.error);
