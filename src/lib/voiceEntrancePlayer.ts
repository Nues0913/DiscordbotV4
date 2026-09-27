import {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    DiscordGatewayAdapterCreator,
    entersState,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnection,
    VoiceConnectionStatus
} from '@discordjs/voice';
import { Client, Events, VoiceBasedChannel } from 'discord.js';
import { existsSync, readdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import logger from './logger.js';

// 未設定 VOICE_CHANNEL_IDS 時使用的預設監聽頻道。
const DEFAULT_CHANNEL_IDS = [
    '1129866175514427506',
    '1129866175514427505',
    '1497652462914371674',
    '1463930158497923258',
    '1536416730786562148'
];
const DEFAULT_AUDIO_DIRECTORY = 'assets/songs';
const SUPPORTED_AUDIO_EXTENSIONS = new Set(['.webm', '.opus', '.ogg', '.m4a', '.mp3', '.wav']);

// 從指定歌曲目錄取得可播放的音檔；目錄不存在或沒有支援的檔案時回傳空陣列。
function findAudioFiles(): string[] {
    const configuredDirectory = process.env.VOICE_AUDIO_DIRECTORY?.trim();
    const audioDirectory = resolve(process.cwd(), configuredDirectory || DEFAULT_AUDIO_DIRECTORY);
    if (existsSync(audioDirectory)) {
        const files = readdirSync(audioDirectory, { withFileTypes: true })
            .filter(entry => entry.isFile() && SUPPORTED_AUDIO_EXTENSIONS.has(extname(entry.name).toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
            .map(entry => resolve(audioDirectory, entry.name));
        if (files.length > 0) {
            return files;
        }
    }

    return [];
}

export function registerVoiceEntrancePlayer(client: Client): void {
    // 環境變數可用逗號分隔多個語音頻道 ID。
    const configuredChannelIds = process.env.VOICE_CHANNEL_IDS
        ?.split(',')
        .map(id => id.trim())
        .filter(Boolean);
    const channelIds = new Set(configuredChannelIds?.length ? configuredChannelIds : DEFAULT_CHANNEL_IDS);
    let activeConnection: VoiceConnection | undefined;
    let playbackGeneration = 0;
    let playbackQueue = Promise.resolve();
    let lastAudioFile: string | undefined;

    // 集中管理斷線，避免保留已失效的連線參考。
    const disconnect = () => {
        const connection = activeConnection;
        activeConnection = undefined;
        if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
            connection.destroy();
        }
    };

    const restartPlayback = async (channel: VoiceBasedChannel, generation: number) => {
        // 此事件仍在佇列等待時若已有更新事件，直接略過，不建立多餘連線。
        if (generation !== playbackGeneration) {
            return;
        }

        // 新的進場事件會中止目前播放，並從頭開始新的播放流程。
        disconnect();

        const audioFiles = findAudioFiles();
        if (audioFiles.length === 0) {
            logger.error(
                'Voice entrance audio is missing. Set VOICE_AUDIO_DIRECTORY or add files to assets/songs.'
            );
            return;
        }
        // 依檔名排序循環播放；若清單有異動且找不到上一首，便從第一首重新開始。
        const lastAudioIndex = lastAudioFile ? audioFiles.indexOf(lastAudioFile) : -1;
        const audioFile = audioFiles[(lastAudioIndex + 1) % audioFiles.length];
        lastAudioFile = audioFile;

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });
        activeConnection = connection;
        connection.on('error', error => {
            if (activeConnection === connection) {
                logger.error(error);
                disconnect();
            }
        });

        try {
            // 等待語音連線準備完成，最長 20 秒。
            await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
        } catch (error) {
            // 新事件刻意取消舊連線時 entersState 會拒絕；這不是真正的播放錯誤。
            if (generation !== playbackGeneration || activeConnection !== connection) {
                return;
            }
            disconnect();
            throw error;
        }

        // 等待連線期間若又出現更新的進場事件，放棄這次已過期的播放。
        if (generation !== playbackGeneration || activeConnection !== connection) {
            connection.destroy();
            return;
        }

        const player = createAudioPlayer({
            behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
        });
        const resource = createAudioResource(audioFile);

        player.once(AudioPlayerStatus.Idle, () => {
            if (generation === playbackGeneration && activeConnection === connection) {
                disconnect();
                logger.info(`Entrance audio finished; left voice channel ${channel.id}.`);
            }
        });
        player.once('error', error => {
            if (generation === playbackGeneration && activeConnection === connection) {
                logger.error(error);
                disconnect();
            }
        });
        connection.on(VoiceConnectionStatus.Disconnected, () => {
            if (activeConnection === connection) {
                activeConnection = undefined;
                connection.destroy();
            }
        });

        connection.subscribe(player);
        player.play(resource);
        logger.info(`Playing ${audioFile} in voice channel ${channel.id}.`);
    };

    client.on(Events.VoiceStateUpdate, (oldState, newState) => {
        // 只處理真人成員「剛進入」目標頻道的事件。
        const joinedTargetChannel = newState.channelId !== null
            && channelIds.has(newState.channelId)
            && oldState.channelId !== newState.channelId;
        if (!joinedTargetChannel || newState.member?.user.bot) {
            return;
        }

        const channel = newState.channel;
        if (!channel) {
            return;
        }

        const generation = ++playbackGeneration;
        // 立即取消尚在連線或播放中的舊工作，避免快速切換時等待到逾時。
        disconnect();
        // 依序執行斷線與重新加入；generation 會淘汰短時間內產生的舊事件。
        playbackQueue = playbackQueue
            .catch(() => undefined)
            .then(() => restartPlayback(channel, generation))
            .catch(error => {
                logger.error(error);
            });
    });

    logger.info(`Monitoring voice channels ${[...channelIds].join(', ')} for member joins.`);
}
