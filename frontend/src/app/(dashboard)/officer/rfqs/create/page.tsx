'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  FileText,
  Calendar,
  Layers,
  Users,
  Plus,
  Trash2,
  Send,
  Building,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface Vendor {
  id: number;
  name: string;
  category: string;
  email: string;
}

interface LineItem {
  product_name: string;
  quantity: number;
  unit: string;
}

export default function CreateRfqWorkspace() {
  const router = useRouter();

  // Core RFQ info
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Hardware');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');

  // Active Vendors checklist
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState<number[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  // Line items spreadsheet
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { product_name: '', quantity: 1, unit: 'Units' }
  ]);

  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const fallbackActiveVendors: Vendor[] = [
      { id: 1, name: 'Acme Hardware', category: 'Hardware', email: 'contact@acme.com' },
      { id: 2, name: 'Globex Software', category: 'Software Development', email: 'sales@globex.com' },
      { id: 3, name: 'Cyberdyne Systems', category: 'Electronics', email: 'info@cyberdyne.com' }
    ];

    const fetchActiveVendors = async () => {
      setVendorsLoading(true);
      try {
        const res = await api.get('/vendors?status=active');
        const list = res.data?.data?.vendors || [];
        setVendors(list.length > 0 ? list : fallbackActiveVendors);
      } catch (err: any) {
        console.warn('Backend server offline. Setting fallback active vendors list.');
        setVendors(fallbackActiveVendors);
      } finally {
        setVendorsLoading(false);
      }
    };
    fetchActiveVendors();
  }, []);

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { product_name: '', quantity: 1, unit: 'Units' }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) {
      toast.warning('At least one item is mandatory for this RFQ.');
      return;
    }
    const nextItems = lineItems.filter((_, i) => i !== index);
    setLineItems(nextItems);
  };

  const handleItemChange = (index: number, field: keyof LineItem, val: any) => {
    const nextItems = [...lineItems];
    nextItems[index] = {
      ...nextItems[index],
      [field]: field === 'quantity' ? Number(val) : val
    };
    setLineItems(nextItems);
  };

  const handleVendorToggle = (id: number) => {
    if (selectedVendorIds.includes(id)) {
      setSelectedVendorIds(selectedVendorIds.filter((vId) => vId !== id));
    } else {
      setSelectedVendorIds([...selectedVendorIds, id]);
    }
  };

  const handleSelectAllVendors = () => {
    if (selectedVendorIds.length === vendors.length) {
      setSelectedVendorIds([]);
    } else {
      setSelectedVendorIds(vendors.map((v) => v.id));
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !deadline) {
      toast.error('Please specify both the RFQ title and target deadline date.');
      return;
    }

    // Validate line items
    const invalidItems = lineItems.some(
      (item) => !item.product_name.trim() || item.quantity <= 0 || !item.unit.trim()
    );
    if (invalidItems) {
      toast.error('Please specify valid product name, quantity, and unit across all rows.');
      return;
    }

    if (selectedVendorIds.length === 0) {
      toast.error('Please invite at least one vendor partner.');
      return;
    }

    setPublishing(true);
    try {
      const payload = {
        title,
        description: `Category: ${category}. ${description}`,
        deadline: new Date(deadline).toISOString(),
        items: lineItems,
        vendorIds: selectedVendorIds
      };

      const res = await api.post('/rfqs', payload);
      if (res.data?.success) {
        toast.success(`RFQ published successfully! Ref: ${res.data.data.rfqNumber}`);
        router.push('/officer');
      } else {
        toast.error(res.data?.error || 'Failed to publish RFQ.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error processing request.';
      toast.error(msg);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Request for Quotation (RFQ)</h1>
        <p className="text-sm theme-text-muted">
          Specify items, deadlines, and automatically dispatch invitation alerts to selected suppliers.
        </p>
      </div>

      <form onSubmit={handlePublish} className="space-y-8">
        
        {/* Upper Splits: Parameters Form (Left) & Invite Checkbox List (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Parameters Form */}
          <div className="lg:col-span-7 theme-panel p-6 rounded-xl space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              1. RFQ Specifications
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Procurement Title *
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Acquisition of Core Data Center Switches & Hardware"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="theme-input pl-10 text-sm py-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Procurement Category
                </label>
                <div className="relative">
                  <Layers className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="theme-input pl-10 text-sm py-2.5 appearance-none"
                  >
                    <option value="Hardware">Hardware & Machinery</option>
                    <option value="Software Development">Software & Licenses</option>
                    <option value="Office Furniture Procurement">Office Supplies</option>
                    <option value="Electronics">Electrical & Electronics</option>
                    <option value="AI Infrastructure">AI & Computing Power</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Submission Deadline Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="datetime-local"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="theme-input pl-10 text-sm py-2.5"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Detailed Scope of Work Remarks
              </label>
              <textarea
                placeholder="Include specific hardware configurations, SLA expectations, installation requirements, etc..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="theme-input text-sm"
              />
            </div>
          </div>

          {/* Suppliers Candidate Checklist */}
          <div className="lg:col-span-5 theme-panel p-6 rounded-xl flex flex-col h-[385px]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-emerald-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  2. Candidate Vendors Matrix
                </h2>
              </div>
              {vendors.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllVendors}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {selectedVendorIds.length === vendors.length ? 'Clear All' : 'Select All'}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
              {vendorsLoading ? (
                <div className="flex items-center justify-center h-full text-xs theme-text-muted">
                  Fetching active supplier list...
                </div>
              ) : vendors.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs theme-text-muted">
                  No active vendors verified in ledger registry.
                </div>
              ) : (
                vendors.map((vendor) => {
                  const isChecked = selectedVendorIds.includes(vendor.id);
                  return (
                    <div
                      key={vendor.id}
                      onClick={() => handleVendorToggle(vendor.id)}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                          : 'border-slate-100 hover:bg-slate-50 dark:border-slate-850 dark:hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                          <Building className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs theme-text truncate">{vendor.name}</p>
                          <p className="text-[10px] theme-text-muted truncate">{vendor.email}</p>
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by click
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0"
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Lower Matrix: dynamic line-items spreadsheet */}
        <div className="theme-panel p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              3. Procurement Line Items Spreadsheet Matrix
            </h2>
            <button
              type="button"
              onClick={handleAddLineItem}
              className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Line Item</span>
            </button>
          </div>

          {/* Line items sheet grid */}
          <div className="space-y-3">
            <div className="hidden md:grid grid-cols-12 gap-4 text-xs font-bold uppercase tracking-wider theme-text-muted px-2">
              <div className="col-span-6">Item / Product / Service Name *</div>
              <div className="col-span-3">Required Quantity *</div>
              <div className="col-span-2">Unit *</div>
              <div className="col-span-1 text-right">Delete</div>
            </div>

            {lineItems.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-xl items-center"
              >
                <div className="col-span-1 md:col-span-6 space-y-1 md:space-y-0">
                  <label className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cisco Catalyst 9300 48-Port Switch"
                    value={item.product_name}
                    onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                    className="theme-input text-xs w-full"
                  />
                </div>

                <div className="col-span-1 md:col-span-3 space-y-1 md:space-y-0">
                  <label className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="theme-input text-xs w-full"
                  />
                </div>

                <div className="col-span-1 md:col-span-2 space-y-1 md:space-y-0">
                  <label className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Units, Hours"
                    value={item.unit}
                    onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                    className="theme-input text-xs w-full"
                  />
                </div>

                <div className="col-span-1 md:col-span-1 text-right mt-2 md:mt-0">
                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(index)}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors inline-flex"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Publish Action Block */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push('/officer')}
            className="px-6 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm transition-all"
          >
            Cancel Draft
          </button>
          
          <button
            type="submit"
            disabled={publishing}
            className="flex items-center gap-2 theme-btn-primary px-6 py-2.5 shadow-lg text-sm font-bold"
          >
            {publishing ? (
              <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Publish & Notify Vendors</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
