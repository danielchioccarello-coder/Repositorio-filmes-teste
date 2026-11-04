// Liga tudo: cliques → estado → TMDB → interface.
import { createApi, extractDetails } from "./api.js";
import { formatCount } from "./format.js";
import {
  createState, toggleProvider, toggleGenre, setSort, setMinRating, clearFilters, nextPage,
  applyResults, hasMore, createRequestCounter, setAba,
} from "./state.js";
import {
  renderMovies, renderProviders, renderGenres, setLoadMore, renderSkeleton,
  renderMessage, clearMessage, renderHero, showHeroSlide,
  showDetailsLoading, showDetailsError, openDetails, closeDetails,
} from "./ui.js";
import { criarCliente } from "./supabase.js";
import { entrar, criarConta, sair, aoMudarSessao } from "./conta.js";
import {
  carregarMarcacoes, marcar, desmarcar, proximoStatus, statusDoFilme,
  aplicarMarcacao, removerMarcacao, filmesDaAba,
} from "./marcacoes.js";
import {
  renderConta, renderAbas, abrirLogin, setLoginEnviando, mostrarErroLogin, fecharLogin, renderBotoesMarcar,
} from "./ui-conta.js";

// Se js/config.js não existir (erro comum), o site mostra como configurar em vez de ficar em branco
async function loadToken() {
  try {
    const config = await import("./config.js");
    return config.TMDB_TOKEN ?? "";
  } catch {
    return "";
  }
}

const api = createApi(await loadToken());
const counter = createRequestCounter();
const detailsCounter = createRequestCounter();
// null quando o Supabase não está configurado (ou enquanto a biblioteca baixa): o site fica só com o catálogo
let client = null;
// Aviso do "Entrar" enquanto não há client: "carregando" | "nao_configurado" | "falha"
let loginStatus = "carregando";
const listasCounter = createRequestCounter();

const els = {
  providers: document.querySelector("#providers"),
  providerSearch: document.querySelector("#provider-search"),
  providerList: document.querySelector("#provider-list"),
  providerToggle: document.querySelector("#provider-toggle"),
  genres: document.querySelector("#genres"),
  sort: document.querySelector("#sort"),
  minRating: document.querySelector("#min-rating"),
  count: document.querySelector("#count"),
  message: document.querySelector("#message"),
  grid: document.querySelector("#grid"),
  loadMore: document.querySelector("#load-more"),
  details: document.querySelector("#details"),
  hero: document.querySelector("#hero"),
  header: document.querySelector("#site-header"),
  rowTitle: document.querySelector("#row-title"),
  conta: document.querySelector("#conta"),
  abas: document.querySelector("#abas"),
  filters: document.querySelector("#filters"),
  rowControls: document.querySelector("#row-controls"),
  login: document.querySelector("#login"),
  loginForm: document.querySelector("#login .login-form"),
};

const ROW_TITLES = { popularidade: "Mais populares", nota: "Mais bem avaliados", lancamento: "Lançamentos" };
const LIST_TITLES = { quero: "Quero assistir", assisti: "Já assisti" };

let state = createState();
let providers = [];
let genres = [];
let providerView = { expanded: false, filterText: "" };
let loading = false;
let started = false;
// Mensagem do catálogo (vazio, falha...) guardada para reaparecer ao voltar para a aba
let catalogMessage = null;

// Conta e listas
let user = null;
let marcacoes = [];
let listasStatus = "ok"; // "ok" | "carregando" | "falha"
let listasMudaram = false;
let filmeAberto = null; // dados crus do TMDB do filme na janela de detalhes
let salvando = false;
let modoLogin = "entrar";

const statusDe = (id) => statusDoFilme(marcacoes, id);
const onCatalog = () => state.aba === "catalogo";

// Banner: os 5 primeiros filmes com imagem de fundo, trocando sozinhos a cada 8 segundos
const HERO_SIZE = 5;
const HERO_INTERVAL = 8000;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let heroMovies = [];
let heroIndex = 0;
let heroTimer = null;
let heroPaused = false;

function goToSlide(index) {
  heroIndex = (index + heroMovies.length) % heroMovies.length;
  showHeroSlide(els.hero, heroMovies, heroIndex);
}

function restartHeroTimer() {
  clearInterval(heroTimer);
  // Quem pediu menos movimento no sistema não recebe troca automática
  if (reduceMotion || heroMovies.length < 2) return;
  heroTimer = setInterval(() => {
    if (!heroPaused && !document.hidden) goToSlide(heroIndex + 1);
  }, HERO_INTERVAL);
}

