import { useState } from 'react';

const TIERS = [
  {
    value: 'pro',
    label: 'Pro',
    price: 'от 490 ₽/мес',
    features: [
      'Все упражнения без ограничений',
      'Тренировка слуха',
      'Полный каталог теории',
      'Создание композиций',
      'MIDI-клавиатура',
    ],
  },
  {
    value: 'premium',
    label: 'Premium',
    price: 'от 990 ₽/мес',
    features: [
      'Всё из Pro',
      'Ритмические упражнения',
      'Расширенная статистика',
      'Приоритетная поддержка',
    ],
  },
];

export function LandingSubscriptionForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [desiredTier, setDesiredTier] = useState('pro');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/subscription-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || undefined, desiredTier, message: message || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Ошибка отправки');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          padding: 32,
          background: '#16213e',
          borderRadius: 12,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <h2 style={{ color: '#e5e7eb', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          Заявка принята!
        </h2>
        <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6 }}>
          Спасибо! Мы свяжемся с вами в течение 24 часов для подтверждения подписки.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 32, background: '#16213e', borderRadius: 12 }}>
      <h2
        style={{
          color: '#e5e7eb',
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 4,
          textAlign: 'center',
        }}
      >
        Оформить подписку
      </h2>
      <p
        style={{
          color: '#9ca3af',
          fontSize: 13,
          marginBottom: 24,
          textAlign: 'center',
        }}
      >
        Выберите тариф и оставьте заявку — мы активируем подписку вручную
      </p>

      {error && (
        <div
          style={{
            background: '#7f1d1d',
            color: '#fca5a5',
            padding: '8px 12px',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {TIERS.map((tier) => (
            <label
              key={tier.value}
              style={{
                flex: 1,
                display: 'block',
                padding: 16,
                background: desiredTier === tier.value ? '#1f2937' : '#111827',
                border: `2px solid ${desiredTier === tier.value ? '#e94560' : '#374151'}`,
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
            >
              <input
                type="radio"
                name="tier"
                value={tier.value}
                checked={desiredTier === tier.value}
                onChange={() => setDesiredTier(tier.value)}
                style={{ display: 'none' }}
              />
              <div style={{ color: '#e5e7eb', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                {tier.label}
              </div>
              <div style={{ color: '#9ca3af', fontSize: 12 }}>{tier.price}</div>
              <ul style={{ margin: '8px 0 0', padding: '0 0 0 16px', color: '#9ca3af', fontSize: 11 }}>
                {tier.features.slice(0, 3).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </label>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: 6,
              color: '#e5e7eb',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Имя (необязательно)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: 6,
              color: '#e5e7eb',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <textarea
            placeholder="Комментарий (необязательно)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: 6,
              color: '#e5e7eb',
              fontSize: 14,
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          style={{
            width: '100%',
            padding: '12px',
            background: loading ? '#9ca3af' : '#e94560',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: !email ? 0.5 : 1,
          }}
        >
          {loading ? 'Отправка...' : 'Отправить заявку'}
        </button>
      </form>
    </div>
  );
}
