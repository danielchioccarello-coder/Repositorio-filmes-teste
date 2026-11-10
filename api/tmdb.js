// Rota /api/tmdb da Vercel. A chave vem da variável de ambiente TMDB_TOKEN (painel da Vercel).
import { criarHandler } from "./_proxy.js";

export function GET(request) {
  return criarHandler({ token: process.env.TMDB_TOKEN, fetchFn: fetch })(request);
}
