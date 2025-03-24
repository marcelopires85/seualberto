import styles from './navbar.module.css'

export function Navbar() {
    return (
      <nav> 
        <div className={styles.navbarContainer}>
          <img src="./src/img/logo.png" alt="Logo do Abrigo" />
          <span>Abrigo do Seu Alberto</span>
         
         <div className={styles.navbarLogin}>
         <img src="./src/img/login.png" alt="Ícone de login" />
         </div>
        </div>
      </nav>
    );
  }
  