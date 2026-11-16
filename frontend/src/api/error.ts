import axios from 'axios';

/**
 * Достаёт из ответа API понятное сообщение об ошибке.
 * Стандартные сообщения Nest ("Unauthorized", "Forbidden") заменяются
 * переданным запасным вариантом — они бесполезны для пользователя.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  if (!error.response) {
    return 'Не удалось связаться с сервером. Проверьте соединение и попробуйте ещё раз.';
  }

  const data = error.response.data as { message?: string | string[] } | undefined;

  if (Array.isArray(data?.message)) {
    return data.message.join('. ');
  }

  if (
    typeof data?.message === 'string' &&
    data.message !== 'Unauthorized' &&
    data.message !== 'Forbidden'
  ) {
    return data.message;
  }

  return fallback;
}
