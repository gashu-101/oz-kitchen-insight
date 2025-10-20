import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { Users, ShoppingBag, TrendingUp, UtensilsCrossed } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    activeUsers: 0,
    totalMeals: 0,
  });

  useEffect(() => {
    checkAuth();
    fetchStats();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    const { data: adminData } = await supabase
      .from("admin_users")
      .select("*")
      .eq("id", session.user.id)
      .eq("is_active", true)
      .single();

    if (!adminData) {
      await supabase.auth.signOut();
      navigate("/login");
    }
  };

  const fetchStats = async () => {
    try {
      const [ordersRes, usersRes, mealsRes] = await Promise.all([
        supabase.from("orders").select("total_amount", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("meals").select("id", { count: "exact" }),
      ]);

      const totalRevenue = ordersRes.data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      setStats({
        totalOrders: ordersRes.count || 0,
        totalRevenue,
        activeUsers: usersRes.count || 0,
        totalMeals: mealsRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={ShoppingBag}
            trend="+12.5%"
            loading={loading}
          />
          <StatsCard
            title="Total Revenue"
            value={`ETB ${stats.totalRevenue.toLocaleString()}`}
            icon={TrendingUp}
            trend="+8.2%"
            loading={loading}
          />
          <StatsCard
            title="Active Users"
            value={stats.activeUsers}
            icon={Users}
            trend="+23.1%"
            loading={loading}
          />
          <StatsCard
            title="Total Meals"
            value={stats.totalMeals}
            icon={UtensilsCrossed}
            trend="+5.4%"
            loading={loading}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <RevenueChart />
          <RecentOrders />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
