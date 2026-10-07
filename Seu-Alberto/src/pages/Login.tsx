import { useState, type FormEvent } from 'react'
import styles from './login.module.css'
import loginImage from '../img/login.png'

export function Login() {
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(
      'A tela está pronta. A autenticação da administração será conectada na Etapa 3.',
    )
  }

  return (
    <main className={styles.loginPage}>
      <section aria-labelledby="login-title" className={styles.loginCard}>
        <div className={styles.loginIcon}>
          <img src={loginImage} alt="" />
        </div>
        <p className={styles.eyebrow}>Área restrita</p>
        <h1 id="login-title">Acesso da administração</h1>
        <p className={styles.introduction}>
          Entre para gerenciar os perfis dos animais do abrigo.
        </p>
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <label>
            E-mail
            <input
              autoComplete="username"
              name="email"
              placeholder="admin@exemplo.com"
              required
              type="email"
            />
          </label>
          <label>
            Senha
            <input
              autoComplete="current-password"
              name="password"
              placeholder="Digite sua senha"
              required
              type="password"
            />
          </label>
          <button type="submit">Entrar</button>
          {message && (
            <p aria-live="polite" className={styles.formMessage} role="status">
              {message}
            </p>
          )}
        </form>
      </section>
    </main>
  )
}
