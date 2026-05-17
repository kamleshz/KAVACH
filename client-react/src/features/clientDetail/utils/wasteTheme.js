import {
  FaBatteryFull,
  FaBolt,
  FaCarSide,
  FaOilCan,
  FaRecycle,
} from "react-icons/fa";

export const WASTE_THEME = {
  "Plastic Waste": { color: "#059669", bg: "#ecfdf5", icon: FaRecycle },
  "E-Waste": { color: "#7c3aed", bg: "#f5f3ff", icon: FaBolt },
  "Battery Waste": { color: "#dc2626", bg: "#fef2f2", icon: FaBatteryFull },
  ELV: { color: "#0284c7", bg: "#f0f9ff", icon: FaCarSide },
  "Used Oil": { color: "#b45309", bg: "#fffbeb", icon: FaOilCan },
};
