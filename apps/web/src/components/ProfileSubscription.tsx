import { useState, useEffect, useCallback } from 'react';
import { apiClient, useAuth } from '@jazz/plugin-sdk';

interface HistoryEntry {
  id: string;
  eventType: string;
  actorId: string;
  oldTier: string | null;
  newTier: string | null;
  metadata: Record<string, unknown>;
  createdAt: number;
}

interface SubscriptionInfo {
  tier: 'free' | 'pro' | 'premium';
  status: string | null;
  currentPeriodEnd: number | null;
  gracePeriodEnds: number | null;
  isGracePeriod: boolean;
  history: HistoryEntry[];
}

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  premium: 'Premium',
};

const EVENT_LABELS: Record<string, string> = {
  created: 'Активация',
  updated: 'Изменение',
  canceled: 'Отмена',
  'billing:degraded:to_free': 'Деградация до Free',
  grace_entered: 'Вход в grace period',
};

export function ProfileSubscription() {
  const { user } = useAuth();
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [action, setAction] = useState('upgrade');
  const [tier, setTier] = useState('pro');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formResult, setFormResult] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    try {
      const data = await apiClient.get<SubscriptionInfo>('/subscription');
      setInfo(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  const handleRequestChange = async () => {
    setSubmitting(true);
    setFormResult(null);
    try {
      await apiClient.post('/subscription/request-change', {
        action,
        tier: action !== 'cancel' ? tier : undefined,
        message: message || undefined,
      });
      setFormResult('Запрос отправлен. Мы свяжемся с вами.');
      setShowForm(false);
    } catch {
      setFormResult('Ошибка отправки запроса');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p style={{ color: '#9ca3af' }}>Загрузка...</p>;
  if (!user) return null;

  const currentTier = info?.tier ?? 'free';
  const isActive = info?.status === 'active';

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Подписка</h3>

      {/* Current plan card */}
      <div
        style={{
          background: '#1f2937',
          borderRadius: 8,
          padding: 16,
          border: '1px solid #374151',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: '#9ca3af' }}>Текущий тариф</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: currentTier === 'free' ? '#9ca3af' : '#e94560',
            }}
          >
            {TIER_LABELS[currentTier] ?? currentTier}
          </span>
        </div>

        {isActive && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
              <span>Статус: активна</span>
              {info?.currentPeriodEnd && (
                <span>до {new Date(info.currentPeriodEnd).toLocaleDateString()}</span>
              )}
            </div>
            {info?.isGracePeriod && (
              <p style={{ fontSize: 11, color: '#f59e0b', marginBottom: 4 }}>
                Grace period — продлите подписку
              </p>
            )}
          </>
        )}

        {currentTier === 'free' && (
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
            Бесплатный доступ с ограничениями
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {currentTier === 'free' && (
          <>
            <button
              onClick={() => { setAction('upgrade'); setTier('pro'); setShowForm(true); }}
              style={{
                padding: '8px 16px',
                background: '#e94560',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Перейти на Pro
            </button>
            <button
              onClick={() => { setAction('upgrade'); setTier('premium'); setShowForm(true); }}
              style={{
                padding: '8px 16px',
                background: 'none',
                border: '1px solid #e94560',
                color: '#e94560',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Premium
            </button>
          </>
        )}
        {currentTier === 'pro' && (
          <>
            <button
              onClick={() => { setAction('upgrade'); setTier('premium'); setShowForm(true); }}
              style={{
                padding: '8px 16px',
                background: '#e94560',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Перейти на Premium
            </button>
            <button
              onClick={() => { setAction('downgrade'); setTier('free'); setShowForm(true); }}
              style={{
                padding: '8px 16px',
                background: 'none',
                border: '1px solid #9ca3af',
                color: '#9ca3af',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              На Free
            </button>
          </>
        )}
        {currentTier === 'premium' && (
          <button
            onClick={() => { setAction('downgrade'); setTier('pro'); setShowForm(true); }}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: '1px solid #9ca3af',
              color: '#9ca3af',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Перейти на Pro
          </button>
        )}
        {isActive && (
          <button
            onClick={() => { setAction('cancel'); setShowForm(true); }}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: '1px solid #ef4444',
              color: '#ef4444',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Отменить
          </button>
        )}
      </div>

      {/* Request form */}
      {showForm && (
        <div
          style={{
            background: '#111827',
            borderRadius: 8,
            padding: 16,
            border: '1px solid #374151',
            marginBottom: 16,
          }}
        >
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            {action === 'cancel' ? 'Запрос на отмену подписки' : 'Запрос на изменение подписки'}
          </h4>
          <textarea
            placeholder="Комментарий (необязательно)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: 6,
              color: '#e5e7eb',
              fontSize: 13,
              resize: 'vertical',
              marginBottom: 12,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleRequestChange}
              disabled={submitting}
              style={{
                padding: '8px 16px',
                background: '#e94560',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: 13,
              }}
            >
              {submitting ? 'Отправка...' : 'Отправить запрос'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                padding: '8px 16px',
                background: 'none',
                border: '1px solid #374151',
                color: '#9ca3af',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Отмена
            </button>
          </div>
          {formResult && (
            <p style={{ marginTop: 8, fontSize: 12, color: '#10b981' }}>{formResult}</p>
          )}
        </div>
      )}

      {/* History */}
      {info?.history && info.history.length > 0 && (
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', marginBottom: 8 }}>
            История
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {info.history.map((h) => (
              <div
                key={h.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: '#1f2937',
                  borderRadius: 6,
                  border: '1px solid #374151',
                  fontSize: 12,
                }}
              >
                <span style={{ color: '#e5e7eb' }}>
                  {EVENT_LABELS[h.eventType] ?? h.eventType}
                </span>
                <span style={{ color: '#6b7280' }}>
                  {new Date(h.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
