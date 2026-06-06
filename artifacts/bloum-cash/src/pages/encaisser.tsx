import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Share2, Copy, Download, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import tmoneyLogo from "@assets/op-tmoney_1780731707604.jpeg";
import moovLogo from "@assets/op-moov_1780731707633.png";

const encaisserSchema = z.object({
  businessName: z.string().min(2, { message: "Nom requis" }),
  phone: z.string().min(8, { message: "Numéro invalide" }),
  operator: z.enum(["tmoney", "moov"]),
  amount: z.coerce.number().min(100, { message: "Minimum 100 FCFA" }),
  description: z.string().optional(),
});

export default function Encaisser() {
  const { toast } = useToast();
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const [qrData, setQrData] = useState<any>(null);

  const form = useForm<z.infer<typeof encaisserSchema>>({
    resolver: zodResolver(encaisserSchema),
    defaultValues: {
      businessName: "",
      phone: "",
      operator: "tmoney",
      amount: 0,
      description: "",
    },
  });

  const selectedOperator = form.watch("operator");

  function onSubmit(values: z.infer<typeof encaisserSchema>) {
    // Generate a mock reference
    const ref = "QR" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const paymentUrl = `${window.location.origin}/paiement/${ref}`;
    
    setQrData({ ...values, reference: ref });
    setGeneratedQR(paymentUrl);
  }

  return (
    <Layout>
      <div className="bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center">
          <Link href="/" className="mr-4">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">Encaisser</h1>
        </div>
      </div>

      <div className="p-6 pb-24">
        <AnimatePresence mode="wait">
          {!generatedQR ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card rounded-2xl shadow-sm border border-border p-6"
            >
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du commerce / Bénéficiaire</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Pharmacie de la Paix" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <FormLabel>Opérateur de réception</FormLabel>
                    <div className="grid grid-cols-2 gap-3">
                      <div 
                        className={`border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${selectedOperator === 'tmoney' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                        onClick={() => form.setValue("operator", "tmoney")}
                      >
                        <img src={tmoneyLogo} alt="TMoney" className="w-12 h-12 rounded-full object-cover" />
                        <span className="font-semibold text-sm text-foreground">TMoney</span>
                      </div>
                      <div 
                        className={`border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${selectedOperator === 'moov' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                        onClick={() => form.setValue("operator", "moov")}
                      >
                        <img src={moovLogo} alt="Moov" className="w-12 h-12 rounded-full object-cover" />
                        <span className="font-semibold text-sm text-foreground">Moov Money</span>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro de réception</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 90000000" type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant (FCFA)</FormLabel>
                        <FormControl>
                          <Input placeholder="0" type="number" {...field} className="text-xl font-bold" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (optionnel)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Motif du paiement" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full h-14 text-lg rounded-xl">
                    Générer le QR Code
                  </Button>
                </form>
              </Form>
            </motion.div>
          ) : (
            <motion.div
              key="qr"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col items-center space-y-8"
            >
              <div className="bg-white p-8 rounded-3xl shadow-xl w-full flex flex-col items-center">
                <h2 className="text-2xl font-bold text-foreground mb-1">{qrData?.businessName}</h2>
                <p className="text-muted-foreground mb-6">Scanner pour payer</p>
                
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
                  <QRCodeSVG value={generatedQR} size={200} level="H" />
                </div>
                
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold text-primary mb-1">{qrData?.amount} FCFA</p>
                  <p className="text-sm text-muted-foreground">{qrData?.description}</p>
                </div>
                
                <div className="bg-muted w-full p-3 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">RÉFÉRENCE</p>
                  <p className="font-mono font-bold tracking-widest text-foreground">{qrData?.reference}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-4 w-full gap-4">
                <Button variant="outline" className="flex flex-col h-20 gap-2 rounded-2xl bg-card border-border shadow-sm">
                  <Share2 className="w-5 h-5 text-primary" />
                  <span className="text-xs">Partager</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-20 gap-2 rounded-2xl bg-card border-border shadow-sm">
                  <Copy className="w-5 h-5 text-primary" />
                  <span className="text-xs">Copier</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-20 gap-2 rounded-2xl bg-card border-border shadow-sm">
                  <Download className="w-5 h-5 text-primary" />
                  <span className="text-xs">Enregistrer</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-20 gap-2 rounded-2xl bg-card border-border shadow-sm">
                  <Printer className="w-5 h-5 text-primary" />
                  <span className="text-xs">Imprimer</span>
                </Button>
              </div>
              
              <Button 
                variant="ghost" 
                className="w-full text-primary"
                onClick={() => {
                  setGeneratedQR(null);
                  form.reset();
                }}
              >
                Générer un autre QR Code
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
