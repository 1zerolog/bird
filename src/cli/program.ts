import { Command } from 'commander';
import { registerBookmarksCommand } from '../commands/bookmarks.js';
import { registerCheckCommand } from '../commands/check.js';
import { registerFollowCommands } from '../commands/follow.js';
import { registerHelpCommand } from '../commands/help.js';
import { registerHomeCommand } from '../commands/home.js';
import { registerListsCommand } from '../commands/lists.js';
import { registerNewsCommand } from '../commands/news.js';
import { registerPostCommands } from '../commands/post.js';
import { registerQueryIdsCommand } from '../commands/query-ids.js';
import { registerReadCommands } from '../commands/read.js';
import { registerSearchCommands } from '../commands/search.js';
import { registerUnbookmarkCommand } from '../commands/unbookmark.js';
import { registerUserTweetsCommand } from '../commands/user-tweets.js';
import { registerUserCommands } from '../commands/users.js';
import { getCliVersion } from '../lib/version.js';
import { type CliContext, collectCookieSource } from './shared.js';

export const KNOWN_COMMANDS = new Set([
  'tweet',
  'reply',
  'query-ids',
  'read',
  'replies',
  'thread',
  'search',
  'mentions',
  'bookmarks',
  'unbookmark',
  'follow',
  'unfollow',
  'following',
  'followers',
  'likes',
  'lists',
  'list-timeline',
  'home',
  'user-tweets',
  'news',
  'trending',
  'help',
  'whoami',
  'check',
]);

