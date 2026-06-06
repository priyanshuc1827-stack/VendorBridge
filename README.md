#  VendorBridge // Enterprise Procurement ERP Engine

VendorBridge is a high-performance procurement ERP platform built to automate B2B supply chain logistics, competitive relational bidding, and audited managerial approval workflows. Optimized with a high-contrast, sub-second latency user interface inspired by premium telemetry dashboards.

---

##  Key Features

* **Multi-Role Architecture:** Fully isolated workspaces with secure context-aware navigation designed for **Managers, Officers, and Vendors**.
* **ColdTrack Front Page:** A premium, unauthenticated landing panel engineered with clean entry pipelines directly into secure signup and login views.
* **Dynamic Quotation Matrix:** Side-by-side bid comparison grids allowing procurement officers and managers to instantly evaluate vendor proposals.
* **Itemized Invoice Ledger:** Automated ledger blocks with built-in **18% GST** computation parameters and native print layout optimization (`window.print()`).
* **High-Fidelity Resiliency:** Implemented intelligent frontend caching and robust static data fallbacks (under 150ms) to ensure zero empty views or interface locking during server lag.

---

##  Tech Stack

* **Frontend:** Next.js 14+ (App Router), React, Tailwind CSS, Lucide React
* **State Management:** Zustand (Persistent Client Session Tracking)
* **Backend:** Node.js, Express API Server
* **Database:** Relational Database Node Architecture
* **Component Optimization:** Strict `React.useMemo` memoization loops for fluid UI transition states.

---

##  Local Development Setup

Follow these quick steps to spin up the localized ecosystem on your system:

### 1. Clone the Repository
```bash
git clone [https://github.com/priyanshuc1827-stack/VendorBridge.git](https://github.com/priyanshuc1827-stack/VendorBridge.git)
cd VendorBridge
