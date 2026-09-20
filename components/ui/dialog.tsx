'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
export function Dialog({open,onOpenChange,title,description,children,className=''}:{open:boolean;onOpenChange:(open:boolean)=>void;title:string;description:string;children:ReactNode;className?:string}) {
  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}><DialogPrimitive.Portal><DialogPrimitive.Overlay className="modal-overlay"/><DialogPrimitive.Content className={`modal-content ${className}`} onEscapeKeyDown={event => { if (event.target instanceof Element && event.target.closest('[role="menu"]')) event.preventDefault(); }}><DialogPrimitive.Title className="modal-title">{title}</DialogPrimitive.Title><DialogPrimitive.Description className="modal-description">{description}</DialogPrimitive.Description><DialogPrimitive.Close className="icon-button modal-close" aria-label="Close dialog"><X size={20}/></DialogPrimitive.Close>{children}</DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root>;
}
