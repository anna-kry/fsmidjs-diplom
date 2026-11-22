import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button, Form } from 'react-bootstrap';

interface MessageFormProps {
  /** Обращение закрыто — ввод и кнопка заблокированы. */
  disabled: boolean;
  /** Идёт отправка — блокируем повторную отправку. */
  sending: boolean;
  /** Отправляет текст; true — сообщение ушло, можно очистить поле. */
  onSend: (text: string) => Promise<boolean>;
}

/**
 * Форма отправки сообщения.
 * Enter — отправка, Shift+Enter — перенос строки; пустой текст не отправляется.
 */
const MessageForm = ({ disabled, sending, onSend }: MessageFormProps) => {
  const [text, setText] = useState('');

  const canSend = !disabled && !sending && text.trim().length > 0;

  const submit = () => {
    const value = text.trim();
    if (disabled || sending || !value) return;
    // Поле очищаем только после успешной отправки — при ошибке текст остаётся.
    void onSend(value).then((success) => {
      if (success) setText('');
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <Form onSubmit={handleSubmit} className="message-form">
      <Form.Control
        as="textarea"
        rows={2}
        className="message-form__input"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          disabled ? 'Обращение закрыто' : 'Введите сообщение…'
        }
        disabled={disabled || sending}
        maxLength={2000}
        aria-label="Текст сообщения"
      />
      <Button
        type="submit"
        variant="primary"
        className="message-form__submit"
        disabled={!canSend}
      >
        {sending ? 'Отправка…' : 'Отправить'}
      </Button>
    </Form>
  );
};

export default MessageForm;
