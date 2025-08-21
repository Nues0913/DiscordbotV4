import dotenv from 'dotenv';
import fg from 'fast-glob';
import { Client, Events, Collection, GatewayIntentBits, REST, Routes } from 'discord.js';
dotenv.config();
const TOKEN = process.env.TOKEN || "";
const CLIENT_ID = process.env.CLIENT_ID || "";
const GUILD_ID = process.env.GUILD_ID || "";
const TESTER_ID = process.env.TESTER_ID || "";
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});
client.commands = new Collection();
let commands = [];
(async () => {
    const files = await fg('src/commands/**/*.ts', {
        absolute: true, onlyFiles: true,
        ignore: ['**/*.d.ts']
    });
    for (const file of files) {
        const command = await import(file);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
            // console.log(`found ${command.data.name} command.`);
        }
    }
    (async (commands) => {
        try {
            const rest = new REST({ version: '10' }).setToken(TOKEN);
            console.log('Started refreshing application (/) commands.');
            const data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        }
        catch (error) {
            console.error(error);
        }
    })(commands);
})();
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
        return;
    }
    const command = interaction.client.commands.get(interaction.commandName);
    console.log(`command matching ${interaction.commandId} was found.`);
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }
    try {
        await command.execute(interaction);
    }
    catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', flags: "Ephemeral" });
        }
        else {
            await interaction.reply({ content: 'There was an error while executing this command!', flags: "Ephemeral" });
        }
    }
});
// reload command
client.on(Events.MessageCreate, async (message) => {
    if (message.content === '!reload' && message.author.id === TESTER_ID) {
        try {
            const files = await fg('src/commands/**/*.ts', {
                absolute: true, onlyFiles: true,
                ignore: ['**/*.d.ts']
            });
            client.commands.clear();
            commands = [];
            for (const file of files) {
                const command = await import(`${file}?update=${Date.now()}`); // https://futurestud.io/tutorials/node-js-esm-bypass-cache-for-dynamic-imports
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    commands.push(command.data.toJSON());
                }
            }
            const rest = new REST({ version: '10' }).setToken(TOKEN);
            await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
            console.log(`${commands.length} Commands reloaded by ${message.author.tag}.`);
            await message.reply(`${commands.length} Commands reloaded successfully.`); // Ephemeral responses are only available for interaction responses
        }
        catch (error) {
            console.error(error);
            message.reply('There was an error while reloading commands.');
        }
    }
});
client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});
// Log in to Discord with your client's token
client.login(TOKEN);
