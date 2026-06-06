'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { CheckSquare, Eye, Clock, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

interface Quotation {
  id: number;
  rfq_id: number;
  vendor_id: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  delivery_days: number;
  notes: string | null;
  status: string;
  vendor_name: string;
  rfq_title: string;
  rfq_number: string;
}

export default function ApprovalsList() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quotations');
      setQuotations(res.data?.data?.quotations || []);
    } catch (err: any) {
      toast.error('Failed to load pending bids list.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quotations Pending Manager Evaluation</h1>
        <p className="text-sm theme-text-muted">
          Review candidate vendor proposals, inspect line rates, and record approval decisions.
        </p>
      </div>

      <div className="theme-panel rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider theme-text-muted font-mono">
                <th className="px-6 py-4">Quote ID</th>
                <th className="px-6 py-4">RFQ Ref & Title</th>
                <th className="px-6 py-4">Vendor Partner</th>
                <th className="px-6 py-4">Lead Time</th>
                <th className="px-6 py-4">Bid Total Amount</th>
                <th className="px-6 py-4">Workflow Status</th>
                <th className="px-6 py-4 text-right">Evaluation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center theme-text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading pending approvals...</span>
                    </div>
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs theme-text-muted">
                    No supplier quotations registered in database.
                  </td>
                </tr>
              ) : (
                quotations.map((quote) => (
                  <tr
                    key={quote.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      #Q-{String(quote.id).padStart(3, '0')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold theme-text">{quote.rfq_title}</div>
                      <div className="text-[10px] theme-text-muted font-mono mt-0.5">{quote.rfq_number}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      {quote.vendor_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded font-mono text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold">
                        {quote.delivery_days} Days
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ${quote.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      {quote.status === 'submitted' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                          <Clock className="h-3 w-3" />
                          <span>Pending Review</span>
                        </span>
                      ) : quote.status === 'selected' || quote.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Accepted</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400">
                          <XCircle className="h-3 w-3" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => router.push(`/manager/approvals/${quote.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 text-xs font-bold rounded-lg transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Evaluate</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
