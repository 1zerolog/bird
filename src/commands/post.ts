import type { Command } from 'commander';
import type { CliContext, MediaSpec } from '../cli/shared.js';
import { formatTweetUrlLine } from '../lib/output.js';
import { TwitterClient } from '../lib/twitter-client.js';

async function uploadMediaOrExit(
  client: TwitterClient,
  media: MediaSpec[],
  ctx: CliContext,
): Promise<string[] | undefined> {
  if (media.length === 0) {
    return undefined;
  }

  const uploaded: string[] = [];
  for (const item of media) {
    const res = await client.uploadMedia({ data: item.buffer, mimeType: item.mime, alt: item.alt });
    if (!res.success || !res.mediaId) {
      console.error(`${ctx.p('err')}Medya yüklemesi başarısız: ${res.error ?? 'Bilinmeyen hata'}`);
      process.exit(1);
    }
    uploaded.push(res.mediaId);
  }
  return uploaded;
}

export function registerPostCommands(program: Command, ctx: CliContext): void {
  program
    .command('tweet')
    .description('Yeni bir tweet gönder')
    .argument('<metin>', 'Tweet metni')
    .action(async (text: string) => {
      const opts = program.opts();
      const timeoutMs = ctx.resolveTimeoutFromOptions(opts);
      const quoteDepth = ctx.resolveQuoteDepthFromOptions(opts);
      let media: MediaSpec[] = [];
      try {
        media = ctx.loadMedia({ media: opts.media ?? [], alts: opts.alt ?? [] });
      } catch (error) {
        console.error(`${ctx.p('err')}${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }

      const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

      for (const warning of warnings) {
        console.error(`${ctx.p('warn')}${warning}`);
      }

      if (!cookies.authToken || !cookies.ct0) {
        console.error(`${ctx.p('err')}Missing required credentials`);
        process.exit(1);
      }

      if (cookies.source) {
        console.error(`${ctx.l('source')}${cookies.source}`);
      }

      const client = new TwitterClient({ cookies, timeoutMs, quoteDepth });
      const mediaIds = await uploadMediaOrExit(client, media, ctx);
      const result = await client.tweet(text, mediaIds);

      if (result.success) {
        console.log(`${ctx.p('ok')}Tweet başarıyla gönderildi!`);
        console.log(formatTweetUrlLine(result.tweetId, ctx.getOutput()));
      } else {
        console.error(`${ctx.p('err')}Tweet gönderilemedi: ${result.error}`);
        process.exit(1);
      }
    });

  program
    .command('reply')
    .description('Mevcut bir tweete yanıt ver')
    .argument('<tweet-id-veya-url>', 'Yanıtlanacak tweet ID veya URL')
    .argument('<metin>', 'Yanıt metni')
    .action(async (tweetIdOrUrl: string, text: string) => {
      const opts = program.opts();
      const timeoutMs = ctx.resolveTimeoutFromOptions(opts);
      const quoteDepth = ctx.resolveQuoteDepthFromOptions(opts);
      let media: MediaSpec[] = [];
      try {
        media = ctx.loadMedia({ media: opts.media ?? [], alts: opts.alt ?? [] });
      } catch (error) {
        console.error(`${ctx.p('err')}${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
      const tweetId = ctx.extractTweetId(tweetIdOrUrl);

      const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

      for (const warning of warnings) {
        console.error(`${ctx.p('warn')}${warning}`);
      }

      if (!cookies.authToken || !cookies.ct0) {
        console.error(`${ctx.p('err')}Missing required credentials`);
        process.exit(1);
      }

      if (cookies.source) {
        console.error(`${ctx.l('source')}${cookies.source}`);
      }

      console.error(`${ctx.p('info')}Tweete yanıt veriliyor: ${tweetId}`);

      const client = new TwitterClient({ cookies, timeoutMs, quoteDepth });
      const mediaIds = await uploadMediaOrExit(client, media, ctx);
      const result = await client.reply(text, tweetId, mediaIds);

      if (result.success) {
        console.log(`${ctx.p('ok')}Yanıt başarıyla gönderildi!`);
        console.log(formatTweetUrlLine(result.tweetId, ctx.getOutput()));
      } else {
        console.error(`${ctx.p('err')}Yanıt gönderilemedi: ${result.error}`);
        process.exit(1);
      }
    });
}
