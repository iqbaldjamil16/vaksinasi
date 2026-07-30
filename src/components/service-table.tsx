
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { doc, deleteDoc } from 'firebase/firestore';

import { HealthcareService } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from './ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from './ui/card';
import {
  PawPrint,
  ChevronDown,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/firebase/provider';
import { PasswordDialog } from './password-dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function ReportSkeleton() {
  return (
    <>
      <div className="space-y-4 p-4 md:hidden">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]"><Skeleton className="h-5 w-full" /></TableHead>
              <TableHead><Skeleton className="h-5 w-full" /></TableHead>
              <TableHead><Skeleton className="h-5 w-full" /></TableHead>
              <TableHead><Skeleton className="h-5 w-full" /></TableHead>
              <TableHead><Skeleton className="h-5 w-full" /></TableHead>
              <TableHead className="w-[100px]"><Skeleton className="h-5 w-full" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            <TableRow><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function ServiceCard({
  service,
  onDelete,
  isHighlighted,
}: {
  service: HealthcareService;
  onDelete: (id: string) => void;
  isHighlighted: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const router = useRouter();

  const handleDelete = () => {
    if (!firestore || !service.id) return;
    startDeleteTransition(() => {
      const serviceDoc = doc(firestore, 'healthcareServices', service.id!);
      
      // Non-blocking delete
      deleteDoc(serviceDoc)
        .catch(() => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: serviceDoc.path,
            operation: 'delete'
          }));
        });
      
      // Update local state immediately
      onDelete(service.id!);
      toast({ title: 'Menghapus...', description: 'Data sedang dihapus.' });
    });
  };

  return (
    <Collapsible
      asChild
      key={service.id}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <Card className={cn("transition-colors duration-500", isHighlighted && "highlight-new")}>
        <CardHeader className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-sm sm:text-base">{service.officerName}</div>
              <div className="text-xs text-muted-foreground">
                {service.puskeswan}
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                {format(new Date(service.date), 'dd MMM yyyy', { locale: id })}
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Pemilik
                </div>
                <p className="text-sm font-medium">{service.ownerName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {service.ownerAddress}
                </p>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Program
                </div>
                <p className="text-sm font-medium">{service.vaccinationProgram} - {service.vaccineName}</p>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Jenis Hewan
              </div>
               <div className="flex flex-wrap gap-1 mt-1">
                {service.vaccinations.map((v, index) => (
                  <Badge key={index} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {v.animalType} ({v.animalCount}) {v.age ? `- ${v.age} ${v.ageUnit || ''}` : ''}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0 justify-end gap-2 border-t mt-2 pt-4">
            <PasswordDialog
              title="Akses Terbatas"
              description="Masukkan kata sandi untuk mengedit data."
              onSuccess={() => router.push(`/laporan/${service.id}/edit`)}
              trigger={
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
              }
            />
            <PasswordDialog
              title="Konfirmasi Hapus"
              description="Masukkan kata sandi untuk menghapus."
              onSuccess={handleDelete}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive h-8 gap-2"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Hapus
                </Button>
              }
            />
          </CardFooter>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ActionsCell({
  service,
  onDelete,
}: {
  service: HealthcareService;
  onDelete: (id: string) => void;
}) {
  const [isDeleting, startDeleteTransition] = useTransition();
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const router = useRouter();

  const handleDelete = () => {
    if (!firestore || !service.id) return;
    startDeleteTransition(() => {
      const serviceDoc = doc(firestore, 'healthcareServices', service.id!);
      deleteDoc(serviceDoc)
        .catch(() => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: serviceDoc.path,
            operation: 'delete'
          }));
        });
      onDelete(service.id!);
      toast({ title: 'Dihapus', description: 'Data telah dihapus dari tampilan lokal.' });
    });
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <PasswordDialog
        title="Akses Terbatas"
        description="Masukkan kata sandi untuk mengedit."
        onSuccess={() => router.push(`/laporan/${service.id}/edit`)}
        trigger={
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <PasswordDialog
        title="Konfirmasi Hapus"
        description="Masukkan kata sandi untuk menghapus."
        onSuccess={handleDelete}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        }
      />
    </div>
  );
}

interface ServiceTableProps {
  services: HealthcareService[];
  loading: boolean;
  highlightedIds: string[];
  searchTerm: string;
  onDelete: (id: string) => void;
  isPending: boolean;
}

export function ServiceTable({ services, loading, highlightedIds, searchTerm, onDelete, isPending }: ServiceTableProps) {
  if (loading) return <ReportSkeleton />;

  return (
    <div className={cn("transition-opacity duration-300", isPending && 'opacity-50')}>
      <div className="md:hidden">
        {services.length > 0 ? (
          <div className="space-y-3 p-2 sm:p-4">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onDelete={onDelete}
                isHighlighted={service.id ? highlightedIds.includes(service.id) : false}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <PawPrint className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground text-center px-4">
              {searchTerm ? 'Tidak ada hasil ditemukan.' : 'Belum ada data untuk periode ini.'}
            </p>
          </div>
        )}
      </div>

      <div className="relative hidden max-h-[600px] w-full overflow-auto rounded-md border md:block">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[120px]">Tanggal</TableHead>
              <TableHead>Pemilik</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Jenis Hewan</TableHead>
              <TableHead>Petugas</TableHead>
              <TableHead className="w-[100px] text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length > 0 ? (
              services.map((service) => (
                <TableRow key={service.id} className={cn("transition-colors duration-500", service.id && highlightedIds.includes(service.id) && "highlight-new")}>
                  <TableCell className="font-medium align-top">
                    {format(new Date(service.date), 'dd MMM yyyy', { locale: id })}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="font-medium">{service.ownerName}</div>
                    <div className="text-xs text-muted-foreground">{service.ownerAddress}</div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="font-medium text-xs lg:text-sm">{service.vaccinationProgram} - {service.vaccineName}</div>
                  </TableCell>
                  <TableCell className="align-top">
                     <div className="flex flex-wrap gap-1">
                      {service.vaccinations.map((v, index) => (
                        <Badge key={index} variant="secondary" className="text-[10px]">
                          {v.animalType} ({v.animalCount}) {v.age ? `- ${v.age} ${v.ageUnit || ''}` : ''}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="font-medium text-sm">{service.officerName}</div>
                    <div className="text-xs text-muted-foreground">{service.puskeswan}</div>
                  </TableCell>
                  <TableCell className="align-top text-center">
                    <ActionsCell service={service} onDelete={onDelete} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <PawPrint className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">Tidak ada data ditemukan.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
