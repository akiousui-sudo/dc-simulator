// Version information for the rates actually used in engine.mjs, not the current calendar year.
// The review deadline is an app maintenance guideline, not a statutory expiry date.
export const rateEdition={year:2026,verifiedOn:'2026-09-18',reviewBy:'2027-02-28'};
const title='社会保険料：令和8年度（2026年度）版料率';
const deadline='見直し期限：次年度料率の公表時（遅くとも令和9年・2027年2月末を目安）';
const caveat='次年度料率の公表・途中改定時は期限前でも更新が必要です。法令上の一律の有効期限ではありません。';

export function rateNotice({health='kyouka',date=new Date(),compact=false}={}){
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
 const expired=today>rateEdition.reviewBy;
 const reviewSeason=today>='2027-01-01';
 const status=compact?'':expired?'見直し目安を過ぎています。令和8年度の料率による参考試算です。最新料率への更新を確認してください。':reviewSeason?'次年度料率の確認時期です。公表状況を確認してください。この試算は令和8年度の料率のままです。':'';
 const compactCaveat=expired?'要更新：見直し目安を過ぎています（令和8年度料率の参考試算）。':reviewSeason?'次年度料率を要確認：この試算は令和8年度の料率のままです。':'';
 const union=health==='union'?'組合健保等の健康・介護・支援金は入力料率を使用。適用期間は加入先に確認してください。':'';
 return `<section class="rate-notice${compact?' rate-notice-print':''}${expired?' rate-expired':''}" aria-label="使用料率の年度と見直し期限"><strong>${title}${health==='union'?'（組合健保等は入力料率）':''}</strong><p class="rate-deadline">${deadline}</p>${status?`<p class="rate-status">${status}</p>`:''}<p class="rate-caveat">${compactCaveat||(union||caveat)}</p>${compact?'':`<details><summary>料率の適用時期・出典</summary><p>${union?caveat:'組合健保等を選択した場合、健康・介護・支援金は入力された本人負担率を使用します。'}</p><ul><li>協会けんぽの健康・介護保険：令和8年（2026年）3月分から（4月納付分から）。次年度の適用開始日は未確認です。</li><li>子ども・子育て支援金：令和8年（2026年）4月分から（5月納付分から）。</li><li>雇用保険：令和8年（2026年）4月1日～令和9年（2027年）3月31日。</li></ul><p>公表日と適用開始日は異なります。公表時に次年度分への更新を準備し、適用時期を確認します。本アプリは2026年12月の条件で料率を固定した概算で、年度は自動更新されません。</p><p>料率確認日：令和8年（2026年）9月18日 ／ <a href="https://www.kyoukaikenpo.or.jp/shibu/wakayama/public_relations/e-mail_magazine/670.html" target="_blank" rel="noopener noreferrer">協会けんぽ・適用開始月</a> ／ <a href="https://www.mhlw.go.jp/content/001692566.pdf" target="_blank" rel="noopener noreferrer">厚生労働省・雇用保険料率</a></p></details>`}</section>`;
}
