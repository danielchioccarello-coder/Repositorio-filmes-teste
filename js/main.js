// Liga tudo: busca os dados no TMDB e manda a interface desenhar.
import { TMDB_TOKEN } from "./config.js";
import { createApi } from "./api.js";
import { formatCount } from "./format.js";
import { renderMovies } from "./ui.js";

const api = createApi(TMDB_TOKEN);
const grid = document.querySelector("#grid");
const count = document.querySelector("#count");

async function start() {
  const providers = await api.getProviders();
  const allProviderIds = providers.map((p) => p.id);
  const data = await api.discoverMovies({ providerIds: [], allProviderIds, page: 1 });
  renderMovies(grid, data.results, { append: false });
  count.textContent = formatCount(data.total_results);
}

start();
