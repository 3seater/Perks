const brands = [
  {name:'Spotify',slug:'spotify'},
  {name:'DoorDash',slug:'doordash'},
  {name:'Uber Eats',slug:'ubereats'},
  {name:'Amazon',slug:'amazon'},
  {name:'Steam',slug:'steam'},
  {name:'PlayStation',slug:'playstation'},
];

export function BrandTicker() {
  return <section className="brand-ticker" aria-label="Gift-card brands">
    <div className="brand-ticker-track">
      {[0,1].map(copy=><ul className="brand-ticker-group" key={copy} aria-hidden={copy===1?true:undefined}>
        {brands.map(brand=><li className="brand-ticker-item" key={brand.slug}>
          <img className={brand.slug==='ubereats'?'brand-ticker-wordmark':undefined} src={`/brands/${brand.slug}.svg`} alt={brand.slug==='ubereats'?brand.name:''} width={30} height={30}/>{brand.slug!=='ubereats'&&<span>{brand.name}</span>}
        </li>)}
      </ul>)}
    </div>
  </section>;
}
