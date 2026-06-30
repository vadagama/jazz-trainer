import { LectureRenderer } from '@jazz/ui';
import { lecture } from './lecture';

export default function TurnaroundsPage() {
  return <LectureRenderer lecture={lecture} backTo="/theory" backLabel="Теория" />;
}
