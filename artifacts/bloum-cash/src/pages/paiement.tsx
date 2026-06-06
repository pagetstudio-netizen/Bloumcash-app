import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { formatAmount } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Paiement() {
  const { reference } = useParams();
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "failed">("idle");
  const [stepText, setStepText] = useState("");

  // Mock data for the QR code
  const mockQrData = {
    businessName: "Pharmacie de la Paix",
    amount: 15000,
    operator: "tmoney",
    description: "Achat médicaments",
  };

  const handlePay = () => {
    setStatus("processing");
    setStepText("Initiation du paiement...");
    
    setTimeout(() => {
      setStepText("Vérification auprès de l'opérateur...");
      
      setTimeout(() => {
        setStepText("Validation de la transaction...");
        
        setTimeout(() => {
          setStatus("success");
        }, 1500);
      }, 1500);
    }, 1500);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col md:mx-auto md:max-w-md relative overflow-hidden">
      <div className="h-48 bg-gradient-to-br from-[#1a3fc4] to-[#2b50e8] flex flex-col items-center justify-center p-6 text-white rounded-b-[2rem]">
        <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg mb-4">
          <div className="w-8 h-8 bg-primary rounded-full" />
        </div>
        <h1 className="text-xl font-bold">Paiement Bloum Cash</h1>
      </div>

      <div className="flex-1 p-6 -mt-8 flex flex-col">
        <AnimatePresence mode="wait">
          {status === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-2xl shadow-xl p-8 border border-border flex flex-col items-center text-center flex-1 justify-center"
            >
              <h2 className="text-2xl font-bold text-foreground mb-2">{mockQrData.businessName}</h2>
              <p className="text-muted-foreground mb-8">Demande de paiement</p>
              
              <div className="bg-primary/5 w-full py-8 rounded-2xl mb-8 border border-primary/10">
                <p className="text-sm text-muted-foreground mb-1">Montant à payer</p>
                <p className="text-4xl font-black text-primary">{formatAmount(mockQrData.amount)}</p>
              </div>
              
              <p className="text-sm text-muted-foreground mb-8">{mockQrData.description}</p>
              
              <Button onClick={handlePay} className="w-full h-14 text-lg rounded-xl shadow-md">
                Payer maintenant
              </Button>
            </motion.div>
          )}

          {status === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center flex-1 p-8 text-center"
            >
              <div className="relative mb-8">
                <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-primary rounded-full opacity-20 animate-pulse"></div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Traitement en cours</h3>
              <p className="text-muted-foreground">{stepText}</p>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-2xl shadow-xl p-8 border border-border flex flex-col items-center text-center flex-1 justify-center"
            >
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Paiement réussi !</h2>
              <p className="text-muted-foreground mb-8">Votre transaction a été effectuée avec succès.</p>
              
              <div className="w-full space-y-4 mb-8 text-left bg-muted/50 p-4 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bénéficiaire</span>
                  <span className="font-semibold text-foreground">{mockQrData.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-semibold text-foreground">{formatAmount(mockQrData.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Référence</span>
                  <span className="font-mono text-xs">{reference}</span>
                </div>
              </div>
              
              <Link href="/login" className="w-full">
                <Button className="w-full h-14 text-lg rounded-xl">Retour</Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
