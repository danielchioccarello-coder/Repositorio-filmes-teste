// Listas "Quero assistir" e "Já assisti". Recebe o cliente do Supabase (nos testes, um de mentira).
// Status: "quero" | "assisti". Filme sem marcação: null.

const ERRO_SALVAR = "Não deu para salvar, tente de novo.";

// Copia do TMDB só o que o cartão da grade mostra, para a aba abrir sem perguntar ao TMDB filme por filme
export function dadosDoFilme(raw) {
  return {
    movie_id: raw.id,
    title: raw.title,
    poster_path: raw.poster_path ?? null,
    release_date: raw.release_date ?? null,
    vote_average: raw.vote_average ?? null,
    vote_count: raw.vote_count ?? null,
  };
}

// Clicar no botão que já está marcado desmarca
export function proximoStatus(atual, clicado) {
  return atual === clicado ? null : clicado;
}

export function statusDoFilme(lista, movieId) {
  return lista.find((m) => m.movie_id === movieId)?.status ?? null;
}

export function aplicarMarcacao(lista, marcacao) {
  return [...removerMarcacao(lista, marcacao.movie_id), marcacao];
}

export function removerMarcacao(lista, movieId) {
  return lista.filter((m) => m.movie_id !== movieId);
}

// No formato que renderMovies usa, do mais recente para o mais antigo
export function filmesDaAba(lista, status) {
  return lista
    .filter((m) => m.status === status)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .map((m) => ({
      id: m.movie_id,
      title: m.title,
      poster_path: m.poster_path,
      release_date: m.release_date,
      vote_average: m.vote_average,
      vote_count: m.vote_count,
    }));
}

// A regra de segurança do Supabase já limita às linhas de quem está logado
export async function carregarMarcacoes(client) {
  const { data, error } = await client.from("marcacoes").select("*");
  if (error) throw new Error("Não deu para carregar suas listas.");
  return data;
}

export async function marcar(client, userId, raw, status) {
  const linha = { user_id: userId, ...dadosDoFilme(raw), status, updated_at: new Date().toISOString() };
  const { data, error } = await client
    .from("marcacoes")
    .upsert(linha, { onConflict: "user_id,movie_id" })
    .select()
    .single();
  if (error) throw new Error(ERRO_SALVAR);
  return data;
}

export async function desmarcar(client, userId, movieId) {
  const { error } = await client.from("marcacoes").delete().eq("user_id", userId).eq("movie_id", movieId);
  if (error) throw new Error(ERRO_SALVAR);
}
