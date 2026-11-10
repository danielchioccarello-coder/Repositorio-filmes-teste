import { test } from "node:test";
import assert from "node:assert/strict";
import { criarHandler } from "../api/_proxy.js";

// fetch falso do TMDB: registra as chamadas e devolve uma resposta pronta
function fakeFetch(body = { ok: true }, status = 200) {
  const calls = [];
  const fn = async (url, options) => {
    calls.push({ url: new URL(url), options });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  };
  fn.calls = calls;
  return fn;
}

const pedido = (query, init) => new Request(`https://site.test/api/tmdb?${query}`, init);

test("cada caminho permitido vai para o TMDB", async () => {
  for (const caminho of ["/discover/movie", "/genre/movie/list", "/watch/providers/movie", "/movie/550"]) {
    const f = fakeFetch({ caminho });
    const resposta = await criarHandler({ token: "abc", fetchFn: f })(pedido(`caminho=${caminho}`));
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { caminho });
    assert.equal(f.calls[0].url.origin + f.calls[0].url.pathname, `https://api.themoviedb.org/3${caminho}`);
    assert.ok(resposta.headers.get("content-type").startsWith("application/json"));
  }
});

test("caminho não permitido dá 400 sem chamar o TMDB", async () => {
  for (const query of ["caminho=/account", "caminho=/movie/abc", "caminho=/movie/550/../../account", "caminho=/movie/550?api_key=x", "page=1"]) {
    const f = fakeFetch();
    const resposta = await criarHandler({ token: "abc", fetchFn: f })(pedido(query.replace("?", "%3F")));
    assert.equal(resposta.status, 400, query);
    assert.deepEqual(await resposta.json(), { erro: "caminho_nao_permitido" });
    assert.equal(f.calls.length, 0);
  }
});

test("parâmetros desconhecidos são descartados", async () => {
  const f = fakeFetch();
  await criarHandler({ token: "abc", fetchFn: f })(pedido("caminho=/discover/movie&page=2&api_key=x&foo=1&language=pt-BR"));
  const params = f.calls[0].url.searchParams;
  assert.equal(params.get("page"), "2");
  assert.equal(params.get("language"), "pt-BR");
  assert.equal(params.has("api_key"), false);
  assert.equal(params.has("foo"), false);
  assert.equal(params.has("caminho"), false);
});

// page, append_to_response e include_video_language têm regras próprias (testes abaixo)
test("todos os parâmetros livres são repassados", async () => {
  const nomes = ["language", "watch_region", "with_watch_monetization_types", "with_watch_providers", "with_genres",
    "sort_by", "vote_count.gte", "vote_average.gte"];
  const f = fakeFetch();
  const query = nomes.map((n) => `${n}=v`).join("&");
  await criarHandler({ token: "abc", fetchFn: f })(pedido(`caminho=/discover/movie&${query}`));
  for (const n of nomes) assert.equal(f.calls[0].url.searchParams.get(n), "v", n);
});

test("extras dos detalhes só com os valores que o site usa", async () => {
  const f = fakeFetch();
  const handler = criarHandler({ token: "abc", fetchFn: f });
  await handler(pedido("caminho=/movie/550&append_to_response=credits,videos,watch/providers&include_video_language=pt,en,null"));
  assert.equal(f.calls[0].url.searchParams.get("append_to_response"), "credits,videos,watch/providers");
  assert.equal(f.calls[0].url.searchParams.get("include_video_language"), "pt,en,null");
  await handler(pedido("caminho=/movie/550&append_to_response=images,reviews,similar&include_video_language=de"));
  assert.equal(f.calls[1].url.searchParams.has("append_to_response"), false);
  assert.equal(f.calls[1].url.searchParams.has("include_video_language"), false);
});

test("página só de 1 a 500", async () => {
  const f = fakeFetch();
  const handler = criarHandler({ token: "abc", fetchFn: f });
  for (const page of ["0", "501", "abc", "1.5", "-1"]) {
    await handler(pedido(`caminho=/discover/movie&page=${page}`));
    assert.equal(f.calls.at(-1).url.searchParams.has("page"), false, page);
  }
  await handler(pedido("caminho=/discover/movie&page=500"));
  assert.equal(f.calls.at(-1).url.searchParams.get("page"), "500");
});

test("parâmetro repetido usa o primeiro valor", async () => {
  const f = fakeFetch();
  await criarHandler({ token: "abc", fetchFn: f })(pedido("caminho=/discover/movie&page=1&page=2"));
  assert.deepEqual(f.calls[0].url.searchParams.getAll("page"), ["1"]);
});

test("só GET", async () => {
  const f = fakeFetch();
  const resposta = await criarHandler({ token: "abc", fetchFn: f })(pedido("caminho=/discover/movie", { method: "POST" }));
  assert.equal(resposta.status, 405);
  assert.equal(f.calls.length, 0);
});

test("token aparado no cabeçalho", async () => {
  const f = fakeFetch();
  await criarHandler({ token: "  abc \n", fetchFn: f })(pedido("caminho=/genre/movie/list"));
  assert.equal(f.calls[0].options.headers.Authorization, "Bearer abc");
});

test("token vazio dá 502 sem chamar o TMDB", async () => {
  for (const token of ["", "   ", undefined]) {
    const f = fakeFetch();
    const resposta = await criarHandler({ token, fetchFn: f })(pedido("caminho=/genre/movie/list"));
    assert.equal(resposta.status, 502);
    assert.deepEqual(await resposta.json(), { erro: "falha" });
    assert.equal(f.calls.length, 0);
  }
});

test("erros do TMDB viram 502 sem cache", async () => {
  for (const status of [401, 404, 500]) {
    const resposta = await criarHandler({ token: "abc", fetchFn: fakeFetch({}, status) })(pedido("caminho=/movie/550"));
    assert.equal(resposta.status, 502, String(status));
    assert.deepEqual(await resposta.json(), { erro: "falha" });
    assert.equal(resposta.headers.get("cache-control"), "no-store");
  }
});

test("falha de rede vira 502", async () => {
  const f = async () => { throw new TypeError("fetch failed"); };
  const resposta = await criarHandler({ token: "abc", fetchFn: f })(pedido("caminho=/movie/550"));
  assert.equal(resposta.status, 502);
  assert.deepEqual(await resposta.json(), { erro: "falha" });
});

test("cache por caminho", async () => {
  const esperado = {
    "/genre/movie/list": "public, s-maxage=86400, stale-while-revalidate=86400",
    "/watch/providers/movie": "public, s-maxage=86400, stale-while-revalidate=86400",
    "/discover/movie": "public, s-maxage=3600, stale-while-revalidate=86400",
    "/movie/550": "public, s-maxage=3600, stale-while-revalidate=86400",
  };
  for (const [caminho, cache] of Object.entries(esperado)) {
    const resposta = await criarHandler({ token: "abc", fetchFn: fakeFetch() })(pedido(`caminho=${caminho}`));
    assert.equal(resposta.headers.get("cache-control"), cache, caminho);
  }
});

test("400 e 405 também não ficam em cache", async () => {
  const handler = criarHandler({ token: "abc", fetchFn: fakeFetch() });
  assert.equal((await handler(pedido("caminho=/account"))).headers.get("cache-control"), "no-store");
  assert.equal((await handler(pedido("caminho=/movie/550", { method: "POST" }))).headers.get("cache-control"), "no-store");
});
