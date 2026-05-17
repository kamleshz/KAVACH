import React from "react";
import { Drawer, Table } from "antd";
import {
  FaArrowDown,
  FaArrowUp,
  FaChartLine,
  FaRecycle,
  FaIndustry,
  FaRupeeSign,
} from "react-icons/fa";
import GsapRevealGroup from "../../../components/GsapRevealGroup";
import SupplierCtoSummarySection from "./SupplierCtoSummarySection";

const ClientSummarySection = ({
  riskClass,
  riskLabel,
  skuSummaryCards,
  supplierSummaryCards,
  renderAnimatedSummaryValue,
  supplierCtoSummary,
  supplierCtoSummaryCards,
  supplierCtoTableRows,
  supplierCtoTableColumns,
  summaryLoading,
  client,
  totalMonthlyPurchase,
  targetQty,
  virginTargetQty,
  totalRecycledAmount,
  totalVirginAmount,
  totalRecycledQty,
  recycledShortfall,
  recycledShortfallColor,
  recycledAchievedPct,
  clampPct,
  totalVirginQty,
  virginShortfall,
  virginShortfallColor,
  virginAchievedPct,
  formatWithCommas,
  categoryWiseProcurement,
  safeNumber,
  isProducerEntity,
  producerClientWiseSummarySection,
  producerPolymerWiseSummarySection,
  industrySummarySection,
  supplierTypeSummarySection,
  supplierWiseSummarySection,
  summaryDrawerOpen,
  setSummaryDrawerOpen,
  summaryDrawerType,
  summaryDrawerRecord,
  summaryMonthlyRows,
  skuIndustryMap,
  renderDrawerContent,
}) => {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Summary Dashboard
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Mixed overview of client profile, compliance position, supplier
              status, procurement, and target readiness.
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${riskClass}`}
          >
            {riskLabel}
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border-2 border-green-500/60 p-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {skuSummaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className={`rounded-xl border p-4 ${card.tone}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                        {card.label}
                      </div>
                      {Icon ? <Icon className="text-sm opacity-80" /> : null}
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      {renderAnimatedSummaryValue(card.value)}
                      {card.subtext && (
                        <div className="text-xs font-semibold opacity-80">
                          {card.subtext}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-green-500/60 p-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {supplierSummaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className={`rounded-xl border p-4 ${card.tone}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                        {card.label}
                      </div>
                      {Icon ? <Icon className="text-sm opacity-80" /> : null}
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      {renderAnimatedSummaryValue(card.value)}
                      {card.subtext && (
                        <div className="text-xs font-semibold opacity-80">
                          {card.subtext}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <SupplierCtoSummarySection
            supplierCtoSummary={supplierCtoSummary}
            supplierCtoSummaryCards={supplierCtoSummaryCards}
            supplierCtoTableRows={supplierCtoTableRows}
            supplierCtoTableColumns={supplierCtoTableColumns}
            renderAnimatedSummaryValue={renderAnimatedSummaryValue}
            summaryLoading={summaryLoading}
            showSummary
            showTable={false}
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">
            Target vs Achieved
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Based on UREP target sum for FY {client?.financialYear || "N/A"} and
            total annual purchase.
          </p>
        </div>
        <div className="p-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="rounded-xl border p-4 text-gray-800 bg-gray-50 border-gray-200">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  Annual Purchase MT
                </div>
                <FaChartLine className="text-sm opacity-80" />
              </div>
              <div className="mt-2 text-2xl font-bold">
                {renderAnimatedSummaryValue(totalMonthlyPurchase, {
                  digits: 3,
                  className: "text-2xl font-bold",
                })}
              </div>
            </div>
            <div className="rounded-xl border p-4 text-blue-700 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  Recycled Target Qty (MT)
                </div>
                <FaRecycle className="text-sm opacity-80" />
              </div>
              <div className="mt-2 text-2xl font-bold">
                {renderAnimatedSummaryValue(targetQty, {
                  digits: 2,
                  className: "text-2xl font-bold",
                })}
              </div>
            </div>
            <div className="rounded-xl border p-4 text-indigo-700 bg-indigo-50 border-indigo-200">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  Virgin Target Qty (MT)
                </div>
                <FaIndustry className="text-sm opacity-80" />
              </div>
              <div className="mt-2 text-2xl font-bold">
                {renderAnimatedSummaryValue(virginTargetQty, {
                  digits: 2,
                  className: "text-2xl font-bold",
                })}
              </div>
            </div>
            <div className="rounded-xl border p-4 text-emerald-700 bg-emerald-50 border-emerald-200">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  Recycled Qty Amount
                </div>
                <FaRupeeSign className="text-sm opacity-80" />
              </div>
              <div className="mt-2 text-2xl font-bold">
                {renderAnimatedSummaryValue(totalRecycledAmount, {
                  digits: 3,
                  className: "text-2xl font-bold",
                })}
              </div>
            </div>
            <div className="rounded-xl border p-4 text-indigo-700 bg-indigo-50 border-indigo-200">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  Virgin Qty Amount
                </div>
                <FaRupeeSign className="text-sm opacity-80" />
              </div>
              <div className="mt-2 text-2xl font-bold">
                {renderAnimatedSummaryValue(totalVirginAmount, {
                  digits: 3,
                  className: "text-2xl font-bold",
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-sm font-semibold text-gray-800">
                Recycled Target Achieved vs Shortfall
              </div>
              <div className="mt-5 flex items-start justify-between gap-8">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-green-700">
                    Recycled Achieved (MT)
                  </div>
                  {renderAnimatedSummaryValue(totalRecycledQty, {
                    digits: 2,
                    className: "mt-2 text-3xl font-bold text-green-700",
                  })}
                </div>

                <div className="min-w-0 text-right">
                  <div
                    className={`text-xs font-semibold uppercase tracking-wide ${recycledShortfallColor}`}
                  >
                    Recycled Shortfall (MT)
                  </div>
                  <div
                    className={`mt-2 flex items-center justify-end gap-2 text-3xl font-bold ${recycledShortfallColor}`}
                  >
                    {recycledShortfall >= 0 ? (
                      <FaArrowUp className="text-green-600" />
                    ) : (
                      <FaArrowDown className="text-red-600" />
                    )}
                    {renderAnimatedSummaryValue(Math.abs(recycledShortfall), {
                      digits: 2,
                      className: "",
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-5 h-2.5 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                <div
                  className="h-full bg-green-500"
                  data-gsap-progress-fill
                  style={{ width: `${clampPct(recycledAchievedPct)}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Achieved: {formatWithCommas(recycledAchievedPct, 1)}%
                </span>
                <span>Target: {formatWithCommas(targetQty, 2)} MT</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-sm font-semibold text-gray-800">
                Virgin Target Achieved vs Shortfall
              </div>
              <div className="mt-5 flex items-start justify-between gap-8">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Virgin Achieved (MT)
                  </div>
                  {renderAnimatedSummaryValue(totalVirginQty, {
                    digits: 2,
                    className: "mt-2 text-3xl font-bold text-emerald-700",
                  })}
                </div>

                <div className="min-w-0 text-right">
                  <div
                    className={`text-xs font-semibold uppercase tracking-wide ${virginShortfallColor}`}
                  >
                    Virgin Shortfall (MT)
                  </div>
                  <div
                    className={`mt-2 flex items-center justify-end gap-2 text-3xl font-bold ${virginShortfallColor}`}
                  >
                    {virginShortfall >= 0 ? (
                      <FaArrowUp className="text-green-600" />
                    ) : (
                      <FaArrowDown className="text-red-600" />
                    )}
                    {renderAnimatedSummaryValue(Math.abs(virginShortfall), {
                      digits: 2,
                      className: "",
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-5 h-2.5 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                <div
                  className="h-full bg-green-500"
                  data-gsap-progress-fill
                  style={{ width: `${clampPct(virginAchievedPct)}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Achieved: {formatWithCommas(virginAchievedPct, 1)}%
                </span>
                <span>Target: {formatWithCommas(virginTargetQty, 2)} MT</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {categoryWiseProcurement.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Category Wise</h3>
            <p className="text-xs text-gray-500 mt-1">
              Infographic split of procurement quantities and spend by category.
            </p>
          </div>
          <div className="p-5 overflow-x-auto">
            <div className="flex gap-5 min-w-max">
              {categoryWiseProcurement.map((item) => (
                <div
                  key={item.key}
                  className="w-[360px] flex-shrink-0 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        {item.category}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">
                        Annual Purchase MT
                      </div>
                      {renderAnimatedSummaryValue(item.monthlyPurchaseMt, {
                        digits: 3,
                        className: "text-xl font-bold text-gray-900",
                      })}
                      <div className="mt-2 text-[11px] uppercase tracking-wide text-gray-400">
                        Recycled Target Qty (MT)
                        {item.recycledTargetPct
                          ? ` (${item.recycledTargetPct}%)`
                          : ""}
                      </div>
                      {renderAnimatedSummaryValue(item.recycledTargetQtyMt, {
                        digits: 3,
                        className: "text-sm font-bold text-green-700",
                      })}
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-wide text-gray-400">
                        Recycled Share
                      </div>
                      {renderAnimatedSummaryValue(item.recycledShareRaw, {
                        digits:
                          safeNumber(item.recycledShareRaw) > 0 &&
                          safeNumber(item.recycledShareRaw) < 0.1
                            ? 2
                            : 1,
                        className: "text-lg font-bold text-green-700",
                        suffix: "%",
                      })}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] font-semibold text-gray-500 mb-1">
                      <span>Recycled vs Virgin</span>
                      <span>
                        {item.recycledShare}% / {item.virginShare}%
                      </span>
                    </div>
                    {(() => {
                      const actualRecycledShare = Math.min(
                        100,
                        Math.max(
                          0,
                          Number(item.recycledShareRaw ?? item.recycledShare),
                        ),
                      );
                      const visibleRecycledShare =
                        actualRecycledShare > 0 && actualRecycledShare < 1.5
                          ? 1.5
                          : actualRecycledShare;
                      const visibleVirginShare = Math.max(
                        0,
                        100 - visibleRecycledShare,
                      );

                      return (
                        <div className="h-3 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex">
                          <div
                            className="h-full bg-green-500"
                            data-gsap-progress-fill
                            style={{
                              width: `${visibleRecycledShare}%`,
                            }}
                          />
                          <div
                            className="h-full bg-blue-500"
                            data-gsap-progress-fill
                            style={{
                              width: `${visibleVirginShare}%`,
                            }}
                          />
                        </div>
                      );
                    })()}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-green-700/70 font-semibold">
                        Recycled Qty
                      </div>
                      {renderAnimatedSummaryValue(item.recycledQty, {
                        digits: 3,
                        className: "mt-1 text-base font-bold text-green-700",
                      })}
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-blue-700/70 font-semibold">
                        Virgin Qty
                      </div>
                      {renderAnimatedSummaryValue(item.virginQty, {
                        digits: 3,
                        className: "mt-1 text-base font-bold text-blue-700",
                      })}
                    </div>
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-emerald-700/70 font-semibold">
                        Recycled Amount
                      </div>
                      {renderAnimatedSummaryValue(item.recycledAmount, {
                        digits: 3,
                        className: "mt-1 text-base font-bold text-emerald-700",
                      })}
                    </div>
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-indigo-700/70 font-semibold">
                        Virgin Amount
                      </div>
                      {renderAnimatedSummaryValue(item.virginAmount, {
                        digits: 3,
                        className: "mt-1 text-base font-bold text-indigo-700",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isProducerEntity && producerClientWiseSummarySection}
      {isProducerEntity && producerPolymerWiseSummarySection}
      {industrySummarySection}
      {supplierTypeSummarySection}
      {supplierWiseSummarySection}

      <Drawer
        open={summaryDrawerOpen}
        onClose={() => setSummaryDrawerOpen(false)}
        size={720}
        title={
          summaryDrawerType === "supplier"
            ? `Supplier: ${summaryDrawerRecord?.supplierName || ""}`
            : `Industry: ${summaryDrawerRecord?.industryCategory || ""}`
        }
      >
        {renderDrawerContent()}
      </Drawer>
    </div>
  );
};

export default ClientSummarySection;
