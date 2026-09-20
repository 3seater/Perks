'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, LoaderCircle, Search } from 'lucide-react';
import { api } from '@/lib/client';
import type { CardBrand, CardProduct } from '@/lib/gift-cards';
import {SolEquivalent,money} from './reward-money';
import { SortMenu } from './sort-menu';
import { CardCheckout, CardOrders } from './card-checkout';

const regionNames=new Intl.DisplayNames(['en'],{type:'region'});
const countries=('US GB CA AU AD AE AF AG AI AL AM AO AQ AR AS AT AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' ').map(code=>[code,regionNames.of(code)??code]);
export function CardCatalog({embedded=false}:{embedded?:boolean}) {
  const [country,setCountry]=useState('US'),[countryInput,setCountryInput]=useState('US');
  const [brands,setBrands]=useState<CardBrand[]>([]),[brand,setBrand]=useState<CardBrand|null>(null);
  const [products,setProducts]=useState<CardProduct[]>([]),[productId,setProductId]=useState('');
  const [amount,setAmount]=useState(''),[search,setSearch]=useState('');
  const [loading,setLoading]=useState(false),[error,setError]=useState('');
  const [step,setStep]=useState<'amount'|'checkout'|'status'>('amount'),[history,setHistory]=useState(false),[orderId,setOrderId]=useState<string>();
  const matching=brands.filter(b=>b.name.toLowerCase().includes(search.toLowerCase()));
  const [showTerms,setShowTerms]=useState(false);
  const product=products.find(p=>p.id===productId);
  useEffect(()=>{
    let active=true;
    setBrands([]);setBrand(null);setProducts([]);setLoading(true);setError('');
    api<{brands:CardBrand[]}>(`/api/cards?country=${country}`).then(r=>{if(active)setBrands(r.brands);})
      .catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[country]);
  useEffect(()=>{
    let active=true;
    setProducts([]);setProductId('');setAmount('');setError('');
    if(!brand)return;
    setLoading(true);
    const query=new URLSearchParams({action:'products',country:brand.country,family:brand.family});
    api<{products:CardProduct[]}>(`/api/cards?${query}`).then(r=>{
      if(!active)return;
      setProducts(r.products);const first=r.products[0];
      if(first){setProductId(first.id);setAmount(first.fixed??first.min??'');}
    }).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[brand]);
  return <div className={`card-catalog ${embedded?'catalog-embedded':''} ${brand?'has-selection':''} stage-${step}`}>
    {(!brand||history)&&<nav className="reward-tabs" aria-label="Rewards sections"><button aria-current={!history?"page":undefined} onClick={()=>setHistory(false)}>Browse cards</button><button aria-current={history?"page":undefined} onClick={()=>setHistory(true)}>My gift cards</button></nav>}
    {history?<CardOrders/>:<>
    <div className="catalog-heading"><div><h2>{brand?(step==='amount'?'Choose your amount':step==='checkout'?'Checkout':'Your purchase'):'Pick a gift card'}</h2></div>{brand&&<button className="text-button" onClick={()=>{setShowTerms(false);if(step==='checkout'){setStep('amount');}else{setBrand(null);setLoading(false);setStep('amount');}}}><ArrowLeft size={16}/> {step==='checkout'?'Amount':'Cards'}</button>}</div>
    {!embedded&&<p className="catalog-intro">Choose a card for the country where you’ll use it.</p>}
    {!brand?<>
      <form className="catalog-controls" onSubmit={e=>{e.preventDefault();if(/^[A-Z]{2}$/.test(countryInput)){setCountry(countryInput);setSearch('');}}}>
        {embedded?<SortMenu label="Card country" className="catalog-menu" showIcon={false} value={country} options={countries.map(([value,label])=>({value,label}))} onChange={value=>{setCountry(value);setCountryInput(value);setSearch('');}}/>:<><label>Country code<input aria-label="Country code" value={countryInput} onChange={e=>setCountryInput(e.target.value.toUpperCase())} maxLength={2} pattern="[A-Z]{2}" required placeholder="US"/></label><button className="button secondary" type="submit">Update</button></>}
        <label className="catalog-search"><Search size={16}/><input aria-label="Search gift cards" placeholder="Search cards…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
      </form>
      {!loading&&<p className="catalog-count">{matching.length} matching cards </p>}
      <div className="catalog-grid" role="region" aria-label="Available gift cards" tabIndex={0}>{matching.map(b=><button className="catalog-card" key={b.id} onClick={()=>{setBrand(b);setStep('amount');}}>
        {b.logo?<img src={b.logo} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<span className="catalog-placeholder">{b.name.charAt(0)}</span>}
        <strong>{b.name}</strong><span className="catalog-card-price"><span>{b.minimum?`From ${b.minimum}`:'View amounts'}{b.country==='US'&&b.minimum&&/^\$[\d,.]+$/.test(b.minimum)&&<SolEquivalent amount={b.minimum.replace(/[$,]/g,'')}/>}</span><ArrowUpRight size={14}/></span>
      </button>)}</div>
    </>:<div className="catalog-selection">
      <ol className="purchase-steps" aria-label="Purchase progress">{['Amount','Checkout','Card status'].map((label,i)=><li key={label} aria-current={i===({amount:0,checkout:1,status:2}[step])?'step':undefined}><span>{i+1}</span>{label}</li>)}</ol>
      {!loading&&products.length===0&&!error&&<p>No email-delivered cards are currently available for this selection.</p>}
      {product&&<>{showTerms?<div className="card-terms-screen"><h3>{brand.name} conditions</h3><div className="card-terms-box" tabIndex={0}>{product.terms}</div><button className="button secondary full" onClick={()=>setShowTerms(false)}>Back to amount</button></div>:<>
        <div className="selected-perk">{brand.logo&&<img src={brand.logo} alt=""/>}<div><strong>{brand.name}</strong><span>{product.country} · {product.currency} · Digital gift card</span></div></div>
        {step==='amount'&&<>
        {products.length>1&&<><span className="field-label">Choose your amount</span>
        <SortMenu label="Card amount" className="catalog-menu catalog-denominations" showIcon={false} value={productId}
          options={products.map(p=>({value:p.id,label:p.fixed?`${money(p.fixed,p.currency)}`:`${p.min}–${p.max} ${p.currency} · choose an amount`}))}
          onChange={value=>{const p=products.find(p=>p.id===value)!;setProductId(p.id);setAmount(p.fixed??p.min??'');}}/>
        </>}
        {products.length===1&&product.fixed&&<p className="claim-total">Card value <strong>{money(product.fixed,product.currency)}</strong></p>}
        {!product.fixed&&<label className="catalog-amount">Amount in {product.currency}<span className="currency-input"><span className="currency-prefix" aria-hidden="true">{new Intl.NumberFormat('en-US',{style:'currency',currency:product.currency,currencyDisplay:'narrowSymbol'}).formatToParts(0).find(part=>part.type==='currency')?.value??product.currency}</span><input aria-label={`Amount in ${product.currency}`} type="number" min={product.min} max={product.max} step={product.step} value={amount} onChange={e=>{setAmount(e.target.value);}}/></span></label>}
        <SolEquivalent amount={amount} currency={product.currency}/>
        {!product.fixed&&<p className="catalog-count">{product.min}–{product.max} {product.currency} · increments of {product.step}</p>}
        <button className="text-button catalog-terms-link" onClick={()=>setShowTerms(true)}>Card conditions</button>
        <button className="button primary full" disabled={!amount||!Number.isFinite(Number(amount))||Number(amount)<Number(product.min??product.fixed)||Number(amount)>Number(product.max??product.fixed)} onClick={()=>setStep('checkout')}>Continue to checkout</button>
        </>}
        {step==='checkout'&&<CardCheckout key={product.id} product={product} family={brand.family} amount={amount} onSubmitted={id=>{setOrderId(id);setStep('status');}}/>}
        {step==='status'&&<><CardOrders focusedId={orderId}/><button className="button secondary full" onClick={()=>{setBrand(null);setStep('amount');}}>Browse more cards</button></>}
      </>}</>}
    </div>}
    {loading&&<p className="secure-note" role="status"><LoaderCircle className="spin" size={18}/> Loading available cards…</p>}
    {error&&<p className="error-message" role="alert">{error}</p>}
    </>}
  </div>;
}
