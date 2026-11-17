"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Filter,
  Layers3,
  LoaderCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type EtfItem = {
  itemcode: string;
  etfTabCode: number;
  itemname: string;
  nowVal: number;
  risefall: string;
  changeVal: number;
  changeRate: number;
  nav: number;
  threeMonthEarnRate: number | null;
  quant: number;
  amonut: number;
  marketSum: number;
};

type ApiPayload = {
  items: EtfItem[];
  fetchedAt: string;
  source: string;
};

type SortKey = "marketSum" | "changeRate" | "threeMonthEarnRate" | "quant" | "amonut" | "nowVal";

const categoryNames: Record<number, string> = {
  1: "국내 시장지수",
  2: "국내 업종·테마",
  3: "국내 파생",
  4: "해외 주식",
  5: "원자재",
  6: "채권",
  7: "기타",
};

const categoryColors: Record<number, string> = {
  1: "#16a86b",
  2: "#4f7cf7",
  3: "#8b5cf6",
  4: "#f59e0b",
  5: "#ec6b58",
  6: "#14b8a6",
  7: "#78909c",
};

const brandManagers: Array<[string, string]> = [
  ["KODEX", "삼성자산운용"],
  ["TIGER", "미래에셋자산운용"],
  ["RISE", "KB자산운용"],
  ["KBSTAR", "KB자산운용"],
  ["ACE", "한국투자신탁운용"],
  ["KINDEX", "한국투자신탁운용"],
  ["SOL", "신한자산운용"],
  ["PLUS", "한화자산운용"],
  ["ARIRANG", "한화자산운용"],
  ["HANARO", "NH-Amundi자산운용"],
  ["KIWOOM", "키움투자자산운용"],
  ["KOSEF", "키움투자자산운용"],
  ["TIMEFOLIO", "타임폴리오자산운용"],
  ["1Q", "하나자산운용"],
  ["WOORI", "우리자산운용"],
  ["BNK", "BNK자산운용"],
  ["MASTER", "메리츠자산운용"],
  ["FOCUS", "브이아이자산운용"],
  ["VITA", "IBK자산운용"],
  ["TREX", "유리자산운용"],
];

function issuerOf(name: string) {
  const upper = name.toUpperCase();
  const found = brandManagers.find(([brand]) => upper === brand || upper.startsWith(`${brand} `));
  if (found) return { brand: found[0], manager: found[1] };
  const brand = name.trim().split(/\s+/)[0] || "기타";
  return { brand, manager: "기타 운용사" };
}

const integer = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

function formatPrice(value: number) {
  return `${integer.format(value)}원`;
}

function formatMarketCap(value: number) {
  if (value >= 10_000) return `${(value / 10_000).toFixed(value >= 100_000 ? 0 : 1)}조원`;
  return `${integer.format(value)}억원`;
}

function formatAmount(value: number) {
  const eok = value / 100;
  if (eok >= 10_000) return `${(eok / 10_000).toFixed(1)}조원`;
  return `${integer.format(eok)}억원`;
}

