import React from "react";
import { Table } from "antd";
import {
  FaUsers,
  FaCheckCircle,
  FaSpinner,
  FaClipboardCheck,
  FaFileContract,
  FaFile,
} from "react-icons/fa";

const CARD_META = {
  "Total Supplier CTO": {
    tone: "text-blue-700 bg-blue-50 border-blue-200",
    icon: FaUsers,
  },
  Approved: {
    tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    icon: FaCheckCircle,
  },
  "In Progress": {
    tone: "text-sky-700 bg-sky-50 border-sky-200",
    icon: FaSpinner,
  },
  Pending: {
    tone: "text-orange-700 bg-orange-50 border-orange-200",
    icon: FaClipboardCheck,
  },
  "CTO Available": {
    tone: "text-green-700 bg-green-50 border-green-200",
    icon: FaFileContract,
  },
  "CTO Uploaded": {
    tone: "text-violet-700 bg-violet-50 border-violet-200",
    icon: FaFile,
  },
};

const SupplierCtoSummarySection = ({
  supplierCtoSummary,
  supplierCtoSummaryCards,
  supplierCtoTableRows,
  supplierCtoTableColumns,
  renderAnimatedSummaryValue,
  summaryLoading,
  showSummary = true,
  showTable = true,
}) => {
  if (!showSummary && !showTable) {
    return null;
  }

  return (
    <div className="space-y-5">
      {showSummary ? (
        <div className="rounded-2xl border-2 border-amber-400/60 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-800">
                Supplier CTO Summary
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Based on Supplier CTO Check data, registration stage, CTO
                availability, and uploaded CTO/CCA documents.
              </div>
            </div>
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {renderAnimatedSummaryValue(supplierCtoSummary.total, {
                digits: 0,
                className: "",
              })}{" "}
              Suppliers
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {supplierCtoSummaryCards.map((card) => {
              const meta = CARD_META[card.label] || {};
              const Icon = meta.icon;
              return (
                <div
                  key={card.label}
                  className={`rounded-xl border p-4 ${meta.tone || "text-slate-700 bg-slate-50 border-slate-200"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                      {card.label}
                    </div>
                    {Icon ? <Icon className="text-sm opacity-80" /> : null}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    {renderAnimatedSummaryValue(card.value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {showTable ? (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">
              Supplier CTO Check Table
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Read-only view of saved Supplier CTO Check records from the plant
              process.
            </p>
          </div>
          <Table
            columns={supplierCtoTableColumns}
            dataSource={supplierCtoTableRows}
            rowKey="key"
            pagination={false}
            size="middle"
            bordered
            loading={summaryLoading}
            locale={{
              emptyText: summaryLoading
                ? "Loading supplier CTO data..."
                : "No supplier CTO check data available.",
            }}
            scroll={{ x: 1600 }}
            rowClassName="hover:bg-gray-50"
          />
        </div>
      ) : null}
    </div>
  );
};

export default SupplierCtoSummarySection;
