import type { ReactNode } from 'react';
import { Modal, Button } from 'react-bootstrap';

interface ConfirmModalProps {
  /** Видимость модального окна. */
  show: boolean;
  /** Закрыть модал (отмена). */
  onHide: () => void;
  /** Подтверждение действия. */
  onConfirm: () => void;
  /** Заголовок модала. */
  title?: ReactNode;
  /** Текст подтверждения. */
  message?: ReactNode;
  /** Текст кнопки подтверждения. */
  confirmLabel?: string;
  /** Состояние загрузки при подтверждении. */
  loading?: boolean;
}

/**
 * Модальное окно подтверждения действия (например, удаления).
 * Использует Bootstrap Modal — выравнивание и стиль общие для проекта.
 */
const ConfirmModal = ({
  show,
  onHide,
  onConfirm,
  title = 'Подтверждение',
  message,
  confirmLabel = 'Подтвердить',
  loading = false,
}: ConfirmModalProps) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={onHide}
          disabled={loading}
        >
          Отмена
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Удаление…' : confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmModal;
