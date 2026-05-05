import GsapRevealGroup from "../../../components/GsapRevealGroup";

const ClientSummaryPanel = ({ children }) => (
  <GsapRevealGroup className="space-y-6" animateKey="client-summary-panel">
    {children}
  </GsapRevealGroup>
);

export default ClientSummaryPanel;
