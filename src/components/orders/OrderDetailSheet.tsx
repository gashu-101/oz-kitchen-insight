import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface OrderDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
}

export const OrderDetailSheet = ({ open, onOpenChange, order }: OrderDetailSheetProps) => {
  if (!order) return null;

  const items = order.items || order.meal_plans?.meal_plan_items;

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Order Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Order Header */}
          <div>
            <h3 className="text-lg font-semibold">{order.order_number}</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <Separator />

          {/* Customer Information */}
          <div>
            <h4 className="font-medium mb-2">Customer</h4>
            <p className="text-sm">
              {order.profiles?.first_name} {order.profiles?.last_name}
            </p>
          </div>

          <Separator />

          {/* Delivery Address */}
          {order.delivery_address && (
            <>
              <div>
                <h4 className="font-medium mb-2">Delivery Address</h4>
                <div className="text-sm space-y-1">
                  {order.delivery_address.street && (
                    <p>{String(order.delivery_address.street)}</p>
                  )}
                  {order.delivery_address.city && (
                    <p>{typeof order.delivery_address.city === 'object' ? order.delivery_address.city.city || JSON.stringify(order.delivery_address.city) : String(order.delivery_address.city)}</p>
                  )}
                  {order.delivery_address.campus && (
                    <p>Campus: {typeof order.delivery_address.campus === 'object' ? order.delivery_address.campus.campus || JSON.stringify(order.delivery_address.campus) : String(order.delivery_address.campus)}</p>
                  )}
                  {order.delivery_address.zone && (
                    <p>Zone: {String(order.delivery_address.zone)}</p>
                  )}
                  {order.delivery_address.building_number && (
                    <p>Building: {String(order.delivery_address.building_number)}</p>
                  )}
                  {order.delivery_address.floor && (
                    <p>Floor: {String(order.delivery_address.floor)}</p>
                  )}
                  {order.delivery_address.special_instructions && (
                    <p className="text-muted-foreground italic">
                      {String(order.delivery_address.special_instructions)}
                    </p>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Order Status */}
          <div>
            <h4 className="font-medium mb-2">Status</h4>
            <div className="flex gap-2">
              <Badge className={getStatusColor(order.status)}>
                {order.status}
              </Badge>
              <Badge variant={order.payment_status === 'completed' ? 'default' : 'secondary'}>
                {order.payment_status}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          {items && items.length > 0 && (
            <>
              <div>
                <h4 className="font-medium mb-3">Order Items</h4>
                <div className="space-y-3">
                  {items.map((item: any) => (
                    <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
                      {item.is_half_half || (item.half_meal_1 && item.half_meal_2) ? (
                        <div className="flex-1">
                          <div className="flex gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              {item.half_meal_1?.image_url && (
                                <img 
                                  src={item.half_meal_1.image_url} 
                                  alt={item.half_meal_1.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-medium">{item.half_meal_1?.name}</p>
                                <p className="text-xs text-muted-foreground">Half portion</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              {item.half_meal_2?.image_url && (
                                <img 
                                  src={item.half_meal_2.image_url} 
                                  alt={item.half_meal_2.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-medium">{item.half_meal_2?.name}</p>
                                <p className="text-xs text-muted-foreground">Half portion</p>
                              </div>
                            </div>
                          </div>
                          {item.delivery_date && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Delivery: {new Date(item.delivery_date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                              {item.delivery_time_slot && ` (${item.delivery_time_slot})`}
                            </p>
                          )}
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-sm">Qty: {item.quantity}</p>
                            <p className="text-sm font-medium">ETB {item.unit_price?.toLocaleString?.() ?? item.unit_price}</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {item.meals?.image_url && (
                            <img 
                              src={item.meals.image_url} 
                              alt={item.meals.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{item.meals?.name || 'Meal'}</p>
                            <p className="text-sm text-muted-foreground capitalize">{item.meal_type}</p>
                            {item.delivery_date && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Delivery: {new Date(item.delivery_date).toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                                {item.delivery_time_slot && ` (${item.delivery_time_slot})`}
                              </p>
                            )}
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-sm">Qty: {item.quantity}</p>
                              <p className="text-sm font-medium">ETB {item.unit_price?.toLocaleString?.() ?? item.unit_price}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Delivery Info */}
          {(order.delivery_date || order.delivery_time_slot) && (
            <>
              <div>
                <h4 className="font-medium mb-2">Delivery</h4>
                <div className="text-sm space-y-1">
                  {order.delivery_date && (
                    <p>Date: {new Date(order.delivery_date).toLocaleDateString()}</p>
                  )}
                  {order.delivery_time_slot && (
                    <p>Time Slot: {order.delivery_time_slot}</p>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Payment Details */}
          <div>
            <h4 className="font-medium mb-2">Payment</h4>
            <div className="text-sm space-y-1">
              {order.payment_method && (
                <p>Method: <span className="capitalize">{order.payment_method}</span></p>
              )}
              <p>Subtotal: ETB {order.subtotal?.toLocaleString() || '0'}</p>
              {order.delivery_fee > 0 && (
                <p>Delivery Fee: ETB {order.delivery_fee.toLocaleString()}</p>
              )}
              {order.discount_amount > 0 && (
                <p className="text-green-600">
                  Discount: -ETB {order.discount_amount.toLocaleString()}
                </p>
              )}
              <p className="font-semibold text-base mt-2">
                Total: ETB {order.total_amount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
