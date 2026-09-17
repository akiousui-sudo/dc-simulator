import {benefitImpacts,benefitSources} from './benefits.mjs';
import {defaults,healthRates,contributionTypes,activeContributions,contributionLimits,simulate} from './engine.mjs';
import {fieldKeys,initialInputs,storageKeys,loadInputs,saveInputs} from './input-state.mjs';
import {openReport} from './report.mjs';
const form=document.querySelector('#inputs'),$=id=>document.getElementById(id);
const fmt=n=>Number.isFinite(n)?Math.round(n).toLocaleString('ja-JP'):'—',yen=n=>`${fmt(n)}円`;
const getStorage=()=>window.localStorage;
const storedPreset=loadInputs(getStorage,storageKeys.preset),storedCurrent=loadInputs(getStorage,storageKeys.current);
let preset=storedPreset.values||{...initialInputs},hasPreset=!!storedPreset.values;
const defaultDialog=$('default-confirm');
let confirmedAction=null;
function confirmDefault(action){
 if(defaultDialog.open)return;
 if(action==='save'&&simulate(read()).errors.length){showStatus('入力エラーを修正してから、デフォルトに設定してください。');return;}
 $('default-confirm-title').textContent=action==='save'?'デフォルト設定の確認':'デフォルト呼び出しの確認';
 $('default-confirm-message').textContent=action==='save'
  ?'現在の入力内容をデフォルトに設定します。よろしいですか？'
  :hasPreset?'現在の入力内容をクリアして、設定されているデフォルトに戻します。よろしいですか？'
  :'デフォルトが未設定のため、現在の入力内容をクリアして、アプリ共通の初期値に戻します。よろしいですか？';
 $('default-confirm-note').textContent=action==='save'&&hasPreset?'保存済みのデフォルト設定は上書きされます。':action==='reset'?'保存済みのデフォルト設定は変更しません。':'この端末・ブラウザに設定を保存します。';
 $('default-confirm-yes').textContent=action==='save'?'Yes（設定する）':'Yes（戻す）';
 confirmedAction=action;
 defaultDialog.returnValue='';
 defaultDialog.showModal();
}
defaultDialog.addEventListener('cancel',()=>{confirmedAction=null;});
defaultDialog.querySelector('form').addEventListener('submit',event=>{
 event.preventDefault();
 const action=confirmedAction;confirmedAction=null;
 const answer=event.submitter?.value||'no';
 defaultDialog.close(answer);
 if(answer!=='yes')return;
 if(action==='save')saveDefault();
 else if(action==='reset')reset();
});
form.elements.type.innerHTML=Object.entries(contributionTypes).map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
form.elements.prefecture.innerHTML=Object.keys(healthRates).map(p=>`<option>${p}</option>`).join('');
const typeDescriptions={
 a:'会社が給与とは別に掛金を負担します。本人の掛金負担はありません。',
 am:'会社拠出に、本人がマッチング掛金を追加します。給与額は変えず、本人掛金の全額を所得控除します。',
 b:'給与の一部を本人がDCに振り分けます。会社拠出はなく、給与の減額が税・保険料・給付に影響します。',
 ab:'会社が給与とは別に拠出し、本人も給与の一部をDCに振り分けます。給与の減額は本人の選択制分だけです。'
};
function read(){return activeContributions({...defaults,...Object.fromEntries(fieldKeys.map(k=>[k,typeof defaults[k]==='number'?(form.elements[k].value.trim()===''?NaN:Number(form.elements[k].value)):form.elements[k].value]))});}
function rawInputs(){return Object.fromEntries(fieldKeys.map(k=>[k,form.elements[k].value]));}
function applyInputs(values){for(const k of fieldKeys)form.elements[k].value=values[k];render();}
function showStatus(message){$('input-status').textContent=message;$('input-status-bottom').textContent=message;}
function presetDescription(){ $('default-description').textContent=hasPreset?'「デフォルトに戻す」で、ご自身が保存した設定に戻ります。':'デフォルトは未設定です。「デフォルトに戻す」でアプリ共通の初期値に戻ります。'; }
function persistCurrent(){
 const saved=saveInputs(getStorage,storageKeys.current,rawInputs());
 showStatus(saved?'入力内容をこのブラウザに保存しました。':'このブラウザに保存できません。入力はこの画面を開いている間だけ保持されます。');
 return saved;
}
function reset(){applyInputs(preset);if(persistCurrent())showStatus(hasPreset?'保存したデフォルトに戻しました。':'アプリ共通の初期値に戻しました。');}
function saveDefault(){
 if(simulate(read()).errors.length){showStatus('入力エラーを修正してから、デフォルトに設定してください。');return;}
 const values=rawInputs();
 if(!saveInputs(getStorage,storageKeys.preset,values)){showStatus('デフォルトを保存できませんでした。ブラウザの保存設定を確認してください。');return;}
 preset=values;hasPreset=true;presetDescription();
 if(persistCurrent())showStatus('現在の入力を、ご自身のデフォルトとして保存しました。');
}
function updateInputs(event){
 const name=event.target.name;
 if(name==='personal')form.elements.matching.value=form.elements.personal.value;
 if(name==='matching')form.elements.personal.value=form.elements.matching.value;
 render();persistCurrent();
}
function afterLabel(x){return x.type==='am'?'マッチング拠出あり':x.type==='a'?'Aタイプ（会社拠出のみ）':'選択制拠出あり';}
function render(){
 const x=read(),l=contributionLimits(x),matching=x.type==='am',selective=['b','ab'].includes(x.type);
 for(const [key,visible]of [['company',x.type!=='b'],['personal',selective],['matching',matching]]){
  $(key+'-field').hidden=!visible;form.elements[key].disabled=!visible;
 }
 $('contribution-fields').classList.toggle('single',x.type!=='ab');
 $('personal-slider').hidden=x.type==='a';
 $('type-description').textContent=typeDescriptions[x.type]||'';
 $('matching-effects').hidden=!matching;
 $('limits').innerHTML=`<div><span>プラン上限（2026年9月版）</span><strong>${yen(l.plan)}／月</strong></div><div><span>法令上限（他制度分控除後）</span><strong>${yen(l.legal)}／月</strong></div><div><span>プラン上限（他制度分控除後）</span><strong>${yen(l.planAfterDb)}／月</strong></div><div><span>試算に使う適用上限</span><strong>${yen(l.applicable)}／月</strong></div><div><span>${x.type==='a'?'本人拠出':matching?'本人マッチングの上限':'本人選択制の上限'}</span><strong>${x.type==='a'?'なし':yen(l.personal)+'／月'}</strong></div>`;
 const max=Number.isFinite(l.personal)?l.personal:0,personal=x.personal+x.matching,slider=$('contribution-slider');
 slider.max=max;slider.value=Number.isFinite(personal)?Math.min(max,personal):0;slider.disabled=x.type==='a'||!Number.isFinite(l.personal);$('sliderMax').textContent=yen(max);
 const union=x.health==='union';$('union-fields').hidden=!union;$('prefecture-field').hidden=union;$('region-help').hidden=union;
 const r=simulate(x);$('error').hidden=!r.errors.length;$('valid-results').hidden=!!r.errors.length;
 $('export-report').disabled=!!r.errors.length;
 $('report-status').textContent=r.errors.length?'入力エラーを修正すると出力できます。':'';
 if(r.errors.length){$('mobile-savings').textContent='入力を確認';$('error').textContent=r.errors.join(' ');$('rate-description').textContent='入力内容を確認してください。';return;}
 const rr=r.after.social.rates;
 $('rate-description').textContent=`本人負担率：健康保険 ${(rr.healthRate*100).toFixed(3)}％／介護 ${(rr.careRate*100).toFixed(3)}％／支援金 ${(rr.supportRate*100).toFixed(3)}％／厚生年金 9.150％。`;
 $('savings').textContent=fmt(r.savings);$('mobile-savings').textContent=yen(r.savings);
 $('monthly-savings').textContent=`1か月あたり ${yen(r.savings/12)} の軽減目安${r.savings<0?'（マイナスは負担増）':''}`;
 for(const k of ['tax','resident','social'])$(k).textContent=yen(r[k]);
 $('saving-bar').innerHTML=[r.tax,r.resident,r.social].map(n=>`<span style="width:${r.savings>0?Math.max(0,n)/r.savings*100:0}%"></span>`).join('');
 $('matching-deduction').textContent=yen(r.after.matchingDeduction)+'／年';
 $('monthly-contribution').textContent=yen(r.monthlyContribution);
 const personalPart=matching?`マッチング ${yen(x.matching)}`:`選択制 ${yen(x.personal)}`;
 $('contribution-parts').textContent=`会社 ${yen(x.company)}${x.type==='a'?'':' ＋ 本人'+personalPart}${x.plan==='forche'&&r.monthlyContribution>0?'。別途会社負担の費用473円は含みません。':''}`;
 $('net-reduction-label').textContent=matching?'手取りの減少額（本人掛金分）':'手取りの減少額';
 $('net-reduction').textContent=yen(matching?x.matching:r.netReduction/12);
 $('net-reduction-adjusted').hidden=!matching;
 $('net-reduction-adjusted').textContent=matching?`（年末調整等・翌年度住民税の軽減を反映した目安：${yen(r.netReduction/12)}／月）`:'';
 $('net-reduction-note').textContent=matching?'大きな金額は毎月の本人マッチング掛金です。括弧内は年間の所得税・住民税の軽減額を差し引き、12か月で割った目安。毎月の源泉徴収で既に軽減される場合もあるため、実際の給与明細や年末の還付額とは異なります。':'本人拠出額から税・社会保険料の軽減額を差し引いた年額の1/12。実際の給与明細とは異なります。';
 $('capital-label').textContent=`${x.endAge}歳までの積立元本（${r.months}か月）`;$('capital').textContent=yen(r.capital);
 $('pension').textContent=fmt(r.pensionAnnualLoss);
 $('pension-description').textContent=selective?'終了年齢まで選択制拠出を続けた場合の、報酬比例部分の減額目安':'このタイプでは給与・標準報酬月額を減らさないため、拠出による老齢厚生年金の減額はありません。';
 $('pension-monthly').textContent=`年金月額の減少目安 ${yen(r.pensionMonthlyLoss)}。対象期間 ${x.endAge-x.age}年間。`;
 renderBenefits(x,r);
 $('comparison-after-label').textContent=afterLabel(x);
 $('comparison-description').textContent=x.type==='a'?'Aタイプには本人拠出がないため、両列は同じです。会社拠出は積立元本に加算しています。':`本人拠出なしと、${matching?'マッチング':'選択制'}拠出ありを比較。会社拠出はどちらにも同額あり、給与に含めません。`;
 const b=r.before,a=r.after;
 const rows=[['課税給与（年額）',b.salary,a.salary],['給与所得（年額）',b.income,a.income],['所得税の基礎控除',b.basic,a.basic],['本人DCの掛金所得控除（年額）',b.matchingDeduction,a.matchingDeduction],['健康保険の標準報酬月額',b.social.healthStandard,a.social.healthStandard],['厚生年金の標準報酬月額',b.social.pensionStandard,a.social.pensionStandard],['健康保険料（年額）',b.social.annual.health,a.social.annual.health],['介護保険料（年額）',b.social.annual.care,a.social.annual.care],['子育て支援金（年額）',b.social.annual.support,a.social.annual.support],['厚生年金保険料（年額）',b.social.annual.pension,a.social.annual.pension],['雇用保険料（年額）',b.social.annual.employment,a.social.annual.employment],['所得税等（年額）',b.incomeTax,a.incomeTax],['住民税所得割※（年額）',b.residentTax,a.residentTax]];
 $('comparison').innerHTML=rows.map(([label,v,w])=>`<tr><th scope="row">${label}</th><td>${yen(v)}</td><td>${yen(w)}</td></tr>`).join('');
}
function renderBenefits(x,r){
 const impacts=benefitImpacts(x,r.before,r.after),exact=n=>n.toLocaleString('ja-JP',{maximumFractionDigits:2});
 const selective=['b','ab'].includes(x.type);
 $('benefit-alert').textContent=selective?'選択制DCで給与が下がると、年金以外の手当金・給付金も減る可能性があります。':'このタイプでは給与・標準報酬月額・賃金を減らさないため、今回の拠出による各種給付の減額はありません。';
 $('benefit-status').textContent=!selective?'各制度の条件と、拠出による影響がないことを下から確認できます。':x.personal===0?'現在は本人の選択制拠出が0円のため、この試算による給与減額の影響はありません。':'詳しい減額目安と、受給条件・計算の前提を下から確認できます。';
 $('benefit-cards').innerHTML=impacts.map(v=>`<article class="benefit-card"><h3>${v.title}</h3>${v.unavailable?`<p class="benefit-unavailable">${v.unavailable}</p>`:`<p class="benefit-period">1日換算の減額目安</p><div class="benefit-daily-main">${v.daily.map(d=>`<p class="benefit-loss">${v.daily.length>1?`<span>${d.label.replace('・1日換算','')}</span>`:''}<strong>${exact(d.loss)}<span class="benefit-per-day">円／日</span></strong></p>`).join('')}</div><p class="benefit-total-reference">参考：${v.period}の減額目安 <strong>${yen(v.loss)}</strong></p><p class="benefit-comparison-label">対象期間（${v.period}）の給付額</p><dl class="benefit-comparison"><div><dt>本人拠出なし</dt><dd>${yen(v.before)}</dd></div><div><dt>${afterLabel(x)}</dt><dd>${yen(v.after)}</dd></div></dl>`}<p class="benefit-card-note">${v.note}</p></article>`).join('');
}
$('benefit-sources').innerHTML=benefitSources.map(([t,u])=>`<li><a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a></li>`).join('');
const sources=[['厚生労働省：企業型DCの上限・2026年12月改正','https://www.mhlw.go.jp/stf/nenkin_shikumi_015.html'],['国税庁：2026年分の給与所得・所得税の計算','https://www.nta.go.jp/publication/pamph/koho/kurashi/html/02_1.htm'],['国税庁：基礎控除','https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1199.htm'],['全国健康保険協会：2026年度の都道府県別料率・介護・支援金','https://www.kyoukaikenpo.or.jp/about/business/insurance_rate/rate_prefectures/r08/'],['厚生労働省：2026年度の雇用保険料率','https://www.mhlw.go.jp/content/001692566.pdf'],['日本年金機構：報酬比例部分','https://www.nenkin.go.jp/service/yougo/hagyo/hoshuhirei.html'],['厚生労働省：厚生年金の標準報酬上限改定','https://www.mhlw.go.jp/stf/nenkin_shikumi_002.html'],['日本年金機構：随時改定','https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/20150515-02.html'],['墨田区：2027年度住民税の給与所得控除','https://www.city.sumida.lg.jp/kurashi/zeikin/zeisei_kaisei/r9/kyuuyosyotoku.html'],['forche：公開されている制度設計','https://forche401k.com/cn-forche/plan/'],['DC推進協会：SBIいろどり年金の旧公開資料（2025年5月版）','https://deco-pa.com/pdf/202505SBIgoannai.pdf']];
sources.push(['国税庁：小規模企業共済等掛金控除（マッチング掛金）','https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1135.htm'],['厚生労働省：マッチング拠出の額の制限撤廃（2026年4月）','https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/nenkin/nenkin/kyoshutsu/2025kaisei.html'],['SBI証券：選択制とマッチングの給与・社会保険の違い','https://ad401k.sbisec.co.jp/corporate/howto/selectivedc/']);
$('sources').innerHTML=sources.map(([t,u])=>`<li><a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a></li>`).join('');
form.addEventListener('input',updateInputs);form.addEventListener('change',updateInputs);
form.addEventListener('submit',e=>e.preventDefault());
form.addEventListener('reset',e=>{e.preventDefault();confirmDefault('reset')});
$('save-default').addEventListener('click',()=>confirmDefault('save'));
$('export-report').addEventListener('click',()=>{try{openReport(read());$('report-status').textContent='別画面にA4・2ページの出力イメージを開きました。「PDFに保存・印刷」から保存先を指定してください。';}catch(error){$('report-status').textContent=error.message;}});
$('contribution-slider').addEventListener('input',e=>{form.elements.personal.value=e.target.value;form.elements.matching.value=e.target.value;});
presetDescription();
applyInputs(storedCurrent.values||preset);
if([storedCurrent.status,storedPreset.status].includes('unavailable'))showStatus('このブラウザに保存できません。入力はこの画面を開いている間だけ保持されます。');
else if([storedCurrent.status,storedPreset.status].includes('invalid'))showStatus('保存データの一部を読み込めませんでした。入力内容をご確認ください。');
else showStatus(storedCurrent.values?'前回の入力内容を復元しました。':'入力内容は自動でこのブラウザに保存されます。');
