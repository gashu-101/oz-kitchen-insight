import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Referral {
  id: string;
  referral_token: string;
  status: string;
  created_at: string;
  converted_at: string;
  expires_at: string;
  partners: {
    name: string;
    partner_code: string;
  };
  profiles: {
    first_name: string;
    last_name: string;
  } | null;
}

const Referrals = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchReferrals();
    
    const channel = supabase
      .channel('referrals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => {
        fetchReferrals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReferrals = async () => {
    try {
      const { data, error } = await supabase
        .from("referrals")
        .select("*, partners(name, partner_code), profiles(first_name, last_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReferrals(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch referrals");
    } finally {
      setLoading(false);
    }
  };

  const filteredReferrals = referrals.filter((referral) =>
    referral.referral_token.toLowerCase().includes(search.toLowerCase()) ||
    referral.partners?.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      converted: "bg-green-100 text-green-800",
      expired: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Referrals</h1>
          <p className="text-muted-foreground">Track referral conversions</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search referrals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Converted</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredReferrals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No referrals found
                  </TableCell>
                </TableRow>
              ) : (
                filteredReferrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell className="font-mono text-sm">
                      {referral.referral_token.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{referral.partners?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {referral.partners?.partner_code}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {referral.profiles ? (
                        `${referral.profiles.first_name} ${referral.profiles.last_name}`
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(referral.status)}>
                        {referral.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(referral.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {referral.converted_at
                        ? new Date(referral.converted_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(referral.expires_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Referrals;