function updateHero(movies) {
  heroMovies = movies.filter((m) => m.backdrop_path).slice(0, HERO_SIZE);
  renderHero(els.hero, heroMovies);
  if (heroMovies.length > 0) goToSlide(0);
  restartHeroTimer();
}

function drawFilters() {
  renderProviders(els.providers, providers, state.selectedProviders, providerView);
  renderGenres(els.genres, genres, state.selectedGenres);
}

function showError(error) {
  console.error(error);
  catalogMessage = error.type;
  if (onCatalog()) renderMessage(els.message, error.type);
}

async function loadMovies() {
  const requestNumber = counter.next();
  const isFirstPage = state.page === 1;
  const before = state.movies.length;
  loading = true;
  catalogMessage = null;
  // Numa aba de lista a busca continua por trás, mas sem mexer na tela
  if (onCatalog()) {
    clearMessage(els.message);
    if (isFirstPage) {
      renderSkeleton(els.grid);
      els.count.textContent = "";
    }
    setLoadMore(els.loadMore, { visible: !isFirstPage, loading: true });
  }

  let data;
  try {
    data = await api.discoverMovies({
      providerIds: state.selectedProviders,
      allProviderIds: providers.map((p) => p.id),
      genreIds: state.selectedGenres,
      sort: state.sort,
      minRating: state.minRating,
      page: state.page,
    });
  } catch (error) {
    if (!counter.isLatest(requestNumber)) return;
    loading = false;
    if (onCatalog()) {
      if (isFirstPage) els.grid.replaceChildren();
      setLoadMore(els.loadMore, { visible: false, loading: false });
    }
    showError(error);
    return;
  }
  // Se o usuário mudou o filtro enquanto esperava, esta resposta já não vale
  if (!counter.isLatest(requestNumber)) return;

  state = applyResults(state, data);
  loading = false;
  if (isFirstPage) updateHero(state.movies);
  if (state.totalResults === 0) catalogMessage = "vazio";
  if (!onCatalog()) return;
  if (isFirstPage) {
    renderMovies(els.grid, state.movies, { append: false, statusDe });
  } else {
    renderMovies(els.grid, state.movies.slice(before), { append: true, statusDe });
  }
  els.count.textContent = formatCount(state.totalResults);
  if (catalogMessage) renderMessage(els.message, catalogMessage);
  setLoadMore(els.loadMore, { visible: hasMore(state), loading: false });
}

// Redesenha o catálogo com o que já foi buscado (ao voltar para a aba ou mudar os selos)
function drawCatalog() {
  els.filters.hidden = false;
  els.rowControls.hidden = false;
  els.rowTitle.textContent = ROW_TITLES[state.sort];
  if (catalogMessage) renderMessage(els.message, catalogMessage);
  else clearMessage(els.message);
  if (state.movies.length > 0) renderMovies(els.grid, state.movies, { append: false, statusDe });
  else if (!started || loading) renderSkeleton(els.grid);
  else els.grid.replaceChildren();
  els.count.textContent = started && !(loading && state.page === 1) ? formatCount(state.totalResults) : "";
  setLoadMore(els.loadMore, { visible: loading ? state.page > 1 : hasMore(state), loading });
}

// Abas "Quero assistir" e "Já assisti": sem filtros, só os filmes marcados
function drawList(aba) {
  els.filters.hidden = true;
  els.rowControls.hidden = true;
  els.count.textContent = "";
  setLoadMore(els.loadMore, { visible: false, loading: false });
  els.rowTitle.textContent = LIST_TITLES[aba];

  if (!user) {
    els.grid.replaceChildren();
    renderMessage(els.message, "entre_para_ver");
  } else if (listasStatus === "carregando") {
    clearMessage(els.message);
    renderSkeleton(els.grid);
  } else if (listasStatus === "falha") {
    els.grid.replaceChildren();
    renderMessage(els.message, "falha_listas");
  } else {
    const filmes = filmesDaAba(marcacoes, aba);
    if (filmes.length === 0) {
      els.grid.replaceChildren();
      renderMessage(els.message, `vazia_${aba}`);
    } else {
      clearMessage(els.message);
      renderMovies(els.grid, filmes, { append: false, statusDe });
    }
  }
}

function drawTab() {
  renderAbas(els.abas, state.aba);
  if (onCatalog()) drawCatalog();
  else drawList(state.aba);
}

