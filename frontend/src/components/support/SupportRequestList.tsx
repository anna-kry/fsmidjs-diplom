import type { ReactNode } from 'react';
import type { SupportRequest } from '../../types';
import { formatSupportDate } from '../../utils/support';

interface SupportRequestListProps {
  requests: SupportRequest[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  emptyText: string;
  /** Дополнительная строка в элементе — данные клиента (у менеджера). */
  extra?: (request: SupportRequest) => ReactNode;
}

/**
 * Список обращений с индикатором непрочитанных и статусом.
 * Общий для страниц клиента и менеджера.
 */
const SupportRequestList = ({
  requests,
  selectedId,
  onSelect,
  emptyText,
  extra,
}: SupportRequestListProps) => {
  if (requests.length === 0) {
    return <p className="support-list__empty">{emptyText}</p>;
  }

  return (
    <ul className="support-list">
      {requests.map((request) => (
        <li key={request.id}>
          <button
            type="button"
            className={`support-list__item${
              selectedId === request.id
                ? ' support-list__item--selected'
                : ''
            }`}
            onClick={() => onSelect(request.id)}
          >
            <span className="support-list__row">
              <span className="support-list__date">
                {formatSupportDate(request.createdAt)}
              </span>
              {request.hasNewMessages && (
                <span className="support-list__badge">Новые</span>
              )}
            </span>
            <span className="support-list__row">
              <span
                className={`support-list__status ${
                  request.isActive
                    ? 'support-list__status--active'
                    : 'support-list__status--closed'
                }`}
              >
                {request.isActive ? 'Активное' : 'Закрытое'}
              </span>
              <span className="support-list__id">№ {request.id}</span>
            </span>
            {extra?.(request)}
          </button>
        </li>
      ))}
    </ul>
  );
};

export default SupportRequestList;
