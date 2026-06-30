import { LectureRenderer } from '@jazz/ui';
import { lecture } from './lecture';

export default function IIvIPage() {
  return <LectureRenderer lecture={lecture} backTo="/theory" backLabel="Теория" />;
}
