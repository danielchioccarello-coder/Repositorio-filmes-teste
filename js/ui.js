// Desenha a página. Não chama a API: só recebe dados e mostra.
import { formatYear, formatRating, posterUrl } from "./format.js";

// Cria um elemento com classe e texto (o texto entra com textContent, nunca como HTML)
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function movieCard(movie) {
  const card = el("article", "card");
  card.dataset.id = movie.id;
  card.tabIndex = 0;

  const src = posterUrl(movie.poster_path);
  if (src) {
    const img = el("img", "card-poster");
    img.src = src;
    img.alt = `Pôster de ${movie.title}`;
    img.loading = "lazy";
    // Se a imagem não carregar, mostra o nome do filme no lugar
    img.addEventListener("error", () => img.replaceWith(el("div", "card-placeholder", movie.title)), { once: true });
    card.append(img);
  } else {
    card.append(el("div", "card-placeholder", movie.title));
  }

  const info = el("div", "card-info");
  info.append(el("h3", "card-title", movie.title));
  const year = formatYear(movie.release_date);
  const meta = `${year ? year + " · " : ""}★ ${formatRating(movie.vote_average, movie.vote_count)}`;
  info.append(el("p", "card-meta", meta));
  card.append(info);
  return card;
}

export function renderMovies(grid, movies, { append }) {
  if (!append) grid.replaceChildren();
  grid.append(...movies.map(movieCard));
}

// Ícone SVG simples (o "i" de informações e o ▶ do trailer)
const ICONS = {
  info: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z",
  play: "M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z",
};

function icon(name) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "btn-icon");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", ICONS[name]);
  svg.append(path);
  return svg;
}

// Banner: hero = <section id="hero">. Monta as imagens de fundo e as bolinhas dos destaques.
export function renderHero(hero, movies) {
  const backdrops = hero.querySelector("#hero-backdrops");
  const dots = hero.querySelector("#hero-dots");
  backdrops.replaceChildren(
    ...movies.map((movie) => {
      const img = el("img", "hero-backdrop");
      img.src = posterUrl(movie.backdrop_path, "original");
      img.alt = "";
      return img;
    }),
  );
  dots.replaceChildren(
    ...(movies.length > 1 ? movies : []).map((movie, i) => {
      const dot = el("button", "hero-dot");
      dot.type = "button";
      dot.dataset.slide = i;
      dot.setAttribute("aria-label", `Destaque ${i + 1}: ${movie.title}`);
      return dot;
    }),
  );
  if (movies.length === 0) hero.querySelector("#hero-content").replaceChildren();
}

// Mostra o destaque número "index": troca a imagem (com fade) e o texto
export function showHeroSlide(hero, movies, index) {
  const movie = movies[index];
  hero.querySelectorAll(".hero-backdrop").forEach((img, i) => img.classList.toggle("is-active", i === index));
  hero.querySelectorAll(".hero-dot").forEach((dot, i) => dot.setAttribute("aria-current", String(i === index)));

  const title = el("h2", "hero-title", movie.title);
  const meta = el("p", "hero-meta");
  if (movie.vote_count) meta.append(el("span", "hero-rating", `★ ${formatRating(movie.vote_average, movie.vote_count)}`));
  const year = formatYear(movie.release_date);
  if (year) meta.append(el("span", "", year));
  const overview = el("p", "hero-overview", movie.overview || "Sinopse não disponível em português.");

  const actions = el("div", "hero-actions");
  const more = el("button", "btn btn-primary");
  more.type = "button";
  more.dataset.movieId = movie.id;
  more.append(icon("info"), "Ver detalhes");
  actions.append(more);

  hero.querySelector("#hero-content").replaceChildren(title, meta, overview, actions);
}

const COLLAPSED_PROVIDERS = 8;

// container = #providers, com o campo de busca, a lista e o botão "ver todos" já no HTML
export function renderProviders(container, providers, selectedIds, { expanded, filterText }) {
  const search = container.querySelector("#provider-search");
  const list = container.querySelector("#provider-list");
  const toggleButton = container.querySelector("#provider-toggle");

  let visible;
  if (expanded) {
    const term = filterText.trim().toLowerCase();
    visible = providers.filter((p) => p.name.toLowerCase().includes(term));
  } else {
    // Os 8 principais, mais algum marcado que esteja fora deles
    visible = providers.filter((p, i) => i < COLLAPSED_PROVIDERS || selectedIds.includes(p.id));
  }

  list.replaceChildren(
    ...visible.map((p) => {
      const button = el("button", "provider");
      button.type = "button";
      button.dataset.providerId = p.id;
      button.title = p.name;
      button.setAttribute("aria-pressed", String(selectedIds.includes(p.id)));
      const logo = posterUrl(p.logoPath, "w92");
      if (logo) {
        const img = el("img");
        img.src = logo;
        img.alt = p.name;
        img.loading = "lazy";
        button.append(img);
      } else {
        button.append(el("span", "provider-name", p.name));
      }
      return button;
    }),
  );
  if (expanded && visible.length === 0) list.append(el("p", "muted", "Nenhum serviço com esse nome."));

  search.hidden = !expanded;
  toggleButton.textContent = expanded ? "− ver menos" : "+ ver todos";
  toggleButton.setAttribute("aria-expanded", String(expanded));
}

