import {activeContributions,simulate,plans,contributionTypes,modelVersion} from './engine.mjs';
import {benefitImpacts} from './benefits.mjs';
import {rateNotice} from './rate-info.mjs?v=20260918-rates';

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const amount=n=>Number.isFinite(n)?Math.round(n).toLocaleString('ja-JP'):'—';
const yen=n=>`${amount(n)}円`;
const daily=n=>`${n.toLocaleString('ja-JP',{maximumFractionDigits:2})}円`;
const row=(label,b,a,kind='')=>`<tr class="${kind}"><th scope="row">${label}</th><td>${yen(b)}</td><td>${yen(a)}</td></tr>`;

export function buildReport(input,{date=new Date()}={}){
 const x=activeContributions(input),r=simulate(x);
 if(r.errors.length)throw new Error(r.errors.join(' '));
 const selective=['b','ab'].includes(x.type),matching=x.type==='am',hasPersonal=x.type!=='a';
 const after=matching?'マッチング拠出あり':selective?'選択制拠出あり':'会社拠出のみ';
 const name=contributionTypes[x.type].replace(/^[①②③④] /,'');
 const stamp=date.toLocaleDateString('ja-JP');
 const before=r.before,a=r.after,personal=x.personal+x.matching;
 const insurance=x.health==='kyouka'?`協会けんぽ ${x.prefecture}`:`組合健保等（健保${x.healthEmployeeRate}％・介護${x.careEmployeeRate}％・支援金${x.supportEmployeeRate}％／本人負担率）`;
 const employment={general:'一般',special:'農林水産・清酒製造・建設',none:'対象外'}[x.employment];
 const headline=r.savings>=0?'税金・社会保険料の負担軽減':'税金・社会保険料の負担増';
 const sourceLinks=[['厚生労働省・DC制度','https://www.mhlw.go.jp/stf/nenkin_shikumi_015.html'],['国税庁・所得税','https://www.nta.go.jp/publication/pamph/koho/kurashi/html/02_1.htm'],['協会けんぽ・料率','https://www.kyoukaikenpo.or.jp/about/business/insurance_rate/rate_prefectures/r08/'],['日本年金機構・報酬比例部分','https://www.nenkin.go.jp/service/yougo/hagyo/hoshuhirei.html'],['厚生労働省・給付上限','https://www.mhlw.go.jp/content/001728499.pdf']];
 const header=(n,title)=>`<header><div><p class="overline">FP-BITS　企業型DC シミュレーション</p><h1>${title}</h1></div><div class="doc-meta">試用版・概算<br>作成日 ${escape(stamp)}<br>${n} / 2</div></header>`;
 const footer=n=>`<footer><span>${escape(plans[x.plan].name)} ／ ${escape(name)}　・　計算モデル ${modelVersion}</span><span>fp-bits.com/dc-simulator/　　${n} / 2</span></footer>`;
 const payroll=[
  row('課税月給',x.salary,x.salary-x.personal),
  row('賞与（月平均）',(x.bonus1+x.bonus2)/12,(x.bonus1+x.bonus2)/12),
  row('非課税通勤手当',x.commute,x.commute),
  row('支給額合計',before.salary/12+x.commute,a.salary/12+x.commute,'subtotal'),
  ...[['健康保険料','health'],['介護保険料','care'],['子ども・子育て支援金','support'],['厚生年金保険料','pension'],['雇用保険料','employment']].map(([label,key])=>row(label,before.social.annual[key]/12,a.social.annual[key]/12)),
  row('所得税等（年末調整等反映後）',before.incomeTax/12,a.incomeTax/12),
  row('住民税所得割（翌年度・控除前）',before.residentTax/12,a.residentTax/12),
  ...(matching?[row('本人マッチング掛金',0,x.matching)]:[]),
  row('控除額合計',(before.social.total+before.incomeTax+before.residentTax)/12,(a.social.total+a.incomeTax+a.residentTax)/12+x.matching,'subtotal'),
  row('手取り額（月平均）',before.net/12,a.net/12,'takehome')
 ].join('');
 const impacts=benefitImpacts(x,before,a);
 const benefitRows=impacts.map(v=>`<tr><th scope="row">${v.title}</th>${v.unavailable?`<td colspan="3" class="unavailable">${escape(v.unavailable)}</td>`:`<td class="daily-cell">${v.daily.map(d=>`${v.daily.length>1?`<small>${escape(d.label.replace('・1日換算',''))}</small>`:''}<strong>${daily(d.loss)}／日</strong>`).join('<br>')}</td><td>${escape(v.period)}</td><td>${yen(v.loss)}</td>`}</tr>`).join('');
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>企業型DCシミュレーション_${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}</title><style>${reportCss}</style></head><body>
<nav class="print-toolbar" aria-label="PDF出力"><button type="button" onclick="window.print()">PDFに保存・印刷</button><div><strong>A4・縦・2ページ</strong><br>PC：印刷画面の送信先で「PDFに保存」を選択 → 保存 → 保存先フォルダーを指定。<br>用紙A4・倍率100％・ヘッダーとフッターOFFを推奨。スマートフォン・iPadは印刷／共有から「ファイルに保存」を選びます。<br>この画面は出力ボタンを押した時点の入力内容です。条件を変えたらアプリから再度出力してください。</div></nav>
<main>
<section class="sheet" aria-label="1ページ目 メリット">
${header(1,'給与と積立の変化')}
${rateNotice({health:x.health,date,compact:true})}
<div class="conditions"><strong>${escape(plans[x.plan].name)} ／ ${escape(name)}</strong><span>${x.age}歳 → ${x.endAge}歳・${r.months}か月</span><p>課税月給 ${yen(x.salary)} ／ 通勤 ${yen(x.commute)} ／ 賞与 年${yen(x.bonus1+x.bonus2)}<br>${escape(insurance)} ／ 雇用保険：${escape(employment)}<br>その他の所得控除：所得税 ${yen(x.incomeDeduction)}・住民税 ${yen(x.residentDeduction)}／年　DB等 ${yen(x.db)}／月</p></div>
<div class="hero"><div><span>${headline}／年</span><strong>${yen(Math.abs(r.savings))}</strong><small>月平均 ${yen(Math.abs(r.savings)/12)}</small></div><div class="hero-details"><p>所得税等 <b>${yen(r.tax)}</b></p><p>住民税所得割 <b>${yen(r.resident)}</b></p><p>社会保険料 <b>${yen(r.social)}</b></p></div></div>
<h2>給与明細イメージ <small>年額÷12の月平均・円</small></h2>
<p class="caption">本人拠出の有無を比較。${x.type==='a'?'Aタイプは本人拠出がないため、両列は同額です。':'会社拠出は両列に同額あり、給与の支給額には含めません。'}</p>
<table class="payroll"><thead><tr><th>項目</th><th>本人拠出なし</th><th>${after}</th></tr></thead><tbody>${payroll}</tbody></table>
<p class="caption">所得税は年末調整等の後、住民税は翌年度分の軽減を反映した比較です。実際の毎月の給与明細ではありません。賞与・賞与の保険料も12か月に均しており、端数処理で内訳と合計が一致しない場合があります。</p>
<div class="fund-box"><div><h2>DCへの積立</h2><p class="fund-total">${yen(r.monthlyContribution)}<small>／月</small></p><p class="caption">会社 ${yen(x.company)} ＋ 本人 ${yen(personal)}<br>${x.endAge}歳までの元本 ${yen(r.capital)}</p></div><div><h2>手取りの減少額</h2><p class="fund-total">${yen(matching?x.matching:r.netReduction/12)}<small>／月</small></p><p class="caption">${matching?`本人マッチング掛金による減少<br>（税軽減反映後の月平均：${yen(r.netReduction/12)}）`:'税・社会保険料の軽減反映後の月平均'}<br>本人掛金 ${yen(personal)} − 負担軽減 ${yen(r.savings/12)}</p></div></div>
<p class="note">${matching?'マッチング掛金は給与額を減らさず全額が所得控除です。掛金全額が還付されるものではありません。毎月の源泉徴収に反映される場合もあり、年末の還付額とは異なります。':selective?'本人の選択制拠出は給与からDCへ振り分けます。会社が別途負担する掛金は給与から差し引きません。':'会社が給与とは別に掛金を負担します。本人の手取り・税・社会保険料は今回の会社拠出では変わりません。'}${x.plan==='forche'?' forcheの別途会社負担費用473円／月は積立に含めません。':''} 運用益・受取時の税は未計算です。</p>
${footer(1)}</section>
<section class="sheet risks" aria-label="2ページ目 デメリットと留意点">
${header(2,'年金・給付への影響と留意点')}
${rateNotice({health:x.health,date,compact:true})}
<div class="risk-intro">${selective?'選択制DCで給与が下がると、将来の年金や一部の手当金・給付金が減る可能性があります。':'この拠出タイプでは給与や標準報酬月額を減らさないため、今回の拠出による年金・各種給付の減額はありません。'}</div>
<h2>将来の老齢厚生年金</h2>
<div class="pension-box"><div><span>年額の減少目安</span><strong>${yen(r.pensionAnnualLoss)}<small>／年</small></strong></div><div><span>月額の減少目安</span><strong>${yen(r.pensionMonthlyLoss)}<small>／月</small></strong></div></div>
<p class="caption">${x.age}歳から${x.endAge}歳まで（${x.endAge-x.age}年間・${r.months}か月）、同じ条件で拠出する前提。報酬比例部分の概算で、将来の年金総額を表すものではありません。</p>
<h2>他の手当金・給付金への影響</h2>
<table class="benefit-table"><thead><tr><th>制度</th><th>1日換算の減額目安</th><th>参考の対象期間</th><th>期間全体の減額</th></tr></thead><tbody>${benefitRows}</tbody></table>
<p class="caption">受給要件を満たす場合の比較例です。日額は小数第2位まで表示し、日額×日数と期間合計は端数処理で一致しない場合があります。異なる給付を合算したり、1ページ目の年間軽減額と一括で相殺したりしないでください。</p>
<h2>給付金の計算条件</h2>
<ul class="compact-notes">${impacts.map(v=>`<li><b>${v.title}：</b>${escape(v.note)}</li>`).join('')}</ul>
<div class="two-notes"><div><h2>知っておきたい制約</h2><ul><li>DC資産は原則60歳まで引き出せません。</li><li>${matching?'本人掛金を手取りから負担します。マッチング拠出中はiDeCoと併用できません。所得・税額が少ないと税軽減は小さくなります。':selective?'給与減額は労災の休業（補償）等給付、育児時短就業給付や高年齢雇用継続給付にも影響する場合があります（金額未試算）。':'本人負担はありませんが、受給条件・加入資格は勤務先規約によります。'}</li><li>選択可能な掛金・加入資格は勤務先規約等を確認してください。受取時の課税は未試算です。</li></ul></div><div><h2>概算の前提</h2><ul><li>2026年12月改正後の枠・規約変更反映を前提。2026年度の確認済み保険料率と年齢を固定し、所得税2026年分・住民税2027年度分を平年換算。</li><li>住民税は所得割・税額控除前。非課税判定、均等割・森林環境税、自治体の超過課税は未反映。</li><li>社会保険は標準報酬改定後。軽減開始の時期は再現せず、住民税軽減は原則翌年6月以降です。</li></ul></div></div>
<p class="note">出産・傷病は直前12か月の標準報酬一定、雇用給付は直前6か月の賃金一定・賞与なしの前提。加入12か月未満、休業中の給与・就業日数、健保の付加給付などは未反映。雇用給付上限は2026年8月改定額を固定。年金は報酬差×5.481/1,000×月数、将来の標準報酬上限改定を反映。再評価・物価調整等は未反映です。</p>
<p class="sources"><b>参照：</b>${sourceLinks.map(([label,url])=>`<a href="${url}">${label}</a>`).join(' ／ ')}。プランは提供資料2026年9月版。詳細・各給付の出典は <a href="https://fp-bits.com/dc-simulator/#assumptions">公開アプリの計算前提・出典</a> を参照。</p>
${footer(2)}</section></main></body></html>`;
}

export function openReport(input){
 const html=buildReport(input);
 const report=window.open('','_blank');
 if(!report)throw new Error('出力画面を開けませんでした。ポップアップを許可して、もう一度お試しください。');
 report.opener=null;
 report.document.open();report.document.write(html);report.document.close();
}

const reportCss=`
.rate-notice-print{border-left:3px solid #476879;background:#f2f6f9;padding:1.5mm 3mm;font-size:8pt;line-height:1.5}.rate-notice-print p{margin:0}.rate-notice-print strong{color:#173e60}.rate-caveat{font-size:7pt;color:#506372}.rate-status{color:#89511f;font-weight:700}.rate-expired{border-color:#89511f}
@page{size:A4 portrait;margin:10mm}
*{box-sizing:border-box}body{margin:0;background:#e9edf1;color:#21384b;font-family:"Yu Gothic","Meiryo",sans-serif;font-size:9pt;line-height:1.5}main{margin:auto;width:190mm}.sheet{background:white;width:190mm;min-height:276mm;padding:0;position:relative;margin:8mm auto;display:flex;flex-direction:column;gap:1.1mm}header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #173e60;padding-bottom:2mm}.overline{margin:0 0 1mm;font-size:8pt;letter-spacing:.07em;color:#476879}h1{font-size:20pt;margin:0;line-height:1.3}h2{font-size:11pt;margin:1mm 0 0;color:#173e60}h2 small{font-size:8pt;font-weight:400;margin-left:2mm}.doc-meta{text-align:right;font-size:8pt;line-height:1.6}.conditions{background:#f2f6f9;padding:2mm 4mm;border:1px solid #dbe3ea;font-size:8pt}.conditions>span{float:right}.conditions p{margin:1mm 0 0;line-height:1.6}.hero{background:#173e60;color:white;display:grid;grid-template-columns:1fr 1fr;padding:3mm 5mm;gap:6mm}.hero span{font-size:10pt}.hero strong{font-size:25pt;display:block;line-height:1.4}.hero small{font-size:8pt}.hero-details{border-left:1px solid #7490a7;padding-left:5mm;align-self:center}.hero-details p{margin:1mm 0;display:flex;justify-content:space-between;font-size:9pt}.caption{font-size:7.5pt;color:#506372;line-height:1.6;margin:0}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.5pt;font-variant-numeric:tabular-nums}th,td{padding:1.1mm 2.5mm;border-bottom:1px solid #d9e1e8;text-align:right;vertical-align:middle;overflow-wrap:anywhere}th:first-child{text-align:left}thead th{background:#edf3f8;font-size:8pt;color:#385265}tbody th{font-weight:400}.payroll th:first-child{width:48%}.payroll td{white-space:nowrap}.subtotal{background:#f4f6f8;font-weight:600}.takehome{background:#e7f1f8;font-weight:700;font-size:11pt}.takehome th{font-weight:700}.fund-box{border:1px solid #b7cbdc;padding:2mm 4mm;display:grid;grid-template-columns:1fr 1fr;gap:5mm}.fund-total{font-size:20pt;font-weight:700;color:#173e60;margin:1mm 0}.fund-total small{font-size:9pt;font-weight:400}.note{font-size:7.5pt;line-height:1.65;margin:0;color:#506372}.risks{gap:.5mm}.risk-intro{border-left:3px solid #aa682e;background:#fcf5ed;padding:2mm 4mm;font-size:10pt}.pension-box{display:grid;grid-template-columns:1fr 1fr;border:1px solid #ddc3a8;padding:2mm 4mm;gap:5mm}.pension-box span{display:block;font-size:8.5pt}.pension-box strong{display:block;font-size:20pt;color:#89511f}.pension-box small{font-size:9pt;font-weight:400}.benefit-table th:first-child{width:25%}.benefit-table th:nth-child(2){width:29%}.benefit-table th:nth-child(3){width:24%}.benefit-table td{padding:1.1mm 2mm;font-size:8pt}.benefit-table .daily-cell strong{font-size:10pt;color:#89511f;white-space:nowrap}.daily-cell small{font-size:7pt;display:block}.benefit-table .unavailable{text-align:left}.compact-notes{margin:0;padding-left:4mm;font-size:7.3pt;line-height:1.55}.compact-notes li{margin:.4mm 0}.two-notes{display:grid;grid-template-columns:1fr 1fr;gap:5mm;border-top:1px solid #d9e1e8;padding-top:2mm}.two-notes h2{font-size:10pt}.two-notes ul{padding-left:4mm;margin:1mm 0;font-size:7.5pt;line-height:1.6}.two-notes li{margin:.4mm 0}.sources{font-size:7pt;color:#506372;margin:0;line-height:1.5}.sources a{color:inherit;text-decoration:underline}footer{margin-top:auto;display:flex;justify-content:space-between;border-top:1px solid #c9d6df;padding-top:2mm;font-size:7pt;color:#506372;gap:3mm}.print-toolbar{max-width:190mm;margin:6mm auto;padding:4mm;background:white;display:flex;gap:4mm;align-items:center;font-size:12px}.print-toolbar button{padding:12px;white-space:nowrap;background:#173e60;color:white;border:0;border-radius:6px;font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #2563bb;outline-offset:3px}@media screen{.sheet{box-shadow:0 3px 20px #172e4320;padding:8mm;width:206mm;min-height:292mm}main{width:206mm}.print-toolbar{max-width:206mm}}@media(max-width:780px){.print-toolbar{margin:12px;padding:12px;display:block}.print-toolbar button{margin-bottom:8px}main{max-width:100%;overflow-x:auto}.sheet{margin:12px 0}}@media print{body{background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}.print-toolbar{display:none}main{width:auto}.sheet{margin:0;break-after:page;page-break-after:always;min-height:276mm}.sheet:last-child{break-after:auto;page-break-after:auto}tr{break-inside:avoid}}
`;
