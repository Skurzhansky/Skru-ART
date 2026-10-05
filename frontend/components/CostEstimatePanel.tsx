"use client";

import React, { useState } from "react";
import { estimateCost } from "@/lib/api";
import { FloorPlan, CostEstimate } from "@/lib/types";
import { Calculator, Loader2 } from "lucide-react";

interface CostEstimatePanelProps {
  floorPlan: FloorPlan;
  estimate: CostEstimate | null;
  onEstimate: (estimate: CostEstimate) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

export default function CostEstimatePanel({ floorPlan, estimate, onEstimate }: CostEstimatePanelProps) {
  const [loading, setLoading] = useState(false);
  const [regionFactor, setRegionFactor] = useState(1.0);

  const handleEstimate = async () => {
    setLoading(true);
    try {
      const data = await estimateCost(floorPlan, regionFactor);
      onEstimate(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[50%] min-h-[300px] bg-white">
      <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-green-600" />
        <h2 className="font-semibold">Смета</h2>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm text-slate-600">Региональный коэффициент:</label>
          <input
            type="number"
            step={0.1}
            min={0.1}
            value={regionFactor}
            onChange={(e) => setRegionFactor(parseFloat(e.target.value))}
            className="w-20 border rounded px-2 py-1 text-sm"
          />
        </div>
        <button
          onClick={handleEstimate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 mb-4"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
          Рассчитать смету
        </button>

        {estimate ? (
          <div className="space-y-3">
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-slate-500">Общая площадь</p>
              <p className="font-semibold">{estimate.total_area_sqm} м²</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-slate-500">Итоговая стоимость</p>
              <p className="font-semibold text-lg">{formatCurrency(estimate.total_cost)}</p>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2">Статья</th>
                    <th className="text-right px-3 py-2">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.breakdown.slice(0, 12).map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 capitalize">{item.category.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center mt-8">
            Нажмите «Рассчитать смету», чтобы получить предварительную оценку стоимости строительства.
          </p>
        )}
      </div>
    </div>
  );
}
