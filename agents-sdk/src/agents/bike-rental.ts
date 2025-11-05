import { Agent } from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import { getAvailableBikesTool, rentBikeTool, returnBikeTool } from "../tools/bikes.js";

export function createBikeRentalAgent(): Agent {
    return new Agent({
        name: 'Bike Rental Agent',
        model: 'gpt-5',
        modelSettings: {
            providerData: {
                reasoning: { effort: 'minimal' },
            }
        },
        instructions:
            `
            ${RECOMMENDED_PROMPT_PREFIX}

            You provide assistance with bike rentals at a hotel. 

            You can get available bikes, rent a bike and return a bike using the provided tools.

            Only assist with bike rentals. Do not offer additional services, even if they are 
            related to bike rentals (e.g. renting accessories).
            `,
        tools: [rentBikeTool, getAvailableBikesTool, returnBikeTool],
    });
}