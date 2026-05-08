import StubPage from "@/components/StubPage";

export default function ActivityPage() {
  return (
    <StubPage title="Activity" subtitle="Audit trail of every MCP call, secret rotation, and config change" icon="activity">
      The audit_log table is already in place. We&apos;ll wire up writes from the MCP runtime + admin actions next, then render a filterable feed here with timestamps, actors, and target MCPs.
    </StubPage>
  );
}
