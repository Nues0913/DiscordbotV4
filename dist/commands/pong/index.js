import { SlashCommandBuilder } from 'discord.js';
const data = new SlashCommandBuilder()
    .setName('pong')
    .setDescription('Replies with Ping!');
async function execute(interaction) {
    await interaction.reply('p!');
}
export { data, execute };
