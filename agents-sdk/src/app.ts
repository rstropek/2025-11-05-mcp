import { MCPServerStdio, Runner } from '@openai/agents';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import readline from 'node:readline';
import { createBikeRentalAgent } from './agents/bike-rental.js';
import type { ParsedResponseStreamEvent } from 'openai/lib/responses/EventTypes.js';
import chalk from 'chalk';
import { createOrchestratorAgent } from './agents/orchestrator.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRestaurantAgent } from './agents/restaurant.js';
dotenv.config();

const rl = readline.promises.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const client = new OpenAI();
const { id: conversationId } = await client.conversations.create({});

const runner = new Runner({
    workflowName: `Hotel_AI_${new Date().toISOString().replace(/[:.]/g, '-')}`,
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const samplesDir = path.join(__dirname, 'menu');
const mcpServer = new MCPServerStdio({
    name: 'Filesystem MCP Server',
    fullCommand: `npx -y @modelcontextprotocol/server-filesystem ${samplesDir}`,
});
await mcpServer.connect();

const bikeRentalAgent = createBikeRentalAgent();
const restaurantAgent = createRestaurantAgent(mcpServer);
const orchestratorAgent = createOrchestratorAgent(bikeRentalAgent, restaurantAgent);
let currentAgent = orchestratorAgent;
bikeRentalAgent.handoffs.push(orchestratorAgent);
restaurantAgent.handoffs.push(orchestratorAgent);

while (true) {
    const command = await rl.question('You (quit to exit)> ');
    if (command.toLowerCase() === 'quit') { break; }

    const result = await runner.run(currentAgent, command, {
        stream: true,
        conversationId,
    });

    for await (const event of result) {
        if (event.type === 'raw_model_stream_event') {
            if (event.data.type === 'model') {
                const ev = event.data.event as ParsedResponseStreamEvent;
                switch (ev.type) {
                    case 'response.output_text.delta':
                        process.stdout.write(ev.delta);
                        break;
                    case 'response.output_text.done':
                        console.log('\n');
                        break;
                    case 'response.output_item.done':
                        const item = ev.item;
                        if (item.type === 'function_call') {
                            console.log(`${chalk.bgGreen.white(item.name)} (${JSON.stringify(item.arguments)})`);
                        }
                        break;
                    default:
                        break;
                }
            }
        }
    }

    currentAgent = result.lastAgent ?? orchestratorAgent;
}

await mcpServer.close();
rl.close();
