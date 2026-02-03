import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { normalizeHandle } from '../lib/normalize-handle.js';
import { TwitterClient } from '../lib/twitter-client.js';
import type { AboutAccountProfile, TwitterUser } from '../lib/twitter-client-types.js';

function formatAboutProfile(profile: AboutAccountProfile, ctx: CliContext, handle: string): string[] {
  const lines: string[] = [`${ctx.p('info')}@${handle} için hesap bilgisi:`];
  if (profile.accountBasedIn) {
    lines.push(`  Hesap konumu: ${profile.accountBasedIn}`);
  }
  if (profile.createdCountryAccurate !== undefined) {
    lines.push(`  Oluşturma ülkesi doğru: ${profile.createdCountryAccurate ? 'Evet' : 'Hayır'}`);
  }
  if (profile.locationAccurate !== undefined) {
    lines.push(`  Konum doğru: ${profile.locationAccurate ? 'Evet' : 'Hayır'}`);
  }
  if (profile.source) {
    lines.push(`${ctx.l('source')}${profile.source}`);
  }
  if (profile.learnMoreUrl) {
    lines.push(`  Daha fazla bilgi: ${profile.learnMoreUrl}`);
  }
  return lines;
}

type PagedUsersResult = {
  success: boolean;
  users?: TwitterUser[];
  nextCursor?: string;
  error?: string;
};

type UserListCommandOpts = {
  user?: string;
  count?: string;
  cursor?: string;
  all?: boolean;
  maxPages?: string;
  json?: boolean;
};

type UserListCommandSpec = {
  name: 'takipedilenler' | 'takipciler';
  description: string;
  fetch: (
    client: TwitterClient,
    userId: string,
    count: number,
    cursor: string | undefined,
  ) => Promise<PagedUsersResult>;
};

function printUsers(users: TwitterUser[], ctx: CliContext): void {
  for (const user of users) {
    console.log(`@${user.username} (${user.name})`);
    if (user.description) {
      console.log(`  ${user.description.slice(0, 100)}${user.description.length > 100 ? '...' : ''}`);
    }
    if (user.followersCount !== undefined) {
      console.log(`  ${ctx.p('info')}${user.followersCount.toLocaleString()} takipçi`);
    }
    console.log('──────────────────────────────────────────────────');
  }
}

async function resolveUserIdOrExit(
  client: TwitterClient,
  requestedUserId: string | undefined,
  ctx: CliContext,
): Promise<string> {
  if (requestedUserId) {
    return requestedUserId;
  }

  const currentUser = await client.getCurrentUser();
  if (!currentUser.success || !currentUser.user?.id) {
    console.error(`${ctx.p('err')}Geçerli kullanıcı alınamadı: ${currentUser.error || 'Bilinmeyen hata'}`);
    process.exit(1);
  }

  return currentUser.user.id;
}

