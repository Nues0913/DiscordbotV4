import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import logger from '../../lib/logger.js';

const prisma = new PrismaClient();

const data = new SlashCommandBuilder()
    .setName('copyessay')
    .setDescription('隨機獲取一則複製文')
   .addBooleanOption(option => option.setName('silent').setDescription('僅自己可見'));

async function execute(interaction: ChatInputCommandInteraction) {
    const randomEssay = await prisma.copyessay.findFirst({
        orderBy: { id: 'asc' },
        skip: Math.floor(Math.random() * await prisma.copyessay.count())
    });
    const silent = interaction.options.getBoolean('silent') || false;
    if (silent && randomEssay) {
        await interaction.reply({content: randomEssay.content, flags: MessageFlags.Ephemeral});
    } else if (randomEssay) {
        await interaction.reply(randomEssay.content);
    } else {
        await interaction.reply({content: "資料庫中尚無複製文", flags: MessageFlags.Ephemeral});
    }
    logger.info(`excute copyessay, fetch essay: ${randomEssay?.id}, user: ${interaction.user.tag}, silent: ${silent}`);
    // await interaction.reply({ embeds: [embed] , flags: "Ephemeral" });
}

export { data, execute };
