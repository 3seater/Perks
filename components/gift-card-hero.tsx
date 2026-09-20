import { ArrowUpRight, Gift } from 'lucide-react';

/** Decorative gift-card collection, built with responsive HTML and CSS. */
export function GiftCardHero() {
  return <div className="gift-card-hero" role="img" aria-label="A collection of Spotify, Amazon, and Perks digital gift cards">
    <div className="gift-card-scene" aria-hidden="true">
      <div className="gift-card gift-card-spotify">
        <div className="gift-card-brand"><img src="/brands/spotify.svg" alt=""/>Spotify</div>
        <div className="spotify-rings"><i/><i/><i/></div>
        <span className="gift-card-type">Gift card</span>
      </div>
      <div className="gift-card gift-card-amazon">
        <div className="amazon-gift-wordmark">amazon<span>⌣</span></div>
        <div className="gift-card-present"><Gift strokeWidth={1}/></div>
        <span className="gift-card-type">Gift card</span>
      </div>
      <div className="gift-card gift-card-perks">
        <div className="gift-card-brand"><img src="/perks-mark.svg" alt=""/>perks<ArrowUpRight size={23}/></div>
        <img className="gift-card-diamond" src="/perks-mark.svg" alt=""/>
        <div className="gift-card-message">A little something.<br/>On your trades.</div>
        <div className="gift-card-bottom"><span>Make it a gift card</span><Gift size={18}/></div>
      </div>
    </div>
  </div>;
}
