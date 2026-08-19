import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AccessRestricted() {
  const { user } = useAuth();
  if (user?.role === "owner" || user?.role === "admin") return null;
  return <div className="grid min-h-[60vh] place-items-center"><div className="max-w-md rounded-3xl border border-[#e2e9e4] bg-white p-9 text-center shadow-sm"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600"><ShieldAlert className="h-6 w-6" /></div><h1 className="mt-5 text-xl font-semibold text-[#213127]">Operator access required</h1><p className="mt-2 text-sm leading-6 text-[#718076]">Fix project data is restricted to the exact access roles <strong>owner</strong> and <strong>admin</strong>. Ask the owner to update your account role.</p></div></div>;
}
