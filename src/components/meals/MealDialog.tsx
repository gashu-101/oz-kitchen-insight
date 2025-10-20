import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface MealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: any | null;
  onSuccess: () => void;
}

export const MealDialog = ({ open, onOpenChange, meal, onSuccess }: MealDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    base_price: "",
    is_available: true,
    image_url: "",
    dietary_tags: "",
    ingredients: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (meal) {
      setFormData({
        name: meal.name || "",
        description: meal.description || "",
        base_price: meal.base_price?.toString() || "",
        is_available: meal.is_available ?? true,
        image_url: meal.image_url || "",
        dietary_tags: meal.dietary_tags?.join(", ") || "",
        ingredients: meal.ingredients?.join(", ") || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        base_price: "",
        is_available: true,
        image_url: "",
        dietary_tags: "",
        ingredients: "",
      });
    }
  }, [meal, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const mealData = {
        name: formData.name,
        description: formData.description,
        base_price: parseFloat(formData.base_price),
        is_available: formData.is_available,
        image_url: formData.image_url || null,
        dietary_tags: formData.dietary_tags
          ? formData.dietary_tags.split(",").map((tag) => tag.trim())
          : null,
        ingredients: formData.ingredients
          ? formData.ingredients.split(",").map((ing) => ing.trim())
          : null,
      };

      if (meal) {
        const { error } = await supabase
          .from("meals")
          .update(mealData)
          .eq("id", meal.id);
        if (error) throw error;
        toast.success("Meal updated successfully");
      } else {
        const { error } = await supabase.from("meals").insert(mealData);
        if (error) throw error;
        toast.success("Meal created successfully");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save meal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{meal ? "Edit Meal" : "Add New Meal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base_price">Price (ETB) *</Label>
              <Input
                id="base_price"
                type="number"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_available">Available</Label>
              <div className="flex items-center h-10">
                <Switch
                  id="is_available"
                  checked={formData.is_available}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_available: checked })
                  }
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dietary_tags">Dietary Tags (comma-separated)</Label>
            <Input
              id="dietary_tags"
              placeholder="vegetarian, gluten-free"
              value={formData.dietary_tags}
              onChange={(e) => setFormData({ ...formData, dietary_tags: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ingredients">Ingredients (comma-separated)</Label>
            <Textarea
              id="ingredients"
              placeholder="chicken, rice, vegetables"
              value={formData.ingredients}
              onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
              rows={2}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : meal ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
