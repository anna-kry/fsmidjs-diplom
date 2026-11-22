import { useCallback, useEffect, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import ConfirmModal from '../../components/common/ConfirmModal';
import ErrorAlert from '../../components/common/ErrorAlert';
import Loader from '../../components/common/Loader';
import ChatWindow from '../../components/support/ChatWindow';
import SupportRequestList from '../../components/support/SupportRequestList';
import {
  clearSelection,
  closeSupportRequest,
  fetchSupportRequests,
  resetSupport,
  selectRequest,
} from '../../features/support/supportSlice';
import type { SupportRequest } from '../../types';

/**
 * Страница обращений менеджера (спецификация, раздел 6.7): список всех
 * обращений с фильтром isActive и данными клиента, чат и закрытие обращения.
 * После закрытия форма блокируется у обеих сторон — но решение принимает
 * backend: клиент получит ошибку при пописке в закрытое обращение.
 */
const ManagerSupportPage = () => {
  const dispatch = useAppDispatch();
  const {
    requests,
    requestsLoading,
    requestsError,
    selectedId,
    closing,
    closeError,
  } = useAppSelector((state) => state.support);

  /** Фильтр списка: активные (по умолчанию) или закрытые. */
  const [isActiveFilter, setIsActiveFilter] = useState(true);
  /** Обращение, которое менеджер собирается закрыть (открыто подтверждение). */
  const [pendingClose, setPendingClose] = useState<SupportRequest | null>(null);

  const load = useCallback(
    (isActive: boolean) => {
      void dispatch(fetchSupportRequests({ role: 'manager', isActive }));
    },
    [dispatch],
  );

  useEffect(() => {
    load(isActiveFilter);
  }, [load, isActiveFilter]);

  // Уход со страницы: закрываем чат и чистим состояние поддержки.
  useEffect(() => {
    return () => {
      dispatch(resetSupport());
    };
  }, [dispatch]);

  const handleFilterChange = (value: string) => {
    setIsActiveFilter(value === 'true');
    dispatch(clearSelection());
  };

  const handleSelect = (id: number) => {
    dispatch(selectRequest(id));
  };

  const handleClose = async () => {
    if (!pendingClose) return;
    await dispatch(closeSupportRequest(pendingClose.id));
    setPendingClose(null);
  };

  const selected = requests.find((item) => item.id === selectedId) ?? null;

  return (
    <>
      <h1 className="support-chat__heading">Обращения</h1>

      <div className="support-chat__layout">
        <aside className="support-chat__sidebar">
          <Form.Select
            value={String(isActiveFilter)}
            onChange={(event) => handleFilterChange(event.target.value)}
            aria-label="Фильтр обращений"
          >
            <option value="true">Активные обращения</option>
            <option value="false">Закрытые обращения</option>
          </Form.Select>

          {requestsError && <ErrorAlert message={requestsError} />}

          {requestsLoading ? (
            <Loader text="Загрузка обращений…" />
          ) : (
            <SupportRequestList
              requests={requests}
              selectedId={selectedId}
              onSelect={handleSelect}
              emptyText={
                isActiveFilter
                  ? 'Активных обращений нет.'
                  : 'Закрытых обращений нет.'
              }
              extra={(request) =>
                request.client ? (
                  <span className="support-list__client">
                    <span className="support-list__client-name">
                      {request.client.name}
                    </span>
                    <span className="support-list__client-contact">
                      {request.client.email}
                      {request.client.contactPhone
                        ? ` · ${request.client.contactPhone}`
                        : ''}
                    </span>
                  </span>
                ) : null
              }
            />
          )}
        </aside>

        <div className="support-chat__chat">
          {closeError && <ErrorAlert message={closeError} />}
          {selected ? (
            <>
              <div className="support-chat__chat-actions">
                <Button
                  variant="outline-danger"
                  disabled={!selected.isActive || closing}
                  onClick={() => setPendingClose(selected)}
                >
                  {selected.isActive ? 'Закрыть обращение' : 'Обращение закрыто'}
                </Button>
              </div>
              <ChatWindow
                key={selected.id}
                requestId={selected.id}
                isActive={selected.isActive}
                title={
                  selected.client
                    ? `Обращение: ${selected.client.name}`
                    : `Обращение № ${selected.id}`
                }
              />
            </>
          ) : (
            <p className="support-chat__hint">
              Выберите обращение из списка, чтобы открыть чат.
            </p>
          )}
        </div>
      </div>

      <ConfirmModal
        show={pendingClose !== null}
        onHide={() => setPendingClose(null)}
        onConfirm={() => void handleClose()}
        title="Закрытие обращения"
        message="Закрыть обращение? Клиент больше не сможет отправлять в него сообщения."
        confirmLabel="Закрыть обращение"
        loadingLabel="Закрытие…"
        loading={closing}
      />
    </>
  );
};

export default ManagerSupportPage;
