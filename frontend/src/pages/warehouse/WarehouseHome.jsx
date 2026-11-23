import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import { Truck, ClipboardCheck, Boxes, AlertTriangle, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export const WarehouseHome = () => {
  const { user, profile } = useAuth();
  const [incoming, setIncoming] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWarehouseData = async () => {
      try {
        const [incRes, grnRes, invRes] = await Promise.all([
          api.get('/warehouse/incoming-orders'),
          api.get('/warehouse/receipts'),
          api.get('/warehouse/inventory')
        ]);
        setIncoming(incRes.data.incomingOrders);
        setReceipts(grnRes.data.receipts);
        setInventory(invRes.data.inventory);
      } catch (err) {
        console.error('Failed to load warehouse data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWarehouseData();
  }, []);

  const totalReceivedItems = inventory.reduce((acc, i) => acc + Number(i.total_received || 0), 0);
  const totalDamagedItems = inventory.reduce((acc, i) => acc + Number(i.total_damaged || 0), 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-navy-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Logistics & Receiving Operations</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Warehouse Officer: {user?.full_name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Location: {profile?.location_code || 'WH-BLR-01'} • Inspect physical vendor deliveries, verify quantities, and issue Goods Receipt Notes (GRN).
          </p>
        </div>
        <Link
          to="/warehouse/incoming-orders"
          className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs tracking-wide shadow-md transition flex items-center space-x-2 flex-shrink-0"
        >
          <Truck className="w-4 h-4" />
          <span>Inspect Incoming Shipments</span>
        </Link>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Awaiting Delivery"
          value={incoming.length}
          subtitle="Confirmed POs in transit"
          icon={Truck}
          color={incoming.length > 0 ? "amber" : "navy"}
        />
        <StatCard
          title="Total GRNs Logged"
          value={receipts.length}
          subtitle="Completed inspections"
          icon={ClipboardCheck}
          color="teal"
        />
        <StatCard
          title="Total Units Received"
          value={totalReceivedItems}
          subtitle="Accepted into inventory"
          icon={Boxes}
          color="emerald"
        />
        <StatCard
          title="Damaged / Missing Units"
          value={totalDamagedItems}
          subtitle="Discrepancies reported"
          icon={AlertTriangle}
          color={totalDamagedItems > 0 ? "rose" : "navy"}
        />
      </div>

      {/* Incoming Orders Awaiting Receipt */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Shipments Scheduled for Warehouse Dock Receipt</h2>
            <p className="text-xs text-slate-500 mt-0.5">Orders confirmed by shopkeeper awaiting verification</p>
          </div>
          <Link
            to="/warehouse/incoming-orders"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center"
          >
            Manage dock ({incoming.length}) <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading incoming dock shipments...</div>
          ) : incoming.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">No pending shipments awaiting warehouse receipt.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">PO Number</th>
                  <th className="px-6 py-3.5">Supplier</th>
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-6 py-3.5">Expected Qty</th>
                  <th className="px-6 py-3.5">Order Date</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {incoming.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-mono font-bold text-navy-900">{order.po_number}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{order.vendor_name}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{order.product_name}</td>
                    <td className="px-6 py-4 font-bold text-navy-900">{order.quantity} {order.product_unit}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(order.order_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/warehouse/incoming-orders?poId=${order.id}`}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold transition inline-flex items-center space-x-1"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Log GRN</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarehouseHome;
