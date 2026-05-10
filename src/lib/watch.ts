import { watch } from 'fs';
import path from 'path';
import { buildIndex } from './index-builder';

const CONTENT_ROOT = path.resolve(process.cwd(), 'content/novels');
const DB_PATH = path.resolve(process.cwd(), 'data/index.db');

let timeout: ReturnType<typeof setTimeout> | null = null;

function debouncedRebuild(): void {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(async () => {
    console.log('[index-watch] 检测到文件变更，重建索引...');
    try {
      await buildIndex(CONTENT_ROOT, DB_PATH);
      console.log('[index-watch] 索引重建完成');
    } catch (error) {
      console.error('[index-watch] 索引重建失败:', error);
    }
  }, 1000); // 1 秒防抖
}

/**
 * 监听 content/novels/ 目录的文件变更，自动重建 SQLite 索引。
 */
export async function startWatching(): Promise<void> {
  console.log('[index-watch] 开始监听文件变更...');
  console.log(`[index-watch] 监听目录: ${CONTENT_ROOT}`);

  // 首次构建
  await buildIndex(CONTENT_ROOT, DB_PATH);
  console.log('[index-watch] 初始索引构建完成');

  watch(CONTENT_ROOT, { recursive: true }, (eventType, filename) => {
    if (filename?.endsWith('.md') || filename?.endsWith('.txt')) {
      debouncedRebuild();
    }
  });

  console.log('[index-watch] 按 Ctrl+C 停止监听');
}

// 直接运行此脚本
if (process.argv[1]?.endsWith('watch') || process.argv[1]?.endsWith('watch.ts')) {
  startWatching().catch(console.error);
}
