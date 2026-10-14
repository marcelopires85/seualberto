import { useEffect, useRef, useState, type FormEvent } from 'react'
import styles from './section.module.css'
import collarImage from '../img/coleirasection.png'
import dog1Image from '../img/dogs/dog1.png'
import dog2Image from '../img/dogs/dog2.png'
import dog3Image from '../img/dogs/dog3.png'
import dog4Image from '../img/dogs/dog4.png'
import dog5Image from '../img/dogs/dog5.png'
import dog6Image from '../img/dogs/dog6.png'
import {
  loadAnimals,
  submitAdoption,
  submitInteraction,
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

function demoAnimals(): Animal[] {
  return Object.entries(demoImages).map(([image], index) => ({
    id: `demo-${index + 1}`,
    name: `Pet ${index + 1}`,
    age: 'Idade a confirmar',
    physicalTraits: 'Porte e características físicas em atualização.',
    temperament: 'Estamos conhecendo sua personalidade.',
    image,
    imageAlt: `Cão disponível para adoção, perfil demonstrativo ${index + 1}`,
    likes: [],
    comments: [],
    shares: 0,
  }))
}

function imageSource(image: string) {
  return demoImages[image] ?? image
}

function visitorId() {
  const storageKey = 'seu-alberto-visitor-id'
  try {
    const existingId = localStorage.getItem(storageKey)
    if (existingId) return existingId
    const newId = crypto.randomUUID()
    localStorage.setItem(storageKey, newId)
    return newId
  } catch {
    return crypto.randomUUID()
  }
}

export function AnimalSection() {
  const [animals, setAnimals] = useState<Animal[]>(demoAnimals)
  const [currentVisitorId] = useState(visitorId)
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null)
  const [submissionMessage, setSubmissionMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [busyAnimalId, setBusyAnimalId] = useState('')
  const adoptionDialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    loadAnimals()
      .then((loadedAnimals) => {
        setAnimals(loadedAnimals)
        setErrorMessage('')
      })
      .catch((error: unknown) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os animais do abrigo.',
        )
      })
  }, [])

  useEffect(() => {
    if (selectedAnimal && !adoptionDialog.current?.open) {
      adoptionDialog.current?.showModal()
    }
  }, [selectedAnimal])

  function closeAdoptionDialog() {
    adoptionDialog.current?.close()
    setSelectedAnimal(null)
    setSubmissionMessage('')
  }

  async function updateInteraction(
    animal: Animal,
    action: 'like' | 'comment' | 'share',
    values: Record<string, string>,
  ): Promise<boolean> {
    setBusyAnimalId(animal.id)
    setErrorMessage('')
    try {
      const result = await submitInteraction(action, {
        ...values,
        animalId: animal.id,
      })
      setAnimals((current) =>
        current.map((item) => (item.id === result.data.id ? result.data : item)),
      )
      return true
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível salvar a interação.',
      )
      return false
    } finally {
      setBusyAnimalId('')
    }
  }

  async function handleCommentSubmit(
    event: FormEvent<HTMLFormElement>,
    animal: Animal,
  ) {
    event.preventDefault()
    const commentForm = event.currentTarget
    const form = new FormData(commentForm)
    const name = String(form.get('name') || '')
    const message = String(form.get('message') || '')
    if (await updateInteraction(animal, 'comment', { name, message })) {
      commentForm.reset()
    }
  }

  async function handleShare(animal: Animal) {
    const shareUrl = `${window.location.origin}${window.location.pathname}#animais`
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${animal.name} está procurando um lar`,
          text: 'Conheça este animal disponível para adoção no Abrigo do Seu Alberto.',
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
      }
      await updateInteraction(animal, 'share', {})
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível compartilhar esta publicação.',
      )
    }
  }

  async function handleAdoptionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedAnimal) return

    const adoptionForm = event.currentTarget
    const form = new FormData(adoptionForm)
    const values = {
      animalId: selectedAnimal.id,
      name: String(form.get('name') || ''),
      age: String(form.get('age') || ''),
      city: String(form.get('city') || ''),
      neighborhood: String(form.get('neighborhood') || ''),
      email: String(form.get('email') || ''),
      phone: String(form.get('phone') || ''),
    }
    setBusyAnimalId(selectedAnimal.id)
    setSubmissionMessage('')
    try {
      const result = await submitAdoption(values)
      setSubmissionMessage(result.message || 'Interesse salvo.')
      adoptionForm.reset()
    } catch (error) {
      setSubmissionMessage(
        error instanceof Error ? error.message : 'Não foi possível enviar seu interesse.',
      )
    } finally {
      setBusyAnimalId('')
    }
  }

  return (
    <main>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Um novo melhor amigo está esperando</p>
          <div className={styles.sectionTitle}>
            <h1>Encontre seu companheiro</h1>
          </div>
          <p className={styles.heroDescription}>
            Conheça os cães do Abrigo do Seu Alberto e descubra quem combina
            com a sua família.
          </p>
          <img className={styles.heroCollarImage} src={collarImage} alt="" />
          <a className={styles.heroLink} href="#animais">
            Ver animais disponíveis
          </a>
        </div>
      </section>

      <section className={styles.sectionDogs} id="animais">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Adoção responsável</p>
          <h2>Cães esperando por um lar</h2>
          <p>
            Conheça os animais disponíveis e ajude cada publicação a chegar à
            família certa.
          </p>
        </div>

        {errorMessage && (
          <p aria-live="polite" className={styles.errorMessage} role="alert">
            {errorMessage}
          </p>
        )}

        {animals.length === 0 ? (
          <p className={styles.emptyState}>No momento não há animais cadastrados.</p>
        ) : (
          <div className={styles.dogGallery}>
            {animals.map((animal) => {
              const visitorHasLiked = animal.likes.includes(currentVisitorId)
              const busy = busyAnimalId === animal.id
              return (
                <article className={styles.dogCard} key={animal.id}>
                  <div className={styles.dogImageWrapper}>
                    <img
                      className={styles.dogImage}
                      src={imageSource(animal.image)}
                      alt={animal.imageAlt}
                    />
                    <span className={styles.dogBadge}>Disponível para adoção</span>
                  </div>
                  <div className={styles.dogDetails}>
                    <div className={styles.dogTitle}>
                      <h3>{animal.name}</h3>
                      <span>{animal.age}</span>
                    </div>
                    <dl className={styles.animalAttributes}>
                      <div>
                        <dt>Características</dt>
                        <dd>{animal.physicalTraits}</dd>
                      </div>
                      <div>
                        <dt>Jeitinho</dt>
                        <dd>{animal.temperament}</dd>
                      </div>
                    </dl>
                    <div className={styles.socialActions}>
                      <button
                        aria-pressed={visitorHasLiked}
                        disabled={busy}
                        onClick={() =>
                          updateInteraction(animal, 'like', { visitorId: currentVisitorId })
                        }
                        type="button"
                      >
                        {visitorHasLiked ? 'Curtido' : 'Curtir'} ({animal.likes.length})
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => handleShare(animal)}
                        type="button"
                      >
                        Compartilhar ({animal.shares})
                      </button>
                    </div>
                    <section aria-label={`Comentários sobre ${animal.name}`} className={styles.comments}>
                      <h4>Comentários ({animal.comments.length})</h4>
                      {animal.comments.length > 0 && (
                        <ul>
                          {animal.comments.map((comment) => (
                            <li key={comment.id}>
                              <strong>{comment.name}</strong>
                              <p>{comment.message}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                      <form
                        className={styles.commentForm}
                        onSubmit={(event) => handleCommentSubmit(event, animal)}
                      >
                        <label>
                          Seu nome
                          <input maxLength={80} name="name" required />
                        </label>
                        <label>
                          Comentário
                          <textarea maxLength={1000} name="message" required rows={2} />
                        </label>
                        <button disabled={busy} type="submit">
                          Comentar
                        </button>
                      </form>
                    </section>
                    <button
                      className={styles.adoptButton}
                      onClick={() => {
                        setSelectedAnimal(animal)
                        setSubmissionMessage('')
                      }}
                      type="button"
                    >
                      Quero adotar
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <dialog
        aria-labelledby="adoption-title"
        className={styles.adoptionDialog}
        onClose={() => {
          setSelectedAnimal(null)
          setSubmissionMessage('')
        }}
        ref={adoptionDialog}
      >
        <div className={styles.dialogHeader}>
          <div>
            <p className={styles.eyebrow}>Formulário de interesse</p>
            <h2 id="adoption-title">
              {selectedAnimal ? `Adotar ${selectedAnimal.name}` : 'Quero adotar'}
            </h2>
          </div>
          <button
            aria-label="Fechar formulário"
            className={styles.closeButton}
            onClick={closeAdoptionDialog}
            type="button"
          >
            ×
          </button>
        </div>
        <p className={styles.formIntroduction}>
          Conte um pouco sobre você para que a equipe do abrigo possa entrar em
          contato.
        </p>
        <form className={styles.adoptionForm} onSubmit={handleAdoptionSubmit}>
          <label>
            Nome completo
            <input autoComplete="name" maxLength={120} name="name" required />
          </label>
          <label>
            Idade
            <input min="1" max="120" name="age" required type="number" />
          </label>
          <div className={styles.formRow}>
            <label>
              Cidade
              <input autoComplete="address-level2" maxLength={100} name="city" required />
            </label>
            <label>
              Bairro
              <input autoComplete="address-level3" maxLength={100} name="neighborhood" required />
            </label>
          </div>
          <label>
            E-mail
            <input autoComplete="email" maxLength={254} name="email" required type="email" />
          </label>
          <label>
            Telefone para contato
            <input autoComplete="tel" maxLength={30} name="phone" required type="tel" />
          </label>
          <button
            className={styles.adoptButton}
            disabled={Boolean(selectedAnimal && busyAnimalId === selectedAnimal.id)}
            type="submit"
          >
            Enviar interesse
          </button>
          {submissionMessage && (
            <p aria-live="polite" className={styles.formMessage} role="status">
              {submissionMessage}
            </p>
          )}
        </form>
      </dialog>
    </main>
  )
}