// Muda o estado, redesenha os filtros e busca de novo
function changeFilters(newState) {
  state = newState;
  els.rowTitle.textContent = ROW_TITLES[state.sort];
  // "Limpar filtros" zera a nota, então a caixinha precisa acompanhar
  els.minRating.value = String(state.minRating);
  drawFilters();
  loadMovies();
}

els.providerList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-provider-id]");
  if (button) changeFilters(toggleProvider(state, Number(button.dataset.providerId)));
});

els.genres.addEventListener("click", (event) => {
  const button = event.target.closest("[data-genre-id]");
  if (button) changeFilters(toggleGenre(state, Number(button.dataset.genreId)));
});

els.sort.addEventListener("change", () => changeFilters(setSort(state, els.sort.value)));

els.minRating.addEventListener("change", () => changeFilters(setMinRating(state, Number(els.minRating.value))));

els.providerToggle.addEventListener("click", () => {
  providerView = { expanded: !providerView.expanded, filterText: "" };
  els.providerSearch.value = "";
  drawFilters();
  if (providerView.expanded) els.providerSearch.focus();
});

els.providerSearch.addEventListener("input", () => {
  providerView = { ...providerView, filterText: els.providerSearch.value };
  drawFilters();
});

els.loadMore.addEventListener("click", () => {
  if (loading) return;
  state = nextPage(state);
  loadMovies();
});

// Botões das mensagens: "Limpar filtros", "Tentar de novo" e "Entrar"
els.message.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "limpar") changeFilters(clearFilters(state));
  if (action === "tentar") started ? loadMovies() : start();
  if (action === "entrar") openLogin();
  if (action === "tentar_listas") loadLists();
});

els.abas.addEventListener("click", (event) => {
  const button = event.target.closest("[data-aba]");
  if (!button || button.dataset.aba === state.aba) return;
  state = setAba(state, button.dataset.aba);
  drawTab();
});

async function showMovie(id) {
  const requestNumber = detailsCounter.next();
  filmeAberto = null;
  showDetailsLoading(els.details);
  // Só mostra se for o último filme clicado e a janela não foi fechada (✕, Esc ou clique fora) enquanto carregava
  const stillWanted = () => detailsCounter.isLatest(requestNumber) && els.details.open;
  try {
    const raw = await api.getMovieDetails(id);
    if (stillWanted()) {
      filmeAberto = raw;
      openDetails(els.details, extractDetails(raw));
      drawMarkButtons();
    }
  } catch (error) {
    console.error(error);
    if (stillWanted()) showDetailsError(els.details);
  }
}

els.grid.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (card?.dataset.id) showMovie(Number(card.dataset.id));
});

els.grid.addEventListener("keydown", (event) => {
  const card = event.target.closest(".card");
  if (card?.dataset.id && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    showMovie(Number(card.dataset.id));
  }
});

els.hero.addEventListener("click", (event) => {
  const dot = event.target.closest("[data-slide]");
  if (dot) {
    goToSlide(Number(dot.dataset.slide));
    restartHeroTimer();
  }
  const more = event.target.closest("[data-movie-id]");
  if (more) showMovie(Number(more.dataset.movieId));
});

// Pausa a troca automática enquanto o mouse ou o teclado estão no banner
els.hero.addEventListener("pointerenter", () => { heroPaused = true; });
els.hero.addEventListener("pointerleave", () => { heroPaused = false; });
els.hero.addEventListener("focusin", () => { heroPaused = true; });
els.hero.addEventListener("focusout", () => { heroPaused = false; });

// Cabeçalho fica preto quando a página rola
window.addEventListener("scroll", () => {
  els.header.classList.toggle("is-solid", window.scrollY > 40);
}, { passive: true });

els.details.querySelector(".details-close").addEventListener("click", () => closeDetails(els.details));
// Clique no fundo escuro (fora do conteúdo) fecha a janela. A tecla Esc o <dialog> já trata.
els.details.addEventListener("click", (event) => {
  if (event.target === els.details) closeDetails(els.details);
});

// ===== Conta e listas =====

function drawMarkButtons(erro = "") {
  const lugar = els.details.querySelector(".details-marcar");
  if (!lugar || !filmeAberto) return;
  // Enquanto as listas carregam, o status ainda não é conhecido: botões travados
  renderBotoesMarcar(lugar, statusDe(filmeAberto.id), { salvando: salvando || listasStatus === "carregando", erro });
}

