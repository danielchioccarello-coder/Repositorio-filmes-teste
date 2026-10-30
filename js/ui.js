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
