import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import ErrorAlert from '../../components/common/ErrorAlert';
import Loader from '../../components/common/Loader';
import ConfirmModal from '../../components/common/ConfirmModal';
import BookFilters from '../../components/books/BookFilters';
import BookCard from '../../components/books/BookCard';
import Pagination from '../../components/common/Pagination';
import {
  createBook,
  deleteBook,
  searchBooks,
  updateBook,
} from '../../features/books/booksSlice';
import { fetchLibraries } from '../../features/libraries/librariesSlice';
import type { Book, CreateBookInput, UpdateBookInput, Library } from '../../types';

const PAGE_SIZE = 12;
const LIBRARIES_LIMIT = 100;

const EMPTY_FILTERS = {
  library: '',
  author: '',
  title: '',
  availableOnly: false,
};

/** Элемент выбора библиотеки с количеством экземпляров. */
interface LibraryCopiesFormItem {
  libraryId: number;
  totalCopies: number;
}

/** Модальное окно создания или редактирования книги. */
const BookFormModal = ({
  show,
  onHide,
  book,
  libraries,
  onSave,
  loading,
  error,
}: {
  show: boolean;
  onHide: () => void;
  book: Book | null;
  libraries: Library[];
  onSave: (data: CreateBookInput | UpdateBookInput) => void;
  loading: boolean;
  error: string | null;
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState(book?.title ?? '');
  const [author, setAuthor] = useState(book?.author ?? '');
  const [year, setYear] = useState(
    book?.year != null ? String(book.year) : '',
  );
  const [description, setDescription] = useState(book?.description ?? '');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  /** Объект-URL для предпросмотра выбранного файла обложки. */
  const [coverPreview, setCoverPreview] = useState<string | null>(
    book?.coverImage ?? null,
  );
  const coverPreviewRef = useRef<string | null>(null);

  // Для каждой библиотеки: libraryId и totalCopies
  const [libraryCopies, setLibraryCopies] = useState<LibraryCopiesFormItem[]>(
    book?.availability?.map((a) => ({
      libraryId: a.library.id,
      totalCopies: a.totalCopies,
    })) ?? [{ libraryId: 0, totalCopies: 1 }],
  );

  const isEdit = book !== null;

  /** Освобождаем объект-URL при размонтировании модала. */
  useEffect(() => {
    return () => {
      if (coverPreviewRef.current) {
        URL.revokeObjectURL(coverPreviewRef.current);
        coverPreviewRef.current = null;
      }
    };
  }, []);

  const revokeCoverPreview = () => {
    if (coverPreviewRef.current) {
      URL.revokeObjectURL(coverPreviewRef.current);
      coverPreviewRef.current = null;
    }
    setCoverPreview(null);
  };

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setCoverImage(file);
    revokeCoverPreview();
    if (file) {
      const url = URL.createObjectURL(file);
      coverPreviewRef.current = url;
      setCoverPreview(url);
    }
  };

  const handleRemoveCover = () => {
    setCoverImage(null);
    revokeCoverPreview();
  };

  const getCoverPreviewSrc = () => {
    if (coverPreview) return coverPreview;
    return book?.coverImage ?? null;
  };

  const addLibraryRow = () => {
    setLibraryCopies([...libraryCopies, { libraryId: 0, totalCopies: 1 }]);
  };

  const removeLibraryRow = (index: number) => {
    if (libraryCopies.length <= 1) return;
    setLibraryCopies(libraryCopies.filter((_, i) => i !== index));
  };

  const updateLibraryCopies = (index: number, field: 'libraryId' | 'totalCopies', value: number) => {
    setLibraryCopies(
      libraryCopies.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const buildInput = (): CreateBookInput | UpdateBookInput | null => {
    if (!title.trim() || !author.trim()) return null;
    if (libraryCopies.some((lc) => lc.libraryId === 0 || lc.totalCopies < 1)) {
      return null;
    }

    const data: CreateBookInput | UpdateBookInput = {
      title: title.trim(),
      author: author.trim(),
      description: description.trim() || undefined,
      libraries: libraryCopies.map((lc) => ({
        libraryId: lc.libraryId,
        totalCopies: lc.totalCopies,
      })),
    };
    if (year.trim()) {
      data.year = Number(year.trim());
    }
    if (coverImage) {
      data.coverImage = coverImage;
    }
    return data;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const data = buildInput();
    if (!data) return;
    onSave(data);
  };

  // Модал и backdrop монтируются только когда он открыт: скрытый backdrop
  // (position: fixed на весь экран) перехватывал бы клики по всей странице.
  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        style={{ display: 'block' }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {isEdit ? 'Редактирование книги' : 'Новая книга'}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onHide}
                aria-label="Закрыть"
              />
            </div>
            <div className="modal-body">
              {error && <ErrorAlert message={error} />}
              <form ref={formRef} onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Название</label>
                  <input
                    type="text"
                    className="form-control"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Название книги"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Автор</label>
                  <input
                    type="text"
                    className="form-control"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Автор книги"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Год издания</label>
                  <input
                    type="number"
                    min={1000}
                    max={2100}
                    className="form-control"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="Год издания"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Описание</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Описание книги"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Библиотеки и экземпляры</label>
                  <div className="admin-books__library-copies">
                    {libraryCopies.map((lc, index) => (
                      <div
                        key={index}
                        className="admin-books__library-copies-row d-flex gap-2 mb-2"
                      >
                        <Form.Select
                          className="form-select"
                          style={{ flex: 2, minWidth: 200 }}
                          value={lc.libraryId || ''}
                          onChange={(e) =>
                            updateLibraryCopies(index, 'libraryId', Number(e.target.value) || 0)
                          }
                          aria-label={`Библиотека ${index + 1}`}
                        >
                          <option value="">— Выберите библиотеку —</option>
                          {libraries.map((lib) => (
                            <option key={lib.id} value={lib.id}>
                              {lib.name} ({lib.address})
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control
                          type="number"
                          min={1}
                          className="form-control"
                          style={{ flex: 1, minWidth: 100 }}
                          value={lc.totalCopies}
                          onChange={(e) =>
                            updateLibraryCopies(index, 'totalCopies', Number(e.target.value) || 1)
                          }
                          placeholder="Экземпляров"
                          aria-label={`Экземпляры ${index + 1}`}
                        />
                        {libraryCopies.length > 1 && (
                          <Button
                            type="button"
                            variant="outline-danger"
                            size="sm"
                            onClick={() => removeLibraryRow(index)}
                            className="align-self-end"
                            title="Удалить библиотеку"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline-secondary"
                      size="sm"
                      onClick={addLibraryRow}
                    >
                      + Добавить библиотеку
                    </Button>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Обложка книги</label>
                  <input
                    type="file"
                    accept="image/jpeg, image/png, image/webp"
                    onChange={handleCoverChange}
                  />
                  <div className="form-text">
                    Допустимые форматы: JPEG, PNG, WEBP. Размер до 2 МБ.
                  </div>
                  {getCoverPreviewSrc() && (
                    <div className="mt-3 d-flex align-items-center gap-2">
                      <img
                        src={getCoverPreviewSrc()!}
                        alt="Предпросмотр обложки"
                        className="admin-books__cover-preview-img"
                        style={{ maxWidth: 200, maxHeight: 250 }}
                      />
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={handleRemoveCover}
                      >
                        Убрать обложку
                      </Button>
                    </div>
                  )}
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onHide}
                disabled={loading}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => formRef.current?.requestSubmit()}
                disabled={loading || libraryCopies.some((lc) => lc.libraryId === 0 || lc.totalCopies < 1)}
              >
                {loading ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
};

/** Управление книгами выбранной библиотеки: доступно только роли admin. */
const AdminBooksPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { libraryId } = (location.state as { libraryId?: number } | null) ?? {};

  const {
    items: books,
    loading: booksLoading,
    error: booksError,
    createLoading,
    createError,
    updateLoading,
    updateError,
    deleteLoading,
    deleteError,
  } = useAppSelector((state) => state.books);
  const {
    items: libraries,
    loading: librariesLoading,
    error: librariesError,
  } = useAppSelector((state) => state.libraries);

  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [offset, setOffset] = useState(0);

  const loadLibraries = useCallback(() => {
    void dispatch(fetchLibraries({ limit: LIBRARIES_LIMIT, offset: 0 }));
  }, [dispatch]);

  useEffect(() => {
    loadLibraries();
  }, [loadLibraries]);

  const load = useCallback(() => {
    if (libraryId === undefined) return;
    void dispatch(
      searchBooks({
        limit: PAGE_SIZE + 1,
        offset,
        ...filters,
        library: String(libraryId),
      }),
    );
  }, [dispatch, offset, filters, libraryId]);

  // Загружаем книги при монтировании и при смене библиотеки/фильтров.
  useEffect(() => {
    load();
  }, [load]);

  const handleApplyFilters = (next: typeof EMPTY_FILTERS) => {
    setFilters(next);
    setOffset(0);
    load();
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setOffset(0);
    load();
  };

  // Выбранная библиотека для отображения названия.
  const selectedLibrary = libraries.find((lib) => lib.id === libraryId);

  const visibleBooks = books.slice(0, PAGE_SIZE);
  const hasNext = books.length > PAGE_SIZE;

  const handleCreateOpen = () => {
    setEditingBook(null);
    setCreating(true);
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setCreating(true);
  };

  const handleSave = async (data: CreateBookInput | UpdateBookInput) => {
    try {
      if (editingBook && editingBook.id != null) {
        await dispatch(updateBook({ id: editingBook.id, data })).unwrap();
      } else {
        await dispatch(createBook(data as CreateBookInput)).unwrap();
      }
      setCreating(false);
      setEditingBook(null);
      load();
    } catch {
      // Ошибка уже в Redux (createError / updateError).
    }
  };

  const handleDelete = (book: Book) => {
    setDeleteConfirmId(book.id);
    setDeleteConfirmTitle(book.title);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmId === null) return;
    try {
      await dispatch(deleteBook(deleteConfirmId)).unwrap();
    } catch {
      // Ошибка уже в Redux.
    }
    setDeleteConfirmId(null);
    setDeleteConfirmTitle('');
  };

  // Если библиотека не выбрана — ничего не показываем.
  if (libraryId === undefined) {
    return (
      <>
        <h1 className="admin-books__heading">Книги</h1>
        <div className="admin-books__row">
          <div className="admin-books__main-column">
            <div className="alert alert-warning">
              Библиотека не выбрана. Вернитесь к
              <button
                type="button"
                className="btn btn-link btn-link--inline"
                onClick={() => navigate('/admin/libraries')}
              >
                списку библиотек
              </button>
              и выберите библиотеку двойным кликом.
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="admin-books__heading">
        Книги — {selectedLibrary?.name ?? 'библиотека'}
      </h1>

      <div className="admin-books__row">
        <div className="admin-books__main-column">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="admin-books__section-title" style={{ margin: 0 }}>
              Список книг
            </h2>
            <Button
              variant="primary"
              onClick={handleCreateOpen}
              disabled={createLoading}
            >
              {createLoading ? 'Создание…' : 'Создать книгу'}
            </Button>
          </div>

          {librariesError && <ErrorAlert message={librariesError} />}

          {librariesLoading ? (
            <Loader text="Загрузка библиотек…" />
          ) : (
            <BookFilters
              libraries={libraries}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
              hideLibraryFilter
            />
          )}

          {booksError && <ErrorAlert message={booksError} />}
          {deleteError && <ErrorAlert message={deleteError} />}

          {booksLoading ? (
            <Loader text="Загрузка книг…" />
          ) : (
            <>
              {visibleBooks.length === 0 ? (
                <div className="admin-books__empty-state">
                  <p className="admin-books__empty-message">
                    Книги не найдены.
                  </p>
                  <Button
                    variant="outline-secondary"
                    onClick={handleResetFilters}
                  >
                    Сбросить фильтры
                  </Button>
                </div>
              ) : (
                <>
                  <div className="admin-books__grid">
                    {visibleBooks.map((book) => (
                      <div
                        key={book.id}
                        className="admin-books__book-cell"
                      >
                        <BookCard book={book} />
                        <div className="d-flex gap-2 mt-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(book);
                            }}
                          >
                            Редактировать
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(book);
                            }}
                            disabled={deleteLoading}
                          >
                            Удалить
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination
                    offset={offset}
                    limit={PAGE_SIZE}
                    hasNext={hasNext}
                    onChange={setOffset}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>

      <BookFormModal
        key={
          creating
            ? editingBook
              ? `book-${editingBook.id}`
              : 'create'
            : 'closed'
        }
        show={creating}
        onHide={() => {
          setCreating(false);
          setEditingBook(null);
        }}
        book={editingBook}
        libraries={libraries}
        onSave={handleSave}
        loading={createLoading || updateLoading}
        error={createError || updateError}
      />

      <ConfirmModal
        show={deleteConfirmId !== null}
        onHide={() => {
          setDeleteConfirmId(null);
          setDeleteConfirmTitle('');
        }}
        onConfirm={handleConfirmDelete}
        title="Удаление книги"
        message={
          deleteConfirmId !== null
            ? `Вы уверены, что хотите удалить книгу «${deleteConfirmTitle}»? Это действие нельзя отменить.`
            : ''
        }
        confirmLabel="Удалить"
        loading={deleteLoading}
      />
    </>
  );
};

export default AdminBooksPage;
