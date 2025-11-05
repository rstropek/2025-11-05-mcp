import { Runner } from '@openai/agents';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import readline from 'node:readline';
import { createBikeRentalAgent } from './agents/bike-rental.js';
import type { ParsedResponseStreamEvent } from 'openai/lib/responses/EventTypes.js';
import chalk from 'chalk';
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

const bikeRentalAgent = createBikeRentalAgent();

while (true) {
    const command = await rl.question('You (quit to exit)> ');
    if (command.toLowerCase() === 'quit') { break; }

    const result = await runner.run(bikeRentalAgent, command, {
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
}

rl.close();