export function createProgram(ctx: CliContext): Command {
  const program: Command = new Command();

  program.configureHelp({
    showGlobalOptions: true,
    styleTitle: (t) => ctx.colors.section(t),
    styleUsage: (t) => ctx.colors.description(t),
    styleCommandText: (t) => ctx.colors.command(t),
    styleCommandDescription: (t) => ctx.colors.muted(t),
    styleOptionTerm: (t) => ctx.colors.option(t),
    styleOptionText: (t) => ctx.colors.option(t),
    styleOptionDescription: (t) => ctx.colors.muted(t),
    styleArgumentTerm: (t) => ctx.colors.argument(t),
    styleArgumentText: (t) => ctx.colors.argument(t),
    styleArgumentDescription: (t) => ctx.colors.muted(t),
    styleSubcommandTerm: (t) => ctx.colors.command(t),
    styleSubcommandText: (t) => ctx.colors.command(t),
    styleSubcommandDescription: (t) => ctx.colors.muted(t),
    styleDescriptionText: (t) => ctx.colors.muted(t),
  });

  const collect = (value: string, previous: string[] = []): string[] => {
    previous.push(value);
    return previous;
  };

  program.addHelpText(
    'beforeAll',
    () =>
      `${ctx.colors.banner('bird')} ${ctx.colors.muted(getCliVersion())} ${ctx.colors.subtitle(
        '— tweet atmak, yanıtlamak ve okumak için hızlı X CLI',
      )}`,
  );

  program.name('bird').description('Twitter/X GraphQL API üzerinden tweet ve yanıt gönder').version(getCliVersion());

  const formatExample = (command: string, description: string): string =>
    `${ctx.colors.command(`  ${command}`)}\n${ctx.colors.muted(`    ${description}`)}`;

  program.addHelpText(
    'afterAll',
    () =>
      `\n${ctx.colors.section('Örnekler')}\n${[
        formatExample('bird whoami', 'Oturum açılmış hesabı GraphQL çerezleriyle göster'),
        formatExample('bird --firefox-profile default-release whoami', 'Firefox profil çerezlerini kullan'),
        formatExample('bird tweet "bird\'dan merhaba"', 'Tweet gönder'),
        formatExample(
          'bird 1234567890123456789 --json',
          'Tweet oku (ID veya URL kısayolu `read` için) ve JSON olarak yazdır',
        ),
      ].join('\n\n')}\n\n${ctx.colors.section('Kısayollar')}\n${[
        formatExample('bird <tweet-id-veya-url> [--json]', '`bird read <tweet-id-veya-url>` için kısayol'),
      ].join('\n\n')}\n\n${ctx.colors.section('JSON Çıktısı')}\n${ctx.colors.muted(
        `  ${ctx.colors.option('--json')} ekle: read, replies, thread, search, mentions, bookmarks, likes, following, followers, about, lists, list-timeline, user-tweets, query-ids`,
      )}\n${ctx.colors.muted(
        `  ${ctx.colors.option('--json-full')} ekle: ham API yanıtını ${ctx.colors.argument('_raw')} alanına dahil et (sadece tweet komutları)`,
      )}\n${ctx.colors.muted(`  (${ctx.colors.command('bird <komut> --help')} çalıştırarak komut bayraklarını görün.)`)}`,
  );

  program.addHelpText(
    'afterAll',
    () =>
      `\n\n${ctx.colors.section('Yapılandırma')}\n${ctx.colors.muted(
        `  ${ctx.colors.argument('~/.config/bird/config.json5')} ve ${ctx.colors.argument('./.birdrc.json5')} (JSON5) okur`,
      )}\n${ctx.colors.muted(
        `  Desteklenen: chromeProfile, chromeProfileDir, firefoxProfile, cookieSource, cookieTimeoutMs, timeoutMs, quoteDepth`,
      )}\n\n${ctx.colors.section('Ortam Değişkenleri')}\n${ctx.colors.muted(
        `  ${ctx.colors.option('NO_COLOR')}, ${ctx.colors.option('BIRD_TIMEOUT_MS')}, ${ctx.colors.option('BIRD_COOKIE_TIMEOUT_MS')}, ${ctx.colors.option('BIRD_QUOTE_DEPTH')}`,
      )}`,
  );

  program
    .option('--auth-token <token>', 'Twitter auth_token çerezi')
    .option('--ct0 <token>', 'Twitter ct0 çerezi')
    .option('--chrome-profile <ad>', 'Cookie çıkarma için Chrome profil adı', ctx.config.chromeProfile)
    .option(
      '--chrome-profile-dir <yol>',
      'Cookie çıkarma için Chrome/Chromium profil dizini veya cookie DB yolu',
      ctx.config.chromeProfileDir,
    )
    .option('--firefox-profile <ad>', 'Cookie çıkarma için Firefox profil adı', ctx.config.firefoxProfile)
    .option('--cookie-timeout <ms>', 'Cookie çıkarma zaman aşımı (milisaniye, keychain/işletim sistemi yardımcıları)')
    .option('--cookie-source <kaynak>', 'Tarayıcı cookie çıkarma kaynağı (tekrarlanabilir)', collectCookieSource)
    .option('--media <yol>', 'Medya dosyası ekle (tekrarlanabilir, en fazla 4 resim veya 1 video)', collect)
    .option('--alt <metin>', 'İlgili --media için alt metin (tekrarlanabilir)', collect)
    .option('--timeout <ms>', 'İstek zaman aşımı (milisaniye)')
    .option('--quote-depth <derinlik>', 'Maksimum alıntı tweet derinliği (varsayılan: 1; 0 devre dışı bırakır)')
    .option('--plain', 'Düz çıktı (sabit, emoji yok, renk yok)')
    .option('--no-emoji', 'Emoji çıktısını devre dışı bırak')
    .option('--no-color', 'ANSI renklerini devre dışı bırak (veya NO_COLOR ayarla)');

  program.hook('preAction', (_thisCommand, actionCommand) => {
    ctx.applyOutputFromCommand(actionCommand);
  });

  registerHelpCommand(program, ctx);
  registerQueryIdsCommand(program, ctx);
  registerPostCommands(program, ctx);
  registerReadCommands(program, ctx);
  registerSearchCommands(program, ctx);
  registerBookmarksCommand(program, ctx);
  registerUnbookmarkCommand(program, ctx);
  registerFollowCommands(program, ctx);
  registerListsCommand(program, ctx);
  registerHomeCommand(program, ctx);
  registerUserCommands(program, ctx);
  registerUserTweetsCommand(program, ctx);
  registerNewsCommand(program, ctx);
  registerCheckCommand(program, ctx);

  return program;
}
