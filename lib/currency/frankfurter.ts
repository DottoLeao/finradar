const rateCache = new Map<string, Promise<number>>();

/**
 * Taxa de câmbio histórica (data da transação) via Frankfurter — API gratuita,
 * sem chave, dados do Banco Central Europeu. https://frankfurter.dev
 */
export function getHistoricalRate(date: string, from: string, to: string): Promise<number> {
  if (from === to) return Promise.resolve(1);

  const key = `${date}|${from}|${to}`;
  const cached = rateCache.get(key);
  if (cached) return cached;

  const promise = fetch(`https://api.frankfurter.dev/v2/rates?date=${date}&base=${from}&quotes=${to}`)
    .then((res) => {
      if (!res.ok) throw new Error(`Frankfurter respondeu ${res.status} pra ${key}`);
      return res.json();
    })
    .then((data: Array<{ quote: string; rate: number }>) => {
      const rate = data.find((entry) => entry.quote === to)?.rate;
      if (typeof rate !== "number") throw new Error(`Taxa ${from}->${to} não encontrada pra ${date}`);
      return rate;
    })
    .catch((err) => {
      rateCache.delete(key);
      throw err;
    });

  rateCache.set(key, promise);
  return promise;
}
