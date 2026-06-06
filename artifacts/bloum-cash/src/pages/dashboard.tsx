import React from "react";
import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { Bell, QrCode, ArrowLeftRight, Clock, Grid, ChevronRight, ChevronDown } from "lucide-react";
import { formatAmount } from "@/lib/utils";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";

import tmoneyLogo from "@assets/op-tmoney_1780731707604.jpeg";
import moovLogo from "@assets/op-moov_1780731707633.png";

const mockTransactions = [
  { id: "1", type: "incoming", title: "Paiement reçu", operator: "tmoney", amount: 150000, date: "Aujourd'hui, 10:45" },
  { id: "2", type: "incoming", title: "Paiement reçu", operator: "moov", amount: 250000, date: "Aujourd'hui, 09:30" },
  { id: "3", type: "outgoing", title: "Transfert émis", operator: "tmoney", amount: 75000, date: "Hier, 18:20" },
  { id: "4", type: "incoming", title: "Paiement reçu", operator: "moov", amount: 325000, date: "Hier, 14:10" },
];

const mockChartData = [
  { value: 400000 },
  { value: 300000 },
  { value: 550000 },
  { value: 450000 },
  { value: 700000 },
  { value: 600000 },
  { value: 850000 },
];

export default function Dashboard() {
  return (
    <Layout>
      <div className="pb-24">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] px-6 py-4 flex items-center justify-between shadow-md rounded-b-3xl">
          <div className="w-10 h-10 flex flex-col justify-center gap-1.5 cursor-pointer">
            <div className="w-6 h-0.5 bg-white rounded-full"></div>
            <div className="w-6 h-0.5 bg-white rounded-full"></div>
            <div className="w-4 h-0.5 bg-white rounded-full"></div>
          </div>
          
          <h1 className="text-xl font-bold text-white tracking-wide">Bloum Cash</h1>
          
          <div className="relative cursor-pointer w-10 h-10 flex items-center justify-center bg-white/10 rounded-full">
            <Bell className="w-5 h-5 text-white" />
            <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-[#2b50e8]"></div>
          </div>
        </div>

        <div className="px-5 pt-6 space-y-6">
          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl shadow-sm border border-border p-4 flex justify-between items-start"
          >
            <ActionBtn icon={<QrCode />} label="Encaisser" to="/encaisser" />
            <ActionBtn icon={<ArrowLeftRight />} label="Transférer" to="/transfert" />
            <ActionBtn icon={<Clock />} label="Historique" to="/historique" />
            <ActionBtn icon={<Grid />} label="Plus" to="/plus" />
          </motion.div>

          {/* Recent Transactions */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden"
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">Transactions récentes</h2>
              <Link href="/historique" className="text-sm font-medium text-primary flex items-center">
                Voir tout <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {mockTransactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-muted overflow-hidden">
                      <img 
                        src={tx.operator === 'tmoney' ? tmoneyLogo : moovLogo} 
                        alt={tx.operator}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{tx.title}</p>
                      <p className="text-sm text-muted-foreground">{tx.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.type === 'incoming' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'incoming' ? '+' : '-'}{formatAmount(tx.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Statistics Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-[#1a3fc4] to-[#2b50e8] rounded-3xl shadow-lg p-6 text-white relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-2 relative z-10">
              <p className="text-white/80 font-medium">Solde Total</p>
              <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-sm cursor-pointer hover:bg-white/30 transition-colors">
                Ce mois <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-6 relative z-10">6 520 000 FCFA</h3>
            
            <div className="h-[100px] w-full mt-4 -mx-2 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockChartData}>
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#22c55e" 
                    strokeWidth={4} 
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform -translate-x-10 translate-y-10"></div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}

function ActionBtn({ icon, label, to }: { icon: React.ReactNode, label: string, to: string }) {
  return (
    <Link href={to}>
      <div className="flex flex-col items-center gap-3 cursor-pointer group w-[72px]">
        <div className="w-14 h-14 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center text-primary transition-colors">
          {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
        </div>
        <span className="text-xs font-medium text-foreground text-center">{label}</span>
      </div>
    </Link>
  );
}