async function loadLists() {
  const requestNumber = listasCounter.next();
  listasStatus = "carregando";
  drawTab();
  drawMarkButtons();
  try {
    const linhas = await carregarMarcacoes(client);
    // Se a pessoa saiu ou trocou de conta enquanto carregava, esta resposta já não vale
    if (!listasCounter.isLatest(requestNumber)) return;
    marcacoes = linhas;
    listasStatus = "ok";
  } catch (error) {
    if (!listasCounter.isLatest(requestNumber)) return;
    console.error(error);
    listasStatus = "falha";
  }
  drawTab();
  drawMarkButtons();
}

function changeUser(novo) {
  // O Supabase também avisa quando só renova o login da mesma pessoa
  if (novo?.id === user?.id) {
    user = novo;
    return;
  }
  user = novo;
  marcacoes = [];
  listasCounter.next(); // descarta uma carga ainda em andamento da conta anterior
  renderConta(els.conta, user);
  if (user) {
    // Chamar o Supabase de dentro do aviso de sessão pode travar; por isso, logo depois
    setTimeout(loadLists);
  } else {
    listasStatus = "ok";
    drawTab();
    drawMarkButtons();
  }
}

function openLogin() {
  modoLogin = "entrar";
  abrirLogin(els.login, client ? "entrar" : loginStatus);
}

els.conta.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-conta]")?.dataset.conta;
  if (action === "entrar") openLogin();
  if (action === "sair") {
    try {
      await sair(client);
    } catch (error) {
      console.error(error);
    }
  }
});

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = els.loginForm.email.value;
  const senha = els.loginForm.senha.value;
  mostrarErroLogin(els.login, "");
  setLoginEnviando(els.login, true);
  try {
    await (modoLogin === "criar" ? criarConta : entrar)(client, email, senha);
    // A janela de detalhes, se estava aberta, continua lá; os botões se atualizam ao carregar as listas
    fecharLogin(els.login);
  } catch (error) {
    mostrarErroLogin(els.login, error.message);
  } finally {
    setLoginEnviando(els.login, false);
  }
});

els.login.querySelector(".login-troca").addEventListener("click", () => {
  if (!client) return;
  modoLogin = modoLogin === "entrar" ? "criar" : "entrar";
  abrirLogin(els.login, modoLogin);
});

els.login.querySelector(".details-close").addEventListener("click", () => fecharLogin(els.login));
els.login.addEventListener("click", (event) => {
  if (event.target === els.login) fecharLogin(els.login);
});

// Botões "Quero assistir" e "Já assisti" na janela de detalhes
els.details.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-marcar]");
  // Clique duplo: o segundo é ignorado enquanto o primeiro salva
  if (!button || !filmeAberto || salvando) return;
  if (!user) {
    openLogin();
    return;
  }
  const filme = filmeAberto;
  const dono = user.id;
  const novo = proximoStatus(statusDe(filme.id), button.dataset.marcar);
  salvando = true;
  drawMarkButtons();
  try {
    if (novo) {
      const linha = await marcar(client, dono, filme, novo);
      if (user?.id === dono) marcacoes = aplicarMarcacao(marcacoes, linha);
    } else {
      await desmarcar(client, dono, filme.id);
      if (user?.id === dono) marcacoes = removerMarcacao(marcacoes, filme.id);
    }
    listasMudaram = true;
    salvando = false;
    drawMarkButtons();
  } catch (error) {
    console.error(error);
    salvando = false;
    drawMarkButtons(error.message);
  }
});

// Ao fechar os detalhes, a grade mostra os selos e a lista da aba atualizados
els.details.addEventListener("close", () => {
  filmeAberto = null;
  if (listasMudaram) {
    listasMudaram = false;
    drawTab();
  }
});

renderConta(els.conta, null);
renderAbas(els.abas, state.aba);

// Abertura: busca serviços e gêneros, depois os filmes
async function start() {
  catalogMessage = null;
  if (onCatalog()) {
    clearMessage(els.message);
    renderSkeleton(els.grid);
  }
  try {
    [providers, genres] = await Promise.all([api.getProviders(), api.getGenres()]);
  } catch (error) {
    if (onCatalog()) els.grid.replaceChildren();
    showError(error);
    return;
  }
  started = true;
  drawFilters();
  await loadMovies();
}

start();

// O login carrega em paralelo: se a biblioteca do Supabase demorar, o catálogo não espera
criarCliente().then(
  (c) => {
    client = c;
    loginStatus = "nao_configurado"; // só vale quando client é null
    if (client) aoMudarSessao(client, changeUser);
  },
  (error) => {
    console.error(error);
    loginStatus = "falha";
  },
);
