// Liga tudo: cliques → estado → TMDB → interface.
import { createApi, extractDetails } from "./api.js";
import { formatCount } from "./format.js";
import {
  createState, toggleProvider, toggleGenre, setSort, clearFilters, nextPage,
  applyResults, hasMore, createRequestCounter,
} from "./state.js";
import {
  renderMovies, renderProviders, renderGenres, setLoadMore, renderSkeleton,
  renderMessage, clearMessage,
  showDetailsLoading, showDetailsError, openDetails, closeDetails,
} from "./ui.js";

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

const els = {
  providers: document.querySelector("#providers"),
  providerSearch: document.querySelector("#provider-search"),
  providerList: document.querySelector("#provider-list"),
  providerToggle: document.querySelector("#provider-toggle"),
  genres: document.querySelector("#genres"),
  sort: document.querySelector("#sort"),
  count: document.querySelector("#count"),
  message: document.querySelector("#message"),
  grid: document.querySelector("#grid"),
  loadMore: document.querySelector("#load-more"),
  details: document.querySelector("#details"),
};

let state = createState();
let providers = [];
let genres = [];
let providerView = { expanded: false, filterText: "" };
let loading = false;
let started = false;

function drawFilters() {
  renderProviders(els.providers, providers, state.selectedProviders, providerView);
  renderGenres(els.genres, genres, state.selectedGenres);
}

function showError(error) {
  console.error(error);
  renderMessage(els.message, error.type);
}

async function loadMovies() {
  const requestNumber = counter.next();
  const isFirstPage = state.page === 1;
  const before = state.movies.length;
  loading = true;
  clearMessage(els.message);
  if (isFirstPage) {
    renderSkeleton(els.grid);
    els.count.textContent = "";
  }
  setLoadMore(els.loadMore, { visible: !isFirstPage, loading: true });

  let data;
  try {
    data = await api.discoverMovies({
      providerIds: state.selectedProviders,
      allProviderIds: providers.map((p) => p.id),
      genreIds: state.selectedGenres,
      sort: state.sort,
      page: state.page,
    });
  } catch (error) {
    if (!counter.isLatest(requestNumber)) return;
    loading = false;
    if (isFirstPage) els.grid.replaceChildren();
    setLoadMore(els.loadMore, { visible: false, loading: false });
    showError(error);
    return;
  }
  // Se o usuário mudou o filtro enquanto esperava, esta resposta já não vale
  if (!counter.isLatest(requestNumber)) return;

  state = applyResults(state, data);
  if (isFirstPage) {
    renderMovies(els.grid, state.movies, { append: false });
  } else {
    renderMovies(els.grid, state.movies.slice(before), { append: true });
  }
  els.count.textContent = formatCount(state.totalResults);
  if (state.totalResults === 0) renderMessage(els.message, "vazio");
  loading = false;
  setLoadMore(els.loadMore, { visible: hasMore(state), loading: false });
}

// Muda o estado, redesenha os filtros e busca de novo
function changeFilters(newState) {
  state = newState;
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

// Botões das mensagens: "Limpar filtros" e "Tentar de novo"
els.message.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "limpar") changeFilters(clearFilters(state));
  if (action === "tentar") started ? loadMovies() : start();
});

async function showMovie(id) {
  const requestNumber = detailsCounter.next();
  showDetailsLoading(els.details);
  // Só mostra se for o último filme clicado e a janela não foi fechada (✕, Esc ou clique fora) enquanto carregava
  const stillWanted = () => detailsCounter.isLatest(requestNumber) && els.details.open;
  try {
    const raw = await api.getMovieDetails(id);
    if (stillWanted()) openDetails(els.details, extractDetails(raw));
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
  if (card?.dataset.id && event.key === "Enter") showMovie(Number(card.dataset.id));
});

els.details.querySelector(".details-close").addEventListener("click", () => closeDetails(els.details));
// Clique no fundo escuro (fora do conteúdo) fecha a janela. A tecla Esc o <dialog> já trata.
els.details.addEventListener("click", (event) => {
  if (event.target === els.details) closeDetails(els.details);
});

// Abertura: busca serviços e gêneros, depois os filmes
async function start() {
  clearMessage(els.message);
  renderSkeleton(els.grid);
  try {
    [providers, genres] = await Promise.all([api.getProviders(), api.getGenres()]);
  } catch (error) {
    els.grid.replaceChildren();
    showError(error);
    return;
  }
  started = true;
  drawFilters();
  await loadMovies();
}

start();
