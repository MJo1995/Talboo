import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { useRestaurantStore } from "@/store/useRestaurantStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { setRestaurant, setMemberRole } = useRestaurantStore();

  const [restaurantName, setRestaurantName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login", { replace: true });
        return;
      }
      setUserId(session.user.id);
    });
  }, [navigate]);

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function handleNameChange(value: string) {
    setRestaurantName(value);
    setSlug(generateSlug(value));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!userId) {
      setError("You must be logged in to create a restaurant.");
      return;
    }

    if (!restaurantName.trim()) {
      setError("Restaurant name is required.");
      return;
    }

    if (!slug.trim()) {
      setError("A valid URL slug is required.");
      return;
    }

    setIsSubmitting(true);

    const { data: restaurant, error: insertError } = await supabase
      .from("restaurants")
      .insert({
        owner_id: userId,
        name: restaurantName.trim(),
        slug: slug.trim(),
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        setError("This URL slug is already taken. Please choose another.");
      } else {
        setError(insertError.message);
      }
      setIsSubmitting(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("restaurant_members")
      .insert({
        restaurant_id: restaurant.id,
        user_id: userId,
        role: "owner",
      });

    if (memberError) {
      setError(memberError.message);
      setIsSubmitting(false);
      return;
    }

    setRestaurant(restaurant);
    setMemberRole("owner");
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Set up your restaurant
          </CardTitle>
          <CardDescription>
            Tell us about your restaurant to get started with TABLO
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="restaurant-name">Restaurant Name</Label>
              <Input
                id="restaurant-name"
                type="text"
                placeholder="My Restaurant"
                value={restaurantName}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                type="text"
                placeholder="my-restaurant"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                This will be used in your public menu URL
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting && <Spinner data-icon="inline-start" />}
              Create Restaurant
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
