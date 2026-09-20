'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, SlidersHorizontal } from 'lucide-react';

const sortOptions = [{ value: 'volume', label: 'Volume' }, { value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }, { value: 'holders', label: 'Holders' }, { value: 'marketCap', label: 'Market Cap' }];

export function SortMenu({ value, onChange, options=sortOptions, label='Sort tokens', className='', showIcon=true }: {
  value: string; onChange: (value: string) => void; options?: {value:string;label:string}[];
  label?:string; className?:string; showIcon?:boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const typed = useRef({text:'',at:0});

  useEffect(() => {
    if (!open) return;
    const selected=items.current[options.findIndex(option => option.value === value)];
    selected?.focus({preventScroll:true});
    selected?.scrollIntoView({block:'nearest'});
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, value]);

  function close() { setOpen(false); trigger.current?.focus(); }

  return <div className={`sort-menu ${className}`} ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="sort-control sort-trigger" aria-label={`${label}: ${options.find(option => option.value === value)?.label}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); }
    }}>
      {showIcon&&<SlidersHorizontal size={16}/>}<span>{options.find(option => option.value === value)?.label}</span><ChevronDown size={14} className={open ? 'sort-chevron expanded' : 'sort-chevron'}/>
    </button>
    {open && <div className="sort-options" role="menu" aria-label={label} id={id} onKeyDown={event => {
      const index = items.current.findIndex(item => item === document.activeElement);
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
        items.current[next]?.focus();
      }
      if(event.key.length===1 && event.key!==' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        const now=Date.now();
        typed.current={text:(now-typed.current.at<700?typed.current.text:'')+event.key.toLowerCase(),at:now};
        const next=options.findIndex(option=>option.label.toLowerCase().startsWith(typed.current.text));
        if(next>=0)items.current[next]?.focus();
      }
    }}>
      {options.map((option, index) => <button type="button" key={option.value} ref={node => { items.current[index] = node; }} className="sort-option" role="menuitemradio" aria-checked={value === option.value} tabIndex={-1} onClick={() => { onChange(option.value); close(); }}>
        <span>{option.label}</span><Check size={15} aria-hidden="true" className={value === option.value ? 'sort-check' : 'sort-check invisible'}/>
      </button>)}
    </div>}
  </div>;
}
