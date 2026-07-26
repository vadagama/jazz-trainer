import { useT } from '../landing.i18n';
import { Reveal, PhotoCard, NEON } from '../components/Shared';

/** Фото + неоновый акцент на карточку — в порядке forWhomCards (Студент/Преподаватель/Любитель/Исследователь). */
const CARD_MEDIA = [
  { img: '/landing/forwhom-student.jpg', accent: NEON.teal },
  { img: '/landing/forwhom-teacher.jpg', accent: NEON.emerald },
  { img: '/landing/forwhom-hobbyist.jpg', accent: NEON.amber },
  { img: '/landing/forwhom-explorer.jpg', accent: NEON.purple },
];

export function ForWhom() {
  const t = useT();
  const cards = t('forWhomCards');
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <Reveal>
        <h2 className="amz-display text-center text-3xl font-bold sm:text-4xl">{t('forWhomTitle')}</h2>
      </Reveal>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const media = CARD_MEDIA[i % CARD_MEDIA.length]!;
          return (
            <PhotoCard
              key={c.title}
              delay={i * 80}
              src={media.img}
              alt={c.title}
              accent={media.accent}
              title={c.title}
              text={c.text}
            />
          );
        })}
      </div>
    </section>
  );
}
