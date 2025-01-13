import Discord, { EmbedBuilder } from 'discord.js';
import { Command } from '../core/types';
import GuildModel from '../models/guild';
import Util from '../core/util';

const command: Command = {
    cmd: 'warns',
    applicationCommand: {
        global: true
    },
    category: 'info',
    shortDesc: 'List warned players',
    desc: 'List warned players',
    args: [
        { name: '[dump]', desc: 'Pass dump as argument to display dump all warns.', required: false }
    ],
    defaults: [
        {
            type: 'string', name: 'show_issuer', desc: 'Display issuers as well in warns',
            value: 'true', possibleValues: ['true', 'false']
        }
    ],
    global: true,
    perms: false,
    exec: async (bot, message, params, defaults, interaction) => {
        const guild = interaction ? interaction.guild : message.guild;

        const guildSettings = bot.getGuild(guild.id);
        const displayIssuers = defaults[0] === 'true';

        const warnedPlayers = [];
        const issuers = [];
        const times = [];
        const reasons = [];

        // add dump param to flush all warns
        let dump = false;

        if (params.length > 0) {
            if (params[0].toLowerCase() !== 'dump') {
                return await Util.send(message ? message : interaction, 'error', 'did you mean dump?');
            }
            else {
                dump = true;
            }
        }

        const warns = await GuildModel.getWarns(BigInt(guild.id), 11);

        if (!warns.length) {
            return Util.send(message ? message : interaction, 'info', 'no warns found');
        }

        warns.sort((a, b) => {
            if (a.warned_at > b.warned_at) {
                return -1;
            } else if (a.warned_at < b.warned_at) {
                return 1;
            } else {
                return 0;
            }
        });

        warns.forEach((warn) => {

            const timeDif = (warn.warned_at.getTime() + guildSettings.warnExpiration) - new Date().getTime();
            const issuer = warn.issuer;

            let reason = warn.reason;

            if (reason && reason.length > 45) {
                reason = reason.substring(0, 45) + '...';
            }

            warnedPlayers.push(`${warn.warnid} - ${Util.removeMarkdown(warn.player)}${displayIssuers ? '\n' : ''}`);
            times.push(`${Util.formatTime(timeDif)}${displayIssuers ? '\n' : ''}`);
            issuers.push(Util.removeMarkdown(issuer));
            reasons.push(reason ? reason : '-');
        });

        let fieldDataComplete = [];

        if (displayIssuers) {
            const issuerReasonColumn = issuers.map((issuer, idx) => `${issuer}\n${reasons[idx]}`);

            fieldDataComplete = [
                { name: 'Warn id / Player', value: warnedPlayers.join('\n'), inline: true },
                { name: 'Time left', value: times.join('\n'), inline: true },
                { name: 'Issuer / Reason', value: issuerReasonColumn.join('\n'), inline: true }
            ]
        } else {
            fieldDataComplete = [
                { name: 'Warn id / Player', value: warnedPlayers.join('\n'), inline: true },
                { name: 'Time left', value: times.join('\n'), inline: true },
                { name: 'Reason', value: reasons.join('\n'), inline: true }
            ]
        }

        const botAvatarUrl = guild.client.user.avatarURL();

        let fieldData;
        if (dump) {
            fieldData = fieldDataComplete;
            // make fieldDataComplete a nested arry of 10 elements.
            const fieldDataNested = [];
            for (let i = 0; i < fieldDataComplete.length; i += 10) {
                fieldDataNested.push(fieldDataComplete.slice(i, i + 10));
            }
            let flushedEmbeds: EmbedBuilder[] = [];
            for (const fd of fieldDataNested) {
                const warnsCardEmbed = new EmbedBuilder()
                    .setColor('#126e82')
                    .setTitle('Warned players')
                    .addFields(fd)
                    .setFooter({ text: `Limited to 10 warns${warns.length > 10 ? ', one or more active warns not displayed' : ''}`, iconURL: botAvatarUrl });
                flushedEmbeds.push(warnsCardEmbed);
            }

            if (interaction) {
                interaction.reply({ embeds: flushedEmbeds });
            } else {
                message.channel.send({ embeds: flushedEmbeds });
            }
            return;
        }
        else {
            fieldData = fieldDataComplete.slice(0, 10);
            const warnsCardEmbed = new EmbedBuilder()
                .setColor('#126e82')
                .setTitle('Warned players')
                .addFields(fieldData)
                .setFooter({ text: `Limited to 10 warns${warns.length > 10 ? ', one or more active warns not displayed' : ''}`, iconURL: botAvatarUrl });

            if (interaction) {
                interaction.reply({ embeds: [warnsCardEmbed] });
            } else {
                message.channel.send({ embeds: [warnsCardEmbed] });
            }
            return;
        }
    }
}

module.exports = command;