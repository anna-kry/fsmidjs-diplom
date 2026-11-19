import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import ErrorAlert from '../../components/common/ErrorAlert';
import Loader from '../../components/common/Loader';
import ConfirmModal from '../../components/common/ConfirmModal';
import {
  createLibrary,
  deleteLibrary,
  fetchLibraries,
  updateLibrary,
} from '../../features/libraries/librariesSlice';
import type { CreateLibraryInput, Library, UpdateLibraryInput } from '../../types';

const PAGE_SIZE = 20;

interface LibraryRowActionsProps {
  library: Library;
  onEdit: (library: Library) => void;
  onDelete: (library: Library) => void;
  deleteLoading: boolean;
}

const LibraryRowActions = ({
  library,
  onEdit,
  onDelete,
  deleteLoading,
}: LibraryRowActionsProps) => {
  const handleEdit = () => onEdit(library);
  const handleDelete = () => onDelete(library);

  return (
    <td>
      <div className="d-flex gap-2">
        <Button
          variant="outline-primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit();
          }}
          disabled={deleteLoading}
        >
          Редактировать
        </Button>
        <Button
          variant="outline-danger"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={deleteLoading}
        >
          Удалить
        </Button>
      </div>
    </td>
  );
};

/** Модальное окно создания или редактирования библиотеки. */
const LibraryFormModal = ({
  show,
  onHide,
  library,
  onSave,
  loading,
  error,
}: {
  show: boolean;
  onHide: () => void;
  library: Library | null;
  onSave: (data: CreateLibraryInput | UpdateLibraryInput) => void;
  loading: boolean;
  error: string | null;
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(library?.name ?? '');
  const [address, setAddress] = useState(library?.address ?? '');
  const [description, setDescription] = useState(library?.description ?? '');

  const isEdit = library !== null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const data: CreateLibraryInput | UpdateLibraryInput = {
      name: name.trim(),
      address: address.trim(),
      description: description.trim() || undefined,
    };
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
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {isEdit ? 'Редактирование библиотеки' : 'Новая библиотека'}
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Название библиотеки"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Адрес</label>
                  <input
                    type="text"
                    className="form-control"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Адрес библиотеки"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Описание</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Описание библиотеки"
                  />
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
                disabled={loading}
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

/** Управление библиотеками: доступно только роли admin. */
const AdminLibrariesPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    items,
    loading,
    error,
    createLoading,
    createError,
    updateLoading,
    updateError,
    deleteLoading,
    deleteError,
  } = useAppSelector((state) => state.libraries);

  const [editingLibrary, setEditingLibrary] = useState<Library | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  const load = useCallback(() => {
    void dispatch(fetchLibraries({ limit: PAGE_SIZE, offset: 0 }));
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateOpen = () => {
    setEditingLibrary(null);
    setCreating(true);
  };

  const handleEdit = (library: Library) => {
    setEditingLibrary(library);
    setCreating(true);
  };

  const handleSave = async (data: CreateLibraryInput | UpdateLibraryInput) => {
    try {
      if (editingLibrary) {
        await dispatch(updateLibrary({ id: editingLibrary.id, data })).unwrap();
      } else {
        await dispatch(createLibrary(data as CreateLibraryInput)).unwrap();
      }
      setCreating(false);
      setEditingLibrary(null);
      load();
    } catch {
      // Ошибка уже в Redux (createError / updateError).
    }
  };

  const handleDelete = (library: Library) => {
    setDeleteConfirmId(library.id);
    setDeleteConfirmName(library.name);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmId === null) return;
    try {
      await dispatch(deleteLibrary(deleteConfirmId)).unwrap();
    } catch {
      // Ошибка уже в Redux.
    }
    setDeleteConfirmId(null);
    setDeleteConfirmName('');
  };

  const handleLibraryDoubleClick = (library: Library) => {
    navigate('/admin/books', { state: { libraryId: library.id } });
  };

  return (
    <>
      <h1 className="admin-libraries__heading">Библиотеки</h1>

      <div className="admin-libraries__row">
        <div className="admin-libraries__main-column">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="admin-libraries__section-title" style={{ margin: 0 }}>
              Список библиотек
            </h2>
            <Button
              variant="primary"
              onClick={handleCreateOpen}
              disabled={createLoading}
            >
              {createLoading ? 'Создание…' : 'Создать библиотеку'}
            </Button>
          </div>

          {error && <ErrorAlert message={error} />}
          {deleteError && <ErrorAlert message={deleteError} />}

          {loading ? (
            <Loader text="Загрузка библиотек…" />
          ) : (
            <>
              {items.length === 0 ? (
                <p className="admin-libraries__empty-message">
                  Библиотеки не найдены.
                </p>
              ) : (
                <table className="table admin-libraries__table">
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Название</th>
                      <th scope="col">Адрес</th>
                      <th scope="col">Описание</th>
                      <th scope="col">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((library) => (
                      <tr
                        key={library.id}
                        onDoubleClick={() =>
                          handleLibraryDoubleClick(library)
                        }
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{library.id}</td>
                        <td>{library.name}</td>
                        <td>{library.address}</td>
                        <td>{library.description || '—'}</td>
                        <LibraryRowActions
                          library={library}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          deleteLoading={deleteLoading}
                        />
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>

      <LibraryFormModal
        key={
          creating
            ? editingLibrary
              ? `library-${editingLibrary.id}`
              : 'create'
            : 'closed'
        }
        show={creating}
        onHide={() => {
          setCreating(false);
          setEditingLibrary(null);
        }}
        library={editingLibrary}
        onSave={handleSave}
        loading={createLoading || updateLoading}
        error={createError || updateError}
      />

      <ConfirmModal
        show={deleteConfirmId !== null}
        onHide={() => {
          setDeleteConfirmId(null);
          setDeleteConfirmName('');
        }}
        onConfirm={handleConfirmDelete}
        title="Удаление библиотеки"
        message={
          deleteConfirmId !== null
            ? `Вы уверены, что хотите удалить библиотеку «${deleteConfirmName}»? Это действие нельзя отменить.`
            : ''
        }
        confirmLabel="Удалить"
        loading={deleteLoading}
      />
    </>
  );
};

export default AdminLibrariesPage;
