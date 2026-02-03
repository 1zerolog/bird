import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import {
  type FeatureOverrides,
  getFeatureOverridesSnapshot,
  refreshFeatureOverridesCache,
} from '../lib/runtime-features.js';
import { runtimeQueryIds } from '../lib/runtime-query-ids.js';

function countFeatureOverrides(overrides: FeatureOverrides): number {
  let count = 0;
  if (overrides.global) {
    count += Object.keys(overrides.global).length;
  }
  if (overrides.sets) {
    for (const setOverrides of Object.values(overrides.sets)) {
      count += Object.keys(setOverrides).length;
    }
  }
  return count;
}

export function registerQueryIdsCommand(program: Command, ctx: CliContext): void {
  program
    .command('sorgu-idleri')
    .description('GraphQL sorgu kimliklerini görüntüle veya yenile')
    .option('--json', 'JSON olarak çıktı ver')
    .option('--fresh', 'Force refresh (downloads X client bundles)', false)
    .option('--refresh', 'Önbellekten sil ve Twitter\'dan yeniden çek')
    .action(async (cmdOpts: { json?: boolean; fresh?: boolean }) => {
      const operations = [
        'CreateTweet',
        'CreateRetweet',
        'FavoriteTweet',
        'TweetDetail',
        'SearchTimeline',
        'UserArticlesTweets',
        'Bookmarks',
        'Following',
        'Followers',
        'Likes',
      ];

      if (cmdOpts.fresh) {
        console.error(`${ctx.p('info')}GraphQL sorgu kimlikleri yenileniyor…`);
        await runtimeQueryIds.refresh(operations, { force: true });
        console.error(`${ctx.p('info')}Özellik geçersiz kılmaları yenileniyor…`);
        await refreshFeatureOverridesCache();
      }

      const featureSnapshot = getFeatureOverridesSnapshot();
      const info = await runtimeQueryIds.getSnapshotInfo();
      if (!info) {
        if (cmdOpts.json) {
          console.log(
            JSON.stringify(
              {
                cached: false,
                cachePath: runtimeQueryIds.cachePath,
                featuresPath: featureSnapshot.cachePath,
                features: featureSnapshot.overrides,
              },
              null,
              2,
            ),
          );
          return;
        }
        console.log(`${ctx.p('warn')}Henüz önbelleğe alınmış sorgu kimliği yok.`);
        console.log(`${ctx.p('info')}Çalıştır: bird query-ids --fresh`);
        console.log(`features_path: ${featureSnapshot.cachePath}`);
        return;
      }

      if (cmdOpts.json) {
        console.log(
          JSON.stringify(
            {
              cached: true,
              cachePath: info.cachePath,
              fetchedAt: info.snapshot.fetchedAt,
              isFresh: info.isFresh,
              ageMs: info.ageMs,
              ids: info.snapshot.ids,
              discovery: info.snapshot.discovery,
              featuresPath: featureSnapshot.cachePath,
              features: featureSnapshot.overrides,
            },
            null,
            2,
          ),
        );
        return;
      }

      console.log(`${ctx.p('ok')}GraphQL sorgu kimlikleri önbelleğe alındı`);
      console.log(`path: ${info.cachePath}`);
      console.log(`fetched_at: ${info.snapshot.fetchedAt}`);
      console.log(`fresh: ${info.isFresh ? 'evet' : 'hayır'}`);
      console.log(`ops: ${Object.keys(info.snapshot.ids).length}`);
      console.log(`features_path: ${featureSnapshot.cachePath}`);
      console.log(`features: ${countFeatureOverrides(featureSnapshot.overrides)}`);
    });
}
