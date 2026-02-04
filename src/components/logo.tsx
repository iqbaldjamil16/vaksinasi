
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center" aria-label="PKH Mateng Homepage">
      <span className="text-xl font-bold text-foreground font-headline">PKH Mateng</span>
    </Link>
  );
}
