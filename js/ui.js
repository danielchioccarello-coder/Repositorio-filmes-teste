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

export function setLoadMore(button, { visible, loading }) {
  button.hidden = !visible;
  button.disabled = loading;
  button.textContent = loading ? "Carregando..." : "Carregar mais filmes";
}
