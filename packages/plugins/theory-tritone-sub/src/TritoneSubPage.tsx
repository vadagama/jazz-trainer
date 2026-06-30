import { LectureRenderer } from '@jazz/ui';
import { lecture } from './lecture';

export default function TritoneSubPage() {
  return <LectureRenderer lecture={lecture} backTo="/theory" backLabel="Теория" />;
}
