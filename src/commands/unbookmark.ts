import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { TwitterClient } from '../lib/twitter-client.js';

export function registerUnbookmarkCommand(program: Command, ctx: CliContext): void {
  program
    .command('yerimi-kaldir')
    .description('Yer imlerinden tweetleri kaldır')
    .argument('<tweet-ids...>', 'Kaldırılacak tweet ID veya URL\'leri')
    .action(async (tweetIdOrUrls: string[]) => {
      const opts = program.opts();
      const timeoutMs = ctx.resolveTimeoutFromOptions(opts);

      const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

      for (const warning of warnings) {
        console.error(`${ctx.p('warn')}${warning}`);
      }

      if (!cookies.authToken || !cookies.ct0) {
        console.error(`${ctx.p('err')}Gerekli kimlik bilgileri eksik`);
        process.exit(1);
      }

      const client = new TwitterClient({ cookies, timeoutMs });
      let failures = 0;

      for (const input of tweetIdOrUrls) {
        const tweetId = ctx.extractTweetId(input);
        const result = await client.unbookmark(tweetId);
        if (result.success) {
          console.log(`${ctx.p('ok')}${tweetId} yer imlerinden kaldırıldı`);
        } else {
          failures += 1;
          console.error(`${ctx.p('err')}${tweetId} kaldırılamadı: ${result.error}`);
        }
      }

      if (failures > 0) {
        process.exit(1);
      }
    });
}