async function runUserListCommand(
  program: Command,
  ctx: CliContext,
  spec: UserListCommandSpec,
  cmdOpts: UserListCommandOpts,
) {
  const opts = program.opts();
  const timeoutMs = ctx.resolveTimeoutFromOptions(opts);
  const count = Number.parseInt(cmdOpts.count || '20', 10);
  const maxPages = cmdOpts.maxPages ? Number.parseInt(cmdOpts.maxPages, 10) : undefined;

  const usePagination = cmdOpts.all || cmdOpts.cursor;
  if (maxPages !== undefined && !cmdOpts.all) {
    console.error(`${ctx.p('err')}--max-pages, --all gerektirir.`);
    process.exit(1);
  }
  if (maxPages !== undefined && (!Number.isFinite(maxPages) || maxPages <= 0)) {
    console.error(`${ctx.p('err')}Geçersiz --max-pages. Pozitif bir tam sayı bekleniyor.`);
    process.exit(1);
  }

  const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

  for (const warning of warnings) {
    console.error(`${ctx.p('warn')}${warning}`);
  }

  if (!cookies.authToken || !cookies.ct0) {
    console.error(`${ctx.p('err')}Gerekli kimlik bilgileri eksik`);
    process.exit(1);
  }

  const client = new TwitterClient({ cookies, timeoutMs });
  const userId = await resolveUserIdOrExit(client, cmdOpts.user, ctx);

  if (cmdOpts.all) {
    const allUsers: TwitterUser[] = [];
    const seen = new Set<string>();
    let cursor: string | undefined = cmdOpts.cursor;
    let pageNum = 0;
    let nextCursor: string | undefined;

    while (true) {
      pageNum += 1;
      if (!cmdOpts.json) {
        console.error(`${ctx.p('info')}Sayfa ${pageNum} getiriliyor...`);
      }

      const result = await spec.fetch(client, userId, count, cursor);

      if (!result.success || !result.users) {
        console.error(`${ctx.p('err')}${spec.name} getirilemedi: ${result.error}`);
        process.exit(1);
      }

      let added = 0;
      for (const user of result.users) {
        if (!seen.has(user.id)) {
          seen.add(user.id);
          allUsers.push(user);
          added += 1;
        }
      }

      const pageCursor = result.nextCursor;
      if (!pageCursor || result.users.length === 0 || added === 0 || pageCursor === cursor) {
        nextCursor = undefined;
        break;
      }

      if (maxPages && pageNum >= maxPages) {
        nextCursor = pageCursor;
        break;
      }

      cursor = pageCursor;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (cmdOpts.json) {
      console.log(JSON.stringify({ users: allUsers, nextCursor: nextCursor ?? null }, null, 2));
    } else {
      console.error(`${ctx.p('info')}Toplam: ${allUsers.length} kullanıcı`);
      if (nextCursor) {
        console.error(`${ctx.p('info')}--max-pages'de durduruldu. Devam etmek için --cursor kullanın.`);
        console.error(`${ctx.p('info')}Sonraki imleç: ${nextCursor}`);
      }
      printUsers(allUsers, ctx);
    }

    return;
  }

  const result = await spec.fetch(client, userId, count, cmdOpts.cursor);
  if (result.success && result.users) {
    if (cmdOpts.json) {
      if (usePagination) {
        console.log(JSON.stringify({ users: result.users, nextCursor: result.nextCursor ?? null }, null, 2));
      } else {
        console.log(JSON.stringify(result.users, null, 2));
      }
    } else {
      if (result.users.length === 0) {
        console.log('Kullanıcı bulunamadı.');
      } else {
        printUsers(result.users, ctx);
        if (result.nextCursor) {
          console.error(`${ctx.p('info')}Sonraki imleç: ${result.nextCursor}`);
        }
      }
    }
  } else {
    console.error(`${ctx.p('err')}${spec.name} getirilemedi: ${result.error}`);
    process.exit(1);
  }
}

export function registerUserCommands(program: Command, ctx: CliContext): void {
  const registerUserListCommand = (spec: UserListCommandSpec): void => {
    program
      .command(spec.name)
      .description(spec.description)
      .option('--user <userId>', `User ID to get ${spec.name} for (defaults to current user)`)
      .option('-n, --count <number>', 'Number of users to fetch per page', '20')
      .option('--cursor <cursor>', 'Cursor for pagination (from previous response)')
      .option('--all', 'Fetch all users (paginate automatically)')
      .option('--max-pages <number>', 'Stop after N pages when using --all')
      .option('--json', 'Output as JSON')
      .action(async (cmdOpts: UserListCommandOpts) => runUserListCommand(program, ctx, spec, cmdOpts));
  };

  registerUserListCommand({
    name: 'takipedilenler',
    description: 'Sizin (veya başka bir kullanıcının) takip ettiği kullanıcıları getir',
    fetch: (client, userId, count, cursor) => client.getFollowing(userId, count, cursor),
  });

  registerUserListCommand({
    name: 'takipciler',
    description: 'Sizi (veya başka bir kullanıcıyı) takip eden kullanıcıları getir',
    fetch: (client, userId, count, cursor) => client.getFollowers(userId, count, cursor),
  });

  program
    .command('begeniler')
    .description('Beğenilen tweetlerinizi getir')
    .option('-n, --count <sayı>', 'Getirilecek beğeni sayısı', '20')
    .option('--all', 'Tüm beğenileri getir (sayfallı)')
    .option('--max-pages <sayı>', '--all kullanırken N sayfadan sonra dur')
    .option('--cursor <string>', 'Sayfalandırmayı bir imleçten devam ettir')
    .option('--json', 'JSON olarak çıktı ver')
    .option('--json-full', 'Ham API yanıtı ile birlikte JSON olarak çıktı ver')
    .action(
      async (cmdOpts: {
        count?: string;
        json?: boolean;
        jsonFull?: boolean;
        all?: boolean;
        maxPages?: string;
        cursor?: string;
      }) => {
        const opts = program.opts();
        const timeoutMs = ctx.resolveTimeoutFromOptions(opts);
        const quoteDepth = ctx.resolveQuoteDepthFromOptions(opts);
        const count = Number.parseInt(cmdOpts.count || '20', 10);
        const maxPages = cmdOpts.maxPages ? Number.parseInt(cmdOpts.maxPages, 10) : undefined;

        const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

        for (const warning of warnings) {
          console.error(`${ctx.p('warn')}${warning}`);
        }

        if (!cookies.authToken || !cookies.ct0) {
          console.error(`${ctx.p('err')}Missing required credentials`);
          process.exit(1);
        }

        const usePagination = cmdOpts.all || cmdOpts.cursor;
        if (maxPages !== undefined && !usePagination) {
          console.error(`${ctx.p('err')}--max-pages, --all veya --cursor gerektirir.`);
          process.exit(1);
        }
        if (!usePagination && (!Number.isFinite(count) || count <= 0)) {
          console.error(`${ctx.p('err')}Geçersiz --count. Pozitif bir tam sayı bekleniyor.`);
          process.exit(1);
        }
        if (maxPages !== undefined && (!Number.isFinite(maxPages) || maxPages <= 0)) {
          console.error(`${ctx.p('err')}Geçersiz --max-pages. Pozitif bir tam sayı bekleniyor.`);
          process.exit(1);
        }

        const client = new TwitterClient({ cookies, timeoutMs, quoteDepth });
        const includeRaw = cmdOpts.jsonFull ?? false;
        const timelineOptions = { includeRaw };
        const paginationOptions = { includeRaw, maxPages, cursor: cmdOpts.cursor };
        const result = usePagination
          ? await client.getAllLikes(paginationOptions)
          : await client.getLikes(count, timelineOptions);

        if (result.success) {
          const isJson = Boolean(cmdOpts.json || cmdOpts.jsonFull);
          ctx.printTweetsResult(result, {
            json: isJson,
            usePagination: Boolean(usePagination),
            emptyMessage: 'Beğenilen tweet bulunamadı.',
          });
        } else {
          console.error(`${ctx.p('err')}Beğeniler getirilemedi: ${result.error}`);
          process.exit(1);
        }
      },
    );

  program
    .command('benkimim')
    .description('Geçerli kimlik bilgilerinin hangi Twitter hesabına ait olduğunu göster')
    .action(async () => {
      const opts = program.opts();
      const timeoutMs = ctx.resolveTimeoutFromOptions(opts);
      const quoteDepth = ctx.resolveQuoteDepthFromOptions(opts);

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
      const result = await client.getCurrentUser();

      const credentialSource = cookies.source ?? 'env/auto-detected cookies';

      if (result.success && result.user) {
        console.log(`${ctx.l('user')}@${result.user.username} (${result.user.name})`);
        console.log(`${ctx.l('userId')}${result.user.id}`);
        console.log(`${ctx.l('engine')}graphql`);
        console.log(`${ctx.l('credentials')}${credentialSource}`);
      } else {
        console.error(`${ctx.p('err')}Geçerli kullanıcı belirlenemedi: ${result.error ?? 'Bilinmeyen hata'}`);
        process.exit(1);
      }
    });

  program
    .command('hakkinda')
    .description('Bir kullanıcı için hesap kaynağı ve konum bilgisi al')
    .argument('<kullanıcı_adı>', 'Twitter kullanıcı adı (@ ile veya @ olmadan)')
    .option('--json', 'JSON olarak çıktı ver')
    .action(async (username: string, cmdOpts: { json?: boolean }) => {
      const opts = program.opts();
      const timeoutMs = ctx.resolveTimeoutFromOptions(opts);
      const normalizedHandle = normalizeHandle(username);

      if (!normalizedHandle) {
        console.error(`${ctx.p('err')}Geçersiz kullanıcı adı: ${username}`);
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

      const client = new TwitterClient({ cookies, timeoutMs });
      const result = await client.getUserAboutAccount(normalizedHandle);

      if (result.success && result.aboutProfile) {
        if (cmdOpts.json) {
          console.log(JSON.stringify(result.aboutProfile, null, 2));
        } else {
          for (const line of formatAboutProfile(result.aboutProfile, ctx, normalizedHandle)) {
            console.log(line);
          }
        }
      } else {
        console.error(`${ctx.p('err')}Hesap bilgisi getirilemedi: ${result.error ?? 'Bilinmeyen hata'}`);
        process.exit(1);
      }
    });
}
