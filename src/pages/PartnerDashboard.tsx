import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Users, TrendingUp, DollarSign, CheckCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Referral {
  id: string;
  referral_token: string;
  status: string;
  created_at: string;
  converted_at: string | null;
  profiles: {
    first_name: string;
    last_name: string;
  } | null;
}

interface Commission {
  id: string;
  payment_amount: number;
  commission_amount: number;
  commission_rate: number;
  status: string;
  created_at: string;
}

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    convertedReferrals: 0,
    totalCommissions: 0,
    pendingCommissions: 0,
  });

  useEffect(() => {
    checkPartnerAuth();
  }, []);

  useEffect(() => {
    if (partnerId) {
      fetchPartnerData();
      
      const referralsChannel = supabase
        .channel('partner-referrals')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'referrals',
          filter: `partner_id=eq.${partnerId}`
        }, () => {
          fetchPartnerData();
        })
        .subscribe();

      const commissionsChannel = supabase
        .channel('partner-commissions')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'partner_commissions',
          filter: `partner_id=eq.${partnerId}`
        }, () => {
          fetchPartnerData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(referralsChannel);
        supabase.removeChannel(commissionsChannel);
      };
    }
  }, [partnerId]);

  const checkPartnerAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    // Check if user is a partner
    const { data: partnerData } = await supabase
      .from("partners")
      .select("*")
      .eq("contact_email", session.user.email)
      .eq("status", "active")
      .single();

    if (!partnerData) {
      toast.error("Partner account not found");
      await supabase.auth.signOut();
      navigate("/login");
      return;
    }

    setPartnerId(partnerData.id);
    setPartnerInfo(partnerData);
  };

  const fetchPartnerData = async () => {
    if (!partnerId) return;

    try {
      // Fetch referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from("referrals")
        .select("*, profiles(first_name, last_name)")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (referralsError) throw referralsError;

      // Fetch commissions
      const { data: commissionsData, error: commissionsError } = await supabase
        .from("partner_commissions")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });

      if (commissionsError) throw commissionsError;

      setReferrals(referralsData || []);
      setCommissions(commissionsData || []);

      // Calculate stats
      const totalCommissions = commissionsData?.reduce(
        (sum, c) => sum + Number(c.commission_amount),
        0
      ) || 0;

      const pendingCommissions = commissionsData
        ?.filter((c) => c.status === "pending")
        .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

      const converted = referralsData?.filter((r) => r.status === "converted").length || 0;

      setStats({
        totalReferrals: referralsData?.length || 0,
        convertedReferrals: converted,
        totalCommissions,
        pendingCommissions,
      });
    } catch (error: any) {
      toast.error("Failed to fetch partner data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      converted: "default",
      expired: "destructive",
    };
    return colors[status] || "secondary";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Partner Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome, {partnerInfo?.name} • Code: <code className="bg-muted px-2 py-1 rounded">{partnerInfo?.partner_code}</code>
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Referrals"
            value={stats.totalReferrals}
            icon={Users}
            loading={loading}
          />
          <StatsCard
            title="Converted"
            value={stats.convertedReferrals}
            icon={CheckCircle}
            loading={loading}
          />
          <StatsCard
            title="Total Commissions"
            value={`ETB ${stats.totalCommissions.toLocaleString()}`}
            icon={DollarSign}
            loading={loading}
          />
          <StatsCard
            title="Pending Payout"
            value={`ETB ${stats.pendingCommissions.toLocaleString()}`}
            icon={TrendingUp}
            loading={loading}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Referrals */}
          <div className="border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Recent Referrals</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      No referrals yet
                    </TableCell>
                  </TableRow>
                ) : (
                  referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        {referral.profiles ? (
                          `${referral.profiles.first_name} ${referral.profiles.last_name}`
                        ) : (
                          <span className="text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(referral.status)}>
                          {referral.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(referral.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Recent Commissions */}
          <div className="border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Recent Commissions</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      No commissions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  commissions.slice(0, 5).map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell className="font-medium">
                        ETB {commission.commission_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{commission.commission_rate}%</TableCell>
                      <TableCell>
                        <Badge variant={commission.status === "paid" ? "default" : "secondary"}>
                          {commission.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PartnerDashboard;
