import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const data = new SlashCommandBuilder()
    .setName('copyessay')
    .setDescription('隨機獲取一則複製文')
    .addBooleanOption(option => option.setName('silent').setDescription('僅自己可見'));
async function execute(interaction) {
    const randomEssay = await prisma.copyessay.findFirst({
        orderBy: { id: 'asc' },
        skip: Math.floor(Math.random() * await prisma.copyessay.count())
    });
    const silent = interaction.options.getBoolean('silent');
    if (silent && randomEssay) {
        await interaction.reply({ content: randomEssay.content, flags: MessageFlags.Ephemeral });
    }
    else if (randomEssay) {
        await interaction.reply(randomEssay.content);
    }
    else {
        await interaction.reply({ content: "資料庫中尚無複製文", flags: MessageFlags.Ephemeral });
    }
    // await interaction.reply({ embeds: [embed] , flags: "Ephemeral" });
}
export { data, execute };
