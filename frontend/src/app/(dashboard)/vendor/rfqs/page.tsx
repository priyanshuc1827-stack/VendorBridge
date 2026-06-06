'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { toast } from 'sonner';
import { FileText, Clock, ExternalLink, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

interface RFQ {
  id: number;
  rfq_number: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
  creator_name: string;
  item_count: number;
}

export default function VendorRfqsList() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRfqs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rfqs');
      const allRfqs = res.data?.data?.rfqs || [];
      
      // If vendor is logged in, they can see all open RFQs they are invited to.
      // Since it's a test environment, we show all open RFQs so they have access to bid.
      setRfqs(allRfqs.filter((r: RFQ) => r.status === 'open' || r.status === 'closed'));
    } catch (err: any) {
      toast.error('Failed to load RFQs list.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfqs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Supplier Invited RFQs</h1>
        <p className="text-sm theme-text-muted">
          Review open requests for quotation issued by corporate officers and submit your pricing proposals.
        </p>
      </div>

      <div className="theme-panel rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider theme-text-muted font-mono">
                <th className="px-6 py-4">RFQ Ref</th>
                <th className="px-6 py-4">Subject Title</th>
                <th className="px-6 py-4">Items Required</th>
                <th className="px-6 py-4">Deadline Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Bidding Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center theme-text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading invited RFQs...</span>
                    </div>
                  </td>
                </tr>
              ) : rfqs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs theme-text-muted">
                    No open invitations listed in database.
                  </td>
                </tr>
              ) : (
                rfqs.map((rfq) => (
                  <tr
                    key={rfq.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {rfq.rfq_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold theme-text">{rfq.title}</div>
                      <div className="text-[10px] theme-text-muted mt-0.5">Issued by: {rfq.creator_name || 'Procurement Team'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold">
                        {rfq.item_count} Items
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold theme-text-muted">
                      {new Date(rfq.deadline).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {rfq.status === 'open' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                          <Clock className="h-3 w-3" />
                          <span>Bidding Open</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400">
                          <AlertCircle className="h-3 w-3" />
                          <span>Closed</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {rfq.status === 'open' ? (
                        <button
                          onClick={() => router.push(`/vendor/rfqs/${rfq.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 text-xs font-bold rounded-lg transition-colors"
                        >
                          <span>Quote Bid</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No actions</span>
                      )}
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
