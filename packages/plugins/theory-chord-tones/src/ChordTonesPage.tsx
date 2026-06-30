import { LectureRenderer } from '@jazz/ui';
import { lecture } from './lecture';

export default function ChordTonesPage() {
  return <LectureRenderer lecture={lecture} backTo="/theory" backLabel="Теория" />;
}
