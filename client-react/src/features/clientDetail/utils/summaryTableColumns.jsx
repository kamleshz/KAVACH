import React from "react";
import { Button } from "antd";

export const createSupplierCtoTableColumns = ({ handleViewDocument }) => [
  {
    title: "Supplier Name",
    dataIndex: "supplierName",
    key: "supplierName",
    fixed: "left",
    width: 240,
    render: (value) => (
      <span className="font-medium text-gray-800">{value}</span>
    ),
  },
  {
    title: "Supplier Status",
    dataIndex: "supplierStatus",
    key: "supplierStatus",
    width: 140,
    render: (value) => (
      <span
        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap ${
          value === "Registered"
            ? "bg-green-50 text-green-700"
            : value === "Unregistered"
              ? "bg-amber-50 text-amber-700"
              : "bg-gray-100 text-gray-500"
        }`}
      >
        {value || "-"}
      </span>
    ),
  },
  {
    title: "Registration Status",
    dataIndex: "registrationStatus",
    key: "registrationStatus",
    width: 150,
    render: (value) => (
      <span
        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap ${
          value === "Approved"
            ? "bg-green-50 text-green-700"
            : value === "In Progress"
              ? "bg-blue-50 text-blue-700"
              : "bg-amber-50 text-amber-700"
        }`}
      >
        {value}
      </span>
    ),
  },
  {
    title: "EPR Certificate Number",
    dataIndex: "eprCertificateNumber",
    key: "eprCertificateNumber",
    width: 170,
  },
  {
    title: "CTO Av/NA",
    dataIndex: "ctoAvailability",
    key: "ctoAvailability",
    width: 120,
  },
  {
    title: "CTO Plant No",
    dataIndex: "ctoPlantNo",
    key: "ctoPlantNo",
    width: 120,
  },
  {
    title: "CTO Plant Name",
    dataIndex: "ctoPlantName",
    key: "ctoPlantName",
    width: 150,
  },
  {
    title: "CTO Start Date",
    dataIndex: "ctoStartDate",
    key: "ctoStartDate",
    width: 130,
  },
  {
    title: "CTO Valid Upto",
    dataIndex: "ctoValidUpto",
    key: "ctoValidUpto",
    width: 130,
    render: (value, record) => (
      <div className="flex flex-col gap-1">
        <span>{value || "-"}</span>
        {record?.isCtoExpired ? (
          <span className="inline-flex w-fit items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
            CTO Expired
          </span>
        ) : null}
      </div>
    ),
  },
  {
    title: "CTO/CCA Document",
    dataIndex: "ctoCcaDocument",
    key: "ctoCcaDocument",
    width: 150,
    render: (value) =>
      value ? (
        <Button
          size="small"
          type="link"
          className="!px-0"
          onClick={() =>
            handleViewDocument(
              value,
              "CTO/CCA Document",
              "CTO/CCA Document",
            )
          }
        >
          View
        </Button>
      ) : (
        <span className="text-xs text-gray-400">No file</span>
      ),
  },
];

