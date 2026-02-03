import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';

export function registerCheckCommand(program: Command, ctx: CliContext): void {
  program
    .command('kontrol')
    .description('Kimlik bilgisi durumunu kontrol et')
    .action(async () => {
      const opts = program.opts();
      const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

      console.log(`${ctx.p('info')}Kimlik kontrolü`);
      console.log('─'.repeat(40));

      if (cookies.authToken) {
        console.log(`${ctx.p('ok')}auth_token: ${cookies.authToken.slice(0, 10)}...`);
      } else {
        console.log(`${ctx.p('err')}auth_token: bulunamadı`);
      }

      if (cookies.ct0) {
        console.log(`${ctx.p('ok')}ct0: ${cookies.ct0.slice(0, 10)}...`);
      } else {
        console.log(`${ctx.p('err')}ct0: bulunamadı`);
      }

      if (cookies.source) {
        console.log(`${ctx.l('source')}${cookies.source}`);
      }

      if (warnings.length > 0) {
        console.log(`\n${ctx.p('warn')}Uyarılar:`);
        for (const warning of warnings) {
          console.log(`   - ${warning}`);
        }
      }

      if (cookies.authToken && cookies.ct0) {
        console.log(`\n${ctx.p('ok')}Tweet atmaya hazır!`);
      } else {
        console.log(`\n${ctx.p('err')}Kimlik bilgileri eksik. Seçenekler:`);
        console.log('   1. Safari/Chrome/Firefox\'da x.com\'a giriş yap');
        console.log('   2. AUTH_TOKEN ve CT0 ortam değişkenlerini ayarla');
        console.log('   3. --auth-token ve --ct0 bayraklarını kullan');
        process.exit(1);
      }
    });
}
