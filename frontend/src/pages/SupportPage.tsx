import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import ErrorAlert from '../components/common/ErrorAlert';
import Loader from '../components/common/Loader';
import ChatWindow from '../components/support/ChatWindow';
import SupportRequestList from '../components/support/SupportRequestList';
import {
  clearSelection,
  createSupportRequest,
  fetchSupportRequests,
  resetSupport,
  selectRequest,
} from '../features/support/supportSlice';

/**
 * Страница поддержки клиента (спецификация, раздел 6.7):
 * список своих обращений с индикатором непрочитанных, создание обращения
 * и окно чата с live-обновлениями. В закрытое обращение писать нельзя —
 * это проверяет backend, frontend лишь блокирует форму.
 */
const SupportPage = () => {
  const dispatch = useAppDispatch();
  const {
    requests,
    requestsLoading,
    requestsError,
    createLoading,
    createError,
    selectedId,
  } = useAppSelector((state) => state.support);

  /** Фильтр списка: активные (по умолчанию) или закрытые. */
  const [isActiveFilter, setIsActiveFilter] = useState(true);
  const [newText, setNewText] = useState('');

  const load = useCallback(
    (isActive: boolean) => {
      void dispatch(fetchSupportRequests({ role: 'client', isActive }));
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

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = newText.trim();
    if (!text) return;

    const result = await dispatch(createSupportRequest(text));
    if (createSupportRequest.fulfilled.match(result)) {
      setNewText('');
      // Новое обращение активное — показываем его в списке и открываем чат.
      setIsActiveFilter(true);
      load(true);
      dispatch(selectRequest(result.payload.id));
    }
  };

  const selected = requests.find((item) => item.id === selectedId) ?? null;

  return (
    <>
      <h1 className="support-chat__heading">Поддержка</h1>

      <section className="support-chat__card">
        <h2 className="support-chat__section-title">Новое обращение</h2>
        <Form onSubmit={handleCreate}>
          <Form.Control
            as="textarea"
            rows={3}
            className="support-chat__textarea"
            value={newText}
            onChange={(event) => setNewText(event.target.value)}
            placeholder="Опишите ваш вопрос или проблему…"
            maxLength={2000}
            disabled={createLoading}
            aria-label="Текст обращения"
          />
          {createError && <ErrorAlert message={createError} />}
          <Button
            type="submit"
            variant="primary"
            disabled={createLoading || newText.trim().length === 0}
          >
            {createLoading ? 'Создание…' : 'Создать обращение'}
          </Button>
        </Form>
      </section>

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
                  ? 'Активных обращений нет. Создайте обращение — мы ответим в чате.'
                  : 'Закрытых обращений нет.'
              }
            />
          )}
        </aside>

        <div className="support-chat__chat">
          {selected ? (
            <ChatWindow
              key={selected.id}
              requestId={selected.id}
              isActive={selected.isActive}
              supportStatus
            />
          ) : (
            <p className="support-chat__hint">
              Выберите обращение из списка, чтобы открыть чат.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default SupportPage;
