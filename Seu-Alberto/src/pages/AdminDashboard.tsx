import { useEffect, useState, type FormEvent } from 'react'
import styles from './login.module.css'
import dog1Image from '../img/dogs/dog1.png'
import dog2Image from '../img/dogs/dog2.png'
import dog3Image from '../img/dogs/dog3.png'
import dog4Image from '../img/dogs/dog4.png'
import dog5Image from '../img/dogs/dog5.png'
import dog6Image from '../img/dogs/dog6.png'
import {
  adminAction,
  loadAdoptions,
  loadAnimals,
  logoutAdmin,
  saveAnimal,
  type AdoptionRequest,
  type Animal,
} from '../lib/api'

const demoImages: Record<string, string> = {
  'demo:dog1': dog1Image,
  'demo:dog2': dog2Image,
  'demo:dog3': dog3Image,
  'demo:dog4': dog4Image,
  'demo:dog5': dog5Image,
  'demo:dog6': dog6Image,
}

function emptyAnimal(): Omit<Animal, 'likes' | 'comments' | 'shares'> {
  return {
    id: '',
    name: '',
    age: '',
    physicalTraits: '',
    temperament: '',
    image: '',
    imageAlt: '',
  }
}

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [animals, setAnimals] = useState<Animal[]>([])
  const [adoptions, setAdoptions] = useState<AdoptionRequest[]>([])
  const [editingAnimal, setEditingAnimal] = useState<
    Omit<Animal, 'likes' | 'comments' | 'shares'> | null
  >(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function refreshDashboard() {
    const [nextAnimals, nextAdoptions] = await Promise.all([loadAnimals(), loadAdoptions()])
    setAnimals(nextAnimals)
    setAdoptions(nextAdoptions)
  }

  useEffect(() => {
    Promise.all([loadAnimals(), loadAdoptions()])
      .then(([nextAnimals, nextAdoptions]) => {
        setAnimals(nextAnimals)
        setAdoptions(nextAdoptions)
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Falha ao carregar os dados.')
      })
      .finally(() => setLoading(false))
  }, [])

  async function performAction(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
      await refreshDashboard()
      setMessage(successMessage)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar as alterações.')
    } finally {
      setBusy(false)
    }
  }

  async function handleAnimalSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingAnimal) return
    const animalForm = event.currentTarget
    const form = new FormData(animalForm)
    const imageFile = form.get('imageFile')
    const animal = {
      ...editingAnimal,
      name: String(form.get('name') || ''),
      age: String(form.get('age') || ''),
      physicalTraits: String(form.get('physicalTraits') || ''),
      temperament: String(form.get('temperament') || ''),
      imageAlt: String(form.get('imageAlt') || ''),
      imageFile: imageFile instanceof File && imageFile.size > 0 ? imageFile : undefined,
    }
    await performAction(async () => {
      await saveAnimal(animal)
      setEditingAnimal(null)
      animalForm.reset()
    }, 'Perfil do animal salvo.')
  }

  async function handleLogout() {
    try {
      await logoutAdmin()
      onLogout()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível encerrar a sessão.')
    }
  }

  return (
    <main className={styles.adminPage}>
      <div className={styles.adminHeader}>
        <div>
          <p className={styles.eyebrow}>Painel protegido</p>
          <h1>Gerenciar o abrigo</h1>
          <p>Cadastre animais, modere interações e acompanhe os pedidos de adoção.</p>
        </div>
        <button className={styles.secondaryButton} disabled={busy} onClick={handleLogout} type="button">
          Sair
        </button>
      </div>

      {error && <p aria-live="polite" className={styles.errorMessage} role="alert">{error}</p>}
      {message && <p aria-live="polite" className={styles.formMessage} role="status">{message}</p>}
      {loading ? (
        <p>Carregando dados do abrigo...</p>
      ) : (
        <>
          <section aria-labelledby="animals-admin-title" className={styles.adminSection}>
            <div className={styles.adminSectionHeading}>
              <h2 id="animals-admin-title">Animais</h2>
              <button
                className={styles.adminPrimaryButton}
                disabled={busy}
                onClick={() => {
                  setEditingAnimal(emptyAnimal())
                  setError('')
                  setMessage('')
                }}
                type="button"
              >
                Adicionar animal
              </button>
            </div>

            {editingAnimal && (
              <form className={styles.animalEditor} onSubmit={handleAnimalSave}>
                <h3>{editingAnimal.id ? 'Editar perfil' : 'Novo perfil'}</h3>
                <div className={styles.adminFormGrid}>
                  <label>
                    Nome
                    <input autoComplete="off" maxLength={100} name="name" required value={editingAnimal.name} onChange={(event) => setEditingAnimal({ ...editingAnimal, name: event.target.value })} />
                  </label>
                  <label>
                    Idade
                    <input maxLength={50} name="age" required value={editingAnimal.age} onChange={(event) => setEditingAnimal({ ...editingAnimal, age: event.target.value })} />
                  </label>
                  <label>
                    Características físicas
                    <textarea maxLength={500} name="physicalTraits" required rows={3} value={editingAnimal.physicalTraits} onChange={(event) => setEditingAnimal({ ...editingAnimal, physicalTraits: event.target.value })} />
                  </label>
                  <label>
                    Personalidade
                    <textarea maxLength={500} name="temperament" required rows={3} value={editingAnimal.temperament} onChange={(event) => setEditingAnimal({ ...editingAnimal, temperament: event.target.value })} />
                  </label>
                  <label>
                    Texto alternativo da foto
                    <input maxLength={200} name="imageAlt" required value={editingAnimal.imageAlt} onChange={(event) => setEditingAnimal({ ...editingAnimal, imageAlt: event.target.value })} />
                  </label>
                  <label>
                    Foto (JPG, PNG ou WebP; até 5 MB){editingAnimal.image ? ' — opcional para manter a foto atual' : ''}
                    <input accept="image/jpeg,image/png,image/webp" name="imageFile" required={!editingAnimal.image} type="file" />
                  </label>
                </div>
                <div className={styles.adminButtons}>
                  <button className={styles.adminPrimaryButton} disabled={busy} type="submit">
                    Salvar perfil
                  </button>
                  <button className={styles.secondaryButton} onClick={() => setEditingAnimal(null)} type="button">
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {animals.length === 0 ? (
              <p className={styles.emptyState}>Nenhum perfil cadastrado.</p>
            ) : (
              <div className={styles.adminAnimalList}>
                {animals.map((animal) => (
                  <article className={styles.adminAnimalCard} key={animal.id}>
                    <img
                      alt={animal.imageAlt}
                      src={demoImages[animal.image] ?? animal.image}
                    />
                    <div className={styles.adminAnimalContent}>
                      <h3>{animal.name}</h3>
                      <p>{animal.age} · {animal.physicalTraits}</p>
                      <p>
                        {animal.likes.length} curtidas · {animal.comments.length} comentários · {animal.shares} compartilhamentos
                      </p>
                      <div className={styles.adminButtons}>
                        <button className={styles.secondaryButton} disabled={busy} onClick={() => setEditingAnimal(animal)} type="button">
                          Editar perfil
                        </button>
                        <button
                          className={styles.secondaryButton}
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(`Excluir o perfil de ${animal.name}?`)) {
                              void performAction(
                                () => adminAction('delete-animal', { animalId: animal.id }),
                                'Perfil excluído.',
                              )
                            }
                          }}
                          type="button"
                        >
                          Excluir
                        </button>
                        <button
                          className={styles.secondaryButton}
                          disabled={busy || (animal.likes.length === 0 && animal.comments.length === 0 && animal.shares === 0)}
                          onClick={() => {
                            if (window.confirm(`Limpar todas as interações de ${animal.name}?`)) {
                              void performAction(
                                () => adminAction('clear-interactions', { animalId: animal.id }),
                                'Interações removidas.',
                              )
                            }
                          }}
                          type="button"
                        >
                          Limpar interações
                        </button>
                      </div>
                      {animal.comments.length > 0 && (
                        <ul className={styles.moderationList}>
                          {animal.comments.map((comment) => (
                            <li key={comment.id}>
                              <span><strong>{comment.name}:</strong> {comment.message}</span>
                              <button
                                aria-label={`Excluir comentário de ${comment.name}`}
                                disabled={busy}
                                onClick={() => void performAction(
                                  () => adminAction('delete-comment', {
                                    animalId: animal.id,
                                    commentId: comment.id,
                                  }),
                                  'Comentário excluído.',
                                )}
                                type="button"
                              >
                                Excluir comentário
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="adoptions-title" className={styles.adminSection}>
            <h2 id="adoptions-title">Pedidos de adoção</h2>
            {adoptions.length === 0 ? (
              <p className={styles.emptyState}>Ainda não há pedidos de adoção.</p>
            ) : (
              <div className={styles.adoptionList}>
                {adoptions.map((request) => (
                  <article className={styles.adoptionRecord} key={request.id}>
                    <div>
                      <h3>{request.animalName} — {request.name}</h3>
                      <p>
                        {request.age} anos · {request.city}, {request.neighborhood}
                      </p>
                      <p>
                        <a href={`mailto:${request.email}`}>{request.email}</a> ·{' '}
                        <a href={`tel:${request.phone}`}>{request.phone}</a>
                      </p>
                      <small>
                        Enviado em {new Date(request.createdAt).toLocaleString('pt-BR')}
                      </small>
                    </div>
                    <button
                      className={styles.secondaryButton}
                      disabled={busy || request.status === 'contacted'}
                      onClick={() => void performAction(
                        () => adminAction('update-adoption', {
                          id: request.id,
                          status: 'contacted',
                        }),
                        'Pedido marcado como contatado.',
                      )}
                      type="button"
                    >
                      {request.status === 'contacted' ? 'Contatado' : 'Marcar contatado'}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
