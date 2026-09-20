import type { CSSProperties } from 'react';

export function Skeleton({className='',style}:{className?:string;style?:CSSProperties}){
  return <span aria-hidden="true" className={`skeleton ${className}`} style={style}/>;
}

export function CardCatalogSkeleton({count=6}:{count?:number}){
  return <div className="catalog-grid skeleton-catalog-grid" aria-label="Loading gift cards" aria-busy="true">
    {Array.from({length:count},(_,index)=><div className="catalog-card skeleton-catalog-card" key={index}><Skeleton className="skeleton-card-art"/><Skeleton className="skeleton-card-title"/><Skeleton className="skeleton-card-price"/><Skeleton className="skeleton-card-meta"/></div>)}
  </div>;
}

export function TokenGridSkeleton({count=6}:{count?:number}){
  return <div className="token-grid compact-token-grid skeleton-token-grid" aria-label="Loading tokens" aria-busy="true">
    {Array.from({length:count},(_,index)=><div className="token-card compact-token-card skeleton-token-card" key={index}><Skeleton className="skeleton-token-art"/><Skeleton className="skeleton-token-title"/><Skeleton className="skeleton-token-symbol"/><Skeleton className="skeleton-token-value"/><Skeleton className="skeleton-token-progress"/><div className="skeleton-token-meta"><Skeleton/><Skeleton/></div></div>)}
  </div>;
}

export function ProfileRowsSkeleton({count=3}:{count?:number}){
  return <div className="profile-list skeleton-profile-list" aria-label="Loading profile data" aria-busy="true">
    {Array.from({length:count},(_,index)=><div className="profile-row skeleton-profile-row" key={index}><Skeleton className="skeleton-profile-art"/><div><Skeleton className="skeleton-profile-title"/><Skeleton className="skeleton-profile-copy"/></div><div className="profile-row-value"><Skeleton className="skeleton-profile-label"/><Skeleton className="skeleton-profile-value"/></div></div>)}
  </div>;
}
