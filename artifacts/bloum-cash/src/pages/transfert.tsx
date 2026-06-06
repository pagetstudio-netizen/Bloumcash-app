import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { ArrowLeft, ArrowDown, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { validateTogoPhone, formatAmount } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";

import tmoneyLogo from "@assets/op-tmoney_1780731707604.jpeg";
import moovLogo from "@assets/op-moov_1780731707633.png";

const transfertSchema = z.object({
  fromPhone: z.string().min(8, "Numéro invalide"),
  toPhone: z.string().min(8, "Numéro invalide"),
  amount: z.coerce.number().min(100, "Minimum 100 FCFA"),
});

export default function Transfert() {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [feesData, setFeesData] = useState<{fees: number, total: number, time: string} | null>(null);

  const form = useForm<z.infer<typeof transfertSchema>>({
    resolver: zodResolver(transfertSchema),
    defaultValues: {
      fromPhone: "",
      toPhone: "",
      amount: 0,
    },
  });

  const fromPhone = form.watch("fromPhone");
  const toPhone = form.watch("toPhone");
  const amount = form.watch("amount");

  const fromValidation = validateTogoPhone(fromPhone);
  const toValidation = validateTogoPhone(toPhone);

  const calculateFees = () => {
    // Mock fee calculation
    const isCrossNetwork = fromValidation.operator !== toValidation.operator;
    const feeRate = isCrossNetwork ? 0.02 : 0.01;
    const calculatedFees = Math.round(amount * feeRate);
    
    setFeesData({
      fees: calculatedFees,
      total: amount + calculatedFees,
      time: isCrossNetwork ? "Immédiat (max 5 min)" : "Immédiat"
    });
    setStep("confirm");
  };

  const handleTransfer = () => {
    // Mock successful transfer
    setStep("success");
  };

  const renderOperatorBadge = (operator: "tmoney" | "moov" | null) => {
    if (operator === "tmoney") {
      return (
        <Badge className="bg-[#FFD700] text-black hover:bg-[#FFD700] flex items-center gap-1 border border-yellow-400">
          <div className="w-3 h-3 rounded-full bg-red-600 flex items-center justify-center text-[6px] font-bold text-white">TM</div>
          TMoney
        </Badge>
      );
    }
    if (operator === "moov") {
      return (
        <Badge className="bg-blue-600 text-white hover:bg-blue-600 flex items-center gap-1 border border-blue-500">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          Moov Money
        </Badge>
      );
    }
    return null;
  };

  return (
    <Layout>
      <div className="bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center">
          {step === "form" ? (
            <Link href="/" className="mr-4">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          ) : step === "confirm" ? (
            <button onClick={() => setStep("form")} className="mr-4">
              <ArrowLeft className="w-6 h-6" />
            </button>
          ) : (
            <Link href="/" className="mr-4">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          )}
          <h1 className="text-xl font-bold">Transfert d'argent</h1>
        </div>
      </div>

      <div className="p-6 pb-24">
        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card rounded-2xl shadow-sm border border-border p-6"
            >
              <Form {...form}>
                <form className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">1</div>
                      Expéditeur (De)
                    </h3>
                    <FormField
                      control={form.control}
                      name="fromPhone"
                      render={({ field }) => (
                         <FormItem>
                          <FormLabel>Votre Numéro</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input placeholder="Ex: 90000000" type="tel" {...field} />
                            </FormControl>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {renderOperatorBadge(fromValidation.operator)}
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-center -my-2 relative z-10">
                    <div className="bg-muted p-2 rounded-full border border-border shadow-sm">
                      <ArrowDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">2</div>
                      Destinataire (Vers)
                    </h3>
                    <FormField
                      control={form.control}
                      name="toPhone"
                      render={({ field }) => (
                         <FormItem>
                          <FormLabel>Numéro du bénéficiaire</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input placeholder="Ex: 96000000" type="tel" {...field} />
                            </FormControl>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {renderOperatorBadge(toValidation.operator)}
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-4 border-t border-border">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Montant à envoyer (FCFA)</FormLabel>
                          <FormControl>
                            <Input placeholder="0" type="number" {...field} className="text-xl font-bold h-14" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="button" 
                    onClick={async () => {
                      const isValid = await form.trigger();
                      if (isValid) calculateFees();
                    }} 
                    className="w-full h-14 text-lg rounded-xl"
                    disabled={!fromValidation.isValid || !toValidation.isValid || amount < 100}
                  >
                    Calculer les frais
                  </Button>
                </form>
              </Form>
            </motion.div>
          )}

          {step === "confirm" && feesData && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden"
            >
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-bold text-foreground mb-4">Confirmation du transfert</h2>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img src={fromValidation.operator === 'tmoney' ? tmoneyLogo : moovLogo} alt="" className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="text-sm text-muted-foreground">Depuis</p>
                      <p className="font-semibold text-foreground">{fromValidation.formatted}</p>
                    </div>
                  </div>
                </div>
                
                <div className="pl-5 border-l-2 border-dashed border-border ml-5 py-2">
                  <ArrowDown className="w-4 h-4 text-muted-foreground" />
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3">
                    <img src={toValidation.operator === 'tmoney' ? tmoneyLogo : moovLogo} alt="" className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="text-sm text-muted-foreground">Vers</p>
                      <p className="font-semibold text-foreground">{toValidation.formatted}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-muted/30 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Montant transféré</span>
                  <span className="font-semibold">{formatAmount(amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">Frais <Info className="w-4 h-4" /></span>
                  <span className="font-semibold">{formatAmount(feesData.fees)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Délai estimé</span>
                  <span className="font-medium text-sm">{feesData.time}</span>
                </div>
                
                <div className="pt-4 border-t border-border flex justify-between items-center">
                  <span className="font-bold text-foreground">Total à débiter</span>
                  <span className="text-2xl font-black text-primary">{formatAmount(feesData.total)}</span>
                </div>
              </div>

              <div className="p-6">
                <Button onClick={handleTransfer} className="w-full h-14 text-lg rounded-xl shadow-md">
                  Confirmer et Transférer
                </Button>
              </div>
            </motion.div>
          )}

          {step === "success" && (
             <motion.div
             key="success"
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-card rounded-2xl shadow-xl p-8 border border-border flex flex-col items-center text-center"
           >
             <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
               <div className="text-green-600 text-5xl">✓</div>
             </div>
             <h2 className="text-2xl font-bold text-foreground mb-2">Transfert Initié !</h2>
             <p className="text-muted-foreground mb-8">Votre transfert vers le {toValidation.formatted} est en cours de traitement.</p>
             
             <Link href="/" className="w-full">
               <Button className="w-full h-14 text-lg rounded-xl">Retour à l'accueil</Button>
             </Link>
           </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
