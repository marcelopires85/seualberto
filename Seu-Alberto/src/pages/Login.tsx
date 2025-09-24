export function Login() {
  return (
    <div className="login-page">
      <h1>Página de Login</h1>
      {/* Seu formulário de login aqui */}
      <form>
        <input type="email" placeholder="E-mail" />
        <input type="password" placeholder="Senha" />
        <button type="submit">Entrar</button>
      </form>
    </div>
  )
}