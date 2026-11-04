// Desenha conta, abas, janela de login e botões de marcar. Não fala com o Supabase.
import { el } from "./ui.js";

const TEXTOS_LOGIN = {
  entrar: { titulo: "Entrar", botao: "Entrar", enviando: "Entrando…", troca: "Não tem conta? Criar conta" },
  criar: { titulo: "Criar conta", botao: "Criar conta", enviando: "Criando conta…", troca: "Já tem conta? Entrar" },
};

export function textosLogin(modo) {
  return TEXTOS_LOGIN[modo];
}

// Cabeçalho: "Entrar" ou o e-mail com "Sair". main.js trata o clique pelo data-conta.
export function renderConta(container, user) {
  if (!user) {
    const entrar = el("button", "btn btn-primary conta-botao", "Entrar");
    entrar.type = "button";
    entrar.dataset.conta = "entrar";
    container.replaceChildren(entrar);
    return;
  }
  const sair = el("button", "link-button conta-sair", "Sair");
  sair.type = "button";
  sair.dataset.conta = "sair";
  container.replaceChildren(el("span", "conta-email", user.email), sair);
}

const ABAS = [
  { id: "catalogo", rotulo: "Catálogo" },
  { id: "quero", rotulo: "Quero assistir" },
  { id: "assisti", rotulo: "Já assisti" },
];

export function renderAbas(container, aba) {
  container.replaceChildren(
    ...ABAS.map(({ id, rotulo }) => {
      const button = el("button", "aba", rotulo);
      button.type = "button";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(id === aba));
      button.dataset.aba = id;
      return button;
    }),
  );
}

// Avisos no lugar do formulário quando o login não pode ser usado
const AVISOS = {
  nao_configurado: "Login ainda não configurado. Preencha SUPABASE_URL e SUPABASE_ANON_KEY em js/config.js.",
  falha: "Não deu para carregar o login. Verifique a internet e recarregue a página.",
  carregando: "Carregando o login… tente de novo em um instante.",
};

export function avisoLogin(modo) {
  return AVISOS[modo];
}

// modo: "entrar" | "criar" | "nao_configurado" (sem Supabase no config.js) | "falha" (biblioteca não baixou)
// | "carregando" (biblioteca ainda baixando)
export function abrirLogin(dialog, modo) {
  const form = dialog.querySelector(".login-form");
  const aviso = dialog.querySelector(".login-aviso");
  const configurado = !AVISOS[modo];
  form.hidden = !configurado;
  aviso.hidden = configurado;
  dialog.dataset.modo = modo;

  if (configurado) {
    const textos = textosLogin(modo);
    dialog.querySelector(".login-titulo").textContent = textos.titulo;
    dialog.querySelector(".login-enviar").textContent = textos.botao;
    dialog.querySelector(".login-troca").textContent = textos.troca;
    // O navegador só sugere senha nova no cadastro
    form.senha.autocomplete = modo === "criar" ? "new-password" : "current-password";
    form.senha.value = "";
  } else {
    dialog.querySelector(".login-titulo").textContent = "Entrar";
    aviso.textContent = avisoLogin(modo);
  }
  mostrarErroLogin(dialog, "");
  setLoginEnviando(dialog, false);
  if (!dialog.open) dialog.showModal();
  if (configurado) form.email.focus();
}

export function setLoginEnviando(dialog, enviando) {
  const modo = dialog.dataset.modo;
  if (AVISOS[modo]) return;
  const botao = dialog.querySelector(".login-enviar");
  botao.disabled = enviando;
  botao.textContent = enviando ? textosLogin(modo).enviando : textosLogin(modo).botao;
}

export function mostrarErroLogin(dialog, texto) {
  dialog.querySelector(".login-erro").textContent = texto;
}

export function fecharLogin(dialog) {
  dialog.close();
}

// Botões da janela de detalhes. main.js trata o clique pelo data-marcar.
export function renderBotoesMarcar(container, status, { salvando = false, erro = "" } = {}) {
  const botoes = [
    { id: "quero", rotulo: "🔖 Quero assistir" },
    { id: "assisti", rotulo: "✓ Já assisti" },
  ].map(({ id, rotulo }) => {
    const button = el("button", "btn marcar", rotulo);
    button.type = "button";
    button.dataset.marcar = id;
    button.setAttribute("aria-pressed", String(status === id));
    button.disabled = salvando;
    return button;
  });
  const linha = el("div", "marcar-botoes");
  linha.append(...botoes);
  container.replaceChildren(linha);
  if (erro) {
    const p = el("p", "marcar-erro", erro);
    p.setAttribute("role", "alert");
    container.append(p);
  }
}
