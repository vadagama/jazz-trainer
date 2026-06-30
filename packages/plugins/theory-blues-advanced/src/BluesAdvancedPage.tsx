import { LectureRenderer } from '@jazz/ui';
import { lecture } from './lecture';

export default function BluesAdvancedPage() {
  return <LectureRenderer lecture={lecture} backTo="/theory" backLabel="Теория" />;
}
