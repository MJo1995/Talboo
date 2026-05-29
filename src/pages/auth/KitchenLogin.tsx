import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { useRestaurantStore } from "@/store/useRestaurantStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChefHat } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export function KitchenLoginPage() {
  const navigate = useNavigate();
  const { setRestaurant, setMemberRole } = useRestaurantStore();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const cleanCode = code.trim().toUpperCase();
    
    if (!cleanCode) return;
    
    setIsSubmitting(true);

    try {
      const { error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) throw signInError;

      const { data: restaurantId, error: rpcError } = await supabase.rpc(
        "verify_kitchen_pin",
        { provided_pin: cleanCode }
      );

      if (rpcError) throw rpcError;
      
      if (!restaurantId) {
        throw new Error("Invalid Kitchen Access Code.");
      }

      const { data: restaurant, error: fetchError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", restaurantId)
        .single();
        
      if (fetchError || !restaurant) {
        throw new Error("Failed to fetch restaurant details.");
      }

      setRestaurant(restaurant);
      setMemberRole("staff");

      toast.success("Kitchen device connected successfully");
      navigate("/kitchen", { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to connect kitchen device.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="kitchen-theme flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-primary/20 text-primary mb-4 shadow-sm border border-primary/20">
            <ChefHat className="size-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Kitchen Device
          </h1>
          <p className="text-sm text-white/70 mt-2">
            Enter your access code to connect this display
          </p>
        </div>

        <Card className="border-white/10 bg-black/40 shadow-xl backdrop-blur-sm">
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-6">
              {error && (
                <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200 font-medium">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="code" className="text-white/80">Access Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="e.g. A7X9M2Q4"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  maxLength={8}
                  autoComplete="off"
                  autoFocus
                  className="bg-black/50 border-white/20 text-white placeholder:text-white/30 font-mono text-center text-xl py-6 tracking-widest"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pb-6">
              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-white/90 text-base font-semibold py-6"
                disabled={isSubmitting}
              >
                {isSubmitting && <Spinner data-icon="inline-start" className="text-black" />}
                Connect Device
              </Button>
              <Link
                to="/login"
                className="text-sm font-medium text-white/50 hover:text-white transition-colors"
              >
                Owner Login
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
