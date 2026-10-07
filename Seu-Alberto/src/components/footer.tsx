import styles from './footer.module.css'
import dogFooterImage from '../img/dogfooter.png'

const contactLinks = [
  {
    label: 'Instagram',
    href: import.meta.env.VITE_INSTAGRAM_URL,
    external: true,
  },
  {
    label: 'WhatsApp',
    href: import.meta.env.VITE_WHATSAPP_URL,
    external: true,
  },
  {
    label: 'E-mail',
    href: import.meta.env.VITE_CONTACT_EMAIL,
    external: false,
  },
]

export function Footer() {
  return (
    <footer className={styles.footerContainer}>
      <div className={styles.footerContent}>
        <div className={styles.footerBrand}>
          <img src={dogFooterImage} alt="" />
          <div>
            <strong>Abrigo do Seu Alberto</strong>
            <p>Todo animal merece um lar cheio de carinho.</p>
          </div>
        </div>
        <nav aria-label="Redes sociais e contato" className={styles.footerLinks}>
          <span className={styles.footerLabel}>Acompanhe e fale com a gente</span>
          <ul>
            {contactLinks.map((link) => {
              const configuredHref =
                typeof link.href === 'string' ? link.href.trim() : ''
              const href =
                link.label === 'E-mail' && configuredHref
                  ? configuredHref.startsWith('mailto:')
                    ? configuredHref
                    : `mailto:${configuredHref}`
                  : configuredHref

              return (
                <li key={link.label}>
                  {href ? (
                    <a
                      href={href}
                      rel={link.external ? 'noreferrer' : undefined}
                      target={link.external ? '_blank' : undefined}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <span aria-disabled="true" className={styles.unconfiguredLink}>
                      {link.label}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
      <p className={styles.copyright}>
        © {new Date().getFullYear()} Abrigo do Seu Alberto. Todos os direitos
        reservados.
      </p>
    </footer>
  )
}