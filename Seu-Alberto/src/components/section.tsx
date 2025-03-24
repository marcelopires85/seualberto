import styles from './section.module.css'

export function Section() {
    return (
      <section>
        <div className={styles.sectionTitle}>
        <h1>Cachorros para Adoção</h1>
        <img src="./src/img/coleirasection.png" alt="Logo de coleira" />
        </div>
  
        <div className={styles.sectionDogs}>
          <h2>Fotos dos Cachorros</h2>
          <img src="./src/img/dogs/dog1.png" alt="" />
          <img src="./src/img/dogs/dog2.png" alt="" />
          <img src="./src/img/dogs/dog3.png" alt="" />
          
        </div>
      </section>
    );
  }
  