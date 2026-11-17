import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const NAVER_ETF_API = "https://finance.naver.com/api/sise/etfItemList.nhn";

export async function GET() {
  try {
    const upstream = await fetch(NAVER_ETF_API, {
      cache: "no-store",
      headers: { Accept: "application/json,text/plain,*/*", "User-Agent": "Mozilla/5.0 (compatible; ETFSignal/1.0)" },
    });
    if (!upstream.ok) throw new Error(`네이버 금융 응답 오류 (${upstream.status})`);

    const buffer = await upstream.arrayBuffer();
    const text = new TextDecoder("euc-kr").decode(buffer);
    const payload = JSON.parse(text) as { resultCode?: string; result?: { etfItemList?: Array<Record<string, unknown>> } };
    if (payload.resultCode !== "success" || !Array.isArray(payload.result?.etfItemList)) throw new Error("ETF 응답 형식이 예상과 다릅니다.");

    const items = payload.result.etfItemList.map((item) => ({
      itemcode: String(item.itemcode ?? ""), etfTabCode: Number(item.etfTabCode ?? 7), itemname: String(item.itemname ?? ""),
      nowVal: Number(item.nowVal ?? 0), risefall: String(item.risefall ?? "3"), changeVal: Number(item.changeVal ?? 0),
      changeRate: Number(item.changeRate ?? 0), nav: Number(item.nav ?? 0),
      threeMonthEarnRate: item.threeMonthEarnRate === null ? null : Number(item.threeMonthEarnRate ?? 0),
      quant: Number(item.quant ?? 0), amonut: Number(item.amonut ?? 0), marketSum: Number(item.marketSum ?? 0),
    }));

    return NextResponse.json({ items, fetchedAt: new Date().toISOString(), source: NAVER_ETF_API }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=30" } });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "ETF 데이터를 가져오지 못했습니다." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
