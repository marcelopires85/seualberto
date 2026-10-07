import { Link } from 'react-router-dom'
import styles from './navbar.module.css'
import logoImage from '../img/logo.png'
import loginImage from '../img/login.png'

export function Navbar() {
  return (
    <header className={styles.siteHeader}>
      <nav aria-label="Navegação principal" className={styles.navbarContainer}>
        <Link aria-label="Abrigo do Seu Alberto — página inicial" className={styles.brand} to="/">
          <img src={logoImage} alt="" />
          <span>Abrigo do Seu Alberto</span>
        </Link>
        <Link className={styles.navbarLogin} to="/login">
          <img src={loginImage} alt="" />
          <span>Acesso da administração</span>
        </Link>
      </nav>
    </header>
  )
}
