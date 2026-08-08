import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { add, remove, getAll, count } from '../../lib/db.js';
import logger from '../../lib/logger.js';

const data = new SlashCommandBuilder()
    .setName('copymanager')
    .setDescription('管理複製文資料庫')
    .addSubcommand(sub =>
        sub.setName('add')
            .setDescription('新增一則複製文')
            .addStringOption(opt => opt.setName('title').setDescription('標題').setRequired(true))
            .addStringOption(opt => opt.setName('content').setDescription('內容').setRequired(true))
    )
    .addSubcommand(sub =>
        sub.setName('delete')
            .setDescription('刪除一則複製文')
            .addIntegerOption(opt => opt.setName('id').setDescription('複製文 ID').setRequired(true))
    )
    .addSubcommand(sub =>
        sub.setName('list')
            .setDescription('列出所有複製文')
    );

async function execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
        const title = interaction.options.getString('title', true);
        const content = interaction.options.getString('content', true);
        const entry = await add(title, content);
        await interaction.reply({
            content: `已新增複製文 #${entry.id}：**${entry.title}**`,
            flags: MessageFlags.Ephemeral
        });
        logger.info(`copymanager add id=${entry.id} title="${entry.title}" by ${interaction.user.tag}`);

    } else if (sub === 'delete') {
        const id = interaction.options.getInteger('id', true);
        const ok = await remove(id);
        await interaction.reply({
            content: ok ? `已刪除複製文 #${id}` : `找不到 ID 為 ${id} 的複製文`,
            flags: MessageFlags.Ephemeral
        });
        logger.info(`copymanager delete id=${id} ok=${ok} by ${interaction.user.tag}`);

    } else if (sub === 'list') {
        const essays = await getAll();
        if (essays.length === 0) {
            await interaction.reply({ content: '目前沒有任何複製文', flags: MessageFlags.Ephemeral });
            return;
        }
        const lines = essays.map(e => `**#${e.id}** ${e.title || '(無標題)'} — ${e.content.slice(0, 40)}${e.content.length > 40 ? '…' : ''}`);
        // Discord message limit: 2000 chars; chunk if needed
        const chunks: string[] = [];
        let current = '';
        for (const line of lines) {
            if (current.length + line.length + 1 > 1900) {
                chunks.push(current);
                current = line;
            } else {
                current += (current ? '\n' : '') + line;
            }
        }
        if (current) chunks.push(current);

        await interaction.reply({ content: `共 ${essays.length} 則複製文：\n${chunks[0]}`, flags: MessageFlags.Ephemeral });
        for (let i = 1; i < chunks.length; i++) {
            await interaction.followUp({ content: chunks[i], flags: MessageFlags.Ephemeral });
        }
        logger.info(`copymanager list count=${essays.length} by ${interaction.user.tag}`);
    }
}

export { data, execute };
