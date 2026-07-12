import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  loading: boolean;
  onboarded: boolean;
  accountReady: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  onboarded: false,
  accountReady: false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [accountReady, setAccountReady] = useState(false);

  const checkProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed, account_setup_completed")
      .eq("id", userId)
      .single();
    setOnboarded(data?.onboarding_completed === true);
    setAccountReady(data?.account_setup_completed === true);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user.id) {
      await checkProfile(session.user.id);
    }
  }, [session?.user.id, checkProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user.id) {
        await checkProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.id) {
        await checkProfile(nextSession.user.id);
      } else {
        setOnboarded(false);
        setAccountReady(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkProfile]);

  return (
    <AuthContext.Provider value={{ session, loading, onboarded, accountReady, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
