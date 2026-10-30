import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDiscoverParams, createApi, ApiError } from "../js/api.js";

// fetch falso: registra as chamadas e devolve uma resposta pronta
function fakeFetch(body = {}, { ok = true, status = 200 } = {}) {
  const calls = [];
  const fn = async (url, options) => {
    calls.push({ url: String(url), options });
    return { ok, status, json: async () => body };
  };
  fn.calls = calls;
  return fn;
}

const base = { providerIds: [], allProviderIds: [8, 119, 337], page: 1 };

test("buildDiscoverParams sempre envia região, flatrate, idioma e página", () => {
  const p = buildDiscoverParams({ ...base, page: 3 });
  assert.equal(p.get("watch_region"), "BR");
  assert.equal(p.get("with_watch_monetization_types"), "flatrate");
  assert.equal(p.get("language"), "pt-BR");
  assert.equal(p.get("page"), "3");
});

test("sem serviço marcado envia todos os serviços", () => {
  const p = buildDiscoverParams(base);
  assert.equal(p.get("with_watch_providers"), "8|119|337");
});

test("com serviços marcados envia só eles, separados por |", () => {
  const p = buildDiscoverParams({ ...base, providerIds: [8, 337] });
  assert.equal(p.get("with_watch_providers"), "8|337");
});

test("ordem padrão é popularidade", () => {
  assert.equal(buildDiscoverParams(base).get("sort_by"), "popularity.desc");
});

test("createApi envia Bearer token", async () => {
  const f = fakeFetch({ results: [] });
  await createApi("abc", f).discoverMovies(base);
  assert.equal(f.calls[0].options.headers.Authorization, "Bearer abc");
  assert.ok(f.calls[0].url.startsWith("https://api.themoviedb.org/3/discover/movie?"));
});

test("token vazio ou só espaços lança chave_invalida sem chamar fetch", async () => {
  const f = fakeFetch();
  await assert.rejects(createApi("   ", f).discoverMovies(base), (e) => e instanceof ApiError && e.type === "chave_invalida");
  assert.equal(f.calls.length, 0);
});

test("token com espaços nas pontas é aparado", async () => {
  const f = fakeFetch({ results: [] });
  await createApi("  abc \n", f).discoverMovies(base);
  assert.equal(f.calls[0].options.headers.Authorization, "Bearer abc");
});

test("HTTP 401 vira chave_invalida", async () => {
  const f = fakeFetch({}, { ok: false, status: 401 });
  await assert.rejects(createApi("abc", f).discoverMovies(base), (e) => e.type === "chave_invalida");
});

test("HTTP 500 vira outro", async () => {
  const f = fakeFetch({}, { ok: false, status: 500 });
  await assert.rejects(createApi("abc", f).discoverMovies(base), (e) => e.type === "outro" && e.status === 500);
});

test("fetch rejeitado (TypeError) vira rede", async () => {
  const f = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(createApi("abc", f).discoverMovies(base), (e) => e.type === "rede");
});

test("gêneros separados por vírgula", () => {
  assert.equal(buildDiscoverParams({ ...base, genreIds: [28, 35] }).get("with_genres"), "28,35");
});

test("sem gênero não envia with_genres", () => {
  assert.equal(buildDiscoverParams({ ...base, genreIds: [] }).has("with_genres"), false);
});

test("ordenação por nota exige 200 votos", () => {
  const p = buildDiscoverParams({ ...base, sort: "nota" });
  assert.equal(p.get("sort_by"), "vote_average.desc");
  assert.equal(p.get("vote_count.gte"), "200");
});

test("ordenação por lançamento", () => {
  const p = buildDiscoverParams({ ...base, sort: "lancamento" });
  assert.equal(p.get("sort_by"), "primary_release_date.desc");
  assert.equal(p.has("vote_count.gte"), false);
});

test("getGenres devolve genres", async () => {
  const f = fakeFetch({ genres: [{ id: 28, name: "Ação" }] });
  assert.deepEqual(await createApi("abc", f).getGenres(), [{ id: 28, name: "Ação" }]);
  assert.ok(f.calls[0].url.includes("/genre/movie/list"));
});

test("getProviders ordena por prioridade do Brasil e renomeia campos", async () => {
  const f = fakeFetch({
    results: [
      { provider_id: 2, provider_name: "B", logo_path: "/b.png", display_priorities: { BR: 5 } },
      { provider_id: 1, provider_name: "A", logo_path: "/a.png", display_priorities: { BR: 1 } },
    ],
  });
  const providers = await createApi("abc", f).getProviders();
  assert.deepEqual(providers, [
    { id: 1, name: "A", logoPath: "/a.png" },
    { id: 2, name: "B", logoPath: "/b.png" },
  ]);
  assert.ok(f.calls[0].url.includes("/watch/providers/movie"));
  assert.ok(f.calls[0].url.includes("watch_region=BR"));
});
