import { useEffect, useRef, useState, type FormEvent } from 'react'
import styles from './section.module.css'
import collarImage from '../img/coleirasection.png'
import dog1Image from '../img/dogs/dog1.png'
import dog2Image from '../img/dogs/dog2.png'
import dog3Image from '../img/dogs/dog3.png'
import dog4Image from '../img/dogs/dog4.png'
import dog5Image from '../img/dogs/dog5.png'
import dog6Image from '../img/dogs/dog6.png'

type Animal = {
  id: number
  name: string
  age: string
  physicalTraits: string
  temperament: string
  image: string
  imageAlt: string
}

const animals: Animal[] = [
  {
    id: 1,
    name: 'Pet 1',
    age: 'Idade a confirmar',
    physicalTraits: 'Porte e características físicas em atualização.',
    temperament: 'Estamos conhecendo sua personalidade.',
    image: dog1Image,
    imageAlt: 'Cão disponível para adoção, perfil demonstrativo 1',
  },
  {
    id: 2,
    name: 'Pet 2',
    age: 'Idade a confirmar',
    physicalTraits: 'Porte e características físicas em atualização.',
    temperament: 'Estamos conhecendo sua personalidade.',
    image: dog2Image,
    imageAlt: 'Cão disponível para adoção, perfil demonstrativo 2',
  },
  {
    id: 3,
    name: 'Pet 3',
    age: 'Idade a confirmar',
    physicalTraits: 'Porte e características físicas em atualização.',
    temperament: 'Estamos conhecendo sua personalidade.',
    image: dog3Image,
    imageAlt: 'Cão disponível para adoção, perfil demonstrativo 3',
  },
  {
    id: 4,
    name: 'Pet 4',
    age: 'Idade a confirmar',
    physicalTraits: 'Porte e características físicas em atualização.',
    temperament: 'Estamos conhecendo sua personalidade.',
    image: dog4Image,
    imageAlt: 'Cão disponível para adoção, perfil demonstrativo 4',
  },
  {
    id: 5,
    name: 'Pet 5',
    age: 'Idade a confirmar',
    physicalTraits: 'Porte e características físicas em atualização.',
    temperament: 'Estamos conhecendo sua personalidade.',
    image: dog5Image,
    imageAlt: 'Cão disponível para adoção, perfil demonstrativo 5',
  },
  {
    id: 6,
    name: 'Pet 6',
    age: 'Idade a confirmar',
    physicalTraits: 'Porte e características físicas em atualização.',
    temperament: 'Estamos conhecendo sua personalidade.',
    image: dog6Image,
    imageAlt: 'Cão disponível para adoção, perfil demonstrativo 6',
  },
]

export function Section() {
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null)
  const [submissionMessage, setSubmissionMessage] = useState('')
  const adoptionDialog = useRef<HTMLDialogElement>(null)

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

  function handleAdoptionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmissionMessage(
      'Formulário demonstrativo preenchido. O envio será conectado na Etapa 3.',
    )
  }

  return (
    <main>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Um novo melhor amigo está esperando</p>
          <div className={styles.sectionTitle}>
            <h1>Encontre seu companheiro</h1>
            <img src={collarImage} alt="" />
          </div>
          <p className={styles.heroDescription}>
            Conheça os cães do Abrigo do Seu Alberto e descubra quem combina
            com a sua família.
          </p>
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
            Os perfis abaixo são demonstrativos. As informações reais de cada
            animal poderão ser cadastradas pelo abrigo.
          </p>
        </div>

        <div className={styles.dogGallery}>
          {animals.map((animal) => (
            <article className={styles.dogCard} key={animal.id}>
              <div className={styles.dogImageWrapper}>
                <img
                  className={styles.dogImage}
                  src={animal.image}
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
          ))}
        </div>
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
            <input autoComplete="name" name="name" required />
          </label>
          <label>
            Idade
            <input min="1" name="age" required type="number" />
          </label>
          <div className={styles.formRow}>
            <label>
              Cidade
              <input autoComplete="address-level2" name="city" required />
            </label>
            <label>
              Bairro
              <input autoComplete="address-level3" name="neighborhood" required />
            </label>
          </div>
          <label>
            E-mail
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label>
            Telefone para contato
            <input
              autoComplete="tel"
              name="phone"
              required
              type="tel"
            />
          </label>
          <button className={styles.adoptButton} type="submit">
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
