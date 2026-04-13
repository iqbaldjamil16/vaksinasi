'use client';

import { useState } from 'react';
import { ServiceForm } from "@/components/service-form";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ExcelUpload } from '@/components/excel-upload';

export default function Home() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const linkToCopy = "https://newkeswan.vercel.app/";

  const handleCopy = () => {
    navigator.clipboard.writeText(linkToCopy).then(() => {
      setCopied(true);
      toast({
        title: "Disalin!",
        description: "Tautan berhasil disalin ke clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Gagal menyalin: ', err);
      toast({
        variant: "destructive",
        title: "Gagal",
        description: "Tidak dapat menyalin tautan.",
      });
    });
  };

  return (
    <div className="container px-3 sm:px-8 py-4 md:py-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
              <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight font-headline">Pelayanan Vaksinasi</CardTitle>
              <CardDescription className="text-muted-foreground pt-2 text-sm md:text-base">
              Input detail vaksinasi yang telah dilakukan
              </CardDescription>
              <div className="flex items-center gap-2">
                  <a href={linkToCopy} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 italic underline text-sm">
                      {linkToCopy}
                  </a>
                  <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleCopy}
                  >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      <span className="sr-only">Salin tautan</span>
                  </Button>
              </div>
          </CardHeader>
        </Card>
        
        <div className="mt-6 md:mt-8">
          <ServiceForm formType="vaksinasi" />
        </div>

        <div className="mt-6 md:mt-8">
          <ExcelUpload />
        </div>
      </div>
    </div>
  );
}