export function renderGenres(container, genres, selectedIds) {
  container.replaceChildren(
    ...genres.map((g) => {
      const button = el("button", "pill", g.name);
      button.type = "button";
      button.dataset.genreId = g.id;
      button.setAttribute("aria-pressed", String(selectedIds.includes(g.id)));
      return button;
    }),
  );
}

// Janela de detalhes: modal = <dialog id="details"> com um #details-body dentro
function detailsBody(modal) {
  return modal.querySelector("#details-body");
}

function openModal(modal) {
  if (!modal.open) modal.showModal();
}

export function showDetailsLoading(modal) {
  const status = el("div", "details-status");
  status.append(el("p", "muted", "Carregando..."));
  detailsBody(modal).replaceChildren(status);
  openModal(modal);
}

export function showDetailsError(modal) {
  const status = el("div", "details-status");
  status.append(el("p", "details-error", "Não foi possível carregar os detalhes."));
  detailsBody(modal).replaceChildren(status);
  openModal(modal);
}

export function openDetails(modal, details) {
  // Faixa larga no topo com a imagem de fundo do filme
  const top = el("div", "details-hero");
  const backdrop = posterUrl(details.backdropPath, "w1280");
  if (backdrop) {
    const img = el("img", "details-backdrop");
    img.src = backdrop;
    img.alt = "";
    top.append(img);
  }

  const layout = el("div", "details-layout");

  const src = posterUrl(details.posterPath);
  if (src) {
    const img = el("img", "details-poster");
    img.src = src;
    img.alt = `Pôster de ${details.title}`;
    layout.append(img);
  } else {
    layout.append(el("div", "details-poster card-placeholder", details.title));
  }

  const info = el("div", "details-info");
  info.append(el("h2", "details-title", details.year ? `${details.title} (${details.year})` : details.title));
  const meta = [`★ ${details.rating}`, details.runtime, details.genres.join(", ")].filter(Boolean).join(" · ");
  info.append(el("p", "details-meta", meta));
  info.append(el("p", "details-overview", details.overview));

  info.append(el("h3", "details-subtitle", "Disponível em:"));
  if (details.providers.length > 0) {
    const logos = el("div", "details-providers");
    for (const p of details.providers) {
      const logo = posterUrl(p.logoPath, "w92");
      if (logo) {
        const img = el("img", "details-provider");
        img.src = logo;
        img.alt = p.name;
        img.title = p.name;
        logos.append(img);
      } else {
        logos.append(el("span", "pill", p.name));
      }
    }
    info.append(logos);
  } else {
    info.append(el("p", "muted", "Não está em nenhuma assinatura no Brasil."));
  }

  if (details.cast.length > 0) {
    const cast = el("p", "details-cast");
    cast.append(el("strong", "", "Elenco: "), details.cast.join(", "));
    info.append(cast);
  }

  if (details.trailerUrl) {
    const link = el("a", "btn btn-primary");
    link.append(icon("play"), "Ver trailer no YouTube");
    link.href = details.trailerUrl;
    link.target = "_blank";
    link.rel = "noopener";
    info.append(link);
  }

  layout.append(info);
  detailsBody(modal).replaceChildren(top, layout);
  modal.scrollTop = 0;
  openModal(modal);
}

export function closeDetails(modal) {
  modal.close();
}

const MESSAGES = {
  vazio: {
    text: "Nenhum filme encontrado. Tente remover algum gênero.",
    action: { label: "Limpar filtros", kind: "limpar" },
    link: null,
  },
  falha: {
    text: "Não foi possível carregar os filmes.",
    action: { label: "Tentar de novo", kind: "tentar" },
    link: null,
  },
  chave_invalida: {
    text: "Configure sua chave do TMDB em js/config.js",
    action: null,
    link: "https://www.themoviedb.org/settings/api",
  },
};

// kind: 'vazio' | 'rede' | 'outro' | 'chave_invalida' (rede, outro e desconhecidos usam a mensagem de falha)
export function messageFor(kind) {
  return MESSAGES[kind] ?? MESSAGES.falha;
}

// O botão de ação leva data-action="limpar" ou "tentar"; main.js trata o clique
export function renderMessage(container, kind) {
  const { text, action, link } = messageFor(kind);
  const box = el("div", "message");
  box.append(el("p", "message-text", text));
  if (link) {
    const a = el("a", "message-link", "Criar ou copiar minha chave no TMDB");
    a.href = link;
    a.target = "_blank";
    a.rel = "noopener";
    box.append(a);
  }
  if (action) {
    const button = el("button", "load-more", action.label);
    button.type = "button";
    button.dataset.action = action.kind;
    box.append(button);
  }
  container.replaceChildren(box);
  container.hidden = false;
}

export function clearMessage(container) {
  container.replaceChildren();
  container.hidden = true;
}

// Cartões cinza "piscando" enquanto os filmes carregam
export function renderSkeleton(grid, count = 12) {
  grid.replaceChildren(
    ...Array.from({ length: count }, () => {
      const card = el("div", "card skeleton");
      card.setAttribute("aria-hidden", "true");
      card.append(el("div", "card-placeholder"), el("div", "skeleton-line"));
      return card;
    }),
  );
}

export function setLoadMore(button, { visible, loading }) {
  button.hidden = !visible;
  button.disabled = loading;
  button.textContent = loading ? "Carregando..." : "Carregar mais filmes";
}