function formatPct(value: number | null, digits = 2) {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function tone(value: number | null) {
  if (!value) return "neutral";
  return value > 0 ? "positive" : "negative";
}

export default function Home() {
  const [items, setItems] = useState<EtfItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [issuer, setIssuer] = useState("전체 운용사");
  const [category, setCategory] = useState("전체 시장");
  const [sortKey, setSortKey] = useState<SortKey>("marketSum");
  const [descending, setDescending] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<EtfItem | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await fetch("/api/etfs", { cache: "no-store" });
      const payload = (await response.json()) as ApiPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || "ETF 데이터를 불러오지 못했습니다.");
      setItems(payload.items);
      setFetchedAt(payload.fetchedAt);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => void loadData(true), 30_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, loadData]);

  const enriched = useMemo(
    () => items.map((item) => ({ ...item, ...issuerOf(item.itemname) })),
    [items],
  );

  const issuers = useMemo(
    () => ["전체 운용사", ...Array.from(new Set(enriched.map((item) => item.manager))).sort()],
    [enriched],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return enriched
      .filter((item) => !normalized || item.itemname.toLowerCase().includes(normalized) || item.itemcode.includes(normalized))
      .filter((item) => issuer === "전체 운용사" || item.manager === issuer)
      .filter((item) => category === "전체 시장" || categoryNames[item.etfTabCode] === category)
      .sort((a, b) => {
        const av = a[sortKey] ?? Number.NEGATIVE_INFINITY;
        const bv = b[sortKey] ?? Number.NEGATIVE_INFINITY;
        return (Number(av) - Number(bv)) * (descending ? -1 : 1);
      });
  }, [category, descending, enriched, issuer, query, sortKey]);

  useEffect(() => setPage(1), [query, issuer, category, sortKey, descending]);

  const pageSize = 15;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalMarketCap = useMemo(() => items.reduce((sum, item) => sum + item.marketSum, 0), [items]);
  const totalAmount = useMemo(() => items.reduce((sum, item) => sum + item.amonut, 0), [items]);
  const averageThreeMonth = useMemo(() => {
    const values = items.map((item) => item.threeMonthEarnRate).filter((value): value is number => value !== null);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }, [items]);

  const issuerStats = useMemo(() => {
    const map = new Map<string, { count: number; marketSum: number; brand: string }>();
    enriched.forEach((item) => {
      const current = map.get(item.manager) || { count: 0, marketSum: 0, brand: item.brand };
      current.count += 1;
      current.marketSum += item.marketSum;
      map.set(item.manager, current);
    });
    return [...map.entries()]
      .map(([manager, stat]) => ({ manager, ...stat }))
      .sort((a, b) => b.marketSum - a.marketSum);
  }, [enriched]);

  const categoryStats = useMemo(() => {
    const total = Math.max(1, items.length);
    return Object.entries(categoryNames).map(([code, name]) => {
      const numberCode = Number(code);
      const group = items.filter((item) => item.etfTabCode === numberCode);
      return {
        code: numberCode,
        name,
        count: group.length,
        share: (group.length / total) * 100,
        marketSum: group.reduce((sum, item) => sum + item.marketSum, 0),
      };
    });
  }, [items]);

  const leaders = useMemo(() => [...items].sort((a, b) => b.changeRate - a.changeRate).slice(0, 5), [items]);
  const laggards = useMemo(() => [...items].sort((a, b) => a.changeRate - b.changeRate).slice(0, 5), [items]);
  const maxIssuerCap = issuerStats[0]?.marketSum || 1;

  function resetFilters() {
    setQuery("");
    setIssuer("전체 운용사");
    setCategory("전체 시장");
    setSortKey("marketSum");
    setDescending(true);
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark"><BarChart3 size={20} /></span>
          <div><strong>ETF SIGNAL</strong><span>NAVER FINANCE DATA</span></div>
        </div>
        <div className="topbar-actions">
          <label className="auto-refresh">
            <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
            <span>30초 자동 갱신</span>
          </label>
          <button className="refresh-button" type="button" onClick={() => void loadData(true)} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? "spin" : ""} /> 새로고침
          </button>
        </div>
      </header>

      <section className="hero-section">
        <div>
          <div className="eyebrow"><span className="live-dot" /> LIVE MARKET BOARD</div>
          <h1>대한민국 ETF 시장을<br /><em>한 화면에서.</em></h1>
          <p>네이버 금융 시세를 기반으로 운용사, 투자시장, 상품 단위의 흐름을 빠르게 비교합니다.</p>
        </div>
        <div className="update-card">
          <span>최근 데이터 수신</span>
          <strong>{fetchedAt ? new Date(fetchedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "연결 중"}</strong>
          <small>{fetchedAt ? new Date(fetchedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "네이버 금융 API"}</small>
        </div>
      </section>

      {error && (
        <div className="error-banner" role="alert">
          <CircleAlert size={18} /><span>{error}</span><button type="button" onClick={() => void loadData()}>다시 시도</button>
        </div>
      )}

      <section className="metric-grid" aria-label="시장 요약">
        <article className="metric-card accent-card">
          <span className="metric-icon"><Layers3 size={19} /></span>
          <div><span>전체 상품</span><strong>{loading ? "—" : integer.format(items.length)}<small>종목</small></strong></div><p>국내 상장 ETF</p>
        </article>
        <article className="metric-card">
          <span className="metric-icon"><Building2 size={19} /></span>
          <div><span>순자산 규모</span><strong>{loading ? "—" : formatMarketCap(totalMarketCap)}</strong></div><p>전체 시가총액 합계</p>
        </article>
        <article className="metric-card">
          <span className="metric-icon"><BarChart3 size={19} /></span>
          <div><span>오늘 거래대금</span><strong>{loading ? "—" : formatAmount(totalAmount)}</strong></div><p>전체 상품 합계</p>
        </article>
        <article className="metric-card">
          <span className="metric-icon"><ArrowUpRight size={19} /></span>
          <div><span>3개월 평균</span><strong className={tone(averageThreeMonth)}>{loading ? "—" : formatPct(averageThreeMonth)}</strong></div><p>단순 평균 수익률</p>
        </article>
      </section>

      <section className="analysis-grid">
        <article className="panel issuer-panel">
          <div className="panel-heading"><div><span>운용사별 분석</span><h2>순자산 상위 운용사</h2></div><span className="panel-meta">상위 8개사</span></div>
          <div className="issuer-bars">
            {issuerStats.slice(0, 8).map((stat, index) => (
              <button key={stat.manager} type="button" className="issuer-row" onClick={() => setIssuer(stat.manager)}>
                <span className="rank">{String(index + 1).padStart(2, "0")}</span>
                <span className="issuer-name"><strong>{stat.manager}</strong><small>{stat.brand} · {stat.count}개</small></span>
                <span className="bar-track"><span style={{ width: `${(stat.marketSum / maxIssuerCap) * 100}%` }} /></span>
                <span className="issuer-value">{formatMarketCap(stat.marketSum)}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="panel market-panel">
          <div className="panel-heading"><div><span>시장별 분석</span><h2>투자시장 구성</h2></div><span className="panel-meta">네이버 분류</span></div>
          <div className="market-donut-wrap">
            <div className="market-donut" style={{ background: `conic-gradient(${categoryStats.map((stat, index) => `${categoryColors[stat.code]} ${categoryStats.slice(0, index).reduce((sum, item) => sum + item.share, 0)}% ${categoryStats.slice(0, index + 1).reduce((sum, item) => sum + item.share, 0)}%`).join(",")})` }}>
              <div><strong>{items.length}</strong><span>ETF</span></div>
            </div>
            <div className="market-legend">
              {categoryStats.map((stat) => (
                <button key={stat.code} type="button" onClick={() => setCategory(stat.name)}>
                  <span className="legend-dot" style={{ background: categoryColors[stat.code] }} /><span>{stat.name}</span><strong>{stat.count}</strong>
                </button>
              ))}
            </div>
          </div>
        </article>

        <article className="panel movers-panel">
          <div className="panel-heading"><div><span>당일 등락</span><h2>상승·하락 리더</h2></div><span className="panel-meta">실시간</span></div>
          <div className="movers-columns">
            <div><h3><ArrowUpRight size={15} /> 상승 상위</h3>{leaders.map((item) => <button key={item.itemcode} type="button" onClick={() => setSelected(item)}><span><strong>{item.itemname}</strong><small>{item.itemcode}</small></span><b className="positive">{formatPct(item.changeRate)}</b></button>)}</div>
            <div><h3><ArrowDownRight size={15} /> 하락 상위</h3>{laggards.map((item) => <button key={item.itemcode} type="button" onClick={() => setSelected(item)}><span><strong>{item.itemname}</strong><small>{item.itemcode}</small></span><b className="negative">{formatPct(item.changeRate)}</b></button>)}</div>
          </div>
        </article>
      </section>

      <section className="panel product-panel">
        <div className="product-heading"><div><span>상품별 조회</span><h2>ETF 상품 스크리너</h2></div><p>검색 결과 <strong>{integer.format(filtered.length)}</strong>개</p></div>

        <div className="filter-row">
          <label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품명 또는 종목코드 검색" /></label>
          <label><Building2 size={16} /><select value={issuer} onChange={(event) => setIssuer(event.target.value)} aria-label="운용사 선택">{issuers.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label><Filter size={16} /><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="시장 선택"><option>전체 시장</option>{Object.values(categoryNames).map((name) => <option key={name}>{name}</option>)}</select></label>
          <label><SlidersHorizontal size={16} /><select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} aria-label="정렬 기준"><option value="marketSum">시가총액</option><option value="changeRate">오늘 수익률</option><option value="threeMonthEarnRate">3개월 수익률</option><option value="amonut">거래대금</option><option value="quant">거래량</option><option value="nowVal">현재가</option></select></label>
          <button className="direction-button" type="button" onClick={() => setDescending((value) => !value)}>{descending ? "내림차순 ↓" : "오름차순 ↑"}</button>
          <button className="reset-button" type="button" onClick={resetFilters}>초기화</button>
        </div>

        <div className="table-scroll">
          <table>
            <thead><tr><th>상품</th><th>시장</th><th>현재가</th><th>오늘</th><th>3개월</th><th>거래대금</th><th>순자산</th><th>NAV 괴리</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8}><div className="loading-state"><LoaderCircle className="spin" /> 실시간 ETF 데이터를 불러오는 중입니다.</div></td></tr> : pageItems.length ? pageItems.map((item) => {
                const issuerInfo = issuerOf(item.itemname);
                const gap = item.nav ? ((item.nowVal - item.nav) / item.nav) * 100 : 0;
                return (
                  <tr key={item.itemcode} onClick={() => setSelected(item)}>
                    <td><div className="product-name"><span>{issuerInfo.brand.slice(0, 2)}</span><div><strong>{item.itemname}</strong><small>{item.itemcode} · {issuerInfo.manager}</small></div></div></td>
                    <td><span className="category-pill" style={{ "--pill-color": categoryColors[item.etfTabCode] } as React.CSSProperties}>{categoryNames[item.etfTabCode] || "기타"}</span></td>
                    <td><strong>{formatPrice(item.nowVal)}</strong></td><td className={tone(item.changeRate)}>{formatPct(item.changeRate)}</td><td className={tone(item.threeMonthEarnRate)}>{formatPct(item.threeMonthEarnRate)}</td><td>{formatAmount(item.amonut)}</td><td>{formatMarketCap(item.marketSum)}</td><td className={Math.abs(gap) > 1 ? "warning" : "neutral"}>{formatPct(gap)}</td>
                  </tr>
                );
              }) : <tr><td colSpan={8}><div className="empty-state">조건에 맞는 ETF가 없습니다.<button type="button" onClick={resetFilters}>필터 초기화</button></div></td></tr>}
            </tbody>
          </table>
        </div>

        <div className="pagination"><span>{(page - 1) * pageSize + (filtered.length ? 1 : 0)}–{Math.min(page * pageSize, filtered.length)} / {integer.format(filtered.length)}</span><div><button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={17} /></button><strong>{page} / {pageCount}</strong><button type="button" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight size={17} /></button></div></div>
      </section>

      <footer><div><strong>ETF SIGNAL</strong><span>투자 판단을 위한 참고용 정보이며, 데이터 지연 또는 오류가 발생할 수 있습니다.</span></div><a href="https://finance.naver.com/sise/etf.naver" target="_blank" rel="noreferrer">데이터: 네이버 금융 <ExternalLink size={13} /></a></footer>

      {selected && (
        <div className="detail-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <aside className="detail-drawer" role="dialog" aria-modal="true" aria-label={`${selected.itemname} 상세 정보`} onMouseDown={(event) => event.stopPropagation()}>
            <button className="drawer-close" type="button" onClick={() => setSelected(null)}><X size={19} /></button>
            <span className="drawer-kicker">PRODUCT INSIGHT</span><h2>{selected.itemname}</h2><p>{selected.itemcode} · {issuerOf(selected.itemname).manager}</p>
            <div className="drawer-price"><strong>{formatPrice(selected.nowVal)}</strong><span className={tone(selected.changeRate)}>{formatPct(selected.changeRate)}</span></div>
            <div className="drawer-grid"><div><span>NAV</span><strong>{formatPrice(selected.nav)}</strong></div><div><span>NAV 괴리율</span><strong>{formatPct(selected.nav ? ((selected.nowVal - selected.nav) / selected.nav) * 100 : 0)}</strong></div><div><span>3개월 수익률</span><strong className={tone(selected.threeMonthEarnRate)}>{formatPct(selected.threeMonthEarnRate)}</strong></div><div><span>거래량</span><strong>{integer.format(selected.quant)}주</strong></div><div><span>거래대금</span><strong>{formatAmount(selected.amonut)}</strong></div><div><span>순자산</span><strong>{formatMarketCap(selected.marketSum)}</strong></div></div>
            <div className="drawer-category"><span style={{ background: categoryColors[selected.etfTabCode] }} />{categoryNames[selected.etfTabCode]}</div>
            <a className="naver-link" href={`https://finance.naver.com/item/main.naver?code=${selected.itemcode}`} target="_blank" rel="noreferrer">네이버 금융에서 상세 보기 <ExternalLink size={15} /></a>
          </aside>
        </div>
      )}
    </main>
  );
}
