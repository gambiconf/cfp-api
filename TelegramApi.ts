import { Telegraf } from 'telegraf';
import { Submission } from './types';

export async function sendTelegramMessage(message: string): Promise<void> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) {
        throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables must be set');
    }
    const bot = new Telegraf(botToken);
    await bot.telegram.sendMessage(chatId, message);
}

export const createNewSubmissionMessage = (submission: Submission): string => {
    return `
        🚀 *Nova Submissão Recebida!* 🎉

        👤 *Palestrante*: ${submission.speakerName}
        🐦 *Twitter*: ${submission.twitterHandler || 'Não informado'}
        📚 *Tipo*: ${submission.type === 'talk' ? 'Palestra' : 'Workshop'}
        🌐 *Idioma*: ${
          submission.language === 'only_portuguese'
        ? 'Português'
        : submission.language === 'only_english'
        ? 'Inglês'
        : 'Português ou Inglês'
        }
        📝 *Título*: ${submission.title}
        📖 *Descrição*: ${submission.description}
        ⏱️ *Duração*: ${submission.duration ? `${submission.duration} minutos` : 'Não especificado'}
        📜 *Bio do Palestrante*: ${submission.speakerBio}
        🔗 *Redes Sociais*: ${submission.speakerSocialMedias}
        ✉️ *E-mail*: ${submission.speakerEmail}
        🗒️ *Notas*: ${submission.notes || 'Nenhuma'}

        🎯 *ID da Submissão*: ${submission.id}
        `;
      };

export const createUpdatedSubmissionMessage = (submission: Submission): string => {
        return `
            🔄 *Submissão Atualizada!* 🔄
    
            👤 *Palestrante*: ${submission.speakerName}
            🐦 *Twitter*: ${submission.twitterHandler || 'Não informado'}
            📚 *Tipo*: ${submission.type === 'talk' ? 'Palestra' : 'Workshop'}
            🌐 *Idioma*: ${
              submission.language === 'only_portuguese'
            ? 'Português'
            : submission.language === 'only_english'
            ? 'Inglês'
            : 'Português ou Inglês'
            }
            📝 *Título*: ${submission.title}
            📖 *Descrição*: ${submission.description}
            ⏱️ *Duração*: ${submission.duration ? `${submission.duration} minutos` : 'Não especificado'}
            📜 *Bio do Palestrante*: ${submission.speakerBio}
            🔗 *Redes Sociais*: ${submission.speakerSocialMedias}
            ✉️ *E-mail*: ${submission.speakerEmail}
            🗒️ *Notas*: ${submission.notes || 'Nenhuma'}
    
            🎯 *ID da Submissão*: ${submission.id}
            `;
          };