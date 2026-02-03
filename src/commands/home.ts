import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { TwitterClient } from '../lib/twitter-client.js';

export function registerHomeCommand(program: Command, ctx: CliContext): void {
  program
    .command('anasayfa')
    .description('Ana zaman akışını getir')
    .option('-n, --count <sayı>', 'Getirilecek tweet sayısı', '20')
    .option('--following', 'Takip ettiklerinin akışını (kronolojik) getir, "For You" yerine')
    .option('--json', 'JSON olarak çıktı ver')
    .option('--json-full', 'Ham API yanıtı ile birlikte JSON olarak çıktı ver (_raw alanında)')
    .action(async (cmdOpts: { count?: string; following?: boolean; json?: boolean; jsonFull?: boolean }) => {
      const opts = program.opts();
      const timeoutMs = ctx.resolveTimeoutFromOptions(opts);
      const count = Number.parseInt(cmdOpts.count || '20', 10);

      const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

      for (const warning of warnings) {
        console.error(`${ctx.p('warn')}${warning}`);
      }

      if (!cookies.authToken || !cookies.ct0) {
        console.error(`${ctx.p('err')}Gerekli kimlik bilgileri eksik`);
        process.exit(1);
      }

      if (!Number.isFinite(count) || count <= 0) {
        console.error(`${ctx.p('err')}Geçersiz --count. Pozitif bir tam sayı bekleniyor.`);
        process.exit(1);
      }

      const client = new TwitterClient({ cookies, timeoutMs });
      const includeRaw = cmdOpts.jsonFull ?? false;

      const result = cmdOpts.following
        ? await client.getHomeLatestTimeline(count, { includeRaw })
        : await client.getHomeTimeline(count, { includeRaw });

      if (result.success) {
        const feedType = cmdOpts.following ? 'Takip Edilenler' : 'Sana Özel';
        const emptyMessage = `Ana akışta tweet bulunamadı.`;
        const isJson = Boolean(cmdOpts.json || cmdOpts.jsonFull);
        ctx.printTweets(result.tweets, { json: isJson, emptyMessage });
      } else {
        console.error(`${ctx.p('err')}Zaman akışı getirilemedi: ${result.error}`);
        process.exit(1);
      }
    });
}
