
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Logo } from './logo';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { PanelLeft, ClipboardList } from 'lucide-react';
import { ActivationDialog } from './activation-dialog';

const navItems = [
  { href: '/', label: 'Input Data' },
  { href: '/rekap', label: 'Rekap Obat & Kasus' },
  { href: '/rekap/topoyo', label: 'Rekap Puskeswan Topoyo' },
  { href: '/docs', label: 'Dokumentasi' },
];

function NavContent({ onLinkClick }: { onLinkClick: () => void }) {
    const pathname = usePathname();
    return (
      <>
        <div className="px-2 pt-6">
          <Logo />
        </div>
        <div className="flex flex-col space-y-2 mt-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                "text-base font-medium p-3 rounded-md transition-colors",
                pathname === item.href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent/50'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </>
    );
  }

export function Header() {
  const [isClient, setIsClient] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isActivationDialog, setIsActivationDialog] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleButtonPress = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setIsActivationDialog(true);
    }, 2000); // 2 seconds
  }, []);

  const handleButtonRelease = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  
  const handleSuccess = useCallback(() => {
    setIsActivationDialog(false);
    setIsSheetOpen(true);
  }, []);

  if (!isClient) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <PanelLeft className="h-6 w-6" />
                <span className="sr-only">Buka Menu</span>
              </Button>
            <Logo />
          </div>
          <nav className="flex items-center">
          <Link
              href="/laporan"
              className={cn(
                  buttonVariants({ variant: "outline", size: "default" }),
                  "text-sm font-semibold transition-colors flex items-center gap-2"
              )}
              >
              <ClipboardList className="h-4 w-4" />
              Data Lap.
          </Link>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
            <ActivationDialog 
              open={isActivationDialog} 
              onOpenChange={setIsActivationDialog} 
              onSuccess={handleSuccess}
            >
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  onMouseDown={handleButtonPress}
                  onMouseUp={handleButtonRelease}
                  onTouchStart={handleButtonPress}
                  onTouchEnd={handleButtonRelease}
                  onClick={() => {
                    if(isSheetOpen) setIsSheetOpen(false);
                  }}
                >
                  <PanelLeft className="h-6 w-6" />
                  <span className="sr-only">Buka Menu</span>
                </Button>
                <SheetContent side="left" className="w-[250px]">
                  <NavContent onLinkClick={() => setIsSheetOpen(false)} />
                </SheetContent>
              </Sheet>
            </ActivationDialog>
          <Logo />
        </div>
        <nav className="flex items-center">
         <Link
            href="/laporan"
            prefetch={false}
            className={cn(
                buttonVariants({ variant: 'outline', size: 'default' }),
                'text-sm font-semibold transition-colors flex items-center gap-2',
                pathname === '/laporan'
                ? 'bg-accent border-accent text-accent-foreground'
                : 'bg-white text-primary border-foreground hover:bg-primary/10'
            )}
            >
            <ClipboardList className="h-4 w-4" />
            Data Lap.
        </Link>
        </nav>
      </div>
    </header>
  );
}
