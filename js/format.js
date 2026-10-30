// Funções que transformam dados do TMDB em texto para a tela.
export const IMG_BASE = "https://image.tmdb.org/t/p";

export function formatYear(date) {
  return date ? date.slice(0, 4) : "";
}

export function formatRating(voteAverage, voteCount) {
  if (!voteCount) return "Sem nota";
  return voteAverage.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatCount(n) {
  const word = n === 1 ? "filme encontrado" : "filmes encontrados";
  return `${n.toLocaleString("pt-BR")} ${word}`;
}

export function posterUrl(path, size = "w342") {
  return path ? `${IMG_BASE}/${size}${path}` : null;
}
