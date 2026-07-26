import { useState, useEffect, useCallback } from 'react';
import { apiClient, useAuth } from '@jazz/plugin-sdk';

interface SubRequest {
  id: string;
  email: string;
  name: string | null;
  desiredTier: string;
  message: string | null;
  status: string;
  userId: string | null;
  processedBy: string | null;
  processedComment: string | null;
  processedAt: number | null;
  createdAt: number;
}

interface Subscription {
  id: string;
  userId: string;
  userEmail: string | null;
  tierName: string | null;
  status: string;
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
  gracePeriodEnds: number | null;
  canceledAt: number | null;
  createdAt: number;
  updatedAt: number;
}

type Tab = 'requests' | 'active' | 'completed';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  approved: 'Одобрен',
  rejected: 'Отклонён',
  needs_info: 'Уточнение',
  active: 'Активна',
  canceled: 'Отменена',
  expired: 'Истекла',
  past_due: 'Просрочена',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  needs_info: '#3b82f6',
  active: '#10b981',
  canceled: '#6b7280',
  expired: '#ef4444',
  past_due: '#f59e0b',
};

export default function SubscriptionsPage() {
  const { user: _user } = useAuth();
  const [tab, setTab] = useState<Tab>('requests');
  const [requests, setRequests] = useState<SubRequest[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const data = await apiClient.get<SubRequest[]>(`/admin/subscription-requests${params}`);
      setRequests(data);
    } catch {
      setError('Failed to load subscription requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = tab === 'completed' ? '?status=expired,canceled' : '?status=active';
      const data = await apiClient.get<Subscription[]>(`/admin/subscriptions${params}`);
      setSubscriptions(data);
    } catch {
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'requests') fetchRequests();
    else fetchSubscriptions();
  }, [tab, fetchRequests, fetchSubscriptions]);

  const handleApprove = async (id: string) => {
    try {
      await apiClient.post(`/admin/subscription-requests/${id}/approve`, {});
      fetchRequests();
    } catch {
      setError('Failed to approve request');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Причина отказа (необязательно):');
    try {
      await apiClient.post(`/admin/subscription-requests/${id}/reject`, { reason: reason || undefined });
      fetchRequests();
    } catch {
      setError('Failed to reject request');
    }
  };

  const handleRequestInfo = async (id: string) => {
    const reason = prompt('Что нужно уточнить?');
    try {
      await apiClient.post(`/admin/subscription-requests/${id}/request-info`, { reason: reason || undefined });
      fetchRequests();
    } catch {
      setError('Failed to request info');
    }
  };

  const handleCancelSub = async (userId: string) => {
    if (!confirm('Отменить подписку?')) return;
    try {
      await apiClient.put(`/admin/subscriptions/${userId}`, { status: 'canceled' });
      fetchSubscriptions();
    } catch {
      setError('Failed to cancel subscription');
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'requests', label: 'Запросы' },
    { key: 'active', label: 'Активные' },
    { key: 'completed', label: 'Завершённые' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Подписки</h1>
      <p style={{ color: '#9ca3af', marginBottom: 24, fontSize: 14 }}>
        Ручное управление подписками и входящими заявками
      </p>

      {error && (
        <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '8px 12px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #374151' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid #e94560' : '2px solid transparent',
              color: tab === t.key ? '#e94560' : '#9ca3af',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'requests' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #374151',
                background: '#1f2937',
                color: '#e5e7eb',
                fontSize: 13,
              }}
            >
              <option value="">Все статусы</option>
              <option value="pending">Ожидает</option>
              <option value="approved">Одобрен</option>
              <option value="rejected">Отклонён</option>
              <option value="needs_info">Уточнение</option>
            </select>
          </div>

          {loading ? (
            <p style={{ color: '#9ca3af' }}>Загрузка...</p>
          ) : requests.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>Нет заявок</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {requests.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: '#1f2937',
                    borderRadius: 8,
                    padding: 16,
                    border: '1px solid #374151',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <div>
                      <strong style={{ fontSize: 14 }}>{r.name || r.email}</strong>
                      <span style={{ marginLeft: 8, fontSize: 12, color: '#9ca3af' }}>{r.email}</span>
                    </div>
                    <span style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: STATUS_COLORS[r.status] + '22',
                      color: STATUS_COLORS[r.status],
                      fontWeight: 600,
                    }}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>
                    <span>Тариф: <strong style={{ color: '#e5e7eb' }}>{r.desiredTier}</strong></span>
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>

                  {r.message && (
                    <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8, background: '#111827', padding: 8, borderRadius: 6 }}>
                      {r.message}
                    </p>
                  )}

                  {r.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleApprove(r.id)}
                        style={{
                          padding: '6px 14px',
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Одобрить
                      </button>
                      <button
                        onClick={() => handleReject(r.id)}
                        style={{
                          padding: '6px 14px',
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Отклонить
                      </button>
                      <button
                        onClick={() => handleRequestInfo(r.id)}
                        style={{
                          padding: '6px 14px',
                          background: '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Уточнить
                      </button>
                    </div>
                  )}

                  {r.processedComment && (
                    <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                      Комментарий: {r.processedComment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(tab === 'active' || tab === 'completed') && (
        <div>
          {loading ? (
            <p style={{ color: '#9ca3af' }}>Загрузка...</p>
          ) : subscriptions.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>Нет подписок</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {subscriptions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: '#1f2937',
                    borderRadius: 8,
                    padding: 16,
                    border: '1px solid #374151',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <strong style={{ fontSize: 14 }}>{s.userEmail || s.userId}</strong>
                      <span style={{
                        marginLeft: 8,
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: STATUS_COLORS[s.status] + '22',
                        color: STATUS_COLORS[s.status],
                        fontWeight: 600,
                      }}>
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, color: '#e5e7eb', fontWeight: 600 }}>
                      {s.tierName?.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                    {s.currentPeriodEnd && (
                      <span>До: {new Date(s.currentPeriodEnd).toLocaleDateString()}</span>
                    )}
                    <span>Создана: {new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>

                  {s.status === 'active' && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        onClick={() => handleCancelSub(s.userId)}
                        style={{
                          padding: '4px 12px',
                          background: 'none',
                          border: '1px solid #ef4444',
                          color: '#ef4444',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 11,
                        }}
                      >
                        Отменить
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
