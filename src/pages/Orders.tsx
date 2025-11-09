import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";
import { toast } from "sonner";
import { exportToCSV } from "@/lib/csvExport";
import { OrderDetailSheet } from "@/components/orders/OrderDetailSheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  delivery_address: any;
  delivery_date: string;
  delivery_time_slot: string;
  notes: string;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  payment_method: string;
  meal_plan_id: string | null;
  profiles: {
    first_name: string;
    last_name: string;
  };
  items?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    meal_type: string;
    delivery_date: string;
    delivery_time_slot: string;
    is_half_half?: boolean;
    meals: { id: string; name: string; image_url: string } | null;
    half_meal_1: { id: string; name: string; image_url: string } | null;
    half_meal_2: { id: string; name: string; image_url: string } | null;
  }>;
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin !== null) {
      fetchOrders();
      
      const channel = supabase
        .channel('orders-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchOrders();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsAdmin(false);
      return;
    }

    const { data: adminData } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    setIsAdmin(!!adminData);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from("orders")
        .select("*, profiles(first_name, last_name)");
      
      // If not admin, only fetch user's own orders
      if (!isAdmin && user) {
        query = query.eq("user_id", user.id);
      }
      
      const { data: ordersData, error: ordersError } = await query
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      const mealPlanIds = (ordersData || [])
        .map((o: any) => o.meal_plan_id)
        .filter((id: string | null) => !!id);

      let itemsByPlan: Record<string, any[]> = {};

      if (mealPlanIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from("meal_plan_items")
          .select("id, meal_plan_id, meal_id, half_meal_1_id, half_meal_2_id, quantity, unit_price, meal_type, is_half_half, delivery_date, delivery_time_slot")
          .in("meal_plan_id", mealPlanIds);

        if (itemsError) throw itemsError;

        const mealIds = Array.from(
          new Set(
            (itemsData || []).flatMap((i: any) => [i.meal_id, i.half_meal_1_id, i.half_meal_2_id].filter(Boolean))
          )
        );

        let mealMap: Record<string, any> = {};
        if (mealIds.length > 0) {
          const { data: mealsData, error: mealsError } = await supabase
            .from("meals")
            .select("id, name, image_url")
            .in("id", mealIds);

          if (mealsError) throw mealsError;
          mealMap = Object.fromEntries((mealsData || []).map((m: any) => [m.id, m]));
        }

        itemsByPlan = (itemsData || []).reduce((acc: Record<string, any[]>, i: any) => {
          const key = i.meal_plan_id;
          const normalized = {
            id: i.id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            meal_type: i.meal_type,
            delivery_date: i.delivery_date,
            delivery_time_slot: i.delivery_time_slot,
            is_half_half: !!(i.half_meal_1_id && i.half_meal_2_id) || i.is_half_half === true,
            meals: i.meal_id ? mealMap[i.meal_id] || null : null,
            half_meal_1: i.half_meal_1_id ? mealMap[i.half_meal_1_id] || null : null,
            half_meal_2: i.half_meal_2_id ? mealMap[i.half_meal_2_id] || null : null,
          };
          acc[key] = acc[key] || [];
          acc[key].push(normalized);
          return acc;
        }, {});
      }

      const withItems = (ordersData || []).map((o: any) => ({
        ...o,
        items: o.meal_plan_id ? itemsByPlan[o.meal_plan_id] || [] : [],
      }));

      setOrders(withItems);
    } catch (error: any) {
      console.error("fetchOrders error", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
      toast.success("Order status updated");
      fetchOrders();
    } catch (error: any) {
      toast.error("Failed to update order status");
    }
  };

  const filteredOrders = orders.filter((order) =>
    order.order_number.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      preparing: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const handleExportCSV = () => {
    const exportData = filteredOrders.map(order => ({
      order_number: order.order_number,
      customer_name: `${order.profiles?.first_name || ''} ${order.profiles?.last_name || ''}`.trim(),
      total_amount: order.total_amount,
      status: order.status,
      payment_status: order.payment_status,
      created_at: new Date(order.created_at).toLocaleString(),
    }));

    exportToCSV(
      exportData,
      'orders',
      ['order_number', 'customer_name', 'total_amount', 'status', 'payment_status', 'created_at']
    );
    toast.success('Orders exported successfully');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage customer orders</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow 
                    key={order.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedOrder(order);
                      setSheetOpen(true);
                    }}
                  >
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      {order.profiles?.first_name} {order.profiles?.last_name}
                    </TableCell>
                    <TableCell>ETB {order.total_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.payment_status === 'completed' ? 'default' : 'secondary'}>
                        {order.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={order.status}
                        onValueChange={(value) => updateOrderStatus(order.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="preparing">Preparing</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <OrderDetailSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          order={selectedOrder}
        />
      </div>
    </DashboardLayout>
  );
};

export default Orders;
