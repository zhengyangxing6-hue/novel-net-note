import { NextRequest, NextResponse } from 'next/server';
import {
  generateChapterAnalysis,
  generateTermDefinition,
  generateVolumeSummary,
  generateCharacterProfile,
} from '@/lib/ai-analyzer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, slug, chapterId, term, startChapter, endChapter, volumeNumber, characterName } = body;

    if (!type || !slug) {
      return NextResponse.json({ error: '缺少必要参数 type 或 slug' }, { status: 400 });
    }

    switch (type) {
      case 'chapter': {
        if (!chapterId) {
          return NextResponse.json({ error: '缺少 chapterId' }, { status: 400 });
        }
        const result = await generateChapterAnalysis(slug, chapterId);
        return NextResponse.json({ success: true, data: result });
      }

      case 'term': {
        if (!term) {
          return NextResponse.json({ error: '缺少 term' }, { status: 400 });
        }
        const result = await generateTermDefinition(slug, term);
        return NextResponse.json({ success: true, data: result });
      }

      case 'volume': {
        if (!startChapter || !endChapter) {
          return NextResponse.json({ error: '缺少 startChapter 或 endChapter' }, { status: 400 });
        }
        const result = await generateVolumeSummary(slug, startChapter, endChapter, volumeNumber);
        return NextResponse.json({ success: true, data: result });
      }

      case 'character': {
        if (!characterName) {
          return NextResponse.json({ error: '缺少 characterName' }, { status: 400 });
        }
        const result = await generateCharacterProfile(slug, characterName);
        return NextResponse.json({ success: true, data: result });
      }

      default:
        return NextResponse.json({ error: `未知的分析类型：${type}` }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '分析生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
