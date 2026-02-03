import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { normalizeHandle } from '../lib/normalize-handle.js';
import { TwitterClient } from '../lib/twitter-client.js';

const ONLY_DIGITS_REGEX = /^\d+$/;

async function resolveUserId(
  client: TwitterClient,
  usernameOrId: string,
  ctx: CliContext,
): Promise<{ userId: string; username?: string } | null> {
  const raw = usernameOrId.trim();
  const isNumeric = ONLY_DIGITS_REGEX.test(raw);

  // Otherwise, treat as username and look up
  const handle = normalizeHandle(raw);
  if (handle) {
    const lookup = await client.getUserIdByUsername(handle);
    if (lookup.success && lookup.userId) {
      return { userId: lookup.userId, username: lookup.username };
    }
    if (!isNumeric) {
      console.error(`${ctx.p('err')}@${handle} kullanıcısı bulunamadı: ${lookup.error ?? 'Bilinmeyen hata'}`);
      return null;
    }
  }

  if (isNumeric) {
    return { userId: raw };
  }

  console.error(`${ctx.p('err')}Geçersiz kullanıcı adı: ${usernameOrId}`);
  return null;
}

export function registerFollowCommands(program: Command, ctx: CliContext): void {
  program
    .command('takipet')
    .description('Bir kullanıcıyı takip et')
    .argument('<kullanıcı-adı-veya-id>', 'Takip edilecek kullanıcı adı (@ ile veya olmadan) veya kullanıcı ID')
    .action(async (usernameOrId: string) => {
      const opts = program.opts();
      const timeoutMs = ctx.resolveTimeoutFromOptions(opts);

      const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

      for (const warning of warnings) {
        console.error(`${ctx.p('warn')}${warning}`);
      }

      if (!cookies.authToken || !cookies.ct0) {
        console.error(`${ctx.p('err')}Missing required credentials`);
        process.exit(1);
      }

      const client = new TwitterClient({ cookies, timeoutMs });

      const resolved = await resolveUserId(client, usernameOrId, ctx);
      if (!resolved) {
        process.exit(1);
      }

      const { userId, username } = resolved;
      const displayName = username ? `@${username}` : userId;

      const result = await client.follow(userId);
      if (result.success) {
        const finalName = result.username ? `@${result.username}` : displayName;
        console.log(`${ctx.p('ok')}Artık ${finalName} takip ediliyor`);
      } else {
        console.error(`${ctx.p('err')}${displayName} takip edilemedi: ${result.error}`);
        process.exit(1);
      }
    });

  program
    .command('takipbirak')
    .description('Bir kullanıcıyı takipten çık')
    .argument('<kullanıcı-adı-veya-id>', 'Takipten çıkılacak kullanıcı adı (@ ile veya olmadan) veya kullanıcı ID')
    .action(async (usernameOrId: string) => {
      const opts = program.opts();
      const timeoutMs = ctx.resolveTimeoutFromOptions(opts);

      const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

      for (const warning of warnings) {
        console.error(`${ctx.p('warn')}${warning}`);
      }

      if (!cookies.authToken || !cookies.ct0) {
        console.error(`${ctx.p('err')}Missing required credentials`);
        process.exit(1);
      }

      const client = new TwitterClient({ cookies, timeoutMs });

      const resolved = await resolveUserId(client, usernameOrId, ctx);
      if (!resolved) {
        process.exit(1);
      }

      const { userId, username } = resolved;
      const displayName = username ? `@${username}` : userId;

      const result = await client.unfollow(userId);
      if (result.success) {
        const finalName = result.username ? `@${result.username}` : displayName;
        console.log(`${ctx.p('ok')}${finalName} takipten çıkarıldı`);
      } else {
        console.error(`${ctx.p('err')}${displayName} takipten çıkarılamadı: ${result.error}`);
        process.exit(1);
      }
    });
}
