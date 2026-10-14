import { useEffect, useState, type FormEvent } from 'react'
import styles from './login.module.css'
import loginImage from '../img/login.png'
import { AdminDashboard } from './AdminDashboard'
import { loadAdminData, loginAdmin } from '../lib/api'

export function Login() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAdminData()
      .then(({ authenticated: hasSession }) => setAuthenticated(hasSession))
      .catch((reason: unknown) => {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Não foi possível conectar ao servidor do abrigo.',
        )
      })
      .finally(() => setCheckingSession(false))
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      await loginAdmin(String(form.get('email') || ''), String(form.get('password') || ''))
      setAuthenticated(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.')
    } finally {
      setBusy(false)
    }
  }

  if (checkingSession) {
    return <main className={styles.loginPage}><p>Verificando sessão...</p></main>
  }
  if (authenticated) {
    return <AdminDashboard onLogout={() => setAuthenticated(false)} />
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
          <button disabled={busy} type="submit">
            {busy ? 'Entrando...' : 'Entrar'}
          </button>
          {error && <p aria-live="polite" className={styles.errorMessage} role="alert">{error}</p>}
        </form>
      </section>
    </main>
  )
}
