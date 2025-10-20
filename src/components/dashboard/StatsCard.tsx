import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  loading?: boolean;
}

export const StatsCard = ({ title, value, icon: Icon, trend, loading }: StatsCardProps) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <p className="text-xs text-secondary font-medium">{trend} from last month</p>
            )}
          </div>
          <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
            <Icon className="w-6 h-6 text-secondary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
