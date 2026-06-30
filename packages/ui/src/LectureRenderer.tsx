import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import type { LectureDefinition, LectureBlock, LectureSection } from '@jazz/plugin-sdk';
import { noteNameToMidi } from '@jazz/music-core';
import { OSMDSheetMusic } from './OSMDSheetMusic';
import { VirtualKeyboard } from './VirtualKeyboard';
import { NotationStaff } from './NotationStaff';
import { ChordPlayer } from './ChordPlayer';
import { MiniTrainer } from './MiniTrainer';
import { ActiveQuiz } from './ActiveQuiz';
import { AudioPlayer } from './AudioPlayer';
import { VideoPlayer } from './VideoPlayer';
import { MermaidDiagram } from './MermaidDiagram';
import { Card, CardHeader, CardTitle } from './card';
import { Badge } from './badge';

// ---------------------------------------------------------------------------
// LectureRenderer — renders a LectureDefinition section by section
// ---------------------------------------------------------------------------

export interface LectureProgress {
  lectureId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  sectionsCompleted: string[];
  quizScores: Record<string, number>;
}

export interface LectureResult {
  lectureId: string;
  completed: boolean;
  quizScores: Record<string, number>;
  timeSpentSeconds: number;
}

export interface LectureRendererProps {
  lecture: LectureDefinition;
  backTo?: string;
  backLabel?: string;
  initialProgress?: LectureProgress;
  onProgress?: (progress: LectureProgress) => void;
  onSectionComplete?: (sectionId: string) => void;
  onComplete?: (result: LectureResult) => void;
}

function renderBlock(block: LectureBlock): ReactNode {
  switch (block.type) {
    case 'text':
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{block.content}</ReactMarkdown>
        </div>
      );

    case 'callout': {
      const kindStyles: Record<string, string> = {
        tip: 'border-l-green-500 bg-green-50 dark:bg-green-950',
        warning: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950',
        info: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950',
      };
      return (
        <div className={`border-l-4 p-3 rounded-r ${kindStyles[block.kind] ?? kindStyles.info}`}>
          <ReactMarkdown>{block.content}</ReactMarkdown>
        </div>
      );
    }

    case 'sheet-music':
      return <OSMDSheetMusic notes={block.notes} playback={block.playback} />;

    case 'keyboard': {
      const midiNotes = block.highlight
        .map((n) => {
          try {
            return noteNameToMidi(n);
          } catch {
            return -1;
          }
        })
        .filter((n) => n >= 0);
      return (
        <div className="space-y-2">
          {block.label && <p className="text-sm text-gray-600 dark:text-gray-400">{block.label}</p>}
          <VirtualKeyboard mode="chord-highlight" chordNotes={midiNotes} compact />
          <NotationStaff highlightedNotes={midiNotes} compact />
        </div>
      );
    }

    case 'chord-audio':
      return (
        <ChordPlayer
          notes={block.notes}
          label={block.label}
          noteDuration={block.noteDuration}
          mode={block.mode}
          arpeggioDelay={block.arpeggioDelay}
          showKeyboard={block.showKeyboard}
          showStaff={block.showStaff}
        />
      );

    case 'mini-trainer':
      return <MiniTrainer exercise={block.exercise} />;

    case 'quiz':
      return <ActiveQuiz quiz={block.quiz} />;

    case 'divider':
      return <hr className="my-6 border-gray-200 dark:border-gray-700" />;

    case 'image':
      return (
        <figure className="my-4">
          <img src={block.src} alt={block.caption ?? ''} className="rounded-lg max-w-full" />
          {block.caption && (
            <figcaption className="text-sm text-gray-500 mt-1 text-center">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case 'diagram':
      return <MermaidDiagram mermaid={block.mermaid} />;

    case 'audio':
      return <AudioPlayer src={block.src} waveform={block.waveform} />;

    case 'video':
      return <VideoPlayer src={block.src} poster={block.poster} />;

    default:
      return null;
  }
}

function SectionRenderer({
  section,
  index,
}: {
  section: LectureSection;
  index: number;
}): ReactNode {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        {index + 1}. {section.title}
      </h2>
      <div className="space-y-4">
        {section.blocks.map((block, bi) => (
          <div key={`${section.id}-${bi}`}>{renderBlock(block)}</div>
        ))}
      </div>
    </section>
  );
}

function LectureHeader({ lecture }: { lecture: LectureDefinition }): ReactNode {
  const { meta } = lecture;

  const levelLabel = (() => {
    const labels: Record<number, string> = {
      1: 'Начинающий',
      2: 'Базовый',
      3: 'Средний',
      4: 'Продвинутый',
      5: 'Мастер',
    };
    return labels[meta.level] ?? `Уровень ${meta.level}`;
  })();

  const tags = meta.tags.filter(
    (tag) => tag.toLowerCase() !== levelLabel.toLowerCase(),
  );

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge>{levelLabel}</Badge>
          <span className="text-sm text-gray-500 dark:text-gray-400">~{meta.duration} мин</span>
          {meta.bonusPoints > 0 && (
            <span className="text-sm text-amber-600">★ {meta.bonusPoints} баллов</span>
          )}
        </div>
        <CardTitle className="text-2xl">{meta.title}</CardTitle>
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>
    </Card>
  );
}

export function LectureRenderer({ lecture, backTo, backLabel }: LectureRendererProps): ReactNode {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {backTo && (
        <nav className="flex items-center gap-1.5 mb-6 text-sm">
          <Link
            to={backTo}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {backLabel ?? 'Назад'}
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="truncate font-medium text-foreground">{lecture.meta.title}</span>
        </nav>
      )}
      <LectureHeader lecture={lecture} />

      {lecture.sections.map((section, i) => (
        <SectionRenderer key={section.id} section={section} index={i} />
      ))}

      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center text-sm text-gray-500">
        Конец лекции. Прогресс будет сохранён в v1.2.
      </div>
    </div>
  );
}
