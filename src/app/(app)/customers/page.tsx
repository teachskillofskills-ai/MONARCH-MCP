import StubPage from "@/components/StubPage";

export default function CustomersPage() {
  return (
    <StubPage title="Customers" subtitle="Tag MCPs by customer/account for client-attributed reporting" icon="users">
      We&apos;ll add a customers table and a many-to-many link to MCPs. Useful when running the same template (e.g. Google Ads) for multiple clients with different OAuth.
    </StubPage>
  );
}
