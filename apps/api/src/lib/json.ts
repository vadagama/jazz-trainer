/**
 * Безопасный разбор JSON, хранимого в БД. При повреждённой строке возвращает
 * `fallback` вместо выброса исключения — чтобы битое опциональное поле
 * (metadata, perStyleOverrides) не роняло весь запрос необработанным 500.
 *
 * Для обязательных полей, где пустой дефолт скрыл бы порчу данных
 * (например content композиции), НЕ используй это — пробрасывай ошибку.
 */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
