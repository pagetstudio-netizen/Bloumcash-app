import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { ArrowLeft, Search, Filter, Download } from "lucide-react";
import { formatAmount } from "@/lib/utils";
import { motion } from "framer-motion";

import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import tmoneyLogo from "@assets/op-tmoney_1780731707604.jpeg";
import moovLogo from "@assets/op-moov_1780731707633.png";

const mockTransactions = [
  { id: "1", type: "incoming", title: "Paiement reçu", operator: "tmoney", amount: 150000, date: "05 Juin 2026", time: "10:45", status: "success", ref: "TX98765" },
  { id: "2", type: "incoming", title: "Paiement reçu", operator: "moov", amount: 250000, date: "05 Juin 2026", time: "09:30", status: "success", ref: "TX98764" },
  { id: "3", type: "outgoing", title: "Transfert émis", operator: "tmoney", amount: 75000, date: "04 Juin 2026", time: "18:20", status: "success", ref: "TX98763" },
  { id: "4", type: "incoming", title: "Paiement reçu", operator: "moov", amount: 325000, date: "04 Juin 2026", time: "14:10", status: "success", ref: "TX98762" },
  { id: "5", type: "outgoing", title: "Achat crédit", operator: "tmoney", amount: 5000, date: "03 Juin 2026", time: "11:15", status: "failed", ref: "TX98761" },
  { id: "6", type: "outgoing", title: "Transfert émis", operator: "moov", amount: 120000, date: "02 Juin 2026", time: "16:40", status: "success", ref: "TX98760" },
];

export default function Historique() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("tout");

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const filteredTransactions = mockTransactions.filter(tx => {
    const matchesSearch = tx.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tx.ref.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "entrees") return matchesSearch && tx.type === "incoming";
    if (activeTab === "sorties") return matchesSearch && tx.type === "outgoing";
    return matchesSearch;
  });

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden">
      {/* Header — flex-shrink-0 : ne défile jamais */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white p-4 shadow-md z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="mr-4">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold">Historique</h1>
          </div>
          <button className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <Download className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une transaction..." 
            className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/60 pl-10 h-12 rounded-xl focus-visible:ring-white/30"
          />
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto p-4 pb-6">
        <Tabs defaultValue="tout" className="w-full mb-6" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-12 rounded-xl bg-muted">
            <TabsTrigger value="tout" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Tout</TabsTrigger>
            <TabsTrigger value="entrees" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Entrées</TabsTrigger>
            <TabsTrigger value="sorties" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Sorties</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((tx, index) => (
              <motion.div 
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-xl p-4 border border-border shadow-sm flex flex-col cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
                      <img src={tx.operator === 'tmoney' ? tmoneyLogo : moovLogo} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">{tx.title}</p>
                      <p className="text-xs text-muted-foreground">{tx.date} • {tx.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.type === 'incoming' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'incoming' ? '+' : '-'}{formatAmount(tx.amount)}
                    </p>
                    <Badge variant="outline" className={`mt-1 text-[10px] uppercase tracking-wider ${tx.status === 'success' ? 'border-green-200 text-green-600 bg-green-50' : 'border-red-200 text-red-600 bg-red-50'}`}>
                      {tx.status === 'success' ? 'Succès' : 'Échoué'}
                    </Badge>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-border flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Réf: {tx.ref}</span>
                  <span className="font-medium px-2 py-1 rounded bg-muted">Détails</span>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">Aucune transaction trouvée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
