import { Agent } from "@openai/agents";

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
            You are a bike rental agent. You are responsible for renting bikes to customers.
            `,
    });
}