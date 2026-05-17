import React from "react";
import { Button, Checkbox, Input, Select, Table, Tag } from "antd";

const IndustrySummarySection = ({
  industrySearch,
  setIndustrySearch,
  industryOnlyShortfall,
  setIndustryOnlyShortfall,
  industryOnlyNoRecycled,
  setIndustryOnlyNoRecycled,
  industryTopN,
  setIndustryTopN,
  topOptions,
  topIndustryColumns,
  filteredIndustryRows,
  summaryLoading,
  setSummaryDrawerType,
  setSummaryDrawerRecord,
  setSummaryDrawerOpen,
  renderTargetTableSummary,
}) => {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Industry Wise Summary
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>Click a row to view details.</span>
              <Tag color="green">Surplus</Tag>
              <Tag color="red">Shortfall</Tag>
              <Tag color="blue">Target</Tag>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={industrySearch}
              onChange={(e) => setIndustrySearch(e.target.value)}
              placeholder="Search industry"
              className="w-[220px]"
              allowClear
              size="middle"
            />
            <Checkbox
              checked={industryOnlyShortfall}
              onChange={(e) => setIndustryOnlyShortfall(e.target.checked)}
            >
              Only shortfall
            </Checkbox>
            <Checkbox
              checked={industryOnlyNoRecycled}
              onChange={(e) => setIndustryOnlyNoRecycled(e.target.checked)}
            >
              Only no recycled
            </Checkbox>
            <Select
              value={industryTopN}
              onChange={setIndustryTopN}
              options={topOptions}
              className="w-[120px]"
              size="middle"
            />
            <Button
              onClick={() => {
                setIndustrySearch("");
                setIndustryOnlyShortfall(false);
                setIndustryOnlyNoRecycled(false);
                setIndustryTopN("All");
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
      <Table
        columns={topIndustryColumns}
        dataSource={filteredIndustryRows}
        rowKey="key"
        pagination={false}
        bordered
        loading={summaryLoading}
        locale={{
          emptyText: summaryLoading
            ? "Loading summary data..."
            : "No summary data available.",
        }}
        sticky
        scroll={{ x: 1500, y: 420 }}
        rowClassName={() => "cursor-pointer"}
        onRow={(record) => ({
          onClick: () => {
            setSummaryDrawerType("industry");
            setSummaryDrawerRecord(record);
            setSummaryDrawerOpen(true);
          },
        })}
        summary={() => renderTargetTableSummary(filteredIndustryRows)}
      />
    </div>
  );
};

export default IndustrySummarySection;
