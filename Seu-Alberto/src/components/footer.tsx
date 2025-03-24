import styles from './footer.module.css'

export function Footer() {
    return (
      <div className={styles.footerContainer}>
        <p>Alguns direitos Reservados - 2025</p>
        <img src="./src/img/dogfooter.png" alt="Logo de cachorro" />
      </div>
    );
  }
  