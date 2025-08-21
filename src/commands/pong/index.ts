import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

const data = new SlashCommandBuilder()
.setName('pong')
.setDescription('Replies with Ping!');

async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.reply('p!');
}

export { data, execute };