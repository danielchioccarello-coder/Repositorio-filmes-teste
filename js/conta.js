// Entrar, criar conta e sair. Recebe o cliente do Supabase (nos testes, um de mentira).

const ERROS = {
  invalid_credentials: "E-mail ou senha incorretos.",
  user_already_exists: "Esse e-mail já tem conta. Que tal entrar?",
  email_exists: "Esse e-mail já tem conta. Que tal entrar?",
  weak_password: "A senha precisa ter pelo menos 6 caracteres.",
  email_address_invalid: "Digite um e-mail válido.",
  validation_failed: "Digite um e-mail válido.",
  // Conta criada com a confirmação por e-mail ainda ligada (o link confirma mesmo que a página depois não abra)
  email_not_confirmed:
    'Esse e-mail ainda não foi confirmado. Desligue "Confirm email" no painel do Supabase ou clique no link que chegou no seu e-mail.',
};

const SEM_INTERNET = "Não deu para conectar. Verifique a internet e tente de novo.";
const PEDE_CONFIRMACAO =
  'Conta criada, mas o Supabase está pedindo confirmação por e-mail. Desligue "Confirm email" no painel do Supabase.';

export function traduzirErroConta(error) {
  if (ERROS[error.code]) return ERROS[error.code];
  if (error.name === "AuthRetryableFetchError" || error.status === 0 || /fetch/i.test(error.message ?? "")) {
    return SEM_INTERNET;
  }
  return "Algo deu errado. Tente de novo.";
}

// " Daniel@Gmail.com " e "daniel@gmail.com" são a mesma conta
function limparEmail(email) {
  return email.trim().toLowerCase();
}

export async function entrar(client, email, senha) {
  const { data, error } = await client.auth.signInWithPassword({ email: limparEmail(email), password: senha });
  if (error) throw new Error(traduzirErroConta(error));
  return data.user;
}

export async function criarConta(client, email, senha) {
  const { data, error } = await client.auth.signUp({ email: limparEmail(email), password: senha });
  if (error) throw new Error(traduzirErroConta(error));
  // Sem sessão = a confirmação por e-mail continua ligada no painel
  if (!data.session) throw new Error(PEDE_CONFIRMACAO);
  return data.user;
}

export async function sair(client) {
  await client.auth.signOut();
}

// Avisa na abertura (sessão lembrada) e a cada entrada ou saída
export function aoMudarSessao(client, callback) {
  client.auth.onAuthStateChange((evento, sessao) => callback(sessao?.user ?? null));
}
