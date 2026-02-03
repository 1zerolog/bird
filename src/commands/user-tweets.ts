import type { Command } from 'commander';
import { parseNonNegativeIntFlag, parsePositiveIntFlag } from '../cli/pagination.js';
import type { CliContext } from '../cli/shared.js';
import { normalizeHandle } from '../lib/normalize-handle.js';
import { TwitterClient } from '../lib/twitter-client.js';

export function registerUserTweetsCommand(program: Command, ctx: CliContext): void {
  const formatExample = (cmd: string, desc: string): string =>
    `  ${ctx.colors.command(cmd)}\n    ${ctx.colors.muted(desc)}`;

  program
    .command('user-tweets')
    .description('Bir kullanıcının profil zaman akışından tweetleri getir')
    .argument('<kullanıcı_adı>', 'Tweetleri getirilecek kullanıcı adı (örn. @steipete veya steipete)')
    .option('-n, --count <sayı>', 'Getirilecek tweet sayısı', '20')
    .option('--max-pages <sayı>', 'N sayfadan sonra dur (maks: 10)')
    .option('--delay <ms>', 'Sayfa getirmeleri arasında bekleme süresi (ms)', '1000')
    .option('--cursor <string>', 'Sayfalandırmayı bir imleçten devam ettir')
    .option('--json', 'JSON olarak çıktı ver')
    .option('--json-full', 'Ham API yanıtı ile birlikte JSON olarak çıktı ver')
    .addHelpText(
      'after',
      () =>
        `\n${ctx.colors.section('Komut Örnekleri')}\n${[
          formatExample('bird user-tweets @steipete', 'Bir kullanıcının son tweetlerini getir'),
          formatExample('bird user-tweets steipete -n 10', '10 tweet getir (@ isteğe bağlı)'),
          formatExample('bird user-tweets @steipete -n 50', '50 tweet getir (sayfallı)'),
          formatExample('bird user-tweets @steipete --max-pages 3 -n 200', 'Güvenlik sınırı (maks 3 sayfa)'),
          formatExample('bird user-tweets @steipete --json', 'JSON olarak çıktı ver'),
          formatExample('bird user-tweets @steipete --cursor "DAABCg..."', 'İmleçten devam et'),
        ].join('\n')}`,
    )
    .action(
      async (
        handle: string,
        cmdOpts: {
          count?: string;
          maxPages?: string;
          delay?: string;
          cursor?: string;
          json?: boolean;
          jsonFull?: boolean;
        },
      ) => {
        const opts = program.opts();
        const timeoutMs = ctx.resolveTimeoutFromOptions(opts);
        const quoteDepth = ctx.resolveQuoteDepthFromOptions(opts);
        const count = Number.parseInt(cmdOpts.count || '20', 10);

        const maxPagesParsed = parsePositiveIntFlag(cmdOpts.maxPages, '--max-pages');
        if (!maxPagesParsed.ok) {
          console.error(`${ctx.p('err')}${maxPagesParsed.error}`);
          process.exit(2);
        }
        const maxPages = maxPagesParsed.value;

        const delayParsed = parseNonNegativeIntFlag(cmdOpts.delay, '--delay', 1000);
        if (!delayParsed.ok) {
          console.error(`${ctx.p('err')}${delayParsed.error}`);
          process.exit(2);
        }
        const pageDelayMs = delayParsed.value;

        // Validate inputs
        if (!Number.isFinite(count) || count <= 0) {
          console.error(`${ctx.p('err')}Geçersiz --count. Pozitif bir tam sayı bekleniyor.`);
          process.exit(2);
        }
        const pageSize = 20;
        const hardMaxPages = 10;
        const hardMaxTweets = pageSize * hardMaxPages;
        if (count > hardMaxTweets) {
          console.error(
            `${ctx.p('err')}Geçersiz --count. Çalışma başına maks ${hardMaxTweets} tweet (güvenlik sınırı: ${hardMaxPages} sayfa). Devam etmek için --cursor kullanın.`,
          );
          process.exit(2);
        }
        if (maxPages !== undefined && maxPages > hardMaxPages) {
          console.error(`${ctx.p('err')}Geçersiz --max-pages. Pozitif bir tam sayı bekleniyor (maks: ${hardMaxPages}).`);
          process.exit(2);
        }

        // Normalize handle (strip @ if present)
        const username = normalizeHandle(handle);
        if (!username) {
          console.error(`${ctx.p('err')}Geçersiz kullanıcı adı: ${handle}`);
          process.exit(2);
        }

        const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

        for (const warning of warnings) {
          console.error(`${ctx.p('warn')}${warning}`);
        }

        if (!cookies.authToken || !cookies.ct0) {
          console.error(`${ctx.p('err')}Gerekli kimlik bilgileri eksik`);
          process.exit(1);
        }

        const client = new TwitterClient({ cookies, timeoutMs, quoteDepth });

        // Look up user ID from username
        console.error(`${ctx.p('info')}@${username} aranıyor...`);
        const userLookup = await client.getUserIdByUsername(username);
        if (!userLookup.success || !userLookup.userId) {
          console.error(`${ctx.p('err')}${userLookup.error || `@${username} kullanıcısı bulunamadı`}`);
          process.exit(1);
        }

        const displayName = userLookup.name
          ? `${userLookup.name} (@${userLookup.username})`
          : `@${userLookup.username}`;
        console.error(`${ctx.p('info')}${displayName} için tweetler getiriliyor...`);

        const includeRaw = cmdOpts.jsonFull ?? false;
        const wantsPaginationOutput = Boolean(cmdOpts.cursor) || maxPages !== undefined || count > pageSize;
        const result = await client.getUserTweetsPaged(userLookup.userId, count, {
          includeRaw,
          maxPages,
          cursor: cmdOpts.cursor,
          pageDelayMs,
        });

        if (result.success) {
          const isJson = Boolean(cmdOpts.json || cmdOpts.jsonFull);
          ctx.printTweetsResult(result, {
            json: isJson,
            usePagination: wantsPaginationOutput,
            emptyMessage: `@${username} için tweet bulunamadı.`,
          });

          // Show pagination hint if there's more
          if (result.nextCursor && !cmdOpts.json && !cmdOpts.jsonFull) {
            console.error(`${ctx.p('info')}Daha fazla tweet mevcut. Devam etmek için --cursor "${result.nextCursor}" kullanın.`);
          }
        } else {
          console.error(`${ctx.p('err')}Tweetler getirilemedi: ${result.error}`);
          process.exit(1);
        }
      },
    );
}
